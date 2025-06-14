import { Logger } from "../../services/_module.mjs";

const { FormDataExtended } = foundry.applications.ux;

/**
 * Embedded Item Data Management Mixin
 *
 * Provides data management functionality for embedded item sheets including:
 * - Save operations for different parent item types (transformation, action card)
 * - Form submission handling with proper data merging
 * - Icon tint and effect display toggle management
 * - Character effects updates for embedded items
 *
 * @param {class} BaseClass - The base item sheet class to extend
 * @returns {class} Extended class with embedded item data management functionality
 */
export const EmbeddedItemDataMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Save editor content for embedded items
     * @param {string} target - The data path of the property to update
     * @param {string} content - The new HTML content to save
     * @protected
     */
    async _saveEmbeddedEditorContent(target, content) {
      // Handle transformation items (embedded combat powers)
      if (this.parentItem.type === "transformation") {
        await this._saveTransformationPowerContent(target, content);
      } else if (this.isEffect) {
        // Handle action card embedded effects
        await this._saveActionCardEffectContent(target, content);
      } else {
        // Handle action card embedded items
        await this._saveActionCardItemContent(target, content);
      }
    }

    /**
     * Save content for transformation embedded combat powers
     * @param {string} target - The data path to update
     * @param {string} content - The new content
     * @private
     */
    async _saveTransformationPowerContent(target, content) {
      const powerIndex = this.parentItem.system.embeddedCombatPowers.findIndex(
        (p) => p._id === this.originalItemId,
      );
      if (powerIndex === -1) return;

      const powers = foundry.utils.deepClone(
        this.parentItem.system.embeddedCombatPowers,
      );
      const powerData = powers[powerIndex];
      foundry.utils.setProperty(powerData, target, content);

      try {
        // Pre-emptively update the local source to prevent a race condition
        this.parentItem.updateSource({
          "system.embeddedCombatPowers": powers,
        });
        this.document.updateSource(powerData);

        await this.parentItem.update({
          "system.embeddedCombatPowers": powers,
        });

        ui.notifications.info(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Info.CombatPowerDescriptionSaved",
          ),
        );
      } catch (error) {
        Logger.error(
          "EmbeddedItemDataMixin | Failed to save combat power description",
          { error, powers, powerData },
          "EMBEDDED_DATA",
        );
        ui.notifications.error(
          "Failed to save Combat Power. See console for details.",
        );
      }
    }

    /**
     * Save content for action card embedded effects
     * @param {string} target - The data path to update
     * @param {string} content - The new content
     * @private
     */
    async _saveActionCardEffectContent(target, content) {
      const effectIndex =
        this.parentItem.system.embeddedStatusEffects.findIndex(
          (s) => s._id === this.originalItemId,
        );
      if (effectIndex === -1) return;

      const statusEffects = foundry.utils.deepClone(
        this.parentItem.system.embeddedStatusEffects,
      );
      const effectData = statusEffects[effectIndex];
      foundry.utils.setProperty(effectData, target, content);

      try {
        // Update the temporary document's source data first
        this.document.updateSource(effectData);

        await this.parentItem.update({
          "system.embeddedStatusEffects": statusEffects,
        });

        ui.notifications.info(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Info.EffectDescriptionSaved"),
        );
      } catch (error) {
        Logger.error(
          "EmbeddedItemDataMixin | Failed to save effect description",
          { error, statusEffects, effectData },
          "EMBEDDED_DATA",
        );
        ui.notifications.error(
          "Failed to save effect. See console for details.",
        );
      }
    }

    /**
     * Save content for action card embedded items
     * @param {string} target - The data path to update
     * @param {string} content - The new content
     * @private
     */
    async _saveActionCardItemContent(target, content) {
      const itemData = foundry.utils.deepClone(
        this.parentItem.system.embeddedItem,
      );
      foundry.utils.setProperty(itemData, target, content);

      try {
        // Update the temporary document's source data first
        this.document.updateSource(itemData);

        await this.parentItem.update({
          "system.embeddedItem": itemData,
        });

        ui.notifications.info(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Info.ItemDescriptionSaved"),
        );
      } catch (error) {
        Logger.error(
          "EmbeddedItemDataMixin | Failed to save description",
          { error, itemData },
          "EMBEDDED_DATA",
        );
        ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.SaveItemFailed"),
        );
      }
    }

    /**
     * Submit form data for embedded items
     * @param {object} _formConfig - The form configuration (unused)
     * @param {Event} _event - The submission event (unused)
     * @protected
     */
    async _submitEmbeddedForm(_formConfig, _event) {
      Logger.methodEntry("EmbeddedItemDataMixin", "_submitEmbeddedForm");
      const formData = new FormDataExtended(this.form).object;

      // Handle transformation items (embedded combat powers)
      if (this.parentItem.type === "transformation") {
        await this._submitTransformationPowerForm(formData);
      } else if (this.isEffect) {
        // Handle action card embedded effects
        await this._submitActionCardEffectForm(formData);
      } else {
        // Handle action card embedded items
        await this._submitActionCardItemForm(formData);
      }
      Logger.methodExit("EmbeddedItemDataMixin", "_submitEmbeddedForm");
    }

    /**
     * Submit form for transformation embedded combat powers
     * @param {object} formData - The form data
     * @private
     */
    async _submitTransformationPowerForm(formData) {
      const powerIndex = this.parentItem.system.embeddedCombatPowers.findIndex(
        (p) => p._id === this.originalItemId,
      );
      if (powerIndex === -1) {
        Logger.methodExit(
          "EmbeddedItemDataMixin",
          "_submitTransformationPowerForm",
          {
            reason: "Combat power not found",
          },
        );
        return;
      }

      const powers = foundry.utils.deepClone(
        this.parentItem.system.embeddedCombatPowers,
      );
      const powerData = powers[powerIndex];
      foundry.utils.mergeObject(powerData, formData);

      try {
        await this.parentItem.update({
          "system.embeddedCombatPowers": powers,
        });
        this.document.updateSource(powerData);
        this.render();
      } catch (error) {
        Logger.error(
          "EmbeddedItemDataMixin | Failed to save combat power form data",
          { error, powers, powerData, formData },
          "EMBEDDED_DATA",
        );
        ui.notifications.error(
          "Failed to save Combat Power. See console for details.",
        );
        throw error;
      }
    }

    /**
     * Submit form for action card embedded effects
     * @param {object} formData - The form data
     * @private
     */
    async _submitActionCardEffectForm(formData) {
      const effectIndex =
        this.parentItem.system.embeddedStatusEffects.findIndex(
          (s) => s._id === this.originalItemId,
        );
      if (effectIndex === -1) {
        Logger.methodExit(
          "EmbeddedItemDataMixin",
          "_submitActionCardEffectForm",
          {
            reason: "Effect not found",
          },
        );
        return;
      }

      const statusEffects = foundry.utils.deepClone(
        this.parentItem.system.embeddedStatusEffects,
      );
      const effectData = statusEffects[effectIndex];
      foundry.utils.mergeObject(effectData, formData);

      try {
        // Update the temporary document's source data first
        this.document.updateSource(effectData);

        await this.parentItem.update({
          "system.embeddedStatusEffects": statusEffects,
        });
        this.render();
      } catch (error) {
        Logger.error(
          "EmbeddedItemDataMixin | Failed to save effect form data",
          { error, statusEffects, effectData, formData },
          "EMBEDDED_DATA",
        );
        ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.SaveItemFailed"),
        );
        throw error;
      }
    }

    /**
     * Submit form for action card embedded items
     * @param {object} formData - The form data
     * @private
     */
    async _submitActionCardItemForm(formData) {
      const itemData = foundry.utils.deepClone(
        this.parentItem.system.embeddedItem,
      );
      foundry.utils.mergeObject(itemData, formData);

      try {
        // Update the temporary document's source data first
        this.document.updateSource(itemData);

        await this.parentItem.update({
          "system.embeddedItem": itemData,
        });
        this.render();
      } catch (error) {
        Logger.error(
          "EmbeddedItemDataMixin | Failed to save form data",
          { error, itemData, formData },
          "EMBEDDED_DATA",
        );
        ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.SaveItemFailed"),
        );
        throw error;
      }
    }

    /**
     * Handle icon tint changes for embedded items
     * @param {Event} event - The change event
     * @protected
     */
    async _handleIconTintChange(event) {
      const firstEffect = this.document.effects.contents[0];
      if (!firstEffect) return;

      // Handle different parent item types
      if (this.parentItem.type === "transformation") {
        await this._updateTransformationIconTint(
          event.target.value,
          firstEffect,
        );
      } else if (this.isEffect) {
        await this._updateActionCardEffectIconTint(
          event.target.value,
          firstEffect,
        );
      } else {
        await this._updateActionCardItemIconTint(
          event.target.value,
          firstEffect,
        );
      }
    }

    /**
     * Update icon tint for transformation items
     * @param {string} tintValue - The new tint value
     * @param {ActiveEffect} firstEffect - The first effect
     * @private
     */
    async _updateTransformationIconTint(tintValue, firstEffect) {
      const powerIndex = this.parentItem.system.embeddedCombatPowers.findIndex(
        (p) => p._id === this.originalItemId,
      );
      if (powerIndex < 0) return;

      const powers = foundry.utils.deepClone(
        this.parentItem.system.embeddedCombatPowers,
      );
      const powerData = powers[powerIndex];

      if (!powerData.effects) powerData.effects = [];
      const effectIndex = powerData.effects.findIndex(
        (e) => e._id === firstEffect.id,
      );
      if (effectIndex >= 0) {
        powerData.effects[effectIndex].tint = tintValue;
      }

      try {
        this.document.updateSource(powerData);
        await this.parentItem.update({
          "system.embeddedCombatPowers": powers,
        });
      } catch (error) {
        Logger.error(
          "EmbeddedItemDataMixin | Failed to save combat power icon tint",
          { error, powers, powerData },
          "EMBEDDED_DATA",
        );
        ui.notifications.error(
          "Failed to save Combat Power. See console for details.",
        );
      }
    }

    /**
     * Update icon tint for action card effects
     * @param {string} tintValue - The new tint value
     * @param {ActiveEffect} firstEffect - The first effect
     * @private
     */
    async _updateActionCardEffectIconTint(tintValue, firstEffect) {
      const effectIndex =
        this.parentItem.system.embeddedStatusEffects.findIndex(
          (s) => s._id === this.originalItemId,
        );
      if (effectIndex < 0) return;

      const statusEffects = foundry.utils.deepClone(
        this.parentItem.system.embeddedStatusEffects,
      );
      const effectData = statusEffects[effectIndex];

      if (!effectData.effects) effectData.effects = [];
      const activeEffectIndex = effectData.effects.findIndex(
        (e) => e._id === firstEffect.id,
      );
      if (activeEffectIndex >= 0) {
        effectData.effects[activeEffectIndex].tint = tintValue;
      }

      try {
        this.document.updateSource(effectData);
        await this.parentItem.update({
          "system.embeddedStatusEffects": statusEffects,
        });
      } catch (error) {
        Logger.error(
          "EmbeddedItemDataMixin | Failed to save effect icon tint",
          { error, statusEffects, effectData },
          "EMBEDDED_DATA",
        );
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.SaveEffectIconTintFailed",
          ),
        );
      }
    }

    /**
     * Update icon tint for action card items
     * @param {string} tintValue - The new tint value
     * @param {ActiveEffect} firstEffect - The first effect
     * @private
     */
    async _updateActionCardItemIconTint(tintValue, firstEffect) {
      const itemData = foundry.utils.deepClone(
        this.parentItem.system.embeddedItem,
      );

      if (!itemData.effects) itemData.effects = [];
      const effectIndex = itemData.effects.findIndex(
        (e) => e._id === firstEffect.id,
      );
      if (effectIndex >= 0) {
        itemData.effects[effectIndex].tint = tintValue;
      }

      try {
        this.document.updateSource(itemData);
        await this.parentItem.update({
          "system.embeddedItem": itemData,
        });
      } catch (error) {
        Logger.error(
          "EmbeddedItemDataMixin | Failed to save item icon tint",
          { error, itemData },
          "EMBEDDED_DATA",
        );
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.SaveItemIconTintFailed",
          ),
        );
      }
    }
  };
