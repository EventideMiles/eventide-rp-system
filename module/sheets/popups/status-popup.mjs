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
      title: "Status Information",
      icon: "fa-solid fa-info-circle",
    },
    form: {
      handler: this.close,
    },
    actions: {
      toChat: this.#toChat,
    },
  };

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

    return context;
  }

  static async #toChat() {
    erps.messages.createStatusMessage(this.item);
    this.close();
  }
}
