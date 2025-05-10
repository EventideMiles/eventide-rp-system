import { EventideSheetHelpers } from "./base/eventide-sheet-helpers.mjs";
import { erpsSoundManager } from "../helpers/sound-manager.mjs";

/**
 * Application for managing damage to targeted tokens.
 * @extends {EventideSheetHelpers}
 */
export class DamageTargets extends EventideSheetHelpers {
  /** @override */
  static PARTS = {
    damageTargets: {
      template:
        "systems/eventide-rp-system/templates/macros/damage-targets.hbs",
    },
  };

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "damage-targets",
    classes: ["eventide-rp-system", "standard-form", "damage-targets"],
    position: {
      width: 400,
      height: "auto",
    },
    tag: "form",
    window: {
      icon: "fa-solid fa-claw-marks",
    },
    form: {
      handler: this.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      store: this.#store,
    },
  };

  /**
   * Get the localized window title
   * @returns {string} The localized window title
   */
  get title() {
    return game.i18n.format("EVENTIDE_RP_SYSTEM.WindowTitles.DamageTargets");
  }

  /**
   * @constructor
   * @param {number} [number=0] - Damage instance number for multiple damage applications
   */
  constructor(number = 0) {
    super();
    this.number = Math.floor(number);
  }

  /**
   * Prepare the main context data for the form.
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context
   */
  async _prepareContext(options) {
    this.gmCheck = await EventideSheetHelpers._gmCheck({
      playerMode: true,
    });

    this.storageKeys = [
      `damage_${this.number}_label`,
      `damage_${this.number}_description`,
      `damage_${this.number}_formula`,
      `damage_${this.number}_isHeal`,
    ];

    const context = {
      gmCheck: this.gmCheck,
      cssClass: DamageTargets.DEFAULT_OPTIONS.classes.join(" "),
      storageKeys: this.storageKeys,
    };

    context.storedData = await erps.utils.retrieveLocal(context.storageKeys);
    context.targetArray = await erps.utils.getTargetArray();
    context.selectedArray = await erps.utils.getSelectedArray();

    this.targetArray = context.targetArray;
    this.selectedArray = context.selectedArray;

    if (
      context.storedData[this.storageKeys[3]] === null ||
      context.storedData[this.storageKeys[3]] === "false"
    ) {
      context.heal = false;
    } else {
      context.heal = true;
    }

    if (
      context.targetArray.length === 0 &&
      context.selectedArray.length === 0
    ) {
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.TargetOrSelectFirst")
      );
      return this.close();
    }

    if (context.selectedArray.length === 0 && this.gmCheck === "player") {
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.OnlyGmDamageTarget")
      );
      return this.close();
    }

    context.footerButtons = [
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Damage"),
        type: "submit",
        cssClass: "base-form__button base-form__button--primary",
      },
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Store"),
        type: "button",
        cssClass: "base-form__button",
        action: "store",
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
   * Handle form submission to apply damage to targets.
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormData} formData - The form data
   * @private
   */
  static async #onSubmit(event, form, formData) {
    const damageOptions = {
      label: form.label.value || "Damage",
      formula: form.formula.value || "1",
      description: form.description.value || "",
      type: form.isHeal.checked ? "heal" : "damage",
      soundKey: form.isHeal.checked ? "healing" : "damage",
    };
    const originalFormula = damageOptions.formula;
    if (
      (damageOptions.type === "heal" && this.selectedArray.length > 0) ||
      (this.selectedArray.length > 0 && this.targetArray.length === 0) ||
      (this.selectedArray.length > 0 && this.gmCheck === "player")
    ) {
      await Promise.all(
        this.selectedArray.map((token) => {
          damageOptions.formula =
            damageOptions.type !== "heal" &&
            token.actor.system.hiddenAbilities.vuln.total > 0
              ? `${originalFormula} + ${Math.abs(
                  token.actor.system.hiddenAbilities.vuln.total
                )}`
              : originalFormula;
          token.actor.damageResolve(damageOptions);
        })
      );
    } else {
      await Promise.all(
        this.targetArray.map((token) => {
          damageOptions.formula =
            damageOptions.type !== "heal" &&
            token.actor.system.hiddenAbilities.vuln.total > 0
              ? `${originalFormula} + ${Math.abs(
                  token.actor.system.hiddenAbilities.vuln.total
                )}`
              : originalFormula;
          token.actor.damageResolve(damageOptions);
        })
      );
    }

    DamageTargets.#storeData(this, form);
  }

  /**
   * Store damage preferences in local storage.
   * @param {Event} event - The triggering event
   * @param {HTMLElement} target - The target element
   * @static
   */
  static async #store(event, target) {
    DamageTargets.#storeData(this, target.form);

    this.close();
  }

  /**
   * Store damage preferences in local storage.
   * @param {DamageTargets} instance - The DamageTargets instance
   * @param {HTMLFormElement} form - The form element
   * @private
   */
  static async #storeData(instance, form) {
    const storageObject = {
      [instance.storageKeys[0]]: form.label.value,
      [instance.storageKeys[1]]: form.description.value,
      [instance.storageKeys[2]]: form.formula.value,
      [instance.storageKeys[3]]: form.isHeal.checked,
    };
    await erps.utils.storeLocal(storageObject);
  }
}
