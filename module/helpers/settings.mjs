/**
 * Register system settings for the Eventide RP System
 */
export const registerSettings = function () {
  // Initative String
  game.settings.register("eventide-rp-system", "initativeFormula", {
    name: "SETTINGS.InitativeFormulaName",
    hint: "SETTINGS.InitativeFormulaHint",
    scope: "world",
    config: true,
    type: String,
    default:
      "1d@hiddenAbilities.dice.total + @statTotal.mainInit + @statTotal.subInit",
    onChange: (value) => {
      // If the value is empty, reset it to the default
      if (!value || value.trim() === "") {
        const defaultFormula =
          "1d@hiddenAbilities.dice.total + @statTotal.mainInit + @statTotal.subInit";
        game.settings.set(
          "eventide-rp-system",
          "initativeFormula",
          defaultFormula
        );
        ui.notifications.warn(
          "Initiative formula cannot be empty. Resetting to default."
        );
      } else {
        // Update the initiative formula in the current session
        CONFIG.Combat.initiative.formula = value;

        // Prompt for reload to ensure all initiative calculations use the new formula
        SettingsConfig.reloadConfirm({ world: true });
      }
    },
  });

  // Initiative Decimals
  game.settings.register("eventide-rp-system", "initiativeDecimals", {
    name: "SETTINGS.InitiativeDecimalsName",
    hint: "SETTINGS.InitiativeDecimalsHint",
    scope: "world",
    config: true,
    type: Number,
    default: 2,
    range: {
      min: 0,
      max: 4,
      step: 1,
    },
    onChange: () => {
      SettingsConfig.reloadConfirm({ world: true });
    },
  });

  // Default Tab
  game.settings.register("eventide-rp-system", "defaultCharacterTab", {
    name: "SETTINGS.DefaultCharacterTabName",
    hint: "SETTINGS.DefaultCharacterTabHint",
    scope: "client",
    config: true,
    type: String,
    default: "features",
    choices: {
      features: "SETTINGS.TabFeatures",
      biography: "SETTINGS.TabBiography",
      statuses: "SETTINGS.TabStatuses",
      gear: "SETTINGS.TabGear",
      combatPowers: "SETTINGS.TabCombatPowers",
    },
  });

  // Combat-Related Settings
  game.settings.register("eventide-rp-system", "autoRollNpcInitiative", {
    name: "SETTINGS.AutoRollNpcInitiativeName",
    hint: "SETTINGS.AutoRollNpcInitiativeHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => {
      SettingsConfig.reloadConfirm();
    },
  });

  game.settings.register("eventide-rp-system", "hideNpcInitiativeRolls", {
    name: "SETTINGS.HideNpcInitiativeRollsName",
    hint: "SETTINGS.HideNpcInitiativeRollsHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => {
      SettingsConfig.reloadConfirm({ world: true });
    },
  });

  game.settings.register("eventide-rp-system", "autoRollPlayerInitiative", {
    name: "SETTINGS.AutoRollPlayerInitiativeName",
    hint: "SETTINGS.AutoRollPlayerInitiativeHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => {
      SettingsConfig.reloadConfirm({ world: true });
    },
  });

  game.settings.register("eventide-rp-system", "defaultCombatRoundDuration", {
    name: "SETTINGS.DefaultCombatRoundDurationName",
    hint: "SETTINGS.DefaultCombatRoundDurationHint",
    scope: "world",
    config: true,
    type: Number,
    default: 6,
    range: {
      min: 1,
      max: 60,
      step: 1,
    },
    onChange: () => {
      SettingsConfig.reloadConfirm({ world: true });
    },
  });

  // UI Theme Options
  game.settings.register("eventide-rp-system", "uiTheme", {
    name: "SETTINGS.UiThemeName",
    hint: "SETTINGS.UiThemeHint",
    scope: "client",
    config: true,
    type: String,
    default: "default",
    choices: {
      default: "SETTINGS.UiThemeDefault",
      dark: "SETTINGS.UiThemeDark",
      light: "SETTINGS.UiThemeLight",
      contrast: "SETTINGS.UiThemeContrast",
    },
    onChange: (value) => {
      // Remove any existing theme classes
      document.body.classList.remove(
        "theme-default",
        "theme-dark",
        "theme-light",
        "theme-contrast"
      );
      // Add the new theme class
      document.body.classList.add(`theme-${value}`);
      SettingsConfig.reloadConfirm();
    },
  });

  // Gear Equipment Messages
  game.settings.register("eventide-rp-system", "showGearEquipMessages", {
    name: "SETTINGS.ShowGearEquipMessagesName",
    hint: "SETTINGS.ShowGearEquipMessagesHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => {
      SettingsConfig.reloadConfirm({ world: true });
    },
  });
};

/**
 * Get a setting value
 * @param {string} key - The setting key to retrieve
 * @returns {any} The setting value
 */
export const getSetting = function (key) {
  return game.settings.get("eventide-rp-system", key);
};

/**
 * Set a setting value
 * @param {string} key - The setting key to set
 * @param {any} value - The value to set
 * @returns {Promise} A promise that resolves when the setting is updated
 */
export const setSetting = function (key, value) {
  return game.settings.set("eventide-rp-system", key, value);
};
