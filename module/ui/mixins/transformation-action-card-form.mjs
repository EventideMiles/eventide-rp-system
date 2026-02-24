import { Logger } from "../../services/logger.mjs";

/**
 * Transformation Action Card Form Mixin
 *
 * Provides form handling for transformation action cards (temporary/embedded items).
 * This mixin handles the special case where action cards are embedded within
 * transformation items and need custom form handling to prevent sheet closure.
 *
 * Features:
 * - Detects transformation action cards vs regular items
 * - Handles form changes without closing the sheet
 * - Handles form submission for embedded items
 * - Disables collaborative editing for temporary documents
 *
 * @param {class} BaseClass - The base sheet class to extend
 * @returns {class} Extended class with transformation action card form functionality
 */
export const TransformationActionCardFormMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Check if this is a temporary or embedded item (action card, transformation, etc.)
     *
     * Determines if the current item is a transformation action card by checking:
     * 1. Custom update method (indicating embedded item)
     * 2. Temporary action card without collection
     * 3. Embedded item with originalId property
     *
     * @returns {boolean} True if this is a temporary/embedded item
     * @protected
     */
    _isTransformationActionCard() {
      // Check if the item has a custom update method (indicating it's from a transformation or action card)
      const hasCustomUpdate =
        this.item.update &&
        (this.item.update.toString().includes("embeddedActionCards") ||
          this.item.update.toString().includes("embeddedTransformations") ||
          this.item.update.toString().includes("embeddedStatusEffects") ||
          this.item.update.toString().includes("embeddedItem"));

      // Also check if the item type is actionCard and it's not persisted (no collection)
      const isTemporaryActionCard =
        this.item.type === "actionCard" && !this.item.collection;

      // Check if it's any embedded item type with an originalId property
      const isEmbeddedItem = this.item.originalId && !this.item.collection;

      return hasCustomUpdate || isTemporaryActionCard || isEmbeddedItem;
    }

    /**
     * Handle form changes for transformation action cards
     *
     * Processes form changes for embedded action cards with special handling:
     * - Icon tint changes use updateEmbeddedDocuments
     * - Other field changes use the custom update method with fromEmbeddedItem flag
     * - Prevents sheet closure during editing
     *
     * @param {object} formConfig - The form configuration
     * @param {Event} event - The form change event
     * @returns {Promise<void>}
     * @protected
     */
    async _onChangeTransformationActionCard(formConfig, event) {
      // Get the changed field name and value
      let fieldName = event.target.name;
      const fieldValue = event.target.value;

      // Handle hex input fields - strip the -hex suffix to get the actual color field name
      if (fieldName.endsWith("-hex")) {
        fieldName = fieldName.replace(/-hex$/, "");
      }

      // Handle icon tint changes specially for transformation action cards
      if (fieldName.includes("iconTint")) {
        try {
          // Use updateEmbeddedDocuments with the fromEmbeddedItem flag to prevent sheet closure
          const firstEffect = this.item.effects.contents[0];
          if (firstEffect) {
            const updateData = {
              _id: firstEffect._id,
              tint: fieldValue,
            };
            await this.item.updateEmbeddedDocuments(
              "ActiveEffect",
              [updateData],
              { fromEmbeddedItem: true },
            );
          }
        } catch (error) {
          Logger.error(
            "Failed to update transformation action card icon tint",
            error,
            "TransformationActionCardFormMixin",
          );
        }
        return;
      }

      // Handle other field changes normally
      const updateData = {};

      // Special handling for checkbox inputs (like cursed toggle)
      if (event.target.type === "checkbox") {
        foundry.utils.setProperty(updateData, fieldName, event.target.checked);
      } else {
        foundry.utils.setProperty(updateData, fieldName, fieldValue);
      }

      try {
        // Use the action card's custom update method with fromEmbeddedItem flag
        // to prevent the sheet from closing
        await this.item.update(updateData, { fromEmbeddedItem: true });
      } catch (error) {
        Logger.error(
          "Failed to update transformation action card",
          error,
          "TransformationActionCardFormMixin",
        );
      }
    }

    /**
     * Handle form submission for transformation action cards
     *
     * Processes full form submissions for embedded action cards.
     * Unlike individual field changes, this doesn't use the fromEmbeddedItem flag
     * to allow normal form submission behavior.
     *
     * @param {object} formConfig - The form configuration
     * @param {Event} event - The form submission event
     * @returns {Promise<void>}
     * @protected
     */
    async _onSubmitTransformationActionCard(formConfig, event) {
      // Get all form data
      const { FormDataExtended } = foundry.applications.ux;
      const formData = new FormDataExtended(event.target).object;

      try {
        // Use the action card's custom update method
        // Don't use fromEmbeddedItem flag for full form submissions to allow normal behavior
        await this.item.update(formData);
      } catch (error) {
        Logger.error(
          "Failed to submit transformation action card form",
          error,
          "TransformationActionCardFormMixin",
        );
        ui.notifications.error(
          "Failed to save action card. See console for details.",
        );
      }
    }

    /**
     * Override editor options to disable collaborative editing for temporary documents
     *
     * Temporary documents (like action cards from transformations) don't exist in the
     * database, so collaborative editing must be disabled to prevent errors.
     *
     * @param {string} target - The target field being edited
     * @returns {object} Editor configuration options
     * @override
     * @protected
     */
    _getEditorOptions(target) {
      const options = super._getEditorOptions?.(target) || {};

      // Disable collaborative editing for temporary documents (like action cards from transformations)
      // since they don't exist in the database
      if (this._isTransformationActionCard()) {
        options.collaborative = false;
      }

      return options;
    }
  };
