const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * A form application for creating and managing status effects.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class StatusCreator extends HandlebarsApplicationMixin(ApplicationV2) {
  static PARTS = {
    statusCreator: {
      template:
        "/systems/eventide-rp-system/templates/macros/status-creator.hbs",
    },
  };

  static DEFAULT_OPTIONS = {
    id: "status-creator",
    classes: ["eventide-rp-system", "standard-form", "status-creator"],
    position: {
      width: 640,
      height: 600,
    },
    tag: "form",
    window: {
      title: "Status Creator",
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
      `status_${this.number}_img`,
      `status_${this.number}_bgColor`,
      `status_${this.number}_textColor`,
    ];
    if (advanced) {
      this.hiddenAbilities = [...StatusCreator.hiddenAbilities];
    } else {
      this.hiddenAbilities = StatusCreator.hiddenAbilities.filter(
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

    context.cssClass = StatusCreator.DEFAULT_OPTIONS.classes.join(" ");
    context.abilities = StatusCreator.abilities;
    context.hiddenAbilities = this.hiddenAbilities;
    context.targetArray = await erps.utils.getTargetArray();

    if (context.targetArray.length === 0)
      ui.notifications.warn(
        `If you proceed status will only be created in compendium: not applied.`
      );

    const storedData = await erps.utils.retrieveLocal(this.storageKeys);

    context.storedData = {
      status_img: storedData[this.storageKeys[0]],
      status_bgColor: storedData[this.storageKeys[1]],
      status_textColor: storedData[this.storageKeys[2]],
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
   * Handles form submission to create a new status effect.
   * Creates the status effect on targeted tokens and stores it in a compendium.
   * Also saves form preferences to local storage.
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormData} formData - The form data
   * @private
   */
  static async #onSubmit(event, form, formData) {
    const abilities = StatusCreator.abilities;
    const hiddenAbilities = this.hiddenAbilities;

    const targetArray = await erps.utils.getTargetArray();

    let createdItem;

    const html = form;
    const name = html.name.value;
    const description = html.description.value;
    const img = html.img.src;
    const bgColor = html.bgColor.value;
    const textColor = html.textColor.value;

    if (!name || !description || !img || !bgColor || !textColor)
      return ui.notifications.error("Missing data!");

    const effects = abilities
      .map((ability) => {
        const value = parseInt(html[ability.toLowerCase()].value);
        if (value === 0) return null;
        const mode = html[`${ability.toLowerCase()}-mode`].value;

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
        const value = parseInt(html[ability.toLowerCase()].value);
        if (value === 0) return null;
        const mode = html[`${ability.toLowerCase()}-mode`].value;

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

    const statusItem = {
      name,
      type: "status",
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
            seconds: 18000,
            combat: "",
            rounds: 0,
            turns: 0,
            startRound: 0,
            startTurn: 0,
          },
          description: description || "",
          origin: "",
          tint: bgColor,
          transfer: true,
          statuses: new Set(),
          flags: {},
        },
      ],
    };

    if (targetArray.length > 0) {
      for (const token of targetArray) {
        const actor = token.actor;
        createdItem = await actor.createEmbeddedDocuments("Item", [statusItem]);
      }
    } else {
      createdItem = await game.items.createDocument(statusItem);
    }

    // Store the status item in the compendium, create pack if it doesn't exist
    let pack = game.packs.get("world.customstatuses");
    if (!pack) {
      pack = await CompendiumCollection.createCompendium({
        name: "customstatuses",
        label: "Custom Statuses",
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
    };

    await erps.utils.storeLocal(storageObject);
  }
}
