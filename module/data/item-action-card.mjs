import EventideRpSystemItemBase from "./base-item.mjs";
import { Logger } from "../services/logger.mjs";

export default class EventideRpSystemActionCard extends EventideRpSystemItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    /**
     * Single embedded item (combat power, gear, or feature)
     * Only used in attack chain mode
     */
    schema.embeddedItem = new fields.ObjectField({
      required: true,
      initial: {},
      nullable: true,
    });

    schema.bgColor = new fields.ColorField({
      initial: "#8B4513",
      blank: false,
      required: true,
    });
    schema.textColor = new fields.ColorField({
      initial: "#ffffff",
      blank: false,
      required: true,
    });

    /**
     * Action card mode - determines behavior
     */
    schema.mode = new fields.StringField({
      required: true,
      initial: "attackChain",
      choices: ["attackChain", "savedDamage"],
    });

    /**
     * Attack chain configuration (only used when mode is "attackChain")
     */
    schema.attackChain = new fields.SchemaField({
      firstStat: new fields.StringField({
        required: true,
        initial: "acro",
        choices: ["acro", "phys", "fort", "will", "wits"],
      }),
      secondStat: new fields.StringField({
        required: true,
        initial: "phys",
        choices: ["acro", "phys", "fort", "will", "wits"],
      }),
      damageCondition: new fields.StringField({
        required: true,
        initial: "never",
        choices: ["never", "oneSuccess", "twoSuccesses"],
      }),
      damageFormula: new fields.StringField({
        required: true,
        initial: "1d6",
        blank: true,
      }),
      damageType: new fields.StringField({
        required: true,
        initial: "damage",
        choices: ["damage", "heal"],
      }),
      statusCondition: new fields.StringField({
        required: true,
        initial: "never",
        choices: ["never", "oneSuccess", "twoSuccesses"],
      }),
    });

    /**
     * Embedded effects that can be applied on chain hits
     * Can contain both status effects and gear items with threshold configuration
     */
    schema.embeddedStatusEffects = new fields.ArrayField(
      new fields.SchemaField({
        // The actual item/effect data
        itemData: new fields.ObjectField({
          required: true,
        }),
        // Threshold configuration for when this effect should be applied
        threshold: new fields.SchemaField({
          type: new fields.StringField({
            required: true,
            initial: "never",
            choices: ["never", "oneSuccess", "twoSuccesses", "rollValue"],
          }),
          value: new fields.NumberField({
            required: false,
            initial: 15,
            integer: true,
            min: 1,
            max: 30,
          }),
        }),
      }),
      {
        required: true,
        initial: [],
      },
    );

    /**
     * Saved damage configuration (only used when mode is "savedDamage")
     */
    schema.savedDamage = new fields.SchemaField({
      formula: new fields.StringField({
        required: true,
        initial: "1d6",
        blank: true,
      }),
      type: new fields.StringField({
        required: true,
        initial: "damage",
        choices: ["damage", "heal"],
      }),
      description: new fields.StringField({
        required: true,
        initial: "",
        blank: true,
      }),
    });

    return schema;
  }

  /**
   * Set the embedded item for this action card.
   * Replaces any existing embedded item.
   *
   * @param {Item} item - The item to embed in this action card.
   * @returns {Promise<EventideRpSystemActionCard>} This action card instance for method chaining.
   * @throws {Error} If the provided item is not a supported type.
   * @async
   */
  async setEmbeddedItem(item) {
    Logger.methodEntry("EventideRpSystemActionCard", "setEmbeddedItem", {
      itemName: item?.name,
      itemType: item?.type,
      actionCardName: this.parent?.name,
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
          { originalType: rollType, specialHandling: "automaticTwoSuccesses" },
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

      // Update the parent document
      await this.parent.update({ "system.embeddedItem": itemData });

      Logger.info(
        `Successfully embedded ${item.type} "${item.name}" in action card "${this.parent.name}"`,
        { itemId: itemData._id },
        "ACTION_CARD",
      );

      Logger.methodExit("EventideRpSystemActionCard", "setEmbeddedItem", this);
      return this;
    } catch (error) {
      Logger.error("Failed to set embedded item", error, "ACTION_CARD");
      Logger.methodExit("EventideRpSystemActionCard", "setEmbeddedItem", null);
      throw error;
    }
  }

  /**
   * Clear the embedded item from this action card
   *
   * @returns {Promise<EventideRpSystemActionCard>} This action card instance for method chaining
   * @async
   */
  async clearEmbeddedItem() {
    Logger.methodEntry("EventideRpSystemActionCard", "clearEmbeddedItem", {
      actionCardName: this.parent?.name,
    });

    try {
      await this.parent.update({ "system.embeddedItem": null });

      Logger.info(
        `Cleared embedded item from action card "${this.parent.name}"`,
        null,
        "ACTION_CARD",
      );

      Logger.methodExit(
        "EventideRpSystemActionCard",
        "clearEmbeddedItem",
        this,
      );
      return this;
    } catch (error) {
      Logger.error("Failed to clear embedded item", error, "ACTION_CARD");
      Logger.methodExit(
        "EventideRpSystemActionCard",
        "clearEmbeddedItem",
        null,
      );
      throw error;
    }
  }

  /**
   * Get the embedded item as a temporary Item instance
   * @returns {Item|null} Temporary Item instance or null if no item embedded
   */
  getEmbeddedItem() {
    Logger.methodEntry("EventideRpSystemActionCard", "getEmbeddedItem", {
      hasEmbeddedItem: !!(
        this.embeddedItem && Object.keys(this.embeddedItem).length > 0
      ),
    });

    try {
      if (
        !this.embeddedItem ||
        this.embeddedItem === null ||
        Object.keys(this.embeddedItem).length === 0
      ) {
        Logger.debug("No embedded item found", null, "ACTION_CARD");
        Logger.methodExit(
          "EventideRpSystemActionCard",
          "getEmbeddedItem",
          null,
        );
        return null;
      }

      const actionCard = this.parent;

      // Use the action card's actor as the parent, or null if unowned
      const actor = actionCard?.isOwned ? actionCard.parent : null;
      const tempItem = new CONFIG.Item.documentClass(this.embeddedItem, {
        parent: actor,
      });

      // Initialize effects collection if it doesn't exist
      if (!tempItem.effects) {
        tempItem.effects = new foundry.utils.Collection();
      }

      // If the item data has effects, create temporary ActiveEffect documents
      if (
        this.embeddedItem.effects &&
        Array.isArray(this.embeddedItem.effects)
      ) {
        for (const effectData of this.embeddedItem.effects) {
          const tempEffect = new CONFIG.ActiveEffect.documentClass(effectData, {
            parent: tempItem,
          });
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
        const currentItemData = foundry.utils.deepClone(this.embeddedItem);

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
        tempItem.sheet.close();
        actionCard.sheet.render(true);
        return tempItem;
      };

      Logger.debug(
        `Retrieved embedded item: ${tempItem.type} "${tempItem.name}"`,
        { itemId: tempItem.id },
        "ACTION_CARD",
      );

      Logger.methodExit(
        "EventideRpSystemActionCard",
        "getEmbeddedItem",
        tempItem,
      );
      return tempItem;
    } catch (error) {
      Logger.error("Failed to get embedded item", error, "ACTION_CARD");
      Logger.methodExit("EventideRpSystemActionCard", "getEmbeddedItem", null);
      return null;
    }
  }

  /**
   * Add an effect item to this action card's embedded effects.
   * Supports both status effects and gear items.
   *
   * @param {Item} effectItem - The effect item to add (status or gear).
   * @returns {Promise<EventideRpSystemActionCard>} This action card instance for method chaining.
   * @throws {Error} If the provided item is not a supported effect type.
   * @async
   */
  async addEmbeddedEffect(effectItem) {
    Logger.methodEntry("EventideRpSystemActionCard", "addEmbeddedEffect", {
      effectName: effectItem?.name,
      effectType: effectItem?.type,
    });

    try {
      // Validate supported effect types
      const supportedTypes = ["status", "gear"];
      if (!supportedTypes.includes(effectItem.type)) {
        const error = new Error(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.ActionCardEffectTypes", {
            type: effectItem.type,
            supported: supportedTypes.join(", "),
          }),
        );
        Logger.error("Invalid effect type", error, "ACTION_CARD");
        throw error;
      }

      // Get current effects
      const effects = foundry.utils.deepClone(this.embeddedStatusEffects || []);

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
        } else if (!rollType || !["roll", "flat", "none"].includes(rollType)) {
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

      // Create the effect entry with threshold configuration
      const effectEntry = {
        itemData: effectData,
        threshold: {
          type: "oneSuccess", // Default threshold type
          value: 15, // Default threshold value
        },
      };

      // Add to the array
      effects.push(effectEntry);

      // Update the parent document
      await this.parent.update({
        "system.embeddedStatusEffects": effects,
      });

      Logger.info(
        `Added ${effectItem.type} effect "${effectItem.name}" to action card "${this.parent.name}"`,
        { effectId: effectData._id },
        "ACTION_CARD",
      );

      Logger.methodExit(
        "EventideRpSystemActionCard",
        "addEmbeddedEffect",
        this,
      );
      return this;
    } catch (error) {
      Logger.error("Failed to add embedded effect", error, "ACTION_CARD");
      Logger.methodExit(
        "EventideRpSystemActionCard",
        "addEmbeddedEffect",
        null,
      );
      throw error;
    }
  }

  /**
   * Remove an embedded effect from this action card's embedded effects
   *
   * @param {string} effectId - The ID of the effect to remove
   * @returns {Promise<EventideRpSystemActionCard>} This action card instance for method chaining
   * @async
   */
  async removeEmbeddedEffect(effectId) {
    Logger.methodEntry("EventideRpSystemActionCard", "removeEmbeddedEffect", {
      effectId,
    });

    try {
      // Get current effects
      const effects = foundry.utils.deepClone(this.embeddedStatusEffects || []);

      // Find the effect to remove
      const index = effects.findIndex((e) => {
        // Handle malformed entries gracefully
        if (!e || !e.itemData || !e.itemData._id) {
          Logger.warn(
            "Malformed effect entry found during removal, skipping",
            { effectEntry: e, effectId },
            "ACTION_CARD",
          );
          return false;
        }
        return e.itemData._id === effectId;
      });

      if (index === -1) {
        Logger.debug("Effect not found", { effectId }, "ACTION_CARD");
        Logger.methodExit(
          "EventideRpSystemActionCard",
          "removeEmbeddedEffect",
          this,
        );
        return this; // Not found
      }

      // Remove from the array
      effects.splice(index, 1);

      // Update the parent document
      await this.parent.update({
        "system.embeddedStatusEffects": effects,
      });

      Logger.info(
        `Removed embedded effect from action card "${this.parent.name}"`,
        { effectId },
        "ACTION_CARD",
      );

      Logger.methodExit(
        "EventideRpSystemActionCard",
        "removeEmbeddedEffect",
        this,
      );
      return this;
    } catch (error) {
      Logger.error("Failed to remove embedded effect", error, "ACTION_CARD");
      Logger.methodExit(
        "EventideRpSystemActionCard",
        "removeEmbeddedEffect",
        null,
      );
      throw error;
    }
  }

  /**
   * Get all embedded effects as temporary Item instances
   * @returns {Item[]} Array of temporary Item instances
   */
  getEmbeddedEffects() {
    Logger.methodEntry("EventideRpSystemActionCard", "getEmbeddedEffects", {
      effectCount: this.embeddedStatusEffects?.length || 0,
    });

    try {
      if (!this.embeddedStatusEffects?.length) {
        Logger.debug("No embedded effects found", null, "ACTION_CARD");
        Logger.methodExit(
          "EventideRpSystemActionCard",
          "getEmbeddedEffects",
          [],
        );
        return [];
      }

      const actionCard = this.parent;

      const effects = this.embeddedStatusEffects.map((effectEntry) => {
        // Validate effect entry structure
        if (!effectEntry || !effectEntry.itemData || !effectEntry.threshold) {
          Logger.warn(
            "Invalid effect entry structure in getEmbeddedEffects, skipping",
            { effectEntry, actionCardName: this.parent.name },
            "ACTION_CARD",
          );
          return null; // Will be filtered out
        }

        const effectData = effectEntry.itemData;
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

        // Store the threshold configuration for template access
        Object.defineProperty(tempItem, "threshold", {
          value: effectEntry.threshold,
          configurable: true,
        });

        // Override the update method to persist changes back to the action card
        tempItem.update = async (data) => {
          const currentEffects = foundry.utils.deepClone(
            this.embeddedStatusEffects,
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
          tempItem.sheet.close();
          actionCard.sheet.render(true);
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
        "EventideRpSystemActionCard",
        "getEmbeddedEffects",
        filteredEffects,
      );
      return filteredEffects;
    } catch (error) {
      Logger.error("Failed to get embedded effects", error, "ACTION_CARD");
      Logger.methodExit("EventideRpSystemActionCard", "getEmbeddedEffects", []);
      return [];
    }
  }

  /**
   * Execute the action card based on its mode
   * @param {Actor} actor - The actor executing the action card
   * @returns {Promise<Object>} Result of the execution
   */
  async execute(actor) {
    Logger.methodEntry("EventideRpSystemActionCard", "execute", {
      actorName: actor?.name,
      actionCardName: this.parent?.name,
      mode: this.mode,
    });

    try {
      if (this.mode === "attackChain") {
        return await this.executeAttackChain(actor);
      } else if (this.mode === "savedDamage") {
        return await this.executeSavedDamage(actor);
      } else {
        const error = new Error(`Unknown action card mode: ${this.mode}`);
        Logger.error("Unknown action card mode", error, "ACTION_CARD");
        throw error;
      }
    } catch (error) {
      Logger.error("Failed to execute action card", error, "ACTION_CARD");
      Logger.methodExit("EventideRpSystemActionCard", "execute", null);
      throw error;
    }
  }

  /**
   * Execute the action card with a pre-computed roll result
   * @param {Actor} actor - The actor executing the action card
   * @param {Roll} rollResult - The pre-computed roll result from the embedded item
   * @returns {Promise<Object>} Result of the execution
   */
  async executeWithRollResult(actor, rollResult) {
    Logger.methodEntry("EventideRpSystemActionCard", "executeWithRollResult", {
      actorName: actor?.name,
      actionCardName: this.parent?.name,
      mode: this.mode,
      hasRollResult: !!rollResult,
    });

    try {
      if (this.mode === "attackChain") {
        return await this.executeAttackChainWithRollResult(actor, rollResult);
      } else if (this.mode === "savedDamage") {
        return await this.executeSavedDamage(actor);
      } else {
        const error = new Error(`Unknown action card mode: ${this.mode}`);
        Logger.error("Unknown action card mode", error, "ACTION_CARD");
        throw error;
      }
    } catch (error) {
      Logger.error(
        "Failed to execute action card with roll result",
        error,
        "ACTION_CARD",
      );
      Logger.methodExit(
        "EventideRpSystemActionCard",
        "executeWithRollResult",
        null,
      );
      throw error;
    }
  }

  /**
   * Execute the action card's attack chain with a pre-computed roll result
   * @param {Actor} actor - The actor executing the action card
   * @param {Roll} rollResult - The pre-computed roll result from the embedded item
   * @returns {Promise<Object>} Result of the attack chain execution
   */
  async executeAttackChainWithRollResult(actor, rollResult) {
    Logger.methodEntry(
      "EventideRpSystemActionCard",
      "executeAttackChainWithRollResult",
      {
        actorName: actor?.name,
        actionCardName: this.parent?.name,
        mode: this.mode,
        rollTotal: rollResult?.total,
      },
    );

    try {
      if (this.mode !== "attackChain") {
        const error = new Error("Action card is not in attack chain mode");
        Logger.error(
          "Action card not in attack chain mode",
          error,
          "ACTION_CARD",
        );
        throw error;
      }

      // Check if attack chains are enabled globally
      const chainsEnabled = game.settings.get(
        "eventide-rp-system",
        "enableActionCardChains",
      );
      if (!chainsEnabled) {
        const error = new Error("Attack chains are disabled by GM settings");
        Logger.warn("Attack chains disabled by GM", error, "ACTION_CARD");
        throw error;
      }

      // Get targets for AC checking
      const targetArray = await erps.utils.getTargetArray();
      if (targetArray.length === 0) {
        Logger.warn("No targets found for attack chain", null, "ACTION_CARD");
        ui.notifications.warn("No targets selected for attack chain");
        return { success: false, reason: "noTargets" };
      }

      const embeddedItem = this.getEmbeddedItem();
      if (!embeddedItem) {
        const error = new Error("No embedded item found for attack chain");
        Logger.error("No embedded item for attack chain", error, "ACTION_CARD");
        throw error;
      }

      // Check hits against target ACs using the roll result
      const results = targetArray.map((target) => {
        const targetRollData = target.actor.getRollData();
        const firstAC =
          targetRollData.abilities[this.attackChain.firstStat]?.ac || 11;
        const secondAC =
          targetRollData.abilities[this.attackChain.secondStat]?.ac || 11;

        // Handle "none" roll types as automatic two successes
        if (embeddedItem.system.roll?.type === "none") {
          Logger.debug(
            "Embedded item has 'none' roll type - treating as automatic two successes",
            { itemName: embeddedItem.name, targetName: target.actor.name },
            "ACTION_CARD",
          );
          return {
            target: target.actor,
            firstHit: true,
            secondHit: true,
            bothHit: true,
            oneHit: true,
          };
        }

        // Normal roll-based hit calculation
        const rollTotal = rollResult?.total || 0;
        const firstHit = rollResult ? rollTotal >= firstAC : false;
        const secondHit = rollResult ? rollTotal >= secondAC : false;

        return {
          target: target.actor,
          firstHit,
          secondHit,
          bothHit: firstHit && secondHit,
          oneHit: firstHit || secondHit,
        };
      });

      // Handle damage application
      const damageResults = [];
      for (const result of results) {
        const shouldApplyDamage = this._shouldApplyEffect(
          this.attackChain.damageCondition,
          result.oneHit,
          result.bothHit,
        );

        if (shouldApplyDamage && this.attackChain.damageFormula) {
          if (game.user.isGM) {
            // GM applies damage directly
            try {
              const damageRoll = await result.target.damageResolve({
                formula: this.attackChain.damageFormula,
                label: `${this.parent.name ? this.parent.name : "Action Card"}`,
                description:
                  this.parent.system.description ||
                  `Attack chain damage from ${this.parent.name}`,
                type: this.attackChain.damageType,
                img: this._getEffectiveImage(),
                bgColor: this.bgColor,
                textColor: this.textColor,
              });
              damageResults.push({ target: result.target, roll: damageRoll });
            } catch (damageError) {
              Logger.error(
                "Failed to apply chain damage",
                damageError,
                "ACTION_CARD",
              );
            }
          } else {
            // Player creates GM apply card
            damageResults.push({
              target: result.target,
              needsGMApplication: true,
              formula: this.attackChain.damageFormula,
              type: this.attackChain.damageType,
            });
          }
        }
      }

      // Handle status effect application
      const statusResults = [];

      // Early exit if no embedded effects
      if (
        !this.embeddedStatusEffects ||
        this.embeddedStatusEffects.length === 0
      ) {
        Logger.debug(
          "No embedded status effects to process",
          { actionCardName: this.parent.name },
          "ACTION_CARD",
        );
      } else {
        // Process each target for effect application
        for (const result of results) {
          for (const effectEntry of this.embeddedStatusEffects) {
            // Validate effect entry structure
            if (
              !effectEntry ||
              !effectEntry.itemData ||
              !effectEntry.threshold
            ) {
              Logger.warn(
                "Invalid effect entry structure, skipping",
                {
                  effectEntry,
                  actionCardName: this.parent.name,
                  targetName: result.target.name,
                },
                "ACTION_CARD",
              );
              continue;
            }

            // Check if threshold is met using the new threshold system
            const shouldApply = this._shouldApplyEffectWithThreshold(
              effectEntry.threshold,
              result.oneHit,
              result.bothHit,
              rollResult?.total || 0,
            );

            if (shouldApply) {
              if (game.user.isGM) {
                // GM applies status effects directly
                try {
                  // Create the status item on the target
                  await result.target.createEmbeddedDocuments("Item", [
                    effectEntry.itemData,
                  ]);
                  statusResults.push({
                    target: result.target,
                    effect: effectEntry.itemData,
                    threshold: effectEntry.threshold,
                    applied: true,
                  });

                  Logger.info(
                    `Applied effect "${effectEntry.itemData.name}" to target "${result.target.name}"`,
                    {
                      thresholdType: effectEntry.threshold.type,
                      thresholdValue: effectEntry.threshold.value,
                      rollTotal: rollResult?.total || 0,
                    },
                    "ACTION_CARD",
                  );
                } catch (statusError) {
                  Logger.error(
                    "Failed to apply status effect",
                    statusError,
                    "ACTION_CARD",
                  );
                  statusResults.push({
                    target: result.target,
                    effect: effectEntry.itemData,
                    threshold: effectEntry.threshold,
                    applied: false,
                    error: statusError.message,
                  });
                }
              } else {
                // Player creates GM apply card
                statusResults.push({
                  target: result.target,
                  effect: effectEntry.itemData,
                  threshold: effectEntry.threshold,
                  needsGMApplication: true,
                });

                Logger.debug(
                  `Flagged effect "${effectEntry.itemData.name}" for GM application to target "${result.target.name}"`,
                  {
                    thresholdType: effectEntry.threshold.type,
                    thresholdValue: effectEntry.threshold.value,
                    rollTotal: rollResult?.total || 0,
                  },
                  "ACTION_CARD",
                );
              }
            }
          }
        }
      }

      const chainResult = {
        success: true,
        mode: "attackChain",
        baseRoll: rollResult,
        embeddedItemRollMessage: rollResult?.messageId || null,
        targetResults: results,
        damageResults,
        statusResults,
      };

      Logger.info(
        `Attack chain executed successfully with provided roll result`,
        {
          targetsHit: results.filter((r) => r.oneHit).length,
          damageApplications: damageResults.length,
          statusApplications: statusResults.length,
        },
        "ACTION_CARD",
      );

      Logger.methodExit(
        "EventideRpSystemActionCard",
        "executeAttackChainWithRollResult",
        chainResult,
      );
      return chainResult;
    } catch (error) {
      Logger.error(
        "Failed to execute attack chain with roll result",
        error,
        "ACTION_CARD",
      );
      Logger.methodExit(
        "EventideRpSystemActionCard",
        "executeAttackChainWithRollResult",
        null,
      );
      throw error;
    }
  }

  /**
   * Execute the action card's attack chain
   * @param {Actor} actor - The actor executing the action card
   * @returns {Promise<Object>} Result of the attack chain execution
   */
  async executeAttackChain(actor) {
    Logger.methodEntry("EventideRpSystemActionCard", "executeAttackChain", {
      actorName: actor?.name,
      actionCardName: this.parent?.name,
      mode: this.mode,
    });

    try {
      if (this.mode !== "attackChain") {
        const error = new Error("Action card is not in attack chain mode");
        Logger.error(
          "Action card not in attack chain mode",
          error,
          "ACTION_CARD",
        );
        throw error;
      }

      // Check if attack chains are enabled globally
      const chainsEnabled = game.settings.get(
        "eventide-rp-system",
        "enableActionCardChains",
      );
      if (!chainsEnabled) {
        const error = new Error("Attack chains are disabled by GM settings");
        Logger.warn("Attack chains disabled by GM", error, "ACTION_CARD");
        throw error;
      }

      const embeddedItem = this.getEmbeddedItem();
      if (!embeddedItem) {
        const error = new Error("No embedded item found for attack chain");
        Logger.error("No embedded item for attack chain", error, "ACTION_CARD");
        throw error;
      }

      // Execute the embedded item's roll with popup and capture result
      Logger.info(
        `Executing embedded item roll: ${embeddedItem.name}`,
        { itemType: embeddedItem.type },
        "ACTION_CARD",
      );

      // Set up a promise to capture the roll result from the popup
      const rollResultPromise = new Promise((resolve, reject) => {
        // Set up a one-time hook to capture the combat power message
        const hookId = Hooks.on("createChatMessage", (message) => {
          // Check if this message is from our actor and has rolls
          if (
            message.speaker?.actor === actor.id ||
            message.speaker?.alias === actor.name
          ) {
            const roll = message.rolls?.[0];
            if (roll) {
              Logger.debug(
                "Captured roll result from popup",
                {
                  total: roll.total,
                  formula: roll.formula,
                  messageId: message.id,
                },
                "ACTION_CARD",
              );
              // Add messageId to the roll object
              roll.messageId = message.id;
              Hooks.off("createChatMessage", hookId);
              resolve(roll);
            } else {
              // Non-roll message from our actor
              Logger.debug(
                "Captured non-roll message from popup",
                { messageId: message.id },
                "ACTION_CARD",
              );
              Hooks.off("createChatMessage", hookId);
              resolve(null);
            }
          }
        });

        // Set up a timeout to prevent hanging
        setTimeout(() => {
          Hooks.off("createChatMessage", hookId);
          reject(new Error("Timeout waiting for roll result"));
        }, 10000);
      });

      // Open the popup (this will create the chat message)
      const popup = await embeddedItem.roll();
      if (!popup) {
        const error = new Error("Failed to open embedded item popup");
        Logger.error("Failed to open popup", error, "ACTION_CARD");
        throw error;
      }

      // Wait for the roll result from the popup
      let rollResult = null;
      try {
        rollResult = await rollResultPromise;
        Logger.debug(
          "Roll result received from popup",
          {
            rollResult,
            total: rollResult?.total,
            formula: rollResult?.formula,
            resultType: typeof rollResult,
          },
          "ACTION_CARD",
        );
      } catch (error) {
        Logger.warn(
          "No roll result captured (possibly non-roll item)",
          error,
          "ACTION_CARD",
        );
        // Continue without roll result for non-roll items
      }

      // Get targets for AC checking
      const targetArray = await erps.utils.getTargetArray();
      if (targetArray.length === 0) {
        Logger.warn("No targets found for attack chain", null, "ACTION_CARD");
        ui.notifications.warn("No targets selected for attack chain");
        return { success: false, reason: "noTargets" };
      }

      // Check hits against target ACs using the roll result
      const results = targetArray.map((target) => {
        const targetRollData = target.actor.getRollData();
        const firstAC =
          targetRollData.abilities[this.attackChain.firstStat]?.ac || 11;
        const secondAC =
          targetRollData.abilities[this.attackChain.secondStat]?.ac || 11;

        // Handle "none" roll types as automatic two successes
        if (embeddedItem.system.roll?.type === "none") {
          Logger.debug(
            "Embedded item has 'none' roll type - treating as automatic two successes",
            { itemName: embeddedItem.name, targetName: target.actor.name },
            "ACTION_CARD",
          );
          return {
            target: target.actor,
            firstHit: true,
            secondHit: true,
            bothHit: true,
            oneHit: true,
          };
        }

        // Normal roll-based hit calculation
        const rollTotal = rollResult?.total || 0;
        const firstHit = rollResult ? rollTotal >= firstAC : false;
        const secondHit = rollResult ? rollTotal >= secondAC : false;

        return {
          target: target.actor,
          firstHit,
          secondHit,
          bothHit: firstHit && secondHit,
          oneHit: firstHit || secondHit,
        };
      });

      // Handle damage application
      const damageResults = [];
      for (const result of results) {
        const shouldApplyDamage = this._shouldApplyEffect(
          this.attackChain.damageCondition,
          result.oneHit,
          result.bothHit,
        );

        if (shouldApplyDamage && this.attackChain.damageFormula) {
          if (game.user.isGM) {
            // GM applies damage directly
            try {
              const damageRoll = await result.target.damageResolve({
                formula: this.attackChain.damageFormula,
                label: `${this.parent.name ? this.parent.name : "Action Card"}`,
                description:
                  this.parent.system.description ||
                  `Attack chain damage from ${this.parent.name}`,
                type: this.attackChain.damageType,
                img: this._getEffectiveImage(),
                bgColor: this.bgColor,
                textColor: this.textColor,
              });
              damageResults.push({ target: result.target, roll: damageRoll });
            } catch (damageError) {
              Logger.error(
                "Failed to apply chain damage",
                damageError,
                "ACTION_CARD",
              );
            }
          } else {
            // Player creates GM apply card
            damageResults.push({
              target: result.target,
              needsGMApplication: true,
              formula: this.attackChain.damageFormula,
              type: this.attackChain.damageType,
            });
          }
        }
      }

      // Handle status effect application
      const statusResults = [];

      // Early exit if no embedded effects
      if (
        !this.embeddedStatusEffects ||
        this.embeddedStatusEffects.length === 0
      ) {
        Logger.debug(
          "No embedded status effects to process",
          { actionCardName: this.parent.name },
          "ACTION_CARD",
        );
      } else {
        // Process each target for effect application
        for (const result of results) {
          for (const effectEntry of this.embeddedStatusEffects) {
            // Validate effect entry structure
            if (
              !effectEntry ||
              !effectEntry.itemData ||
              !effectEntry.threshold
            ) {
              Logger.warn(
                "Invalid effect entry structure, skipping",
                {
                  effectEntry,
                  actionCardName: this.parent.name,
                  targetName: result.target.name,
                },
                "ACTION_CARD",
              );
              continue;
            }

            // Check if threshold is met using the new threshold system
            const shouldApply = this._shouldApplyEffectWithThreshold(
              effectEntry.threshold,
              result.oneHit,
              result.bothHit,
              rollResult?.total || 0,
            );

            if (shouldApply) {
              if (game.user.isGM) {
                // GM applies status effects directly
                try {
                  // Create the status item on the target
                  await result.target.createEmbeddedDocuments("Item", [
                    effectEntry.itemData,
                  ]);
                  statusResults.push({
                    target: result.target,
                    effect: effectEntry.itemData,
                    threshold: effectEntry.threshold,
                    applied: true,
                  });

                  Logger.info(
                    `Applied effect "${effectEntry.itemData.name}" to target "${result.target.name}"`,
                    {
                      thresholdType: effectEntry.threshold.type,
                      thresholdValue: effectEntry.threshold.value,
                      rollTotal: rollResult?.total || 0,
                    },
                    "ACTION_CARD",
                  );
                } catch (statusError) {
                  Logger.error(
                    "Failed to apply status effect",
                    statusError,
                    "ACTION_CARD",
                  );
                  statusResults.push({
                    target: result.target,
                    effect: effectEntry.itemData,
                    threshold: effectEntry.threshold,
                    applied: false,
                    error: statusError.message,
                  });
                }
              } else {
                // Player creates GM apply card
                statusResults.push({
                  target: result.target,
                  effect: effectEntry.itemData,
                  threshold: effectEntry.threshold,
                  needsGMApplication: true,
                });

                Logger.debug(
                  `Flagged effect "${effectEntry.itemData.name}" for GM application to target "${result.target.name}"`,
                  {
                    thresholdType: effectEntry.threshold.type,
                    thresholdValue: effectEntry.threshold.value,
                    rollTotal: rollResult?.total || 0,
                  },
                  "ACTION_CARD",
                );
              }
            }
          }
        }
      }

      const chainResult = {
        success: true,
        mode: "attackChain",
        baseRoll: rollResult,
        embeddedItemRollMessage: rollResult?.messageId || null,
        targetResults: results,
        damageResults,
        statusResults,
      };

      Logger.info(
        `Attack chain executed successfully`,
        {
          targetsHit: results.filter((r) => r.oneHit).length,
          damageApplications: damageResults.length,
          statusApplications: statusResults.length,
        },
        "ACTION_CARD",
      );

      Logger.methodExit(
        "EventideRpSystemActionCard",
        "executeAttackChain",
        chainResult,
      );
      return chainResult;
    } catch (error) {
      Logger.error("Failed to execute attack chain", error, "ACTION_CARD");
      Logger.methodExit(
        "EventideRpSystemActionCard",
        "executeAttackChain",
        null,
      );
      throw error;
    }
  }

  /**
   * Execute saved damage mode
   * @param {Actor} actor - The actor executing the action card
   * @returns {Promise<Object>} Result of the saved damage execution
   */
  async executeSavedDamage(actor) {
    Logger.methodEntry("EventideRpSystemActionCard", "executeSavedDamage", {
      actorName: actor?.name,
      actionCardName: this.parent?.name,
    });

    try {
      if (this.mode !== "savedDamage") {
        const error = new Error("Action card is not in saved damage mode");
        Logger.error(
          "Action card not in saved damage mode",
          error,
          "ACTION_CARD",
        );
        throw error;
      }

      // Get targets
      const targetArray = await erps.utils.getTargetArray();
      if (targetArray.length === 0) {
        Logger.warn("No targets found for saved damage", null, "ACTION_CARD");
        ui.notifications.warn("No targets selected for saved damage");
        return { success: false, reason: "noTargets" };
      }

      const damageResults = [];

      // Apply saved damage to each target
      for (const target of targetArray) {
        try {
          const damageRoll = await target.actor.damageResolve({
            formula: this.savedDamage.formula,
            label: this.parent.name,
            description:
              this.parent.system.description || this.savedDamage.description,
            type: this.savedDamage.type,
            // Use action card image unless it's default
            img: this._getEffectiveImage(),
            bgColor: this.bgColor,
            textColor: this.textColor,
          });

          damageResults.push({ target: target.actor, roll: damageRoll });
        } catch (damageError) {
          Logger.error(
            "Failed to apply saved damage",
            damageError,
            "ACTION_CARD",
          );
        }
      }

      const result = {
        success: true,
        mode: "savedDamage",
        damageResults,
      };

      Logger.info(
        `Saved damage executed successfully`,
        { targetsAffected: damageResults.length },
        "ACTION_CARD",
      );

      Logger.methodExit(
        "EventideRpSystemActionCard",
        "executeSavedDamage",
        result,
      );
      return result;
    } catch (error) {
      Logger.error("Failed to execute saved damage", error, "ACTION_CARD");
      Logger.methodExit(
        "EventideRpSystemActionCard",
        "executeSavedDamage",
        null,
      );
      throw error;
    }
  }

  /**
   * Get the effective image for damage rolls
   * @private
   */
  _getEffectiveImage() {
    const defaultImages = [
      "icons/svg/item-bag.svg",
      "icons/svg/mystery-man.svg",
      "",
      null,
      undefined,
    ];

    // Use action card image unless it's default, then fall back to embedded item
    if (!defaultImages.includes(this.parent.img)) {
      return this.parent.img;
    }

    const embeddedItem = this.getEmbeddedItem();
    if (embeddedItem && !defaultImages.includes(embeddedItem.img)) {
      return embeddedItem.img;
    }

    return this.parent.img;
  }

  /**
   * Helper method to determine if an effect should be applied based on conditions
   * @private
   */
  _shouldApplyEffect(condition, oneHit, bothHit) {
    switch (condition) {
      case "never":
        return false;
      case "oneSuccess":
        return oneHit;
      case "twoSuccesses":
        return bothHit;
      default:
        return false;
    }
  }

  /**
   * Helper method to determine if an effect should be applied based on threshold configuration
   * @param {Object} threshold - The threshold configuration
   * @param {boolean} oneHit - Whether at least one AC was hit
   * @param {boolean} bothHit - Whether both ACs were hit
   * @param {number} rollTotal - The total roll result
   * @returns {boolean} Whether the effect should be applied
   * @private
   */
  _shouldApplyEffectWithThreshold(threshold, oneHit, bothHit, rollTotal) {
    if (!threshold) {
      // Fallback to oneSuccess for effects without threshold configuration
      return oneHit;
    }

    switch (threshold.type) {
      case "never":
        return false;
      case "oneSuccess":
        return oneHit;
      case "twoSuccesses":
        return bothHit;
      case "rollValue":
        return rollTotal >= (threshold.value || 15);
      default:
        return oneHit; // Default fallback
    }
  }
}
