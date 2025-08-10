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
} from "./services/_module.mjs";

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
/** @type {EventideRPSystemGlobal} */
globalThis.erps = {
  documents: {
    EventideRpSystemActor,
    EventideRpSystemItem,
  },
  applications: {
    EventideRpSystemActorSheet,
    EventideRpSystemItemSheet,
  },
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
  },
  macros: {
    GearTransfer,
    GearCreator,
    DamageTargets,
    RestoreTarget,
    ChangeTargetStatus,
    SelectAbilityRoll,
    EffectCreator,
    TransformationCreator,
  },
  settings: {
    getSetting,
    setSetting,
  },
  messages: erpsMessageHandler,
  models,
  Logger,
  gmControl: null, // Will be set after import

  // Manual cleanup functions for debugging and emergency cleanup
  cleanup: performSystemCleanup,
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

  // Diagnostic function to check system state
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

    const diagnostics = {
      trackedIntervals,
      memoryInfo,
      gmControlHooksInitialized,
      numberInputsInitialized,
      activeThemeInstances:
        globalThis.erps?.utils?.getActiveThemeInstances?.() || "Unknown",
      actorCount: game.actors?.size || 0,
      itemCount: game.items?.size || 0,
      messageCount: game.messages?.size || 0,
      sceneCount: game.scenes?.size || 0,
      userCount: game.users?.size || 0,
      systemVersion: game.system.version,
      foundryVersion: game.version,
      timestamp: new Date().toISOString(),
    };

    Logger.info("System Diagnostics", diagnostics, "SYSTEM_DIAGNOSTICS");
    return diagnostics;
  },

  // Performance monitoring dashboard
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
    const { gmControlManager } = await import(
      "./services/managers/gm-control.mjs"
    );
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
        formula: game.settings.get("eventide-rp-system", "initativeFormula"),
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
 * Convert a string to lowercase
 * @param {string} str - The string to convert
 * @returns {string} The lowercase string
 */
Handlebars.registerHelper("toLowerCase", (str) => {
  return str.toLowerCase();
});

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
 * Convert a string to lowercase (alternative implementation)
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
    Logger.error("Failed to initialize image zoom service", error, "SYSTEM_INIT");
  }

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

  // Register canvas ready hook to ensure transformation consistency when switching scenes
  Hooks.on("canvasReady", () => {
    EventideRpSystemActor._onCanvasReady();
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
 */
Hooks.on("paused", (paused) => {
  // If the game is being paused (which can indicate shutdown), perform cleanup
  if (paused && game.user.isGM) {
    Logger.info("Performing system cleanup on pause", null, "SYSTEM_CLEANUP");
    try {
      performSystemCleanup();
    } catch (error) {
      Logger.error(
        "Failed to perform cleanup on pause",
        error,
        "SYSTEM_CLEANUP",
      );
    }
  }
});

// Also clean up on any system disable/reload events if available
if (typeof Hooks.on === "function") {
  // Listen for any potential system disable events
  Hooks.on("closeApplication", (app) => {
    // If this is a system-critical application closing, consider cleanup
    if (app.constructor.name.includes("EventideRpSystem")) {
      Logger.info(
        "System application closing, checking for cleanup needs",
        { appName: app.constructor.name },
        "SYSTEM_CLEANUP",
      );
    }
  });
}
