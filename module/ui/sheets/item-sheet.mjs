import { prepareActiveEffectCategories } from "../../helpers/_module.mjs";
import { prepareCharacterEffects } from "../../helpers/_module.mjs";
import {
  EventideSheetHelpers,
  EventideDialog,
} from "../components/_module.mjs";
import { Logger } from "../../services/_module.mjs";
import { ErrorHandler, CommonFoundryTasks } from "../../utils/_module.mjs";
import {
  initThemeManager,
  THEME_PRESETS,
  cleanupThemeManager,
} from "../../helpers/_module.mjs";
import { BaselineSheetMixins } from "../components/_module.mjs";
import { EmbeddedCombatPowerSheet } from "./embedded-combat-power-sheet.mjs";
import { EmbeddedItemSheet } from "./embedded-item-sheet.mjs";

const { api, sheets } = foundry.applications;
const { DragDrop, TextEditor } = foundry.applications.ux;
const FilePicker = foundry.applications.apps.FilePicker.implementation;

/**
 * Item sheet implementation for the Eventide RP System.
 * Extends the base ItemSheetV2 with system-specific functionality for managing items in the Eventide RP System.
 * This class handles the rendering and interaction with item sheets, including features, gear, combat powers,
 * transformations, and their associated effects.
 *
 * @extends {HandlebarsApplicationMixin(ItemSheetV2)}
 * @class
 */
