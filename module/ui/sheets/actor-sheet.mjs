import { CommonFoundryTasks } from "../../utils/_module.mjs";
import { erpsRollHandler, Logger } from "../../services/_module.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";
import { initTabContainerStyling, cleanupTabContainerStyling } from "../../helpers/tab-container-styling.mjs";
import { initThemeManager, cleanupThemeManager, triggerGlobalThemeChange, THEME_PRESETS } from "../../helpers/theme-manager.mjs";

const { api, sheets } = foundry.applications;
const { DragDrop, TextEditor } = foundry.applications.ux;
const FilePicker = foundry.applications.apps.FilePicker.implementation;

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheetV2}
 */
export class EventideRpSystemActorSheet extends api.HandlebarsApplicationMixin(
  sheets.ActorSheetV2,
) {
  // Private fields
  #dragDrop;
  #statusBarEventHandlers;

  constructor(options = {}) {
    Logger.methodEntry("EventideRpSystemActorSheet", "constructor", {
      actorId: options?.document?.id,
      actorName: options?.document?.name,
      actorType: options?.document?.type,
    });

    try {
      super(options);
      this.#dragDrop = this.#createDragDropHandlers();

      // Initialize theme manager (will be set up properly in _onRender)
      this.themeManager = null;

      Logger.debug(
        "Actor sheet initialized successfully",
        {
          sheetId: this.id,
          actorName: this.actor?.name,
          dragDropHandlers: this.#dragDrop?.length,
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
      "eventide-rp-system",
      "eventide-character-sheet",
      "eventide-character-sheet--scrollbars",
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
    },
    // Custom property that's merged into `this.options`
    dragDrop: [{
      dragSelector: "[data-drag], .erps-data-table__row[data-item-id], .erps-data-table__row[data-document-class], .eventide-transformation-card[data-item-id]",
      dropSelector: null
    }],
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

      // Offloading context prep to a helper function
      await this._prepareItems(context);

      Logger.debug(
        "Actor sheet context prepared",
        {
          actorName: this.actor.name,
          contextKeys: Object.keys(context),
          tabCount: Object.keys(context.tabs).length,
          editable: context.editable,
          limited: context.limited,
        },
        "ACTOR_SHEET",
      );

      Logger.methodExit(
        "EventideRpSystemActorSheet",
        "_prepareContext",
        context,
      );
      return context;
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

  /**
   * Organize and classify Items for Actor sheets.
   *
   * @param {object} context The context object to mutate
   */
  async _prepareItems(context) {
    Logger.methodEntry("EventideRpSystemActorSheet", "_prepareItems", {
      actorName: this.actor?.name,
      itemCount: this.document.items.size,
    });

    try {
      // Initialize containers.
      // You can just use `this.document.itemTypes` instead
      // if you don't need to subdivide a given type like
      // this sheet does with statuses
      const gear = [];
      const features = [];
      const statuses = [];
      const combatPowers = [];
      const transformations = [];
      const transformationCombatPowers = [];

      // Iterate through items, allocating to containers
      for (const i of this.document.items) {
        try {
          // Append to gear.
          if (i.type === "gear") {
            gear.push(i);
          } else if (i.type === "feature") {
            // Append to features.
            features.push(i);
          } else if (i.type === "status") {
            // Append to statuses
            statuses.push(i);
          } else if (i.type === "combatPower") {
            // Append to combat powers
            combatPowers.push(i);
          } else if (i.type === "transformation") {
            // Append to transformations
            transformations.push(i);
            if (i.system?.embeddedCombatPowers?.length > 0) {
              transformationCombatPowers.push(...i.system.getEmbeddedCombatPowers());
            }
          } else {
            Logger.warn(
              `Unknown item type: ${i.type}`,
              { itemId: i.id, itemName: i.name },
              "ACTOR_SHEET",
            );
          }
        } catch (itemError) {
          Logger.warn(
            `Error processing item: ${i.name}`,
            itemError,
            "ACTOR_SHEET",
          );
        }
      }

      // Sort then assign with error handling
      try {
        context.gear = gear.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        context.unequippedGear = gear.filter((i) => !i.system?.equipped);
        context.equippedGear = gear.filter((i) => i.system?.equipped);
        context.features = features.sort(
          (a, b) => (a.sort || 0) - (b.sort || 0),
        );
        context.statuses = statuses.sort(
          (a, b) => (a.sort || 0) - (b.sort || 0),
        );
        context.combatPowers = combatPowers.sort(
          (a, b) => (a.sort || 0) - (b.sort || 0),
        );
        context.transformationCombatPowers = transformationCombatPowers.sort(
          (a, b) => (a.sort || 0) - (b.sort || 0),
        );
        context.transformations = transformations.sort(
          (a, b) => (a.sort || 0) - (b.sort || 0),
        );
        context.activeTransformation = transformations[0];
      } catch (sortError) {
        Logger.error("Error sorting items", sortError, "ACTOR_SHEET");

        // Fallback to unsorted arrays
        context.gear = gear;
        context.unequippedGear = gear.filter((i) => !i.system?.equipped);
        context.equippedGear = gear.filter((i) => i.system?.equipped);
        context.features = features;
        context.statuses = statuses;
        context.combatPowers = combatPowers;
        context.transformationCombatPowers = transformationCombatPowers;
        context.transformations = transformations;
        context.activeTransformation = transformations[0];
      }

      Logger.debug(
        "Items prepared for actor sheet",
        {
          gearCount: gear.length,
          featuresCount: features.length,
          statusesCount: statuses.length,
          combatPowersCount: combatPowers.length,
          transformationsCount: transformations.length,
          transformationCombatPowersCount: transformationCombatPowers.length,
        },
        "ACTOR_SHEET",
      );

      Logger.methodExit("EventideRpSystemActorSheet", "_prepareItems", context);
    } catch (error) {
      Logger.error(
        "Failed to prepare items for actor sheet",
        error,
        "ACTOR_SHEET",
      );

      // Set empty fallbacks
      context.gear = [];
      context.unequippedGear = [];
      context.equippedGear = [];
      context.features = [];
      context.statuses = [];
      context.combatPowers = [];
      context.transformationCombatPowers = [];
      context.transformations = [];

      Logger.methodExit("EventideRpSystemActorSheet", "_prepareItems", context);
    }
  }

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
    const transformationCards = this.element.querySelectorAll(".eventide-transformation-card[data-item-id]");
    const allDraggableElements = this.element.querySelectorAll("[data-drag], .erps-data-table__row[data-item-id], .erps-data-table__row[data-document-class], .eventide-transformation-card[data-item-id]");

    Logger.debug("Setting up drag drop handlers", {
      sheetId: this.id,
      actorName: this.actor?.name,
      dragDropHandlers: this.#dragDrop?.length,
      dragSelectors: this.#dragDrop?.map(d => d.dragSelector),
      element: this.element,
      draggableElements: allDraggableElements.length,
      transformationCards: transformationCards.length,
      transformationCardDetails: Array.from(transformationCards).map(card => ({
        id: card.dataset.itemId,
        classes: card.className,
        dataset: card.dataset
      })),
      activeTransformation: this.actor.getFlag("eventide-rp-system", "activeTransformation")
    }, "ACTOR_SHEET");

    // Bind drag drop handlers
    this.#dragDrop.forEach((d, index) => {
      Logger.debug(`Binding drag drop handler ${index}`, {
        dragSelector: d.dragSelector,
        dropSelector: d.dropSelector,
        matchingElements: this.element.querySelectorAll(d.dragSelector).length
      }, "ACTOR_SHEET");
      d.bind(this.element);
    });
    this.#disableOverrides();

    // Initialize centralized theme management
    if (!this.themeManager) {
      this.themeManager = initThemeManager(this, THEME_PRESETS.CHARACTER_SHEET);
    } else {
      // Re-apply themes on re-render
      this.themeManager.applyThemes();
    }

    // Initialize drag-scrolling for status bar
    this.#initStatusBarScrolling();

    // Initialize gear tab functionality (preserve state across renders)
    this.#initGearTabs();

    // Initialize tab container styling (dynamic border radius based on active tab)
    initTabContainerStyling(this.element);

    // Debug the transformation display
    if (CommonFoundryTasks.isTestingMode) this._debugTransformation();

    // You may want to add other special handling here
    // Foundry comes with a large number of utility classes, e.g. SearchFilter
    // That you may want to implement yourself.
  }

  /**
   * Initialize drag-scrolling functionality for the status bar
   * @private
   */
  #initStatusBarScrolling() {
    const statusBar = this.element.querySelector(
      ".eventide-header__status-bar",
    );
    if (!statusBar) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    // Function to update arrow visibility and positioning
    const updateArrows = () => {
      const scrollLeft = statusBar.scrollLeft;
      const maxScrollLeft = statusBar.scrollWidth - statusBar.clientWidth;

      // Show left arrow if we can scroll left (scrollLeft > 0)
      const canScrollLeft = scrollLeft > 0;
      // Show right arrow if we can scroll right (not at the end) AND there's actually content to scroll
      const canScrollRight = scrollLeft < maxScrollLeft && maxScrollLeft > 0;

      statusBar.classList.toggle("scrollable-left", canScrollLeft);
      statusBar.classList.toggle("scrollable-right", canScrollRight);

      // Calculate arrow positions to keep them at the visible edges
      // Left arrow: always at 0.5rem from the left edge of the visible area
      const leftArrowPosition = `${scrollLeft + 8}px`; // 8px = 0.5rem

      // Right arrow: always at 0.5rem from the right edge of the visible area
      // Calculate position from left edge of container to right edge of visible area
      const containerWidth = statusBar.clientWidth;
      const rightArrowPosition = `${scrollLeft + containerWidth - 16}px`; // 16px = 8px more to the left

      // Set CSS custom properties for dynamic positioning
      statusBar.style.setProperty("--arrow-left-position", leftArrowPosition);
      statusBar.style.setProperty("--arrow-right-position", rightArrowPosition);
    };

    // Arrow click handlers
    const handleLeftArrowClick = (e) => {
      // Check if click is on the left arrow area
      const rect = statusBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;

      if (clickX <= 32 && statusBar.classList.contains("scrollable-left")) {
        // 32px = arrow area
        e.preventDefault();
        e.stopPropagation();

        // Scroll left by container width
        const scrollAmount = statusBar.clientWidth;
        statusBar.scrollBy({
          left: -scrollAmount,
          behavior: "smooth",
        });

        // Update arrows after scroll animation
        setTimeout(updateArrows, 300);
      }
    };

    const handleRightArrowClick = (e) => {
      // Check if click is on the right arrow area
      const rect = statusBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const rightArrowStart = rect.width - 32; // 32px = arrow area

      if (
        clickX >= rightArrowStart &&
        statusBar.classList.contains("scrollable-right")
      ) {
        e.preventDefault();
        e.stopPropagation();

        // Scroll right by container width
        const scrollAmount = statusBar.clientWidth;
        statusBar.scrollBy({
          left: scrollAmount,
          behavior: "smooth",
        });

        // Update arrows after scroll animation
        setTimeout(updateArrows, 300);
      }
    };

    // Combined click handler
    const handleArrowClick = (e) => {
      handleLeftArrowClick(e);
      handleRightArrowClick(e);
    };

    // Mouse events
    const handleMouseDown = (e) => {
      // Don't start drag if clicking on arrow areas
      const rect = statusBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const rightArrowStart = rect.width - 32;

      if (
        (clickX <= 32 && statusBar.classList.contains("scrollable-left")) ||
        (clickX >= rightArrowStart &&
          statusBar.classList.contains("scrollable-right"))
      ) {
        return; // Let arrow click handler deal with it
      }

      // Don't interfere with drag operations on transformation cards
      if (e.target.closest('.eventide-transformation-card')) {
        Logger.debug("Skipping status bar drag for transformation card", {
          target: e.target,
          closest: e.target.closest('.eventide-transformation-card')
        }, "ACTOR_SHEET");
        return; // Let the drag and drop system handle it
      }

      isDown = true;
      statusBar.style.cursor = "grabbing";
      startX = e.pageX - statusBar.offsetLeft;
      scrollLeft = statusBar.scrollLeft;
      e.preventDefault();
    };

    const handleMouseLeave = () => {
      isDown = false;
      statusBar.style.cursor = "grab";
    };

    const handleMouseUp = () => {
      isDown = false;
      statusBar.style.cursor = "grab";
    };

    const handleMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - statusBar.offsetLeft;
      const walk = (x - startX) * 2; // Scroll speed multiplier
      statusBar.scrollLeft = scrollLeft - walk;
      updateArrows();
    };

    // Touch events for mobile support
    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      startX = touch.pageX - statusBar.offsetLeft;
      scrollLeft = statusBar.scrollLeft;
    };

    const handleTouchMove = (e) => {
      if (!startX) return;
      e.preventDefault();
      const touch = e.touches[0];
      const x = touch.pageX - statusBar.offsetLeft;
      const walk = (x - startX) * 2;
      statusBar.scrollLeft = scrollLeft - walk;
      updateArrows();
    };

    const handleTouchEnd = () => {
      startX = null;
    };

    const handleScroll = () => {
      updateArrows();
    };

    // Add event listeners
    statusBar.addEventListener("click", handleArrowClick);
    statusBar.addEventListener("mousedown", handleMouseDown);
    statusBar.addEventListener("mouseleave", handleMouseLeave);
    statusBar.addEventListener("mouseup", handleMouseUp);
    statusBar.addEventListener("mousemove", handleMouseMove);
    statusBar.addEventListener("touchstart", handleTouchStart);
    statusBar.addEventListener("touchmove", handleTouchMove);
    statusBar.addEventListener("touchend", handleTouchEnd);
    statusBar.addEventListener("scroll", handleScroll);

    // Store references for cleanup
    this.#statusBarEventHandlers = {
      statusBar,
      handleArrowClick,
      handleMouseDown,
      handleMouseLeave,
      handleMouseUp,
      handleMouseMove,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      handleScroll,
    };

    // Initial arrow state
    updateArrows();

    // Update arrows when content changes (with a small delay to ensure DOM is updated)
    setTimeout(updateArrows, 100);
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
      console.info("Active transformation ID:", activeTransformationId);

      // Find the transformation item
      const transformation = this.actor.items.get(activeTransformationId);
      console.info("Transformation item:", transformation);

      // Check if the transformation element exists in the DOM
      const transformationElement = this.element.querySelector(
        ".transformation-header__name",
      );
      console.info("Transformation element:", transformationElement);
      if (transformationElement) {
        console.info(
          "Transformation element text:",
          transformationElement.textContent.trim(),
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
    // Clean up status bar event listeners
    this.#cleanupStatusBarScrolling();

    // Clean up centralized theme management
    if (this.themeManager) {
      cleanupThemeManager(this);
      this.themeManager = null;
    }

    // Clean up gear tab state
    this.#cleanupGearTabState();

    // Clean up tab container styling
    cleanupTabContainerStyling(this.element);

    // Call parent cleanup
    return super._preClose(options);
  }

  /**
   * Clean up status bar scrolling event listeners
   * @private
   */
  #cleanupStatusBarScrolling() {
    if (!this.#statusBarEventHandlers) return;

    const {
      statusBar,
      handleArrowClick,
      handleMouseDown,
      handleMouseLeave,
      handleMouseUp,
      handleMouseMove,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      handleScroll,
    } = this.#statusBarEventHandlers;

    // Remove all event listeners
    statusBar.removeEventListener("click", handleArrowClick);
    statusBar.removeEventListener("mousedown", handleMouseDown);
    statusBar.removeEventListener("mouseleave", handleMouseLeave);
    statusBar.removeEventListener("mouseup", handleMouseUp);
    statusBar.removeEventListener("mousemove", handleMouseMove);
    statusBar.removeEventListener("touchstart", handleTouchStart);
    statusBar.removeEventListener("touchmove", handleTouchMove);
    statusBar.removeEventListener("touchend", handleTouchEnd);
    statusBar.removeEventListener("scroll", handleScroll);

    // Clear the reference
    this.#statusBarEventHandlers = null;
  }

  /**
   * Clean up gear tab state
   * @private
   */
  #cleanupGearTabState() {
    // Clear gear tab state
    delete this._currentGearTab;

    Logger.debug("Gear tab state cleaned up", {
      appId: this.id,
      appName: this.constructor.name,
    });
  }

  /**
   * Initialize gear tab functionality with state preservation
   * @private
   */
  #initGearTabs() {
    const gearTabButtons = this.element.querySelectorAll(".gear-tab-button");
    const gearTabContents = this.element.querySelectorAll(".gear-tab-content");

    if (gearTabButtons.length === 0 || gearTabContents.length === 0) {
      return; // No gear tabs found, probably not on gear tab
    }

    // Store current active tab before re-initialization (if any)
    let currentActiveTab = this._currentGearTab;
    if (!currentActiveTab) {
      // Check if there's already an active tab in the DOM
      const activeButton = this.element.querySelector(
        ".gear-tab-button.active",
      );
      if (activeButton) {
        currentActiveTab = activeButton.getAttribute("data-gear-tab");
      } else {
        // Default to 'equipped' if no active tab found
        currentActiveTab = "equipped";
      }
    }

    // Remove existing event listeners to prevent duplicates
    gearTabButtons.forEach((button) => {
      // Clone the button to remove all event listeners
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
    });

    // Re-query buttons after cloning
    const newGearTabButtons = this.element.querySelectorAll(".gear-tab-button");

    // Handle tab button clicks
    newGearTabButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();

        const targetTab = button.getAttribute("data-gear-tab");

        // Store the selected tab
        this._currentGearTab = targetTab;

        // Remove active class from all buttons and contents
        newGearTabButtons.forEach((btn) => btn.classList.remove("active"));
        gearTabContents.forEach((content) =>
          content.classList.remove("active"),
        );

        // Add active class to clicked button and corresponding content
        button.classList.add("active");
        const targetContent = this.element.querySelector(
          `[data-gear-content="${targetTab}"]`,
        );
        if (targetContent) {
          targetContent.classList.add("active");
        }

        Logger.debug("Gear tab switched", {
          sheetId: this.id,
          actorName: this.actor?.name,
          targetTab,
        });
      });
    });

    // Restore the previously active tab
    this.#restoreGearTabState(
      currentActiveTab,
      newGearTabButtons,
      gearTabContents,
    );

    Logger.debug("Gear tabs initialized with state preservation", {
      sheetId: this.id,
      actorName: this.actor?.name,
      buttonCount: newGearTabButtons.length,
      contentCount: gearTabContents.length,
      activeTab: currentActiveTab,
    });
  }

  /**
   * Restore the gear tab state to the specified tab
   * @private
   * @param {string} targetTab - The tab to activate
   * @param {NodeList} buttons - The gear tab buttons
   * @param {NodeList} contents - The gear tab contents
   */
  #restoreGearTabState(targetTab, buttons, contents) {
    // Remove active class from all buttons and contents
    buttons.forEach((btn) => btn.classList.remove("active"));
    contents.forEach((content) => content.classList.remove("active"));

    // Find and activate the target tab
    const targetButton = this.element.querySelector(
      `[data-gear-tab="${targetTab}"]`,
    );
    const targetContent = this.element.querySelector(
      `[data-gear-content="${targetTab}"]`,
    );

    if (targetButton && targetContent) {
      targetButton.classList.add("active");
      targetContent.classList.add("active");
      this._currentGearTab = targetTab;
    } else {
      // Fallback to first available tab if target not found
      const firstButton = buttons[0];
      const firstContent = contents[0];
      if (firstButton && firstContent) {
        firstButton.classList.add("active");
        firstContent.classList.add("active");
        this._currentGearTab = firstButton.getAttribute("data-gear-tab");
      }
    }

    Logger.debug("Gear tab state restored", {
      sheetId: this.id,
      actorName: this.actor?.name,
      targetTab,
      actualTab: this._currentGearTab,
    });
  }

  /**************
   *
   *   ACTIONS
   *
   **************/

  /**
   * Handle changing a Document's image.
   *
   * @this EventideRpSystemActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   * @protected
   */
  static async _onEditImage(_event, target) {
    Logger.methodEntry("EventideRpSystemActorSheet", "_onEditImage", {
      actorName: this.actor?.name,
      autoTokenUpdate: this.actor.getFlag(
        "eventide-rp-system",
        "autoTokenUpdate",
      ),
      hasActiveTransformation: !!this.actor.getFlag(
        "eventide-rp-system",
        "activeTransformation",
      ),
    });

    try {
      // Check if actor has an active transformation - if so, prevent image changes
      const activeTransformation = this.actor.getFlag(
        "eventide-rp-system",
        "activeTransformation",
      );
      if (activeTransformation) {
        ui.notifications.warn(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Warnings.CannotChangeImageWhileTransformed",
          ) ||
            "Cannot change actor image while transformed. Remove the transformation first.",
        );

        Logger.warn(
          "Blocked image change attempt while actor is transformed",
          {
            actorName: this.actor.name,
            transformationId: activeTransformation,
          },
          "ACTOR_SHEET",
        );

        Logger.methodExit("EventideRpSystemActorSheet", "_onEditImage", false);
        return false;
      }

      const attr = target.dataset.edit;
      const current = foundry.utils.getProperty(this.document, attr);
      const { img } =
        this.document.constructor.getDefaultArtwork?.(
          this.document.toObject(),
        ) ?? {};

      const fp = new FilePicker({
        current,
        type: "image",
        redirectToRoot: img ? [img] : [],
        callback: async (path) => {
          const updateData = { [attr]: path };

          // If auto token update is enabled, also update the token image
          const autoTokenUpdate = this.actor.getFlag(
            "eventide-rp-system",
            "autoTokenUpdate",
          );
          if (autoTokenUpdate && attr === "img") {
            updateData["prototypeToken.texture.src"] = path;

            Logger.info(
              "Auto token update: updating token image along with actor image",
              {
                actorName: this.actor.name,
                imagePath: path,
              },
              "ACTOR_SHEET",
            );

            // Also update any existing tokens on the scene
            const tokens = this.actor.getActiveTokens();
            if (tokens.length > 0) {
              // Update tokens on their respective scenes
              const sceneUpdates = new Map();
              for (const token of tokens) {
                const sceneId = token.scene.id;
                if (!sceneUpdates.has(sceneId)) {
                  sceneUpdates.set(sceneId, []);
                }
                sceneUpdates.get(sceneId).push({
                  _id: token.id,
                  "texture.src": path,
                });
              }

              // Execute updates for each scene
              for (const [sceneId, updates] of sceneUpdates) {
                const scene = game.scenes.get(sceneId);
                if (scene) {
                  await scene.updateEmbeddedDocuments("Token", updates);
                  Logger.info(
                    `Updated ${updates.length} token(s) on scene: ${scene.name}`,
                    {
                      actorName: this.actor.name,
                      sceneId,
                      tokenCount: updates.length,
                    },
                    "ACTOR_SHEET",
                  );
                }
              }
            }
          }

          await this.document.update(updateData);

          Logger.info(
            `Image updated successfully`,
            {
              actorName: this.actor.name,
              attribute: attr,
              path,
              tokenUpdated: autoTokenUpdate && attr === "img",
            },
            "ACTOR_SHEET",
          );
        },
        top: this.position.top + 40,
        left: this.position.left + 10,
      });

      const result = fp.browse();
      Logger.methodExit("EventideRpSystemActorSheet", "_onEditImage", result);
      return result;
    } catch (error) {
      await ErrorHandler.handleAsync(Promise.reject(error), {
        context: `Edit image for ${this.actor?.name}`,
        errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
        userMessage: game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Errors.EditImageError",
          {
            actorName: this.actor?.name || "Unknown",
          },
        ),
      });

      Logger.methodExit("EventideRpSystemActorSheet", "_onEditImage", null);
    }
  }

  /**
   * Renders an embedded document's sheet
   *
   * @this EventideRpSystemActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _viewDoc(_event, target) {
    const doc = this._getEmbeddedDocument(target);
    doc.sheet.render(true);
  }

  /**
   * Handles item deletion
   *
   * @this EventideRpSystemActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _deleteDoc(_event, target) {
    const doc = this._getEmbeddedDocument(target);
    await doc.delete();
  }

  /**
   * Handle creating a new Owned Item or ActiveEffect for the actor using initial data defined in the HTML dataset
   *
   * @this EventideRpSystemActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _createDoc(_event, target) {
    Logger.methodEntry("EventideRpSystemActorSheet", "_createDoc", {
      actorName: this.actor?.name,
      documentClass: target.dataset.documentClass,
      type: target.dataset.type,
    });

    try {
      // Retrieve the configured document class for Item or ActiveEffect
      const docCls = foundry.utils.getDocumentClass(
        target.dataset.documentClass,
      );

      if (!docCls) {
        throw new Error(
          `Unknown document class: ${target.dataset.documentClass}`,
        );
      }

      // Prepare the document creation data by initializing it a default name.
      const docData = {
        name: docCls.defaultName({
          // defaultName handles an undefined type gracefully
          type: target.dataset.type,
          parent: this.actor,
        }),
      };

      // Loop through the dataset and add it to our docData
      for (const [dataKey, value] of Object.entries(target.dataset)) {
        // These data attributes are reserved for the action handling
        if (["action", "documentClass"].includes(dataKey)) continue;
        // Nested properties require dot notation in the HTML, e.g. anything with `system`
        foundry.utils.setProperty(docData, dataKey, value);
      }

      Logger.debug(
        "Creating embedded document",
        {
          documentClass: target.dataset.documentClass,
          type: target.dataset.type,
          name: docData.name,
          dataKeys: Object.keys(docData),
        },
        "ACTOR_SHEET",
      );

      // Finally, create the embedded document!
      const [createdDoc, error] = await ErrorHandler.handleDocumentOperation(
        docCls.create(docData, { parent: this.actor }),
        "create embedded document",
        target.dataset.documentClass.toLowerCase(),
      );

      if (error) {
        Logger.methodExit("EventideRpSystemActorSheet", "_createDoc", null);
      }

      Logger.info(
        `Created ${target.dataset.documentClass}: ${createdDoc.name}`,
        {
          documentId: createdDoc.id,
          documentType: target.dataset.type,
          actorName: this.actor.name,
        },
        "ACTOR_SHEET",
      );

      Logger.methodExit("EventideRpSystemActorSheet", "_createDoc", createdDoc);
    } catch (error) {
      await ErrorHandler.handleAsync(Promise.reject(error), {
        context: `Create ${target.dataset.documentClass} for ${this.actor?.name}`,
        errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
        userMessage: game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Errors.CreateDocumentError",
          {
            documentType: target.dataset.documentClass,
            actorName: this.actor?.name || "Unknown",
          },
        ),
      });

      Logger.methodExit("EventideRpSystemActorSheet", "_createDoc", null);
    }
  }

  /**
   * Determines effect parent to pass to helper
   *
   * @this EventideRpSystemActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _toggleEffect(_event, target) {
    const effect = this._getEmbeddedDocument(target);
    await effect.update({ disabled: !effect.disabled });
  }

  static async _toggleGear(_event, target) {
    const gear = this._getEmbeddedDocument(target);
    await gear.update({ "system.equipped": !gear.system.equipped });
    erps.messages.createGearEquipMessage(gear);
  }

  static async _incrementGear(_event, target) {
    const gear = this._getEmbeddedDocument(target);
    await gear.update({ "system.quantity": gear.system.quantity + 1 });
  }

  static async _decrementGear(_event, target) {
    const gear = this._getEmbeddedDocument(target);
    await gear.update({
      "system.quantity": Math.max(gear.system.quantity - 1, 0),
    });
    if (gear.system.quantity === 0) {
      setTimeout(() => {
        erps.messages.createGearEquipMessage(gear);
      }, 100);
    }
  }

  /**
   * Apply a transformation to the actor
   * @this EventideRpSystemActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _applyTransformation(_event, target) {
    const transformation = this._getEmbeddedDocument(target);
    await this.actor.applyTransformation(transformation);
  }

  /**
   * Remove the active transformation from the actor
   * @this EventideRpSystemActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _removeTransformation(_event, _target) {
    await this.actor.removeTransformation();
  }

  /**
   * Toggle the auto token update flag
   * @this EventideRpSystemActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _toggleAutoTokenUpdate(_event, _target) {
    Logger.methodEntry("EventideRpSystemActorSheet", "_toggleAutoTokenUpdate", {
      actorName: this.actor?.name,
      currentValue: this.actor.getFlag("eventide-rp-system", "autoTokenUpdate"),
    });

    try {
      const currentValue =
        this.actor.getFlag("eventide-rp-system", "autoTokenUpdate") || false;
      const newValue = !currentValue;

      await this.actor.setFlag(
        "eventide-rp-system",
        "autoTokenUpdate",
        newValue,
      );

      Logger.info(
        `Auto token update toggled to: ${newValue}`,
        {
          actorName: this.actor.name,
          previousValue: currentValue,
          newValue,
        },
        "ACTOR_SHEET",
      );

      Logger.methodExit(
        "EventideRpSystemActorSheet",
        "_toggleAutoTokenUpdate",
        newValue,
      );
    } catch (error) {
      await ErrorHandler.handleAsync(Promise.reject(error), {
        context: `Toggle auto token update for ${this.actor?.name}`,
        errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
        userMessage: game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Errors.ToggleAutoTokenUpdateError",
          {
            actorName: this.actor?.name || "Unknown",
          },
        ),
      });

      Logger.methodExit(
        "EventideRpSystemActorSheet",
        "_toggleAutoTokenUpdate",
        null,
      );
    }
  }

  /**
   * Handle configuring the actor's token
   * @this EventideRpSystemActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _onConfigureToken(_event, _target) {
    Logger.methodEntry("EventideRpSystemActorSheet", "_onConfigureToken", {
      actorName: this.actor?.name,
      hasActiveTokens: this.actor.getActiveTokens().length > 0,
    });

    try {
      // First, try to get an active token on the current scene
      const activeTokens = this.actor.getActiveTokens();
      let token = null;

      if (activeTokens.length > 0) {
        // Use the first active token if available
        token = activeTokens[0];
        Logger.info(
          `Using active token for configuration`,
          {
            actorName: this.actor.name,
            tokenId: token.id,
            sceneName: token.scene.name,
          },
          "ACTOR_SHEET",
        );
      } else {
        // No active token found, use the prototype token seamlessly
        token = this.actor.prototypeToken;
        Logger.info(
          `No active token found, configuring prototype token`,
          {
            actorName: this.actor.name,
            prototypeTokenName: token.name,
          },
          "ACTOR_SHEET",
        );
      }

      // Open the token configuration sheet
      const result = token.sheet.render(true);
      Logger.methodExit(
        "EventideRpSystemActorSheet",
        "_onConfigureToken",
        result,
      );
      return result;
    } catch (error) {
      await ErrorHandler.handleAsync(Promise.reject(error), {
        context: `Configure token for ${this.actor?.name}`,
        errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
        userMessage: game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Errors.ConfigureTokenError",
          {
            actorName: this.actor?.name || "Unknown",
          },
        ),
      });

      Logger.methodExit(
        "EventideRpSystemActorSheet",
        "_onConfigureToken",
        null,
      );
    }
  }

  /**
   * Handle clickable rolls.
   * @this EventideRpSystemActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _onRoll(event, target) {
    Logger.methodEntry("EventideRpSystemActorSheet", "_onRoll", {
      actorName: this.actor?.name,
      rollType: target.dataset.rollType,
      roll: target.dataset.roll,
    });

    try {
      event.preventDefault();

      const dataset = {
        ...target.dataset,
        formula: target.dataset.roll,
      };

      Logger.debug(
        "Processing roll request",
        {
          rollType: dataset.rollType,
          formula: dataset.formula,
          datasetKeys: Object.keys(dataset),
        },
        "ACTOR_SHEET",
      );

      // Handle item rolls.
      switch (dataset.rollType) {
        case "item": {
          const item = this._getEmbeddedDocument(target);
          if (!item) {
            Logger.warn(
              "No item found for item roll",
              { targetDataset: target.dataset },
              "ACTOR_SHEET",
            );
            ui.notifications.warn(
              game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.ItemNotFound"),
            );
            Logger.methodExit("EventideRpSystemActorSheet", "_onRoll", null);
            return;
          }

          Logger.info(
            `Rolling item: ${item.name}`,
            { itemId: item.id, itemType: item.type },
            "ACTOR_SHEET",
          );

          const rollResult = await item.roll();
          Logger.methodExit(
            "EventideRpSystemActorSheet",
            "_onRoll",
            rollResult,
          );
          return rollResult;
        }


      }

      // Handle rolls that supply the formula directly.
      if (dataset.roll) {
        Logger.info(
          `Rolling formula: ${dataset.roll}`,
          { formula: dataset.roll, actorName: this.actor.name },
          "ACTOR_SHEET",
        );

        // Add the current roll mode to the dataset
        const rollData = {
          ...dataset,
          rollMode: game.settings.get("core", "rollMode"),
        };

        const roll = await erpsRollHandler.handleRoll(rollData, this.actor);
        Logger.methodExit("EventideRpSystemActorSheet", "_onRoll", roll);
        return roll;
      }

      Logger.warn(
        "No valid roll configuration found",
        { dataset },
        "ACTOR_SHEET",
      );

      Logger.methodExit("EventideRpSystemActorSheet", "_onRoll", null);
    } catch (error) {
      await ErrorHandler.handleAsync(Promise.reject(error), {
        context: `Roll Action for ${this.actor?.name}`,
        errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
        userMessage: game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.RollError", {
          actorName: this.actor?.name || "Unknown",
        }),
      });

      Logger.methodExit("EventideRpSystemActorSheet", "_onRoll", null);
    }
  }

  /** Helper Functions */

  /**
   * Fetches the embedded document representing the containing HTML element
   *
   * @param {HTMLElement} target    The element subject to search
   * @returns {Item | ActiveEffect} The embedded Item or ActiveEffect
   */
  _getEmbeddedDocument(target) {
    // Support li, tr elements, and transformation cards for different template structures
    const docRow =
      target.closest("li[data-document-class], tr[data-document-class], .eventide-transformation-card[data-item-id]") ||
      target.closest("[data-item-id]");

    if (docRow) {
      const itemId = docRow.dataset.itemId;

      // Handle transformation cards specifically
      if (docRow.classList.contains('eventide-transformation-card')) {
        const transformationItem = this.actor.items.get(itemId);
        if (transformationItem && transformationItem.type === "transformation") {
          Logger.debug("Found transformation item for drag", {
            itemId,
            itemName: transformationItem.name,
            itemType: transformationItem.type
          }, "ACTOR_SHEET");
          return transformationItem;
        }
      }

      // Handle direct item ID reference
      if (itemId && !docRow.dataset.documentClass) {
        // First try to find in actor's items
        let item = this.actor.items.get(itemId);
        if (item) return item;

        // If not found, check transformation combat powers
        item = this._findTransformationCombatPower(itemId);
        if (item) return item;
      }

      // Handle document class structure
      if (docRow.dataset.documentClass === "Item") {
        // First try to find in actor's items
        let item = this.actor.items.get(itemId);
        if (item) return item;

        // If not found, check transformation combat powers
        item = this._findTransformationCombatPower(itemId);
        if (item) return item;
      } else if (docRow.dataset.documentClass === "ActiveEffect") {
        const parent =
          docRow.dataset.parentId === this.actor.id
            ? this.actor
            : this.actor.items.get(docRow?.dataset.parentId);
        return parent.effects.get(docRow?.dataset.effectId);
      }
    }

    // Fallback: check if target itself has item-id
    if (target.dataset.itemId) {
      // First try to find in actor's items
      let item = this.actor.items.get(target.dataset.itemId);
      if (item) return item;

      // If not found, check transformation combat powers
      item = this._findTransformationCombatPower(target.dataset.itemId);
      if (item) return item;
    }

    Logger.warn(
      "Could not find document class or item ID",
      {
        target,
        docRow,
        itemId: docRow?.dataset?.itemId,
        documentClass: docRow?.dataset?.documentClass,
        isTransformationCard: docRow?.classList?.contains('eventide-transformation-card')
      },
      "ACTOR_SHEET",
    );
    return null;
  }

  /**
   * Find a transformation combat power by ID
   * @param {string} itemId - The item ID to search for
   * @returns {Item|null} The transformation combat power item or null if not found
   * @private
   */
  _findTransformationCombatPower(itemId) {
    // Get all transformation items
    const transformations = this.actor.items.filter(i => i.type === "transformation");

    // Search through all embedded combat powers
    for (const transformation of transformations) {
      const embeddedPowers = transformation.system.getEmbeddedCombatPowers();
      const power = embeddedPowers.find(p => p.id === itemId);
      if (power) {
        return power;
      }
    }

    return null;
  }

  /***************
   *
   * Drag and Drop
   *
   ***************/

  /**
   * Define whether a user is able to begin a dragstart workflow for a given drag selector
   * @param {string} selector       The candidate HTML selector for dragging
   * @returns {boolean}             Can the current user drag this selector?
   * @protected
   */
  _canDragStart(selector) {
    const canDrag = this.isEditable;
    Logger.debug("Drag permission check", {
      selector,
      canDrag,
      isEditable: this.isEditable,
      actorName: this.actor?.name
    }, "ACTOR_SHEET");
    return canDrag;
  }

  /**
   * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
   * @param {string} selector       The candidate HTML selector for the drop target
   * @returns {boolean}             Can the current user drop on this selector?
   * @protected
   * @override
   */
  _canDragDrop(selector) {
    const canDrop = this.isEditable;
    Logger.debug("Drop permission check", {
      selector,
      canDrop,
      isEditable: this.isEditable,
      actorName: this.actor?.name
    }, "ACTOR_SHEET");
    return canDrop;
  }

  /**
   * Begins a drag operation from a popped out sheet
   * @param {DragEvent} event   The originating DragEvent
   * @protected
   * @override
   */
  _onDragStart(event) {
    Logger.debug("Drag start event triggered", {
      currentTarget: event.currentTarget,
      target: event.target,
      targetDataset: event.target.dataset,
      currentTargetDataset: event.currentTarget.dataset,
      currentTargetClasses: event.currentTarget.className
    }, "ACTOR_SHEET");

    // Support li, tr elements, and transformation cards
    const docRow = event.currentTarget.closest("li, tr, .eventide-transformation-card");
    if (!docRow) {
      Logger.warn("No draggable element found", {
        target: event.currentTarget,
        targetClasses: event.currentTarget.className,
        targetDataset: event.currentTarget.dataset
      }, "ACTOR_SHEET");
      return;
    }

    Logger.debug("Found draggable element", {
      docRow,
      docRowClasses: docRow.className,
      docRowDataset: docRow.dataset,
      isTransformationCard: docRow.classList.contains('eventide-transformation-card')
    }, "ACTOR_SHEET");

    // Don't drag if clicking on a link or button (except the transformation card itself)
    if ("link" in event.target.dataset) {
      Logger.debug("Preventing drag on link element", { target: event.target }, "ACTOR_SHEET");
      return;
    }

    // Allow dragging transformation cards even when clicking buttons, but prevent if clicking the revert button specifically
    if (event.target.closest('.eventide-transformation-card__revert')) {
      Logger.debug("Preventing drag on revert button", { target: event.target }, "ACTOR_SHEET");
      return;
    }

    // Get the embedded document for this element
    const document = this._getEmbeddedDocument(docRow);
    if (!document) {
      Logger.warn("No document found for drag operation", {
        docRow,
        itemId: docRow.dataset?.itemId,
        documentClass: docRow.dataset?.documentClass,
        elementClass: docRow.className,
        actorItems: this.actor.items.size,
        activeTransformation: this.actor.getFlag("eventide-rp-system", "activeTransformation")
      }, "ACTOR_SHEET");
      return;
    }

    Logger.debug("Found document for drag", {
      documentId: document.id,
      documentName: document.name,
      documentType: document.type || document.documentName
    }, "ACTOR_SHEET");

    // Get drag data from the document
    const dragData = document.toDragData();
    if (!dragData) {
      Logger.warn("No drag data available for document", {
        documentId: document.id,
        documentType: document.type || document.documentName
      }, "ACTOR_SHEET");
      return;
    }

    // Add visual feedback
    if (docRow.classList.contains('eventide-transformation-card')) {
      docRow.classList.add('dragging');
    }

    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));

    Logger.info("Drag operation started successfully", {
      documentId: document.id,
      documentName: document.name,
      documentType: document.type || document.documentName,
      dragDataType: dragData.type,
      elementType: docRow.classList.contains('eventide-transformation-card') ? 'transformation-card' : 'table-row'
    }, "ACTOR_SHEET");
  }

  /**
   * Callback actions which occur when a dragged element is over a drop target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   * @override
   */
  _onDragOver(_event) {}

  /**
   * Callback actions which occur when a drag operation ends.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragEnd(event) {
    // Remove visual feedback
    const docRow = event.currentTarget.closest("li, tr, .eventide-transformation-card");
    if (docRow && docRow.classList.contains('eventide-transformation-card')) {
      docRow.classList.remove('dragging');
    }

    Logger.debug("Drag operation ended", {
      currentTarget: event.currentTarget,
      elementType: docRow?.classList.contains('eventide-transformation-card') ? 'transformation-card' : 'table-row'
    }, "ACTOR_SHEET");
  }

  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   * @override
   */
  async _onDrop(event) {
    const data = TextEditor.implementation.getDragEventData(event);
    const actor = this.actor;
    const allowed = Hooks.call("dropActorSheetData", actor, this, data);
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

  /**
   * Handle the dropping of ActiveEffect data onto an Actor Sheet
   * @param {DragEvent} event                  The concluding DragEvent which contains drop data
   * @param {object} data                      The data transfer extracted from the event
   * @returns {Promise<ActiveEffect|boolean>}  The created ActiveEffect object or false if it couldn't be created.
   * @protected
   */
  async _onDropActiveEffect(event, data) {
    const aeCls = getDocumentClass("ActiveEffect");
    const effect = await aeCls.fromDropData(data);
    if (!this.actor.isOwner || !effect) return false;
    if (effect.target === this.actor) {
      return this._onSortActiveEffect(event, effect);
    }
    return aeCls.create(effect, { parent: this.actor });
  }

  /**
   * Handle a drop event for an existing embedded Active Effect to sort that Active Effect relative to its siblings
   *
   * @param {DragEvent} event
   * @param {ActiveEffect} effect
   */
  async _onSortActiveEffect(event, effect) {
    /** @type {HTMLElement} */
    const dropTarget = event.target.closest("[data-effect-id]");
    if (!dropTarget) return;

    const target = this._getEmbeddedDocument(dropTarget);

    // Don't sort on yourself
    if (effect.uuid === target.uuid) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for (const el of dropTarget.parentElement.children) {
      const siblingId = el.dataset.effectId;
      const parentId = el.dataset.parentId;
      if (
        siblingId &&
        parentId &&
        (siblingId !== effect.id || parentId !== effect.parent.id)
      ) {
        siblings.push(this._getEmbeddedDocument(el));
      }
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(effect, {
      target,
      siblings,
    });

    // Split the updates up by parent document
    const directUpdates = [];

    const grandchildUpdateData = sortUpdates.reduce((items, u) => {
      const parentId = u.target.parent.id;
      const update = { _id: u.target.id, ...u.update };
      if (parentId === this.actor.id) {
        directUpdates.push(update);
        return items;
      }
      if (items[parentId]) items[parentId].push(update);
      else items[parentId] = [update];
      return items;
    }, {});

    // Effects-on-items updates
    for (const [itemId, updates] of Object.entries(grandchildUpdateData)) {
      await this.actor.items
        .get(itemId)
        .updateEmbeddedDocuments("ActiveEffect", updates);
    }

    // Update on the main actor
    return this.actor.updateEmbeddedDocuments("ActiveEffect", directUpdates);
  }

  /**
   * Handle dropping of an Actor data onto another Actor sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<object|boolean>}  A data object which describes the result of the drop, or false if the drop was
   *                                     not permitted.
   * @protected
   */
  async _onDropActor(_event, _data) {
    if (!this.actor.isOwner) return false;
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of an item reference or item data onto an Actor Sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<Item[]|boolean>}  The created or updated Item instances, or false if the drop was not permitted.
   * @protected
   */
  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;
    const item = await Item.implementation.fromDropData(data);

    // Handle item sorting within the same Actor
    if (this.actor.uuid === item.parent?.uuid) {
      return this._onSortItem(event, item);
    }

    // Handle dropping a transformation directly on the actor
    if (item.type === "transformation") {
      // Apply the transformation
      await this.actor.applyTransformation(item);
      // Create the owned item
      return this._onDropItemCreate(item, event);
    }

    // Create the owned item
    return this._onDropItemCreate(item, event);
  }

  /**
   * Handle dropping of a Folder on an Actor Sheet.
   * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
   * @param {DragEvent} event     The concluding DragEvent which contains drop data
   * @param {object} data         The data transfer extracted from the event
   * @returns {Promise<Item[]>}
   * @protected
   */
  async _onDropFolder(event, data) {
    if (!this.actor.isOwner) return [];
    const folder = await Folder.implementation.fromDropData(data);
    if (folder.type !== "Item") return [];
    const droppedItemData = await Promise.all(
      folder.contents.map(async (item) => {
        if (!(document instanceof Item)) item = await fromUuid(item.uuid);
        return item;
      }),
    );
    return this._onDropItemCreate(droppedItemData, event);
  }

  /**
   * Handle the final creation of dropped Item data on the Actor.
   * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
   * @param {object[]|object} itemData      The item data requested for creation
   * @param {DragEvent} event               The concluding DragEvent which provided the drop data
   * @returns {Promise<Item[]>}
   * @private
   */
  async _onDropItemCreate(itemData, _event) {
    itemData = itemData instanceof Array ? itemData : [itemData];
    return this.actor.createEmbeddedDocuments("Item", itemData);
  }

  /**
   * Handle a drop event for an existing embedded Item to sort that Item relative to its siblings
   * @param {Event} event
   * @param {Item} item
   * @private
   */
  _onSortItem(event, item) {
    // Get the drag source and drop target
    const items = this.actor.items;
    const dropTarget = event.target.closest("[data-item-id]");
    if (!dropTarget) return;

    const target = items.get(dropTarget.dataset.itemId);

    // Don't sort on yourself
    if (item.id === target.id) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for (const el of dropTarget.parentElement.children) {
      const siblingId = el.dataset.itemId;
      if (siblingId && siblingId !== item.id) {
        siblings.push(items.get(el.dataset.itemId));
      }
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(item, {
      target,
      siblings,
    });
    const updateData = sortUpdates.map((u) => {
      const update = u.update;
      update._id = u.target._id;
      return update;
    });

    // Perform the update
    return this.actor.updateEmbeddedDocuments("Item", updateData);
  }

  /** The following pieces set up drag handling and are unlikely to need modification  */

  /**
   * Returns an array of DragDrop instances
   * @type {DragDrop.implementation[]}
   */
  get dragDrop() {
    return this.#dragDrop;
  }

  /**
   * Create drag-and-drop workflow handlers for this Application
   * @returns {DragDrop.implementation[]}     An array of DragDrop handlers
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
        dragend: this._onDragEnd.bind(this),
        drop: this._onDrop.bind(this),
      };
      return new DragDrop.implementation(d);
    });
  }

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

  /**
   * Disables inputs subject to active effects
   */
  #disableOverrides() {
    const flatOverrides = foundry.utils.flattenObject(this.actor.overrides);
    for (const override of Object.keys(flatOverrides)) {
      const input = this.element.querySelector(`[name="${override}"]`);
      if (input) {
        input.disabled = true;
      }
    }
  }

  /**
   * Handle setting the user's sheet theme preference (cycles through available themes)
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _setSheetTheme(_event, _target) {
    const currentTheme = CommonFoundryTasks.retrieveSheetTheme();
    Logger.methodEntry("EventideRpSystemActorSheet", "_setSheetTheme", {
      actorName: this.actor?.name,
      currentTheme,
      userFlags: game.user.flags,
    });

    try {
      // Define the theme cycle order
      const themes = ["blue", "black", "green", "light", "gold", "purple"];

      // Find current theme index and move to next
      // Handle case where currentTheme might not be in the themes array
      let currentIndex = themes.indexOf(currentTheme);
      if (currentIndex === -1) {
        // If current theme is not found (corrupted data), default to blue (index 0)
        currentIndex = 0;
      }
      const nextIndex = (currentIndex + 1) % themes.length;
      const nextTheme = themes[nextIndex];

      Logger.debug("Theme cycling", {
        currentTheme,
        currentIndex,
        nextIndex,
        nextTheme,
        availableThemes: themes,
      });

      // Update both the user flag and the setting
      await CommonFoundryTasks.storeUserFlag("sheetTheme", nextTheme);
      await game.settings.set("eventide-rp-system", "sheetTheme", nextTheme);

      Logger.info("User theme flag and setting updated", {
        userName: game.user.name,
        newTheme: nextTheme,
        flagPath: "eventide-rp-system.sheetTheme",
        settingPath: "eventide-rp-system.sheetTheme",
      });

      // Trigger global theme change (this will handle re-rendering and notifications)
      triggerGlobalThemeChange(nextTheme, game.user.id);

      Logger.info("Sheet theme cycled successfully", {
        userName: game.user.name,
        previousTheme: currentTheme,
        newTheme: nextTheme,
      });
    } catch (error) {
      Logger.error("Failed to cycle sheet theme", {
        userName: game.user?.name,
        error: error.message,
        stack: error.stack,
      });

      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.SetSheetThemeError", {
          userName: game.user?.name || "Unknown",
        }),
      );
    }
  }
}
