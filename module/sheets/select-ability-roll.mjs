import { EventideSheetHelpers } from "./base/eventide-sheet-helpers.mjs";

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
    classes: ["eventide-rp-system", "standard-form", "select-ability-roll"],
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
      game.i18n.localize(v)
    );
  }

  /**
   * Prepares the main context data for the form.
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context containing abilities
   */
  async _prepareContext(options) {
    const context = {};
    context.cssClass = SelectAbilityRoll.DEFAULT_OPTIONS.classes.join(" ");
    context.abilities = SelectAbilityRoll.abilities;

    context.footerButtons = [
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Roll"),
        type: "submit",
        cssClass: "base-form__button base-form__button--primary",
      },
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Close"),
        type: "button",
        cssClass: "base-form__button",
        action: "close",
      },
    ];
    return context;
  }

  /**
   * Get the localized window title
   * @returns {string} The localized window title
   */
  get title() {
    return game.i18n.format(
      "EVENTIDE_RP_SYSTEM.WindowTitles.SelectAbilityRoll"
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
  static async #onSubmit(event, form, formData) {
    const attributeChoice = form["attribute-choice"].value;
    const macro = game.macros.getName(attributeChoice);
    if (macro) {
      await macro.execute({ args: [] });
    } else {
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.NoMacroFound", {
          macroName: attributeChoice,
        })
      );
    }
  }
}
