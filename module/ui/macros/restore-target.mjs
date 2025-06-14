import { EventideSheetHelpers } from "../components/_module.mjs";
import {
  initThemeManager,
  THEME_PRESETS,
  cleanupThemeManager,
  applyThemeImmediate,
} from "../../helpers/_module.mjs";
import { Logger } from "../../services/_module.mjs";
/**
 * Application for managing resource restoration of targeted tokens.
 * @extends {EventideSheetHelpers}
 */
export class RestoreTarget extends EventideSheetHelpers {
  /** @override */
  static PARTS = {
    restoreTarget: {
      template: `systems/eventide-rp-system/templates/macros/restore-target.hbs`,
    },
  };

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "restore-target",
    classes: ["eventide-sheet", "eventide-sheet--scrollbars", "restore-target"],
    position: {
      width: 320,
      height: "auto",
    },
    tag: "form",
    window: {
      icon: "fa-solid fa-notes-medical",
    },
    form: {
      handler: this.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  /**
   * Get the localized window title
   * @returns {string} The localized window title
   */
  get title() {
    return game.i18n.format("EVENTIDE_RP_SYSTEM.WindowTitles.RestoreTarget");
  }

  /**
   * Prepare the main context data for restoring target.
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context containing target and status information
   * @throws {Error} If no target is selected or multiple targets are selected
   */
  async _prepareContext(_options) {
    await EventideSheetHelpers._gmCheck();
    const context = {};

    this.targetTokens = await erps.utils.getTargetArray();
    context.cssClass = RestoreTarget.DEFAULT_OPTIONS.classes.join(" ");
    if (this.targetTokens.length === 0) {
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.TargetFirst"),
      );
      this.close();
    } else if (this.targetTokens.length > 1) {
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.SingleTargetOnly"),
      );
      this.close();
    }

    context.actor = this.targetTokens[0].actor;
    context.statusEffects = context.actor?.items?.filter(
      (item) => item?.type === "status",
    );

    this.statusEffects = context.statusEffects;

    context.defaultOptions = {
      restoreResolve: true,
      restorePower: true,
    };

    context.footerButtons = [
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Restore"),
        type: "submit",
        cssClass: "erps-button erps-button--primary",
      },
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Close"),
        type: "button",
        cssClass: "erps-button",
        action: "close",
      },
    ];

    return context;
  }

  /**
   * Handle rendering of the restore target application
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
   * Handle the first render of the restore target application
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
            "Theme management initialized asynchronously for restore target",
            {
              hasThemeManager: !!this.themeManager,
              sheetId: this.id,
            },
            "THEME",
          );
        })
        .catch((error) => {
          Logger.error(
            "Failed to initialize theme manager for restore target",
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

    // Clear references to arrays and objects
    this.targetTokens = null;
    this.statusEffects = null;

    await super._preClose(options);
  }

  /**
   * Handle form submission to restore resources and remove status effects.
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormData} formData - The form data
   * @private
   */
  static async #onSubmit(event, form, formData) {
    const actor = this.targetTokens[0].actor;

    const selectedStatuses = this.statusEffects?.filter((status) => {
      const value = formData.get(status.id);
      return value === "on" || value === "true" || value === true;
    });

    const restoreOptions = {
      resolve: formData.get("restoreResolve") === "true",
      power: formData.get("restorePower") === "true",
      all: formData.get("all") === "true",
      statuses: selectedStatuses,
    };

    await actor?.restore(restoreOptions);
  }
}
