const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * A form application for incrementing status effects on a target token.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class IncrementTargetStatus extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  static PARTS = {
    incrementTargetStatus: {
      template: `systems/eventide-rp-system/templates/macros/increment-target-status.hbs`,
    },
  };

  static DEFAULT_OPTIONS = {
    id: "increment-target-status",
    classes: ["eventide-rp-system", "standard-form", "increment-target-status"],
    position: {
      width: 500,
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

  /**
   * Prepares the context data for a specific part of the form.
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
   * Prepares the main context data for the form.
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context containing target and status information
   * @throws {Error} If no target is selected or multiple targets are selected
   */
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

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    frame.autocomplete = "off";
    return frame;
  }

  /**
   * Handles form submission to update status effect values.
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormData} formData - The form data
   * @private
   */
  static async #onSubmit(event, form, formData) {
    const statusId = form.statusSelector.value;
    const target = this.target;

    if (!target || !statusId) {
      ui.notifications.error("Missing target or status selection!");
      return;
    }

    const status = target.actor.items.get(statusId);
    if (!status) {
      ui.notifications.error("Selected status not found!");
      return;
    }

    // Get the current values from the status effects
    const effects = status.effects.contents[0];
    if (!effects) {
      ui.notifications.error("No effects found on status!");
      return;
    }

    // Get the increment values from the form
    const addChange = parseInt(form.addChange.value) || 0;
    const overrideChange = parseInt(form.overrideChange.value) || 0;

    // Update each change value in the effects based on its mode
    const updatedChanges = effects.changes.map((change) => {
      const newChange = foundry.utils.deepClone(change);
      if (change.mode === CONST.ACTIVE_EFFECT_MODES.ADD) {
        newChange.value = parseInt(change.value) + addChange;
      } else if (change.mode === CONST.ACTIVE_EFFECT_MODES.OVERRIDE) {
        newChange.value = parseInt(change.value) + overrideChange;
      }
      return newChange;
    });

    // Update the item with the modified effects
    await status.update({
      effects: [
        {
          ...effects.toObject(),
          changes: updatedChanges,
        },
      ],
    });
  }
}
