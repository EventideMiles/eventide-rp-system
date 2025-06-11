import { Logger } from "../../services/_module.mjs";

/**
 * Mixin that provides action card functionality to Item documents.
 * This includes embedded item management, effect handling, and execution logic.
 *
 * @param {class} Base - The base class to extend
 * @returns {class} The extended class with action card functionality
 */
export function ItemActionCardMixin(Base) {
  return class extends Base {
    /**
     * Set the embedded item for this action card.
     * Replaces any existing embedded item.
     *
     * @param {Item} item - The item to embed in this action card.
     * @returns {Promise<Item>} This action card instance for method chaining.
     * @throws {Error} If the provided item is not a supported type.
     * @async
     */
    async setEmbeddedItem(item) {
      // Only action cards can have embedded items
      if (this.type !== "actionCard") {
        throw new Error(
          "setEmbeddedItem can only be called on action card items",
        );
      }

      Logger.methodEntry("ItemActionCardMixin", "setEmbeddedItem", {
        itemName: item?.name,
        itemType: item?.type,
        actionCardName: this.name,
      });

      try {
        const supportedTypes = ["combatPower", "gear", "feature"];
        if (!supportedTypes.includes(item.type)) {
          const error = new Error(
            game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.ActionCardItemTypes", {
              type: item.type,
              supported: supportedTypes.join(", "),
            }),
          );
          Logger.error(
            "Unsupported item type for action card",
            error,
            "ACTION_CARD",
          );
          throw error;
        }

        // Sanitize roll type - action cards require rollable items
        const rollType = item.system.roll?.type;
        let sanitizedRollType = rollType;

        if (rollType === "none" || !rollType) {
          // Keep "none" type but mark it for special handling (automatic two successes)
          sanitizedRollType = "none";
          Logger.info(
            `Item "${item.name}" has roll type "none" - will be treated as automatic two successes in action card execution`,
            {
              originalType: rollType,
              specialHandling: "automaticTwoSuccesses",
            },
            "ACTION_CARD",
          );
        } else if (!["roll", "flat", "none"].includes(rollType)) {
          // Default to "roll" for unsupported roll types
          sanitizedRollType = "roll";
          Logger.warn(
            `Item "${item.name}" has unsupported roll type "${rollType}", sanitizing to "roll" for action card compatibility`,
            { originalType: rollType, sanitizedType: "roll" },
            "ACTION_CARD",
          );
        }

        // Create a complete copy of the item data
        const itemData = item.toObject();

        // Assign a new random ID to prevent conflicts
        itemData._id = foundry.utils.randomID();

        // Ensure gear items have at least one ActiveEffect if they need character effects
        if (
          itemData.type === "gear" &&
          (!itemData.effects || itemData.effects.length === 0)
        ) {
          itemData.effects = [
            {
              _id: foundry.utils.randomID(),
              name: itemData.name,
              icon: itemData.img,
              changes: [],
              disabled: false,
              duration: {},
              flags: {},
              tint: "#ffffff",
              transfer: true,
              statuses: [],
            },
          ];
        }

        // Data sanitization: ensure proper roll configuration
        if (!itemData.system.roll) {
          // Create roll configuration if it doesn't exist
          itemData.system.roll = {
            type: sanitizedRollType,
            requiresTarget: sanitizedRollType !== "none", // "none" types don't need targets
          };
          Logger.debug(
            "Created roll configuration for embedded item",
            { itemName: item.name, rollType: sanitizedRollType },
            "ACTION_CARD",
          );
        } else {
          // Apply sanitized roll type and set requiresTarget appropriately
          itemData.system.roll.type = sanitizedRollType;
          itemData.system.roll.requiresTarget = sanitizedRollType !== "none"; // "none" types don't need targets
          Logger.debug(
            "Sanitized roll configuration for embedded item",
            {
              itemName: item.name,
              originalType: rollType,
              sanitizedType: sanitizedRollType,
              requiresTarget: sanitizedRollType !== "none",
            },
            "ACTION_CARD",
          );
        }

        // Update the document
        await this.update({ "system.embeddedItem": itemData });

        Logger.info(
          `Successfully embedded ${item.type} "${item.name}" in action card "${this.name}"`,
          { itemId: itemData._id },
          "ACTION_CARD",
        );

        Logger.methodExit("ItemActionCardMixin", "setEmbeddedItem", this);
        return this;
      } catch (error) {
        Logger.error("Failed to set embedded item", error, "ACTION_CARD");
        Logger.methodExit("ItemActionCardMixin", "setEmbeddedItem", null);
        throw error;
      }
    }

    /**
     * Clear the embedded item from this action card
     *
     * @returns {Promise<Item>} This action card instance for method chaining
     * @async
     */
    async clearEmbeddedItem() {
      // Only action cards can have embedded items
      if (this.type !== "actionCard") {
        throw new Error(
          "clearEmbeddedItem can only be called on action card items",
        );
      }

      Logger.methodEntry("ItemActionCardMixin", "clearEmbeddedItem", {
        actionCardName: this.name,
      });

      try {
        await this.update({ "system.embeddedItem": null });

        Logger.info(
          `Cleared embedded item from action card "${this.name}"`,
          null,
          "ACTION_CARD",
        );

        Logger.methodExit("ItemActionCardMixin", "clearEmbeddedItem", this);
        return this;
      } catch (error) {
        Logger.error("Failed to clear embedded item", error, "ACTION_CARD");
        Logger.methodExit("ItemActionCardMixin", "clearEmbeddedItem", null);
        throw error;
      }
    }

    /**
     * Get the embedded item for this action card as a temporary item document.
     * Creates a temporary item with overridden update methods to persist changes.
     *
     * @param {Object} [options={}] - Options for retrieving the embedded item
     * @param {boolean} [options.executionContext=false] - Whether this is being called during execution (vs editing)
     * @returns {Item|null} The embedded item as a temporary document or null if none exists
     */
    getEmbeddedItem(options = {}) {
      // Only action cards can have embedded items
      if (this.type !== "actionCard") {
        return null;
      }

      const { executionContext = false } = options;

      Logger.methodEntry("ItemActionCardMixin", "getEmbeddedItem", {
        actionCardName: this.name,
        hasEmbeddedItem: !!this.system.embeddedItem,
        executionContext,
      });

      try {
        if (
          !this.system.embeddedItem ||
          this.system.embeddedItem === null ||
          Object.keys(this.system.embeddedItem).length === 0
        ) {
          Logger.debug("No embedded item found", null, "ACTION_CARD");
          Logger.methodExit("ItemActionCardMixin", "getEmbeddedItem", null);
          return null;
        }

        const actionCard = this;

        // Use the action card's actor as the parent, or null if unowned
        const actor = actionCard?.isOwned ? actionCard.parent : null;
        const tempItem = new CONFIG.Item.documentClass(
          this.system.embeddedItem,
          {
            parent: actor,
          },
        );

        // Initialize effects collection if it doesn't exist
        if (!tempItem.effects) {
          tempItem.effects = new foundry.utils.Collection();
        }

        // If the item data has effects, create temporary ActiveEffect documents
        if (
          this.system.embeddedItem.effects &&
          Array.isArray(this.system.embeddedItem.effects)
        ) {
          for (const effectData of this.system.embeddedItem.effects) {
            const tempEffect = new CONFIG.ActiveEffect.documentClass(
              effectData,
              {
                parent: tempItem,
              },
            );
            tempItem.effects.set(effectData._id, tempEffect);
          }
        }

        // The temporary item is editable if the action card is editable
        Object.defineProperty(tempItem, "isEditable", {
          value: actionCard.isEditable,
          configurable: true,
        });

        // Override the update method to persist changes back to the action card
        tempItem.update = async (data) => {
          Logger.debug("Updating embedded item", { data }, "ACTION_CARD");

          // Get the current embedded item data
          const currentItemData = foundry.utils.deepClone(
            this.system.embeddedItem,
          );

          // Merge the updates into the stored data
          const updatedItemData = foundry.utils.mergeObject(
            currentItemData,
            data,
            { inplace: false },
          );

          // Persist the changes to the action card
          await actionCard.update({
            "system.embeddedItem": updatedItemData,
          });

          // Update the temporary item's source data
          tempItem.updateSource(updatedItemData);

          // Close the temporary sheet and re-render the action card sheet
          // Only render the sheet if we're in an editing context, not during execution
          tempItem.sheet.close();
          if (!executionContext) {
            actionCard.sheet.render(true);
          }
          return tempItem;
        };

        Logger.debug(
          `Retrieved embedded item: ${tempItem.type} "${tempItem.name}"`,
          { itemId: tempItem.id },
          "ACTION_CARD",
        );

        Logger.methodExit("ItemActionCardMixin", "getEmbeddedItem", tempItem);
        return tempItem;
      } catch (error) {
        Logger.error("Failed to get embedded item", error, "ACTION_CARD");
        Logger.methodExit("ItemActionCardMixin", "getEmbeddedItem", null);
        return null;
      }
    }

    /**
     * Add an effect item to this action card's embedded effects.
     * Supports both status effects and gear items.
     *
     * @param {Item} effectItem - The effect item to add (status or gear).
     * @returns {Promise<Item>} This action card instance for method chaining.
     * @throws {Error} If the provided item is not a supported effect type.
     * @async
     */
    async addEmbeddedEffect(effectItem) {
      // Only action cards can have embedded effects
      if (this.type !== "actionCard") {
        throw new Error(
          "addEmbeddedEffect can only be called on action card items",
        );
      }

      Logger.methodEntry("ItemActionCardMixin", "addEmbeddedEffect", {
        effectName: effectItem?.name,
        effectType: effectItem?.type,
      });

      try {
        // Validate supported effect types
        const supportedTypes = ["status", "gear"];
        if (!supportedTypes.includes(effectItem.type)) {
          const error = new Error(
            game.i18n.format(
              "EVENTIDE_RP_SYSTEM.Errors.ActionCardEffectTypes",
              {
                type: effectItem.type,
                supported: supportedTypes.join(", "),
              },
            ),
          );
          Logger.error("Invalid effect type", error, "ACTION_CARD");
          throw error;
        }

        // Get current effects
        const effects = foundry.utils.deepClone(
          this.system.embeddedStatusEffects || [],
        );

        // Create a complete copy of the effect data
        const effectData = effectItem.toObject();

        // Assign a new random ID to prevent conflicts
        effectData._id = foundry.utils.randomID();

        // Sanitize roll type for gear effects (they might be used in gear effect hooks)
        if (effectData.type === "gear" && effectData.system?.roll) {
          const rollType = effectData.system.roll.type;
          if (rollType === "none") {
            // Keep "none" type for special handling (automatic two successes)
            Logger.info(
              `Gear effect "${effectItem.name}" has roll type "none" - will be treated as automatic two successes`,
              {
                originalType: rollType,
                specialHandling: "automaticTwoSuccesses",
              },
              "ACTION_CARD",
            );
          } else if (
            !rollType ||
            !["roll", "flat", "none"].includes(rollType)
          ) {
            effectData.system.roll.type = "roll";
            Logger.warn(
              `Gear effect "${effectItem.name}" had roll type "${rollType || "undefined"}", sanitized to "roll" for action card compatibility`,
              { originalType: rollType, sanitizedType: "roll" },
              "ACTION_CARD",
            );
          }
        }

        // Ensure status effects and gear have at least one ActiveEffect
        if (
          (effectData.type === "status" || effectData.type === "gear") &&
          (!effectData.effects || effectData.effects.length === 0)
        ) {
          effectData.effects = [
            {
              _id: foundry.utils.randomID(),
              name: effectData.name,
              icon: effectData.img,
              changes: [],
              disabled: false,
              duration: {},
              flags: {},
              tint: "#ffffff",
              transfer: true,
              statuses: [],
            },
          ];
        }

        // Add the effect data directly to the array
        effects.push(effectData);

        // Update the document
        await this.update({
          "system.embeddedStatusEffects": effects,
        });

        Logger.info(
          `Added ${effectItem.type} effect "${effectItem.name}" to action card "${this.name}"`,
          { effectId: effectData._id },
          "ACTION_CARD",
        );

        Logger.methodExit("ItemActionCardMixin", "addEmbeddedEffect", this);
        return this;
      } catch (error) {
        Logger.error("Failed to add embedded effect", error, "ACTION_CARD");
        Logger.methodExit("ItemActionCardMixin", "addEmbeddedEffect", null);
        throw error;
      }
    }

    /**
     * Remove an embedded effect from this action card's embedded effects
     *
     * @param {string} effectId - The ID of the effect to remove
     * @returns {Promise<Item>} This action card instance for method chaining
     * @async
     */
    async removeEmbeddedEffect(effectId) {
      // Only action cards can have embedded effects
      if (this.type !== "actionCard") {
        throw new Error(
          "removeEmbeddedEffect can only be called on action card items",
        );
      }

      Logger.methodEntry("ItemActionCardMixin", "removeEmbeddedEffect", {
        effectId,
      });

      try {
        // Get current effects
        const effects = foundry.utils.deepClone(
          this.system.embeddedStatusEffects || [],
        );

        // Find the effect to remove
        const index = effects.findIndex((effectData) => {
          // Handle malformed entries gracefully
          if (!effectData || !effectData._id) {
            Logger.warn(
              "Malformed effect entry found during removal, skipping",
              { effectData, effectId },
              "ACTION_CARD",
            );
            return false;
          }
          return effectData._id === effectId;
        });

        if (index === -1) {
          Logger.debug("Effect not found", { effectId }, "ACTION_CARD");
          Logger.methodExit(
            "ItemActionCardMixin",
            "removeEmbeddedEffect",
            this,
          );
          return this; // Not found
        }

        // Remove from the array
        effects.splice(index, 1);

        // Update the document
        await this.update({
          "system.embeddedStatusEffects": effects,
        });

        Logger.info(
          `Removed embedded effect from action card "${this.name}"`,
          { effectId },
          "ACTION_CARD",
        );

        Logger.methodExit("ItemActionCardMixin", "removeEmbeddedEffect", this);
        return this;
      } catch (error) {
        Logger.error("Failed to remove embedded effect", error, "ACTION_CARD");
        Logger.methodExit("ItemActionCardMixin", "removeEmbeddedEffect", null);
        throw error;
      }
    }

    /**
     * Get all embedded effects as temporary Item instances
     * @param {Object} [options={}] - Options for retrieving the embedded effects
     * @param {boolean} [options.executionContext=false] - Whether this is being called during execution (vs editing)
     * @returns {Item[]} Array of temporary Item instances
     */
    getEmbeddedEffects(options = {}) {
      // Only action cards can have embedded effects
      if (this.type !== "actionCard") {
        return [];
      }

      const { executionContext = false } = options;
      Logger.methodEntry("ItemActionCardMixin", "getEmbeddedEffects", {
        effectCount: this.system.embeddedStatusEffects?.length || 0,
      });

      try {
        if (!this.system.embeddedStatusEffects?.length) {
          Logger.debug("No embedded effects found", null, "ACTION_CARD");
          Logger.methodExit("ItemActionCardMixin", "getEmbeddedEffects", []);
          return [];
        }

        const actionCard = this;

        const effects = this.system.embeddedStatusEffects.map((effectData) => {
          // Validate effect entry structure
          if (!effectData) {
            Logger.warn(
              "Invalid effect entry structure in getEmbeddedEffects, skipping",
              { effectData, actionCardName: this.name },
              "ACTION_CARD",
            );
            return null; // Will be filtered out
          }
          // Use the action card's actor as the parent, or null if unowned
          const actor = actionCard?.isOwned ? actionCard.parent : null;
          const tempItem = new CONFIG.Item.documentClass(effectData, {
            parent: actor,
          });

          // Initialize effects collection if it doesn't exist
          if (!tempItem.effects) {
            tempItem.effects = new foundry.utils.Collection();
          }

          // If the item data has effects, create temporary ActiveEffect documents
          if (effectData.effects && Array.isArray(effectData.effects)) {
            for (const activeEffectData of effectData.effects) {
              const tempEffect = new CONFIG.ActiveEffect.documentClass(
                activeEffectData,
                {
                  parent: tempItem,
                },
              );
              tempItem.effects.set(activeEffectData._id, tempEffect);
            }
          }

          // The temporary item is editable if the action card is editable
          Object.defineProperty(tempItem, "isEditable", {
            value: actionCard.isEditable,
            configurable: true,
          });

          // Store the original embedded ID for template access
          Object.defineProperty(tempItem, "originalId", {
            value: effectData._id,
            configurable: true,
          });

          // Override the update method to persist changes back to the action card
          tempItem.update = async (data) => {
            const currentEffects = foundry.utils.deepClone(
              this.system.embeddedStatusEffects,
            );
            const effectIndex = currentEffects.findIndex(
              (e) => e._id === effectData._id,
            );
            if (effectIndex === -1) {
              throw new Error("Could not find embedded effect to update.");
            }

            // Merge the updates into the stored data
            const updatedEffectData = foundry.utils.mergeObject(
              currentEffects[effectIndex],
              data,
              { inplace: false },
            );
            currentEffects[effectIndex] = updatedEffectData;

            // Persist the changes to the action card
            await actionCard.update({
              "system.embeddedStatusEffects": currentEffects,
            });

            // Update the temporary item's source data
            tempItem.updateSource(updatedEffectData);

            // Close the temporary sheet and re-render the action card sheet
            // Only render the sheet if we're in an editing context, not during execution
            tempItem.sheet.close();
            if (!executionContext) {
              actionCard.sheet.render(true);
            }
            return tempItem;
          };

          return tempItem;
        });

        // Filter out null values
        const filteredEffects = effects.filter((item) => item !== null);

        Logger.debug(
          `Retrieved ${filteredEffects.length} embedded effects`,
          null,
          "ACTION_CARD",
        );

        Logger.methodExit(
          "ItemActionCardMixin",
          "getEmbeddedEffects",
          filteredEffects,
        );
        return filteredEffects;
      } catch (error) {
        Logger.error("Failed to get embedded effects", error, "ACTION_CARD");
        Logger.methodExit("ItemActionCardMixin", "getEmbeddedEffects", []);
        return [];
      }
    }
  };
}
