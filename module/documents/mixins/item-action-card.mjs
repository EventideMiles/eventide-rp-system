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
          // Create basic roll configuration if it doesn't exist
          itemData.system.roll = {
            type: sanitizedRollType,
            ability: "unaugmented",
            bonus: 0,
            diceAdjustments: {
              advantage: 0,
              disadvantage: 0,
              total: 0,
            },
            requiresTarget: sanitizedRollType !== "none", // "none" types don't need targets
          };
        } else {
          // Preserve all existing roll properties, only update type and requiresTarget
          itemData.system.roll = {
            ...itemData.system.roll, // Preserve all existing properties
            type: sanitizedRollType,
            requiresTarget: sanitizedRollType !== "none", // "none" types don't need targets
          };
        }

        // Detect if this action card is a virtual/temporary item (e.g., embedded in a transformation)
        const isVirtualItem =
          !this.collection ||
          (this.update &&
            (this.update.toString().includes("embeddedActionCards") ||
              this.update.toString().includes("embeddedTransformations")));

        // Update the document, passing fromEmbeddedItem flag for virtual items
        await this.update(
          { "system.embeddedItem": itemData },
          isVirtualItem ? { fromEmbeddedItem: true } : {},
        );

        return this;
      } catch (error) {
        Logger.error("Failed to set embedded item", error, "ACTION_CARD");
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

      try {
        // Detect if this action card is a virtual/temporary item (e.g., embedded in a transformation)
        const isVirtualItem =
          !this.collection ||
          (this.update &&
            (this.update.toString().includes("embeddedActionCards") ||
              this.update.toString().includes("embeddedTransformations")));

        // Update the document, passing fromEmbeddedItem flag for virtual items
        await this.update(
          { "system.embeddedItem": null },
          isVirtualItem ? { fromEmbeddedItem: true } : {},
        );
        return this;
      } catch (error) {
        Logger.error("Failed to clear embedded item", error, "ACTION_CARD");
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

      try {
        if (
          !this.system.embeddedItem ||
          this.system.embeddedItem === null ||
          Object.keys(this.system.embeddedItem).length === 0
        ) {
          return null;
        }

        const actionCard = this;

        // Check if we're in a repetition context and should apply cost control
        let embeddedItemData = this.system.embeddedItem;
        if (
          this._currentRepetitionContext &&
          !this._currentRepetitionContext.shouldApplyCost &&
          embeddedItemData.system &&
          embeddedItemData.system.cost !== undefined
        ) {
          // Create a modified copy with zero cost for this execution
          embeddedItemData = foundry.utils.deepClone(this.system.embeddedItem);
          embeddedItemData.system.cost = 0;
        }

        // Use the action card's actor as the parent, or null if unowned
        const actor = actionCard?.isOwned ? actionCard.parent : null;
        const tempItem = new CONFIG.Item.documentClass(embeddedItemData, {
          parent: actor,
        });

        // Initialize effects collection if it doesn't exist
        if (!tempItem.effects) {
          tempItem.effects = new foundry.utils.Collection();
        }

        // If the item data has effects, create temporary ActiveEffect documents
        if (
          embeddedItemData.effects &&
          Array.isArray(embeddedItemData.effects)
        ) {
          for (const effectData of embeddedItemData.effects) {
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
        tempItem.update = async (data, options = {}) => {
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
          await actionCard.update(
            {
              "system.embeddedItem": updatedItemData,
            },
            options,
          );

          // Update the temporary item's source data
          tempItem.updateSource(updatedItemData);

          // Only close the sheet if this is a direct item update, not an embedded item update
          if (!options.fromEmbeddedItem) {
            // Close the temporary sheet and re-render the action card sheet
            // Only render the sheet if we're in an editing context, not during execution
            tempItem.sheet.close();
            if (!executionContext) {
              actionCard.sheet.render(true);
            }
          } else {
            // For embedded item updates, just refresh the sheet without closing
            if (tempItem.sheet?.rendered) {
              tempItem.sheet.render(false);
            }
          }
          return tempItem;
        };

        // Override updateEmbeddedDocuments to also respect the fromEmbeddedItem flag
        tempItem.updateEmbeddedDocuments = async (
          embeddedName,
          updates,
          options = {},
        ) => {
          // Use the standard updateEmbeddedDocuments for the actual update
          const result =
            await CONFIG.Item.documentClass.prototype.updateEmbeddedDocuments.call(
              tempItem,
              embeddedName,
              updates,
              options,
            );

          // Handle sheet closure based on fromEmbeddedItem flag
          if (!options.fromEmbeddedItem) {
            // Close the temporary sheet and re-render the action card sheet
            tempItem.sheet.close();
            if (!executionContext) {
              actionCard.sheet.render(true);
            }
          } else {
            // For embedded item updates, just refresh the sheet without closing
            if (tempItem.sheet?.rendered) {
              tempItem.sheet.render(false);
            }
          }

          return result;
        };

        // Delegate handleBypass method from data model to item document if it exists
        if (typeof tempItem.system.handleBypass === "function") {
          tempItem.handleBypass = async (popupConfig, options) => {
            // Call the data model method with the item document as context
            // This ensures the method has access to this.actor, this.name, this.id, etc.
            return await tempItem.system.handleBypass.call(
              tempItem,
              popupConfig,
              options,
            );
          };
        }

        return tempItem;
      } catch (error) {
        Logger.error("Failed to get embedded item", error, "ACTION_CARD");
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
          if (
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

        // Detect if this action card is a virtual/temporary item (e.g., embedded in a transformation)
        const isVirtualItem =
          !this.collection ||
          (this.update &&
            (this.update.toString().includes("embeddedActionCards") ||
              this.update.toString().includes("embeddedTransformations")));

        // Update the document, passing fromEmbeddedItem flag for virtual items
        await this.update(
          {
            "system.embeddedStatusEffects": effects,
          },
          isVirtualItem ? { fromEmbeddedItem: true } : {},
        );

        return this;
      } catch (error) {
        Logger.error("Failed to add embedded effect", error, "ACTION_CARD");
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
          return this; // Not found
        }

        // Remove from the array
        effects.splice(index, 1);

        // Detect if this action card is a virtual/temporary item (e.g., embedded in a transformation)
        const isVirtualItem =
          !this.collection ||
          (this.update &&
            (this.update.toString().includes("embeddedActionCards") ||
              this.update.toString().includes("embeddedTransformations")));

        // Update the document, passing fromEmbeddedItem flag for virtual items
        await this.update(
          {
            "system.embeddedStatusEffects": effects,
          },
          isVirtualItem ? { fromEmbeddedItem: true } : {},
        );

        return this;
      } catch (error) {
        Logger.error("Failed to remove embedded effect", error, "ACTION_CARD");
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

      try {
        if (!this.system.embeddedStatusEffects?.length) {
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
          tempItem.update = async (data, options = {}) => {
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
            await actionCard.update(
              {
                "system.embeddedStatusEffects": currentEffects,
              },
              options,
            );

            // Update the temporary item's source data
            tempItem.updateSource(updatedEffectData);

            // Only close the sheet if this is a direct item update, not an embedded item update
            if (!options.fromEmbeddedItem) {
              // Close the temporary sheet and re-render the action card sheet
              // Only render the sheet if we're in an editing context, not during execution
              tempItem.sheet.close();
              if (!executionContext) {
                actionCard.sheet.render(true);
              }
            } else {
              // For embedded item updates, just refresh the sheet without closing
              if (tempItem.sheet?.rendered) {
                tempItem.sheet.render(false);
              }
            }
            return tempItem;
          };

          // Override updateEmbeddedDocuments to also respect the fromEmbeddedItem flag for status effects
          tempItem.updateEmbeddedDocuments = async (
            embeddedName,
            updates,
            options = {},
          ) => {
            Logger.debug(
              "Updating embedded documents on status effect",
              { embeddedName, updates, options },
              "ACTION_CARD",
            );

            // Use the standard updateEmbeddedDocuments for the actual update
            const result =
              await CONFIG.Item.documentClass.prototype.updateEmbeddedDocuments.call(
                tempItem,
                embeddedName,
                updates,
                options,
              );

            // Handle sheet closure based on fromEmbeddedItem flag
            if (!options.fromEmbeddedItem) {
              // Close the temporary sheet and re-render the action card sheet
              tempItem.sheet.close();
              if (!executionContext) {
                actionCard.sheet.render(true);
              }
            } else {
              // For embedded item updates, just refresh the sheet without closing
              if (tempItem.sheet?.rendered) {
                tempItem.sheet.render(false);
              }
            }

            return result;
          };

          return tempItem;
        });

        // Filter out null values
        const filteredEffects = effects.filter((item) => item !== null);

        return filteredEffects;
      } catch (error) {
        Logger.error("Failed to get embedded effects", error, "ACTION_CARD");
        return [];
      }
    }

    /**
     * Add a transformation to this action card's embedded transformations
     *
     * @param {Item} transformationItem - The transformation item to add
     * @returns {Promise<Item>} This action card instance for method chaining
     * @async
     */
    async addEmbeddedTransformation(transformationItem) {
      // Only action cards can have embedded transformations
      if (this.type !== "actionCard") {
        throw new Error(
          "addEmbeddedTransformation can only be called on action card items",
        );
      }

      Logger.methodEntry("ItemActionCardMixin", "addEmbeddedTransformation", {
        transformationName: transformationItem?.name,
        transformationType: transformationItem?.type,
      });

      try {
        // Validate transformation type
        if (transformationItem.type !== "transformation") {
          const error = new Error(
            game.i18n.format(
              "EVENTIDE_RP_SYSTEM.Errors.ActionCardTransformationTypes",
              {
                type: transformationItem.type,
                supported: "transformation",
              },
            ),
          );
          Logger.error("Invalid transformation type", error, "ACTION_CARD");
          throw error;
        }

        // Get current transformations
        const transformations = foundry.utils.deepClone(
          this.system.embeddedTransformations || [],
        );

        // Create a complete copy of the transformation data
        const transformationData = transformationItem.toObject();

        // Assign a new random ID to prevent conflicts
        transformationData._id = foundry.utils.randomID();

        // Add the transformation to the array
        transformations.push(transformationData);

        // Detect if this action card is a virtual/temporary item (e.g., embedded in a transformation)
        const isVirtualItem =
          !this.collection ||
          (this.update &&
            (this.update.toString().includes("embeddedActionCards") ||
              this.update.toString().includes("embeddedTransformations")));

        // Update the action card with the new transformations array, passing fromEmbeddedItem flag for virtual items
        await this.update(
          {
            "system.embeddedTransformations": transformations,
          },
          isVirtualItem ? { fromEmbeddedItem: true } : {},
        );

        return this;
      } catch (error) {
        Logger.error(
          "Failed to add embedded transformation",
          error,
          "ACTION_CARD",
        );
        throw error;
      }
    }

    /**
     * Remove an embedded transformation from this action card's embedded transformations
     *
     * @param {string} transformationId - The ID of the transformation to remove
     * @returns {Promise<Item>} This action card instance for method chaining
     * @async
     */
    async removeEmbeddedTransformation(transformationId) {
      // Only action cards can have embedded transformations
      if (this.type !== "actionCard") {
        throw new Error(
          "removeEmbeddedTransformation can only be called on action card items",
        );
      }

      Logger.methodEntry(
        "ItemActionCardMixin",
        "removeEmbeddedTransformation",
        {
          transformationId,
        },
      );

      try {
        // Get current transformations
        const transformations = foundry.utils.deepClone(
          this.system.embeddedTransformations || [],
        );

        // Find the transformation to remove
        const index = transformations.findIndex((transformationData) => {
          // Handle malformed entries gracefully
          if (!transformationData || !transformationData._id) {
            Logger.warn(
              "Malformed transformation entry found during removal, skipping",
              { transformationData, transformationId },
              "ACTION_CARD",
            );
            return false;
          }
          return transformationData._id === transformationId;
        });

        if (index === -1) {
          Logger.warn(
            `Transformation with ID ${transformationId} not found in embedded transformations`,
            null,
            "ACTION_CARD",
          );
          return this;
        }

        // Remove the transformation
        const removedTransformation = transformations.splice(index, 1)[0];

        // Detect if this action card is a virtual/temporary item (e.g., embedded in a transformation)
        const isVirtualItem =
          !this.collection ||
          (this.update &&
            (this.update.toString().includes("embeddedActionCards") ||
              this.update.toString().includes("embeddedTransformations")));

        // Update the action card, passing fromEmbeddedItem flag for virtual items
        await this.update(
          {
            "system.embeddedTransformations": transformations,
          },
          isVirtualItem ? { fromEmbeddedItem: true } : {},
        );

        Logger.info(
          `Removed transformation "${removedTransformation.name}" from action card "${this.name}"`,
          {
            transformationId,
            remainingCount: transformations.length,
          },
          "ACTION_CARD",
        );

        Logger.methodExit(
          "ItemActionCardMixin",
          "removeEmbeddedTransformation",
          this,
        );
        return this;
      } catch (error) {
        Logger.error(
          "Failed to remove embedded transformation",
          error,
          "ACTION_CARD",
        );
        Logger.methodExit(
          "ItemActionCardMixin",
          "removeEmbeddedTransformation",
          null,
        );
        throw error;
      }
    }

    /**
     * Get temporary Item instances for embedded transformations
     *
     * @param {Object} options - Options for creating temporary items
     * @param {boolean} options.executionContext - Whether this is being called during execution
     * @returns {Array<Item>} Array of temporary Item instances for embedded transformations
     * @async
     */
    async getEmbeddedTransformations(options = {}) {
      // Only action cards can have embedded transformations
      if (this.type !== "actionCard") {
        return [];
      }

      const { executionContext = false } = options;

      try {
        const transformationData = this.system.embeddedTransformations || [];

        const transformations = transformationData.map((data) => {
          if (!data || typeof data !== "object") {
            Logger.warn(
              "Invalid transformation data found, skipping",
              { data },
              "ACTION_CARD",
            );
            return null;
          }

          // Create temporary transformation item
          const tempItem = new CONFIG.Item.documentClass(data, {
            parent: null,
          });

          // The temporary item is editable if the action card is editable
          Object.defineProperty(tempItem, "isEditable", {
            value: this.isEditable,
            configurable: true,
          });

          // Store the original embedded ID for template access
          Object.defineProperty(tempItem, "originalId", {
            value: data._id,
            configurable: true,
          });

          // Override the update method to persist changes back to the action card
          tempItem.update = async (updateData, options = {}) => {
            // Save scroll position before update
            const scrollPosition = this.sheet?._saveScrollPosition?.() || 0;

            const currentTransformations = foundry.utils.deepClone(
              this.system.embeddedTransformations,
            );
            const transformationIndex = currentTransformations.findIndex(
              (t) => t._id === data._id,
            );
            if (transformationIndex === -1) {
              throw new Error(
                "Could not find embedded transformation to update.",
              );
            }

            // Merge the updates into the stored data
            const updatedTransformationData = foundry.utils.mergeObject(
              currentTransformations[transformationIndex],
              updateData,
              { inplace: false },
            );

            // Update the array
            currentTransformations[transformationIndex] =
              updatedTransformationData;

            // Persist the changes to the action card
            await this.update({
              "system.embeddedTransformations": currentTransformations,
            });

            // Update the temporary document's source data after parent update
            tempItem.updateSource(updatedTransformationData);

            // Handle sheet closure based on fromEmbeddedItem flag
            // Also treat image updates as embedded item updates to prevent unwanted sheet closure
            const isImageUpdate = updateData.img !== undefined;

            if (!options.fromEmbeddedItem && !isImageUpdate) {
              // Close the temporary sheet and re-render the action card sheet
              // Only render the sheet if we're in an editing context, not during execution
              tempItem.sheet.close();
              if (!executionContext) {
                this.sheet.render(true);
              }
            } else {
              // For embedded item updates and image updates, just refresh the sheet without closing
              if (tempItem.sheet?.rendered) {
                tempItem.sheet.render(false);
                // Restore scroll position after re-render
                setTimeout(() => {
                  this.sheet?._restoreScrollPosition?.(scrollPosition);
                }, 100);
              }
            }
            return tempItem;
          };

          // Add embedded item update handling for action card transformations
          // This handles updates from embedded items within action card transformations
          const originalUpdate = tempItem.update;
          tempItem.update = async (updateData, options = {}) => {
            // If this is an update to embedded combat powers or action cards, handle it specially
            if (
              updateData["system.embeddedCombatPowers"] ||
              updateData["system.embeddedActionCards"]
            ) {
              // Save scroll position before update
              const scrollPosition = this.sheet?._saveScrollPosition?.() || 0;
              // Update the transformation data in the action card's embedded transformations array
              const currentTransformations = foundry.utils.deepClone(
                this.system.embeddedTransformations,
              );
              const transformationIndex = currentTransformations.findIndex(
                (t) => t._id === tempItem.id,
              );
              if (transformationIndex === -1) {
                throw new Error(
                  "Could not find embedded transformation to update.",
                );
              }

              // Merge the updates into the stored data
              currentTransformations[transformationIndex] =
                foundry.utils.mergeObject(
                  currentTransformations[transformationIndex],
                  updateData,
                  { inplace: false },
                );

              // Persist the changes to the action card
              const updateOptions = {
                render: false, // Always use render: false to prevent focus stealing
                ...options, // Include any options passed from embedded item updates
              };
              await this.update(
                {
                  "system.embeddedTransformations": currentTransformations,
                },
                updateOptions,
              );

              // Update the temporary item's source data to stay in sync
              tempItem.updateSource(
                currentTransformations[transformationIndex],
              );

              // Handle sheet lifecycle - don't close for embedded item updates
              // For dual-override embedded collection updates, always treat as embedded item updates
              // This covers cases where embedded action cards have their images updated, which
              // comes through as system.embeddedActionCards updates rather than direct img updates

              // Always treat dual-override embedded collection updates as embedded item updates
              // Never close the transformation sheet for these updates
              if (tempItem.sheet?.rendered) {
                tempItem.sheet.render(false);
                // Restore scroll position for transformation sheet after re-render
                setTimeout(() => {
                  tempItem.sheet._restoreScrollPosition?.(scrollPosition);
                }, 100);
              }
              if (this.sheet?.rendered) {
                this.sheet.render(false);
                // Restore scroll position for action card sheet after re-render
                setTimeout(() => {
                  this.sheet?._restoreScrollPosition?.(scrollPosition);
                }, 100);
              }

              return tempItem;
            } else {
              // For other updates, use the original transformation update method
              return originalUpdate.call(tempItem, updateData, options);
            }
          };

          // Override updateEmbeddedDocuments to also respect the fromEmbeddedItem flag for transformations
          tempItem.updateEmbeddedDocuments = async (
            embeddedName,
            updates,
            options = {},
          ) => {
            // Use the standard updateEmbeddedDocuments for the actual update
            const result =
              await CONFIG.Item.documentClass.prototype.updateEmbeddedDocuments.call(
                tempItem,
                embeddedName,
                updates,
                options,
              );

            // Handle sheet closure based on fromEmbeddedItem flag
            if (!options.fromEmbeddedItem) {
              // Close the temporary sheet and re-render the action card sheet
              tempItem.sheet.close();
              if (!executionContext) {
                this.sheet.render(true);
              }
            } else {
              // For embedded item updates, just refresh the sheet without closing
              if (tempItem.sheet?.rendered) {
                tempItem.sheet.render(false);
              }
            }

            return result;
          };

          // Delegate handleBypass method from data model to item document if it exists
          if (typeof tempItem.system.handleBypass === "function") {
            tempItem.handleBypass = async (popupConfig, options) => {
              return await tempItem.system.handleBypass(popupConfig, options);
            };
          }

          return tempItem;
        });

        // Filter out null values
        const filteredTransformations = transformations.filter(
          (item) => item !== null,
        );

        return filteredTransformations;
      } catch (error) {
        Logger.error(
          "Failed to get embedded transformations",
          error,
          "ACTION_CARD",
        );
        return [];
      }
    }
  };
}
