import { prepareActiveEffectCategories } from "../../helpers/_module.mjs";
import { prepareCharacterEffects } from "../../helpers/_module.mjs";
import { EventideSheetHelpers } from "../components/_module.mjs";
import { Logger } from "../../services/_module.mjs";
import { ErrorHandler, CommonFoundryTasks } from "../../utils/_module.mjs";
import { BaselineSheetMixins } from "../components/_module.mjs";
import { ItemSheetAllMixins } from "../mixins/_module.mjs";
import { EmbeddedItemSheet } from "./embedded-item-sheet.mjs";
import { ItemSelectorComboBox } from "../components/item-selector-combo-box.mjs";
import { ItemSourceCollector } from "../../helpers/item-source-collector.mjs";
import { EmbeddedItemExporter } from "../../services/embedded-item-exporter.mjs";

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
    try {
      super(options);
      this.#dragDrop = this.#createDragDropHandlers();
      this.#formChanged = false; // Track if the form has been changed

      // Add our custom actions to the options after parent construction
      foundry.utils.mergeObject(this.options.actions, {
        exportEmbeddedCombatPowers: this._exportEmbeddedCombatPowers.bind(this),
        exportEmbeddedActionCards: this._exportEmbeddedActionCards.bind(this),
        exportEmbeddedActionItem: this._exportEmbeddedActionItem.bind(this),
        exportEmbeddedEffects: this._exportEmbeddedEffects.bind(this),
        exportEmbeddedTransformations:
          this._exportEmbeddedTransformations.bind(this),
        exportAllEmbeddedItems: this._exportAllEmbeddedItems.bind(this),
      });
    } catch (error) {
      Logger.error("Failed to initialize item sheet", error, "ITEM_SHEET");
      throw error;
    }
  }

  /*********************
   *
   *   CONFIG / CONTEXT
   *
   *********************/

  /** @override */
  static get DEFAULT_OPTIONS() {
    const options = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      classes: ["eventide-sheet", "eventide-sheet--scrollbars"],
      actions: {
        onEditImage: this._onEditImage,
        viewDoc: this._viewDoc,
        createDoc: this._createDoc,
        deleteDoc: this._deleteDoc,
        createEffect: this._createEffect,
        editEffect: this._editEffect,
        deleteEffect: this._deleteEffect,
        toggleEffect: this._toggleEffect,
        newCharacterEffect: this._newCharacterEffect,
        deleteCharacterEffect: this._deleteCharacterEffect,
        toggleEffectDisplay: this._toggleEffectDisplay,
        removeCombatPower: this._removeCombatPower,
        removeActionCard: this._removeActionCard,
        editEmbeddedActionCard: this._editEmbeddedActionCard,
        onDiceAdjustmentChange: this._onDiceAdjustmentChange,
        clearEmbeddedItem: this._clearEmbeddedItem,
        createNewPower: this._createNewPower,
        createNewStatus: this._createNewStatus,
        createNewTransformation: this._createNewTransformation,
        createGroup: this._createActionCardGroup,
        deleteGroup: this._deleteActionCardGroup,
        createNewCombatPower: this._createNewCombatPower,
        createNewActionCard: this._createNewActionCard,
        editEmbeddedItem: this._editEmbeddedItem,
        editEmbeddedEffect: this._editEmbeddedEffect,
        removeEmbeddedEffect: this._removeEmbeddedEffect,
        editEmbeddedTransformation: this._editEmbeddedTransformation,
        removeEmbeddedTransformation: this._removeEmbeddedTransformation,
      },
      position: {
        width: 840,
        height: "auto",
      },
      form: {
        submitOnChange: true,
      },
      window: {},
      // Custom property that's merged into `this.options`
      dragDrop: [{ dragSelector: "[data-drag]", dropSelector: null }],
    });
    return options;
  }

  /** @override */
  static PARTS = {
    header: {
      template: "systems/eventide-rp-system/templates/item/header.hbs",
    },
    callouts: {
      template: "systems/eventide-rp-system/templates/item/callouts.hbs",
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
    embeddedActionCards: {
      template:
        "systems/eventide-rp-system/templates/item/embedded-action-cards.hbs",
    },
    embeddedItems: {
      template: "systems/eventide-rp-system/templates/item/embedded-items.hbs",
    },
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    // Not all parts always render
    options.parts = ["header", "callouts", "tabs", "description"];
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
          "embeddedActionCards",
          "characterEffects",
        );
        // Increase width for transformations due to additional content (combat powers + action cards)
        options.position = { ...options.position, width: 1000 };
        break;
      case "actionCard":
        options.parts.push(
          "attributesActionCard",
          "attributesActionCardConfig",
          "embeddedItems",
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

      /**
       * A flag to indicate that this sheet is for a temporary action card from a transformation.
       * This is used by the template to disable collaborative editing for temporary documents.
       * @type {boolean}
       */
      context.isTransformationActionCard = this._isTransformationActionCard();

      /**
       * Prepare callouts for action cards
       */
      context.callouts = this._prepareCallouts();

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
   * Prepares callouts for the item sheet
   * @returns {Array} Array of callout objects
   * @private
   */
  _prepareCallouts() {
    const callouts = [];

    // Check for action cards in attack chain mode without embedded item
    if (this.item.type === "actionCard") {
      if (
        this.item.system.mode === "attackChain" &&
        !this.item.system.embeddedItem?.type
      ) {
        callouts.push({
          type: "warning",
          faIcon: "fas fa-exclamation-triangle",
          text: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Forms.Callouts.ActionCard.NoEmbeddedItem",
          ),
        });
      }
    }

    return callouts;
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
        context.sizeOptions = [0, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
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
      case "embeddedActionCards": {
        context.tab = context.tabs[partId];
        // Get embedded action cards as temporary items
        // Warning styling is handled directly in the template
        context.embeddedActionCards = this.item.system.getEmbeddedActionCards();

        // Prepare grouped and ungrouped action cards
        const groups = this.item.system.actionCardGroups || [];
        const actionCards = context.embeddedActionCards || [];

        // Sort groups by sort order
        const sortedGroups = [...groups].sort(
          (a, b) => (a.sort || 0) - (b.sort || 0),
        );

        // Create grouped action cards
        context.groupedActionCards = sortedGroups
          .map((group) => ({
            ...group,
            id: group._id, // Add id field for Handlebars template compatibility
            collapsed: false, // Always show expanded in item sheets
            cards: actionCards
              .filter((card) => card.system.groupId === group._id)
              .map((card) => {
                const mappedCard = {
                  ...card,
                  // Ensure id is set for Handlebars template compatibility
                  // Item instances have .id, but plain objects only have ._id
                  id: card.id || card._id,
                };
                return mappedCard;
              }),
          }))
          .filter((group) => group.cards.length > 0); // Only include groups with cards

        // Get ungrouped action cards
        context.ungroupedActionCards = actionCards
          .filter((card) => !card.system.groupId)
          .map((card) => ({
            ...card,
            // Ensure id is set for Handlebars template compatibility
            // Item instances have .id, but plain objects only have ._id
            id: card.id || card._id,
          }));
        break;
      }
      case "embeddedItems":
        context.tab = context.tabs[partId];
        // Get embedded item, effects, and transformations as temporary items
        context.embeddedItem = this.item.getEmbeddedItem();
        context.embeddedEffects = this.item.getEmbeddedEffects();

        // getEmbeddedTransformations is async, so we need to await it
        context.embeddedTransformations = this.item.getEmbeddedTransformations
          ? await this.item.getEmbeddedTransformations()
          : [];

        break;
      case "effects":
        context.tab = context.tabs[partId];
        // Prepare active effects for easier access
        context.effects = await prepareActiveEffectCategories(
          this.item.effects,
        );
        break;
      case "characterEffects": {
        context.tab = context.tabs[partId];
        // Prepare active effects for easier access
        const firstEffect = this.item.effects.contents[0];
        if (firstEffect) {
          context.characterEffects = await prepareCharacterEffects(firstEffect);
        } else {
          // Return empty character effects structure if no effects exist
          context.characterEffects = {
            fullEffects: [],
            regularEffects: [],
            hiddenEffects: [],
          };
        }
        break;
      }
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
        case "callouts":
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
        case "embeddedActionCards":
          tab.id = "embeddedActionCards";
          tab.label += "ActionCards";
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

  /**
   * Override to add custom header controls for transformation items
   * @returns {Array} Array of header control objects
   * @protected
   */
  _getHeaderControls() {
    const controls = super._getHeaderControls();

    // Only add export controls when user is GM
    if (game.user.isGM) {
      if (this.item.type === "transformation") {
        // Transformation export buttons
        if (this.item.system?.embeddedCombatPowers?.length > 0) {
          controls.push({
            action: "exportEmbeddedCombatPowers",
            icon: "fas fa-swords",
            label: "EVENTIDE_RP_SYSTEM.UI.ExportEmbeddedCombatPowers",
            ownership: "OWNER",
          });
        }

        if (this.item.system?.embeddedActionCards?.length > 0) {
          controls.push({
            action: "exportEmbeddedActionCards",
            icon: "fas fa-cards-blank",
            label: "EVENTIDE_RP_SYSTEM.UI.ExportEmbeddedActionCards",
            ownership: "OWNER",
          });
        }

        // Add "Export All" button if there are any embedded items
        if (
          this.item.system?.embeddedCombatPowers?.length > 0 ||
          this.item.system?.embeddedActionCards?.length > 0
        ) {
          controls.push({
            action: "exportAllEmbeddedItems",
            icon: "fas fa-file-export",
            label: "EVENTIDE_RP_SYSTEM.UI.ExportAllEmbeddedItems",
            ownership: "OWNER",
          });
        }
      } else if (this.item.type === "actionCard") {
        // Action Card export buttons
        const embeddedItem = this.item.getEmbeddedItem();
        if (embeddedItem) {
          controls.push({
            action: "exportEmbeddedActionItem",
            icon: "fas fa-magic",
            label: "EVENTIDE_RP_SYSTEM.UI.ExportEmbeddedActionItem",
            ownership: "OWNER",
          });
        }

        const embeddedEffects = this.item.getEmbeddedEffects();
        if (embeddedEffects && embeddedEffects.length > 0) {
          controls.push({
            action: "exportEmbeddedEffects",
            icon: "fas fa-sparkles",
            label: "EVENTIDE_RP_SYSTEM.UI.ExportEmbeddedEffects",
            ownership: "OWNER",
          });
        }

        // Check for embedded transformations (async, so we need to be careful)
        const hasEmbeddedTransformations =
          this.item.system?.embeddedTransformations?.length > 0;
        if (hasEmbeddedTransformations) {
          controls.push({
            action: "exportEmbeddedTransformations",
            icon: "fas fa-exchange-alt",
            label: "EVENTIDE_RP_SYSTEM.UI.ExportEmbeddedTransformations",
            ownership: "OWNER",
          });
        }

        // Add "Export All" button if there are any embedded items
        if (
          embeddedItem ||
          (embeddedEffects && embeddedEffects.length > 0) ||
          hasEmbeddedTransformations
        ) {
          controls.push({
            action: "exportAllEmbeddedItems",
            icon: "fas fa-file-export",
            label: "EVENTIDE_RP_SYSTEM.UI.ExportAllEmbeddedItems",
            ownership: "OWNER",
          });
        }
      }
    }

    return controls;
  }

  /*********************
   *
   *   EVENT HANDLERS
   *
   *********************/

  /** @override */
  async _onFirstRender(_context, _options) {
    await super._onFirstRender(_context, _options);

    // Initialize theme management from mixin
    this._initThemeManagement();

    // Initialize context menus (only once)
    if (this.item.type === "transformation") {
      this._createTransformationActionCardContextMenu();
      this._createTransformationGroupHeaderContextMenu();
      this._createTransformationTabContentContextMenus();
    }

    // Create item-type-specific context menus
    this._createFeatureContextMenu();
    this._createStatusContextMenu();
    this._createGearContextMenu();
    this._createCombatPowerContextMenu();
  }

  /**
   * Actions performed after any render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   */
  _onRender(_context, _options) {
    // Clean up any orphaned scrollbar-hide styles from other sheets
    this._cleanupOrphanedScrollbarStyles();

    this.#dragDrop.forEach((d) => d.bind(this.element));

    // Re-apply theme management on render
    this._initThemeManagement();

    // Attach group name listeners for transformation action card groups
    if (this.item.type === "transformation") {
      this._attachGroupNameListeners();
    }

    // Manually bind context menus to ensure they work with dynamically rendered tabs
    this._bindAllContextMenus();

    // Initialize item selector combo boxes for action cards
    // Don't await this to avoid blocking the render process
    this._initializeItemSelectors().catch((error) => {
      Logger.error("Failed to initialize item selectors", error, "ItemSheet");
    });
  }

  /**
   * Clean up any orphaned scrollbar-hide styles that may be left in the document
   * @private
   */
  _cleanupOrphanedScrollbarStyles() {
    // Find all scrollbar-hide style elements
    const orphanedStyles = document.querySelectorAll(
      'style[id^="erps-context-menu-scrollbar-hide"]',
    );

    orphanedStyles.forEach((style) => {
      // Check if the style belongs to a sheet that still exists
      const styleId = style.id;
      const sheetId = styleId.replace("erps-context-menu-scrollbar-hide-", "");

      // If this isn't our style, check if the owning sheet still exists
      if (sheetId !== this.id.toString()) {
        const owningElement = document.getElementById(
          `app-${sheetId}`,
        ) || document.querySelector(`[data-appid="${sheetId}"]`);

        // If the owning sheet doesn't exist, remove the orphaned style
        if (!owningElement) {
          style.remove();
        }
      }
    });
  }

  /**
   * Manually bind all context menus to the current element
   * This ensures context menus work even when tabs are dynamically rendered
   * @private
   */
  _bindAllContextMenus() {
    const contextMenus = [
      this._transformationActionCardContextMenu,
      this._transformationGroupHeaderContextMenu,
      this._embeddedItemsTabContextMenu,
      this._embeddedCombatPowersTabContextMenu,
      this._embeddedActionCardsTabContextMenu,
    ];

    contextMenus.forEach((menu) => {
      if (menu) {
        try {
          menu.bind(this.element);
        } catch {
          // Silently ignore binding errors for menus that don't have matching elements yet
        }
      }
    });
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
    // Check if this is a temporary action card from a transformation first
    if (this._isTransformationActionCard()) {
      // Handle transformation action card form changes specially
      await this._onChangeTransformationActionCard(formConfig, event);
      return;
    }

    if (event.target.name.includes("iconTint")) {
      const updateData = {
        _id: this.item.effects.contents[0]._id,
        tint: event.target.value,
      };
      await this.item.updateEmbeddedDocuments("ActiveEffect", [updateData]);
      return;
    }

    if (event.target.name === "system.attackChain.damageFormula") {
      // update system.savedDamage.formula as well
      const updateData = {
        "system.attackChain.damageFormula": event.target.value,
        "system.savedDamage.formula": event.target.value,
      };      
      await this.item.update(updateData);
      return;
    }

    if (event.target.name === "system.savedDamage.formula") {
      // update system.attackChain.damageFormula as well
      const updateData = {
        "system.savedDamage.formula": event.target.value,
        "system.attackChain.damageFormula": event.target.value,
      };
      await this.item.update(updateData);
      return;
    }

    await super._onChangeForm(formConfig, event);
  }

  /**
   * Handle form submission
   * @param {object} formConfig - The form configuration
   * @param {Event} event - The form submission event
   * @returns {Promise<void>}
   * @override
   */
  async _onSubmitForm(formConfig, event) {
    // Check if this is a temporary action card from a transformation
    if (this._isTransformationActionCard()) {
      // Handle transformation action card form submission specially
      await this._onSubmitTransformationActionCard(formConfig, event);
      return;
    }

    // Use the standard form submission for regular items
    await super._onSubmitForm(formConfig, event);
  }

  /**
   * Check if this is a temporary or embedded item (action card, transformation, etc.)
   * @returns {boolean} True if this is a temporary/embedded item
   * @private
   */
  _isTransformationActionCard() {
    // Check if the item has a custom update method (indicating it's from a transformation or action card)
    const hasCustomUpdate =
      this.item.update &&
      (this.item.update.toString().includes("embeddedActionCards") ||
        this.item.update.toString().includes("embeddedTransformations") ||
        this.item.update.toString().includes("embeddedStatusEffects") ||
        this.item.update.toString().includes("embeddedItem"));

    // Also check if the item type is actionCard and it's not persisted (no collection)
    const isTemporaryActionCard =
      this.item.type === "actionCard" && !this.item.collection;

    // Check if it's any embedded item type with an originalId property
    const isEmbeddedItem = this.item.originalId && !this.item.collection;

    return hasCustomUpdate || isTemporaryActionCard || isEmbeddedItem;
  }

  /**
   * Handle form changes for transformation action cards
   * @param {object} formConfig - The form configuration
   * @param {Event} event - The form change event
   * @private
   */
  async _onChangeTransformationActionCard(formConfig, event) {
    // Get the changed field name and value
    let fieldName = event.target.name;
    const fieldValue = event.target.value;

    // Handle hex input fields - strip the -hex suffix to get the actual color field name
    if (fieldName.endsWith("-hex")) {
      fieldName = fieldName.replace(/-hex$/, "");
    }

    // Handle icon tint changes specially for transformation action cards
    if (fieldName.includes("iconTint")) {
      try {
        // Use updateEmbeddedDocuments with the fromEmbeddedItem flag to prevent sheet closure
        const firstEffect = this.item.effects.contents[0];
        if (firstEffect) {
          const updateData = {
            _id: firstEffect._id,
            tint: fieldValue,
          };
          await this.item.updateEmbeddedDocuments(
            "ActiveEffect",
            [updateData],
            { fromEmbeddedItem: true },
          );
        }
      } catch (error) {
        Logger.error(
          "Failed to update transformation action card icon tint",
          error,
          "ItemSheet",
        );
      }
      return;
    }

    // Handle other field changes normally
    const updateData = {};

    // Special handling for checkbox inputs (like cursed toggle)
    if (event.target.type === "checkbox") {
      foundry.utils.setProperty(updateData, fieldName, event.target.checked);
    } else {
      foundry.utils.setProperty(updateData, fieldName, fieldValue);
    }

    try {
      // Use the action card's custom update method with fromEmbeddedItem flag
      // to prevent the sheet from closing
      await this.item.update(updateData, { fromEmbeddedItem: true });
    } catch (error) {
      Logger.error("Failed to update transformation action card", error, "ItemSheet");
    }
  }

  /**
   * Handle form submission for transformation action cards
   * @param {object} formConfig - The form configuration
   * @param {Event} event - The form submission event
   * @private
   */
  async _onSubmitTransformationActionCard(formConfig, event) {
    // Get all form data
    const { FormDataExtended } = foundry.applications.ux;
    const formData = new FormDataExtended(event.target).object;

    try {
      // Use the action card's custom update method
      // Don't use fromEmbeddedItem flag for full form submissions to allow normal behavior
      await this.item.update(formData);
    } catch (error) {
      Logger.error("Failed to submit transformation action card form", error, "ItemSheet");
      ui.notifications.error(
        "Failed to save action card. See console for details.",
      );
    }
  }

  /**
   * Override editor options to disable collaborative editing for temporary documents
   * @param {string} target - The target field being edited
   * @returns {object} Editor configuration options
   * @override
   */
  _getEditorOptions(target) {
    const options = super._getEditorOptions?.(target) || {};

    // Disable collaborative editing for temporary documents (like action cards from transformations)
    // since they don't exist in the database
    if (this._isTransformationActionCard()) {
      options.collaborative = false;
    }

    return options;
  }

  /**
   * Initialize item selector combo boxes for action cards
   * @protected
   */
  async _initializeItemSelectors() {
    try {
      // Only initialize for action card and transformation items
      if (
        this.item.type !== "actionCard" &&
        this.item.type !== "transformation"
      ) {
        return;
      }

      // Clean up existing selectors
      this._cleanupItemSelectors();

      // Initialize action item selector
      const actionItemContainer = this.element.querySelector(
        '[data-selector="action-item"]',
      );

      if (actionItemContainer) {
        this.#actionItemSelector = new ItemSelectorComboBox({
          container: actionItemContainer,
          itemTypes: ItemSourceCollector.getActionItemTypes(),
          onSelect: this._onActionItemSelected.bind(this),
          placeholder: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Forms.ActionItemSelector.Placeholder",
          ),
          selectorType: "action-item",
        });
      }

      // Initialize effects selector
      const effectsContainer = this.element.querySelector(
        '[data-selector="effects"]',
      );

      if (effectsContainer) {
        this.#effectsSelector = new ItemSelectorComboBox({
          container: effectsContainer,
          itemTypes: ItemSourceCollector.getEffectItemTypes(),
          onSelect: this._onEffectSelected.bind(this),
          placeholder: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Forms.EffectsSelector.Placeholder",
          ),
          selectorType: "effects",
        });
      }

      // Initialize transformations selector
      const transformationsContainer = this.element.querySelector(
        '[data-selector="transformations"]',
      );

      if (transformationsContainer) {
        this.#transformationsSelector = new ItemSelectorComboBox({
          container: transformationsContainer,
          itemTypes: ["transformation"],
          onSelect: this._onTransformationSelected.bind(this),
          placeholder: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Forms.TransformationsSelector.Placeholder",
          ),
          selectorType: "transformations",
        });
      }

      // Initialize combat powers selector for transformations
      const combatPowersContainer = this.element.querySelector(
        '[data-selector="combat-powers"]',
      );

      if (combatPowersContainer && this.item.type === "transformation") {
        this.#combatPowersSelector = new ItemSelectorComboBox({
          container: combatPowersContainer,
          itemTypes: ["combatPower"],
          onSelect: this._onCombatPowerSelected.bind(this),
          placeholder: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Forms.CombatPowersSelector.Placeholder",
          ),
          selectorType: "combat-powers",
        });
      }

      // Initialize action cards selector for transformations
      const actionCardsContainer = this.element.querySelector(
        '[data-selector="action-cards"]',
      );

      if (actionCardsContainer && this.item.type === "transformation") {
        this.#actionCardsSelector = new ItemSelectorComboBox({
          container: actionCardsContainer,
          itemTypes: ["actionCard"],
          onSelect: this._onActionCardSelected.bind(this),
          placeholder: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Forms.ActionCardsSelector.Placeholder",
          ),
          selectorType: "action-cards",
        });
      }
    } catch (error) {
      Logger.error("Failed to initialize item selectors", error, "ItemSheet");
    }
  }

  /**
   * Clean up item selector instances
   * @protected
   */
  _cleanupItemSelectors() {
    try {
      if (this.#actionItemSelector) {
        this.#actionItemSelector.destroy();
        this.#actionItemSelector = null;
      }

      if (this.#effectsSelector) {
        this.#effectsSelector.destroy();
        this.#effectsSelector = null;
      }

      if (this.#transformationsSelector) {
        this.#transformationsSelector.destroy();
        this.#transformationsSelector = null;
      }

      if (this.#combatPowersSelector) {
        this.#combatPowersSelector.destroy();
        this.#combatPowersSelector = null;
      }

      if (this.#actionCardsSelector) {
        this.#actionCardsSelector.destroy();
        this.#actionCardsSelector = null;
      }
    } catch (error) {
      Logger.warn("Error cleaning up item selectors", error, "ITEM_SHEET");
    }
  }

  /**
   * Handle selection of an action item
   * @param {Item} droppedItem - The Foundry item document (same as drag-and-drop)
   * @protected
   */
  async _onActionItemSelected(droppedItem) {
    try {
      // Set the embedded item (same as drag-and-drop)
      await this.item.setEmbeddedItem(droppedItem);

      // Re-render the sheet to show the new item
      this.render();

      ui.notifications.info(
        game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Forms.ActionItemSelector.ItemSelected",
          {
            itemName: droppedItem.name,
          },
        ),
      );
    } catch (error) {
      Logger.error("Failed to set action item", error, "ITEM_SHEET");
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.FailedToSetActionItem"),
      );
    }
  }

  /**
   * Handle selection of an effect item
   * @param {Item} droppedItem - The Foundry item document (same as drag-and-drop)
   * @protected
   */
  async _onEffectSelected(droppedItem) {
    try {
      // Add the embedded effect (same as drag-and-drop)
      await this.item.addEmbeddedEffect(droppedItem);

      // Re-render the sheet to show the new effect
      this.render();

      ui.notifications.info(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Forms.EffectsSelector.ItemAdded", {
          itemName: droppedItem.name,
        }),
      );
    } catch (error) {
      Logger.error("Failed to add effect", error, "ITEM_SHEET");
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.FailedToAddEffect"),
      );
    }
  }

  /**
   * Handle combat power selection from the combat powers selector
   * @param {Item} droppedItem - The combat power item that was selected
   * @returns {Promise<void>}
   * @protected
   */
  async _onCombatPowerSelected(droppedItem) {
    try {
      // Add the combat power to the transformation (same as drag-and-drop)
      await this.item.system.addCombatPower(droppedItem);

      // Re-render the sheet to show the new combat power
      this.render();

      ui.notifications.info(
        game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Forms.CombatPowersSelector.ItemAdded",
          {
            itemName: droppedItem.name,
          },
        ),
      );
    } catch (error) {
      Logger.error("Failed to add combat power", error, "ITEM_SHEET");
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.FailedToAddCombatPower"),
      );
    }
  }

  /**
   * Handle action card selection from the action cards selector
   * @param {Item} droppedItem - The action card item that was selected
   * @returns {Promise<void>}
   * @protected
   */
  async _onActionCardSelected(droppedItem) {
    try {
      // Add the action card to the transformation (same as drag-and-drop)
      await this.item.system.addActionCard(droppedItem);

      // Re-render the sheet to show the new action card
      this.render();

      ui.notifications.info(
        game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Forms.ActionCardsSelector.ItemAdded",
          {
            itemName: droppedItem.name,
          },
        ),
      );
    } catch (error) {
      Logger.error("Failed to add action card", error, "ITEM_SHEET");
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.FailedToAddActionCard"),
      );
    }
  }

  /**
   * Handle transformation selection from the transformations selector
   * @param {Item} droppedItem - The transformation item that was selected
   * @returns {Promise<void>}
   * @protected
   */
  async _onTransformationSelected(droppedItem) {
    try {
      // Add the embedded transformation (same as drag-and-drop)
      await this.item.addEmbeddedTransformation(droppedItem);

      // Re-render the sheet to show the new transformation
      this.render();

      ui.notifications.info(
        game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Forms.TransformationsSelector.ItemAdded",
          {
            itemName: droppedItem.name,
          },
        ),
      );
    } catch (error) {
      Logger.error("Failed to add transformation", error, "ITEM_SHEET");
      ui.notifications.error(
        game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Errors.FailedToAddTransformation",
        ),
      );
    }
  }

  /**
   * Export embedded combat powers to the custom combat powers compendium
   * @param {Event} _event - The triggering event
   * @param {HTMLElement} _target - The clicked element
   * @returns {Promise<void>}
   * @protected
   */
  async _exportEmbeddedCombatPowers(_event, _target) {
    try {
      const results = await EmbeddedItemExporter.exportEmbeddedCombatPowers(
        this.item,
      );
      Logger.debug("Combat powers export completed", results, "ITEM_SHEET");
    } catch (error) {
      Logger.error(
        "Failed to export embedded combat powers",
        error,
        "ITEM_SHEET",
      );
    }
  }

  /**
   * Export embedded action cards to the custom action cards compendium
   * @param {Event} _event - The triggering event
   * @param {HTMLElement} _target - The clicked element
   * @returns {Promise<void>}
   * @protected
   */
  async _exportEmbeddedActionCards(_event, _target) {
    try {
      const results = await EmbeddedItemExporter.exportEmbeddedActionCards(
        this.item,
      );
      Logger.debug("Action cards export completed", results, "ITEM_SHEET");
    } catch (error) {
      Logger.error(
        "Failed to export embedded action cards",
        error,
        "ITEM_SHEET",
      );
    }
  }

  /**
   * Export embedded action item to the appropriate compendium
   * @param {Event} _event - The triggering event
   * @param {HTMLElement} _target - The clicked element
   * @returns {Promise<void>}
   * @protected
   */
  async _exportEmbeddedActionItem(_event, _target) {
    try {
      const results = await EmbeddedItemExporter.exportEmbeddedActionItem(
        this.item,
      );
      Logger.debug("Action item export completed", results, "ITEM_SHEET");
    } catch (error) {
      Logger.error(
        "Failed to export embedded action item",
        error,
        "ITEM_SHEET",
      );
    }
  }

  /**
   * Export embedded effects, sorting them by type
   * @param {Event} _event - The triggering event
   * @param {HTMLElement} _target - The clicked element
   * @returns {Promise<void>}
   * @protected
   */
  async _exportEmbeddedEffects(_event, _target) {
    try {
      const results = await EmbeddedItemExporter.exportEmbeddedEffects(
        this.item,
      );
      Logger.debug("Effects export completed", results, "ITEM_SHEET");
    } catch (error) {
      Logger.error("Failed to export embedded effects", error, "ITEM_SHEET");
    }
  }

  /**
   * Export embedded transformations to the custom transformations compendium
   * @param {Event} _event - The triggering event
   * @param {HTMLElement} _target - The clicked element
   * @returns {Promise<void>}
   * @protected
   */
  async _exportEmbeddedTransformations(_event, _target) {
    try {
      const results = await EmbeddedItemExporter.exportEmbeddedTransformations(
        this.item,
      );
      Logger.debug("Transformations export completed", results, "ITEM_SHEET");
    } catch (error) {
      Logger.error(
        "Failed to export embedded transformations",
        error,
        "ITEM_SHEET",
      );
    }
  }

  /**
   * Export all embedded items, sorting them into appropriate compendiums
   * @param {Event} _event - The triggering event
   * @param {HTMLElement} _target - The clicked element
   * @returns {Promise<void>}
   * @protected
   */
  async _exportAllEmbeddedItems(_event, _target) {
    try {
      const results = await EmbeddedItemExporter.exportAllEmbeddedItems(
        this.item,
      );
      Logger.debug(
        "All embedded items export completed",
        results,
        "ITEM_SHEET",
      );
    } catch (error) {
      Logger.error("Failed to export all embedded items", error, "ITEM_SHEET");
    }
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

    // Clean up item selectors
    this._cleanupItemSelectors();

    // Clean up theme management from mixin
    this._cleanupThemeManagement();

    // Clean up any lingering scrollbar hide styles
    if (this._scrollbarHideStyle) {
      this._scrollbarHideStyle.remove();
      this._scrollbarHideStyle = null;
    }

    // Re-enable any disabled drop zones globally
    if (this._enableAllDropZones) {
      this._enableAllDropZones();
    }
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
  #actionItemSelector; // Item selector for action items
  #effectsSelector; // Item selector for effects
  #transformationsSelector; // Item selector for transformations
  #combatPowersSelector; // Item selector for combat powers (transformations)
  #actionCardsSelector; // Item selector for action cards (transformations)

  /**
   * Override render method to preserve scroll position using the working pattern from creator-application.mjs
   * @param {boolean} force - Force a re-render
   * @param {Object} options - Render options
   * @returns {Promise<this>} The rendered application
   * @override
   */
  async render(force, options = {}) {
    // Find the actual scrolling element by checking what has scrollTop > 0
    let actualScrollingElement = null;
    let oldPosition = 0;

    if (this.element) {
      // Check all elements for scrollTop > 0
      const allElements = Array.from(this.element.querySelectorAll("*"));
      const scrollableElements = allElements.filter((el) => el.scrollTop > 0);

      if (scrollableElements.length > 0) {
        actualScrollingElement = scrollableElements[0];
        oldPosition = actualScrollingElement.scrollTop;
      }
    }

    // Call parent render
    const result = await super.render(force, options);

    // Restore scroll position
    if (actualScrollingElement && oldPosition > 0) {
      // Find the element again after render
      let restoreElement = null;
      if (actualScrollingElement.className) {
        restoreElement = this.element?.querySelector(
          `.${actualScrollingElement.className.split(" ").join(".")}`,
        );
      }
      if (!restoreElement && actualScrollingElement.tagName) {
        const selector =
          actualScrollingElement.tagName.toLowerCase() +
          (actualScrollingElement.className
            ? `.${actualScrollingElement.className.split(" ").join(".")}`
            : "");
        restoreElement = this.element?.querySelector(selector);
      }

      if (restoreElement) {
        restoreElement.scrollTop = oldPosition;
      }
    }

    return result;
  }

  /**
   * Create context menus for features (on feature item sheets)
   * @private
   */
  _createFeatureContextMenu() {
    // Only create if this is a feature item sheet
    // Context menu for converting to status
    // Implementation would go here if needed for individual feature sheets
  }

  /**
   * Create context menus for status effects (on status item sheets)
   * @private
   */
  _createStatusContextMenu() {
    // Only create if this is a status item sheet
    // Context menu for converting to feature
    // Implementation would go here if needed for individual status sheets
  }

  /**
   * Create context menus for gear (on gear item sheets)
   * @private
   */
  _createGearContextMenu() {
    // Only create if this is a gear item sheet
    // Placeholder for future gear-specific options
  }

  /**
   * Create context menus for combat powers (on combat power item sheets)
   * @private
   */
  _createCombatPowerContextMenu() {
    // Only create if this is a combat power item sheet
    // Placeholder for future combat power-specific options
  }

  /**
   * Pre-close lifecycle hook for diagnostic logging
   * This helps track why item sheets are closing unexpectedly
   * @param {Object} options - Close options
   * @returns {Promise<void>}
   * @protected
   * @override
   */
  async _preClose(options = {}) {
    return super._preClose?.(options);
  }

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
