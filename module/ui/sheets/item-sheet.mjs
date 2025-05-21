import { prepareActiveEffectCategories } from "../../helpers/effects.mjs";
import { prepareCharacterEffects } from "../../helpers/character-effects.mjs";
import { EventideSheetHelpers } from "../components/eventide-sheet-helpers.mjs";

const { api, sheets } = foundry.applications;

const { DragDrop, TextEditor } = foundry.applications.ux;

/**
 * Item sheet implementation for the Eventide RP System.
 * Extends the base ItemSheetV2 with system-specific functionality for managing items in the Eventide RP System.
 * This class handles the rendering and interaction with item sheets, including features, gear, combat powers,
 * transformations, and their associated effects.
 *
 * @extends {HandlebarsApplicationMixin(ItemSheetV2)}
 * @class
 */
export class EventideRpSystemItemSheet extends api.HandlebarsApplicationMixin(
  sheets.ItemSheetV2
) {
  /**
   * Creates a new instance of the EventideRpSystemItemSheet.
   * Initializes drag and drop functionality and form change tracking.
   *
   * @param {Object} [options={}] - Application configuration options
   * @param {boolean} [options.editable=true] - Whether the sheet is editable
   * @param {boolean} [options.closeOnSubmit=true] - Whether to close the sheet on form submission
   * @param {Object} [options.submitOnChange=false] - Whether to submit the form on change
   */
  constructor(options = {}) {
    super(options);
    this.#dragDrop = this.#createDragDropHandlers();
    this.#formChanged = false; // Track if the form has been changed
  }

  /*********************
   *
   *   CONFIG / CONTEXT
   *
   *********************/

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: [
      "eventide-rp-system",
      "sheet",
      "item",
      "eventide-item-sheet",
      "eventide-item-sheet--scrollbars",
    ],
    actions: {
      onEditImage: this._onEditImage,
      viewDoc: this._viewDoc,
      createDoc: this._createEffect,
      deleteDoc: this._deleteEffect,
      toggleEffect: this._toggleEffect,
      newCharacterEffect: this._newCharacterEffect,
      deleteCharacterEffect: this._deleteCharacterEffect,
      toggleEffectDisplay: this._toggleEffectDisplay,
      removeCombatPower: this._removeCombatPower,
    },
    position: {
      width: 600,
      height: "auto",
    },
    form: {
      submitOnChange: true,
    },
    // Custom property that's merged into `this.options`
    dragDrop: [{ dragSelector: "[data-drag]", dropSelector: null }],
  };

  /** @override */
  static PARTS = {
    header: {
      template: "systems/eventide-rp-system/templates/item/header.hbs",
    },
    tabs: {
      // Foundry-provided generic template
      template: "templates/generic/tab-navigation.hbs",
    },
    description: {
      template: "systems/eventide-rp-system/templates/item/description.hbs",
    },
    prerequisites: {
      template: "systems/eventide-rp-system/templates/item/prerequisites.hbs",
    },
    attributesFeature: {
      template:
        "systems/eventide-rp-system/templates/item/attribute-parts/feature.hbs",
    },
    attributesGear: {
      template:
        "systems/eventide-rp-system/templates/item/attribute-parts/gear.hbs",
    },
    attributesCombatPower: {
      template:
        "systems/eventide-rp-system/templates/item/attribute-parts/combat-power.hbs",
    },
    attributesTransformation: {
      template:
        "systems/eventide-rp-system/templates/item/attribute-parts/transformation.hbs",
    },
    effects: {
      template: "systems/eventide-rp-system/templates/item/effects.hbs",
    },
    characterEffects: {
      template:
        "systems/eventide-rp-system/templates/item/character-effects.hbs",
    },
    embeddedCombatPowers: {
      template:
        "systems/eventide-rp-system/templates/item/embedded-combat-powers.hbs",
    },
  };

  /**
   * Clean up resources before closing the application
   * @param {Object} options - The options for closing
   * @returns {Promise<void>}
   * @override
   */
  async _preClose(options) {
    if (this.element) {
      // Clean up number inputs
      erps.utils.cleanupNumberInputs(this.element);

      // Clean up color pickers
      erps.utils.cleanupColorPickers(this.element);

      // Clean up range sliders
      erps.utils.cleanupRangeSliders(this.element);
    }

    await super._preClose(options);
  }

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    // Not all parts always render
    options.parts = ["header", "tabs", "description"];
    // Don't show the other tabs if only limited view
    if (this.document.limited) return;
    // Control which parts show based on document subtype
    switch (this.document.type) {
      case "feature":
        options.parts.push("characterEffects");
        break;
      case "status":
        options.parts.push("characterEffects");
        break;
      case "gear":
        options.parts.push("attributesGear", "characterEffects");
        break;
      case "combatPower":
        options.parts.push("attributesCombatPower", "prerequisites");
        break;
      case "transformation":
        options.parts.push(
          "attributesTransformation",
          "embeddedCombatPowers",
          "characterEffects"
        );
        break;
    }
  }

  /**
   * Prepares the context data for rendering the sheet.
   * This includes setting up permissions, item data, system data, and configuration.
   *
   * @param {Object} options - The options for preparing the context
   * @returns {Promise<Object>} The prepared context data
   * @override
   */
  async _prepareContext(options) {
    const context = {};

    await this._eventideItemEffectGuards();

    context.activeEffect = this.item.effects.contents[0];
    context.iconTint = context.activeEffect.tint;

    // Validates both permissions and compendium status
    context.editable = this.isEditable;
    context.owner = this.document.isOwner;
    context.limited = this.document.limited;
    // Add the item document.
    context.item = this.item;
    // Adding system and flags for easier access
    context.system = this.item.system;
    context.flags = this.item.flags;
    // Adding a pointer to CONFIG.EVENTIDE_RP_SYSTEM
    context.config = CONFIG.EVENTIDE_RP_SYSTEM;
    // You can factor out context construction to helper functions
    context.tabs = this._getTabs(options.parts);
    // Necessary for formInput and formFields helpers
    context.fields = this.document.schema.fields;
    context.systemFields = this.document.system.schema.fields;
    context.isGM = game.user.isGM;

    return context;
  }

  /**
   * Prepares data for rendering a specific part of the Item sheet.
   * Handles different parts like attributes, description, prerequisites, effects, etc.
   *
   * @param {string} partId - The ID of the part to prepare
   * @param {Object} context - The data object to prepare
   * @returns {Promise<Object>} The prepared context
   * @override
   */
  async _preparePartContext(partId, context) {
    switch (partId) {
      case "attributesFeature":
      case "attributesGear":
      case "attributesCombatPower":
      case "attributesTransformation":
        // Necessary for preserving active tab on re-render
        context.tab = context.tabs[partId];
        if (partId === "attributesCombatPower" || partId === "attributesGear") {
          // Add roll type options
          context.rollTypes = EventideSheetHelpers.rollTypeObject;
          context.abilities = {
            ...EventideSheetHelpers.abilityObject,
            unaugmented: "unaugmented",
          };
        }
        // Add size options for the select
        context.sizeOptions = [0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
        break;
      case "description":
        context.tab = context.tabs[partId];
        // Enrich description info for display
        // Enrichment turns text like `[[/r 1d20]]` into buttons
        context.enrichedDescription =
          await TextEditor.implementation.enrichHTML(
            this.item.system.description,
            {
              // Whether to show secret blocks in the finished html
              secrets: this.document.isOwner,
              // Data to fill in for inline rolls
              rollData: this.item.getRollData(),
              // Relative UUID resolution
              relativeTo: this.item,
            }
          );
        break;
      case "prerequisites":
        context.prerequisites = this.item.system.prerequisites;
        context.tab = context.tabs[partId];
        break;
      case "embeddedCombatPowers":
        context.tab = context.tabs[partId];
        // Get embedded combat powers as temporary items
        context.embeddedCombatPowers =
          this.item.system.getEmbeddedCombatPowers();
        break;
      case "effects":
        context.tab = context.tabs[partId];
        // Prepare active effects for easier access
        context.effects = await prepareActiveEffectCategories(
          this.item.effects
        );
        break;
      case "characterEffects":
        context.tab = context.tabs[partId];
        // Prepare active effects for easier access
        context.characterEffects = await prepareCharacterEffects(
          this.item.effects.contents[0]
        );
        break;
    }
    return context;
  }

  /**
   * Generates the data for the generic tab navigation template.
   * Creates tab definitions for different parts of the sheet.
   *
   * @param {string[]} parts - An array of named template parts to render
   * @returns {Record<string, Partial<ApplicationTab>>} The tab definitions
   * @protected
   */
  _getTabs(parts) {
    // If you have sub-tabs this is necessary to change
    const tabGroup = "primary";
    // Default tab for first time it's rendered this session
    if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = "description";
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: "",
        group: tabGroup,
        // Matches tab property to
        id: "",
        // FontAwesome Icon, if you so choose
        icon: "",
        // Run through localization
        label: "EVENTIDE_RP_SYSTEM.Item.Tabs.",
      };
      switch (partId) {
        case "header":
        case "tabs":
          return tabs;
        case "description":
          tab.id = "description";
          tab.label += "Description";
          break;
        case "prerequisites":
          tab.id = "prerequisites";
          tab.label += "Prerequisites";
          break;
        case "effects":
          tab.id = "effects";
          tab.label += "Effects";
          break;
        case "characterEffects":
          tab.id = "characterEffects";
          tab.label += "CharacterEffects";
          break;
        case "embeddedCombatPowers":
          tab.id = "embeddedCombatPowers";
          tab.label += "CombatPowers";
          break;
        case "attributesFeature":
        case "attributesGear":
        case "attributesCombatPower":
        case "attributesTransformation":
          tab.id = "attributes";
          tab.label += "Attributes";
          break;
      }
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = "active";
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  /*********************
   *
   *   EVENT HANDLERS
   *
   *********************/

  /**
   * Actions performed after any render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   */
  _onRender(context, options) {
    this.#dragDrop.forEach((d) => d.bind(this.element));
  }

  /**
   * Handles form change events.
   * Updates character effects and handles icon tint changes.
   *
   * @param {Object} formConfig - The form configuration
   * @param {Event} event - The form change event
   * @returns {Promise<void>}
   * @protected
   */
  async _onChangeForm(formConfig, event) {
    this.#formChanged = true; // Set flag when form changes

    if (event.target.name.includes("characterEffects")) {
      await this._updateCharacterEffects();
      event.target.focus();
      return;
    }
    if (
      event.target.name.includes("textColor") ||
      event.target.name.includes("bgColor") ||
      event.target.name.includes("iconTint")
    ) {
      if (event.target.value.length === 4) {
        event.target.value = `${event.target.value}${event.target.value.slice(
          1
        )}`;
      }
      // if the target is blank or invalid length, reset to default color
      if (event.target.value.length !== 7) {
        const defaultColor = event.target.name.includes("textColor")
          ? "#ffffff"
          : event.target.name.includes("bgColor")
          ? "#000000"
          : "#ffffff"; // Default for iconTint
        event.target.value = defaultColor;
      }
    }
    if (event.target.name.includes("iconTint")) {
      const updateData = {
        _id: this.item.effects.contents[0]._id,
        tint: event.target.value,
      };
      await this.item.updateEmbeddedDocuments("ActiveEffect", [updateData]);
      return;
    }

    await super._onChangeForm(formConfig, event);
  }

  /**
   * Handles the closing of the sheet.
   * Calls the erpsUpdateItem hook if the form was changed.
   *
   * @returns {Promise<void>}
   * @protected
   */
  async _onClose() {
    // Only call the hook if the form was changed
    if (this.#formChanged) {
      Hooks.call("erpsUpdateItem", this.item, this.item, {}, game.user.id);
    }
    this.#formChanged = false;
  }

  /**************
   *
   *   ACTIONS
   *
   **************/

  /**
   * Handle changing a Document's image.
   *
   * @this EventideRpSystemItemSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   * @protected
   */
  static async _onEditImage(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr);
    const { img } =
      this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ??
      {};
    const fp = new FilePicker({
      current,
      type: "image",
      redirectToRoot: img ? [img] : [],
      callback: (path) => {
        this.document.update({ [attr]: path });
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    });
    return fp.browse();
  }

  static async _newCharacterEffect(event, target) {
    const { type, ability } = target.dataset;
    const newEffect = {
      type,
      ability,
    };
    this._updateCharacterEffects({ newEffect });
    event.target.focus();
  }

  static async _deleteCharacterEffect(event, target) {
    const index = target.dataset.index;
    const type = target.dataset.type;
    this._updateCharacterEffects({ remove: { index, type } });
  }

  static async _toggleEffectDisplay(event, target) {
    const duration = target.checked ? { seconds: 604800 } : { seconds: 0 };
    const updateData = {
      _id: this.item.effects.contents[0]._id,
      duration,
    };
    await this.item.updateEmbeddedDocuments("ActiveEffect", [updateData]);
    event.target.focus();
  }

  /**
   * Handle removing a combat power from a transformation
   *
   * @this EventideRpSystemItemSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _removeCombatPower(event, target) {
    const powerId = target.dataset.powerId;
    if (!powerId) return;

    await this.item.system.removeCombatPower(powerId);
  }

  /*****************
   *
   *   DragDrop
   *
   *****************/

  /**
   * Define whether a user is able to begin a dragstart workflow for a given drag selector
   * @param {string} selector       The candidate HTML selector for dragging
   * @returns {boolean}             Can the current user drag this selector?
   * @protected
   */
  _canDragStart(selector) {
    // game.user fetches the current user
    return this.isEditable;
  }

  /**
   * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
   * @param {string} selector       The candidate HTML selector for the drop target
   * @returns {boolean}             Can the current user drop on this selector?
   * @protected
   */
  _canDragDrop(selector) {
    // game.user fetches the current user
    return this.isEditable;
  }

  /**
   * Callback actions which occur at the beginning of a drag start workflow.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragStart(event) {
    const li = event.currentTarget;
    if ("link" in event.target.dataset) return;

    let dragData = null;

    // Active Effect
    if (li.dataset.effectId) {
      const effect = this.item.effects.get(li.dataset.effectId);
      dragData = effect.toDragData();
    }

    if (!dragData) return;

    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /**
   * Callback actions which occur when a dragged element is over a drop target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragOver(event) {}

  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  async _onDrop(event) {
    const data = TextEditor.implementation.getDragEventData(event);
    const item = this.item;
    const allowed = Hooks.call("dropItemSheetData", item, this, data);
    if (allowed === false) return;

    // Handle different data types
    switch (data.type) {
      case "ActiveEffect":
        return this._onDropActiveEffect(event, data);
      case "Actor":
        return this._onDropActor(event, data);
      case "Item":
        return this._onDropItem(event, data);
      case "Folder":
        return this._onDropFolder(event, data);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handles dropping of an item reference or item data onto an Item Sheet.
   * Specifically handles combat powers being added to transformations.
   *
   * @param {DragEvent} event - The concluding DragEvent which contains drop data
   * @param {Object} data - The data transfer extracted from the event
   * @returns {Promise<boolean>} Whether the drop was successful
   * @protected
   */
  async _onDropItem(event, data) {
    if (!this.item.isOwner) return false;

    // Get the dropped item
    const droppedItem = await Item.implementation.fromDropData(data);
    if (!droppedItem) return false;

    // Handle transformation items receiving combat powers
    if (this.item.type === "transformation") {
      // Only allow combat powers to be added to transformations
      if (droppedItem.type !== "combatPower") {
        ui.notifications.warn(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.TransformationItemTypes"
          )
        );
        return false;
      }

      // Add the combat power to the transformation
      await this.item.system.addCombatPower(droppedItem);
      return true;
    }

    return false;
  }

  /* -------------------------------------------- */

  /**
   * Handles the dropping of ActiveEffect data onto an Actor Sheet.
   * Creates new effects or sorts existing ones.
   *
   * @param {DragEvent} event - The concluding DragEvent which contains drop data
   * @param {Object} data - The data transfer extracted from the event
   * @returns {Promise<ActiveEffect|boolean>} The created ActiveEffect object or false if it couldn't be created
   * @protected
   */
  async _onDropActiveEffect(event, data) {
    const aeCls = getDocumentClass("ActiveEffect");
    const effect = await aeCls.fromDropData(data);
    if (!this.item.isOwner || !effect) return false;

    if (this.item.uuid === effect.parent?.uuid)
      return this._onEffectSort(event, effect);
    return aeCls.create(effect, { parent: this.item });
  }

  /* -------------------------------------------- */

  /**
   * Sorts an Active Effect based on its surrounding attributes.
   *
   * @param {DragEvent} event - The drag event
   * @param {ActiveEffect} effect - The effect being sorted
   * @returns {Promise<void>}
   * @protected
   */
  _onEffectSort(event, effect) {
    const effects = this.item.effects;
    const dropTarget = event.target.closest("[data-effect-id]");
    if (!dropTarget) return;
    const target = effects.get(dropTarget.dataset.effectId);

    // Don't sort on yourself
    if (effect.id === target.id) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for (let el of dropTarget.parentElement.children) {
      const siblingId = el.dataset.effectId;
      if (siblingId && siblingId !== effect.id)
        siblings.push(effects.get(el.dataset.effectId));
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(effect, {
      target,
      siblings,
    });
    const updateData = sortUpdates.map((u) => {
      const update = u.update;
      update._id = u.target._id;
      return update;
    });

    // Perform the update
    return this.item.updateEmbeddedDocuments("ActiveEffect", updateData);
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of an Actor data onto another Actor sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<object|boolean>}  A data object which describes the result of the drop, or false if the drop was
   *                                     not permitted.
   * @protected
   */
  async _onDropActor(event, data) {
    if (!this.item.isOwner) return false;
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of a Folder on an Actor Sheet.
   * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
   * @param {DragEvent} event     The concluding DragEvent which contains drop data
   * @param {object} data         The data transfer extracted from the event
   * @returns {Promise<Item[]>}
   * @protected
   */
  async _onDropFolder(event, data) {
    if (!this.item.isOwner) return [];
  }

  /** The following pieces set up drag handling and are unlikely to need modification  */

  /**
   * Returns an array of DragDrop instances
   * @type {DragDrop.implementation[]}
   */
  get dragDrop() {
    return this.#dragDrop;
  }

  // This is marked as private because there's no real need
  // for subclasses or external hooks to mess with it directly
  #dragDrop;
  #formChanged; // Flag to track if form has been changed

  /**
   * Creates drag-and-drop workflow handlers for this Application.
   *
   * @returns {DragDrop.implementation[]} An array of DragDrop handlers
   * @private
   */
  #createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      };
      d.callbacks = {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      };
      return new DragDrop.implementation(d);
    });
  }

  /**************************
   *
   *   SANITIZATION / GUARDS
   *
   **************************/

  /**
   * Ensures that each item has exactly one active effect.
   * Creates a default effect if none exists, or consolidates multiple effects into one.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _eventideItemEffectGuards() {
    const effects = Array.from(this.item.effects);

    if (effects.length > 1) {
      let keepEffect = this.item.effects.contents[0];

      const effectIds = effects.map((effect) => effect._id);

      await this.item.deleteEmbeddedDocuments("ActiveEffect", effectIds);
      await this.item.createEmbeddedDocuments("ActiveEffect", [keepEffect]);
    }

    if (effects.length === 0) {
      const newEffect = new ActiveEffect({
        _id: foundry.utils.randomID(),
        name: this.item.name,
        img: this.item.img,
        changes: [],
        disabled: false,
        duration: {
          startTime: null,
          seconds:
            this.item.type === "status" || this.item.type === "feature"
              ? 18000
              : 0,
          combat: "",
          rounds: 0,
          turns: 0,
          startRound: 0,
          startTurn: 0,
        },
        description: "",
        origin: "",
        tint: "#ffffff",
        transfer: true,
        statuses: new Set(),
        flags: {},
      });
      await this.item.createEmbeddedDocuments("ActiveEffect", [newEffect]);
    }

    if (
      !this.item.effects.contents.find(
        (effect) =>
          effect.name === this.item.name && effect.img === this.item.img
      )
    ) {
      const keepEffectId = this.item.effects.contents[0]._id;

      const updateData = {
        _id: keepEffectId,
        name: this.item.name,
        img: this.item.img,
      };
      await this.item.updateEmbeddedDocuments("ActiveEffect", [updateData]);
    }
  }

  /**
   * Updates the character effects for the item.
   * Processes both regular and hidden effects, handling additions and removals.
   *
   * @param {Object} [options={}] - Options for updating character effects
   * @param {Object} [options.newEffect] - Configuration for a new effect to add
   * @param {(null|"abilities"|"hiddenAbilities")} [options.newEffect.type] - Type of effect
   * @param {string} [options.newEffect.ability] - Ability identifier for the new effect
   * @param {Object} [options.remove] - Configuration for removing an existing effect
   * @param {number} [options.remove.index] - Index of the effect to remove
   * @param {(null|"regularEffects"|"hiddenEffects")} [options.remove.type] - Type of effect to remove
   * @returns {Promise<void>}
   * @protected
   */
  async _updateCharacterEffects({
    newEffect = { type: null, ability: null },
    remove = { index: null, type: null },
  } = {}) {
    // Get all form elements that include "characterEffects" in their name
    // Filter out elements that match the remove value if one is provided
    let formElements = this.form.querySelectorAll('[name*="characterEffects"]');

    if (remove.type && remove.index) {
      formElements = Array.from(formElements).filter(
        (el) => !el.name.includes(`${remove.type}.${remove.index}`)
      );
    }

    // Create an object to store the values
    const characterEffects = {
      regularEffects: [],
      hiddenEffects: [],
    };

    // Process each form element using for...of instead of forEach for async safety
    for (const element of formElements) {
      const name = element.name;
      const value = element.value;

      if (!name.includes("regularEffects") && !name.includes("hiddenEffects"))
        continue;

      const parts = name.split(".");
      if (parts.length < 3) continue;

      // Parse the name to extract the type (regularEffects or hiddenEffects) and index
      const type = parts[1]; // regularEffects or hiddenEffects
      const index = parseInt(parts[2]);
      const property = parts[3]; // ability, mode, value, etc.

      // Ensure the array has an object at this index
      if (!characterEffects[type][index]) {
        characterEffects[type][index] = {};
      }

      // Set the property value
      characterEffects[type][index][property] = value;
    }

    // Clean up the arrays (remove any undefined entries)
    characterEffects.regularEffects = characterEffects.regularEffects.filter(
      (e) => e
    );
    characterEffects.hiddenEffects = characterEffects.hiddenEffects.filter(
      (e) => e
    );

    const processEffects = async (effects, isRegular) => {
      return effects.map((effect) => {
        let key, mode;

        if (isRegular) {
          key = `system.abilities.${effect.ability}.${
            effect.mode === "add"
              ? "change"
              : effect.mode === "override"
              ? "override"
              : effect.mode === "advantage"
              ? "diceAdjustments.advantage"
              : effect.mode === "disadvantage"
              ? "diceAdjustments.disadvantage"
              : "transform"
          }`;
        } else {
          key = `system.hiddenAbilities.${effect.ability}.${
            effect.mode === "add" ? "change" : "override"
          }`;
        }

        mode =
          (isRegular && effect.mode !== "override") ||
          (!isRegular && effect.mode === "add")
            ? CONST.ACTIVE_EFFECT_MODES.ADD
            : CONST.ACTIVE_EFFECT_MODES.OVERRIDE;

        return { key, mode, value: effect.value };
      });
    };

    const newEffects = [
      ...(await processEffects(characterEffects.regularEffects, true)),
      ...(await processEffects(characterEffects.hiddenEffects, false)),
    ];

    if (newEffect.type && newEffect.ability) {
      newEffects.push({
        key: `system.${newEffect.type}.${newEffect.ability}.change`,
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: 0,
      });
    }

    const updateData = {
      _id: this.item.effects.contents[0]._id,
      changes: newEffects,
    };

    await this.item.updateEmbeddedDocuments("ActiveEffect", [updateData]);
  }

  /*************************************************
   *
   *   ORIGINAL EFFECT FUNCTIONS (Legacy / Unused)
   *
   *************************************************/

  /**
   * Renders an embedded document's sheet.
   * Handles both combat powers and effects.
   *
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
   * @returns {Promise<void>}
   * @protected
   */
  static async _viewDoc(event, target) {
    const docRow = target.closest("li");

    // Handle viewing embedded combat powers
    if (this.item.type === "transformation" && docRow.dataset.itemId) {
      const powerId = docRow.dataset.itemId;
      const embeddedPowers = this.item.system.getEmbeddedCombatPowers();
      const power = embeddedPowers.find((p) => p.id === powerId);

      if (power) {
        power.sheet.render(true);
        return;
      }
    }

    // Handle viewing effects
    if (docRow.dataset.effectId) {
      const effect = this.item.effects.get(docRow.dataset.effectId);
      effect?.sheet.render(true);
    }
  }

  /**
   * Handles item deletion.
   *
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
   * @returns {Promise<void>}
   * @protected
   */
  static async _deleteEffect(event, target) {
    const effect = this._getEffect(target);
    await effect.delete();
  }

  /**
   * Creates a new Owned Item or ActiveEffect for the actor using initial data defined in the HTML dataset.
   *
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
   * @returns {Promise<void>}
   * @private
   */
  static async _createEffect(event, target) {
    // Retrieve the configured document class for ActiveEffect
    const aeCls = getDocumentClass("ActiveEffect");
    // Prepare the document creation data by initializing it a default name.
    // As of v12, you can define custom Active Effect subtypes just like Item subtypes if you want
    const effectData = {
      name: aeCls.defaultName({
        // defaultName handles an undefined type gracefully
        type: target.dataset.type,
        parent: this.item,
      }),
    };
    // Loop through the dataset and add it to our effectData
    for (const [dataKey, value] of Object.entries(target.dataset)) {
      // These data attributes are reserved for the action handling
      if (["action", "documentClass"].includes(dataKey)) continue;
      // Nested properties require dot notation in the HTML, e.g. anything with `system`
      foundry.utils.setProperty(effectData, dataKey, value);
    }

    // Finally, create the embedded document!
    await aeCls.create(effectData, { parent: this.item });
  }

  /**
   * Toggles the disabled state of an effect.
   *
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
   * @returns {Promise<void>}
   * @private
   */
  static async _toggleEffect(event, target) {
    const effect = this._getEffect(target);
    await effect.update({ disabled: !effect.disabled });
  }

  /** Helper Functions */

  /**
   * Fetches the row with the data for the rendered embedded document.
   *
   * @param {HTMLElement} target - The element with the action
   * @returns {HTMLLIElement} The document's row
   * @private
   */
  _getEffect(target) {
    const li = target.closest(".effect");
    return this.item.effects.get(li?.dataset?.effectId);
  }
}
