const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Application for managing damage to targeted tokens.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class PrerequisitePopup extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  /** @override */
  static PARTS = {
    prerequisitePopup: {
      template:
        "systems/eventide-rp-system/templates/macros/prerequisite-popup.hbs",
    },
  };

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "prerequisite-popup",
    classes: ["eventide-rp-system", "standard-form", "prerequisite-popup"],
    position: {
      width: 400,
      height: "auto",
    },
    tag: "form",
    window: {
      title: "Prerequisites Met?",
      icon: "fa-solid fa-square-question",
    },
    form: {
      handler: this.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
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
    return context;
  }

  /**
   * Prepare the main context data for the form.
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context
   */
  async _prepareContext(options) {
    const context = {};

    context.prerequisites = this.item.system.prerequisites;

    if (!context.prerequisites || context.prerequisites === "") {
      this.earlySubmit();
    }
    return context;
  }

  earlySubmit() {
    console.log(this);
    this.item.actor.addPower(-this.item.system.cost);

    erps.messages.combatPowerMessage(this.item);
    this.close();
  }

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    frame.autocomplete = "off";
    return frame;
  }

  /**
   * Handle form submission to apply damage to targets.
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormData} formData - The form data
   * @private
   */
  static async #onSubmit() {
    console.log(this);
    this.item.actor.addPower(-this.item.system.cost);

    erps.messages.combatPowerMessage(this.item);
    this.close();
  }
}
