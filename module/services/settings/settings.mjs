import { EventideSheetHelpers } from "../../ui/_module.mjs";
import { erpsSoundManager, Logger } from "../_module.mjs";

/**
 * EVENTIDE RP SYSTEM - SETTINGS CONFIGURATION
 * ============================================
 *
 * This file manages all system settings for the Eventide RP System.
 * Settings are organized by scope and permission level:
 *
 * CLIENT SCOPE (Player Preferences):
 *   - enableSystemSounds: System Sound Settings
 *   - sheetTheme: Personal theme choice for all system applications
 *   - defaultCharacterTab: Personal default tab preference
 *
 * WORLD SCOPE + RESTRICTED (GM Only):
 *   - initativeFormula: Combat mechanics (REQUIRES RELOAD)
 *   - initiativeDecimals: Combat display precision (REQUIRES RELOAD)
 *   - autoRollNpcInitiative: Combat automation behavior
 *   - hideNpcInitiativeRolls: Combat display behavior
 *   - autoRollPlayerInitiative: Combat automation behavior
 *   - defaultCombatRoundDuration: Combat timing default
 *   - showGearEquipMessages: Equipment notification behavior
 *   - gearEquippedDefault: Equipment default state
 *   - testingMode: Developer debugging mode
 *   - sound_* settings: Audio file paths (hidden from main menu)
 *
 * RELOAD REQUIREMENTS:
 *   - Only initativeFormula and initiativeDecimals require reloads
 *   - All other settings take effect immediately when checked at runtime
 *   - Sound settings and UI themes have immediate effect without reload
 *
 * SECURITY:
 *   - All world-scoped settings use restricted: true for GM-only access
 *   - Sound settings menu is also restricted to GM access
 *   - Client settings remain visible to all users as intended
 */

/**
 * Sound Settings Application
 * @extends {EventideSheetHelpers}
 */
export class SoundSettingsApplication extends EventideSheetHelpers {
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
    if (!game.user.isGM) {
      ui.notifications.error(game.i18n.localize("SETTINGS.NoPlayerPermission"));
      return this.close();
    }
    const context = await super._prepareContext();

