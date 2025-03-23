import { erpsSoundManager } from "./sound-manager.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Message Settings Application
 * This application allows users to configure message settings
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class MessageSettingsApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static PARTS = {
    messageSettings: {
      template: "systems/eventide-rp-system/templates/settings/message-settings.hbs",
    },
  };

  static DEFAULT_OPTIONS = {
    id: "eventide-message-settings",
    classes: ["eventide-rp-system", "message-settings"],
    position: {
      width: 600,
      height: "auto",
    },
    window: {
      title: "SETTINGS.MessageSettingsTitle",
      icon: "fas fa-comment-alt",
    },
    tag: "form",
    form: {
      handler: this._onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      previewMessage: this._onPreviewMessage,
      resetSetting: this._onResetSetting,
      resetAllSettings: this._onResetAllSettings,
      browseFiles: this._onBrowseFiles,
    },
    listeners: [
      {
        selector: 'input[type="color"]',
        event: "input",
        callback: this._onColorChange,
      },
    ],
  };

  /**
   * Prepares the context data for the message settings form
   * @returns {Object} The prepared context data
   */
  async _prepareContext() {
    if (!game.user.isGM) {
      ui.notifications.error(game.i18n.localize("SETTINGS.NoPlayerPermission"));
      return this.close();
    }
    const context = await super._prepareContext();

    // General message settings
    context.generalSettings = {
      showGearEquipMessages: getSetting("showGearEquipMessages")
    };

    // Power message settings
    context.powerSettings = {
      enableMessages: getSetting("powerMessage_enableMessages"),
      colors: [
        {
          key: "incrementTextColor",
          name: game.i18n.localize("SETTINGS.PowerIncrementTextColorName"),
          hint: game.i18n.localize("SETTINGS.PowerIncrementTextColorHint"),
          value: getSetting("powerMessage_incrementTextColor") || "#ffffff",
          default: "#ffffff",
        },
        {
          key: "incrementBgColor",
          name: game.i18n.localize("SETTINGS.PowerIncrementBgColorName"),
          hint: game.i18n.localize("SETTINGS.PowerIncrementBgColorHint"),
          value: getSetting("powerMessage_incrementBgColor") || "#4b0082",
          default: "#4b0082",
        },
        {
          key: "decrementTextColor",
          name: game.i18n.localize("SETTINGS.PowerDecrementTextColorName"),
          hint: game.i18n.localize("SETTINGS.PowerDecrementTextColorHint"),
          value: getSetting("powerMessage_decrementTextColor") || "#ffffff",
          default: "#ffffff",
        },
        {
          key: "decrementBgColor",
          name: game.i18n.localize("SETTINGS.PowerDecrementBgColorName"),
          hint: game.i18n.localize("SETTINGS.PowerDecrementBgColorHint"),
          value: getSetting("powerMessage_decrementBgColor") || "#4b0082",
          default: "#4b0082",
        }
      ],
      images: [
        {
          key: "incrementImage",
          name: game.i18n.localize("SETTINGS.PowerIncrementImageName"),
          hint: game.i18n.localize("SETTINGS.PowerIncrementImageHint"),
          value: getSetting("powerMessage_incrementImage") || "systems/eventide-rp-system/assets/icons/power-up.svg",
          default: "systems/eventide-rp-system/assets/icons/power-up.svg",
        },
        {
          key: "decrementImage",
          name: game.i18n.localize("SETTINGS.PowerDecrementImageName"),
          hint: game.i18n.localize("SETTINGS.PowerDecrementImageHint"),
          value: getSetting("powerMessage_decrementImage") || "systems/eventide-rp-system/assets/icons/power-down.svg",
          default: "systems/eventide-rp-system/assets/icons/power-down.svg",
        }
      ]
    };

    return context;
  }

  /**
   * Handle color input changes
   * @param {Event} event - The input event
   * @param {HTMLElement} target - The target element
   */
  static _onColorChange(event, target) {
    try {
      // Get the text input associated with this color input
      const colorKey = target.name;
      const textInput = document.querySelector(`input[name="${colorKey}_text"]`);
      if (textInput) {
        textInput.value = target.value;
      }
    } catch (error) {
      console.error("Error in _onColorChange:", error);
    }
  }

  /**
   * Handle preview message button click
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The target element
   */
  static async _onPreviewMessage(event, target) {
    try {
      const form = target.closest("form");
      if (!form) return;

      // Get values from the form
      const textColor = form.querySelector('input[name="powerMessage_incrementTextColor"]').value;
      const bgColor = form.querySelector('input[name="powerMessage_incrementBgColor"]').value;
      const incrementImage = form.querySelector('input[name="powerMessage_incrementImage"]').value;
      
      // Create a preview message
      const content = `
        <div class="power-message" style="background-color: ${bgColor}; color: ${textColor}; padding: 10px; border-radius: 5px;">
          <div class="power-message__header" style="display: flex; align-items: center; margin-bottom: 5px;">
            <img src="${incrementImage}" style="width: 24px; height: 24px; margin-right: 10px;" />
            <h3 style="margin: 0;">Power Change</h3>
          </div>
          <div class="power-message__content">
            <p style="margin: 0;">Character's power increased by 1.</p>
            <p style="margin: 0;">Current Power: 3/5</p>
          </div>
        </div>
      `;

      ChatMessage.create({
        content,
        speaker: { alias: game.i18n.localize("SETTINGS.MessageSettingsTitle") },
        whisper: [game.user.id],
      });
    } catch (error) {
      console.error("Error in _onPreviewMessage:", error);
      ui.notifications.error(game.i18n.localize("SETTINGS.ErrorPreviewingMessage"));
    }
  }

  /**
   * Handle reset setting button click
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The target element
   */
  static _onResetSetting(event, target) {
    try {
      const key = target.dataset.key;
      const defaultValue = target.dataset.default;
      
      // Get the input field and update its value
      const input = document.querySelector(`input[name="powerMessage_${key}"]`);
      if (!input) return;

      input.value = defaultValue;
      
      // Dispatch a change event to ensure the form knows the value changed
      input.dispatchEvent(new Event("change"));
      
      // Update color text input if present (for color inputs)
      if (key === "incrementTextColor" || key === "incrementBgColor" || key === "decrementTextColor" || key === "decrementBgColor") {
        const textInput = document.querySelector(`input[name="powerMessage_${key}_text"]`);
        if (textInput) {
          textInput.value = defaultValue;
        }
      }
      
      // Update image preview if present
      if (key === "incrementImage" || key === "decrementImage") {
        const preview = input.closest(".message-settings__fields").querySelector(".message-settings__preview-img");
        if (preview) {
          preview.src = defaultValue;
        }
      }
    } catch (error) {
      console.error("Error in _onResetSetting:", error);
      ui.notifications.error(game.i18n.localize("SETTINGS.ErrorResettingColor"));
    }
  }

  /**
   * Handle reset all settings button click
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The target element
   */
  static _onResetAllSettings(event, target) {
    try {
      // Default general settings
      const defaultGeneralSettings = {
        showGearEquipMessages: true
      };

      // Default power settings
      const defaultPowerSettings = {
        incrementTextColor: "#ffffff",
        incrementBgColor: "#4b0082",
        decrementTextColor: "#ffffff",
        decrementBgColor: "#4b0082",
        incrementImage: "systems/eventide-rp-system/assets/icons/power-up.svg",
        decrementImage: "systems/eventide-rp-system/assets/icons/power-down.svg",
        enableMessages: true
      };

      // Update general settings
      for (const [key, value] of Object.entries(defaultGeneralSettings)) {
        const input = document.querySelector(`input[name="${key}"]`);
        if (!input) continue;
        
        if (input.type === "checkbox") {
          input.checked = value;
        } else {
          input.value = value;
        }
        
        // Dispatch a change event to ensure the form knows the value changed
        input.dispatchEvent(new Event("change"));
      }

      // Update power settings
      for (const [key, value] of Object.entries(defaultPowerSettings)) {
        const input = document.querySelector(`input[name="powerMessage_${key}"]`);
        if (!input) continue;
        
        if (input.type === "checkbox") {
          input.checked = value;
        } else {
          input.value = value;
        }
        
        // Dispatch a change event to ensure the form knows the value changed
        input.dispatchEvent(new Event("change"));
        
        // Update color text inputs if present
        if (key === "incrementTextColor" || key === "incrementBgColor" || key === "decrementTextColor" || key === "decrementBgColor") {
          const textInput = document.querySelector(`input[name="powerMessage_${key}_text"]`);
          if (textInput) {
            textInput.value = value;
          }
        }
        
        // Update image previews if present
        if (key === "incrementImage" || key === "decrementImage") {
          const preview = input.closest(".message-settings__fields").querySelector(".message-settings__preview-img");
          if (preview) {
            preview.src = value;
          }
        }
      }

      ui.notifications.info(game.i18n.localize("SETTINGS.AllMessageSettingsReset"));
    } catch (error) {
      console.error("Error in _onResetAllSettings:", error);
      ui.notifications.error(game.i18n.localize("SETTINGS.ErrorResettingAllMessageSettings"));
    }
  }

  /**
   * Handle browse files button click
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The target element
   */
  static async _onBrowseFiles(event, target) {
    try {
      const inputName = target.dataset.target;
      const input = document.querySelector(`input[name="${inputName}"]`);
      if (!input) return;

      // Get the current path from the input
      let currentPath = input.value || "";

      const fp = new FilePicker({
        type: "image",
        current: currentPath,
        callback: (path) => {
          // Update the input value
          input.value = path;
          
          // Dispatch a change event to ensure the form knows the value changed
          input.dispatchEvent(new Event("change"));
          
          // Update image preview if present
          const preview = input.closest(".message-settings__fields").querySelector(".message-settings__preview-img");
          if (preview) {
            preview.src = path;
          }
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

      // Save general settings
      if (formData.hasOwnProperty("showGearEquipMessages")) {
        await setSetting("showGearEquipMessages", formData.showGearEquipMessages);
      }

      // Get default power message settings to ensure we save all settings
      const defaultMessageSettings = {
        incrementTextColor: "#ffffff",
        incrementBgColor: "#4b0082",
        decrementTextColor: "#ffffff",
        decrementBgColor: "#4b0082",
        incrementImage: "systems/eventide-rp-system/assets/icons/power-up.svg",
        decrementImage: "systems/eventide-rp-system/assets/icons/power-down.svg",
        enableMessages: true
      };

      // Save power message settings
      for (const key of Object.keys(defaultMessageSettings)) {
        const settingKey = `powerMessage_${key}`;
        const inputElement = form.elements[settingKey];
        
        if (inputElement) {
          let value;
          if (inputElement.type === "checkbox") {
            value = inputElement.checked;
          } else {
            value = inputElement.value;
          }
          
          console.log(`Saving ${settingKey} with value ${value}`);
          await setSetting(settingKey, value);
        } else {
          console.warn(`Message setting ${settingKey} not found in form elements`);
        }
      }
      
      ui.notifications.info(game.i18n.localize("SETTINGS.MessageSettingsSaved"));
      SettingsConfig.reloadConfirm({ world: true });
      return true;
    } catch (error) {
      console.error("Error in _onSubmit:", error);
      ui.notifications.error(game.i18n.localize("SETTINGS.ErrorSavingMessageSettings"));
      return false;
    }
  }
}

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
      ui.notifications.error(
        game.i18n.localize("SETTINGS.ErrorResettingSound")
      );
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
      ui.notifications.info(game.i18n.localize("SETTINGS.AllSoundsReset"));
    } catch (error) {
      console.error("Error in _onResetAllSounds:", error);
      ui.notifications.error(
        game.i18n.localize("SETTINGS.ErrorResettingAllSounds")
      );
    }
  }

  /**
   * Handles the file picker button click
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The target element
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
      ui.notifications.error(
        game.i18n.localize("SETTINGS.ErrorOpeningFilePicker")
      );
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
      ui.notifications.error(
        game.i18n.localize("SETTINGS.ErrorSavingSoundSettings")
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

  // Power System Settings
  game.settings.register("eventide-rp-system", "defaultPowerMax", {
    name: "SETTINGS.DefaultPowerMaxName",
    hint: "SETTINGS.DefaultPowerMaxHint",
    scope: "world",
    config: true,
    type: String,
    default: "@lvl + @wits.total",
    onChange: (value) => {
      // If the value is empty, reset it to the default
      if (!value || value.trim() === "") {
        const defaultFormula = "@lvl + @wits.total";
        game.settings.set("eventide-rp-system", "defaultPowerMax", defaultFormula);
        ui.notifications.warn("Power maximum formula cannot be empty. Resetting to default.");
      }
      SettingsConfig.reloadConfirm({ world: true });
    },
  });

  // Power message settings (hidden from main menu)
  const defaultMessageSettings = {
    incrementTextColor: "#ffffff",
    incrementBgColor: "#4b0082",
    decrementTextColor: "#ffffff",
    decrementBgColor: "#4b0082",
    incrementImage: "systems/eventide-rp-system/assets/icons/power-up.svg",
    decrementImage: "systems/eventide-rp-system/assets/icons/power-down.svg",
    enableMessages: true
  };

  // Register each message setting
  for (const [key, defaultValue] of Object.entries(defaultMessageSettings)) {
    game.settings.register("eventide-rp-system", `powerMessage_${key}`, {
      name: key === "enableMessages" 
        ? "SETTINGS.EnablePowerMessagesName"
        : `SETTINGS.Power${key.charAt(0).toUpperCase() + key.slice(1)}Name`,
      hint: key === "enableMessages"
        ? "SETTINGS.EnablePowerMessagesHint"
        : `SETTINGS.Power${key.charAt(0).toUpperCase() + key.slice(1)}Hint`,
      scope: "world",
      config: false, // Hide from main settings menu
      type: key === "enableMessages" ? Boolean : String,
      default: defaultValue,
      onChange: (value) => {
        // If the value is empty and it's not a boolean, reset to default
        if (key !== "enableMessages" && (!value || value.trim() === "")) {
          game.settings.set("eventide-rp-system", `powerMessage_${key}`, defaultValue);
          ui.notifications.info(
            game.i18n.localize("SETTINGS.SettingResetToDefault")
          );
        }
      },
    });
  }

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
          ui.notifications.info(
            game.i18n.format("SETTINGS.SoundResetToDefault", [key])
          );
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
      restricted: true,
      scope: "world",
    });

    game.settings.registerMenu("eventide-rp-system", "messageSettings", {
      name: "SETTINGS.MessageSettingsName",
      label: "SETTINGS.MessageSettingsLabel",
      hint: "SETTINGS.MessageSettingsHint",
      icon: "fas fa-comment-alt",
      type: MessageSettingsApplication,
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
