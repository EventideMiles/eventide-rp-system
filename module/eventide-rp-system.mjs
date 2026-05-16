/**
 * Eventide RP System - Main Module
 *
 * This file serves as the entry point for the Eventide RP System, setting up the system
 * and registering its components with Foundry VTT. It initializes document classes, sheets,
 * configuration, and utility functions.
 *
 * @module eventide-rp-system
 */

// Import document classes
import {
  EventideRpSystemActor,
  EventideRpSystemItem,
} from "./documents/_module.mjs";

// Import sheet classes
import {
  EventideRpSystemActorSheet,
  EventideRpSystemItemSheet,
  GearCreator,
  DamageTargets,
  RestoreTarget,
  ChangeTargetStatus,
  SelectAbilityRoll,
  GearTransfer,
  EffectCreator,
  TransformationCreator,
  ActorToTransformationConverter,
  TransformationToActorConverter,
  NpcQuickGenerator,
  ActionCardPresetDialog,
  RollHistory,
} from "./ui/_module.mjs";

// import service classes and constants
import {
  EVENTIDE_RP_SYSTEM,
  preloadHandlebarsTemplates,
  registerSettings,
  initializeCombatHooks,
  initChatListeners,
  initPopupListeners,
  initGMControlHooks,
  erpsMessageHandler,
  initHandlebarsPartials,
  getSetting,
  setSetting,
  Logger,
  ImageZoomService,
  TransformationConverter,
  EmbeddedImageMigration,
  SettingNameMigration,
  V14ActiveEffectMigration,
  NpcGenerator,
} from "./services/_module.mjs";

// Import token configuration guards
import { TokenConfigGuards } from "./services/hooks/token-config-guards.mjs";

// Import DataModel classes
import * as models from "./data/_module.mjs";

// Import utility functions
import {
  commonTasks,
  ErrorHandler,
  performSystemCleanup,
  performPreInitCleanup,
  initializeCleanupHooks,
} from "./utils/_module.mjs";

//import helper functions
import {
  initColorPickersWithHex,
  cleanupColorPickers,
  enhanceExistingColorPickers,
  initNumberInputs,
  cleanupNumberInputs,
  cleanupNumberInputsGlobal,
  initRangeSliders,
  cleanupRangeSliders,
  getActiveThemeInstances,
  initializeGlobalTheme,
  injectImmediateThemeStyles,
  removeImmediateThemeStyles,
} from "./helpers/_module.mjs";

const { Actors, Items } = foundry.documents.collections;
const { ActorSheet, ItemSheet } = foundry.appv1.sheets;

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

// Add key classes to the global scope so they can be more easily used
// by downstream developers
/**
 * The Eventide RP System global API, accessible via `erps` in the browser console.
 *
 * This object provides runtime access to the system's document classes, applications,
 * utility functions, macro dialogs, settings, and diagnostic tools. It is the primary
 * entry point for macro writers and module developers integrating with the system.
 *
 * @namespace globalThis.erps
 * @type {EventideRPSystemGlobal}
 *
 * @example
 * // Access actor/item document classes
 * const actor = new erps.documents.EventideRpSystemActor({ name: "Hero", type: "character" });
 *
 * @example
 * // Get a system setting value
 * const formula = erps.settings.getSetting("initiativeFormula");
 *
 * @example
 * // Roll an item macro
 * erps.utils.rollItemMacro("Actor.abcd1234.Item.efgh5678");
 *
 * @example
 * // Run diagnostics from the browser console
 * const info = erps.diagnostics();
 * console.log(info.systemVersion, info.actorCount);
 *
 * @since 13.0.0
 * @author Eventide RP System
 */
