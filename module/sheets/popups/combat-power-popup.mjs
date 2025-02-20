const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Application for displaying combat power information including roll formulas and prerequisites.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class CombatPowerPopup extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  /** @override */
  static PARTS = {
    combatPowerPopup: {
      template:
        "systems/eventide-rp-system/templates/macros/popups/combat-power-popup.hbs",
    },
  };

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "combat-power-popup",
    classes: ["eventide-rp-system", "standard-form", "combat-power-popup"],
    position: {
      width: 500, // Slightly wider to accommodate roll formulas
      height: "auto",
    },
    tag: "form",
    window: {
      title: "Combat Power Details",
      icon: "fa-solid fa-dice-d20",
    },
    form: {
      handler: this.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      close: CombatPowerPopup.close,
    },
  };

  constructor({ item }) {
    super();
    this.item = item;
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
    context.problems = await CombatPowerPopup.#checkEligibility(this.item);

    return context;
  }

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    frame.autocomplete = "off";
    return frame;
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
  static async #onSubmit(event, formData, form) {
    // check for problems
    const problems = await CombatPowerPopup.#checkEligibility(this.item);
    if (problems.targeting || problems.power)
      return ui.notifications.error("Cannot use Combat Power right now!");

    this.item.actor.addPower(-this.item.system.cost);

    erps.messages.combatPowerMessage(this.item);
    this.close();
  }

  static close() {
    this.close();
  }
}
