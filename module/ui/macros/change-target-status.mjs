import { EventideSheetHelpers } from "../components/_module.mjs";
import { Logger } from "../../services/_module.mjs";

/**
 * A form application for changing status effects on a target token.
 * @extends {EventideSheetHelpers}
 */
export class ChangeTargetStatus extends EventideSheetHelpers {
  /**
   * Define the template parts used by this application
   * @type {Object}
   */
  static PARTS = {
    changeTargetStatus: {
      template: `systems/eventide-rp-system/templates/macros/change-target-status.hbs`,
    },
  };

  /**
   * Default options for this application
   * @type {Object}
   */
  static DEFAULT_OPTIONS = {
    id: "change-target-status",
    classes: ["eventide-rp-system", "standard-form", "change-target-status"],
    position: {
      width: 500,
      height: "auto",
    },
    tag: "form",
    window: {
      icon: "fa-regular fa-atom-simple",
    },
    form: {
      handler: this._onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      onStore: this._onStore,
    },
  };

  /**
   * Keys used for storing form values in browser local storage
   * @type {string[]}
   */
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
   * Get the localized window title
   * @returns {string} The localized window title
   */
  get title() {
    return game.i18n.format(
      "EVENTIDE_RP_SYSTEM.WindowTitles.ChangeTargetStatus",
    );
  }

  /**
   * @constructor
   * @param {Object} options - Application options
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * Clean up number inputs before closing the application
   * @param {Object} options - The options for closing
   * @returns {Promise<void>}
   * @override
   */
  async _preClose(options) {
    if (this.element) {
      erps.utils.cleanupNumberInputs(this.element);
    }
    await super._preClose(options);
  }

