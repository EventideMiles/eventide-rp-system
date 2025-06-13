/**
 * Preset configurations for different sheet types
 * These presets define the default selectors and options for common application types
 */
export const THEME_PRESETS = {
  /**
   * Configuration for character sheets
   */
  CHARACTER_SHEET: {
    backgroundSelector: ".eventide-sheet",
    tabsSelector: ".tabs",
    nameSelector: ".document-name",
    headerSelector: ".eventide-sheet__header",
    dataTablesSelector: ".erps-data-table",
    sectionHeadersSelector: ".eventide-sheet-data-section__header",
    togglesSelector: ".erps-toggles",
    biographySelector: ".biography-content, [data-biography-theme]",
    inputsSelector: ".erps-input",
    selectsSelector: ".erps-select",
    buttonsSelector: ".erps-button",
    numberInputsSelector: ".erps-number-input__input",
    numberButtonsSelector: ".erps-number-input__button",
    colorPickersSelector: ".erps-color-picker, .color-picker-with-hex",
    textareasSelector: ".erps-textarea",
    itemsPanelsSelector: ".erps-items-panel",
    autoApply: true,
    verify: true,
    showNotifications: false,
  },

  /**
   * Configuration for item sheets
   */
  ITEM_SHEET: {
    backgroundSelector: ".eventide-sheet",
    tabsSelector: ".tabs .item",
    nameSelector: ".document-name input",
    headerSelector: ".eventide-sheet__header",
    dataTablesSelector: ".erps-data-table, .erps-item-effects__grid",
    sectionHeadersSelector: ".erps-item-effects__section-header",
    togglesSelector: ".erps-toggles",
    biographySelector: ".biography-content",
    inputsSelector: ".erps-input",
    selectsSelector: ".erps-select",
    buttonsSelector: ".erps-button",
    numberInputsSelector: ".erps-number-input__input",
    numberButtonsSelector: ".erps-number-input__button",
    colorPickersSelector: ".erps-color-picker, .color-picker-with-hex",
    textareasSelector: ".erps-textarea",
    itemsPanelsSelector: ".erps-items-panel",
    autoApply: true,
    verify: true,
    showNotifications: false,
  },

  /**
   * Configuration for creator applications (forms, dialogs, etc.)
   */
  CREATOR_APPLICATION: {
    backgroundSelector: ".eventide-sheet",
    tabsSelector: "",
    nameSelector: '.erps-input[name="name"]',
    headerSelector: ".erps-form__header",
    dataTablesSelector: ".erps-data-table",
    sectionHeadersSelector: ".erps-form__header",
    togglesSelector: ".erps-toggles",
    biographySelector: '.erps-textarea[name="description"]',
    inputsSelector: ".erps-input",
    selectsSelector: ".erps-select",
    buttonsSelector: ".erps-button",
    numberInputsSelector: ".erps-number-input__input",
    numberButtonsSelector: ".erps-number-input__button",
    colorPickersSelector: ".erps-color-picker, .color-picker-with-hex",
    textareasSelector: ".erps-textarea",
    itemsPanelsSelector: ".erps-items-panel",
    footerSelector: ".erps-form__footer",
    autoApply: true,
    verify: true,
    showNotifications: false,
  },

  /**
   * Minimal configuration for applications that need minimal theming
   */
  MINIMAL: {
    backgroundSelector: "",
    tabsSelector: "",
    nameSelector: "",
    headerSelector: "",
    dataTablesSelector: "",
    sectionHeadersSelector: "",
    inputsSelector: "",
    selectsSelector: "",
    buttonsSelector: "",
    numberInputsSelector: "",
    numberButtonsSelector: "",
    colorPickersSelector: "",
    textareasSelector: "",
    itemsPanelsSelector: "",
    autoApply: false,
    verify: false,
    showNotifications: false,
  },

  /**
   * Configuration for popup dialogs and modals
   */
  POPUP_DIALOG: {
    backgroundSelector: ".dialog, .eventide-sheet",
    tabsSelector: ".tabs",
    nameSelector: ".dialog-title, .document-name",
    headerSelector: ".dialog-header, .eventide-sheet__header",
    dataTablesSelector: ".erps-data-table",
    sectionHeadersSelector: ".dialog-section-header",
    togglesSelector: ".erps-toggles",
    biographySelector: ".dialog-content",
    inputsSelector: ".erps-input",
    selectsSelector: ".erps-select",
    buttonsSelector: ".erps-button, .dialog-button",
    numberInputsSelector: ".erps-number-input__input",
    numberButtonsSelector: ".erps-number-input__button",
    colorPickersSelector: ".erps-color-picker, .color-picker-with-hex",
    textareasSelector: ".erps-textarea",
    itemsPanelsSelector: ".erps-items-panel",
    autoApply: true,
    verify: false, // Popups are often short-lived, skip verification
    showNotifications: false,
  },

  /**
   * Configuration for settings applications
   */
  SETTINGS_APPLICATION: {
    backgroundSelector: ".eventide-sheet, .settings-form",
    tabsSelector: ".tabs",
    nameSelector: ".settings-title",
    headerSelector: ".settings-header, .eventide-sheet__header",
    dataTablesSelector: ".erps-data-table, .settings-table",
    sectionHeadersSelector: ".settings-section-header",
    togglesSelector: ".erps-toggles, .settings-toggle",
    biographySelector: ".settings-description",
    inputsSelector: ".erps-input, .settings-input",
    selectsSelector: ".erps-select, .settings-select",
    buttonsSelector: ".erps-button, .settings-button",
    numberInputsSelector: ".erps-number-input__input, .settings-number",
    numberButtonsSelector: ".erps-number-input__button",
    colorPickersSelector: ".erps-color-picker, .color-picker-with-hex",
    textareasSelector: ".erps-textarea, .settings-textarea",
    itemsPanelsSelector: ".erps-items-panel",
    autoApply: true,
    verify: true,
    showNotifications: false,
  },
};

