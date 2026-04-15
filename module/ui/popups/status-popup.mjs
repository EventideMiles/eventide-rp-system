import { EventidePopupHelpers } from "../components/_module.mjs";
import { ThemeManagedPopupMixin } from "../mixins/_module.mjs";

/**
 * Application for managing damage to targeted tokens.
 * @extends {ThemeManagedPopupMixin(EventidePopupHelpers)}
 */
export class StatusPopup extends ThemeManagedPopupMixin(EventidePopupHelpers) {
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
    classes: ["eventide-sheet", "eventide-sheet--scrollbars", "status-popup"],
    position: {
      width: 600,
      height: "auto",
    },
    window: {
      icon: "fa-solid fa-info-circle",
    },
    form: {
      handler: this.#toChat,
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
    this.type = "status";
  }

  /**
   * Prepare the main context data for the status popup.
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = StatusPopup.DEFAULT_OPTIONS.classes.join(" ");

    return context;
  }

  static async #toChat() {
    erps.messages.createStatusMessage(this.item, null);
    this.close();
  }
}
