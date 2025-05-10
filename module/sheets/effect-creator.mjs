import { CreatorApplication } from "./base/creator-application.mjs";
/**
 * A form application for creating and managing status effects and features.
 * @extends {CreatorApplication}
 */
export class EffectCreator extends CreatorApplication {
  static PARTS = {
    effectCreator: {
      template:
        "/systems/eventide-rp-system/templates/macros/effect-creator.hbs",
    },
  };

  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: ["eventide-rp-system", "standard-form", "effect-creator"],
    window: {
      icon: "fa-solid fa-message-plus",
    },
    form: {
      handler: super._onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  /**
   * Get the localized window title
   * @returns {string} The localized window title
   */
  get title() {
    return game.i18n.format("EVENTIDE_RP_SYSTEM.WindowTitles.EffectCreator");
  }

  constructor({ advanced = false, number = 0, playerMode = false } = {}) {
    super({ advanced, number, playerMode, keyType: "effect" });
  }

  /**
   * Prepares the main context data for the form.
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context containing abilities, stored preferences, and target information
   * @throws {Error} Implicitly closes the form if a player has no selected tokens
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.storedData = {
      effect_img:
        this.storedData[this.storageKeys[0]] || "icons/svg/stoned.svg",
      effect_bgColor: this.storedData[this.storageKeys[1]],
      effect_textColor: this.storedData[this.storageKeys[2]],
      effect_iconTint: this.storedData[this.storageKeys[3]],
      effect_displayOnToken: this.storedData[this.storageKeys[4]],
      effect_type:
        this.storedData[this.storageKeys[5]] === "feature" || context.playerMode
          ? "feature"
          : "status",
    };

    console.log(context.storedData);

    if (context.storedData.effect_displayOnToken === null) {
      console.log("Setting default displayOnToken to true");
      context.storedData.effect_displayOnToken = "true";
    }

    console.log(context.storedData);

    return context;
  }
}
