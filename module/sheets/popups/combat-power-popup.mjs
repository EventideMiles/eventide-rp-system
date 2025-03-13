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
    context.problems = await this.checkEligibility();

    return context;
  }

  /**
   * Handle form submission.
   * @param {Event} event - The form submission event
   * @param {HTMLElement} form - The form element
   * @private
   */
  static async #onSubmit(event, form, formData) {
    const problems = await this.checkEligibility();

    if (problems.targeting || problems.power)
      return ui.notifications.error("Cannot use Combat Power right now!");

    this.item.actor.addPower(-this.item.system.cost);

    // Send to chat
    erps.messages.combatPowerMessage(this.item);
    this.close();
  }
}
