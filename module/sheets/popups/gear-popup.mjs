import { EventidePopupHelpers } from "../base/eventide-popup-helpers.mjs";

/**
 * Application for displaying gear information including roll formulas and quantity checks.
 * @extends {EventidePopupHelpers}
 */
export class GearPopup extends EventidePopupHelpers {
  /** @override */
  static PARTS = {
    gearPopup: {
      template:
        "systems/eventide-rp-system/templates/macros/popups/gear-popup.hbs",
    },
  };

  /** @override */
  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: ["eventide-rp-system", "standard-form", "gear-popup"],
    position: {
      width: 600,
      height: "auto",
    },
    window: {
      title: "Use Gear",
      icon: "fa-solid fa-sack",
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
    context.cssClass = GearPopup.DEFAULT_OPTIONS.classes.join(" ");
    context.problems = await GearPopup.#checkEligibility(this.item);

    return context;
  }

  static async #checkEligibility(item) {
    const problems = {
      targeting: false,
      quantity: false,
    };

    if (item.system.targeted) {
      const targetArray = await erps.utils.getTargetArray();
      if (targetArray.length === 0) problems.targeting = true;
    }

    if (item.system.cost > item.system.quantity) problems.quantity = true;

    return problems;
  }

  /**
   * Handle form submission.
   * @param {Event} event - The form submission event
   * @param {FormData} formData - The form data
   * @param {HTMLElement} form - The form element
   * @private
   */
  static async #onSubmit(event, formData, form) {
    // check for problems
    const problems = await GearPopup.#checkEligibility(this.item);
    if (problems.targeting || problems.quantity)
      return ui.notifications.error("Cannot use Gear right now!");

    // Reduce quantity by cost
    this.item.addQuantity(-this.item.system.cost);

    erps.messages.combatPowerMessage(this.item);
    this.close();
  }
}
