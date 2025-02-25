const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * A form application for creating and managing status effects and features.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class EffectCreator extends HandlebarsApplicationMixin(ApplicationV2) {
  static PARTS = {
    effectCreator: {
      template:
        "/systems/eventide-rp-system/templates/macros/effect-creator.hbs",
    },
  };

  static DEFAULT_OPTIONS = {
    id: "effect-creator",
    classes: ["eventide-rp-system", "standard-form", "effect-creator"],
    position: {
      width: 640,
      height: 600,
    },
    tag: "form",
    window: {
      title: "Effect Creator",
      icon: "fa-solid fa-message-plus",
    },
    form: {
      handler: this.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      onEditImage: this._onEditImage,
    },
  };

  static abilities = ["Acro", "Phys", "Fort", "Will", "Wits"];
  static hiddenAbilities = ["Dice", "Cmin", "Cmax", "Fmin", "Fmax"];

  constructor({ advanced = false, number = 0 } = {}) {
    super();
    this.number = Math.floor(number);
    this.storageKeys = [
      `effect_${this.number}_img`,
      `effect_${this.number}_bgColor`,
      `effect_${this.number}_textColor`,
      `effect_${this.number}_iconTint`,
      `effect_${this.number}_type`,
    ];
    if (advanced) {
      this.hiddenAbilities = [...EffectCreator.hiddenAbilities];
    } else {
      this.hiddenAbilities = EffectCreator.hiddenAbilities.filter(
        (ability) => ability !== "Cmax" && ability !== "Fmin"
      );
    }
  }

  async _preparePartContext(partId, context, options) {
    context.partId = `${this.id}-${partId}`;
    return context;
  }

  /**
   * Prepares the main context data for the form.
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context containing abilities, stored preferences, and target information
   */
  async _prepareContext(options) {
    const context = {};

    context.cssClass = EffectCreator.DEFAULT_OPTIONS.classes.join(" ");
    context.abilities = EffectCreator.abilities;
    context.hiddenAbilities = this.hiddenAbilities;
    context.targetArray = await erps.utils.getTargetArray();

    if (context.targetArray.length === 0)
      ui.notifications.warn(
        `If you proceed status will only be created in compendium: not applied.`
      );

    const storedData = await erps.utils.retrieveLocal(this.storageKeys);

    context.storedData = {
      effect_img: storedData[this.storageKeys[0]] || "icons/svg/stoned.svg",
      effect_bgColor: storedData[this.storageKeys[1]],
      effect_textColor: storedData[this.storageKeys[2]],
      effect_iconTint: storedData[this.storageKeys[3]],
      effect_type: storedData[this.storageKeys[4]] || "status",
    };

    context.returnedData = context.storedData.img;
    return context;
  }

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    frame.autocomplete = "off";
    return frame;
  }

  /**
   * Handle changing the status image.
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-edit]
   * @returns {Promise}
   * @protected
   */
  static async _onEditImage(event, target) {
    // Clean the current path
    let currentPath = target.src;
    // Remove origin if present
    currentPath = currentPath.replace(window.location.origin, "");
    // Remove leading slash if present
    currentPath = currentPath.replace(/^\/+/, "");

    const fp = new FilePicker({
      displayMode: "tiles",
      type: "image",
      current: currentPath,
      callback: (path) => {
        // Clean the selected path
        let cleanPath = path;
        // Remove any leading slashes
        cleanPath = cleanPath.replace(/^\/+/, "");

        // Update the image source and hidden input with clean path
        target.src = cleanPath;

        // Find or create the hidden input
        let input = target.parentNode.querySelector('input[name="img"]');
        if (!input) {
          input = document.createElement("input");
          input.type = "hidden";
          input.name = "img";
          target.parentNode.appendChild(input);
        }
        input.value = cleanPath;
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    });
    return fp.browse();
  }

  /**
   * Handles form submission to create a new status effect or feature.
   * Creates the status effect or feature on targeted tokens and stores it in a compendium.
   * Also saves form preferences to local storage.
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormData} formData - The form data
   * @private
   */
  static async #onSubmit(event, form, formData) {
    const abilities = EffectCreator.abilities;
    const hiddenAbilities = this.hiddenAbilities;

    const targetArray = await erps.utils.getTargetArray();

    let createdItem;

    const name = form.name.value;
    const description = form.description.value;
    const img = form.img.value;
    const bgColor = form.bgColor.value;
    const textColor = form.textColor.value;
    const iconTint = form.iconTint.value;
    const type = form.type.value;

    const effects = abilities
      .map((ability) => {
        const value = parseInt(form[ability.toLowerCase()].value);
        if (value === 0) return null;
        const mode = form[`${ability.toLowerCase()}-mode`].value;

        return {
          key: `system.abilities.${ability.toLowerCase()}.${
            mode === "add"
              ? "change"
              : mode === "advantage"
              ? "diceAdjustments.advantage"
              : mode === "disadvantage"
              ? "diceAdjustments.disadvantage"
              : "override"
          }`,
          mode:
            mode === "add" || mode === "advantage" || mode === "disadvantage"
              ? CONST.ACTIVE_EFFECT_MODES.ADD
              : CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: value,
          priority: 0,
        };
      })
      .filter((e) => e !== null);

    const hiddenEffects = hiddenAbilities
      .map((ability) => {
        const value = parseInt(form[ability.toLowerCase()].value);
        if (value === 0) return null;
        const mode = form[`${ability.toLowerCase()}-mode`].value;

        return {
          key: `system.hiddenAbilities.${ability.toLowerCase()}.${
            mode === "add" ? "change" : "override"
          }`,
          mode:
            mode === "add"
              ? CONST.ACTIVE_EFFECT_MODES.ADD
              : CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: value,
          priority: 0,
        };
      })
      .filter((e) => e !== null);

    const item = {
      name,
      type,
      system: {
        description,
        bgColor,
        textColor,
      },
      img,
      effects: [
        {
          _id: foundry.utils.randomID(),
          name,
          img,
          changes: [...effects, ...hiddenEffects],
          disabled: false,
          duration: {
            startTime: null,
            seconds: type === "status" ? 18000 : 0,
            combat: "",
            rounds: 0,
            turns: 0,
            startRound: 0,
            startTurn: 0,
          },
          description: description || "",
          origin: "",
          tint: iconTint,
          transfer: true,
          statuses: new Set(),
          flags: {},
        },
      ],
    };

    if (targetArray.length > 0) {
      for (const token of targetArray) {
        const actor = token.actor;
        createdItem = await actor.createEmbeddedDocuments("Item", [item]);
      }
    } else {
      createdItem = await game.items.createDocument(item);
    }

    // Store the item in the appropriate compendium, create pack if it doesn't exist
    const packId = type === "status" ? "customstatuses" : "customfeatures";
    const packLabel = type === "status" ? "Custom Statuses" : "Custom Features";

    let pack = game.packs.get(`world.${packId}`);
    if (!pack) {
      pack = await CompendiumCollection.createCompendium({
        name: packId,
        label: packLabel,
        type: "Item",
      });
    }

    if (createdItem) {
      await pack.importDocument(createdItem[0] ? createdItem[0] : createdItem);
    }

    // store the data in localStorage
    const storageObject = {
      [this.storageKeys[0]]: img,
      [this.storageKeys[1]]: bgColor,
      [this.storageKeys[2]]: textColor,
      [this.storageKeys[3]]: iconTint,
      [this.storageKeys[4]]: type,
    };

    await erps.utils.storeLocal(storageObject);
  }
}
