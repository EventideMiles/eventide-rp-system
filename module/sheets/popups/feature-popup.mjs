import { EventidePopupHelpers } from "../base/eventide-popup-helpers.mjs";

/**
 * Application for displaying feature information in a popup.
 * @extends {EventidePopupHelpers}
 */
export class FeaturePopup extends EventidePopupHelpers {
  /** @override */
  static PARTS = {
    featurePopup: {
      template:
        "systems/eventide-rp-system/templates/macros/popups/feature-popup.hbs",
    },
  };

  /** @override */
  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: ["eventide-rp-system", "standard-form", "feature-popup"],
    position: {
      width: 400,
      height: "auto",
    },
    window: {
      icon: "fa-solid fa-star",
    },
    actions: {
      toChat: this.#toChat,
    },
  };

  /**
   * Get the localized window title
   * @returns {string} The localized window title
   */
  get title() {
    return game.i18n.format("EVENTIDE_RP_SYSTEM.WindowTitles.FeaturePopup");
  }

  constructor({ item }) {
    super({ item });
  }

  /**
   * Prepare the main context data for the form.
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.cssClass = FeaturePopup.DEFAULT_OPTIONS.classes.join(" ");

    context.footerButtons = [
      {
        label: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Forms.Buttons.SendToChat"
        ),
        type: "button",
        cssClass: "popup-form__button",
        action: "toChat",
      },
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Close"),
        type: "submit",
        cssClass: "popup-form__button popup-form__button--primary",
      },
    ];

    return context;
  }

  static async #toChat() {
    erps.messages.createFeatureMessage(this.item);
    this.close();
  }
}
