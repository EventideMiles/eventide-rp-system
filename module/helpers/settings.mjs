import { erpsSoundManager } from "./sound-manager.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Sound Settings Application
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
class SoundSettingsApplication extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  static PARTS = {
    soundSettings: {
      template:
        "systems/eventide-rp-system/templates/settings/sound-settings.hbs",
    },
  };

  static DEFAULT_OPTIONS = {
    id: "eventide-sound-settings",
    classes: ["eventide-rp-system", "sound-settings"],
    position: {
      width: 600,
      height: "auto",
    },
    window: {
      title: "SETTINGS.SoundSettingsTitle",
      icon: "fas fa-volume-up",
    },
    tag: "form",
    form: {
      handler: this._onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      playSound: this._onPlaySound,
      resetSound: this._onResetSound,
      testAllSounds: this._onTestAllSounds,
      resetAllSounds: this._onResetAllSounds,
      browseFiles: this._onBrowseFiles,
    },
  };

  /**
   * Prepares the context data for the sound settings form
   * @returns {Object} The prepared context data
   */
  async _prepareContext() {
    const context = await super._prepareContext();

    // Get all sound settings
    const defaultSounds = erpsSoundManager.getDefaultSounds();
    context.sounds = Object.entries(defaultSounds).map(([key, defaultPath]) => {
      return {
        key,
        name: game.i18n.localize(
          `SETTINGS.Sound${key.charAt(0).toUpperCase() + key.slice(1)}Name`
        ),
        hint: game.i18n.localize(
          `SETTINGS.Sound${key.charAt(0).toUpperCase() + key.slice(1)}Hint`
        ),
        path: getSetting(`sound_${key}`),
        default: defaultPath,
      };
    });

    return context;
  }

  /**
   * Handles the play sound button click
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The target element
   */
  static async _onPlaySound(event, target) {
    try {
      const key = target.dataset.key;
      // Get the current value from the input field
      const input = document.querySelector(`input[name="sound_${key}"]`);
      if (!input) return;

      const path = input.value;
      if (path && path.trim() !== "") {
        // Play the sound directly using foundry.audio.AudioHelper (V12 namespace)
        await foundry.audio.AudioHelper.play(
          { src: path, volume: 0.8, autoplay: true, loop: false },
          false
        );
      } else {
        ui.notifications.warn(game.i18n.localize("SETTINGS.NoSoundSelected"));
      }
    } catch (error) {
      console.error("Error in _onPlaySound:", error);
      ui.notifications.error(game.i18n.localize("SETTINGS.ErrorPlayingSound"));
    }
  }

  /**
   * Handles the reset sound button click
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The target element
   */
  static _onResetSound(event, target) {
    try {
      const key = target.dataset.key;
      const defaultPath = target.dataset.default;

      // Get the input field and update its value
      const input = document.querySelector(`input[name="sound_${key}"]`);
      if (!input) return;

      input.value = defaultPath;
      // Dispatch a change event to ensure the form knows the value changed
      input.dispatchEvent(new Event("change"));
    } catch (error) {
      console.error("Error in _onResetSound:", error);
      ui.notifications.error(game.i18n.localize("SETTINGS.ErrorResettingSound"));
    }
  }

  /**
   * Handles the test all sounds button click
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The target element
   */
  static async _onTestAllSounds(event, target) {
    try {
      const soundKeys = Object.keys(erpsSoundManager.getDefaultSounds());
      for (const key of soundKeys) {
        // Get the current value from the input field
        const input = document.querySelector(`input[name="sound_${key}"]`);
        if (!input) continue;

        const path = input.value;
        if (path && path.trim() !== "") {
          // Play the sound directly using AudioHelper
          await foundry.audio.AudioHelper.play(
            { src: path, volume: 0.8, autoplay: true, loop: false },
            false
          );
          // Add a small delay between sounds
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    } catch (error) {
      console.error("Error in _onTestAllSounds:", error);
      ui.notifications.error(game.i18n.localize("SETTINGS.ErrorTestingSounds"));
    }
  }

  /**
   * Handles the reset all sounds button click
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The target element
   */
  static _onResetAllSounds(event, target) {
    try {
      const defaultSounds = erpsSoundManager.getDefaultSounds();
      for (const [key, defaultPath] of Object.entries(defaultSounds)) {
        // Get the input field and update its value
        const input = document.querySelector(`input[name="sound_${key}"]`);
        if (!input) continue;

        input.value = defaultPath;
        // We don't need to dispatch change events for each input
        // as we'll notify the user to save changes
      }
      ui.notifications.info(
        game.i18n.localize("SETTINGS.AllSoundsReset")
      );
    } catch (error) {
      console.error("Error in _onResetAllSounds:", error);
      ui.notifications.error(game.i18n.localize("SETTINGS.ErrorResettingAllSounds"));
    }
  }

  /**
   * Handles the file picker button click
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The target element
   * @returns {Promise} The file picker browse operation
   */
  static async _onBrowseFiles(event, target) {
    try {
      const inputName = target.dataset.target;
      const input = document.querySelector(`input[name="${inputName}"]`);
      if (!input) return;

      // Get the current path from the input
      let currentPath = input.value || "";

      const fp = new FilePicker({
        type: "audio",
        current: currentPath,
        callback: (path) => {
          // Update the input value
          input.value = path;
          // Dispatch a change event to ensure the form knows the value changed
          input.dispatchEvent(new Event("change"));
        },
        displayMode: "tiles",
      });
      return fp.browse();
    } catch (error) {
      console.error("Error in _onBrowseFiles:", error);
      ui.notifications.error(game.i18n.localize("SETTINGS.ErrorOpeningFilePicker"));
    }
  }

  /**
   * Handles form submission
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {Object} formData - The form data
   */
  static async _onSubmit(event, form, formData) {
    try {
      event.preventDefault();

      // Save each sound setting
      const defaultSounds = erpsSoundManager.getDefaultSounds();

      // Loop through all sound keys to ensure we're saving all settings
      for (const key of Object.keys(defaultSounds)) {
        const settingKey = `sound_${key}`;
        const inputElement = form.elements[settingKey];

        if (inputElement) {
          const value = inputElement.value;
          console.log(`Saving ${settingKey} with value ${value}`);
          await setSetting(settingKey, value);
        } else {
          console.warn(
            `Sound setting ${settingKey} not found in form elements`
          );
        }
      }

      // Refresh the sound manager to load the new settings
      erpsSoundManager.refreshSounds();

      ui.notifications.info(game.i18n.localize("SETTINGS.SoundSettingsSaved"));
      SettingsConfig.reloadConfirm({ world: true });
      return true;
    } catch (error) {
      console.error("Error in _onSubmit:", error);
      ui.notifications.error(game.i18n.localize("SETTINGS.ErrorSavingSoundSettings"));
      return false;
    }
  }
}

/**
 * Register system settings for the Eventide RP System
 */
export const registerSettings = function () {
  // System Sound Settings
  game.settings.register("eventide-rp-system", "enableSystemSounds", {
    name: "SETTINGS.EnableSystemSoundsName",
    hint: "SETTINGS.EnableSystemSoundsHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("eventide-rp-system", "systemSoundVolume", {
    name: "SETTINGS.SystemSoundVolumeName",
    hint: "SETTINGS.SystemSoundVolumeHint",
    scope: "client",
    config: true,
    type: Number,
    default: 0.5,
    range: {
      min: 0,
      max: 1,
      step: 0.1,
    },
  });

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

  // Combat-Related Settings
  game.settings.register("eventide-rp-system", "autoRollNpcInitiative", {
    name: "SETTINGS.AutoRollNpcInitiativeName",
    hint: "SETTINGS.AutoRollNpcInitiativeHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => {
      SettingsConfig.reloadConfirm({ world: true });
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

  // Individual sound settings (hidden from main menu)
  const defaultSounds = {
    healing: "systems/eventide-rp-system/assets/sounds/Cure2.wav",
    statusApply: "systems/eventide-rp-system/assets/sounds/jingles_SAX04.ogg",
    statusRemove: "systems/eventide-rp-system/assets/sounds/Cure5.wav",
    gearEquip: "systems/eventide-rp-system/assets/sounds/cloth3.ogg",
    gearUnequip: "systems/eventide-rp-system/assets/sounds/clothBelt2.ogg",
    combatPower: "systems/eventide-rp-system/assets/sounds/trap_00.wav",
    damage: "systems/eventide-rp-system/assets/sounds/swish_4.wav",
    initiative: "systems/eventide-rp-system/assets/sounds/levelup.wav",
  };

  // Register each sound setting
  for (const [key, defaultPath] of Object.entries(defaultSounds)) {
    game.settings.register("eventide-rp-system", `sound_${key}`, {
      name: `SETTINGS.Sound${key.charAt(0).toUpperCase() + key.slice(1)}Name`,
      hint: `SETTINGS.Sound${key.charAt(0).toUpperCase() + key.slice(1)}Hint`,
      scope: "world",
      config: false, // Hide from main settings menu
      type: String,
      default: defaultPath,
      onChange: (value) => {
        // If the value is empty, reset to default
        if (!value || value.trim() === "") {
          game.settings.set("eventide-rp-system", `sound_${key}`, defaultPath);
          ui.notifications.info(game.i18n.format("SETTINGS.SoundResetToDefault", [key]));
        }
      },
    });
  }

  // Register the sound settings menu after all sound settings are registered
  Hooks.once("ready", () => {
    game.settings.registerMenu("eventide-rp-system", "soundSettings", {
      name: "SETTINGS.SoundSettingsName",
      label: "SETTINGS.SoundSettingsLabel",
      hint: "SETTINGS.SoundSettingsHint",
      icon: "fas fa-volume-up",
      type: SoundSettingsApplication,
      restricted: false,
    });
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
