import { EventidePopupHelpers } from "../base/eventide-popup-helpers.mjs";

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
    classes: ["eventide-rp-system", "standard-form", "combat-power-popup"],
    position: {
      width: 500, // Slightly wider to accommodate roll formulas
      height: "auto",
    },
    window: {
      title: "Combat Power Details",
      icon: "fa-solid fa-dice-d20",
    },
    form: {
      handler: this.#onSubmit,
    },
  };

  constructor({ item }) {
    super({ item });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.cssClass = CombatPowerPopup.DEFAULT_OPTIONS.classes.join(" ");
    context.problems = await CombatPowerPopup.#checkEligibility(this.item);

    return context;
  }

  static async #checkEligibility(item) {
    const problems = {
      targeting: false,
      power: false,
    };
    if (item.system.targeted) {
      const targetArray = await erps.utils.getTargetArray();
      if (targetArray.length === 0) problems.targeting = true;
    }

    if (item.system.cost > item.actor.system.power.value) problems.power = true;

    return problems;
  }

  /**
   * Handle form submission.
   * @param {Event} event - The form submission event
   * @param {FormData} formData - The form data
   * @param {HTMLElement} form - The form element
   * @private
   */
  static async #onSubmit(event, form, formData) {
    // check for problems
    const problems = await CombatPowerPopup.#checkEligibility(this.item);
    if (problems.targeting || problems.power)
      return ui.notifications.error("Cannot use Combat Power right now!");

    this.item.actor.addPower(-this.item.system.cost);

    erps.messages.combatPowerMessage(this.item);
    this.close();
  }
}
