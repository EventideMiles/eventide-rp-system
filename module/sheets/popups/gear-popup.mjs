const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Application for displaying gear information including roll formulas and quantity checks.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class GearPopup extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  /** @override */
  static PARTS = {
    gearPopup: {
      template:
        "systems/eventide-rp-system/templates/macros/popups/gear-popup.hbs",
    },
  };

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "gear-popup",
    classes: ["eventide-rp-system", "standard-form", "gear-popup"],
    position: {
      width: 600,
      height: "auto",
    },
    tag: "form",
    window: {
      title: "Use Gear",
      icon: "fa-solid fa-sack",
    },
    form: {
      handler: this.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      close: GearPopup.close,
    },
  };

  constructor({ item }) {
    super();
    this.item = item;
  }

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    frame.autocomplete = "off";
    return frame;
  }

  /**
   * Prepare context data for a specific part of the form.
   * @param {string} partId - The ID of the form part
   * @param {Object} context - The context object to prepare
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} The prepared context
   */
  async _preparePartContext(partId, context, options) {
    context.partId = `${this.id}-${partId}`;
    context = await super._preparePartContext(partId, context, options);

    context.item = this.item;
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

  static close() {
    this.close();
  }
}
