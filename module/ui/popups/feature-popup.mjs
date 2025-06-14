import { EventidePopupHelpers } from "../components/_module.mjs";
import {
  initThemeManager,
  THEME_PRESETS,
  applyThemeImmediate,
  cleanupThemeManager,
} from "../../helpers/_module.mjs";
import { Logger } from "../../services/_module.mjs";

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
   * Handle rendering of the feature popup application
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   */
  _onRender(_context, _options) {
    super._onRender(_context, _options);

    // Re-apply themes on re-render (but don't reinitialize)
    if (this.themeManager) {
      this.themeManager.applyThemes();
    }
  }

  /**
   * Handle the first render of the feature popup application
   * @override
   * @protected
   */
  async _onFirstRender() {
    super._onFirstRender();

    // Apply theme immediately to prevent flashing
    applyThemeImmediate(this.element);

    // Initialize theme management only on first render (non-blocking like actor/item sheets)
    if (!this.themeManager) {
      initThemeManager(this, THEME_PRESETS.CREATOR_APPLICATION)
        .then((manager) => {
          this.themeManager = manager;
          Logger.debug(
            "Theme management initialized asynchronously for feature popup",
            {
              hasThemeManager: !!this.themeManager,
              sheetId: this.id,
            },
            "THEME",
          );
        })
        .catch((error) => {
          Logger.error(
            "Failed to initialize theme manager for feature popup",
            error,
            "THEME",
          );
        });
    }
  }

  /**
   * Clean up resources before closing the application
   * @param {Object} options - The options for closing
   * @returns {Promise<void>}
   * @override
   */
  async _preClose(options) {
    // Clean up theme management for this specific instance
    if (this.themeManager) {
      cleanupThemeManager(this);
      this.themeManager = null;
    }

    await super._preClose(options);
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
