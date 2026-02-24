import { Logger } from "../../services/_module.mjs";
import { ErrorHandler, CommonFoundryTasks } from "../../utils/_module.mjs";
import { BaselineSheetMixins } from "../components/_module.mjs";
import { ItemSheetAllMixins } from "../mixins/_module.mjs";
import { EmbeddedItemSheet } from "./embedded-item-sheet.mjs";
import { ItemSelectorManager } from "../../services/item-selector-manager.mjs";
import { ExportActionHandler } from "../../services/export-action-handler.mjs";
import { FormFieldHelper } from "../../services/form-field-helper.mjs";
import { ContextPreparationHelper } from "../../services/context-preparation-helper.mjs";

const { api, sheets } = foundry.applications;

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
        exportEmbeddedCombatPowers: (e, t) => this._handleExportAction('exportEmbeddedCombatPowers', e, t),
        exportEmbeddedActionCards: (e, t) => this._handleExportAction('exportEmbeddedActionCards', e, t),
        exportEmbeddedActionItem: (e, t) => this._handleExportAction('exportEmbeddedActionItem', e, t),
        exportEmbeddedEffects: (e, t) => this._handleExportAction('exportEmbeddedEffects', e, t),
        exportEmbeddedTransformations: (e, t) => this._handleExportAction('exportEmbeddedTransformations', e, t),
        exportAllEmbeddedItems: (e, t) => this._handleExportAction('exportAllEmbeddedItems', e, t),
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
        ContextPreparationHelper.prepareAttributesContext(partId, context);
        break;
      case "description":
        context.tab = context.tabs[partId];
        context.enrichedDescription =
          await ContextPreparationHelper.prepareDescriptionContext(
            this.item.system.description,
            this.item,
            this.document.isOwner,
          );
        break;
      case "prerequisites":
        ContextPreparationHelper.preparePrerequisitesContext(this.item, context);
        break;
      case "embeddedCombatPowers":
        context.tab = context.tabs[partId];
        Object.assign(
          context,
          ContextPreparationHelper.prepareEmbeddedCombatPowersContext(this.item),
        );
        break;
      case "embeddedActionCards":
        context.tab = context.tabs[partId];
        Object.assign(
          context,
          ContextPreparationHelper.prepareEmbeddedActionCardsContext(this.item),
        );
        break;
      case "embeddedItems":
        context.tab = context.tabs[partId];
        Object.assign(
          context,
          await ContextPreparationHelper.prepareEmbeddedItemsContext(this.item),
        );
        break;
      case "effects":
        await ContextPreparationHelper.prepareEffectsContext(
          this.item.effects,
          context,
        );
        break;
      case "characterEffects":
        await ContextPreparationHelper.prepareCharacterEffectsContext(
          this.item.effects,
          context,
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

    // Add export controls using the service
    if (game.user.isGM) {
      const exportControls = ExportActionHandler.getHeaderControls(this.item);
      controls.push(...exportControls);
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
    this.#formChanged = true;

    // Use FormFieldHelper for color and damage formula handling
    const fieldResult = FormFieldHelper.handleFieldSync(event, this.item);
    
    if (fieldResult.normalizedValue !== undefined) {
      event.target.value = fieldResult.normalizedValue;
    }
    
    if (fieldResult.shouldUpdate && fieldResult.updateData) {
      await this.item.update(fieldResult.updateData);
      return;
    }

    // Handle character effects
    if (event.target.name.includes("characterEffects")) {
      await this._updateCharacterEffects();
      event.target.focus();
      return;
    }

    // Check if this is a temporary action card from a transformation
    if (this._isTransformationActionCard()) {
      await this._onChangeTransformationActionCard(formConfig, event);
      return;
    }

    // Handle icon tint changes for regular items
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
   * Initialize item selector combo boxes for action cards
   * @protected
   */
  async _initializeItemSelectors() {
    try {
      // Only initialize for action card and transformation items
      if (this.item.type !== "actionCard" && this.item.type !== "transformation") {
        return;
      }

      // Clean up existing selectors
      this._cleanupItemSelectors();

      // Determine which selectors to initialize based on item type
      const selectorTypes = ['action-item', 'effects'];
      
      if (this.item.type === "actionCard") {
        selectorTypes.push('transformations');
      }
      
      if (this.item.type === "transformation") {
        selectorTypes.push('transformations', 'combat-powers', 'action-cards');
      }

      // Initialize selectors using the service
      this._selectors = ItemSelectorManager.initializeSelectors(this, selectorTypes);
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
      if (this._selectors) {
        ItemSelectorManager.cleanupSelectors(this, this._selectors);
        this._selectors = null;
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
   * Handle export actions using the ExportActionHandler service
   * @param {string} actionKey - The export action key to execute
   * @param {Event} _event - The triggering event
   * @param {HTMLElement} _target - The clicked element
   * @returns {Promise<void>}
   * @protected
   */
  async _handleExportAction(actionKey, _event, _target) {
    try {
      await ExportActionHandler.executeExport(actionKey, this.item);
    } catch (error) {
      Logger.error(`Failed to execute export action: ${actionKey}`, error, "ITEM_SHEET");
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
  _selectors; // Item selectors managed by ItemSelectorManager

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
