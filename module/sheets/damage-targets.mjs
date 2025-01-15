const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Application for managing damage to targeted tokens.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class DamageTargets extends HandlebarsApplicationMixin(ApplicationV2) {
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
      width: 640,
      height: 375,
    },
    tag: "form",
    window: {
      title: "Damage Targets",
      icon: "fa-solid fa-claw-marks",
    },
    form: {
      handler: this.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      store: DamageTargets.store,
    },
  };

  /**
   * @constructor
   * @param {number} [number=0] - Damage instance number for multiple damage applications
   */
  constructor(number = 0) {
    super(DamageTargets.DEFAULT_OPTIONS, DamageTargets.PARTS);
    this.number = Math.floor(number);
  }

  /** @type {Token[]} Array of targeted tokens */
  static targetArray = [];

  /** @type {string[]} Keys for storing damage preferences */
  static storageKeys = [];

  /**
   * Prepare context data for a specific part of the form.
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
   * Prepare the main context data for the form.
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context
   */
  async _prepareContext(options) {
    const context = {};

    this.storageKeys = [
      `damage_${this.number}_label`,
      `damage_${this.number}_description`,
      `damage_${this.number}_formula`,
      `damage_${this.number}_isHeal`,
    ];

    context.cssClass = DamageTargets.DEFAULT_OPTIONS.classes.join(" ");
    context.storageKeys = this.storageKeys;
    context.storedData = erps.utils.retrieveLocal(context.storageKeys);
    context.targetArray = erps.utils.getTargetArray();

    this.targetArray = context.targetArray;

    if (
      context.storedData[this.storageKeys[3]] === null ||
      context.storedData[this.storageKeys[3]] === "false"
    ) {
      context.heal = false;
    } else {
      context.heal = true;
    }

    if (context.targetArray.length === 0) {
      ui.notifications.error(`Please target a token first!`);
      return this.close();
    }

    return context;
  }

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    frame.autocomplete = "off";
    return frame;
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
    };
    await Promise.all(
      this.targetArray.map((token) => token.actor.damageResolve(damageOptions))
    );

    DamageTargets.#storeData(this, form);
  }

  /**
   * Store damage preferences in local storage.
   * @param {Event} event - The triggering event
   * @param {HTMLElement} target - The target element
   * @static
   */
  static async store(event, target) {
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
    erps.utils.storeLocal(storageObject);
  }
}
