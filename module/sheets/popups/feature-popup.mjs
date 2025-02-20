const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Application for displaying feature information in a popup.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class FeaturePopup extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static PARTS = {
    featurePopup: {
      template:
        "systems/eventide-rp-system/templates/macros/popups/feature-popup.hbs",
    },
  };

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "feature-popup",
    classes: ["eventide-rp-system", "standard-form", "feature-popup"],
    position: {
      width: 400,
      height: "auto",
    },
    tag: "form",
    window: {
      title: "Feature Information",
      icon: "fa-solid fa-star",
    },
    form: {
      handler: this.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      toChat: FeaturePopup.toChat,
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
    context.cssClass = FeaturePopup.DEFAULT_OPTIONS.classes.join(" ");
    context.effects = Array.from(this.item.effects);

    return context;
  }

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    frame.autocomplete = "off";
    return frame;
  }

  static async toChat() {
    erps.messages.featureMessage(this.item);
    this.close();
  }

  /**
   * Handle form submission to close the popup.
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormData} formData - The form data
   * @private
   */
  static async #onSubmit() {
    this.close();
  }
}