export class EventideRpSystemItemSheet extends BaselineSheetMixins(
  api.HandlebarsApplicationMixin(sheets.ItemSheetV2),
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
    Logger.methodEntry("EventideRpSystemItemSheet", "constructor", {
      itemId: options?.document?.id,
      itemName: options?.document?.name,
      itemType: options?.document?.type,
    });

    try {
      super(options);
      this.#dragDrop = this.#createDragDropHandlers();
      this.#formChanged = false; // Track if the form has been changed

      Logger.debug(
        "Item sheet initialized successfully",
        {
          sheetId: this.id,
          itemName: this.item?.name,
          itemType: this.item?.type,
          dragDropHandlers: this.#dragDrop?.length,
        },
        "ITEM_SHEET",
      );

      Logger.methodExit("EventideRpSystemItemSheet", "constructor", this);
    } catch (error) {
      Logger.error("Failed to initialize item sheet", error, "ITEM_SHEET");
      Logger.methodExit("EventideRpSystemItemSheet", "constructor", null);
      throw error;
    }
  }

  /*********************
   *
   *   CONFIG / CONTEXT
   *
   *********************/

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: [
      // "eventide-rp-system",
      // "sheet",
      // "item",
      "eventide-sheet",
      "eventide-sheet--scrollbars",
    ],
    actions: {
      onEditImage: this._onEditImage,
      viewDoc: this._viewDoc,
      createEffect: this._createEffect,
      editEffect: this._editEffect,
      deleteEffect: this._deleteEffect,
      toggleEffect: this._toggleEffect,
      newCharacterEffect: this._newCharacterEffect,
      deleteCharacterEffect: this._deleteCharacterEffect,
      toggleEffectDisplay: this._toggleEffectDisplay,
      removeCombatPower: this._removeCombatPower,
      onDiceAdjustmentChange: this._onDiceAdjustmentChange,
      clearEmbeddedItem: this._clearEmbeddedItem,

      editEmbeddedItem: this._editEmbeddedItem,
      editEmbeddedEffect: this._editEmbeddedEffect,
      removeEmbeddedEffect: this._removeEmbeddedEffect,
    },
    position: {
      width: 800,
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
    attributesActionCard: {
      template:
        "systems/eventide-rp-system/templates/item/attribute-parts/action-card.hbs",
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
    embeddedItems: {
      template: "systems/eventide-rp-system/templates/item/embedded-items.hbs",
    },
  };

  /**
   * Clean up resources before closing the application
   * @param {Object} options - The options for closing
   * @returns {Promise<void>}
   * @override
   */
  async _preClose(options) {
    // Call mixin cleanup first
    await super._preClose(options);

    if (this.element) {
      // Clean up number inputs
      erps.utils.cleanupNumberInputs(this.element);

      // Clean up color pickers
      erps.utils.cleanupColorPickers(this.element);

      // Clean up range sliders
      erps.utils.cleanupRangeSliders(this.element);

      // Clean up centralized theme management
      if (this.themeManager) {
        cleanupThemeManager(this);
        this.themeManager = null;
      }
    }
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
        options.parts.push("attributesFeature", "characterEffects");
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
          "characterEffects",
        );
        break;
      case "actionCard":
        options.parts.push("attributesActionCard", "embeddedItems");
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
    Logger.methodEntry("EventideRpSystemItemSheet", "_prepareContext", {
      itemName: this.item?.name,
      itemType: this.item?.type,
      optionsParts: options?.parts,
    });

    try {
      const context = {};

      // Handle effect guards with error handling
      try {
        await this.eventideItemEffectGuards();
      } catch (guardError) {
        Logger.warn("Effect guards failed", guardError, "ITEM_SHEET");
      }

      // Set up active effect data safely
      const firstEffect = this.item.effects.contents[0];
      context.activeEffect = firstEffect;
      context.iconTint = firstEffect?.tint;

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

      context.userSheetTheme = CommonFoundryTasks.retrieveSheetTheme();
      /**
       * A flag to indicate that this sheet is for an embedded document.
       * This is always false for the standard item sheet, but is used by the
       * template to render the correct version of the rich text editor.
       * @type {boolean}
       */
      context.isEmbedded = false;

      Logger.debug(
        "Item sheet context prepared",
        {
          itemName: this.item.name,
          itemType: this.item.type,
          contextKeys: Object.keys(context),
          tabCount: Object.keys(context.tabs).length,
          editable: context.editable,
          limited: context.limited,
          hasActiveEffect: !!context.activeEffect,
        },
        "ITEM_SHEET",
      );

      Logger.methodExit(
        "EventideRpSystemItemSheet",
        "_prepareContext",
        context,
      );
      return context;
    } catch (error) {
      await ErrorHandler.handleAsync(Promise.reject(error), {
        context: `Prepare Item Sheet Context: ${this.item?.name}`,
        errorType: ErrorHandler.ERROR_TYPES.UI,
        userMessage: game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Errors.SheetContextError",
          {
            itemName: this.item?.name || "Unknown",
          },
        ),
      });

      Logger.methodExit("EventideRpSystemItemSheet", "_prepareContext", null);

      // Return minimal fallback context
      return {
        editable: false,
        owner: false,
        limited: true,
        item: this.item,
        system: this.item?.system || {},
        flags: this.item?.flags || {},
        config: CONFIG.EVENTIDE_RP_SYSTEM || {},
        tabs: {},
        fields: {},
        systemFields: {},
        isGM: false,
        activeEffect: null,
        iconTint: null,
        hasError: true,
      };
    }
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
      case "attributesActionCard":
        // Necessary for preserving active tab on re-render
        context.tab = context.tabs[partId];
        if (
          partId === "attributesCombatPower" ||
          partId === "attributesGear" ||
          partId === "attributesFeature" ||
          partId === "attributesActionCard"
        ) {
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
            },
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
      case "embeddedItems":
        context.tab = context.tabs[partId];
        // Get embedded item and effects as temporary items
        context.embeddedItem = this.item.system.getEmbeddedItem();
        context.embeddedEffects = this.item.system.getEmbeddedEffects();
        break;
      case "effects":
        context.tab = context.tabs[partId];
        // Prepare active effects for easier access
        context.effects = await prepareActiveEffectCategories(
          this.item.effects,
        );
        break;
      case "characterEffects":
        context.tab = context.tabs[partId];
        // Prepare active effects for easier access
        context.characterEffects = await prepareCharacterEffects(
          this.item.effects.contents[0],
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
        case "embeddedItems":
          tab.id = "embeddedItems";
          tab.label += "EmbeddedItems";
          break;
        case "attributesFeature":
        case "attributesGear":
        case "attributesCombatPower":
        case "attributesTransformation":
        case "attributesActionCard":
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
  _onRender(_context, _options) {
    this.#dragDrop.forEach((d) => d.bind(this.element));

    // TESTING: Comment out JavaScript theme property setting to test pure CSS
    // this._setImmediateThemeProperties(currentTheme);

    // Initialize centralized theme management
    if (!this.themeManager) {
      this.themeManager = initThemeManager(this, THEME_PRESETS.ITEM_SHEET);
    } else {
      // Re-apply themes on re-render
      this.themeManager.applyThemes();
    }
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
          1,
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
  static async _onEditImage(_event, target) {
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

  static async _deleteCharacterEffect(_event, target) {
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
  static async _removeCombatPower(_event, target) {
    const powerId = target.dataset.powerId;
    if (!powerId) {
      return;
    }
    await this.item.system.removeCombatPower(powerId);
  }

  /**
   * Handle dice adjustment input changes to recalculate totals
   *
   * @this EventideRpSystemItemSheet
   * @param {Event} event   The originating change event
   * @param {HTMLElement} _target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _onDiceAdjustmentChange(_event, _target) {
    // The form submission will handle the actual update and recalculation
    // This is just a placeholder for any additional logic if needed
  }

  /**
   * Overrides the default click action handler to manage the specialized workflow
   * for editing an embedded combat power. This approach is necessary to ensure the
   * correct `this` context is maintained, allowing the parent sheet to re-render
   * itself after the child (embedded) sheet is closed.
   *
   * For all other actions, it delegates back to the parent class's implementation.
   *
   * @param {PointerEvent} event   - The originating click event.
   * @param {HTMLElement} target   - The element that was clicked, containing the `data-action`.
   * @override
   * @protected
   */
  async _onClickAction(event, target) {
    const action = target.dataset.action;
    if (action === "editEmbeddedPower") {
      const powerId = target.closest("[data-item-id]")?.dataset.itemId;
      if (!powerId) return;

      const powerData = this.item.system.embeddedCombatPowers.find(
        (p) => p._id === powerId,
      );

      if (powerData) {
        const embeddedSheet = new EmbeddedCombatPowerSheet(
          powerData,
          this.item,
        );
        // When the embedded sheet is closed, re-render the parent sheet to reflect changes.
        Hooks.once(`close${EmbeddedCombatPowerSheet.name}`, (app) => {
          if (app.id === embeddedSheet.id) {
            this.render(true);
          }
        });
        embeddedSheet.render(true);
      }
    } else {
      return super._onClickAction(event, target);
    }
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
  _canDragStart(_selector) {
    // game.user fetches the current user
    return this.isEditable;
  }

  /**
   * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
   * @param {string} selector       The candidate HTML selector for the drop target
   * @returns {boolean}             Can the current user drop on this selector?
   * @protected
   */
  _canDragDrop(_selector) {
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

    // Handle embedded combat powers from transformations
    if (this.item.type === "transformation" && li.dataset.itemId) {
      const powerId = li.dataset.itemId;
      const embeddedPowers = this.item.system.getEmbeddedCombatPowers();
      const power = embeddedPowers.find((p) => p.id === powerId);

      if (power) {
        // Create clean drag data without parent relationship to avoid embedded document errors
        const powerData = power.toObject();
        // Strip ID to prevent Foundry colliding IDs.
        delete powerData._id;

        dragData = {
          type: "Item",
          data: powerData,
          // Don't include uuid or parent information that would make Foundry think this is an embedded document
        };
      }
    }
    // Active Effect
    else if (li.dataset.effectId) {
      const effect = this.item.effects.get(li.dataset.effectId);
      dragData = effect.toDragData();
    }

    if (!dragData) return;

    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

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
   * Callback actions which occur when a dragged element enters a drop target.
   * @param {DragEvent} event - The drag enter event
   * @protected
   */
  _onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";

    // Add visual feedback for action card sheets
    if (this.item.type === "actionCard") {
      this._addDragFeedback(event);
    }
  }

  /**
   * Callback actions which occur when a dragged element leaves a drop target.
   * @param {DragEvent} event - The drag leave event
   * @protected
   */
  _onDragLeave(event) {
    // Only remove feedback if we're actually leaving the sheet
    if (!this.element.contains(event.relatedTarget)) {
      this._removeDragFeedback();
    }
  }

  /**
   * Add visual feedback during drag operations
   * @param {DragEvent} event - The drag event
   * @private
   */
  _addDragFeedback(_event) {
    // Remove any existing feedback first
    this._removeDragFeedback();

    // For action cards, always highlight drop zones during drag
    if (this.item.type === "actionCard") {
      this._highlightValidDropZones("universal");
    }
  }

  /**
   * Highlight valid drop zones based on item type
   * @param {string} itemType - The type of item being dragged
   * @private
   */
  _highlightValidDropZones(_itemType) {
    const dropZones = this.element.querySelectorAll(
      ".erps-items-panel__drop-zone",
    );
    const actionCardSheet = this.element.querySelector(".tab.embedded-items");

    // Add drag-over class to all drop zones for universal feedback
    dropZones.forEach((zone) => {
      zone.classList.add("drag-over");
    });

    // Add a general drag feedback class to the action card sheet
    if (actionCardSheet) {
      actionCardSheet.classList.add("drag-active");
    }
  }

  /**
   * Remove all drag feedback
   * @private
   */
  _removeDragFeedback() {
    const dropZones = this.element.querySelectorAll(
      ".erps-items-panel__drop-zone",
    );
    const actionCardSheet = this.element.querySelector(".tab.embedded-items");

    dropZones.forEach((zone) => {
      zone.classList.remove("drag-over");
    });

    if (actionCardSheet) {
      actionCardSheet.classList.remove("drag-active");
    }
  }

  /**
   * Handles dropping of an Item onto this Item Sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<Item[]|boolean>}  The created Item objects or false if the drop was not permitted.
   * @protected
   */
  async _onDropItem(event, data) {
    // Remove drag feedback when drop occurs
    this._removeDragFeedback();
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
            "EVENTIDE_RP_SYSTEM.Errors.TransformationItemTypes",
          ),
        );
        return false;
      }

      await this.item.system.addCombatPower(droppedItem);
      return true;
    }

    // Handle action cards receiving items and status effects
    if (this.item.type === "actionCard") {
      // Check what type of drop zone this is
      const dropZone = event.target.closest("[data-drop-zone]");
      const dropType = dropZone?.dataset.dropZone;

      // If dropped on a specific drop zone, use that logic
      if (dropType === "actionItem") {
        // Handle embedded item drops
        const supportedTypes = ["combatPower", "gear", "feature"];
        if (!supportedTypes.includes(droppedItem.type)) {
          ui.notifications.warn(
            game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.ActionCardItemTypes", {
              type: droppedItem.type,
              supported: supportedTypes.join(", "),
            }),
          );
          return false;
        }

        await this.item.system.setEmbeddedItem(droppedItem);
        return true;
      } else if (dropType === "effect") {
        // Handle effect drops (both status effects and gear)
        const supportedTypes = ["status", "gear"];
        if (!supportedTypes.includes(droppedItem.type)) {
          ui.notifications.warn(
            game.i18n.format(
              "EVENTIDE_RP_SYSTEM.Errors.ActionCardEffectTypes",
              {
                type: droppedItem.type,
                supported: supportedTypes.join(", "),
              },
            ),
          );
          return false;
        }

        await this.item.system.addEmbeddedEffect(droppedItem);
        return true;
      } else {
        // Universal drop - no specific drop zone found, route based on item type
        return this._handleUniversalActionCardDrop(droppedItem, event);
      }
    }

    return false;
  }

  /**
   * Handle universal drops on action cards when no specific drop zone is targeted
   * @param {Item} droppedItem - The item being dropped
   * @param {DragEvent} event - The drop event
   * @returns {Promise<boolean>} True if handled successfully
   * @private
   */
  async _handleUniversalActionCardDrop(droppedItem, _event) {
    // Determine where the item should go based on its type
    const itemRouting = {
      combatPower: "actionItem",
      feature: "actionItem",
      status: "effect",
      gear: "needsSelection", // Special case - needs user choice
    };

    const destination = itemRouting[droppedItem.type];

    if (!destination) {
      ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.ActionCardItemTypes", {
          type: droppedItem.type,
          supported: Object.keys(itemRouting).join(", "),
        }),
      );
      return false;
    }

    // Handle gear items that need category selection
    if (destination === "needsSelection") {
      return this._showGearCategoryDialog(droppedItem);
    }

    // Route to the appropriate destination
    if (destination === "actionItem") {
      await this.item.system.setEmbeddedItem(droppedItem);
      ui.notifications.info(
        game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.ItemAddedToAction",
          {
            itemName: droppedItem.name,
          },
        ),
      );
      return true;
    } else if (destination === "effect") {
      await this.item.system.addEmbeddedEffect(droppedItem);
      ui.notifications.info(
        game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.ItemAddedToEffects",
          {
            itemName: droppedItem.name,
          },
        ),
      );
      return true;
    }

    return false;
  }

  /**
   * Show gear category selection dialog using EventideDialog
   * @param {Item} gearItem - The gear item to categorize
   * @returns {Promise<boolean>} True if handled successfully
   * @private
   */
  async _showGearCategoryDialog(gearItem) {
    try {
      Logger.debug(
        "Showing gear category dialog",
        {
          gearItemName: gearItem.name,
          gearItemId: gearItem.id,
        },
        "ITEM_SHEET",
      );

      const choice = await this._createGearCategoryDialog(gearItem);

      Logger.debug(
        "Gear category dialog result",
        {
          choice,
          gearItemName: gearItem.name,
        },
        "ITEM_SHEET",
      );

      if (!choice) {
        Logger.debug("No choice made, dialog was cancelled", {}, "ITEM_SHEET");
        return false;
      }

      // Add the gear item to the selected category
      if (choice === "actionItem") {
        Logger.debug("Adding gear as action item", {}, "ITEM_SHEET");
        await this.item.system.setEmbeddedItem(gearItem);
        ui.notifications.info(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Item.ActionCard.GearAddedToAction",
            {
              itemName: gearItem.name,
            },
          ),
        );
      } else if (choice === "effect") {
        Logger.debug("Adding gear as effect", {}, "ITEM_SHEET");
        await this.item.system.addEmbeddedEffect(gearItem);
        ui.notifications.info(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Item.ActionCard.GearAddedToEffects",
            {
              itemName: gearItem.name,
            },
          ),
        );
      }

      return true;
    } catch (error) {
      Logger.error("Failed to show gear category dialog", error, "ITEM_SHEET");
      ui.notifications.error("Failed to show gear category dialog");
      return false;
    }
  }

  /**
   * Create and show an EventideDialog for gear category selection
   * @param {Item} gearItem - The gear item to categorize
   * @returns {Promise<string|null>} The selected category or null if cancelled
   * @private
   */
  async _createGearCategoryDialog(gearItem) {
    let resolveChoice;
    const choicePromise = new Promise((resolve) => {
      resolveChoice = resolve;
    });

    const buttons = [
      {
        label: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Dialogs.GearMode.UseAsAction",
        ),
        action: "actionItem",
        cssClass: "erps-button erps-button--primary",
        icon: "fas fa-bolt",
      },
      {
        label: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Dialogs.GearMode.UseAsEffect",
        ),
        action: "effect",
        cssClass: "erps-button erps-button--primary",
        icon: "fas fa-magic",
      },
      {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Close"),
        action: "cancel",
        cssClass: "erps-button",
        icon: "fas fa-times",
      },
    ];

    const callback = async (action, _data, _dialog) => {
      Logger.debug("Gear category dialog callback triggered", {
        action,
        gearItemName: gearItem.name,
      });

      if (action === "actionItem") {
        resolveChoice("actionItem");
        return true; // Close dialog
      } else if (action === "effect") {
        resolveChoice("effect");
        return true; // Close dialog
      } else if (action === "cancel") {
        resolveChoice(null);
        return true; // Close dialog
      }
      return false; // Keep dialog open
    };

    const templateData = {
      gearItem: {
        name: gearItem.name,
        img: gearItem.img,
      },
      questionText: game.i18n.format(
        "EVENTIDE_RP_SYSTEM.Item.ActionCard.GearCategoryQuestion",
        { itemName: gearItem.name },
      ),
      actionItemTitle: game.i18n.localize(
        "EVENTIDE_RP_SYSTEM.Item.ActionCard.ActionItem",
      ),
      actionItemDescription: game.i18n.localize(
        "EVENTIDE_RP_SYSTEM.Item.ActionCard.ActionItemDescription",
      ),
      effectsTitle: game.i18n.localize(
        "EVENTIDE_RP_SYSTEM.Item.ActionCard.Effects",
      ),
      effectsDescription: game.i18n.localize(
        "EVENTIDE_RP_SYSTEM.Item.ActionCard.EffectsDescription",
      ),
    };

    try {
      const dialog = await EventideDialog.show({
        title: game.i18n.localize("EVENTIDE_RP_SYSTEM.Dialogs.GearMode.Title"),
        template:
          "systems/eventide-rp-system/templates/dialogs/gear-category-dialog.hbs",
        data: templateData,
        buttons,
        callback,
        windowOptions: {
          icon: "fa-solid fa-sack",
          width: 650,
          height: "auto",
        },
      });

      // Set up a close handler to resolve with null if dialog is closed without selection
      const originalClose = dialog.close.bind(dialog);
      dialog.close = function (...args) {
        resolveChoice(null);
        return originalClose(...args);
      };

      // Wait for the user's choice
      return await choicePromise;
    } catch (error) {
      Logger.error("Failed to show gear category dialog", error);
      return null;
    }
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
    const aeCls = foundry.utils.getDocumentClass("ActiveEffect");
    const effect = await aeCls.fromDropData(data);
    if (!this.item.isOwner || !effect) return false;

    if (this.item.uuid === effect.parent?.uuid) {
      return this._onEffectSort(event, effect);
    }
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
    for (const el of dropTarget.parentElement.children) {
      const siblingId = el.dataset.effectId;
      if (siblingId && siblingId !== effect.id) {
        siblings.push(effects.get(el.dataset.effectId));
      }
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
  async _onDropActor(_event, _data) {
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
  async _onDropFolder(_event, _data) {
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
        dragleave: this._onDragLeave.bind(this),
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
  async eventideItemEffectGuards() {
    const effects = Array.from(this.item.effects);

    if (effects.length > 1) {
      const keepEffect = this.item.effects.contents[0];

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
          effect.name === this.item.name && effect.img === this.item.img,
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
        (el) => !el.name.includes(`${remove.type}.${remove.index}`),
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

      if (!name.includes("regularEffects") && !name.includes("hiddenEffects")) {
        continue;
      }

      const parts = name.split(".");
      if (parts.length < 3) continue;

      // Parse the name to extract the type (regularEffects or hiddenEffects) and index
      const type = parts[1]; // regularEffects or hiddenEffects
      const index = parseInt(parts[2], 10);
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
      (e) => e,
    );
    characterEffects.hiddenEffects = characterEffects.hiddenEffects.filter(
      (e) => e,
    );

    const processEffects = async (effects, isRegular) => {
      return effects.map((effect) => {
        let key;

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

        const mode =
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
  static async _viewDoc(_event, target) {
    const docRow = target.closest("li");

    // Handle viewing embedded combat powers
    if (this.item.type === "transformation" && docRow.dataset.itemId) {
      const powerId = docRow.dataset.itemId;
      const embeddedPowers = this.item.system.getEmbeddedCombatPowers();
      const power = embeddedPowers.find((p) => p.id === powerId);

      if (power) {
        // Open the sheet in read-only mode since these are temporary items
        // that can't be properly saved due to their parent relationship
        return power.sheet.render(true, { readOnly: true });
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
  static async _deleteEffect(_event, target) {
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
  static async _createEffect(_event, target) {
    // Retrieve the configured document class for ActiveEffect
    const aeCls = foundry.utils.getDocumentClass("ActiveEffect");
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
  static async _toggleEffect(_event, target) {
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

  /**
   * Handle clearing the embedded item from an action card
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The target element
   * @private
   */
  static async _clearEmbeddedItem(_event, _target) {
    Logger.methodEntry("EventideRpSystemItemSheet", "_clearEmbeddedItem");

    try {
      // Get the item from the sheet instance, not from the form
      const item = this.item;
      if (!item || item.type !== "actionCard") {
        Logger.warn(
          "Clear embedded item called on non-action card",
          { itemType: item?.type },
          "ITEM_SHEET",
        );
        return;
      }

      // Check if user has permission to edit this action card
      Logger.info(
        "DEBUG: Permission check for embedded item",
        {
          itemName: item.name,
          userId: game.user.id,
          isOwner: item.isOwner,
          isEditable: item.isEditable,
          canUserModify: item.canUserModify(game.user, "update"),
          ownership: item.ownership,
          testPermission: item.testUserPermission(game.user, "OWNER"),
        },
        "ITEM_SHEET",
      );

      // Use a more reliable permission check
      const hasPermission =
        item.isOwner ||
        item.canUserModify(game.user, "update") ||
        game.user.isGM;

      if (!hasPermission) {
        Logger.warn(
          "User lacks permission to edit embedded item",
          {
            itemName: item.name,
            userId: game.user.id,
            isOwner: item.isOwner,
            canUserModify: item.canUserModify(game.user, "update"),
            isGM: game.user.isGM,
          },
          "ITEM_SHEET",
        );
        ui.notifications.warn(
          "You don't have permission to edit this action card's embedded items",
        );
        return;
      }

      await item.system.clearEmbeddedItem();

      Logger.info("Embedded item cleared successfully", null, "ITEM_SHEET");
      Logger.methodExit("EventideRpSystemItemSheet", "_clearEmbeddedItem");
    } catch (error) {
      Logger.error("Failed to clear embedded item", error, "ITEM_SHEET");
      ui.notifications.error("Failed to clear embedded item");
      Logger.methodExit("EventideRpSystemItemSheet", "_clearEmbeddedItem");
    }
  }

  /**
   * Handle editing an embedded item from an action card
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The target element
   * @private
   */
  static async _editEmbeddedItem(_event, _target) {
    Logger.methodEntry("EventideRpSystemItemSheet", "_editEmbeddedItem");

    try {
      const item = this.item;
      if (!item || item.type !== "actionCard") {
        Logger.warn(
          "Edit embedded item called on non-action card",
          { itemType: item?.type },
          "ITEM_SHEET",
        );
        return;
      }

      // Check if user has permission to edit this action card
      Logger.info(
        "DEBUG: Permission check for embedded item",
        {
          itemName: item.name,
          userId: game.user.id,
          isOwner: item.isOwner,
          isEditable: item.isEditable,
          canUserModify: item.canUserModify(game.user, "update"),
          ownership: item.ownership,
          testPermission: item.testUserPermission(game.user, "OWNER"),
        },
        "ITEM_SHEET",
      );

      // Use a more reliable permission check
      const hasPermission =
        item.isOwner ||
        item.canUserModify(game.user, "update") ||
        game.user.isGM;

      if (!hasPermission) {
        Logger.warn(
          "User lacks permission to edit embedded item",
          {
            itemName: item.name,
            userId: game.user.id,
            isOwner: item.isOwner,
            canUserModify: item.canUserModify(game.user, "update"),
            isGM: game.user.isGM,
          },
          "ITEM_SHEET",
        );
        ui.notifications.warn(
          "You don't have permission to edit this action card's embedded items",
        );
        return;
      }

      const embeddedItem = item.system.getEmbeddedItem();
      if (!embeddedItem) {
        Logger.warn("No embedded item found to edit", null, "ITEM_SHEET");
        return;
      }

      // Create and render the embedded item sheet
      const sheet = new EmbeddedItemSheet(embeddedItem.toObject(), item);
      sheet.render(true);

      Logger.info(
        "Embedded item sheet opened",
        { itemName: embeddedItem.name },
        "ITEM_SHEET",
      );
      Logger.methodExit("EventideRpSystemItemSheet", "_editEmbeddedItem");
    } catch (error) {
      Logger.error("Failed to edit embedded item", error, "ITEM_SHEET");
      ui.notifications.error("Failed to edit embedded item");
      Logger.methodExit("EventideRpSystemItemSheet", "_editEmbeddedItem");
    }
  }

  /**
   * Handle editing an embedded effect from an action card
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The target element
   * @private
   */
  static async _editEmbeddedEffect(_event, target) {
    Logger.methodEntry("EventideRpSystemItemSheet", "_editEmbeddedEffect");

    try {
      const item = this.item;
      const effectId = target.dataset.effectId;

      if (!item || item.type !== "actionCard") {
        Logger.warn(
          "Edit embedded effect called on non-action card",
          { itemType: item?.type },
          "ITEM_SHEET",
        );
        return;
      }

      // Check if user has permission to edit this action card
      const hasPermission =
        item.isOwner ||
        item.canUserModify(game.user, "update") ||
        game.user.isGM;

      if (!hasPermission) {
        Logger.warn(
          "User lacks permission to edit embedded effect",
          {
            itemName: item.name,
            userId: game.user.id,
            isOwner: item.isOwner,
            canUserModify: item.canUserModify(game.user, "update"),
            isGM: game.user.isGM,
          },
          "ITEM_SHEET",
        );
        ui.notifications.warn(
          "You don't have permission to edit this action card's embedded effects",
        );
        return;
      }

      if (!effectId) {
        Logger.warn("No effect ID provided for editing", null, "ITEM_SHEET");
        return;
      }

      const embeddedEffects = item.system.getEmbeddedEffects();
      const effect = embeddedEffects.find((e) => e.originalId === effectId);

      if (!effect) {
        Logger.warn("Embedded effect not found", { effectId }, "ITEM_SHEET");
        return;
      }

      // Create and render the embedded effect sheet
      const sheet = new EmbeddedItemSheet(effect.toObject(), item, {}, true);
      sheet.render(true);

      Logger.info(
        "Embedded effect sheet opened",
        { effectName: effect.name },
        "ITEM_SHEET",
      );
      Logger.methodExit("EventideRpSystemItemSheet", "_editEmbeddedEffect");
    } catch (error) {
      Logger.error("Failed to edit embedded effect", error, "ITEM_SHEET");
      ui.notifications.error("Failed to edit embedded effect");
      Logger.methodExit("EventideRpSystemItemSheet", "_editEmbeddedEffect");
    }
  }

  /**
   * Handle removing an embedded effect from an action card
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The target element
   * @private
   */
  static async _removeEmbeddedEffect(_event, target) {
    Logger.methodEntry("EventideRpSystemItemSheet", "_removeEmbeddedEffect");

    try {
      const item = this.item;
      const effectId = target.dataset.effectId;

      if (!item || item.type !== "actionCard") {
        Logger.warn(
          "Remove embedded effect called on non-action card",
          { itemType: item?.type },
          "ITEM_SHEET",
        );
        return;
      }

      // Check if user has permission to edit this action card
      const hasPermission =
        item.isOwner ||
        item.canUserModify(game.user, "update") ||
        game.user.isGM;

      if (!hasPermission) {
        Logger.warn(
          "User lacks permission to remove embedded effect",
          {
            itemName: item.name,
            userId: game.user.id,
            isOwner: item.isOwner,
            canUserModify: item.canUserModify(game.user, "update"),
            isGM: game.user.isGM,
          },
          "ITEM_SHEET",
        );
        ui.notifications.warn(
          "You don't have permission to edit this action card's embedded effects",
        );
        return;
      }

      if (!effectId) {
        Logger.warn("No effect ID provided for removal", null, "ITEM_SHEET");
        return;
      }

      await item.system.removeEmbeddedEffect(effectId);

      Logger.info(
        "Embedded effect removed successfully",
        { effectId },
        "ITEM_SHEET",
      );
      Logger.methodExit("EventideRpSystemItemSheet", "_removeEmbeddedEffect");
    } catch (error) {
      Logger.error("Failed to remove embedded effect", error, "ITEM_SHEET");
      ui.notifications.error("Failed to remove embedded effect");
      Logger.methodExit("EventideRpSystemItemSheet", "_removeEmbeddedEffect");
    }
  }
}
