import { Logger } from "../../services/logger.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";

/**
 * Item Sheet Character Effects Management Mixin
 *
 * Provides character effects management functionality for item sheets including:
 * - Character effects creation and deletion
 * - Form parsing for regular and hidden effects
 * - Effect mode handling (add, override, advantage, disadvantage)
 * - Active effect updates and synchronization
 *
 * @param {class} BaseClass - The base item sheet class to extend
 * @returns {class} Extended class with character effects functionality
 */
export const ItemSheetCharacterEffectsMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Updates the character effects for the item.
     * Processes both regular and hidden effects, handling additions and removals.
     *
     * @param {Object} [options={}] - Options for updating character effects
     * @param {Object} [options.newEffect] - Configuration for a new effect to add
     * @param {(null|"abilities"|"hiddenAbilities")} [options.newEffect.type] - Type of effect
     * @param {string} [options.newEffect.ability] - Ability identifier for the new effect
     * @param {Object} [options.remove] - Configuration for removing an existing effect
     * @param {number} [options.remove.index] - Index of the effect to remove
     * @param {(null|"regularEffects"|"hiddenEffects")} [options.remove.type] - Type of effect to remove
     * @returns {Promise<void>}
     * @protected
     */
    async _updateCharacterEffects({
      newEffect = { type: null, ability: null },
      remove = { index: null, type: null },
    } = {}) {
      Logger.methodEntry(
        "ItemSheetCharacterEffectsMixin",
        "_updateCharacterEffects",
        {
          itemName: this.item?.name,
          itemType: this.item?.type,
          newEffect,
          remove,
        },
      );

      try {
        // Get all form elements that include "characterEffects" in their name
        // Filter out elements that match the remove value if one is provided
        let formElements = this.form.querySelectorAll(
          '[name*="characterEffects"]',
        );

        if (remove.type && remove.index) {
          formElements = Array.from(formElements).filter(
            (el) => !el.name.includes(`${remove.type}.${remove.index}`),
          );
        }

        // Create an object to store the values
        const characterEffects = {
          regularEffects: [],
          hiddenEffects: [],
        };

        // Process each form element using for...of instead of forEach for async safety
        for (const element of formElements) {
          const name = element.name;
          const value = element.value;

          if (
            !name.includes("regularEffects") &&
            !name.includes("hiddenEffects")
          ) {
            continue;
          }

          const parts = name.split(".");
          if (parts.length < 3) continue;

          // Parse the name to extract the type (regularEffects or hiddenEffects) and index
          const type = parts[1]; // regularEffects or hiddenEffects
          const index = parseInt(parts[2], 10);
          const property = parts[3]; // ability, mode, value, etc.

          // Ensure the array has an object at this index
          if (!characterEffects[type][index]) {
            characterEffects[type][index] = {};
          }

          // Set the property value
          characterEffects[type][index][property] = value;
        }

        // Clean up the arrays (remove any undefined entries)
        characterEffects.regularEffects =
          characterEffects.regularEffects.filter((e) => e);
        characterEffects.hiddenEffects = characterEffects.hiddenEffects.filter(
          (e) => e,
        );

        const processEffects = async (effects, isRegular) => {
          return effects.map((effect) => {
            let key;

            if (isRegular) {
              key = `system.abilities.${effect.ability}.${
                effect.mode === "add"
                  ? "change"
                  : effect.mode === "override"
                    ? "override"
                    : effect.mode === "advantage"
                      ? "diceAdjustments.advantage"
                      : effect.mode === "disadvantage"
                        ? "diceAdjustments.disadvantage"
                        : "transform"
              }`;
            } else {
              key = `system.hiddenAbilities.${effect.ability}.${
                effect.mode === "add" ? "change" : "override"
              }`;
            }

            const mode =
              (isRegular && effect.mode !== "override") ||
              (!isRegular && effect.mode === "add")
                ? CONST.ACTIVE_EFFECT_MODES.ADD
                : CONST.ACTIVE_EFFECT_MODES.OVERRIDE;

            return { key, mode, value: effect.value };
          });
        };

        const newEffects = [
          ...(await processEffects(characterEffects.regularEffects, true)),
          ...(await processEffects(characterEffects.hiddenEffects, false)),
        ];

        if (newEffect.type && newEffect.ability) {
          newEffects.push({
            key: `system.${newEffect.type}.${newEffect.ability}.change`,
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: 0,
          });
        }

        const updateData = {
          _id: this.item.effects.contents[0]._id,
          changes: newEffects,
        };

        await this.item.updateEmbeddedDocuments("ActiveEffect", [updateData]);

        Logger.info(
          "Character effects updated successfully",
          {
            itemName: this.item.name,
            effectsCount: newEffects.length,
            regularEffectsCount: characterEffects.regularEffects.length,
            hiddenEffectsCount: characterEffects.hiddenEffects.length,
          },
          "CHARACTER_EFFECTS",
        );

        Logger.methodExit(
          "ItemSheetCharacterEffectsMixin",
          "_updateCharacterEffects",
        );
      } catch (error) {
        Logger.error(
          "Failed to update character effects",
          error,
          "CHARACTER_EFFECTS",
        );
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Update Character Effects: ${this.item?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.UI,
          userMessage: game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.CharacterEffectsUpdateFailed",
            {
              itemName: this.item?.name || "Unknown",
            },
          ),
        });
        Logger.methodExit(
          "ItemSheetCharacterEffectsMixin",
          "_updateCharacterEffects",
        );
        throw error;
      }
    }

    /**
     * Create a new character effect
     * @param {PointerEvent} event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _newCharacterEffect(event, target) {
      Logger.methodEntry(
        "ItemSheetCharacterEffectsMixin",
        "_newCharacterEffect",
        {
          itemName: this.item?.name,
          itemType: this.item?.type,
          targetDataset: target.dataset,
        },
      );

      try {
        const { type, ability } = target.dataset;
        const newEffect = {
          type,
          ability,
        };

        await this._updateCharacterEffects({ newEffect });
        event.target.focus();

        Logger.info(
          "New character effect created",
          {
            itemName: this.item.name,
            effectType: type,
            effectAbility: ability,
          },
          "CHARACTER_EFFECTS",
        );

        Logger.methodExit(
          "ItemSheetCharacterEffectsMixin",
          "_newCharacterEffect",
        );
      } catch (error) {
        Logger.error(
          "Failed to create new character effect",
          error,
          "CHARACTER_EFFECTS",
        );
        ui.notifications.error(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.CharacterEffectCreationFailed",
            {
              itemName: this.item?.name || "Unknown",
            },
          ),
        );
        Logger.methodExit(
          "ItemSheetCharacterEffectsMixin",
          "_newCharacterEffect",
        );
      }
    }

    /**
     * Delete a character effect
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _deleteCharacterEffect(_event, target) {
      Logger.methodEntry(
        "ItemSheetCharacterEffectsMixin",
        "_deleteCharacterEffect",
        {
          itemName: this.item?.name,
          itemType: this.item?.type,
          targetDataset: target.dataset,
        },
      );

      try {
        const index = target.dataset.index;
        const type = target.dataset.type;

        await this._updateCharacterEffects({ remove: { index, type } });

        Logger.info(
          "Character effect deleted",
          {
            itemName: this.item.name,
            effectIndex: index,
            effectType: type,
          },
          "CHARACTER_EFFECTS",
        );

        Logger.methodExit(
          "ItemSheetCharacterEffectsMixin",
          "_deleteCharacterEffect",
        );
      } catch (error) {
        Logger.error(
          "Failed to delete character effect",
          error,
          "CHARACTER_EFFECTS",
        );
        ui.notifications.error(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.CharacterEffectDeletionFailed",
            {
              itemName: this.item?.name || "Unknown",
            },
          ),
        );
        Logger.methodExit(
          "ItemSheetCharacterEffectsMixin",
          "_deleteCharacterEffect",
        );
      }
    }

    /**
     * Toggle effect display duration
     * @param {PointerEvent} event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _toggleEffectDisplay(event, target) {
      Logger.methodEntry(
        "ItemSheetCharacterEffectsMixin",
        "_toggleEffectDisplay",
        {
          itemName: this.item?.name,
          itemType: this.item?.type,
          checked: target.checked,
        },
      );

      try {
        const duration = target.checked ? { seconds: 604800 } : { seconds: 0 };
        const updateData = {
          _id: this.item.effects.contents[0]._id,
          duration,
        };

        await this.item.updateEmbeddedDocuments("ActiveEffect", [updateData]);
        event.target.focus();

        Logger.info(
          "Effect display toggled",
          {
            itemName: this.item.name,
            displayEnabled: target.checked,
            durationSeconds: duration.seconds,
          },
          "CHARACTER_EFFECTS",
        );

        Logger.methodExit(
          "ItemSheetCharacterEffectsMixin",
          "_toggleEffectDisplay",
        );
      } catch (error) {
        Logger.error(
          "Failed to toggle effect display",
          error,
          "CHARACTER_EFFECTS",
        );
        ui.notifications.error(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.EffectDisplayToggleFailed",
            {
              itemName: this.item?.name || "Unknown",
            },
          ),
        );
        Logger.methodExit(
          "ItemSheetCharacterEffectsMixin",
          "_toggleEffectDisplay",
        );
      }
    }
  };
