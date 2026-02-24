/**
 * FormFieldHelper Service
 *
 * Provides centralized handling for form field operations in item sheets.
 * Handles color input normalization and damage formula synchronization.
 *
 * This service uses the delegation pattern - item sheets delegate form field
 * handling to this service rather than handling it inline.
 *
 * @module FormFieldHelper
 * @see module:item-sheet
 */

import { Logger } from "./logger.mjs";

/**
 * FormFieldHelper class for handling form field operations
 *
 * This service provides methods for normalizing color inputs and synchronizing
 * damage formulas between related fields. All methods accept relevant parameters
 * to access form context.
 *
 * @class FormFieldHelper
 */
export class FormFieldHelper {
  /**
   * Default color values for different color field types
   *
   * @static
   * @type {Object<string, string>}
   */
  static COLOR_DEFAULTS = {
    textColor: "#ffffff",
    bgColor: "#000000",
    iconTint: "#ffffff",
  };

  /**
   * Mapping of damage formula fields to their synchronized counterpart
   *
   * @static
   * @type {Object<string, string>}
   */
  static DAMAGE_FORMULA_FIELDS = {
    "system.attackChain.damageFormula": "system.savedDamage.formula",
    "system.savedDamage.formula": "system.attackChain.damageFormula",
  };

  /**
   * Check if a field name is a color field
   *
   * A field is considered a color field if its name contains
   * "textColor", "bgColor", or "iconTint".
   *
   * @param {string} fieldName - The name of the form field
   * @returns {boolean} True if the field is a color field
   * @static
   *
   * @example
   * FormFieldHelper.isColorField("system.textColor"); // true
   * FormFieldHelper.isColorField("system.value"); // false
   */
  static isColorField(fieldName) {
    if (!fieldName || typeof fieldName !== "string") {
      return false;
    }
    return (
      fieldName.includes("textColor") ||
      fieldName.includes("bgColor") ||
      fieldName.includes("iconTint")
    );
  }

  /**
   * Check if a field name is a damage formula field
   *
   * A field is considered a damage formula field if it is a key in
   * the DAMAGE_FORMULA_FIELDS configuration.
   *
   * @param {string} fieldName - The name of the form field
   * @returns {boolean} True if the field is a damage formula field
   * @static
   *
   * @example
   * FormFieldHelper.isDamageFormulaField("system.attackChain.damageFormula"); // true
   * FormFieldHelper.isDamageFormulaField("system.value"); // false
   */
  static isDamageFormulaField(fieldName) {
    if (!fieldName || typeof fieldName !== "string") {
      return false;
    }
    return fieldName in this.DAMAGE_FORMULA_FIELDS;
  }

  /**
   * Normalize a color input value
   *
   * If the value is a short hex code (4 characters like #fff),
   * it will be expanded to a full hex code (7 characters like #ffffff).
   * If the value is not 7 characters after expansion, returns the appropriate
   * default color based on the field name.
   *
   * @param {string} value - The color value to normalize
   * @param {string} fieldName - The name of the form field
   * @returns {string} The normalized color value
   * @static
   *
   * @example
   * FormFieldHelper.normalizeColorInput("#fff", "system.textColor"); // "#ffffff"
   * FormFieldHelper.normalizeColorInput("invalid", "system.bgColor"); // "#000000"
   */
  static normalizeColorInput(value, fieldName) {
    // Handle null/undefined or non-string values
    if (!value || typeof value !== "string") {
      return this._getDefaultColorForField(fieldName);
    }

    const trimmedValue = value.trim();

    // Expand short hex (#fff -> #ffffff)
    if (trimmedValue.length === 4) {
      return `${trimmedValue}${trimmedValue.slice(1)}`;
    }

    // Validate that we have a full 7-character hex code (#RRGGBB)
    if (trimmedValue.length !== 7) {
      return this._getDefaultColorForField(fieldName);
    }

    return trimmedValue;
  }

  /**
   * Get the default color for a field name
   *
   * Determines the default color based on the field name:
   * - textColor → #ffffff
   * - bgColor → #000000
   * - iconTint → #ffffff
   *
   * @param {string} fieldName - The name of the form field
   * @returns {string} The default color value
   * @static
   * @private
   */
  static _getDefaultColorForField(fieldName) {
    if (!fieldName || typeof fieldName !== "string") {
      return this.COLOR_DEFAULTS.textColor;
    }

    if (fieldName.includes("bgColor")) {
      return this.COLOR_DEFAULTS.bgColor;
    }
    if (fieldName.includes("iconTint")) {
      return this.COLOR_DEFAULTS.iconTint;
    }
    return this.COLOR_DEFAULTS.textColor;
  }

  /**
   * Get the update data for damage formula synchronization
   *
   * When a damage formula field changes, both damage formula fields
   * should be synchronized. This method returns the update object
   * needed to keep them in sync.
   *
   * @param {string} fieldName - The name of the field that changed
   * @param {string} value - The new value for the field
   * @returns {Object<string, string>|null} The update data object or null if not a damage formula field
   * @static
   *
   * @example
   * FormFieldHelper.getDamageFormulaUpdate("system.attackChain.damageFormula", "2d6");
   * // Returns: { "system.attackChain.damageFormula": "2d6", "system.savedDamage.formula": "2d6" }
   */
  static getDamageFormulaUpdate(fieldName, value) {
    if (!fieldName || !this.isDamageFormulaField(fieldName)) {
      return null;
    }

    const syncFieldName = this.DAMAGE_FORMULA_FIELDS[fieldName];

    return {
      [fieldName]: value,
      [syncFieldName]: value,
    };
  }

  /**
   * Handle field synchronization for form change events
   *
   * This is the main entry point for handling form field changes.
   * It checks if the field is a color field and normalizes the value,
   * then checks if the field is a damage formula field and returns
   * the appropriate update data.
   *
   * @param {Event} event - The form change event
   * @param {Object} item - The item instance being edited
   * @returns {Object} An object containing:
   *   - shouldUpdate: Whether an update is needed
   *   - updateData: The update data if needed, otherwise null
   *   - normalizedValue: The normalized value if it's a color field, otherwise undefined
   * @static
   *
   * @example
   * const result = FormFieldHelper.handleFieldSync(event, this.item);
   * if (result.normalizedValue) {
   *   event.target.value = result.normalizedValue;
   * }
   * if (result.shouldUpdate) {
   *   await this.item.update(result.updateData);
   * }
   */
  static handleFieldSync(event, _item) {
    const result = {
      shouldUpdate: false,
      updateData: null,
      normalizedValue: undefined,
    };

    // Validate inputs
    if (!event || !event.target || !event.target.name) {
      Logger.warn("FormFieldHelper.handleFieldSync called with invalid event", {
        event,
      });
      return result;
    }

    const fieldName = event.target.name;
    const value = event.target.value;

    // Handle color field normalization
    if (this.isColorField(fieldName)) {
      const normalized = this.normalizeColorInput(value, fieldName);
      result.normalizedValue = normalized;
    }

    // Handle damage formula field synchronization
    if (this.isDamageFormulaField(fieldName)) {
      const updateData = this.getDamageFormulaUpdate(fieldName, value);
      if (updateData) {
        result.shouldUpdate = true;
        result.updateData = updateData;
      }
    }

    return result;
  }
}
