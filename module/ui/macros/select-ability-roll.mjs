import { EventideSheetHelpers } from "../components/_module.mjs";
import {
  initThemeManager,
  THEME_PRESETS,
  cleanupThemeManager,
} from "../../helpers/_module.mjs";

/**
 * A form application for selecting and rolling ability checks.
 * @extends {EventideSheetHelpers}
 */
export class SelectAbilityRoll extends EventideSheetHelpers {
  static PARTS = {
    selectAbilityRoll: {
      template:
        "/systems/eventide-rp-system/templates/macros/select-ability-roll.hbs",
    },
  };

  static DEFAULT_OPTIONS = {
    id: "select-ability-roll",
    classes: [
      "eventide-sheet",
      "eventide-sheet--scrollbars",
      "select-ability-roll",
    ],
    position: {
      width: 400,
      height: "auto",
    },
    tag: "form",
    window: {
      icon: "fa-solid fa-dice-d20",
    },
    form: {
      handler: this.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  static get abilities() {
    return Object.values(CONFIG.EVENTIDE_RP_SYSTEM.abilities).map((v) =>
      game.i18n.localize(v),
    );
  }

  /**
   * Prepares the main context data for the form.
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context containing abilities
   */
  async _prepareContext(_options) {
    const context = {};
    context.cssClass = SelectAbilityRoll.DEFAULT_OPTIONS.classes.join(" ");
    context.abilities = SelectAbilityRoll.abilities;

    context.footerButtons = [
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Roll"),
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
   * Handle rendering of the select ability roll application
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
   * Handle the first render of the select ability roll application
   * @override
   * @protected
   */
  _onFirstRender() {
    super._onFirstRender();

    // Initialize theme management only on first render
    if (!this.themeManager) {
      this.themeManager = initThemeManager(
        this,
        THEME_PRESETS.CREATOR_APPLICATION,
      );
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
   * Get the localized window title
   * @returns {string} The localized window title
   */
  get title() {
    return game.i18n.format(
      "EVENTIDE_RP_SYSTEM.WindowTitles.SelectAbilityRoll",
    );
  }

  constructor(options = {}) {
    super(options);
  }

  /**
   * Handle form submission.
   * @param {Event} event - The form submission event
   * @param {HTMLElement} form - The form HTML element
   * @param {FormData} formData - The form data
   * @private
   */
  static async #onSubmit(_event, _form, formData) {
    const attributeChoice = formData.get("attribute-choice");
    const macro = game.macros.getName(attributeChoice);
    if (macro) {
      await macro.execute({ args: [] });
    } else {
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.NoMacroFound", {
          macroName: attributeChoice,
        }),
      );
    }
  }
}
