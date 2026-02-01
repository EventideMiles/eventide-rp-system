import { CommonFoundryTasks } from "../../utils/_module.mjs";
import { Logger } from "../../services/_module.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";
import {
  initTabContainerStyling,
  cleanupTabContainerStyling,
} from "../../helpers/tab-container-styling.mjs";
import { BaselineSheetMixins } from "../components/_module.mjs";
import {
  ActorSheetActionsMixin,
  ActorSheetAllMixins,
} from "../mixins/_module.mjs";

const { sheets } = foundry.applications;
const { TextEditor } = foundry.applications.ux;

/**
 * Eventide RP System Actor Sheet
 *
 * Heavily refactored using mixins to improve maintainability and reduce file size.
 * Functionality is now provided by multiple focused mixins:
 * - ActorSheetActionsMixin: Gear, document, transformation, and drag/drop actions
 * - ActorSheetStatusBarMixin: Status bar scrolling functionality
 * - ActorSheetThemeMixin: Theme management and cycling
 * - ActorSheetGearTabsMixin: Gear tab switching with state preservation
 * - ActorSheetAdditionalActionsMixin: Image editing, effects, rolls, action cards
 * - ActorSheetFormOverrideMixin: Form validation and field disabling
 * - ActorSheetContextPreparationMixin: Context and item preparation
 *
 * @extends {ActorSheetV2}
 */
