const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Application for managing resource restoration of targeted tokens.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class RestoreTarget extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static PARTS = {
    restoreTarget: {
      template: `systems/eventide-rp-system/templates/macros/restore-target.hbs`,
    },
  };

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "restore-target",
    classes: ["eventide-rp-system", "standard-form", "restore-target"],
    position: {
      width: 320,
      height: "auto",
    },
    tag: "form",
    window: {
      title: "Restore Target",
      icon: "fa-solid fa-notes-medical",
    },
    form: {
      handler: this.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  /** @type {ActiveEffect[]} Array of status effects */
  static statusEffects = [];

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
   * @returns {Promise<Object>} The prepared context containing target and status information
   * @throws {Error} If no target is selected or multiple targets are selected
   */
  async _prepareContext(options) {
    if (!game.user?.isGM) {
      ui.notifications.error(
        "Only GMs can restore actor resources and remove status effects."
      );
      this.close();
      return;
    }
    const context = {};

    const targetTokens = await erps.utils.getTargetArray();
    context.cssClass = RestoreTarget.DEFAULT_OPTIONS.classes.join(" ");
    if (targetTokens.length === 0) {
      ui.notifications.error(`Please target a token first!`);
      this.close();
    } else if (targetTokens.length > 1) {
      ui.notifications.error(`You can only target one token at a time!`);
      this.close();
    }

    context.actor = targetTokens[0].actor;
    context.statusEffects = context.actor?.items?.filter(
      (item) => item?.type === "status"
    );

    this.statusEffects = context.statusEffects;

    context.defaultOptions = {
      restoreResolve: true,
      restorePower: true,
    };

    return context;
  }

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    frame.autocomplete = "off";
    return frame;
  }

  /**
   * Handle form submission to restore resources and remove status effects.
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormData} formData - The form data
   * @private
   */
  static async #onSubmit(event, form, formData) {
    const targetArray = await erps.utils.getTargetArray();
    const actor = targetArray[0].actor;

    const selectedStatuses = this.statusEffects?.filter(
      (status) => form[status?.id]?.checked
    );
    const restoreOptions = {
      resolve: form.restoreResolve?.checked,
      power: form.restorePower?.checked,
      all: form.all?.checked,
      statuses: selectedStatuses,
    };

    await actor?.restore(restoreOptions);
  }
}