globalThis.erps = {
  /**
   * System document classes for Actor and Item.
   *
   * Use these to create new documents or reference the class constructors
   * for `instanceof` checks and subclassing.
   *
   * @example
   * const actor = new erps.documents.EventideRpSystemActor({ name: "Hero", type: "character" });
   * if (doc instanceof erps.documents.EventideRpSystemItem) { ... }
   */
  documents: {
    EventideRpSystemActor,
    EventideRpSystemItem,
  },

  /**
   * System sheet application classes for Actor and Item.
   *
   * Useful for `instanceof` checks or programmatic sheet rendering.
   *
   * @example
   * if (app instanceof erps.applications.EventideRpSystemActorSheet) { ... }
   */
  applications: {
    EventideRpSystemActorSheet,
    EventideRpSystemItemSheet,
  },

  /**
   * Utility functions for common Foundry tasks, UI helpers, and system operations.
   *
   * Includes all static methods from {@link CommonFoundryTasks} (e.g., `getTargetArray`,
   * `retrieveSheetTheme`), the `rollItemMacro` function, color picker / number input /
   * range slider helpers, {@link ErrorHandler}, {@link performSystemCleanup},
   * and {@link TransformationConverter}.
   *
   * @example
   * // Get currently targeted tokens
   * const targets = erps.utils.getTargetArray();
   *
   * @example
   * // Get the user's current sheet theme
   * const theme = erps.utils.retrieveSheetTheme();
   */
  utils: {
    ...commonTasks,
    rollItemMacro,
    initColorPickersWithHex,
    enhanceExistingColorPickers,
    initNumberInputs,
    cleanupNumberInputs,
    cleanupNumberInputsGlobal,
    cleanupColorPickers,
    initRangeSliders,
    cleanupRangeSliders,
    getActiveThemeInstances,
    ErrorHandler,
    performSystemCleanup,
    TransformationConverter,
    NpcGenerator,
  },

  /**
   * Macro dialog classes that can be instantiated programmatically.
   *
   * Each class extends Foundry's Application and provides a UI dialog
   * for a specific game action (e.g., creating gear, transferring items,
   * applying damage, rolling abilities).
   *
   * @example
   * // Open a gear creation dialog for a specific actor
   * new erps.macros.GearCreator({ actor }).render(true);
   *
   * @example
   * // Open a damage targets dialog
   * new erps.macros.DamageTargets().render(true);
   */
  macros: {
    GearTransfer,
    GearCreator,
    DamageTargets,
    RestoreTarget,
    ChangeTargetStatus,
    SelectAbilityRoll,
    EffectCreator,
    TransformationCreator,
    ActorToTransformationConverter,
    TransformationToActorConverter,
    NpcQuickGenerator,
    ActionCardPresetDialog,
    RollHistory,
  },

  /**
   * System settings getters and setters.
   *
   * Provides typed access to world-scoped and client-scoped system settings
   * without needing to use the full `game.settings.get("eventide-rp-system", key)` pattern.
   *
   * @example
   * const initiative = erps.settings.getSetting("initiativeFormula");
   * await erps.settings.setSetting("initiativeFormula", "1d20+3");
   */
  settings: {
    getSetting,
    setSetting,
  },

  /**
   * Message handler for system chat messages.
   * Provides methods for creating and managing Eventide RP System chat messages.
   */
  messages: erpsMessageHandler,

  /**
   * Data model classes for all actor and item types.
   *
   * Maps type names to their DataModel classes, matching what is registered
   * in `CONFIG.Actor.dataModels` and `CONFIG.Item.dataModels`.
   *
   * @example
   * const schema = erps.models.EventideRpSystemCharacter.defineSchema();
   */
  models,

  /**
   * System logger with leveled output (debug, info, warn, error).
   *
   * Respects the `testingMode` setting for debug-level output.
   * All log messages are prefixed with `ERPS`.
   *
   * @example
   * erps.Logger.info("Character created", { name: actor.name }, "CHARACTER");
   * erps.Logger.error("Failed to roll", error, "ROLLS");
   */
  Logger,

  /**
   * GM Control manager for action approval workflows.
   *
   * Set asynchronously after init — may be `null` during early initialization.
   * Provides methods for managing pending GM actions and stat approvals.
   *
   * @type {Object|null}
   */
  gmControl: null,

  /**
   * Perform standard system cleanup — clears tracked intervals and stale DOM references.
   *
   * Safe to call during normal operation. For aggressive cleanup use `forceCleanup()`.
   *
   * @example
   * erps.cleanup();
   */
  cleanup: performSystemCleanup,

  /**
   * Force aggressive cleanup — clears ALL intervals and timeouts, then runs standard cleanup.
   *
   * ⚠️ This may disrupt active animations and pending operations. Use only for
   * debugging or emergency cleanup when the system is in a bad state.
   *
   * @example
   * erps.forceCleanup();
   */
  forceCleanup: () => {
    Logger.warn(
      "Performing FORCE cleanup - this will clear ALL intervals and timeouts!",
      null,
      "SYSTEM_INIT",
    );
    performPreInitCleanup();
    performSystemCleanup();
    Logger.info("Force cleanup completed", null, "SYSTEM_INIT");
  },

  /**
   * Collect and return system diagnostic information.
   *
   * Returns an object containing memory usage, interval counts, initialization state,
   * document counts, system/Foundry versions, migration status, and active theme instances.
   *
   * @returns {SystemDiagnostics} Diagnostic snapshot of the current system state
   *
   * @example
   * const info = erps.diagnostics();
   * console.log(`Actors: ${info.actorCount}, System: ${info.systemVersion}`);
   *
   * @maintenance Useful for bug reports and troubleshooting. Safe to call at any time.
   *
   * @since 13.0.0
   */
  diagnostics: () => {
    const trackedIntervals = window._erpsIntervalIds
      ? window._erpsIntervalIds.size
      : 0;

    let memoryInfo = "Memory info not available";
    /* eslint-disable no-undef */
    if (typeof performance !== "undefined" && performance.memory) {
      const usedMB = Math.round(
        performance.memory.usedJSHeapSize / 1024 / 1024,
      );

      const totalMB = Math.round(
        performance.memory.totalJSHeapSize / 1024 / 1024,
      );

      const limitMB = Math.round(
        performance.memory.jsHeapSizeLimit / 1024 / 1024,
      );
      /* eslint-enable no-undef */

      memoryInfo = {
        used: `${usedMB} MB`,

        total: `${totalMB} MB`,

        limit: `${limitMB} MB`,
      };
    }

    // Check if GM control hooks are initialized by looking for the global manager
    const gmControlHooksInitialized = !!(
      globalThis.erps?.gmControl &&
      typeof globalThis.erps.gmControl.getPendingStats === "function"
    );

    // Check if number inputs are initialized by looking for the global click handler
    // Since number input elements might not be rendered yet, we check for the initialization state
    const numberInputsInitialized = !!(
      // Check if there are any number input elements currently in the DOM
      (
        document.querySelector(".erps-number-input") ||
        // Check if the global click handler is attached (more reliable)
        document._erpsNumberInputsInitialized === true ||
        // Check if the utility function is available
        (globalThis.erps?.utils?.enhanceExistingNumberInputs &&
          typeof globalThis.erps.utils.enhanceExistingNumberInputs ===
            "function")
      )
    );

    // Get migration version from settings (using the consolidated migrationVersion key)
    let migrationVersion = "Unknown";
    let migrationLevel = 0;
    try {
      migrationLevel =
        game.settings.get("eventide-rp-system", "migrationVersion") || 0;
      migrationVersion = `Level ${migrationLevel}`;
    } catch {
      migrationVersion = "Settings unavailable";
    }

    // Get V14 migration status
    let v14MigrationVersion = "Unknown";
    try {
      v14MigrationVersion =
        game.settings.get("eventide-rp-system", "v14MigrationVersion") ||
        "Not run";
    } catch {
      v14MigrationVersion = "Settings unavailable";
    }

    // Get active theme instances with proper processing
    const themeInstancesData =
      globalThis.erps?.utils?.getActiveThemeInstances?.() || {
        count: 0,
        instances: [],
      };

    const diagnostics = {
      trackedIntervals,
      memoryInfo,
      gmControlHooksInitialized,
      numberInputsInitialized,
      // Theme instances - provide count and detailed instances array
      themeInstancesCount: themeInstancesData.count || 0,
      themeInstances: themeInstancesData.instances || [],
      actorCount: game.actors?.size || 0,
      itemCount: game.items?.size || 0,
      messageCount: game.messages?.size || 0,
      sceneCount: game.scenes?.size || 0,
      userCount: game.users?.size || 0,
      systemVersion: game.system.version,
      foundryVersion: game.version,
      migrationVersion,
      v14MigrationVersion,
      timestamp: new Date().toISOString(),
    };

    Logger.info("System Diagnostics", diagnostics, "SYSTEM_DIAGNOSTICS");
    return diagnostics;
  },

  /**
   * Open the system performance monitoring dashboard.
   *
   * Loads and renders a graphical dashboard showing system resource usage,
   * active intervals, and performance metrics. Falls back to a simple
   * notification if the dashboard component fails to load.
   *
   * @example
   * erps.showPerformanceDashboard();
   *
   * @maintenance Intended for development and debugging, not runtime gameplay.
   *
   * @since 14.0.0
   */
  showPerformanceDashboard: () => {
    // Import and create the performance dashboard application
    import("./ui/components/performance-dashboard.mjs")
      .then(({ PerformanceDashboard }) => {
        new PerformanceDashboard().render(true);
      })
      .catch((error) => {
        Logger.error(
          "Failed to load performance dashboard",
          error,
          "SYSTEM_DIAGNOSTICS",
        );
        // Fallback to simple notification
        const diagnostics = globalThis.erps.diagnostics();
        ui.notifications.info(
          `System Status: ${diagnostics.trackedIntervals} intervals, ${typeof diagnostics.memoryInfo === "object" ? diagnostics.memoryInfo.used : "Memory info unavailable"}`,
        );
      });
  },
};

