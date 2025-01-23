const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * A form application for changing status effects on a target token.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class ChangeTargetStatus extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  static PARTS = {
    changeTargetStatus: {
      template: `systems/eventide-rp-system/templates/macros/change-target-status.hbs`,
    },
  };

  static DEFAULT_OPTIONS = {
    id: "change-target-status",
    classes: ["eventide-rp-system", "standard-form", "change-target-status"],
    position: {
      width: 400,
      height: "auto",
    },
    tag: "form",
    window: {
      title: "Change Target Status",
      icon: "fa-regular fa-atom-simple",
    },
    form: {
      handler: this.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  static storageKeys = [
    "changeTargetStatus_statusSelector",
    "changeTargetStatus_adjustmentChange",
    "changeTargetStatus_overrideChange",
    "changeTargetStatus_advantageChange",
    "changeTargetStatus_disadvantageChange",
  ];

  constructor({ subtractMode = false } = {}) {
    super();

    this.subtractMode = subtractMode;
  }

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

    context.subtractMode = this.subtractMode;

    context.cssClass = ChangeTargetStatus.DEFAULT_OPTIONS.classes.join(" ");

    context.statuses = this.target.actor.items.filter(
      (item) => item.type === "status"
    );

    context.storageKeys = ChangeTargetStatus.storageKeys;

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
    console.log(event);
    console.log(form);
    console.log(formData);
    console.log(this);
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

    // Get the change values from the form
    const adjustmentChange =
      parseInt(
        this.subtractMode
          ? -form.adjustmentChange.value
          : form.adjustmentChange.value
      ) || 0;
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
        newChange.value = parseInt(change.value) + adjustmentChange;
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
      changeTargetStatus_statusSelector: form.statusSelector.value,
      changeTargetStatus_adjustmentChange: form.adjustmentChange.value,
      changeTargetStatus_overrideChange: form.overrideChange.value,
      changeTargetStatus_advantageChange: form.advantageChange.value,
      changeTargetStatus_disadvantageChange: form.disadvantageChange.value,
    };

    await erps.utils.storeLocal(storageObject);
  }
}
