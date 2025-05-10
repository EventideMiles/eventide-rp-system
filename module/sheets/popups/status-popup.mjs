import { EventidePopupHelpers } from "../base/eventide-popup-helpers.mjs";

/**
 * Application for managing damage to targeted tokens.
 * @extends {EventidePopupHelpers}
 */
export class StatusPopup extends EventidePopupHelpers {
  /** @override */
  static PARTS = {
    statusPopup: {
      template:
        "systems/eventide-rp-system/templates/macros/popups/status-popup.hbs",
    },
  };

  /** @override */
  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: ["eventide-rp-system", "standard-form", "status-popup"],
    position: {
      width: 400,
      height: "auto",
    },
    window: {
      icon: "fa-solid fa-info-circle",
    },
    form: {
      handler: this.close,
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
    return game.i18n.format("EVENTIDE_RP_SYSTEM.WindowTitles.StatusPopup");
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
    context.cssClass = StatusPopup.DEFAULT_OPTIONS.classes.join(" ");
    context.problems = await this.checkEligibility();

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
    erps.messages.createStatusMessage(this.item);
    this.close();
  }
}
