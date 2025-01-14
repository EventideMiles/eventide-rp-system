const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class RestoreTarget extends HandlebarsApplicationMixin(ApplicationV2) {
  static PARTS = {
    restoreTarget: {
      template: `systems/eventide-rp-system/templates/macros/restore-target.hbs`,
    },
  };

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

  static statusEffects = [];

  async _preparePartContext(partId, context, options) {
    context.partId = `${this.id}-${partId}`;
    return context;
  }

  async _prepareContext(options) {
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

    const actor = targetTokens[0].actor;
    context.statusEffects = actor?.items?.filter(
      (item) => item?.type === "status"
    );

    this.statusEffects = context.statusEffects;

    context.defaultOptions = {
      restoreResolve: true,
      restorePower: true,
    };

    return context;
  }

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
