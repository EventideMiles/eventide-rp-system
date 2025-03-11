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
      title: "Select Ability Roll",
      icon: "fa-solid fa-dice-d20",
    },
    form: {
      handler: this.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  static abilities = ["Acrobatics", "Physical", "Fortitude", "Will", "Wits"];

  /**
   * Prepares the main context data for the form.
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context containing abilities
   */
  async _prepareContext(options) {
    const context = {};
    context.cssClass = SelectAbilityRoll.DEFAULT_OPTIONS.classes.join(" ");
    context.abilities = SelectAbilityRoll.abilities;
    return context;
  }

  /**
   * Handle form submission.
   * @param {Event} event - The form submission event
   * @param {HTMLElement} form - The form HTML element
   * @param {FormData} formData - The form data
   * @private
   */
  static async #onSubmit(event, form, formData) {
    event.preventDefault();
    const attributeChoice = form["attribute-choice"].value;
    const macro = game.macros.getName(attributeChoice);
    if (macro) {
      await macro.execute({ args: [] });
    } else {
      ui.notifications.error(`No macro found for ability: ${attributeChoice}`);
    }
  }
}
