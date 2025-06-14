import { Logger } from "../../services/_module.mjs";

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
      // Get all form elements that include "characterEffects" in their name
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

      // Process each form element
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

      // Clean up the arrays
      characterEffects.regularEffects = characterEffects.regularEffects.filter(
        (e) => e,
      );
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

      // Get the first effect from the temporary item, or create one if needed
      let firstEffect = this.document.effects.contents[0];
      if (
        !firstEffect &&
        (this.document.type === "status" || this.document.type === "gear")
      ) {
        // Create a default ActiveEffect if none exists for status effects and gear
        const defaultEffectData = {
          _id: foundry.utils.randomID(),
          name: this.document.name,
          icon: this.document.img,
          changes: [],
          disabled: false,
          duration: {},
          flags: {},
          tint: "#ffffff",
          transfer: true,
          statuses: [],
        };

        firstEffect = new CONFIG.ActiveEffect.documentClass(defaultEffectData, {
          parent: this.document,
        });
        this.document.effects.set(defaultEffectData._id, firstEffect);

        // Also update the source data
        if (!this.document._source.effects) {
          this.document._source.effects = [];
        }
        this.document._source.effects.push(defaultEffectData);
      }

      if (!firstEffect) {
        Logger.warn(
          "No active effect found and could not create one for embedded item",
          null,
          "EMBEDDED_CHARACTER_EFFECTS",
        );
        return;
      }

      // Update the effect data
      const effectData = {
        _id: firstEffect.id,
        changes: newEffects,
      };

      // Update the embedded item data in the parent item
      if (this.parentItem.type === "transformation") {
        await this._updateTransformationCharacterEffects(
          effectData,
          firstEffect,
        );
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
      const powerIndex = this.parentItem.system.embeddedCombatPowers.findIndex(
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

        await this.parentItem.update({
          "system.embeddedCombatPowers": powers,
        });
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

        await this.parentItem.update({
          "system.embeddedStatusEffects": statusEffects,
        });
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

        await this.parentItem.update({
          "system.embeddedItem": itemData,
        });
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
  };
