const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Base class for creator applications that handle item creation
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class CreatorApplication extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: "creator-application",
    position: {
      width: 800,
      height: 800,
    },
    tag: "form",
  };

  static abilities = ["acro", "phys", "fort", "will", "wits"];
  static hiddenAbilities = ["Dice", "Cmin", "Fmax"];
  static advancedHiddenAbilities = ["Cmax", "Fmin"];
  static rollTypes = ["None", "Roll", "Flat"];
  static storageKeys = ["img", "bgColor", "textColor"];
  static effectStorageKeys = ["iconTint", "type"];

  /**
   * Initialize a new CreatorApplication
   * @param {Object} options - Configuration options
   * @param {number} [options.number=0] - Unique identifier for storage keys
   * @param {boolean} [options.advanced=false] - Whether to show advanced options
   * @param {boolean} [options.playerMode=false] - Whether this is being used by a player
   * @param {string} [options.keyType="effect"] - Type of item being created
   */
  constructor({ number = 0, advanced = false, playerMode = false, keyType = "effect" } = {}) {
    super();
    this.number = Math.floor(number);
    this.keyType = keyType;
    this.storageKeys = [
      `${keyType}_${this.number}_img`,
      `${keyType}_${this.number}_bgColor`,
      `${keyType}_${this.number}_textColor`,
    ];
    if (keyType === "effect") {
      this.storageKeys = [
        ...this.storageKeys,
        `${keyType}_${this.number}_iconTint`,
        `${keyType}_${this.number}_type`,
      ];
    }
    this.abilities = [...CreatorApplication.abilities];
    this.hiddenAbilities = [...CreatorApplication.hiddenAbilities];
    if (advanced) {
      this.hiddenAbilities = [
        ...this.hiddenAbilities,
        ...CreatorApplication.advancedHiddenAbilities,
      ];
    }
    this.rollTypes = CreatorApplication.rollTypes;
    this.playerMode = playerMode;
  }

  /**
   * Prepare context data for a specific part of the form
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
   * Render the application frame
   * @param {Object} options - Rendering options
   * @returns {Promise<HTMLElement>} The rendered frame
   */
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    frame.autocomplete = "off";
    return frame;
  }

  /**
   * Prepare the main context data for the form
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context data
   */
  async _prepareContext(options) {
    this.targetArray = await erps.utils.getTargetArray();
    this.selectedArray = await erps.utils.getSelectedArray();
    this.storedData = await erps.utils.retrieveLocal(this.storageKeys);

    const context = {
      abilities: this.abilities,
      hiddenAbilities: this.hiddenAbilities,
      rollTypes: this.rollTypes,
      playerMode: this.playerMode,
      targetArray: this.targetArray,
      selectedArray: this.selectedArray,
      };

    if (context.targetArray.length === 0 && !context.playerMode) {
      ui.notifications.warn(
        `If you proceed ${this.keyType} will only be created in compendium: not applied.`
      );
    }

    if (context.selectedArray.length === 0 && context.playerMode) {
      ui.notifications.error(`You must select a token you own to create a ${this.keyType}.`);
      this.close();
      return;
    }

    return context;
  }

  /**
   * Handle changing the gear image.
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - The capturing HTML element which defined a [data-edit]
   * @returns {Promise} The file picker browse operation
   * @protected
   */
  static async _onEditImage(event, target) {
    try {
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
        top: this.position?.top + 40 || 40,
        left: this.position?.left + 10 || 10,
      });
      return fp.browse();
    } catch (error) {
      console.error("Error in _onEditImage:", error);
      ui.notifications.error("Failed to open file picker");
    }
  }

  /**
   * Handle form submission to create an item
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormData} formData - The processed form data
   * @returns {Promise<void>}
   * @protected
   */
  static async _onSubmit(event, form, formData) {
    // declared variables
    let quantity;
    let weight;
    let cost;
    let targeted;
    let rollData;
    let hiddenEffects = [{}];

    const name = form.name.value;
    const description = form.description.value;
    const img = form.img.value;
    const bgColor = form.bgColor.value;
    const textColor = form.textColor.value;
    const type = this.keyType === "gear" ? "gear" : this.playerMode ? "feature" : form.type.value;
    const iconTint = form?.iconTint?.value || "#ffffff";

    if (this.keyType === "gear") {
      quantity = parseInt(form.quantity.value) || 1;
      weight = parseFloat(form.weight.value) || 0;
      cost = parseInt(form.cost.value) || 0;
      targeted = form.targeted.checked;
      const rollType = form["roll.type"].value;
      console.log(rollType);
      rollData = {
        type: rollType,
        ability: rollType !== "none" ? form["roll.ability"].value : "unaugmented",
        bonus: rollType !== "none" ? parseInt(form["roll.bonus"].value) || 0 : 0,
        diceAdjustments: {
          advantage: rollType === "roll" ? parseInt(form["roll.diceAdjustments.advantage"].value) || 0 : 0,
          disadvantage: rollType === "roll" ? parseInt(form["roll.diceAdjustments.disadvantage"].value) || 0 : 0,
          total: 0,
        },
      };
    }

    const effects = this.abilities.map((ability) => {
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
        mode: mode === "add" ? CONST.ACTIVE_EFFECT_MODES.ADD : CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: value,
        priority: 0,
      };
    }).filter((e) => e !== null);

    if (!this.playerMode) {
      hiddenEffects = this.hiddenAbilities.map((ability) => {
        const value = parseInt(form[ability.toLowerCase()].value);
        if (value === 0) return null;
        const mode = form[`${ability.toLowerCase()}-mode`].value;

        return {
          key: `system.hiddenAbilities.${ability.toLowerCase()}.${
            mode === "add"
              ? "change"
              : mode === "advantage"
              ? "diceAdjustments.advantage"
              : mode === "disadvantage"
              ? "diceAdjustments.disadvantage"
              : "override"
          }`,
          mode: mode === "add" ? CONST.ACTIVE_EFFECT_MODES.ADD : CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: value,
          priority: 0,
        };
      }).filter((e) => e !== null);
    }
    // Save preferences to local storage
    let storageData = {
      [`${this.keyType}_${this.number}_img`]: img,
      [`${this.keyType}_${this.number}_bgColor`]: bgColor,
      [`${this.keyType}_${this.number}_textColor`]: textColor,
    };

    if (this.keyType === "effect") {
      storageData[`${this.keyType}_${this.number}_type`] = type;
      storageData[`${this.keyType}_${this.number}_iconTint`] = iconTint;
    }

    await erps.utils.storeLocal(storageData);

    const itemData = {
      name,
      type,
      img,
      system: {
        description,
        bgColor,
        textColor,
      },
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
    
    if (this.keyType === "gear") {
      itemData.system.quantity = quantity;
      itemData.system.weight = weight;
      itemData.system.cost = cost;
      itemData.system.targeted = targeted;
      itemData.system.roll = rollData;
    }

    if (this.targetArray.length > 0) {
      for (const token of this.targetArray) {
        const actor = token.actor;
        await actor.createEmbeddedDocuments("Item", [itemData]);
      }
    } else if (this.playerMode) {
      for (const token of this.selectedArray) {
        const actor = token.actor;
        await actor.createEmbeddedDocuments("Item", [itemData]);
      }
    } else {
      await game.items.createDocument(itemData);
    }

    let packId = this.playerMode ? "player" : "custom";
    let packLabel = this.playerMode ? "Player " : "Custom";
    if (type === "gear") {
      packId += "gear";
      packLabel += "Gear";
    } else if (type === "status") {
      packId += "statuses";
      packLabel += "Statuses";
    } else if (type === "feature") {
      packId += "features";
      packLabel += "Features";
    }

    let pack = game.packs.get(`world.${packId}`);
    if (!pack) {
      pack = await CompendiumCollection.createCompendium({
        name: packId,
        label: packLabel,
        type: "Item",
      });
    }

    await Item.create(itemData, {
      pack: pack.collection,
    });

    if (this.targetArray.length > 0 && !this.playerMode) {
      ui.notifications.info(
        `Created ${type} item "${name}" on ${this.targetArray.length} target(s) and in the ${packLabel} compendium`
      );
    } else if (this.selectedArray.length > 0 && this.playerMode) {
      ui.notifications.info(
        `Created ${type} item "${name}" on ${this.selectedArray.length} selected token(s) and in the ${packLabel} compendium`
      );
    } else {
      ui.notifications.info(
        `Created ${type} item "${name}" in the ${packLabel} compendium`
      );
    }
  }
}