import { Logger } from "../../services/_module.mjs";
import { CharacterEffectsProcessor } from "../../services/character-effects-processor.mjs";

/**
 * Embedded Item Character Effects Mixin
 *
 * Provides character effects management specifically for embedded items, extending
 * the base character effects functionality to handle the complex data structures
 * of embedded items in action cards and transformation items.
 *
 * @param {class} BaseClass - The base item sheet class to extend
 * @returns {class} Extended class with embedded item character effects functionality
 */
export const EmbeddedItemCharacterEffectsMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Update character effects for embedded items
     * @param {Object} options - Update options
     * @param {Object} [options.newEffect] - Configuration for a new effect to add
     * @param {Object} [options.remove] - Configuration for removing an existing effect
     * @returns {Promise<void>}
     * @protected
     */
    async _updateEmbeddedCharacterEffects({
      newEffect = { type: null, ability: null },
      remove = { index: null, type: null },
    } = {}) {
      // Delegate to service for form parsing
      const characterEffects =
        CharacterEffectsProcessor.parseCharacterEffectsForm(this.form, remove);

      // Delegate to service for effect processing (without extended modes)
      const changes = await CharacterEffectsProcessor.processEffectsToChanges(
        characterEffects,
        { supportExtendedModes: false },
      );

      // Add new effect if specified
      if (newEffect.type && newEffect.ability) {
        const newChange =
          CharacterEffectsProcessor.generateNewEffectChange(newEffect);
        changes.push(newChange);
      }

      // Get or create effect (only for status/gear types)
      let firstEffect = this.document.effects.contents[0];

      if (
        !firstEffect &&
        (this.document.type === "status" || this.document.type === "gear")
      ) {
        firstEffect = await CharacterEffectsProcessor.getOrCreateFirstEffect(
          this.document,
        );
      }

      if (!firstEffect) {
        Logger.warn(
          "No active effect found and could not create one for embedded item",
          null,
          "EMBEDDED_CHARACTER_EFFECTS",
        );
        return;
      }

      // Use parent-specific update methods (keep existing logic)
      const effectData = { _id: firstEffect.id, changes };

      if (this.parentItem.type === "transformation") {
        await this._updateTransformationCharacterEffects(effectData, firstEffect);
      } else if (this.isEffect) {
        await this._updateActionCardEffectCharacterEffects(
          effectData,
          firstEffect,
        );
      } else {
        await this._updateActionCardItemCharacterEffects(
          effectData,
          firstEffect,
        );
      }
    }

    /**
     * Update character effects for transformation items
     * @param {object} effectData - The effect data to update
     * @param {ActiveEffect} firstEffect - The first effect
     * @private
     */
    async _updateTransformationCharacterEffects(effectData, firstEffect) {
      const powerIndex =
        this.parentItem.system.embeddedCombatPowers.findIndex(
          (p) => p._id === this.originalItemId,
        );
      if (powerIndex === -1) return;

      const powers = foundry.utils.deepClone(
        this.parentItem.system.embeddedCombatPowers,
      );
      const powerData = powers[powerIndex];

      // Update the effects array in the power data
      if (!powerData.effects) powerData.effects = [];
      const activeEffectIndex = powerData.effects.findIndex(
        (e) => e._id === firstEffect.id,
      );
      if (activeEffectIndex >= 0) {
        powerData.effects[activeEffectIndex] = foundry.utils.mergeObject(
          powerData.effects[activeEffectIndex],
          effectData,
        );
      } else {
        // Add the effect if it doesn't exist yet
        powerData.effects.push(
          foundry.utils.mergeObject(firstEffect.toObject(), effectData),
        );
      }

      try {
        // Update the temporary document's source data first
        this.document.updateSource(powerData);

        await this.parentItem.update(
          {
            "system.embeddedCombatPowers": powers,
          },
          { fromEmbeddedItem: true },
        );
        this.render();
      } catch (error) {
        Logger.error(
          "EmbeddedItemCharacterEffectsMixin | Failed to save combat power character effects",
          { error, powers, powerData },
          "EMBEDDED_CHARACTER_EFFECTS",
        );
        ui.notifications.error(
          "Failed to save Combat Power. See console for details.",
        );
      }
    }

    /**
     * Update character effects for action card effects
     * @param {object} effectData - The effect data to update
     * @param {ActiveEffect} firstEffect - The first effect
     * @private
     */
    async _updateActionCardEffectCharacterEffects(effectData, firstEffect) {
      const effectIndex =
        this.parentItem.system.embeddedStatusEffects.findIndex(
          (s) => s._id === this.originalItemId,
        );
      if (effectIndex === -1) return;

      const statusEffects = foundry.utils.deepClone(
        this.parentItem.system.embeddedStatusEffects,
      );
      const statusData = statusEffects[effectIndex];

      // Update the effects array in the status data
      if (!statusData.effects) statusData.effects = [];
      const activeEffectIndex = statusData.effects.findIndex(
        (e) => e._id === firstEffect.id,
      );
      if (activeEffectIndex >= 0) {
        statusData.effects[activeEffectIndex] = foundry.utils.mergeObject(
          statusData.effects[activeEffectIndex],
          effectData,
        );
      } else {
        // Add the effect if it doesn't exist yet
        statusData.effects.push(
          foundry.utils.mergeObject(firstEffect.toObject(), effectData),
        );
      }

      try {
        // Update the temporary document's source data first
        this.document.updateSource(statusData);

        await this.parentItem.update(
          {
            "system.embeddedStatusEffects": statusEffects,
          },
          { fromEmbeddedItem: true },
        );
        this.render();
      } catch (error) {
        Logger.error(
          "EmbeddedItemCharacterEffectsMixin | Failed to save effect character effects",
          { error, statusEffects, statusData },
          "EMBEDDED_CHARACTER_EFFECTS",
        );
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.SaveEffectCharacterEffectsFailed",
          ),
        );
      }
    }

    /**
     * Update character effects for action card items
     * @param {object} effectData - The effect data to update
     * @param {ActiveEffect} firstEffect - The first effect
     * @private
     */
    async _updateActionCardItemCharacterEffects(effectData, firstEffect) {
      const itemData = foundry.utils.deepClone(
        this.parentItem.system.embeddedItem,
      );

      // Update the effects array in the item data
      if (!itemData.effects) itemData.effects = [];
      const activeEffectIndex = itemData.effects.findIndex(
        (e) => e._id === firstEffect.id,
      );
      if (activeEffectIndex >= 0) {
        itemData.effects[activeEffectIndex] = foundry.utils.mergeObject(
          itemData.effects[activeEffectIndex],
          effectData,
        );
      } else {
        // Add the effect if it doesn't exist yet
        itemData.effects.push(
          foundry.utils.mergeObject(firstEffect.toObject(), effectData),
        );
      }

      try {
        // Update the temporary document's source data first
        this.document.updateSource(itemData);

        await this.parentItem.update(
          {
            "system.embeddedItem": itemData,
          },
          { fromEmbeddedItem: true },
        );
        this.render();
      } catch (error) {
        Logger.error(
          "EmbeddedItemCharacterEffectsMixin | Failed to save item character effects",
          { error, itemData },
          "EMBEDDED_CHARACTER_EFFECTS",
        );
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.SaveItemCharacterEffectsFailed",
          ),
        );
      }
    }

    /**
     * Create a new character effect for embedded items
     * @param {PointerEvent} event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _newEmbeddedCharacterEffect(event, target) {
      const { type, ability } = target.dataset;
      const newEffect = {
        type,
        ability,
      };
      await this._updateEmbeddedCharacterEffects({ newEffect });
      this.render();
      event.target.focus();
    }

    /**
     * Delete a character effect for embedded items
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _deleteEmbeddedCharacterEffect(_event, target) {
      const index = target.dataset.index;
      const type = target.dataset.type;
      await this._updateEmbeddedCharacterEffects({ remove: { index, type } });
    }

    /**
     * Bridge method to forward regular character effects calls to embedded equivalents
     * This ensures compatibility when regular item sheet methods are called on embedded items
     * @param {Object} options - Update options
     * @returns {Promise<void>}
     * @protected
     */
    async _updateCharacterEffects(options = {}) {
      return this._updateEmbeddedCharacterEffects(options);
    }

    /**
     * Bridge method to forward regular character effect creation to embedded equivalent
     * @param {PointerEvent} event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _newCharacterEffect(event, target) {
      return this._newEmbeddedCharacterEffect(event, target);
    }

    /**
     * Bridge method to forward regular character effect deletion to embedded equivalent
     * @param {PointerEvent} event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _deleteCharacterEffect(event, target) {
      return this._deleteEmbeddedCharacterEffect(event, target);
    }

    /**
     * Toggle effect display for embedded items
     * @param {PointerEvent} event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _toggleEmbeddedEffectDisplay(event, target) {
      const duration = target.checked ? { seconds: 604800 } : { seconds: 0 };

      // Get the first effect from the temporary item, or create one if needed
      let firstEffect = this.document.effects.contents[0];
      if (!firstEffect) {
        // Create a default ActiveEffect if none exists
        firstEffect = await CharacterEffectsProcessor.getOrCreateFirstEffect(
          this.document,
          duration,
        );
      }

      // Update the effect data with new duration
      const effectData = {
        _id: firstEffect.id,
        duration,
      };

      // Update based on parent type
      if (this.parentItem.type === "transformation") {
        await this._updateTransformationEffectDisplay(effectData, firstEffect);
      } else if (this.isEffect) {
        await this._updateActionCardEffectDisplay(effectData, firstEffect);
      } else {
        await this._updateActionCardItemEffectDisplay(effectData, firstEffect);
      }

      event.target.focus();
    }

    /**
     * Update effect display for transformation items
     * @param {object} effectData - The effect data to update
     * @param {ActiveEffect} firstEffect - The first effect
     * @private
     */
    async _updateTransformationEffectDisplay(effectData, firstEffect) {
      const powerIndex =
        this.parentItem.system.embeddedCombatPowers.findIndex(
          (p) => p._id === this.originalItemId,
        );
      if (powerIndex === -1) return;

      const powers = foundry.utils.deepClone(
        this.parentItem.system.embeddedCombatPowers,
      );
      const powerData = powers[powerIndex];

      // Update the effects array in the power data
      if (!powerData.effects) powerData.effects = [];
      const activeEffectIndex = powerData.effects.findIndex(
        (e) => e._id === firstEffect.id,
      );
      if (activeEffectIndex >= 0) {
        powerData.effects[activeEffectIndex] = foundry.utils.mergeObject(
          powerData.effects[activeEffectIndex],
          effectData,
        );
      } else {
        powerData.effects.push(
          foundry.utils.mergeObject(firstEffect.toObject(), effectData),
        );
      }

      this.document.updateSource(powerData);
      await this.parentItem.update(
        {
          "system.embeddedCombatPowers": powers,
        },
        { fromEmbeddedItem: true },
      );
      this.render();
    }

    /**
     * Update effect display for action card effects
     * @param {object} effectData - The effect data to update
     * @param {ActiveEffect} firstEffect - The first effect
     * @private
     */
    async _updateActionCardEffectDisplay(effectData, firstEffect) {
      const effectIndex =
        this.parentItem.system.embeddedStatusEffects.findIndex(
          (s) => s._id === this.originalItemId,
        );
      if (effectIndex === -1) return;

      const statusEffects = foundry.utils.deepClone(
        this.parentItem.system.embeddedStatusEffects,
      );
      const statusData = statusEffects[effectIndex];

      // Update the effects array in the status data
      if (!statusData.effects) statusData.effects = [];
      const activeEffectIndex = statusData.effects.findIndex(
        (e) => e._id === firstEffect.id,
      );
      if (activeEffectIndex >= 0) {
        statusData.effects[activeEffectIndex] = foundry.utils.mergeObject(
          statusData.effects[activeEffectIndex],
          effectData,
        );
      } else {
        statusData.effects.push(
          foundry.utils.mergeObject(firstEffect.toObject(), effectData),
        );
      }

      this.document.updateSource(statusData);
      await this.parentItem.update(
        {
          "system.embeddedStatusEffects": statusEffects,
        },
        { fromEmbeddedItem: true },
      );
      this.render();
    }

    /**
     * Update effect display for action card items
     * @param {object} effectData - The effect data to update
     * @param {ActiveEffect} firstEffect - The first effect
     * @private
     */
    async _updateActionCardItemEffectDisplay(effectData, firstEffect) {
      const itemData = foundry.utils.deepClone(
        this.parentItem.system.embeddedItem,
      );

      // Update the effects array in the item data
      if (!itemData.effects) itemData.effects = [];
      const activeEffectIndex = itemData.effects.findIndex(
        (e) => e._id === firstEffect.id,
      );
      if (activeEffectIndex >= 0) {
        itemData.effects[activeEffectIndex] = foundry.utils.mergeObject(
          itemData.effects[activeEffectIndex],
          effectData,
        );
      } else {
        itemData.effects.push(
          foundry.utils.mergeObject(firstEffect.toObject(), effectData),
        );
      }

      this.document.updateSource(itemData);
      await this.parentItem.update(
        {
          "system.embeddedItem": itemData,
        },
        { fromEmbeddedItem: true },
      );
      this.render();
    }

    /**
     * Bridge method to forward regular effect display toggle to embedded equivalent
     * @param {PointerEvent} event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _toggleEffectDisplay(event, target) {
      return this._toggleEmbeddedEffectDisplay(event, target);
    }
  };
