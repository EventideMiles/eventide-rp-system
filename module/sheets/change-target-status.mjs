import { EventideSheetHelpers } from "./eventide-sheet-helpers.mjs";

/**
 * A form application for changing status effects on a target token.
 * @extends {EventideSheetHelpers}
 */
export class ChangeTargetStatus extends EventideSheetHelpers {
  static PARTS = {
    changeTargetStatus: {
      template: `systems/eventide-rp-system/templates/macros/change-target-status.hbs`,
    },
  };

  static DEFAULT_OPTIONS = {
    id: "change-target-status",
    classes: ["eventide-rp-system", "standard-form", "change-target-status"],
    position: {
      width: 500,
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
    "changeTargetStatus_adjustmentMode",
    "changeTargetStatus_overrideChange",
    "changeTargetStatus_overrideMode",
    "changeTargetStatus_advantageChange",
    "changeTargetStatus_advantageMode",
    "changeTargetStatus_disadvantageChange",
    "changeTargetStatus_disadvantageMode",
  ];

  /**
   * Prepares the main context data for the form.
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context containing target and status information
   * @throws {Error} If no target is selected or multiple targets are selected
   */
  async _prepareContext(options) {
    const context = {};

    this.targetArray = await erps.utils.getTargetArray();

    if (this.targetArray.length === 0) {
      ui.notifications.error(`Please target a token first!`);
      this.close();
    } else if (this.targetArray.length > 1) {
      ui.notifications.error(`You can only target one token at a time!`);
      this.close();
    }

    this.target = this.targetArray[0];
    context.target = this.target;

    context.cssClass = ChangeTargetStatus.DEFAULT_OPTIONS.classes.join(" ");

    context.statuses = this.target.actor.items.filter(
      (item) => item.type === "status"
    );

    context.storageKeys = ChangeTargetStatus.storageKeys;

    context.storedData = await erps.utils.retrieveLocal(context.storageKeys);

    return context;
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

    if (!this.target || !statusId) {
      ui.notifications.error("Missing target or status selection!");
      return;
    }

    const status = this.target.actor.items.get(statusId);
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
        form.adjustmentMode.value === "subtract"
          ? -Math.abs(form.adjustmentChange.value)
          : Math.abs(form.adjustmentChange.value)
      ) || 0;
    const overrideChange =
      parseInt(
        form.overrideMode.value === "subtract"
          ? -Math.abs(form.overrideChange.value)
          : Math.abs(form.overrideChange.value)
      ) || 0;
    const advantageChange =
      parseInt(
        form.advantageMode.value === "subtract"
          ? -Math.abs(form.advantageChange.value)
          : Math.abs(form.advantageChange.value)
      ) || 0;
    const disadvantageChange =
      parseInt(
        form.disadvantageMode.value === "subtract"
          ? -Math.abs(form.disadvantageChange.value)
          : Math.abs(form.disadvantageChange.value)
      ) || 0;

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
      changeTargetStatus_adjustmentMode: form.adjustmentMode.value,
      changeTargetStatus_overrideMode: form.overrideMode.value,
      changeTargetStatus_advantageMode: form.advantageMode.value,
      changeTargetStatus_disadvantageMode: form.disadvantageMode.value,
    };

    await erps.utils.storeLocal(storageObject);
  }
}