    // Get all sound settings
    const defaultSounds = erpsSoundManager.getDefaultSounds();
    context.sounds = Object.entries(defaultSounds).map(([key, defaultPath]) => {
      return {
        key,
        name: game.i18n.localize(
          `SETTINGS.Sound${key.charAt(0).toUpperCase() + key.slice(1)}Name`,
        ),
        hint: game.i18n.localize(
          `SETTINGS.Sound${key.charAt(0).toUpperCase() + key.slice(1)}Hint`,
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
  static async _onPlaySound(_event, target) {
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
          false,
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
  static _onResetSound(_event, target) {
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
      ui.notifications.error(
        game.i18n.localize("SETTINGS.ErrorResettingSound"),
      );
    }
  }

  /**
   * Handles the test all sounds button click
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The target element
   */
  static async _onTestAllSounds(_event, _target) {
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
            false,
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
  static _onResetAllSounds(_event, _target) {
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
      ui.notifications.info(game.i18n.localize("SETTINGS.AllSoundsReset"));
    } catch (error) {
      console.error("Error in _onResetAllSounds:", error);
      ui.notifications.error(
        game.i18n.localize("SETTINGS.ErrorResettingAllSounds"),
      );
    }
  }

  /**
   * Handles the file picker button click
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The target element
   */
  static async _onBrowseFiles(event, target) {
    await super._fileHandler(event, target, { type: "audio" });
  }

  /**
   * Handles form submission
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {Object} formData - The form data
   */
  static async _onSubmit(event, _form, formData) {
    try {
      event.preventDefault();

      // Save each sound setting
      const defaultSounds = erpsSoundManager.getDefaultSounds();

      // Loop through all sound keys to ensure we're saving all settings
      for (const key of Object.keys(defaultSounds)) {
        const settingKey = `sound_${key}`;
        const value = formData.get(settingKey);

        if (value) {
          console.info(`Saving ${settingKey} with value ${value}`);
          await setSetting(settingKey, value);
        } else {
          console.warn(
            `Sound setting ${settingKey} not found in form elements`,
          );
        }
      }

      // Refresh the sound manager to load the new settings
      erpsSoundManager.refreshSounds();

      ui.notifications.info(game.i18n.localize("SETTINGS.SoundSettingsSaved"));
      foundry.applications.settings.SettingsConfig.reloadConfirm({
        world: true,
      });
      return true;
    } catch (error) {
      console.error("Error in _onSubmit:", error);
      ui.notifications.error(
        game.i18n.localize("SETTINGS.ErrorSavingSoundSettings"),
      );
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

  // Character Sheet Theme Options (Client preference)
  /**
   * Theme setting registration for character sheets and applications
   * Handles theme changes through a robust hook system that ensures proper
   * propagation across all applications and components.
   *
   * @type {ClientSetting}
   * @property {string} name - Localized setting name
   * @property {string} hint - Localized setting hint
   * @property {string} scope - Setting scope (client)
   * @property {boolean} config - Whether the setting is configurable
   * @property {string} type - Setting type (String)
   * @property {string} default - Default theme value
   * @property {Object} choices - Available theme choices
   * @property {Function} onChange - Theme change handler
   */
  game.settings.register("eventide-rp-system", "sheetTheme", {
    name: "SETTINGS.SheetThemeName",
    hint: "SETTINGS.SheetThemeHint",
    scope: "client",
    config: true,
    type: String,
    default: "blue",
    choices: {
      blue: "SETTINGS.SheetThemeBlue",
      gold: "SETTINGS.SheetThemeGold",
      green: "SETTINGS.SheetThemeGreen",
      black: "SETTINGS.SheetThemeBlack",
      purple: "SETTINGS.SheetThemePurple",
      light: "SETTINGS.SheetThemeLight",
    },
    onChange: async (value) => {
      try {
        // Update user flag for immediate effect on all themed applications
        await game.user.setFlag("eventide-rp-system", "sheetTheme", value);

        Logger.info("Theme setting changed - broadcasting theme update", {
          userName: game.user.name,
          newTheme: value,
        });

        // Broadcast a hook that our applications can listen to
        Hooks.callAll("eventide-rp-system.themeChanged", {
          newTheme: value,
          userId: game.user.id,
        });

        // Show user notification of theme change
        ui.notifications.info(
          `Theme changed to ${value.charAt(0).toUpperCase() + value.slice(1)}`,
          {
            permanent: false,
            console: false,
          },
        );

        Logger.debug("Theme change hook broadcasted", {
          hookCalled: true,
          userNotified: true,
        });
      } catch (error) {
        Logger.error("Failed to update theme", {
          error: error.message,
          stack: error.stack,
        });
        ui.notifications.error("Failed to update theme. Please try again.");
      }
    },
  });

  // Migrate existing user flag to setting if needed
  Hooks.once("ready", () => {
    const existingFlag = game.user.getFlag("eventide-rp-system", "sheetTheme");
    const currentSetting = game.settings.get(
      "eventide-rp-system",
      "sheetTheme",
    );

    // If user has a flag but setting is default, migrate the flag to setting
    if (existingFlag && currentSetting === "blue" && existingFlag !== "blue") {
      game.settings.set("eventide-rp-system", "sheetTheme", existingFlag);
      Logger.info(
        `Eventide RP System: Migrated theme preference from flag to setting: ${existingFlag}`,
      );
    }
  });

  // Default Tab (Client preference)
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

  // ===========================================
  // WORLD-SCOPED SETTINGS (GM Only - Game Rules)
  // ===========================================

  // Initiative Formula (affects combat mechanics - needs reload)
  game.settings.register("eventide-rp-system", "initativeFormula", {
    name: "SETTINGS.InitativeFormulaName",
    hint: "SETTINGS.InitativeFormulaHint",
    scope: "world",
    config: true,
    restricted: true,
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
          defaultFormula,
        );
        ui.notifications.warn(
          "Initiative formula cannot be empty. Resetting to default.",
        );
      } else {
        // Update the initiative formula in the current session
        CONFIG.Combat.initiative.formula = value;

        // Prompt for reload to ensure all initiative calculations use the new formula
        foundry.applications.settings.SettingsConfig.reloadConfirm({
          world: true,
        });
      }
    },
  });

  // Initiative Decimals (affects combat mechanics - needs reload)
  game.settings.register("eventide-rp-system", "initiativeDecimals", {
    name: "SETTINGS.InitiativeDecimalsName",
    hint: "SETTINGS.InitiativeDecimalsHint",
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    default: 2,
    range: {
      min: 0,
      max: 4,
      step: 1,
    },
    onChange: () => {
      // Initiative decimals affects core combat display - reload needed
      foundry.applications.settings.SettingsConfig.reloadConfirm({
        world: true,
      });
    },
  });

  // ===========================================
  // COMBAT SETTINGS (GM Only - No Reload Needed)
  // ===========================================

  // Auto Roll NPC Initiative (can be changed immediately)
  game.settings.register("eventide-rp-system", "autoRollNpcInitiative", {
    name: "SETTINGS.AutoRollNpcInitiativeName",
    hint: "SETTINGS.AutoRollNpcInitiativeHint",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: true,
  });

  // Hide NPC Initiative Rolls (can be changed immediately)
  game.settings.register("eventide-rp-system", "hideNpcInitiativeRolls", {
    name: "SETTINGS.HideNpcInitiativeRollsName",
    hint: "SETTINGS.HideNpcInitiativeRollsHint",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: false,
  });

  // Auto Roll Player Initiative (can be changed immediately)
  game.settings.register("eventide-rp-system", "autoRollPlayerInitiative", {
    name: "SETTINGS.AutoRollPlayerInitiativeName",
    hint: "SETTINGS.AutoRollPlayerInitiativeHint",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: false,
  });

  // Default Combat Round Duration (can be changed immediately)
  game.settings.register("eventide-rp-system", "defaultCombatRoundDuration", {
    name: "SETTINGS.DefaultCombatRoundDurationName",
    hint: "SETTINGS.DefaultCombatRoundDurationHint",
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    default: 6,
    range: {
      min: 1,
      max: 60,
      step: 1,
    },
  });

  // ===========================================
  // GEAR SETTINGS (GM Only - No Reload Needed)
  // ===========================================

  // Show Gear Equip Messages (can be changed immediately)
  game.settings.register("eventide-rp-system", "showGearEquipMessages", {
    name: "SETTINGS.ShowGearEquipMessagesName",
    hint: "SETTINGS.ShowGearEquipMessagesHint",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: true,
  });

  // Gear Equipped by Default (can be changed immediately)
  game.settings.register("eventide-rp-system", "gearEquippedDefault", {
    name: "SETTINGS.GearEquippedDefaultName",
    hint: "SETTINGS.GearEquippedDefaultHint",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: true,
  });

  // ===========================================
  // ACTION CARD SETTINGS (GM Only - No Reload Needed)
  // ===========================================

  // Enable Action Card Attack Chains (can be changed immediately)
  game.settings.register("eventide-rp-system", "enableActionCardChains", {
    name: "SETTINGS.EnableActionCardChainsName",
    hint: "SETTINGS.EnableActionCardChainsHint",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: true,
  });

  // ===========================================
  // NPC SETTINGS (GM Only - No Reload Needed)
  // ===========================================

  // CR to XP Calculation Formula (can be changed immediately)
  game.settings.register("eventide-rp-system", "crToXpFormula", {
    name: "SETTINGS.CrToXpFormulaName",
    hint: "SETTINGS.CrToXpFormulaHint",
    scope: "world",
    config: true,
    restricted: true,
    type: String,
    default: "@cr * 200 + @cr * @cr * 50",
    onChange: (value) => {
      // If the value is empty, reset it to the default
      if (!value || value.trim() === "") {
        const defaultFormula = "@cr * 200 + @cr * @cr * 50";
        game.settings.set(
          "eventide-rp-system",
          "crToXpFormula",
          defaultFormula,
        );
        ui.notifications.warn(
          "CR to XP formula cannot be empty. Resetting to default.",
        );
      } else {
        // Refresh any open NPC sheets to show updated XP values
        Object.values(ui.windows).forEach((app) => {
          if (
            app instanceof CONFIG.Actor.sheetClass &&
            app.actor?.type === "npc"
          ) {
            app.render();
          }
        });
      }
    },
  });

  // Default Token Vision Range (can be changed immediately)
  game.settings.register("eventide-rp-system", "defaultTokenVisionRange", {
    name: "SETTINGS.DefaultTokenVisionRangeName",
    hint: "SETTINGS.DefaultTokenVisionRangeHint",
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    default: 50,
    range: {
      min: 0,
      max: 1000,
      step: 5,
    },
  });

  // ===========================================
  // DEVELOPER/TESTING SETTINGS (GM Only)
  // ===========================================

  // Testing Mode (developer setting)
  game.settings.register("eventide-rp-system", "testingMode", {
    name: "SETTINGS.TestingModeName",
    hint: "SETTINGS.TestingModeHint",
    scope: "world",
    config: true,
    restricted: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      console.info(`Testing mode set to ${value}`);
      // No reload needed - can be checked at runtime
    },
  });

  // ===========================================
  // SOUND SETTINGS (GM Only - Hidden from main menu)
  // ===========================================

  // Individual sound settings (hidden from main menu)
  const defaultSounds = erpsSoundManager.getDefaultSounds();

  // Register each sound setting
  for (const [key, defaultPath] of Object.entries(defaultSounds)) {
    game.settings.register("eventide-rp-system", `sound_${key}`, {
      name: `SETTINGS.Sound${key.charAt(0).toUpperCase() + key.slice(1)}Name`,
      hint: `SETTINGS.Sound${key.charAt(0).toUpperCase() + key.slice(1)}Hint`,
      scope: "world",
      config: false, // Hide from main settings menu
      restricted: true,
      type: String,
      default: defaultPath,
      onChange: (value) => {
        // If the value is empty, reset to default
        if (!value || value.trim() === "") {
          game.settings.set("eventide-rp-system", `sound_${key}`, defaultPath);
          ui.notifications.info(
            game.i18n.format("SETTINGS.SoundResetToDefault", [key]),
          );
        }
        // No reload needed - sounds are loaded on demand
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
      restricted: true,
      scope: "world",
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
