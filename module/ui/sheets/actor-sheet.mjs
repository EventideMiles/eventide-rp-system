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
    Logger.methodEntry("EventideRpSystemActorSheet", "constructor", {
      actorId: options?.document?.id,
      actorName: options?.document?.name,
      actorType: options?.document?.type,
    });

    try {
      super(options);
      // Note: All functionality is now provided by mixins

      Logger.debug(
        "Actor sheet initialized successfully",
        {
          sheetId: this.id,
          actorName: this.actor?.name,
          dragDropHandlers: this.dragDrop?.length,
        },
        "ACTOR_SHEET",
      );

      Logger.methodExit("EventideRpSystemActorSheet", "constructor", this);
    } catch (error) {
      Logger.error("Failed to initialize actor sheet", error, "ACTOR_SHEET");
      Logger.methodExit("EventideRpSystemActorSheet", "constructor", null);
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
    Logger.methodEntry("EventideRpSystemActorSheet", "_prepareContext", {
      actorName: this.actor?.name,
      optionsParts: options?.parts,
    });

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
          Logger.debug("User theme retrieved for context", {
            theme,
            userFlags: game.user.flags,
            systemFlags: game.user.flags?.["eventide-rp-system"],
          });
          return theme;
        })(),
      };

      // Use mixin for context preparation
      const enrichedContext = this._prepareSheetContext(context);

      Logger.debug(
        "Actor sheet context prepared",
        {
          actorName: this.actor.name,
          contextKeys: Object.keys(enrichedContext),
          tabCount: Object.keys(enrichedContext.tabs).length,
          editable: enrichedContext.editable,
          limited: enrichedContext.limited,
        },
        "ACTOR_SHEET",
      );

      Logger.methodExit(
        "EventideRpSystemActorSheet",
        "_prepareContext",
        enrichedContext,
      );
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
    Logger.methodEntry("EventideRpSystemActorSheet", "_preparePartContext", {
      partId,
      actorName: this.actor?.name,
    });

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

      Logger.debug(
        `Part context prepared for ${partId}`,
        {
          partId,
          hasTab: !!context.tab,
          hasFormulas: !!context.formulas,
          hasEnrichedBiography: !!context.enrichedBiography,
        },
        "ACTOR_SHEET",
      );

      Logger.methodExit(
        "EventideRpSystemActorSheet",
        "_preparePartContext",
        context,
      );
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

      Logger.methodExit(
        "EventideRpSystemActorSheet",
        "_preparePartContext",
        context,
      );
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
    // Debug drag drop setup
    const transformationCards = this.element.querySelectorAll(
      ".eventide-transformation-card[data-item-id]",
    );
    const allDraggableElements = this.element.querySelectorAll(
      "[data-drag], .erps-data-table__row[data-item-id], .erps-data-table__row[data-document-class], .eventide-transformation-card[data-item-id]",
    );

    Logger.debug(
      "Setting up drag drop handlers",
      {
        sheetId: this.id,
        actorName: this.actor?.name,
        dragDropHandlers: this.dragDrop?.length,
        dragSelectors: this.dragDrop?.map((d) => d.dragSelector),
        element: this.element,
        draggableElements: allDraggableElements.length,
        transformationCards: transformationCards.length,
        transformationCardDetails: Array.from(transformationCards).map(
          (card) => ({
            id: card.dataset.itemId,
            classes: card.className,
            dataset: card.dataset,
          }),
        ),
        activeTransformation: this.actor.getFlag(
          "eventide-rp-system",
          "activeTransformation",
        ),
      },
      "ACTOR_SHEET",
    );

    // Bind drag drop handlers
    if (this.dragDrop && this.dragDrop.length > 0) {
      this.dragDrop.forEach((d, index) => {
        Logger.debug(
          `Binding drag drop handler ${index}`,
          {
            dragSelector: d.dragSelector,
            dropSelector: d.dropSelector,
            matchingElements: this.element.querySelectorAll(d.dragSelector)
              .length,
          },
          "ACTOR_SHEET",
        );
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

    // Debug the transformation display
    if (CommonFoundryTasks.isTestingMode) this._debugTransformation();

    // You may want to add other special handling here
    // Foundry comes with a large number of utility classes, e.g. SearchFilter
    // That you may want to implement yourself.
  }

  // Note: Theme management is now handled by ActorSheetThemeMixin

  // Note: Status bar scrolling is now handled by ActorSheetStatusBarMixin

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
      Logger.debug(
        "Active transformation ID",
        { activeTransformationId },
        "ACTOR_SHEET",
      );

      // Find the transformation item
      const transformation = this.actor.items.get(activeTransformationId);
      Logger.debug(
        "Transformation item",
        { transformationName: transformation?.name },
        "ACTOR_SHEET",
      );

      // Check if the transformation element exists in the DOM
      const transformationElement = this.element.querySelector(
        ".transformation-header__name",
      );
      Logger.debug(
        "Transformation element",
        { elementExists: !!transformationElement },
        "ACTOR_SHEET",
      );
      if (transformationElement) {
        Logger.debug(
          "Transformation element text",
          { text: transformationElement.textContent.trim() },
          "ACTOR_SHEET",
        );
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
    Logger.methodEntry("EventideRpSystemActorSheet", "maximize", {
      actorName: this.actor?.name,
      currentPosition: this.position,
      minimized: this.minimized,
    });

    try {
      // Store the current position before maximizing if we're not already minimized
      if (!this.minimized && !this._storedPosition) {
        this._storedPosition = {
          width: this.position.width,
          height: this.position.height,
          left: this.position.left,
          top: this.position.top,
        };

        Logger.debug("Stored current position before maximize", {
          storedPosition: this._storedPosition,
          actorName: this.actor?.name,
        });
      }

      // Call the parent maximize method
      await super.maximize();

      // If we have a stored position and we're no longer minimized, restore it
      if (this._storedPosition && !this.minimized) {
        // Use a small delay to ensure the maximize operation is complete
        setTimeout(() => {
          this.setPosition(this._storedPosition);

          Logger.info("Restored position after maximize", {
            restoredPosition: this._storedPosition,
            actorName: this.actor?.name,
          });

          // Clear the stored position after restoring
          this._storedPosition = null;
        }, 50);
      }

      Logger.methodExit("EventideRpSystemActorSheet", "maximize", true);
    } catch (error) {
      Logger.error("Failed to maximize actor sheet", {
        error: error.message,
        stack: error.stack,
        actorName: this.actor?.name,
      });

      // Still call parent method as fallback
      await super.maximize();

      Logger.methodExit("EventideRpSystemActorSheet", "maximize", false);
    }
  }

  /**
   * Override the minimize method to clear stored position
   * @returns {Promise<void>}
   * @override
   */
  async minimize() {
    Logger.methodEntry("EventideRpSystemActorSheet", "minimize", {
      actorName: this.actor?.name,
      currentPosition: this.position,
    });

    try {
      // Clear any stored position when minimizing
      this._storedPosition = null;

      // Call the parent minimize method
      await super.minimize();

      Logger.info("Actor sheet minimized successfully", {
        actorName: this.actor?.name,
      });

      Logger.methodExit("EventideRpSystemActorSheet", "minimize", true);
    } catch (error) {
      Logger.error("Failed to minimize actor sheet", {
        error: error.message,
        stack: error.stack,
        actorName: this.actor?.name,
      });

      // Still call parent method as fallback
      await super.minimize();

      Logger.methodExit("EventideRpSystemActorSheet", "minimize", false);
    }
  }

  // Note: Action card execution is now handled by ActorSheetAdditionalActionsMixin
}
