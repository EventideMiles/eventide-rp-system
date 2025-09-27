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
      // Check if this action card is embedded within a transformation
      if (this._isActionCardEmbeddedInTransformation()) {
        Logger.debug(
          "EmbeddedItemDataMixin | Using transformation-embedded action card save",
          { target, actionCardId: this.parentItem.id },
          "EMBEDDED_DATA",
        );
        await this._saveEmbeddedActionCardItemContent(target, content);
        return;
      }

      // Check if this is a transformation embedded within an action card
      if (this._isTransformationEmbeddedInActionCard()) {
        Logger.debug(
          "EmbeddedItemDataMixin | Using action card-embedded transformation save",
          { target, transformationId: this.parentItem.id },
          "EMBEDDED_DATA",
        );
        await this._saveEmbeddedTransformationItemContent(target, content);
        return;
      }

      Logger.debug(
        "EmbeddedItemDataMixin | Using regular action card save",
        { target, actionCardId: this.parentItem.id },
        "EMBEDDED_DATA",
      );

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
     * Check if this action card is embedded within a transformation
     * @returns {boolean} True if the parent action card is embedded in a transformation
     * @private
     */
    _isActionCardEmbeddedInTransformation() {
      // Check if the parent item is an action card and find a transformation that contains it
      if (this.parentItem.type !== "actionCard") {
        Logger.debug(
          "EmbeddedItemDataMixin | Parent item is not an action card",
          { parentType: this.parentItem.type },
          "EMBEDDED_DATA",
        );
        return false;
      }

      // Check if there's a direct parent reference to a transformation
      if (this.parentItem.parent && this.parentItem.parent.type === "transformation") {
        Logger.debug(
          "EmbeddedItemDataMixin | Action card has transformation parent",
          { transformationId: this.parentItem.parent.id },
          "EMBEDDED_DATA",
        );
        return true;
      }

      // Alternative: Check if the parent action card has a transformation context
      // This might be set when the embedded item sheet is created from a transformation
      if (this.parentItem._transformationParent) {
        Logger.debug(
          "EmbeddedItemDataMixin | Action card has _transformationParent",
          { transformationId: this.parentItem._transformationParent.id },
          "EMBEDDED_DATA",
        );
        return true;
      }

      // Check if the action card has a custom update method (indicating it's from a transformation)
      const hasCustomUpdate = this.parentItem.update && this.parentItem.update.toString().includes('embeddedActionCards');
      if (hasCustomUpdate) {
        Logger.debug(
          "EmbeddedItemDataMixin | Action card has custom update method (transformation)",
          { actionCardId: this.parentItem.id },
          "EMBEDDED_DATA",
        );
        return true;
      }

      Logger.debug(
        "EmbeddedItemDataMixin | Action card is not embedded in transformation",
        {
          actionCardId: this.parentItem.id,
          hasParent: !!this.parentItem.parent,
          parentType: this.parentItem.parent?.type,
          hasTransformationParent: !!this.parentItem._transformationParent,
          hasCustomUpdate
        },
        "EMBEDDED_DATA",
      );
      return false;
    }

    /**
     * Check if the parent transformation is embedded within an action card
     * @returns {boolean} True if the parent transformation is embedded in an action card
     * @private
     */
    _isTransformationEmbeddedInActionCard() {
      // Check if the parent item is a transformation and find an action card that contains it
      if (this.parentItem.type !== "transformation") {
        Logger.debug(
          "EmbeddedItemDataMixin | Parent item is not a transformation",
          { parentType: this.parentItem.type },
          "EMBEDDED_DATA",
        );
        return false;
      }

      // Check if there's a direct parent reference to an action card
      if (this.parentItem.parent && this.parentItem.parent.type === "actionCard") {
        Logger.debug(
          "EmbeddedItemDataMixin | Transformation has action card parent",
          { actionCardId: this.parentItem.parent.id },
          "EMBEDDED_DATA",
        );
        return true;
      }

      // Alternative: Check if the parent transformation has an action card context
      // This might be set when the embedded item sheet is created from an action card
      if (this.parentItem._actionCardParent) {
        Logger.debug(
          "EmbeddedItemDataMixin | Transformation has _actionCardParent",
          { actionCardId: this.parentItem._actionCardParent.id },
          "EMBEDDED_DATA",
        );
        return true;
      }

      // Check if the transformation has a custom update method (indicating it's from an action card)
      const hasCustomUpdate = this.parentItem.update && this.parentItem.update.toString().includes('embeddedTransformations');
      if (hasCustomUpdate) {
        Logger.debug(
          "EmbeddedItemDataMixin | Transformation has custom update method (action card)",
          { transformationId: this.parentItem.id },
          "EMBEDDED_DATA",
        );
        return true;
      }

      Logger.debug(
        "EmbeddedItemDataMixin | Transformation is not embedded in action card",
        {
          transformationId: this.parentItem.id,
          hasParent: !!this.parentItem.parent,
          parentType: this.parentItem.parent?.type,
          hasActionCardParent: !!this.parentItem._actionCardParent,
          hasCustomUpdate
        },
        "EMBEDDED_DATA",
      );
      return false;
    }

    /**
     * Save content for transformation items that are embedded within action cards
     * @param {string} target - The data path to update
     * @param {string} content - The new content
     * @private
     */
    async _saveEmbeddedTransformationItemContent(target, content) {
      // Use the transformation's enhanced update method with the fromEmbeddedItem flag
      const itemData = foundry.utils.deepClone(
        this.document.toObject(),
      );
      foundry.utils.setProperty(itemData, target, content);

      try {
        // Update the temporary document's source data first
        this.document.updateSource(itemData);

        // Use the transformation's update method with the fromEmbeddedItem flag
        // This will prevent the transformation sheet from closing
        await this.parentItem.update(itemData, { fromEmbeddedItem: true });

        // Bring the embedded item sheet back to the front
        this.bringToFront();

        ui.notifications.info(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Info.ItemDescriptionSaved"),
        );
      } catch (error) {
        Logger.error(
          "EmbeddedItemDataMixin | Failed to save embedded transformation item description",
          { error, itemData },
          "EMBEDDED_DATA",
        );
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.SaveItemDescriptionFailed",
          ),
        );
      }
    }

    /**
     * Save content for action card items that are embedded within transformations
     * @param {string} target - The data path to update
     * @param {string} content - The new content
     * @private
     */
    async _saveEmbeddedActionCardItemContent(target, content) {
      // Use the action card's enhanced update method with the fromEmbeddedItem flag
      const itemData = foundry.utils.deepClone(
        this.parentItem.system.embeddedItem || {},
      );
      foundry.utils.setProperty(itemData, target, content);

      try {
        // Update the temporary document's source data first
        this.document.updateSource(itemData);

        // Use the action card's update method with the fromEmbeddedItem flag
        // This will prevent the action card sheet from closing
        await this.parentItem.update({
          "system.embeddedItem": itemData,
        }, { fromEmbeddedItem: true });

        // Bring the embedded item sheet back to the front
        this.bringToFront();

        ui.notifications.info(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Info.ItemDescriptionSaved"),
        );
      } catch (error) {
        Logger.error(
          "EmbeddedItemDataMixin | Failed to save embedded action card item description",
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
        // Pre-emptively update the local source to prevent a race condition
        this.document.updateSource(powerData);

        await this.parentItem.update({
          "system.embeddedCombatPowers": powers,
        });
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
        // Pre-emptively update the local source to prevent a race condition
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
      // Check if this action card is embedded within a transformation
      if (this._isActionCardEmbeddedInTransformation()) {
        await this._submitEmbeddedActionCardItemForm(formData);
        return;
      }

      // Check if this is a transformation embedded within an action card
      if (this._isTransformationEmbeddedInActionCard()) {
        await this._submitEmbeddedTransformationItemForm(formData);
        return;
      }

      const itemData = foundry.utils.deepClone(
        this.parentItem.system.embeddedItem,
      );
      foundry.utils.mergeObject(itemData, formData);

      try {
        // Pre-emptively update the local source to prevent a race condition
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
     * Submit form for transformation items that are embedded within action cards
     * @param {object} formData - The form data
     * @private
     */
    async _submitEmbeddedTransformationItemForm(formData) {
      // Use the transformation's enhanced update method with the fromEmbeddedItem flag
      const itemData = foundry.utils.deepClone(
        this.document.toObject(),
      );
      foundry.utils.mergeObject(itemData, formData);

      try {
        // Pre-emptively update the local source to prevent a race condition
        this.document.updateSource(itemData);

        // Use the transformation's update method with the fromEmbeddedItem flag
        // This will prevent the transformation sheet from closing
        await this.parentItem.update(itemData, { fromEmbeddedItem: true });

        this.render();

        // Bring the embedded item sheet back to the front
        this.bringToFront();
      } catch (error) {
        Logger.error(
          "EmbeddedItemDataMixin | Failed to save embedded transformation item form data",
          { error, itemData, formData },
          "EMBEDDED_DATA",
        );
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.SaveItemFormDataFailed",
          ),
        );
      }
    }

    /**
     * Submit form for action card items that are embedded within transformations
     * @param {object} formData - The form data
     * @private
     */
    async _submitEmbeddedActionCardItemForm(formData) {
      // Use the action card's enhanced update method with the fromEmbeddedItem flag
      const itemData = foundry.utils.deepClone(
        this.parentItem.system.embeddedItem || {},
      );
      foundry.utils.mergeObject(itemData, formData);

      try {
        // Pre-emptively update the local source to prevent a race condition
        this.document.updateSource(itemData);

        // Use the action card's update method with the fromEmbeddedItem flag
        // This will prevent the action card sheet from closing
        await this.parentItem.update({
          "system.embeddedItem": itemData,
        }, { fromEmbeddedItem: true });

        this.render();

        // Bring the embedded item sheet back to the front
        this.bringToFront();
      } catch (error) {
        Logger.error(
          "EmbeddedItemDataMixin | Failed to save embedded action card item form data",
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
      // Check if this action card is embedded within a transformation
      if (this._isActionCardEmbeddedInTransformation()) {
        await this._updateEmbeddedActionCardItemIconTint(tintValue, firstEffect);
        return;
      }

      // Check if this is a transformation embedded within an action card
      if (this._isTransformationEmbeddedInActionCard()) {
        await this._updateEmbeddedTransformationItemIconTint(tintValue, firstEffect);
        return;
      }

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
        }, { fromEmbeddedItem: true });
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

    /**
     * Update icon tint for transformation items that are embedded within action cards
     * @param {string} tintValue - The new tint value
     * @param {ActiveEffect} firstEffect - The first effect
     * @private
     */
    async _updateEmbeddedTransformationItemIconTint(tintValue, firstEffect) {
      // Use the transformation's enhanced update method with the fromEmbeddedItem flag
      const itemData = foundry.utils.deepClone(
        this.document.toObject(),
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

        // Use the transformation's update method with the fromEmbeddedItem flag
        // This will prevent the transformation sheet from closing
        await this.parentItem.update(itemData, { fromEmbeddedItem: true });

        // Bring the embedded item sheet back to the front
        this.bringToFront();
      } catch (error) {
        Logger.error(
          "EmbeddedItemDataMixin | Failed to save embedded transformation item icon tint",
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

    /**
     * Update icon tint for action card items that are embedded within transformations
     * @param {string} tintValue - The new tint value
     * @param {ActiveEffect} firstEffect - The first effect
     * @private
     */
    async _updateEmbeddedActionCardItemIconTint(tintValue, firstEffect) {
      // Use the action card's enhanced update method with the fromEmbeddedItem flag
      const itemData = foundry.utils.deepClone(
        this.parentItem.system.embeddedItem || {},
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

        // Use the action card's update method with the fromEmbeddedItem flag
        // This will prevent the action card sheet from closing
        await this.parentItem.update({
          "system.embeddedItem": itemData,
        }, { fromEmbeddedItem: true });

        // Bring the embedded item sheet back to the front
        this.bringToFront();
      } catch (error) {
        Logger.error(
          "EmbeddedItemDataMixin | Failed to save embedded action card item icon tint",
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
