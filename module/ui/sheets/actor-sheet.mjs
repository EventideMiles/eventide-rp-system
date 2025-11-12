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
      "biography",
      "statuses",
      "gear",
    ];
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
  _onRender(_context, _options) {
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

    // Initialize context menu for action cards
    this._createActionCardContextMenu();

    // Debug the transformation display
    if (CommonFoundryTasks.isTestingMode) this._debugTransformation();

    // You may want to add other special handling here
    // Foundry comes with a large number of utility classes, e.g. SearchFilter
    // That you may want to implement yourself.
  }

  // Note: Theme management is now handled by ActorSheetThemeMixin

  // Note: Status bar scrolling is now handled by ActorSheetStatusBarMixin

  /**
   * Wrapper for creating context menus with overflow handling
   * This fixes the issue where context menus get clipped by parent containers with overflow:hidden
   *
   * @param {ContextMenu} contextMenu - The context menu instance to enhance
   * @param {string} stopSelector - CSS selector for the container to stop at when searching for overflow parents
   * @private
   */
  _enhanceContextMenuWithOverflowFix(contextMenu, stopSelector = ".window-content") {
    if (!contextMenu) return;

    // Override the onOpen callback to fix overflow clipping
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

      // Add global style to hide all scrollbars with maximum specificity
      const scrollbarHideStyle = document.createElement('style');
      scrollbarHideStyle.id = 'erps-context-menu-scrollbar-hide';
      scrollbarHideStyle.textContent = `
        .eventide-sheet *,
        .eventide-sheet *::before,
        .eventide-sheet *::after,
        .tab.action-cards,
        .tab.action-cards *,
        .tab.action-cards *::before,
        .tab.action-cards *::after {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .eventide-sheet *::-webkit-scrollbar,
        .tab.action-cards::-webkit-scrollbar,
        .tab.action-cards *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `;
      document.head.appendChild(scrollbarHideStyle);
      this._scrollbarHideStyle = scrollbarHideStyle;

      if (originalOnOpen) originalOnOpen.call(contextMenu, target);
    };

    // Override the onClose callback to restore overflow
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
            for (const { element, overflow, overflowY } of this._overflowContainers) {
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
        }, 100); // Wait for animation to complete (Foundry's default is ~50ms)
      });
    };
  }

  /**
   * Create context menu for action cards to move them between groups
   * @private
   */
  _createActionCardContextMenu() {
    const contextMenu = this._createContextMenu(
      () => this._getActionCardContextOptions(),
      ".erps-data-table--action-cards .erps-data-table__row[data-item-id]",
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
      {
        name: "EVENTIDE_RP_SYSTEM.ContextMenu.MoveToGroup",
        icon: '<i class="fas fa-folder-open"></i>',
        condition: () => groups.length > 0,
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

    const currentGroupId = item.system.groupId;

    // Build list of groups excluding current group
    const groupChoices = groups
      .filter((g) => g._id !== currentGroupId)
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
