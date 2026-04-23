import { EventidePopupHelpers } from "../components/_module.mjs";
import { ThemeManagedPopupMixin } from "../mixins/_module.mjs";

/**
 * Application for displaying feature information in a popup.
 * @extends {ThemeManagedPopupMixin(EventidePopupHelpers)}
 */
export class FeaturePopup extends ThemeManagedPopupMixin(EventidePopupHelpers) {
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
    classes: ["eventide-sheet", "eventide-sheet--scrollbars", "feature-popup"],
    position: {
      width: 600,
      height: "auto",
    },
    window: {
      icon: "fa-solid fa-star",
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
    return game.i18n.format("EVENTIDE_RP_SYSTEM.WindowTitles.FeaturePopup");
  }

  constructor({ item }) {
    super({ item });
    this.type = "feature";
  }

  /**
   * Prepare the main context data for the feature popup.
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.cssClass = FeaturePopup.DEFAULT_OPTIONS.classes.join(" ");

    return context;
  }

  static async #toChat() {
    erps.messages.createFeatureMessage(this.item);
    this.close();
  }
}
