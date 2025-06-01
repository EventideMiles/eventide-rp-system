import { EventideSheetHelpers } from "./eventide-sheet-helpers.mjs";
import { Logger } from "../../services/_module.mjs";
import {
  initThemeManager,
  THEME_PRESETS,
  cleanupThemeManager,
} from "../../helpers/_module.mjs";
import { CommonFoundryTasks } from "../../utils/_module.mjs";

/**
 * Base class for creator applications that handle item creation (effects, gear, etc.)
 * This class provides common functionality for creating and managing items in the Eventide RP System.
 * It handles ability modifications, character effects, and user preferences storage.
 * @extends {EventideSheetHelpers}
 */
export class CreatorApplication extends EventideSheetHelpers {
  /**
   * Default options for the application
   * Note: The actions object maps action names to static methods, but Foundry will call them
   * with the instance as 'this' context
   * @type {Object}
   */
  static DEFAULT_OPTIONS = {
    id: "creator-application",
    classes: ["eventide-sheet", "eventide-sheet--scrollbars"],
    position: {
      width: 850,
      height: 800,
    },
    tag: "form",
    actions: {
      onAddAbility: this._onAddAbility,
      onRemoveAbility: this._onRemoveAbility,
      onEditImage: this._onEditImage,
    },
  };

  /**
   * Default storage keys for preferences
   * @type {string[]}
   */
  static storageKeys = [
    "img",
    "bgColor",
    "textColor",
    "displayOnToken",
    "iconTint",
  ];
  /**
   * Additional storage keys specific to effects
   * @type {string[]}
   */
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
    this.allAbilities = [...this.abilities, ...this.hiddenAbilities];
    this.addedAbilities = [
      {
        attribute: "acro",
        mode: "add",
        value: 0,
      },
    ];
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
    this.storedData = await erps.utils.retrieveMultipleUserFlags(
      this.storageKeys,
    );

    context.abilities = this.abilities;
    context.allAbilities = this.allAbilities;
    context.addedAbilities = this.addedAbilities;
    context.rollTypes = this.rollTypes;
    context.classNames = this.classNames;
    context.playerMode = this.playerMode;
    context.targetArray = this.targetArray;
    context.selectedArray = this.selectedArray;

    context.callouts = await this._prepareCallouts();

    context.footerButtons = await this._prepareFooterButtons();

    // Add theme context for proper theming
    context.userSheetTheme = CommonFoundryTasks.retrieveSheetTheme();

    // Add CSS class for template compatibility
    context.cssClass = "eventide-sheet eventide-sheet--scrollbars";

