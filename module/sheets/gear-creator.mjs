const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * A form application for creating and managing gear items.
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class GearCreator extends HandlebarsApplicationMixin(ApplicationV2) {
  static PARTS = {
    gearCreator: {
      template: "systems/eventide-rp-system/templates/macros/gear-creator.hbs",
    },
  };

  static DEFAULT_OPTIONS = {
    id: "gear-creator",
    classes: ["eventide-rp-system", "standard-form", "gear-creator"],
    position: {
      width: 800,
      height: 800,
    },
    tag: "form",
    window: {
      title: "Gear Creator",
      icon: "fa-solid fa-sack",
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
  static rollTypes = {
    none: "None",
    roll: "Roll",
    flat: "Flat",
  };

  constructor({ advanced = false, number = 0 } = {}) {
    super();
    this.number = Math.floor(number);
    this.storageKeys = [
      `gear_${this.number}_img`,
      `gear_${this.number}_bgColor`,
      `gear_${this.number}_textColor`,
    ];
    if (advanced) {
      this.hiddenAbilities = [...GearCreator.hiddenAbilities];
    } else {
      this.hiddenAbilities = GearCreator.hiddenAbilities.filter(
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

    context.cssClass = GearCreator.DEFAULT_OPTIONS.classes.join(" ");
    context.abilities = GearCreator.abilities;
    context.hiddenAbilities = this.hiddenAbilities;
    context.rollTypes = GearCreator.rollTypes;
    context.targetArray = await erps.utils.getTargetArray();

    if (context.targetArray.length === 0) {
      ui.notifications.warn(
        `If you proceed gear will only be created in compendium: not applied.`
      );
    }

    const storedData = await erps.utils.retrieveLocal(this.storageKeys);

    context.storedData = {
      gear_img: storedData[this.storageKeys[0]] || "icons/svg/item-bag.svg",
      gear_bgColor: storedData[this.storageKeys[1]],
      gear_textColor: storedData[this.storageKeys[2]],
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
   * Handle changing the gear image.
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-edit]
   * @returns {Promise}
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
   * Handles form submission to create a new gear item.
   * Creates the gear item on targeted tokens and stores it in a compendium.
   * Also saves form preferences to local storage.
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormData} formData - The form data
   * @private
   */
  static async #onSubmit(event, form, formData) {
    try {
      event.preventDefault();

      const html = form;
      const name = html.name.value;
      if (!name) {
        ui.notifications.error("Name is required");
        return;
      }

      const description = html.description.value;
      const img = html.img.value;
      const bgColor = html.bgColor.value;
      const textColor = html.textColor.value;
      const quantity = parseInt(html.quantity.value) || 1;
      const weight = parseFloat(html.weight.value) || 0;
      const cost = parseInt(html.cost.value) || 0;
      const targeted = html.targeted.checked;

      // Roll data
      const rollType = html["roll.type"].value;
      const rollData = {
        type: rollType,
        ability:
          rollType !== "none" ? html["roll.ability"].value : "unaugmented",
        bonus:
          rollType !== "none" ? parseInt(html["roll.bonus"].value) || 0 : 0,
        diceAdjustments: {
          advantage:
            rollType === "roll"
              ? parseInt(html["roll.diceAdjustments.advantage"].value) || 0
              : 0,
          disadvantage:
            rollType === "roll"
              ? parseInt(html["roll.diceAdjustments.disadvantage"].value) || 0
              : 0,
          total: 0, // This will be calculated by the system
        },
      };

      const effects = GearCreator.abilities
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

      const hiddenEffects = this.hiddenAbilities
        .map((ability) => {
          const value = parseInt(html[ability.toLowerCase()].value);
          if (value === 0) return null;
          const mode = html[`${ability.toLowerCase()}-mode`].value;

          return {
            key: `system.abilities.${ability.toLowerCase()}.${
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

      // Save preferences to local storage
      await erps.utils.storeLocal({
        [`gear_${this.number}_img`]: img,
        [`gear_${this.number}_bgColor`]: bgColor,
        [`gear_${this.number}_textColor`]: textColor,
      });

      // Create the item data
      const itemData = {
        name,
        type: "gear",
        img: img,
        system: {
          description: description,
          bgColor: bgColor,
          textColor: textColor,
          quantity: quantity,
          weight: weight,
          cost: cost,
          targeted: targeted,
          roll: rollData,
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
              seconds: 0,
              combat: "",
              rounds: 0,
              turns: 0,
              startRound: 0,
              startTurn: 0,
            },
            description: description || "",
            origin: "",
            tint: "#ffffff",
            transfer: true,
            statuses: new Set(),
            flags: {},
          },
        ],
      };

      // Get target array
      const targetArray = await erps.utils.getTargetArray();

      // Create item in compendium
      let pack = game.packs.get("world.customgear");
      if (!pack) {
        pack = await CompendiumCollection.createCompendium({
          name: "customgear",
          label: "Custom Gear",
          type: "Item",
        });
      }

      // Create the item
      const createdItem = await Item.create(itemData, {
        pack: pack.collection,
      });

      // If we have targets, create the item on them
      if (targetArray.length > 0) {
        for (const token of targetArray) {
          const actor = token.actor;
          await actor.createEmbeddedDocuments("Item", [itemData]);
        }
        ui.notifications.info(
          `Created gear item "${name}" on ${targetArray.length} target(s) and in Custom Gear compendium`
        );
      } else {
        ui.notifications.info(
          `Created gear item "${name}" in Custom Gear compendium`
        );
      }

      this.close();
    } catch (error) {
      console.error("Error in _onSubmit:", error);
      ui.notifications.error("Failed to create gear item");
    }
  }
}
