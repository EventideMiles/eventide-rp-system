const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Application for managing damage to targeted tokens.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class StatusPopup extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static PARTS = {
    statusPopup: {
      template: "systems/eventide-rp-system/templates/macros/status-popup.hbs",
    },
  };

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "status-popup",
    classes: ["eventide-rp-system", "standard-form", "status-popup"],
    position: {
      width: 400,
      height: "auto",
    },
    tag: "form",
    window: {
      title: "Status Information",
      icon: "fa-solid fa-info-circle",
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

    context.item = this.item;
    return context;
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
    this.close();
  }
}
