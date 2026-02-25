import { Logger } from "../../services/logger.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";
import { CharacterEffectsProcessor } from "../../services/character-effects-processor.mjs";

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
        // Delegate to service for form parsing
        const characterEffects =
          CharacterEffectsProcessor.parseCharacterEffectsForm(this.form, remove);

        // Delegate to service for effect processing (with extended modes)
        const changes = await CharacterEffectsProcessor.processEffectsToChanges(
          characterEffects,
          { supportExtendedModes: true },
        );

        // Add new effect if specified
        if (newEffect.type && newEffect.ability) {
          const newChange =
            CharacterEffectsProcessor.generateNewEffectChange(newEffect);
          changes.push(newChange);
        }

        // Delegate to service for effect creation/retrieval
        const firstEffect =
          await CharacterEffectsProcessor.getOrCreateFirstEffect(this.item);

        // Delegate to service for effect update
        await CharacterEffectsProcessor.updateEffectChanges(
          this.item,
          firstEffect,
          { _id: firstEffect._id, changes },
        );

        Logger.info("Character effects updated successfully", {
          itemName: this.item.name,
          effectsCount: changes.length,
          regularEffectsCount: characterEffects.regularEffects.length,
          hiddenEffectsCount: characterEffects.hiddenEffects.length,
          overrideEffectsCount: characterEffects.overrideEffects.length,
        }, "CHARACTER_EFFECTS");

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

        Logger.info("New character effect created", {
          itemName: this.item.name,
          effectType: type,
          effectAbility: ability,
        }, "CHARACTER_EFFECTS");

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

        Logger.info("Character effect deleted", {
          itemName: this.item.name,
          effectIndex: index,
          effectType: type,
        }, "CHARACTER_EFFECTS");

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
      // IMPORTANT: Check if this is being called on an EmbeddedItemSheet
      // If so, delegate to the embedded item's own handler
      if (this.constructor.name === "EmbeddedItemSheet" || this.parentItem) {
        // This is an embedded item sheet - use the class's own method
        if (
          this.constructor._toggleEffectDisplay &&
          this.constructor !== ItemSheetCharacterEffectsMixin
        ) {
          return this.constructor._toggleEffectDisplay.call(this, event, target);
        }
      }

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

        // Delegate to service for effect creation/retrieval with duration
        const firstEffect =
          await CharacterEffectsProcessor.getOrCreateFirstEffect(
            this.item,
            duration,
          );

        // Update the effect with new duration
        const updateData = {
          _id: firstEffect._id,
          duration,
        };

        await CharacterEffectsProcessor.updateEffectChanges(
          this.item,
          firstEffect,
          updateData,
        );
        event.target.focus();

        Logger.info("Effect display toggled", {
          itemName: this.item.name,
          displayEnabled: target.checked,
          durationSeconds: duration.seconds,
        }, "CHARACTER_EFFECTS");

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
