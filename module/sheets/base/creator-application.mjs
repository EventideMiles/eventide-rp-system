import { EventideSheetHelpers } from "./eventide-sheet-helpers.mjs";

/**
 * Base class for creator applications that handle item creation
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class CreatorApplication extends EventideSheetHelpers {
  static DEFAULT_OPTIONS = {
    id: "creator-application",
    position: {
      width: 900,
      height: 800,
    },
    tag: "form",
  };

  static storageKeys = [
    "img",
    "bgColor",
    "textColor",
    "displayOnToken",
    "iconTint",
  ];
  static effectStorageKeys = ["type"];

  /**
   * Initialize a new CreatorApplication
   * @param {Object} options - Configuration options
   * @param {number} [options.number=0] - Unique identifier for storage keys
   * @param {boolean} [options.advanced=false] - Whether to show advanced options
   * @param {boolean} [options.playerMode=false] - Whether this is being used by a player
   * @param {string} [options.keyType="effect"] - Type of item being created
   */
  constructor({
    number = 0,
    advanced = false,
    playerMode = false,
    keyType = "effect",
  } = {}) {
    super();
    this.number = Math.floor(number);
    this.keyType = keyType;
    this.storageKeys = [
      `${keyType}_${this.number}_img`,
      `${keyType}_${this.number}_bgColor`,
      `${keyType}_${this.number}_textColor`,
      `${keyType}_${this.number}_iconTint`,
      `${keyType}_${this.number}_displayOnToken`,
    ];
    if (keyType === "effect") {
      this.storageKeys = [
        ...this.storageKeys,
        `${keyType}_${this.number}_type`,
      ];
    }
    this.abilities = [...EventideSheetHelpers.abilities];
    this.hiddenAbilities = [
      ...EventideSheetHelpers.playerAccessableHiddenAbilities,
    ];
    if (!playerMode) {
      this.hiddenAbilities = [
        ...this.hiddenAbilities,
        ...EventideSheetHelpers.hiddenAbilities,
      ];
    }
    if (advanced) {
      this.hiddenAbilities = [
        ...this.hiddenAbilities,
        ...EventideSheetHelpers.advancedHiddenAbilities,
      ];
    }
    this.rollTypes = EventideSheetHelpers.rollTypes;
    this.classNames = EventideSheetHelpers.classNames;
    this.playerMode = playerMode;
  }

  /**
   * Prepare the main context data for the form
   * @param {Object} options - Form options
   * @returns {Promise<Object>} The prepared context data
   */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    this.gmCheck = await EventideSheetHelpers._gmCheck({
      playerMode: this.playerMode,
    });
    this.targetArray = await erps.utils.getTargetArray();
    this.selectedArray = await erps.utils.getSelectedArray();
    this.storedData = await erps.utils.retrieveLocal(this.storageKeys);

    context.abilities = this.abilities;
    context.hiddenAbilities = this.hiddenAbilities;
    context.rollTypes = this.rollTypes;
    context.classNames = this.classNames;
    context.playerMode = this.playerMode;
    context.targetArray = this.targetArray;
    context.selectedArray = this.selectedArray;

    if (
      context.targetArray.length === 0 &&
      this.gmCheck === "gm" &&
      !this.playerMode
    ) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.CompendiumOnly", {
          keyType: this.keyType,
        })
      );
    }

    if (context.selectedArray.length === 0 && this.gmCheck === "player") {
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.PlayerSelection", {
          keyType: this.keyType,
        })
      );
      this.close();
      return;
    }

    erps.utils.initColorPickersWithHex();

    return context;
  }

  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);
    if (event.target.name === "img") {
      event.target.parentNode.querySelector(`img[name="displayImage"]`).src =
        event.target.value;
    }
  }

  /**
   * Handle changing the gear image.
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - The capturing HTML element which defined a [data-edit]
   * @returns {Promise} The file picker browse operation
   * @protected
   */
  static async _onEditImage(event, target) {
    return await super._fileHandler(event, target, "image");
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
    let className;
    let hiddenEffects = [{}];
    let cursed;
    let equipped;

    const name = form.name.value;
    const description = form.description.value;
    const img = form.img.value;
    const bgColor = form.bgColor.value;
    const textColor = form.textColor.value;
    const type =
      this.keyType === "gear"
        ? "gear"
        : this.playerMode
        ? "feature"
        : form.type.value;
    const iconTint = form?.iconTint?.value || "#ffffff";
    const displayOnToken = form?.displayOnToken?.checked || false;

    if (this.keyType === "gear") {
      quantity = parseInt(form.quantity.value) || 1;
      weight = parseFloat(form.weight.value) || 0;
      cost = parseInt(form.cost.value) || 0;
      targeted = form.targeted.checked;
      className = form.className.value;
      cursed = form?.cursed?.checked || false; // Only allowed for GM
      equipped = form.equipped.checked;
      const rollType = form["roll.type"].value;
      rollData = {
        type: rollType,
        className: className,
        ability:
          rollType !== "none" ? form["roll.ability"].value : "unaugmented",
        bonus:
          rollType !== "none" ? parseInt(form["roll.bonus"].value) || 0 : 0,
        diceAdjustments: {
          advantage:
            rollType === "roll"
              ? parseInt(form["roll.diceAdjustments.advantage"].value) || 0
              : 0,
          disadvantage:
            rollType === "roll"
              ? parseInt(form["roll.diceAdjustments.disadvantage"].value) || 0
              : 0,
          total: 0,
        },
      };
    }

    const effects = this.abilities
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

    hiddenEffects = this.hiddenAbilities
      .map((ability) => {
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
    let storageData = {
      [`${this.keyType}_${this.number}_img`]: img,
      [`${this.keyType}_${this.number}_bgColor`]: bgColor,
      [`${this.keyType}_${this.number}_textColor`]: textColor,
      [`${this.keyType}_${this.number}_iconTint`]: iconTint,
      [`${this.keyType}_${this.number}_displayOnToken`]: displayOnToken,
    };

    if (this.keyType === "effect") {
      storageData[`${this.keyType}_${this.number}_type`] = type;
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
            seconds: displayOnToken ? 18000 : 0,
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
      itemData.system.className = className;
      itemData.system.cursed = cursed;
      itemData.system.equipped = equipped;
    }

    if (this.targetArray.length > 0 && this.gmCheck === "gm") {
      await Promise.all(
        this.targetArray.map(async (token) => {
          await token.actor.createEmbeddedDocuments("Item", [itemData]);
        })
      );
    } else if (this.gmCheck === "player") {
      await Promise.all(
        this.selectedArray.map(async (token) => {
          await token.actor.createEmbeddedDocuments("Item", [itemData]);
        })
      );
    } else {
      await game.items.createDocument(itemData);
    }

    let packId = !this.playerMode ? "custom" : "player";
    let packLabel = !this.playerMode ? "Custom " : "Player ";
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
      const packData = {
        name: packId,
        label: packLabel,
        type: "Item",
      };

      if (packId.includes("player")) {
        packData.ownership = {
          PLAYER: "OWNER",
        };
      }
      pack = await CompendiumCollection.createCompendium(packData);
    }

    const item = await Item.create(itemData, {
      pack: pack.collection,
    });

    Hooks.call("erpsUpdateItem", item, {}, {}, game.user.id);

    if (this.targetArray.length > 0 && this.gmCheck === "gm") {
      ui.notifications.info(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Info.TokenItemCreated", {
          keyType: type,
          name: name,
          count: this.targetArray.length,
          targetType: "targeted",
          packLabel: packLabel,
        })
      );
    } else if (this.selectedArray.length > 0 && this.gmCheck === "player") {
      ui.notifications.info(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Info.TokenItemCreated", {
          keyType: type,
          name: name,
          count: this.selectedArray.length,
          targetType: "selected",
          packLabel: packLabel,
        })
      );
    } else {
      ui.notifications.info(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Info.CompendiumItemCreated", {
          keyType: type,
          name: name,
          packLabel: packLabel,
        })
      );
    }
  }
}
