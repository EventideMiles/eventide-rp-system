import { EventidePopupHelpers } from "../components/_module.mjs";
import {
  initThemeManager,
  applyThemeImmediate,
  THEME_PRESETS,
  cleanupThemeManager,
} from "../../helpers/_module.mjs";
import { Logger } from "../../services/_module.mjs";

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
   * Handle rendering of the status popup application
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
   * Handle the first render of the status popup application
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
            "Theme management initialized asynchronously for status popup",
            {
              hasThemeManager: !!this.themeManager,
              sheetId: this.id,
            },
            "THEME",
          );
        })
        .catch((error) => {
          Logger.error(
            "Failed to initialize theme manager for status popup",
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