/**
 * Get a theme preset by name
 * @param {string} presetName - Name of the preset to retrieve
 * @returns {Object|null} The preset configuration or null if not found
 */
export const getThemePreset = (presetName) => {
  return THEME_PRESETS[presetName] || null;
};

/**
 * Get all available theme preset names
 * @returns {string[]} Array of preset names
 */
export const getThemePresetNames = () => {
  return Object.keys(THEME_PRESETS);
};

/**
 * Create a custom preset by merging with an existing preset
 * @param {string} basePresetName - Name of the base preset to extend
 * @param {Object} customOptions - Custom options to merge
 * @returns {Object|null} The merged preset configuration or null if base preset not found
 */
export const createCustomPreset = (basePresetName, customOptions = {}) => {
  const basePreset = getThemePreset(basePresetName);
  if (!basePreset) {
    return null;
  }

  return {
    ...basePreset,
    ...customOptions,
  };
};

/**
 * Validate a theme preset configuration
 * @param {Object} preset - The preset configuration to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export const validateThemePreset = (preset) => {
  const errors = [];
  const requiredFields = [
    "backgroundSelector",
    "autoApply",
    "verify",
    "showNotifications",
  ];

  // Check for required fields
  requiredFields.forEach((field) => {
    if (!(field in preset)) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Check field types
  if (typeof preset.autoApply !== "boolean") {
    errors.push("autoApply must be a boolean");
  }

  if (typeof preset.verify !== "boolean") {
    errors.push("verify must be a boolean");
  }

  if (typeof preset.showNotifications !== "boolean") {
    errors.push("showNotifications must be a boolean");
  }

  // Check selector fields are strings
  const selectorFields = [
    "backgroundSelector",
    "tabsSelector",
    "nameSelector",
    "headerSelector",
    "dataTablesSelector",
    "sectionHeadersSelector",
    "togglesSelector",
    "biographySelector",
    "inputsSelector",
    "selectsSelector",
    "buttonsSelector",
    "numberInputsSelector",
    "numberButtonsSelector",
    "colorPickersSelector",
    "textareasSelector",
    "itemsPanelsSelector",
  ];

  selectorFields.forEach((field) => {
    if (field in preset && typeof preset[field] !== "string") {
      errors.push(`${field} must be a string`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};
