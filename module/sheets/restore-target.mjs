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
      icon: "fa-solid fa-notes-medical",
    },
    form: {
      handler: this.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  /**
   * Get the localized window title
   * @returns {string} The localized window title
   */
  get title() {
    return game.i18n.format("EVENTIDE_RP_SYSTEM.WindowTitles.RestoreTarget");
  }

  /**
   * Prepare the main context data for the form.
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context containing target and status information
   * @throws {Error} If no target is selected or multiple targets are selected
   */
  async _prepareContext(options) {
    await EventideSheetHelpers._gmCheck();
    const context = {};

    this.targetTokens = await erps.utils.getTargetArray();
    context.cssClass = RestoreTarget.DEFAULT_OPTIONS.classes.join(" ");
    if (this.targetTokens.length === 0) {
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.TargetFirst")
      );
      this.close();
    } else if (this.targetTokens.length > 1) {
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.SingleTargetOnly")
      );
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
