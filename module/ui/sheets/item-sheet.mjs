import { prepareActiveEffectCategories } from "../../helpers/_module.mjs";
import { prepareCharacterEffects } from "../../helpers/_module.mjs";
import { EventideSheetHelpers } from "../components/_module.mjs";
import { Logger } from "../../services/_module.mjs";
import { ErrorHandler, CommonFoundryTasks } from "../../utils/_module.mjs";
import { BaselineSheetMixins } from "../components/_module.mjs";
import { ItemSheetAllMixins } from "../mixins/_module.mjs";
import { EmbeddedItemSheet } from "./embedded-item-sheet.mjs";

const { api, sheets } = foundry.applications;
const { TextEditor } = foundry.applications.ux;

/**
 * Item sheet implementation for the Eventide RP System.
 * Extends the base ItemSheetV2 with system-specific functionality for managing items in the Eventide RP System.
 * This class handles the rendering and interaction with item sheets, including features, gear, combat powers,
 * transformations, and their associated effects.
 *
 * @extends {ItemSheetAllMixins(BaselineSheetMixins(HandlebarsApplicationMixin(ItemSheetV2)))}
 * @class
 */
export class EventideRpSystemItemSheet extends ItemSheetAllMixins(
  BaselineSheetMixins(api.HandlebarsApplicationMixin(sheets.ItemSheetV2)),
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
    attributesActionCardConfig: {
      template:
        "systems/eventide-rp-system/templates/item/attribute-parts/action-card-config.hbs",
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
        options.parts.push("attributesActionCard", "attributesActionCardConfig", "embeddedItems");
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
        await this._initEffectGuards();
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
      case "attributesActionCardConfig":
        // Necessary for preserving active tab on re-render
        context.tab = context.tabs[partId];
        if (
          partId === "attributesCombatPower" ||
          partId === "attributesGear" ||
          partId === "attributesFeature" ||
          partId === "attributesActionCard" ||
          partId === "attributesActionCardConfig"
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
        context.embeddedItem = this.item.getEmbeddedItem();
        context.embeddedEffects = this.item.getEmbeddedEffects();
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
        case "attributesActionCardConfig":
          tab.id = "config";
          tab.label += "Config";
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

    // Initialize theme management from mixin
    this._initThemeManagement();
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

    // Clean up theme management from mixin
    this._cleanupThemeManagement();
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
        const embeddedSheet = new EmbeddedItemSheet(powerData, this.item);
        // When the embedded sheet is closed, re-render the parent sheet to reflect changes.
        Hooks.once(`close${EmbeddedItemSheet.name}`, (app) => {
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
      return new foundry.applications.ux.DragDrop.implementation(d);
    });
  }
}
