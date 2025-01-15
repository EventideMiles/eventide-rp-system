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

  static storageKeys = [
    "incrementTargetStatus_statusSelector",
    "incrementTargetStatus_addChange",
    "incrementTargetStatus_overrideChange",
    "incrementTargetStatus_advantageChange",
    "incrementTargetStatus_disadvantageChange",
  ];

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

    context.storageKeys = IncrementTargetStatus.storageKeys;

    context.storedData = await erps.utils.retrieveLocal(context.storageKeys);

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
    const advantageChange = parseInt(form.advantageChange.value) || 0;
    const disadvantageChange = parseInt(form.disadvantageChange.value) || 0;

    console.log(effects.changes);

    // update the change value based on splitting the key and checking for
    // "change" in slot 3, "override" in slot 3, "advantage" in slot 4, "disadvantage" in slot 4
    const updatedChanges = effects.changes.map((change) => {
      const newChange = foundry.utils.deepClone(change);
      if (change.key.includes("disadvantage")) {
        newChange.value = parseInt(change.value) + disadvantageChange;
      } else if (change.key.includes("advantage")) {
        newChange.value = parseInt(change.value) + advantageChange;
      } else if (change.key.includes("override")) {
        newChange.value = parseInt(change.value) + overrideChange;
      } else {
        newChange.value = parseInt(change.value) + addChange;
      }

      console.log(newChange);
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

    // store data in local storage
    const storageObject = {
      incrementTargetStatus_statusSelector: form.statusSelector.value,
      incrementTargetStatus_addChange: form.addChange.value,
      incrementTargetStatus_overrideChange: form.overrideChange.value,
      incrementTargetStatus_advantageChange: form.advantageChange.value,
      incrementTargetStatus_disadvantageChange: form.disadvantageChange.value,
    };

    await erps.utils.storeLocal(storageObject);
  }
}
