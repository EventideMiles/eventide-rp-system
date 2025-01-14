const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class IncrementTargetStatus extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  static PARTS = {
    icrementTargetStatus: {
      template: `systems/eventide-rp-system/templates/macros/increment-target-status.hbs`,
    },
  };

  static DEFAULT_OPTIONS = {
    id: "increment-target-status",
    classes: ["eventide-rp-system", "standard-form", "increment-target-status"],
    position: {
      width: 320,
      height: "auto",
    },
    tag: "form",
    window: {
      title: "Increment Target Status",
      icon: "fa-solid fa-plus",
    },
    form: {
      handler: this.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  async _preparePartContext(partId, context, options) {
    context.partId = `${this.id}-${partId}`;
    return context;
  }

  async _prepareContext(options) {
    const context = {};

    const targetArray = await erps.utils.getTargetArray();

    if (targetArray.length === 0) {
      ui.notifications.error(`Please target a token first!`);
      this.close();
    } else if (targetArray.length > 1) {
      ui.notifications.error(`You can only target one token at a time!`);
      this.close();
    }

    this.target = targetArray[0];
    context.target = this.target;

    context.cssClass = IncrementTargetStatus.DEFAULT_OPTIONS.classes.join(" ");

    context.statuses = this.target.actor.items.filter(
      (item) => item.type === "status"
    );

    return context;
  }

  static async #onSubmit(event, form, formData) {
    console.log(form.statusSelector.value);
  }
}