export class EventideRpSystemActorSheet extends ActorSheetAllMixins(
  ActorSheetActionsMixin(BaselineSheetMixins(sheets.ActorSheetV2)),
) {
  constructor(options = {}) {
    try {
      super(options);
      // Note: All functionality is now provided by mixins
    } catch (error) {
      Logger.error("Failed to initialize actor sheet", error, "ACTOR_SHEET");
      throw error;
    }
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: [
      // "eventide-rp-system",
      "eventide-sheet",
      "eventide-sheet--scrollbars",
    ],
    position: {
      width: 920,
      height: 950,
    },
    window: {
      resizable: true,
      controls: [
        ...super.DEFAULT_OPTIONS.window.controls.filter(
          (control) =>
            ![
              "configureToken",
              "showArtwork",
              "showTokenArtwork",
              "configurePrototypeToken",
              "showPortraitArtwork",
            ].includes(control.action),
        ),
        {
          action: "configureToken",
          icon: "fas fa-user-circle",
          label: "EVENTIDE_RP_SYSTEM.WindowTitles.ConfigureToken",
          ownership: "OWNER",
        },
        {
          action: "setSheetTheme",
          icon: "fas fa-palette",
          label: "EVENTIDE_RP_SYSTEM.WindowTitles.SheetTheme",
          ownership: "OWNER",
        },
      ],
    },
    actions: {
      onEditImage: this._onEditImage,
      viewDoc: this._viewDoc,
      createDoc: this._createDoc,
      deleteDoc: this._deleteDoc,
      toggleEffect: this._toggleEffect,
      roll: this._onRoll,
      toggleGear: this._toggleGear,
      incrementGear: this._incrementGear,
      decrementGear: this._decrementGear,
      applyTransformation: this._applyTransformation,
      removeTransformation: this._removeTransformation,
      toggleAutoTokenUpdate: this._toggleAutoTokenUpdate,
      configureToken: this._onConfigureToken,
      setSheetTheme: this._setSheetTheme,
      executeActionCard: this._executeActionCard,
      toggleGroupCollapse: this._toggleGroupCollapse,
      deleteGroup: this._deleteActionCardGroup,
      createGroup: this._createActionCardGroup,
    },
    // Custom property that's merged into `this.options`
    dragDrop: [
      {
        dragSelector:
          "[data-drag], .erps-data-table__row[data-item-id], .erps-data-table__row[data-document-class], .eventide-transformation-card[data-item-id]",
        dropSelector: null,
      },
    ],
    form: {
      submitOnChange: true,
    },
  };

  /** @override */
  static PARTS = {
    header: {
      template: "systems/eventide-rp-system/templates/actor/header.hbs",
    },
    tabs: {
      // Foundry-provided generic template
      template: "templates/generic/tab-navigation.hbs",
    },
    features: {
      template: "systems/eventide-rp-system/templates/actor/features.hbs",
    },
    biography: {
      template: "systems/eventide-rp-system/templates/actor/biography.hbs",
    },
    statuses: {
      template: "systems/eventide-rp-system/templates/actor/statuses.hbs",
    },
    gear: {
      template: "systems/eventide-rp-system/templates/actor/gear.hbs",
    },
    combatPowers: {
      template: "systems/eventide-rp-system/templates/actor/combat-powers.hbs",
    },
    actionCards: {
      template: "systems/eventide-rp-system/templates/actor/action-cards.hbs",
    },
    gmActionCards: {
      template: "systems/eventide-rp-system/templates/actor/gm-action-cards.hbs",
    },
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    // Not all parts always render
    options.parts = [
      "header",
      "tabs",
      "features",
      "combatPowers",
      "actionCards",
    ];

    // Add GM Action Cards tab right after Action Cards for GMs
    if (game.user.isGM) {
      options.parts.push("gmActionCards");
      // Increase width for GMs to accommodate extra tab
      if (!options.position) options.position = {};
      options.position.width = 1020;
    }

    // Add remaining tabs
    options.parts.push("biography", "statuses", "gear");

    // Don't show the other tabs if only limited view
    if (this.document.limited) {
      options.parts = ["header", "tabs", "biography"];
    }
    // Control which parts show based on document subtype
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    try {
      // Output initialization
      const context = {
        // Validates both permissions and compendium status
        editable: this.isEditable,
        owner: this.document.isOwner,
        limited: this.document.limited,
        // Add the actor document.
        actor: this.actor,
        // Add the actor's data to context.data for easier access, as well as flags.
        system: this.actor.system,
        flags: this.actor.flags,
        // Adding a pointer to CONFIG.EVENTIDE_RP_SYSTEM
        config: CONFIG.EVENTIDE_RP_SYSTEM,
        tabs: this._getTabs(options.parts),
        // Necessary for formInput and formFields helpers
        fields: this.document.schema.fields,
        systemFields: this.document.system.schema.fields,
        isGM: game.user.isGM,
        lowHealth:
          this.actor.system.resolve.value / this.actor.system.resolve.max <=
          0.3,
        // Add user's theme preference with debugging
        userSheetTheme: (() => {
          const theme = CommonFoundryTasks.retrieveSheetTheme();
          return theme;
        })(),
      };

      // Use mixin for context preparation
      const enrichedContext = this._prepareSheetContext(context);

      return enrichedContext;
    } catch (error) {
      await ErrorHandler.handleAsync(Promise.reject(error), {
        context: "Actor sheet context preparation",
        errorType: ErrorHandler.ERROR_TYPES.UI,
        userMessage: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Errors.SheetContextFailed",
        ),
      });

      // Return minimal fallback context
      return {
        editable: false,
        owner: false,
        limited: true,
        actor: this.actor,
        system: this.actor?.system || {},
        flags: this.actor?.flags || {},
        config: CONFIG.EVENTIDE_RP_SYSTEM,
        tabs: this._getTabs(options.parts),
      };
    }
  }

  /** @override */
  async _preparePartContext(partId, context) {
    try {
      switch (partId) {
        case "gear":
          context.tab = context.tabs[partId];
          break;
        case "features":
        case "statuses":
        case "combatPowers":
        case "actionCards":
        case "gmActionCards":
          context.tab = context.tabs[partId];
          break;
        case "biography":
          context.tab = context.tabs[partId];
          // Enrich biography info for display
          // Enrichment turns text like `[[/r 1d20]]` into buttons
          try {
            context.enrichedBiography =
              await TextEditor.implementation.enrichHTML(
                this.actor.system.biography,
                {
                  // Whether to show secret blocks in the finished html
                  secrets: this.document.isOwner,
                  // Data to fill in for inline rolls
                  rollData: this.actor.getRollData(),
                  // Relative UUID resolution
                  relativeTo: this.actor,
                },
              );
          } catch (enrichError) {
            Logger.warn(
              "Failed to enrich biography HTML",
              enrichError,
              "ACTOR_SHEET",
            );
            // Fallback to plain text
            context.enrichedBiography = this.actor.system.biography || "";
          }
          break;
      }

      // Get roll formulas with error handling
      try {
        context.formulas = await this.actor.getRollFormulas();
      } catch (formulaError) {
        Logger.warn("Failed to get roll formulas", formulaError, "ACTOR_SHEET");
        context.formulas = {};
      }

      return context;
    } catch (error) {
      Logger.error(
        `Failed to prepare part context for ${partId}`,
        error,
        "ACTOR_SHEET",
      );

      // Return context with minimal fallback
      context.tab = context.tabs?.[partId] || {};
      context.formulas = {};
      if (partId === "biography") {
        context.enrichedBiography = this.actor?.system?.biography || "";
      }

      return context;
    }
  }

  /**
   * Generates the data for the generic tab navigation template
   * @param {string[]} parts An array of named template parts to render
   * @returns {Record<string, Partial<ApplicationTab>>>}
   * @protected
   */
  _getTabs(parts) {
    // If you have sub-tabs this is necessary to change
    const tabGroup = "primary";

    // If no tab is selected yet, use the default from settings
    if (!this.tabGroups[tabGroup]) {
      this.tabGroups[tabGroup] = this.defaultTab;
    }

    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: "",
        group: tabGroup,
        // Matches tab property to
        id: "",
        // FontAwesome Icon, if you so choose
        icon: "",
        // Run through localization
        label: "EVENTIDE_RP_SYSTEM.Actor.Tabs.",
      };
      switch (partId) {
        case "header":
        case "tabs":
          return tabs;
        case "combatPowers":
          tab.id = "combatPowers";
          tab.label += "CombatPowers";
          break;
        case "actionCards":
          tab.id = "actionCards";
          tab.label += "ActionCards";
          break;
        case "gmActionCards":
          tab.id = "gmActionCards";
          tab.label += "GmActionCards";
          tab.icon = "fas fa-eye-slash";
          break;
        case "biography":
          tab.id = "biography";
          tab.label += "Biography";
          break;
        case "features":
          tab.id = "features";
          tab.label += "Features";
          break;
        case "gear":
          tab.id = "gear";
          tab.label += "Gear";
          break;
        case "statuses":
          tab.id = "statuses";
          tab.label += "Statuses";
          break;
      }
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = "active";
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  /**
   * Get the default tab for this sheet from settings
   * @returns {string} The default tab ID
   */
  get defaultTab() {
    // Default to "features" if settings aren't available
    let defaultTab = "features";

    // Try to get the setting if available
    if (game.settings && game.settings.get) {
      try {
        defaultTab = game.settings.get(
          "eventide-rp-system",
          "defaultCharacterTab",
        );
      } catch (error) {
        Logger.warn(
          "Could not get default tab setting, using 'features'",
          error,
          "ACTOR_SHEET",
        );
      }
    }

    return defaultTab;
  }

  // Note: Item preparation is now handled by ActorSheetContextPreparationMixin

  /**
   * Actions performed after any render of this Application.
   * Post-render steps are not awaited by the render process.
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   * @override
   */
  /** @override */
  async _onFirstRender(_context, _options) {
    await super._onFirstRender(_context, _options);

    // Initialize context menus (only once)
    this._createActionCardContextMenu();
    this._createFeatureContextMenu();
    this._createStatusContextMenu();
    this._createGearContextMenu();
    this._createCombatPowerContextMenu();
    this._createGroupHeaderContextMenu();
  }

  _onRender(_context, _options) {
    // Clean up any orphaned scrollbar-hide styles from other sheets
    this._cleanupOrphanedScrollbarStyles();

    // Bind drag drop handlers
    if (this.dragDrop && this.dragDrop.length > 0) {
      this.dragDrop.forEach((d) => {
        d.bind(this.element);
      });
    } else {
      Logger.warn(
        "No drag drop handlers available",
        {
          dragDrop: this.dragDrop,
          hasDragDrop: !!this.dragDrop,
          dragDropLength: this.dragDrop?.length,
        },
        "ACTOR_SHEET",
      );
    }

    // Initialize all mixin functionality
    this._initFormOverrides();
    this._initThemeManagement();
    this._initStatusBarScrolling();
    this._initGearTabManagement();

    // Initialize tab container styling (dynamic border radius based on active tab)
    initTabContainerStyling(this.element);

    // Manually bind context menus to ensure they work with dynamically rendered tabs
    this._bindAllContextMenus();

    // Debug the transformation display
    if (CommonFoundryTasks.isTestingMode) this._debugTransformation();

    // You may want to add other special handling here
    // Foundry comes with a large number of utility classes, e.g. SearchFilter
    // That you may want to implement yourself.
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
      this._actionCardContextMenu,
      this._groupHeaderContextMenu,
      this._featureContextMenu,
      this._statusContextMenu,
      this._gearContextMenu,
      this._combatPowerContextMenu,
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

  // Note: Theme management is now handled by ActorSheetThemeMixin

  // Note: Status bar scrolling is now handled by ActorSheetStatusBarMixin

  /**
   * Wrapper for creating context menus with overflow handling and drop zone disabling
   * This fixes the issue where context menus get clipped by parent containers with overflow:hidden
   * and disables drop zones to prevent focus fighting between context menu and drop zones
   *
   * @param {ContextMenu} contextMenu - The context menu instance to enhance
   * @param {string} stopSelector - CSS selector for the container to stop at when searching for overflow parents
   * @private
   */
  _enhanceContextMenuWithOverflowFix(contextMenu, stopSelector = ".window-content") {
    if (!contextMenu) return;

    // Check if this context menu has already been enhanced
    // This prevents duplicate onOpen/onClose handlers when context menus are rebound
    if (contextMenu._erpsOverflowFixApplied) {
      return;
    }

    // Mark this context menu as enhanced to prevent duplicate enhancement
    contextMenu._erpsOverflowFixApplied = true;

    // Override the onOpen callback to fix overflow clipping and disable drop zones
    const originalOnOpen = contextMenu.onOpen;
    contextMenu.onOpen = (target) => {
      // Find parent containers with overflow hidden
      const containers = [];
      let current = target;

      // Stop at the specified container
      const stopElement = target.closest(stopSelector);

      while (current && current !== stopElement) {
        const computedStyle = window.getComputedStyle(current);

        // Check any element with overflow hidden
        if (
          computedStyle.overflow === "hidden" ||
          computedStyle.overflowY === "hidden"
        ) {
          containers.push({
            element: current,
            overflow: current.style.overflow,
            overflowY: current.style.overflowY,
          });
          current.style.setProperty("overflow", "visible", "important");
          current.style.setProperty("overflowY", "visible", "important");
        }
        current = current.parentElement;
      }
      // Store for restoration
      this._overflowContainers = containers;

      // Disable ALL drop zones globally while context menu is open
      this._disableAllDropZones();

      // Add scoped style to hide scrollbars only for this specific sheet instance
      const scrollbarHideStyle = document.createElement("style");
      scrollbarHideStyle.id = `erps-context-menu-scrollbar-hide-${this.id}`;

      // Get unique identifier for this sheet to scope the style
      const sheetId = this.element.id || this.element.getAttribute('data-appid');

      scrollbarHideStyle.textContent = `
        #${sheetId} *,
        #${sheetId} *::before,
        #${sheetId} *::after {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        #${sheetId} *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `;
      document.head.appendChild(scrollbarHideStyle);
      this._scrollbarHideStyle = scrollbarHideStyle;

      if (originalOnOpen) originalOnOpen.call(contextMenu, target);
    };

    // Override the onClose callback to restore overflow and re-enable drop zones
    const originalOnClose = contextMenu.onClose;
    contextMenu.onClose = () => {
      // Call original close first to allow animation to complete
      if (originalOnClose) originalOnClose.call(contextMenu);

      // Delay restoration to allow ContextMenu animation to complete
      // The animation uses getBoundingClientRect which needs the menu visible
      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          // Restore all overflow values
          if (this._overflowContainers) {
            for (const {
              element,
              overflow,
              overflowY,
            } of this._overflowContainers) {
              element.style.overflow = overflow;
              element.style.overflowY = overflowY;
            }
            this._overflowContainers = [];
          }
          // Remove scrollbar hide style
          if (this._scrollbarHideStyle) {
            this._scrollbarHideStyle.remove();
            this._scrollbarHideStyle = null;
          }

          // Force scrollbars to redisplay by triggering a reflow
          // This ensures the browser recalculates scrollbar visibility
          if (this.element) {
            // eslint-disable-next-line no-unused-expressions
            this.element.offsetHeight; // Force reflow
          }

          // Re-enable ALL drop zones globally
          this._enableAllDropZones();
        }, 100); // Wait for animation to complete (Foundry's default is ~50ms)
      });
    };
  }

  /**
   * Disable ALL drop zones globally to prevent focus fighting with context menus
   * This affects drop zones across all sheets, including item sheets
   * @private
   */
  _disableAllDropZones() {
    const dropZones = document.querySelectorAll("[data-drop-zone]");
    dropZones.forEach((zone) => {
      zone.classList.add("erps-drop-zone-disabled");
      zone.style.pointerEvents = "none";
    });
  }

  /**
   * Re-enable ALL drop zones globally after context menu closes
   * @private
   */
  _enableAllDropZones() {
    const dropZones = document.querySelectorAll("[data-drop-zone]");
    dropZones.forEach((zone) => {
      zone.classList.remove("erps-drop-zone-disabled");
      zone.style.pointerEvents = "";
    });
  }

  /**
   * Create context menu for action cards to move them between groups
   * @private
   */
  _createActionCardContextMenu() {
    const contextMenu = this._createContextMenu(
      () => this._getActionCardContextOptions(),
      ".tab.action-cards .erps-data-table__row[data-item-id], .tab.action-cards .erps-data-table__body, .tab.action-cards .erps-data-table__header, .tab.action-cards .erps-action-card-ungrouped__content",
    );

    // Store reference for potential cleanup
    if (contextMenu) {
      this._actionCardContextMenu = contextMenu;

      // Apply overflow fix - stop at the action cards tab
      this._enhanceContextMenuWithOverflowFix(contextMenu, ".tab.action-cards");
    }
  }

  /**
   * Get context menu options for action cards
   * @returns {Array<ContextMenuEntry>} Array of context menu entries
   * @private
   */
  _getActionCardContextOptions() {
    const groups = this.actor.system.actionCardGroups || [];

    return [
      // Creation options (blank area only)
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewActionCard",
        icon: '<i class="fas fa-plus"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("actionCard");
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewFeature",
        icon: '<i class="fas fa-star"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("feature");
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewStatus",
        icon: '<i class="fas fa-circle-notch"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("status");
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewGear",
        icon: '<i class="fas fa-suitcase"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("gear");
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewCombatPower",
        icon: '<i class="fas fa-fist-raised"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("combatPower");
        },
      },
      // Item actions (item-specific)
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.Edit",
        icon: '<i class="fas fa-edit"></i>',
        condition: (target) => !!target.dataset.itemId,
        callback: async (target) => {
          const itemId = target.dataset.itemId;
          const item = this.actor.items.get(itemId);
          if (item) {
            item.sheet.render(true);
          }
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.Duplicate",
        icon: '<i class="fas fa-copy"></i>',
        condition: (target) => !!target.dataset.itemId,
        callback: async (target) => {
          const itemId = target.dataset.itemId;
          await this._duplicateItem(itemId);
        },
      },
      // Group management (action cards only)
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.MoveToGroup",
        icon: '<i class="fas fa-folder-open"></i>',
        condition: (target) => !!target.dataset.itemId,
        callback: (target) => {
          const itemId = target.dataset.itemId;
          this._showMoveToGroupDialog(itemId, groups);
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.RemoveFromGroup",
        icon: '<i class="fas fa-folder-minus"></i>',
        condition: (target) => {
          const itemId = target.dataset.itemId;
          const item = this.actor.items.get(itemId);
          return item && item.system.groupId;
        },
        callback: async (target) => {
          const itemId = target.dataset.itemId;
          const item = this.actor.items.get(itemId);
          if (item && item.system.groupId) {
            const oldGroupId = item.system.groupId;
            await item.update({ "system.groupId": null });
            // Check if group should be dissolved
            await this._checkGroupDissolution(oldGroupId);
            // Clean up any empty groups
            await this._cleanupEmptyGroups();
          }
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewGroup",
        icon: '<i class="fas fa-folder-plus"></i>',
        condition: (target) => !!target.dataset.itemId,
        callback: async (target) => {
          const itemId = target.dataset.itemId;
          const groupId = await this._createActionCardGroup(null, null, [
            itemId,
          ]);
          if (groupId) {
            const item = this.actor.items.get(itemId);
            if (item) {
              await item.update({ "system.groupId": groupId });
            }
          }
        },
      },
      // Destructive actions (item-specific)
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.Delete",
        icon: '<i class="fas fa-trash"></i>',
        condition: (target) => !!target.dataset.itemId,
        callback: async (target) => {
          await this._deleteItemWithConfirmation(target);
        },
      },
    ];
  }

  /**
   * Show dialog to select which group to move the action card to
   * @param {string} itemId - The ID of the action card item
   * @param {Array} groups - Array of available groups
   * @private
   */
  async _showMoveToGroupDialog(itemId, groups) {
    const item = this.actor.items.get(itemId);
    if (!item) return;

    // Check if there are no groups available
    const currentGroupId = item.system.groupId;
    const availableGroups = groups.filter((g) => g._id !== currentGroupId);

    if (availableGroups.length === 0) {
      ui.notifications.warn(
        game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.ContextMenu.NoGroupsAvailable",
        ),
      );
      return;
    }

    // Build list of groups excluding current group
    const groupChoices = availableGroups
      .map(
        (g) =>
          `<option value="${g._id}">${game.i18n.localize(g.name)}</option>`,
      )
      .join("");

    const content = `
      <div class="form-group">
        <label>${game.i18n.localize("EVENTIDE_RP_SYSTEM.ContextMenu.SelectGroup")}</label>
        <select name="groupId" autofocus>
          ${groupChoices}
        </select>
      </div>
    `;

    const groupId = await foundry.applications.api.DialogV2.prompt({
      window: {
        title: game.i18n.localize("EVENTIDE_RP_SYSTEM.ContextMenu.MoveToGroup"),
      },
      content,
      ok: {
        label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Confirm"),
        callback: (event, button, _dialog) =>
          button.form.elements.groupId.value,
      },
      rejectClose: false,
      modal: true,
      position: {
        width: 300,
      },
    });

    if (groupId) {
      const oldGroupId = item.system.groupId;
      await item.update({ "system.groupId": groupId });

      // Check if old group should be dissolved
      if (oldGroupId) {
        await this._checkGroupDissolution(oldGroupId);
      }

      // Clean up any empty groups
      await this._cleanupEmptyGroups();
    }
  }

  /**
   * Create context menu for group headers
   * @private
   */
  _createGroupHeaderContextMenu() {
    const contextMenu = this._createContextMenu(
      () => this._getGroupHeaderContextOptions(),
      ".erps-action-card-group__header",
    );

    if (contextMenu) {
      this._groupHeaderContextMenu = contextMenu;
      this._enhanceContextMenuWithOverflowFix(contextMenu, ".tab.action-cards");
    }
  }

  /**
   * Get context menu options for group headers
   * @returns {Array<ContextMenuEntry>} Array of context menu entries
   * @private
   */
  _getGroupHeaderContextOptions() {
    return [
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateActionInGroup",
        icon: '<i class="fas fa-plus"></i>',
        callback: async (target) => {
          const groupId =
            target.dataset.groupId ||
            target.closest("[data-group-id]")?.dataset.groupId;
          if (groupId) {
            const created = await this.actor.createEmbeddedDocuments("Item", [
              {
                name: game.i18n.localize(
                  "EVENTIDE_RP_SYSTEM.Item.New.ActionCard",
                ),
                type: "actionCard",
                system: { groupId },
              },
            ]);
            if (created && created[0]) {
              created[0].sheet.render(true);
            }
          }
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.DuplicateGroup",
        icon: '<i class="fas fa-clone"></i>',
        callback: async (target) => {
          const groupId =
            target.dataset.groupId ||
            target.closest("[data-group-id]")?.dataset.groupId;
          if (groupId) {
            await this._duplicateActionCardGroup(groupId);
          }
        },
      },
    ];
  }

  /**
   * Create context menus for features
   * @private
   */
  _createFeatureContextMenu() {
    const contextMenu = this._createContextMenu(
      () => this._getFeatureContextOptions(),
      ".tab.features .erps-data-table__row[data-item-id], .tab.features .erps-data-table__body, .tab.features .erps-data-table__header",
    );

    if (contextMenu) {
      this._featureContextMenu = contextMenu;
      this._enhanceContextMenuWithOverflowFix(contextMenu, ".tab.features");
    }
  }

  /**
   * Get context menu options for features
   * @returns {Array<ContextMenuEntry>} Array of context menu entries
   * @private
   */
  _getFeatureContextOptions() {
    return [
      // Creation options (blank area only)
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewFeature",
        icon: '<i class="fas fa-plus"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("feature");
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewActionCard",
        icon: '<i class="fas fa-bolt"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("actionCard");
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewStatus",
        icon: '<i class="fas fa-circle-notch"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("status");
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewGear",
        icon: '<i class="fas fa-suitcase"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("gear");
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewCombatPower",
        icon: '<i class="fas fa-fist-raised"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("combatPower");
        },
      },
      // Item actions (item-specific)
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.Edit",
        icon: '<i class="fas fa-edit"></i>',
        condition: (target) => !!target.dataset.itemId,
        callback: async (target) => {
          const itemId = target.dataset.itemId;
          const item = this.actor.items.get(itemId);
          if (item) {
            item.sheet.render(true);
          }
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.Duplicate",
        icon: '<i class="fas fa-copy"></i>',
        condition: (target) => !!target.dataset.itemId,
        callback: async (target) => {
          const itemId = target.dataset.itemId;
          await this._duplicateItem(itemId);
        },
      },
      // Conversion actions (item-specific)
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.ConvertToStatus",
        icon: '<i class="fas fa-exchange-alt"></i>',
        condition: (target) => !!target.dataset.itemId,
        callback: async (target) => {
          const itemId = target.dataset.itemId;
          await this._convertFeatureToStatus(itemId);
        },
      },
      // Destructive actions (item-specific)
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.Delete",
        icon: '<i class="fas fa-trash"></i>',
        condition: (target) => !!target.dataset.itemId,
        callback: async (target) => {
          await this._deleteItemWithConfirmation(target);
        },
      },
    ];
  }

  /**
   * Convert a feature to a status effect
   * @param {string} itemId - The ID of the feature item
   * @private
   */
  async _convertFeatureToStatus(itemId) {
    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "feature") return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.ContextMenu.ConvertToStatus",
        ),
      },
      content: `<p>${game.i18n.format("EVENTIDE_RP_SYSTEM.ContextMenu.ConvertConfirm", { name: item.name, from: game.i18n.localize("TYPES.Item.feature"), to: game.i18n.localize("TYPES.Item.status") })}</p>`,
      rejectClose: false,
      modal: true,
    });

    if (!confirmed) return;

    // Preserve active effects
    const effects = item.effects.map((e) => e.toObject());

    const statusData = {
      name: item.name,
      type: "status",
      img: item.img,
      system: {
        description: item.system.description || "",
        bgColor: item.system.bgColor || "#7A70B8",
        textColor: item.system.textColor || "#ffffff",
      },
      effects,
    };

    await this.actor.createEmbeddedDocuments("Item", [statusData]);
    await item.delete();

    ui.notifications.info(
      game.i18n.format("EVENTIDE_RP_SYSTEM.ContextMenu.ConvertSuccess", {
        name: item.name,
        type: game.i18n.localize("TYPES.Item.status"),
      }),
    );
  }

  /**
   * Create context menus for status effects
   * @private
   */
  _createStatusContextMenu() {
    const contextMenu = this._createContextMenu(
      () => this._getStatusContextOptions(),
      ".tab.statuses .erps-data-table__row[data-item-id], .tab.statuses .erps-data-table__body, .tab.statuses .erps-data-table__header",
    );

    if (contextMenu) {
      this._statusContextMenu = contextMenu;
      this._enhanceContextMenuWithOverflowFix(contextMenu, ".tab.statuses");
    }
  }

  /**
   * Get context menu options for status effects
   * @returns {Array<ContextMenuEntry>} Array of context menu entries
   * @private
   */
  _getStatusContextOptions() {
    return [
      // Creation options (blank area only)
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewStatus",
        icon: '<i class="fas fa-plus"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("status");
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewActionCard",
        icon: '<i class="fas fa-bolt"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("actionCard");
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewFeature",
        icon: '<i class="fas fa-star"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("feature");
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewGear",
        icon: '<i class="fas fa-suitcase"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("gear");
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewCombatPower",
        icon: '<i class="fas fa-fist-raised"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("combatPower");
        },
      },
      // Item actions (item-specific)
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.Edit",
        icon: '<i class="fas fa-edit"></i>',
        condition: (target) => !!target.dataset.itemId,
        callback: async (target) => {
          const itemId = target.dataset.itemId;
          const item = this.actor.items.get(itemId);
          if (item) {
            item.sheet.render(true);
          }
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.Duplicate",
        icon: '<i class="fas fa-copy"></i>',
        condition: (target) => !!target.dataset.itemId,
        callback: async (target) => {
          const itemId = target.dataset.itemId;
          await this._duplicateItem(itemId);
        },
      },
      // Conversion actions (item-specific)
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.ConvertToFeature",
        icon: '<i class="fas fa-exchange-alt"></i>',
        condition: (target) => !!target.dataset.itemId,
        callback: async (target) => {
          const itemId = target.dataset.itemId;
          await this._convertStatusToFeature(itemId);
        },
      },
      // Destructive actions (item-specific)
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.Delete",
        icon: '<i class="fas fa-trash"></i>',
        condition: (target) => !!target.dataset.itemId,
        callback: async (target) => {
          await this._deleteItemWithConfirmation(target);
        },
      },
    ];
  }

  /**
   * Convert a status effect to a feature
   * @param {string} itemId - The ID of the status item
   * @private
   */
  async _convertStatusToFeature(itemId) {
    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "status") return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.ContextMenu.ConvertToFeature",
        ),
      },
      content: `<p>${game.i18n.format("EVENTIDE_RP_SYSTEM.ContextMenu.ConvertConfirm", { name: item.name, from: game.i18n.localize("TYPES.Item.status"), to: game.i18n.localize("TYPES.Item.feature") })}</p>`,
      rejectClose: false,
      modal: true,
    });

    if (!confirmed) return;

    // Preserve active effects
    const effects = item.effects.map((e) => e.toObject());

    const featureData = {
      name: item.name,
      type: "feature",
      img: item.img,
      system: {
        description: item.system.description || "",
        bgColor: item.system.bgColor || "#70B87A",
        textColor: item.system.textColor || "#ffffff",
        roll: {
          type: "none",
          ability: "unaugmented",
          bonus: 0,
          diceAdjustments: {
            advantage: 0,
            disadvantage: 0,
            total: 0,
          },
        },
      },
      effects,
    };

    await this.actor.createEmbeddedDocuments("Item", [featureData]);
    await item.delete();

    ui.notifications.info(
      game.i18n.format("EVENTIDE_RP_SYSTEM.ContextMenu.ConvertSuccess", {
        name: item.name,
        type: game.i18n.localize("TYPES.Item.feature"),
      }),
    );
  }

  /**
   * Create context menus for gear
   * @private
   */
  _createGearContextMenu() {
    const contextMenu = this._createContextMenu(
      () => this._getGearContextOptions(),
      ".tab.gear .erps-data-table__row[data-item-id], .tab.gear .erps-data-table__body, .tab.gear .erps-data-table__header",
    );

    if (contextMenu) {
      this._gearContextMenu = contextMenu;
      this._enhanceContextMenuWithOverflowFix(contextMenu, ".tab.gear");
    }
  }

  /**
   * Get context menu options for gear
   * @returns {Array<ContextMenuEntry>} Array of context menu entries
   * @private
   */
  _getGearContextOptions() {
    return [
      // Creation options (blank area only)
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewGear",
        icon: '<i class="fas fa-plus"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("gear");
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewActionCard",
        icon: '<i class="fas fa-bolt"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("actionCard");
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewFeature",
        icon: '<i class="fas fa-star"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("feature");
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewStatus",
        icon: '<i class="fas fa-circle-notch"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("status");
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewCombatPower",
        icon: '<i class="fas fa-fist-raised"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("combatPower");
        },
      },
      // Item actions (item-specific)
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.Edit",
        icon: '<i class="fas fa-edit"></i>',
        condition: (target) => !!target.dataset.itemId,
        callback: async (target) => {
          const itemId = target.dataset.itemId;
          const item = this.actor.items.get(itemId);
          if (item) {
            item.sheet.render(true);
          }
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.Duplicate",
        icon: '<i class="fas fa-copy"></i>',
        condition: (target) => !!target.dataset.itemId,
        callback: async (target) => {
          const itemId = target.dataset.itemId;
          await this._duplicateItem(itemId);
        },
      },
      // Destructive actions (item-specific)
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.Delete",
        icon: '<i class="fas fa-trash"></i>',
        condition: (target) => !!target.dataset.itemId,
        callback: async (target) => {
          await this._deleteItemWithConfirmation(target);
        },
      },
    ];
  }

  /**
   * Create context menus for combat powers
   * @private
   */
  _createCombatPowerContextMenu() {
    const contextMenu = this._createContextMenu(
      () => this._getCombatPowerContextOptions(),
      ".tab.combat-powers .erps-data-table__row[data-item-id], .tab.combat-powers .erps-data-table__body, .tab.combat-powers .erps-data-table__header",
    );

    if (contextMenu) {
      this._combatPowerContextMenu = contextMenu;
      this._enhanceContextMenuWithOverflowFix(
        contextMenu,
        ".tab.combat-powers",
      );
    }
  }

  /**
   * Get context menu options for combat powers
   * @returns {Array<ContextMenuEntry>} Array of context menu entries
   * @private
   */
  _getCombatPowerContextOptions() {
    return [
      // Creation options (blank area only)
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewCombatPower",
        icon: '<i class="fas fa-plus"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("combatPower");
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewActionCard",
        icon: '<i class="fas fa-bolt"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("actionCard");
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewFeature",
        icon: '<i class="fas fa-star"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("feature");
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewStatus",
        icon: '<i class="fas fa-circle-notch"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("status");
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewGear",
        icon: '<i class="fas fa-suitcase"></i>',
        condition: (target) => !target.dataset.itemId,
        callback: async () => {
          await this._createItemInTab("gear");
        },
      },
      // Item actions (item-specific)
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.Edit",
        icon: '<i class="fas fa-edit"></i>',
        condition: (target) => !!target.dataset.itemId,
        callback: async (target) => {
          const itemId = target.dataset.itemId;
          const item = this.actor.items.get(itemId);
          if (item) {
            item.sheet.render(true);
          }
        },
      },
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.Duplicate",
        icon: '<i class="fas fa-copy"></i>',
        condition: (target) => !!target.dataset.itemId,
        callback: async (target) => {
          const itemId = target.dataset.itemId;
          await this._duplicateItem(itemId);
        },
      },
      // Destructive actions (item-specific)
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.Delete",
        icon: '<i class="fas fa-trash"></i>',
        condition: (target) => !!target.dataset.itemId,
        callback: async (target) => {
          await this._deleteItemWithConfirmation(target);
        },
      },
    ];
  }

  /**
   * Create an item in the appropriate tab
   * @param {string} itemType - The item type to create
   * @private
   */
  async _createItemInTab(itemType) {
    // Map item types to tab IDs
    const tabMap = {
      feature: "features",
      combatPower: "combatPowers",
      status: "statuses",
      gear: "gear",
      actionCard: "actionCards",
    };

    const tabId = tabMap[itemType];
    if (!tabId) return;

    // Switch to the correct tab
    if (this.tabGroups.primary !== tabId) {
      await this.changeTab(tabId, "primary");
    }

    // Create the item
    const created = await this.actor.createEmbeddedDocuments("Item", [
      {
        name: game.i18n.localize(
          `EVENTIDE_RP_SYSTEM.Item.New.${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`,
        ),
        type: itemType,
      },
    ]);

    // Open the item for editing
    if (created && created[0]) {
      created[0].sheet.render(true);
    }
  }

  /**
   * Duplicate an item
   * @param {string} itemId - The ID of the item to duplicate
   * @private
   */
  async _duplicateItem(itemId) {
    const item = this.actor.items.get(itemId);
    if (!item) return;

    // Clone the item data
    const itemData = item.toObject();
    itemData._id = foundry.utils.randomID();
    itemData.name = `${itemData.name} (Copy)`;

    // For action cards, keep the group assignment (as per user request)
    // No need to modify groupId, it will be preserved

    // Create the duplicate
    const created = await this.actor.createEmbeddedDocuments("Item", [
      itemData,
    ]);

    // Notify user
    if (created && created[0]) {
      ui.notifications.info(
        game.i18n.format("EVENTIDE_RP_SYSTEM.ContextMenu.DuplicateSuccess", {
          name: item.name,
        }),
      );

      // Open for editing
      created[0].sheet.render(true);
    }
  }

  /**
   * Duplicate an action card group
   * @param {string} groupId - The ID of the group to duplicate
   * @private
   */
  async _duplicateActionCardGroup(groupId) {
    const groups = this.actor.system.actionCardGroups || [];
    const sourceGroup = groups.find((g) => g._id === groupId);
    if (!sourceGroup) return;

    // Get all cards in this group
    const cardsInGroup = this.actor.items.filter(
      (item) => item.type === "actionCard" && item.system.groupId === groupId,
    );

    // Create new group
    const newGroupId = foundry.utils.randomID();
    const newGroup = {
      _id: newGroupId,
      name: `${sourceGroup.name} (Copy)`,
      sort: Math.max(...groups.map((g) => g.sort || 0), 0) + 1,
      collapsed: false,
    };

    // Duplicate all cards with new group assignment
    const duplicatedCards = cardsInGroup.map((card) => {
      const cardData = card.toObject();
      cardData._id = foundry.utils.randomID();
      cardData.name = `${cardData.name} (Copy)`;
      cardData.system.groupId = newGroupId;
      return cardData;
    });

    // Update actor with new group
    await this.actor.update({
      "system.actionCardGroups": [...groups, newGroup],
    });

    // Create duplicated cards
    if (duplicatedCards.length > 0) {
      await this.actor.createEmbeddedDocuments("Item", duplicatedCards);
    }

    // Notify user
    ui.notifications.info(
      game.i18n.format("EVENTIDE_RP_SYSTEM.Actor.ActionCards.GroupCopied", {
        groupName: newGroup.name,
        cardCount: duplicatedCards.length,
      }),
    );
  }

  /**
   * Delete an item with confirmation dialog
   * @param {HTMLElement} target - The clicked element
   * @private
   */
  async _deleteItemWithConfirmation(target) {
    const itemId = target.closest("[data-item-id]")?.dataset?.itemId;
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item) return;

    // Show confirmation dialog using DialogV2
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("EVENTIDE_RP_SYSTEM.ContextMenu.Delete"),
      },
      content: `<p>${game.i18n.format("EVENTIDE_RP_SYSTEM.ContextMenu.DeleteConfirm", {
        name: item.name,
      })}</p>`,
      rejectClose: false,
      modal: true,
    });

    if (!confirmed) return;

    // Store info for cleanup
    const wasActionCard = item.type === "actionCard";
    const oldGroupId = item.system.groupId;

    // Delete the item
    await item.delete();

    // Clean up empty groups if we deleted an action card
    if (wasActionCard && oldGroupId) {
      await this._checkGroupDissolution(oldGroupId);
      await this._cleanupEmptyGroups();
    }

    // Notify user
    ui.notifications.info(
      game.i18n.format("EVENTIDE_RP_SYSTEM.ContextMenu.DeleteSuccess", {
        name: item.name,
      }),
    );
  }

  /**
   * Debug the transformation display
   * @private
   */
  _debugTransformation() {
    const activeTransformationId = this.actor.getFlag(
      "eventide-rp-system",
      "activeTransformation",
    );
    if (activeTransformationId) {
      // Check if the transformation element exists in the DOM
      const transformationElement = this.element.querySelector(
        ".transformation-header__name",
      );
      if (transformationElement) {
        // Transformation element found in DOM
      }
    }
  }

  /**
   * Actions performed before closing the application
   * @param {object} options - Close options
   * @returns {Promise<void>}
   * @protected
   * @override
   */
  async _preClose(options) {
    // Call mixin cleanup first
    await super._preClose(options);

    // Clean up all mixin functionality
    this._cleanupStatusBarScrolling();
    this._cleanupThemeManagement();
    this._cleanupGearTabManagement();
    this._cleanupFormOverrides();

    // Clean up tab container styling
    cleanupTabContainerStyling(this.element);

    // Clean up any lingering scrollbar hide styles
    if (this._scrollbarHideStyle) {
      this._scrollbarHideStyle.remove();
      this._scrollbarHideStyle = null;
    }

    // Re-enable any disabled drop zones globally
    this._enableAllDropZones();
  }

  // Note: Gear tab management is now handled by ActorSheetGearTabsMixin

  /**************
   *
   *   ACTIONS
   *
   **************/

  // Note: All action methods are now provided by mixins:
  // - ActorSheetAdditionalActionsMixin: _onEditImage, _toggleEffect, _onConfigureToken, _onRoll, _executeActionCard
  // - ActorSheetActionsMixin: Document management, gear actions, transformations, drag/drop

  /********************
   *
   * Actor Override Handling
   *
   ********************/

  _onChangeForm(formConfig, event) {
    if (event.target.name === "system.power.value") {
      this.actor.update({
        "system.power.value": Math.min(
          event.target.value,
          this.actor.system.power.max,
        ),
      });

      event.target.value = this.actor.system.power.value;
    }

    if (event.target.name === "system.power.max") {
      // ceck if value is less than system.power.value
      if (event.target.value < this.actor.system.power.value) {
        // update system.power.value to match new max and then update the power value in the form
        this.actor.update({
          "system.power.value": event.target.value,
        });
      }
    }

    if (event.target.name === "system.resolve.value") {
      this.actor.update({
        "system.resolve.value": Math.min(
          event.target.value,
          this.actor.system.resolve.max,
        ),
      });

      event.target.value = this.actor.system.resolve.value;
    }

    if (event.target.name === "system.resolve.max") {
      if (event.target.value < this.actor.system.resolve.value) {
        this.actor.update({
          "system.resolve.value": event.target.value,
        });
      }
    }

    if (
      event.target.dataset?.groupId &&
      event.target.className === "erps-action-card-group__name"
    )
      this._handleGroupNameChange(event);

    super._onChangeForm(formConfig, event);
  }

  /**
   * Submit a document update based on the processed form data.
   * @param {SubmitEvent} event                   The originating form submission event
   * @param {HTMLFormElement} form                The form element that was submitted
   * @param {object} submitData                   Processed and validated form data to be used for a document update
   * @returns {Promise<void>}
   * @protected
   * @override
   */
  async _processSubmitData(event, form, submitData) {
    const overrides = foundry.utils.flattenObject(this.actor.overrides);
    for (const k of Object.keys(overrides)) delete submitData[k];
    await this.document.update(submitData);
  }

  // Note: Form overrides are now handled by ActorSheetFormOverrideMixin

  // Note: Theme management is now handled by ActorSheetThemeMixin

  /**
   * Override the maximize method to fix double-click window sizing issues
   * @returns {Promise<void>}
   * @override
   */
  async maximize() {
    try {
      // Store the current position before maximizing if we're not already minimized
      if (!this.minimized && !this._storedPosition) {
        this._storedPosition = {
          width: this.position.width,
          height: this.position.height,
          left: this.position.left,
          top: this.position.top,
        };
      }

      // Call the parent maximize method
      await super.maximize();

      // If we have a stored position and we're no longer minimized, restore it
      if (this._storedPosition && !this.minimized) {
        // Use a small delay to ensure the maximize operation is complete
        setTimeout(() => {
          this.setPosition(this._storedPosition);

          // Clear the stored position after restoring
          this._storedPosition = null;
        }, 50);
      }
    } catch (error) {
      Logger.error("Failed to maximize actor sheet", {
        error: error.message,
        stack: error.stack,
        actorName: this.actor?.name,
      });

      // Still call parent method as fallback
      await super.maximize();
    }
  }

  /**
   * Override the minimize method to clear stored position
   * @returns {Promise<void>}
   * @override
   */
  async minimize() {
    try {
      // Clear any stored position when minimizing
      this._storedPosition = null;

      // Call the parent minimize method
      await super.minimize();
    } catch (error) {
      Logger.error("Failed to minimize actor sheet", {
        error: error.message,
        stack: error.stack,
        actorName: this.actor?.name,
      });

      // Still call parent method as fallback
      await super.minimize();
    }
  }

  // Note: Action card execution is now handled by ActorSheetAdditionalActionsMixin
}
