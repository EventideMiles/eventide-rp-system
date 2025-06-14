import { EventidePopupHelpers } from "../components/_module.mjs";
import {
  initThemeManager,
  THEME_PRESETS,
  applyThemeImmediate,
  cleanupThemeManager,
} from "../../helpers/_module.mjs";
import { Logger } from "../../services/_module.mjs";

/**
 * Application for displaying combat power information including roll formulas and prerequisites.
 * @extends {EventidePopupHelpers}
 */
export class CombatPowerPopup extends EventidePopupHelpers {
  /** @override */
  static PARTS = {
    combatPowerPopup: {
      template:
        "systems/eventide-rp-system/templates/macros/popups/combat-power-popup.hbs",
    },
  };

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: [
      "eventide-sheet",
      "eventide-sheet--scrollbars",
      "combat-power-popup",
    ],
    position: {
      width: 600, // Slightly wider to accommodate roll formulas
      height: "auto",
    },
    window: {
      icon: "fa-solid fa-dice-d20",
    },
    form: {
      handler: this.#onSubmit,
    },
  };

  /**
   * Get the localized window title
   * @returns {string} The localized window title
   */
  get title() {
    return game.i18n.format("EVENTIDE_RP_SYSTEM.WindowTitles.CombatPowerPopup");
  }

  constructor({ item }) {
    super({ item });
    this.type = "power";
  }

  /**
   * Handle rendering of the combat power popup application
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
   * Handle the first render of the combat power popup application
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
            "Theme management initialized asynchronously for combat power popup",
            {
              hasThemeManager: !!this.themeManager,
              sheetId: this.id,
            },
            "THEME",
          );
        })
        .catch((error) => {
          Logger.error(
            "Failed to initialize theme manager for combat power popup",
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

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = CombatPowerPopup.DEFAULT_OPTIONS.classes.join(" ");

    return context;
  }

  /**
   * Handle form submission.
   * @param {Event} event - The form submission event
   * @param {HTMLElement} form - The form element
   * @private
   */
  static async #onSubmit(_event, _form, _formData) {
    const problems = await this.checkEligibility();

    if (Object.values(problems).some((value) => value)) {
      return ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.CombatPowerError"),
      );
    }

    this.item.actor.addPower(-this.item.system.cost);

    // Send to chat
    erps.messages.createCombatPowerMessage(this.item);
    this.close();
  }
}