  /**
   * Prepares the main context data for the changing status.
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context containing target and status information
   * @throws {Error} If no target is selected or multiple targets are selected
   */
  async _prepareContext(_options) {
    const context = {};

    this.targetArray = await erps.utils.getTargetArray();

    this.modes = {
      add: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Modifications.AddMode"),
      subtract: game.i18n.localize(
        "EVENTIDE_RP_SYSTEM.Forms.Modifications.SubtractMode",
      ),
      intensify: game.i18n.localize(
        "EVENTIDE_RP_SYSTEM.Forms.Modifications.IntensifyMode",
      ),
      weaken: game.i18n.localize(
        "EVENTIDE_RP_SYSTEM.Forms.Modifications.WeakenMode",
      ),
    };

    if (this.targetArray.length === 0) {
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.TargetFirst"),
      );
      this.close();
    } else if (this.targetArray.length > 1) {
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.SingleTargetOnly"),
      );
      this.close();
    }

    this.target = this.targetArray[0];
    context.target = this.target;
    context.modes = this.modes;

    context.cssClass = ChangeTargetStatus.DEFAULT_OPTIONS.classes.join(" ");

    context.statuses = this.target.actor.items.filter(
      (item) => item.type === "status",
    );

    context.storageKeys = ChangeTargetStatus.storageKeys;

    context.storedData = await erps.utils.retrieveMultipleUserFlags(
      context.storageKeys,
    );
    context.callouts = [
      {
        type: "information",
        faIcon: "fas fa-info-circle",
        text: game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Forms.ScriptExplanations.ChangeTargetStatus",
        ),
      },
    ];

    context.footerButtons = [
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Change"),
        type: "submit",
        cssClass: "base-form__button base-form__button--primary",
      },
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Store"),
        type: "button",
        cssClass: "base-form__button",
        action: "onStore",
      },
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Close"),
        type: "button",
        cssClass: "base-form__button",
        action: "close",
      },
    ];

    return context;
  }

  /**
   * Store the current form values in browser local storage
   * @async
   * @returns {Promise<void>}
   * @private
   */
  async _store() {
    const formData = new foundry.applications.ux.FormDataExtended(this.form);
    const statusId = formData.get("statusSelector");

    if (!statusId) {
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.MissingStatus"),
      );
      return;
    }
    const adjustmentChange = formData.get("adjustmentChange");
    const overrideChange = formData.get("overrideChange");
    const advantageChange = formData.get("advantageChange");
    const disadvantageChange = formData.get("disadvantageChange");
    const adjustmentMode = formData.get("adjustmentMode");
    const overrideMode = formData.get("overrideMode");
    const advantageMode = formData.get("advantageMode");
    const disadvantageMode = formData.get("disadvantageMode");

    const storageObject = {
      changeTargetStatus_statusSelector: statusId,
      changeTargetStatus_adjustmentChange: adjustmentChange,
      changeTargetStatus_overrideChange: overrideChange,
      changeTargetStatus_advantageChange: advantageChange,
      changeTargetStatus_disadvantageChange: disadvantageChange,
      changeTargetStatus_adjustmentMode: adjustmentMode,
      changeTargetStatus_overrideMode: overrideMode,
      changeTargetStatus_advantageMode: advantageMode,
      changeTargetStatus_disadvantageMode: disadvantageMode,
    };

    await erps.utils.storeMultipleUserFlags(storageObject);

    ui.notifications.info(
      game.i18n.format("EVENTIDE_RP_SYSTEM.Info.Stored", {
        keyType: "status update",
      }),
    );
    this.close();
  }

  /**
   * Static handler for the store action
   * @async
   * @returns {Promise<void>}
   * @private
   */
  static async _onStore() {
    this._store();
  }

  /**
   * Process the form inputs and update the status effect values
   * @async
   * @param {ChangeTargetStatus} instance - The instance of the application
   * @param {Object} inputs - The processed form inputs
   * @param {string} inputs.statusSelector - The ID of the selected status
   * @param {Object} inputs.adjustment - Adjustment values for regular modifiers
   * @param {string} inputs.adjustment.change - The amount to change
   * @param {string} inputs.adjustment.mode - The mode of change (add, subtract, intensify, weaken)
   * @param {Object} inputs.override - Adjustment values for override modifiers
   * @param {Object} inputs.advantage - Adjustment values for advantage dice
   * @param {Object} inputs.disadvantage - Adjustment values for disadvantage dice
   * @returns {Promise<void>}
   * @private
   */
  static async _process(instance, inputs) {
    const status = instance.target.actor.items.get(inputs.statusSelector);
    if (!status) {
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.MissingStatus"),
      );
      return;
    }
    const effects = status.effects.contents[0].changes;
    if (!effects) {
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.NoStatusEffects"),
      );
      return;
    }
    const old = {
      adjustments: [],
      overrides: [],
      advantages: [],
      disadvantages: [],
    };
    const updateData = [];

    const addMode = (current, change) => {
      const newValue = Number(current.value) + Math.abs(change);
      updateData.push({
        ...current,
        value: newValue,
      });
    };

    const subtractMode = (current, change) => {
      const newValue = Number(current.value) - Math.abs(change);
      updateData.push({
        ...current,
        value: newValue,
      });
    };

    const intensifyMode = (current, change) => {
      let newValue = 0;
      if (Number(current.value) > 0) {
        newValue = Number(current.value) + Math.abs(change);
      } else if (Number(current.value) < 0) {
        newValue = Number(current.value) - Math.abs(change);
      }
      updateData.push({
        ...current,
        value: newValue,
      });
    };

    const weakenMode = (current, change) => {
      let newValue = 0;
      if (Number(current.value) > 0) {
        newValue = Math.max(Number(current.value) - Math.abs(change), 1);
      } else if (Number(current.value) < 0) {
        newValue = Math.min(Number(current.value) + Math.abs(change), -1);
      }
      updateData.push({
        ...current,
        value: newValue,
      });
    };

    for (const effect of effects) {
      switch (effect.key.split(".")[3]) {
        case "change":
          old.adjustments.push(effect);
          break;
        case "override":
          old.overrides.push(effect);
          break;
        case "diceAdjustments":
          if (effect.key.split(".")[4] === "advantage") {
            old.advantages.push(effect);
          } else {
            old.disadvantages.push(effect);
          }
          break;
      }
    }

    // Process each category in the old object
    const categoryMap = {
      adjustments: "adjustment",
      overrides: "override",
      advantages: "advantage",
      disadvantages: "disadvantage",
    };

    // Process each category in the old object
    for (const [category, items] of Object.entries(old)) {
      const inputKey = categoryMap[category];
      const categoryInput = inputs[inputKey];

      if (Array.isArray(items) && items.length > 0 && categoryInput) {
        for (const item of items) {
          // Apply the appropriate mode function based on the input mode
          switch (categoryInput.mode) {
            case "add":
              addMode(item, categoryInput.change);
              break;
            case "subtract":
              subtractMode(item, categoryInput.change);
              break;
            case "intensify":
              intensifyMode(item, categoryInput.change);
              break;
            case "weaken":
              weakenMode(item, categoryInput.change);
              break;
          }
        }
      }
    }

    await status.updateEmbeddedDocuments("ActiveEffect", [
      { _id: status.effects.contents[0]._id, changes: updateData },
    ]);

    Hooks.call("erpsUpdateItem", status, {}, {}, game.user.id);
    instance._store();
  }

  /**
   * Handles form submission to update status effect values.
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormData} formData - The form data
   * @private
   */
  static async _onSubmit(event, form, formData) {
    Logger.debug(
      "Processing status change form submission",
      {
        statusSelector: formData.get("statusSelector"),
        adjustmentChange: formData.get("adjustmentChange"),
        adjustmentMode: formData.get("adjustmentMode"),
      },
      "CHANGE_TARGET_STATUS",
    );

    const inputs = {
      statusSelector: formData.get("statusSelector"),
      adjustment: {
        change: formData.get("adjustmentChange"),
        mode: formData.get("adjustmentMode"),
      },
      override: {
        change: formData.get("overrideChange"),
        mode: formData.get("overrideMode"),
      },
      advantage: {
        change: formData.get("advantageChange"),
        mode: formData.get("advantageMode"),
      },
      disadvantage: {
        change: formData.get("disadvantageChange"),
        mode: formData.get("disadvantageMode"),
      },
    };

    await ChangeTargetStatus._process(this, inputs);
  }
}