    return context;
  }

  /**
   * Prepare callout messages for the application based on player mode and target selection
   * These callouts provide contextual information to the user about the current state
   * @returns {Promise<Array>} Array of callout objects with type, icon, and text properties
   * @protected
   */
  async _prepareCallouts() {
    const callouts = [];

    // Special callout for GMs using player-mode creators
    if (
      this.playerMode &&
      this.gmCheck === "gm" &&
      this.targetArray.length > 0
    ) {
      callouts.push({
        type: "warning",
        faIcon: "fas fa-exclamation-triangle",
        text: game.i18n.format(
          `EVENTIDE_RP_SYSTEM.Forms.Callouts.${this.calloutGroup}.GMPlayerMode`,
          {
            targetCount: this.targetArray.length,
          },
        ),
      });
    } else if (this.playerMode) {
      callouts.push({
        type: "information",
        faIcon: "fas fa-info-circle",
        text: game.i18n.format(
          `EVENTIDE_RP_SYSTEM.Forms.Callouts.${this.calloutGroup}.PlayerMode`,
          {
            count: this.selectedArray.length,
          },
        ),
      });
    } else {
      if (this.targetArray.length === 0) {
        callouts.push({
          type: "information",
          faIcon: "fas fa-info-circle",
          text: game.i18n.format(
            `EVENTIDE_RP_SYSTEM.Forms.Callouts.${this.calloutGroup}.NoTargets`,
            {
              count: this.selectedArray.length,
            },
          ),
        });
      } else {
        callouts.push({
          type: "information",
          faIcon: "fas fa-info-circle",
          text: game.i18n.format(
            `EVENTIDE_RP_SYSTEM.Forms.Callouts.${this.calloutGroup}.WithTargets`,
            {
              count: this.targetArray.length,
            },
          ),
        });
      }
    }
    return callouts;
  }

  /**
   * Prepare the footer buttons for the application form
   * Dynamically changes the button label based on player mode and target selection
   * @returns {Promise<Array>} Array of button configuration objects
   * @protected
   */
  async _prepareFooterButtons() {
    return [
      {
        label:
          this.playerMode || this.targetArray.length > 0
            ? game.i18n.localize(
                "EVENTIDE_RP_SYSTEM.Forms.Buttons.CreateAndApply",
              )
            : game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Create"),
        type: "submit",
        cssClass: "erps-button erps-button--primary",
      },
    ];
  }

  /**
   * Actions performed after any render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   */
  _onRender(_context, _options) {
    // Initialize centralized theme management for creator applications
    if (!this.themeManager) {
      this.themeManager = initThemeManager(
        this,
        THEME_PRESETS.CREATOR_APPLICATION,
      );
    } else {
      // Re-apply themes on re-render
      this.themeManager.applyThemes();
    }
  }

  /**
   * Handle the first render of the application
   * Shows notifications based on target selection and user permissions
   * @override
   * @protected
   */
  _onFirstRender() {
    if (
      this.targetArray.length === 0 &&
      this.gmCheck === "gm" &&
      !this.playerMode
    ) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.CompendiumOnly", {
          keyType: this.keyType,
        }),
      );
    }

    if (this.selectedArray.length === 0 && this.gmCheck === "player") {
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.PlayerSelection", {
          keyType: this.keyType,
        }),
      );
      this.close();
    }
  }

  /**
   * Handle adding a new ability to the form
   * Note: Although this is a static method, Foundry calls it with the application instance as 'this'
   * @returns {Promise<void>}
   */
  static async _onAddAbility() {
    const app = this;

    const formData = CreatorApplication._saveFormData(app);

    const ability = {
      attribute: "acro",
      mode: "add",
      value: 0,
    };
    app.addedAbilities.push(ability);
    Logger.debug(
      "Added ability:",
      { abilities: app.addedAbilities },
      "CREATOR_APP",
    );

    const oldPosition = app.position.height;

    // Render the form and scroll to the previous position
    await app.render();
    CreatorApplication._restoreFormData(app, formData);
    const contentElement = app.element.querySelector(".erps-form__content");
    if (contentElement) {
      contentElement.scrollTop = oldPosition;
    }
  }

  /**
   * Handle removing an ability from the form
   * Note: Although this is a static method, Foundry calls it with the application instance as 'this'
   * @param {Event} event - The triggering event
   * @returns {Promise<void>}
   */
  static async _onRemoveAbility(event) {
    const app = this;

    const formData = CreatorApplication._saveFormData(app);

    const oldPosition = app.position.height;
    const index = event.target.dataset.index;
    app.addedAbilities.splice(index, 1);
    Logger.debug("Removed ability at index", { index }, "CREATOR_APP");
    Logger.debug(
      "Remaining abilities:",
      { abilities: app.addedAbilities },
      "CREATOR_APP",
    );

    // Render the form and restore previous scroll position
    await app.render();
    CreatorApplication._restoreFormData(app, formData);
    const contentElement = app.element.querySelector(".erps-form__content");
    if (contentElement) {
      contentElement.scrollTop = oldPosition;
    }
  }

  /**
   * Handle form field changes, updating the internal state and UI
   * Handles special cases like image updates and ability modifications
   * @param {Object} formConfig - The form configuration
   * @param {Event} event - The change event
   * @returns {Promise<void>}
   * @override
   * @protected
   */
  async _onChangeForm(formConfig, event) {
    const form = event.target.form;

    if (event.target.name === "img") {
      event.target.parentNode.querySelector(`img[name="displayImage"]`).src =
        event.target.value;
    }

    if (event.target.name.includes("addedAbilities")) {
      const index = event.target.dataset.index;

      // Get form elements for this ability
      const updateData = form.querySelectorAll(
        `[name*="addedAbilities.${index}"]`,
      );

      this.addedAbilities[index].attribute = updateData[0].value;
      this.addedAbilities[index].mode = updateData[1].value;
      this.addedAbilities[index].value = updateData[2].value;
    }
    await super._onChangeForm(formConfig, event);
  }

  /**
   * Clean up resources before the application is closed
   * @param {Object} options - The options for closing
   * @returns {Promise<void>}
   * @override
   */
  async _preClose(options) {
    // Don't clear arrays if we're in the middle of submitting
    if (!this._submitting) {
      // Clear any stored data that's no longer needed
      this.addedAbilities = null;
      this.targetArray = null;
      this.selectedArray = null;

      // Additional arrays and objects that should be nulled
      this.abilities = null;
      this.hiddenAbilities = null;
      this.allAbilities = null;
      this.storedData = null;
      this.calloutGroup = null;
    }

    // Clean up theme management
    if (this.themeManager) {
      cleanupThemeManager(this);
      this.themeManager = null;
    }

    // Call the parent class's _preClose method which will handle number input cleanup
    await super._preClose(options);
  }

  /**
   * Handle changing the gear image.
   * Note: Although this is a static method, Foundry calls it with the application instance as 'this'
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
    // Set flag to prevent clearing arrays during submission
    this._submitting = true;

    Logger.debug("FormData entries:", {}, "CREATOR_APP");
    for (const [key, value] of formData.entries()) {
      Logger.debug(`${key}: ${value}`, {}, "CREATOR_APP");
    }

    // Validate required fields
    if (!CreatorApplication._validateFormData(formData, this)) {
      this._submitting = false;
      return false;
    }

    // Extract basic data common to all item types
    const basicData = {
      name: formData.get("name"),
      description: formData.get("description"),
      img: formData.get("img"),
      bgColor: formData.get("bgColor") || "#000000",
      textColor: formData.get("textColor") || "#ffffff",
      iconTint: formData.get("iconTint") || "#ffffff",
      displayOnToken: formData.get("displayOnToken") === "true",
    };

    // Store name for later use
    const name = basicData.name;

    // Determine item type based on context
    const type =
      this.keyType === "gear"
        ? "gear"
        : this.keyType === "transformation"
          ? "transformation"
          : this.playerMode
            ? "feature"
            : formData.get("type");

    // Extract gear-specific data if applicable
    const gearData =
      type === "gear"
        ? {
            quantity: formData.get("quantity"),
            weight: formData.get("weight"),
            cost: formData.get("cost"),
            targeted: formData.get("targeted") === "true",
            className: formData.get("className"),
            cursed: this.playerMode ? false : formData.get("cursed") === "true",
            equipped: formData.get("equipped") === "true",
          }
        : {};

    // Extract transformation-specific data if applicable
    const transformationData =
      type === "transformation"
        ? {
            size: parseFloat(formData.get("size")) || 1,
            cursed: this.playerMode ? false : formData.get("cursed"),
            embeddedCombatPowers:
              this.embeddedCombatPowers?.map((power) => power.toObject()) || [],
            resolveAdjustment:
              parseFloat(formData.get("resolveAdjustment")) || 0,
            powerAdjustment: parseFloat(formData.get("powerAdjustment")) || 0,
          }
        : {};

    // Extract roll data for gear items
    const rollType = formData.get("roll.type");
    const advantageValue =
      rollType === "roll"
        ? parseInt(formData.get("roll.diceAdjustments.advantage"), 10) || 0
        : 0;
    const disadvantageValue =
      rollType === "roll"
        ? parseInt(formData.get("roll.diceAdjustments.disadvantage"), 10) || 0
        : 0;

    const rollData =
      type === "gear"
        ? {
            type: rollType,
            className: gearData.className,
            ability:
              rollType !== "none"
                ? formData.get("roll.ability")
                : "unaugmented",
            bonus:
              rollType !== "none"
                ? parseInt(formData.get("roll.bonus"), 10) || 0
                : 0,
            diceAdjustments: {
              advantage: advantageValue,
              disadvantage: disadvantageValue,
              total: advantageValue - disadvantageValue,
            },
          }
        : {};

    // Extract roll data for features
    const featureRollType = formData.get("rollType");
    const featureAdvantageValue =
      featureRollType === "roll"
        ? parseInt(formData.get("rollAdvantage"), 10) || 0
        : 0;
    const featureDisadvantageValue =
      featureRollType === "roll"
        ? parseInt(formData.get("rollDisadvantage"), 10) || 0
        : 0;
    const featureRollData =
      type === "feature"
        ? {
            type: featureRollType || "none",
            ability:
              featureRollType !== "none"
                ? formData.get("rollAbility") || "unaugmented"
                : "unaugmented",
            bonus:
              featureRollType !== "none"
                ? parseInt(formData.get("rollBonus"), 10) || 0
                : 0,
            diceAdjustments: {
              advantage: featureAdvantageValue,
              disadvantage: featureDisadvantageValue,
              total: featureAdvantageValue - featureDisadvantageValue,
            },
          }
        : {};

    // Extract targeted setting for features
    const featureTargeted =
      type === "feature" ? formData.get("rollTargeted") === "true" : false;

    // Process abilities from the instance's addedAbilities array
    // Note: It's valid to have an item with no changes
    const changes = [];

    for (const ability of this.addedAbilities) {
      const isHidden = this.hiddenAbilities.includes(ability.attribute);
      const key = `system.${isHidden ? "hiddenAbilities" : "abilities"}.${
        ability.attribute
      }.${
        ability.mode === "add"
          ? "change"
          : ability.mode === "override"
            ? "override"
            : ability.mode === "transform"
              ? "transform"
              : `diceAdjustments.${ability.mode}`
      }`;
      const mode =
        ability.mode !== "override"
          ? foundry.CONST.ACTIVE_EFFECT_MODES.ADD
          : foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE;

      changes.push({
        key,
        mode,
        value: ability.value,
      });
    }

    // Construct the item data object
    const itemData = {
      name: basicData.name,
      type,
      img: basicData.img,
      system: {
        description: basicData.description,
        ...(type !== "transformation" && {
          bgColor: basicData.bgColor,
          textColor: basicData.textColor,
        }),
        ...(type === "gear"
          ? {
              quantity: gearData.quantity,
              weight: gearData.weight,
              cost: gearData.cost,
              targeted: gearData.targeted,
              roll: rollData,
              className: gearData.className,
              cursed: gearData.cursed,
              equipped: gearData.equipped,
            }
          : type === "feature"
            ? {
                roll: featureRollData,
                targeted: featureTargeted,
              }
            : type === "transformation"
              ? {
                  size: transformationData.size,
                  cursed: transformationData.cursed,
                  embeddedCombatPowers: transformationData.embeddedCombatPowers,
                  resolveAdjustment: transformationData.resolveAdjustment,
                  powerAdjustment: transformationData.powerAdjustment,
                }
              : {}),
      },
      effects: [
        {
          _id: foundry.utils.randomID(),
          name: basicData.name,
          img: basicData.img,
          changes,
          disabled: false,
          duration: {
            startTime: null,
            seconds: basicData.displayOnToken ? 18000 : 0,
            combat: "",
            rounds: 0,
            turns: 0,
            startRound: 0,
            startTurn: 0,
          },
          description: basicData.description || "",
          origin: "",
          tint: basicData.iconTint,
          transfer: true,
          statuses: new Set(),
          flags: {},
        },
      ],
    };

    Logger.debug("Created item data:", { itemData }, "CREATOR_APP");

    // Store form values in local storage
    CreatorApplication._store(this, {
      img: basicData.img,
      bgColor: basicData.bgColor,
      textColor: basicData.textColor,
      iconTint: basicData.iconTint,
      displayOnToken: basicData.displayOnToken,
      type,
      ...(type === "feature" && {
        rollType: featureRollType,
        rollAbility: formData.get("rollAbility"),
        rollBonus: formData.get("rollBonus"),
        rollTargeted: formData.get("rollTargeted"),
        rollAdvantage: formData.get("rollAdvantage"),
        rollDisadvantage: formData.get("rollDisadvantage"),
      }),
    });

    if (this.targetArray.length > 0 && this.gmCheck === "gm") {
      await Promise.all(
        this.targetArray.map(async (token) => {
          const created = await token.actor.createEmbeddedDocuments("Item", [
            itemData,
          ]);

          if (type === "transformation") {
            token.actor.applyTransformation(created[0]);
          }
        }),
      );
    } else if (this.selectedArray.length > 0 && this.gmCheck === "player") {
      await Promise.all(
        this.selectedArray.map(async (token) => {
          await token.actor.createEmbeddedDocuments("Item", [itemData]);
        }),
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
    } else if (type === "transformation") {
      packId += "transformations";
      packLabel += "Transformations";
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
      pack =
        await foundry.documents.collections.CompendiumCollection.createCompendium(
          packData,
        );
    }

    const item = await Item.create(itemData, {
      pack: pack.collection,
    });

    Hooks.call("erpsUpdateItem", item, {}, {}, game.user.id);

    if (this.targetArray.length > 0 && this.gmCheck === "gm") {
      ui.notifications.info(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Info.TokenItemCreated", {
          keyType: type,
          name,
          count: this.targetArray.length,
          targetType: "targeted",
          packLabel,
        }),
      );
    } else if (this.selectedArray.length > 0 && this.gmCheck === "player") {
      ui.notifications.info(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Info.TokenItemCreated", {
          keyType: type,
          name,
          count: this.selectedArray.length,
          targetType: "selected",
          packLabel,
        }),
      );
    } else {
      ui.notifications.info(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Info.CompendiumItemCreated", {
          keyType: type,
          name,
          packLabel,
        }),
      );
    }

    // Clear the submitting flag
    this._submitting = false;
  }

  /**
   * Validate form data before submission
   * Checks required fields and validates numeric inputs for gear items
   * Shows appropriate error notifications to the user when validation fails
   * @param {FormData} formData - The form data to validate
   * @param {CreatorApplication} instance - The application instance
   * @returns {boolean} Whether the form data is valid
   * @protected
   */
  static _validateFormData(formData, instance) {
    // Validate name (required)
    const name = formData.get("name");
    if (!name || name.trim() === "") {
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.NameRequired"),
      );
      return false;
    }

    // Validate image (required)
    const img = formData.get("img");
    if (!img || img.trim() === "") {
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.ImageRequired"),
      );
      return false;
    }

    // For gear items, validate numeric fields
    if (instance.keyType === "gear") {
      // Quantity must be a positive number
      const quantity = formData.get("quantity");
      if (
        quantity &&
        (isNaN(parseInt(quantity, 10)) || parseInt(quantity, 10) < 0)
      ) {
        ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.InvalidQuantity"),
        );
        return false;
      }

      // Weight must be a number
      const weight = formData.get("weight");
      if (weight && isNaN(parseFloat(weight))) {
        ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.InvalidWeight"),
        );
        return false;
      }

      // Cost must be a number
      const cost = formData.get("cost");
      if (cost && isNaN(parseInt(cost, 10))) {
        ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.InvalidCost"),
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Store form values in user flags for persistence between sessions
   * @param {CreatorApplication} instance - The application instance
   * @param {Object} formValues - The form values to store
   * @protected
   */
  static _store(instance, formValues) {
    Logger.debug("Storing values:", formValues, "CREATOR_APP");

    const storageData = {
      [`${instance.keyType}_${instance.number}_img`]: formValues.img,
      [`${instance.keyType}_${instance.number}_bgColor`]: formValues.bgColor,
      [`${instance.keyType}_${instance.number}_textColor`]:
        formValues.textColor,
      [`${instance.keyType}_${instance.number}_iconTint`]: formValues.iconTint,
      [`${instance.keyType}_${instance.number}_displayOnToken`]:
        formValues.displayOnToken,
    };

    if (instance.keyType === "effect") {
      storageData[`${instance.keyType}_${instance.number}_type`] =
        formValues.type;

      // Store roll data for features created via effect creator
      if (formValues.type === "feature") {
        storageData[`effect_${instance.number}_rollType`] = formValues.rollType;
        storageData[`effect_${instance.number}_rollAbility`] =
          formValues.rollAbility;
        storageData[`effect_${instance.number}_rollBonus`] =
          formValues.rollBonus;
        storageData[`effect_${instance.number}_rollTargeted`] =
          formValues.rollTargeted;
        storageData[`effect_${instance.number}_rollAdvantage`] =
          formValues.rollAdvantage;
        storageData[`effect_${instance.number}_rollDisadvantage`] =
          formValues.rollDisadvantage;
      }
    }

    erps.utils.storeMultipleUserFlags(storageData);
  }

  /**
   * Save the current form data to a temporary object
   * Note: This excludes addedAbilities fields which are handled separately
   * @param {CreatorApplication} app - The application instance
   * @returns {Object} The saved form data
   * @protected
   */
  static _saveFormData(app) {
    if (!app || !app.element) return {};

    // Get the form element
    const form =
      app.element.tagName === "FORM"
        ? app.element
        : app.element.querySelector("form");
    if (!form) return {};

    const savedData = {};

    const inputs = form.querySelectorAll("input, select, textarea");

    Logger.debug(
      "Saving form data from",
      { inputCount: inputs.length },
      "CREATOR_APP",
    );

    inputs.forEach((input) => {
      if (input.name && !input.name.includes("addedAbilities")) {
        if (input.type === "checkbox") {
          savedData[input.name] = input.checked;
        } else {
          savedData[input.name] = input.value;
        }

        // If this is an image input, also save the display image source
        if (input.name === "img") {
          const displayImage = input.parentNode.querySelector(
            'img[name="displayImage"]',
          );
          if (displayImage) {
            savedData["displayImage"] = displayImage.src;
          }
        }

        Logger.debug(
          `Saved ${input.name}`,
          { value: savedData[input.name] },
          "CREATOR_APP",
        );
      }
    });

    // Save dynamic section visibility states
    const featureRollSection = form.querySelector(".feature-roll-section");
    if (featureRollSection) {
      savedData["_featureRollSectionDisplay"] =
        featureRollSection.style.display;
    }

    const rollDetails = form.querySelector(".roll-details");
    if (rollDetails) {
      savedData["_rollDetailsDisplay"] = rollDetails.style.display;
    }

    Logger.debug(
      "Saved dynamic section states",
      {
        featureRollSection: savedData["_featureRollSectionDisplay"],
        rollDetails: savedData["_rollDetailsDisplay"],
      },
      "CREATOR_APP",
    );

    return savedData;
  }

  /**
   * Restore saved form data after re-rendering
   * Handles special cases like checkboxes and color inputs
   * @param {CreatorApplication} app - The application instance
   * @param {Object} savedData - The saved form data
   * @protected
   */
  static _restoreFormData(app, savedData) {
    if (!app || !app.element || !savedData) return;

    // Get the form element
    const form =
      app.element.tagName === "FORM"
        ? app.element
        : app.element.querySelector("form");
    if (!form) return;

    Logger.debug(
      "Restoring form data",
      { dataKeys: Object.keys(savedData).length },
      "CREATOR_APP",
    );

    Object.entries(savedData).forEach(([name, value]) => {
      // Handle special case for display image
      if (name === "displayImage") {
        const imgInput = form.querySelector('input[name="img"]');
        if (imgInput) {
          const displayImage = imgInput.parentNode.querySelector(
            'img[name="displayImage"]',
          );
          if (displayImage) {
            displayImage.src = value;
            Logger.debug(`Restored displayImage`, { value }, "CREATOR_APP");
          }
        }
        return;
      }

      // Handle dynamic section visibility states
      if (name === "_featureRollSectionDisplay") {
        const featureRollSection = form.querySelector(".feature-roll-section");
        if (featureRollSection && value) {
          featureRollSection.style.display = value;
          Logger.debug(
            `Restored feature roll section display`,
            { value },
            "CREATOR_APP",
          );
        }
        return;
      }

      if (name === "_rollDetailsDisplay") {
        const rollDetails = form.querySelector(".roll-details");
        if (rollDetails && value) {
          rollDetails.style.display = value;
          Logger.debug(
            `Restored roll details display`,
            { value },
            "CREATOR_APP",
          );
        }
        return;
      }

      const input = form.querySelector(`[name="${name}"]`);
      if (input) {
        if (input.type === "checkbox") {
          input.checked = value;
        } else if (input.type === "color") {
          input.value = value;

          // Update associated hex input if it exists
          const hexInput = form.querySelector(`#hex-${name}`);
          if (hexInput) {
            hexInput.value = value;
          }

          // Update color preview element if it exists
          const preview = form.querySelector(`#preview-${name}`);
          if (preview) {
            preview.style.backgroundColor = value;
          }
        } else {
          input.value = value;
        }
        Logger.debug(`Restored ${name}`, { value }, "CREATOR_APP");
      } else {
        Logger.debug(
          `Could not find input with name: ${name}`,
          {},
          "CREATOR_APP",
        );
      }
    });
  }
}
