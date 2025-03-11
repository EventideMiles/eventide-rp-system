import { EventideSheetHelpers } from "./base/eventide-sheet-helpers.mjs";

/**
 * Application for managing resource restoration of targeted tokens.
 * @extends {EventideSheetHelpers}
 */
export class RestoreTarget extends EventideSheetHelpers {
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

    this.targetTokens = await erps.utils.getTargetArray();
    context.cssClass = RestoreTarget.DEFAULT_OPTIONS.classes.join(" ");
    if (this.targetTokens.length === 0) {
      ui.notifications.error(`Please target a token first!`);
      this.close();
    } else if (this.targetTokens.length > 1) {
      ui.notifications.error(`You can only target one token at a time!`);
      this.close();
    }

    context.actor = this.targetTokens[0].actor;
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

  /**
   * Handle form submission to restore resources and remove status effects.
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormData} formData - The form data
   * @private
   */
  static async #onSubmit(event, form, formData) {
    const actor = this.targetTokens[0].actor;

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
