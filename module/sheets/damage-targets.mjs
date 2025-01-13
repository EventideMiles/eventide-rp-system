const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class damageTargets extends HandlebarsApplicationMixin(ApplicationV2) {
  static PARTS = {
    damageTargets: {
      template:
        "systems/eventide-rp-system/templates/macros/damage-targets.hbs",
    },
  };

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
      store: damageTargets.store,
    },
  };

  constructor(number = 0) {
    super(damageTargets.DEFAULT_OPTIONS, damageTargets.PARTS);
    this.number = Math.floor(number);
  }

  static targetArray = [];

  static storageKeys = [];

  async _prepareContext(options) {
    const context = {};

    this.storageKeys = [
      `damage_${this.number}_label`,
      `damage_${this.number}_description`,
      `damage_${this.number}_formula`,
      `damage_${this.number}_isHeal`,
    ];

    context.cssClass = damageTargets.DEFAULT_OPTIONS.classes.join(" ");
    context.storageKeys = this.storageKeys;
    context.storedData = await game.erps.retrieveLocal(context.storageKeys);
    context.targetArray = await game.erps.getTargetArray();

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

  static async store(event, target) {
    damageTargets.#storeData(this, target.form);

    this.close();
  }

  static async #storeData(instance, form) {
    const storageObject = {
      [instance.storageKeys[0]]: form.label.value,
      [instance.storageKeys[1]]: form.description.value,
      [instance.storageKeys[2]]: form.formula.value,
      [instance.storageKeys[3]]: form.isHeal.checked,
    };
    await game.erps.storeLocal(storageObject);
  }

  static async #onSubmit(event, form, formData) {
    console.log(this.storageKeys);

    const damageOptions = {
      label: form.label.value || "Damage",
      formula: form.formula.value || "1",
      description: form.description.value || "",
      type: form.isHeal.checked ? "heal" : "damage",
    };
    await Promise.all(
      this.targetArray.map((token) => token.actor.damageResolve(damageOptions))
    );

    damageTargets.#storeData(this, form);
  }
}