/**
 * Initialize the Eventide RP System
 * Sets up system configuration, registers document classes, initializes hooks and listeners
 */
Hooks.once("init", async () => {
  // Register system settings FIRST - before any Logger calls
  // This ensures testingMode setting is available for Logger
  registerSettings();

  // Register V14 migration setting
  game.settings.register("eventide-rp-system", "v14MigrationVersion", {
    name: "V14 Migration Version",
    scope: "world",
    config: false,
    default: "0.0.0",
    type: String,
  });

  Logger.info("Initializing Eventide RP System", null, "SYSTEM_INIT");

  // Perform aggressive cleanup before initialization to prevent memory leaks
  Logger.info("Performing pre-initialization cleanup", null, "SYSTEM_INIT");
  try {
    performPreInitCleanup();
  } catch (error) {
    Logger.warn("Pre-initialization cleanup failed", error, "SYSTEM_INIT");
  }

  // Add custom constants for configuration
  CONFIG.EVENTIDE_RP_SYSTEM = EVENTIDE_RP_SYSTEM;
  // Preload Handlebars templates
  await preloadHandlebarsTemplates();
  // Initialize handlebars partials
  initHandlebarsPartials();
  // Initialize combat hooks
  initializeCombatHooks();
  // Initialize chat message listeners
  initChatListeners();
  // Initialize popup listeners
  initPopupListeners();
  // Initialize GM control hooks
  initGMControlHooks();

  // Initialize system cleanup hooks
  initializeCleanupHooks();

  // Set up GM control manager in global scope (async)
  try {
    const { gmControlManager } =
      await import("./services/managers/gm-control.mjs");
    globalThis.erps.gmControl = gmControlManager;
  } catch (error) {
    Logger.error("Failed to load GM control manager", error, "SYSTEM_INIT");
  }
  /**
   * Configure initiative settings
   */
  CONFIG.Combat.initiative = {
    formula: "1d20", // Default fallback
    decimals: 2, // Default fallback
  };
  // Update with settings if available
  if (game.settings && game.settings.get) {
    try {
      CONFIG.Combat.initiative = {
        formula: game.settings.get("eventide-rp-system", "initiativeFormula"),
        decimals: game.settings.get("eventide-rp-system", "initiativeDecimals"),
      };
    } catch (error) {
      Logger.warn(
        "Could not get initiative settings, using defaults",
        error,
        "SYSTEM_INIT",
      );
    }
  }
  // Define custom Document classes
  CONFIG.Actor.documentClass = EventideRpSystemActor;
  CONFIG.Item.documentClass = EventideRpSystemItem;
  // Register DataModel classes
  // These data models define the schema for system data
  CONFIG.Actor.dataModels = {
    character: models.EventideRpSystemCharacter,
    npc: models.EventideRpSystemNPC,
  };
  CONFIG.Item.dataModels = {
    gear: models.EventideRpSystemGear,
    feature: models.EventideRpSystemFeature,
    status: models.EventideRpSystemStatus,
    combatPower: models.EventideRpSystemCombatPower,
    transformation: models.EventideRpSystemTransformation,
    actionCard: models.EventideRpSystemActionCard,
  };
  // Configure Active Effect behavior
  // Setting to false means Active Effects are never copied to the Actor directly,
  // but will still apply if the transfer property on the Active Effect is true
  CONFIG.ActiveEffect.legacyTransferral = false;
  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("eventide-rp-system", EventideRpSystemActorSheet, {
    makeDefault: true,
    label: "EVENTIDE_RP_SYSTEM.SheetLabels.Actor",
  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("eventide-rp-system", EventideRpSystemItemSheet, {
    makeDefault: true,
    label: "EVENTIDE_RP_SYSTEM.SheetLabels.Item",
  });
  Logger.info(
    "Eventide RP System Initialization Complete",
    null,
    "SYSTEM_INIT",
  );
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

/**
 * Conditional helper for comparing two values with various operators
 * @param {*} v1 - First value to compare
 * @param {string} operator - Comparison operator (==, ===, !=, !==, <, <=, >, >=, &&, ||)
 * @param {*} v2 - Second value to compare
 * @param {Object} options - Handlebars options object with fn and inverse functions
 * @returns {string} Result of the conditional template rendering
 */
Handlebars.registerHelper("ifCond", function (v1, operator, v2, options) {
  switch (operator) {
    case "==":
      return v1 == v2 ? options.fn(this) : options.inverse(this);
    case "===":
      return v1 === v2 ? options.fn(this) : options.inverse(this);
    case "!=":
      return v1 != v2 ? options.fn(this) : options.inverse(this);
    case "!==":
      return v1 !== v2 ? options.fn(this) : options.inverse(this);
    case "<":
      return v1 < v2 ? options.fn(this) : options.inverse(this);
    case "<=":
      return v1 <= v2 ? options.fn(this) : options.inverse(this);
    case ">":
      return v1 > v2 ? options.fn(this) : options.inverse(this);
    case ">=":
      return v1 >= v2 ? options.fn(this) : options.inverse(this);
    case "&&":
      return v1 && v2 ? options.fn(this) : options.inverse(this);
    case "||":
      return v1 || v2 ? options.fn(this) : options.inverse(this);
    default:
      return options.inverse(this);
  }
});

/**
 * Split a key by dots and return the specified part
 * @param {string} key - The key to split (e.g., "system.abilities.acro")
 * @param {number} choice - The index of the part to return (0-based)
 * @returns {string} The specified part of the split key
 */
Handlebars.registerHelper("keySplit", (key, choice) => {
  return key.split(".")[choice];
});

/**
 * Get the absolute value of a number
 * @param {number} value - The number to get the absolute value of
 * @returns {number} The absolute value
 */
Handlebars.registerHelper("abs", (value) => {
  return Math.abs(value);
});

/**
 * Console log helper for debugging templates
 * @param {*} str - The value to log to console
 */
Handlebars.registerHelper("console", (str) => {
  Logger.debug("Handlebars log helper", { message: str }, "HANDLEBARS");
});

/**
 * Debug helper that logs the current context and optional value to console
 * @param {*} [optionalValue] - Optional value to also log
 */
Handlebars.registerHelper("debug", function (optionalValue) {
  Logger.debug("Handlebars debug helper - Current Context", this, "HANDLEBARS");
  if (optionalValue) {
    Logger.debug(
      "Handlebars debug helper - Value",
      optionalValue,
      "HANDLEBARS",
    );
  }
});

/**
 * Convert a string to lowercase
 * @param {string} str - The string to convert
 * @returns {string} The lowercase string
 */
Handlebars.registerHelper("lowercase", (str) => {
  return (str || "").toLowerCase();
});

/**
 * Capitalize the first letter of a string
 * @param {string} str - The string to capitalize
 * @returns {string} The string with the first letter capitalized
 */
Handlebars.registerHelper("capitalize", (str) => {
  if (!str) return "";
  str = String(str);
  return str.charAt(0).toUpperCase() + str.slice(1);
});

/**
 * Check if any items in an array have the cursed property set to true
 * @param {Array} items - Array of items to check
 * @returns {boolean} True if any item is cursed, false otherwise
 */
Handlebars.registerHelper("hasCursedItems", (items) => {
  if (!Array.isArray(items)) return false;
  return items.some((item) => item.system?.cursed === true);
});

/* -------------------------------------------- */
/*  Setup Hook                                  */
/* -------------------------------------------- */

/**
 * Setup hook - called after init but before ready
 * This is the optimal time to inject immediate theme styles
 */
Hooks.once("setup", () => {
  // Inject immediate theme styles to prevent flashing
  // This happens after game.user is available but before sheets render
  try {
    injectImmediateThemeStyles();
    Logger.info(
      "Immediate theme styles injected during setup",
      null,
      "SYSTEM_INIT",
    );
  } catch (error) {
    Logger.warn(
      "Failed to inject immediate theme styles during setup",
      error,
      "SYSTEM_INIT",
    );
  }
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", () => {
  // Initialize global theme for scrollbars and other global UI elements
  initializeGlobalTheme();

  // Initialize image zoom service for chat card images
  try {
    ImageZoomService.init();
    Logger.info("Image zoom service initialized", null, "SYSTEM_INIT");
  } catch (error) {
    Logger.error(
      "Failed to initialize image zoom service",
      error,
      "SYSTEM_INIT",
    );
  }

  // Initialize token configuration guards to prevent editing during transformations
  try {
    TokenConfigGuards.initialize();
    Logger.info("Token configuration guards initialized", null, "SYSTEM_INIT");
  } catch (error) {
    Logger.error(
      "Failed to initialize token configuration guards",
      error,
      "SYSTEM_INIT",
    );
  }

  // Run migrations (Issues #127, #128)
  EmbeddedImageMigration.run().catch((error) => {
    Logger.error(
      "Failed to run embedded image migration",
      error,
      "SYSTEM_INIT",
    );
  });
  SettingNameMigration.run().catch((error) => {
    Logger.error("Failed to run setting name migration", error, "SYSTEM_INIT");
  });

  // Run V14 ActiveEffect migration
  V14ActiveEffectMigration.run().catch((error) => {
    Logger.error(
      "Failed to run V14 ActiveEffect migration",
      error,
      "SYSTEM_INIT",
    );
  });

  // Remove immediate theme styles now that the full theme system is loaded
  // Add a small delay to ensure all initial sheets have been themed
  setTimeout(() => {
    removeImmediateThemeStyles();
  }, 500);

  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createDocMacro(data, slot));

  // Register token creation hook to apply transformations to newly created tokens
  Hooks.on("createToken", (tokenDocument, data, options, userId) => {
    EventideRpSystemActor._onCreateToken(tokenDocument, data, options, userId);
  });

  // Sync actor name/image to prototype token and placed tokens when autoTokenUpdate is enabled
  Hooks.on("preUpdateActor", (actor, change, _options, _userId) => {
    if (actor.getFlag("eventide-rp-system", "autoTokenUpdate")) {
      if (foundry.utils.hasProperty(change, "name")) {
        foundry.utils.setProperty(change, "prototypeToken.name", change.name);
      }
      if (foundry.utils.hasProperty(change, "img")) {
        foundry.utils.setProperty(
          change,
          "prototypeToken.texture.src",
          change.img,
        );
      }
    }
  });

  Hooks.on("updateActor", (actor, change, _options, userId) => {
    if (
      userId === game.user.id &&
      actor.getFlag("eventide-rp-system", "autoTokenSync")
    ) {
      const tokenUpdates = [];
      if (foundry.utils.hasProperty(change, "name")) {
        tokenUpdates.push({ key: "name", value: change.name });
      }
      if (foundry.utils.hasProperty(change, "img")) {
        tokenUpdates.push({ key: "texture.src", value: change.img });
      }
      if (tokenUpdates.length > 0) {
        const tokens = actor.getActiveTokens();
        if (tokens.length > 0) {
          const sceneUpdates = new Map();
          for (const token of tokens) {
            const sceneId = token.scene.id;
            if (!sceneUpdates.has(sceneId)) {
              sceneUpdates.set(sceneId, []);
            }
            const update = { _id: token.id };
            for (const { key, value } of tokenUpdates) {
              update[key] = value;
            }
            sceneUpdates.get(sceneId).push(update);
          }
          for (const [sceneId, updates] of sceneUpdates) {
            const scene = game.scenes.get(sceneId);
            if (scene) {
              scene.updateEmbeddedDocuments("Token", updates);
            }
          }
        }
      }
    }
  });

  // Record system rolls into actor roll history flag
  Hooks.on("createChatMessage", (message) => {
    const rollFlag = message.flags?.["eventide-rp-system"]?.roll;
    if (!rollFlag) return;

    const speaker = ChatMessage.getSpeaker(message);
    const actorId = speaker.actor;
    if (!actorId) return;

    const actor = game.actors.get(actorId);
    if (!actor) return;

    const history = actor.getFlag("eventide-rp-system", "rollHistory") || [];
    history.push({
      timestamp: Date.now(),
      type: rollFlag.type,
      formula: rollFlag.formula,
      total: rollFlag.total,
    });
    if (history.length > 50) history.splice(0, history.length - 50);

    actor.setFlag("eventide-rp-system", "rollHistory", history);
  });

  // Register canvas ready hook to ensure transformation consistency when switching scenes
  Hooks.on("canvasReady", () => {
    EventideRpSystemActor._onCanvasReady();
  });

  // Register actor directory context menu for NPC Quick Generator
  Hooks.on("getActorDirectoryEntryContext", (html, entries) => {
    entries.push({
      label: "EVENTIDE_RP_SYSTEM.NpcGenerator.Title",
      icon: '<i class="fa-solid fa-wand-magic-sparkles"></i>',
      onClick: (_event, li) => {
        const actorId = li.dataset.documentId;
        const actor = game.actors.get(actorId);
        if (actor) {
          new NpcQuickGenerator({ sourceActor: actor }).render(true);
        }
      },
      visible: (li) => {
        const actorId = li.dataset.documentId;
        const actor = game.actors.get(actorId);
        return actor?.type === "npc" && game.user.isGM;
      },
      group: "action",
    });

    entries.push({
      label: "EVENTIDE_RP_SYSTEM.WindowTitles.RollHistory",
      icon: '<i class="fas fa-dice-d6"></i>',
      onClick: (_event, li) => {
        const actorId = li.dataset.documentId;
        const actor = game.actors.get(actorId);
        if (actor) {
          RollHistory.forActor(actor).render(true);
        }
      },
      visible: (li) => {
        const actorId = li.dataset.documentId;
        const actor = game.actors.get(actorId);
        return actor?.isOwner || game.user.isGM;
      },
      group: "action",
    });
  });
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data - The dropped data containing item information
 * @param {number} slot - The hotbar slot to use for the macro
 * @returns {Promise<Macro|null>} The created or existing macro, or null if creation fails
 */
async function createDocMacro(data, slot) {
  // this process isn't required for macro type items.
  if (data.type === "Macro") return;

  // First, determine if this is a valid owned item.
  if (data.type !== "Item") {
    if (!data.uuid.includes("Actor.") && !data.uuid.includes("Token.")) {
      return ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.OwnedMacrosOnly"),
      );
    }
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `erps.utils.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command,
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command,
      flags: { "eventide-rp-system.itemMacro": true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Execute a macro created from an Item drop.
 * @param {string} itemUuid - The UUID of the item to roll
 * @returns {Promise<void>}
 */
async function rollItemMacro(itemUuid) {
  Logger.info("Rolling item macro", { itemUuid }, "MACRO");
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: "Item",
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  try {
    const item = await Item.fromDropData(dropData);

    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.UnknownItemMacro", {
          item: itemName,
        }),
      );
    }

    // Trigger the item roll
    item.roll();
  } catch (error) {
    Logger.error("Failed to load item for macro", error, "MACRO");
    ui.notifications.error(
      game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.MacroExecutionError", {
        item: itemUuid,
      }),
    );
  }
}

/* -------------------------------------------- */
/*  System Cleanup                             */
/* -------------------------------------------- */

/**
 * Clean up system resources when the world is being shut down
 * This helps prevent memory leaks and ensures proper cleanup
 *
 * NOTE: We do NOT perform cleanup on:
 * - visibilitychange (alt-tab): Would destroy active DOM elements
 * - pause: Too aggressive, could break active sheets
 *
 * Cleanup only happens on:
 * - beforeunload: Browser/page close (proper shutdown)
 * - hot reload: Development module reload
 */
Hooks.on("paused", (paused) => {
  // Only log, don't perform aggressive cleanup on pause
  // Pause can happen during normal gameplay (e.g., combat pause)
  if (paused && game.user.isGM) {
    Logger.debug("Game paused", null, "SYSTEM_CLEANUP");
  }
});

// Log when system applications close (for debugging only)
if (typeof Hooks.on === "function") {
  Hooks.on("closeApplication", (app) => {
    // Log system application closures for debugging purposes only
    if (app.constructor.name.includes("EventideRpSystem")) {
      Logger.debug(
        "System application closing",
        { appName: app.constructor.name },
        "SYSTEM_CLEANUP",
      );
    }
  });
}
