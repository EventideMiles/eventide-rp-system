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
  erpsMessageHandler,
  initHandlebarsPartials,
  getSetting,
  setSetting,
  Logger,
} from "./services/_module.mjs";

// Import DataModel classes
import * as models from "./data/_module.mjs";

// Import utility functions
import { commonTasks, ErrorHandler } from "./utils/_module.mjs";

//import helper functions
import {
  initColorPickersWithHex,
  cleanupColorPickers,
  enhanceExistingColorPickers,
  initNumberInputs,
  cleanupNumberInputs,
  initRangeSliders,
  cleanupRangeSliders,
} from "./helpers/_module.mjs";

const { Actors, Items } = foundry.documents.collections;
const { ActorSheet, ItemSheet } = foundry.appv1.sheets;

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

// Add key classes to the global scope so they can be more easily used
// by downstream developers
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
    cleanupColorPickers,
    initRangeSliders,
    cleanupRangeSliders,
    ErrorHandler,
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
};

/**
 * Initialize the Eventide RP System
 * Sets up system configuration, registers document classes, initializes hooks and listeners
 */
Hooks.once("init", async () => {
  console.info("ERPS | Initializing Eventide RP System");

  // Add custom constants for configuration
  CONFIG.EVENTIDE_RP_SYSTEM = EVENTIDE_RP_SYSTEM;
  // Register system settings
  registerSettings();
  // Preload Handlebars templates
  await preloadHandlebarsTemplates();
  // Initialize handlebars partials
  initHandlebarsPartials();
  // Initialize combat hooks
  initializeCombatHooks();
  // Initialize chat message listeners
  initChatListeners();
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
      console.warn(
        "ERPS | Could not get initiative settings, using defaults",
        error,
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
  console.info("ERPS | Eventide RP System Initialization Complete");
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper("toLowerCase", (str) => {
  return str.toLowerCase();
});

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

Handlebars.registerHelper("keySplit", (key, choice) => {
  return key.split(".")[choice];
});

Handlebars.registerHelper("abs", (value) => {
  return Math.abs(value);
});

Handlebars.registerHelper("console", (str) => {
  console.info(str);
});

Handlebars.registerHelper("debug", function (optionalValue) {
  console.info("Current Context");
  console.info("====================");
  console.info(this);
  if (optionalValue) {
    console.info("Value");
    console.info("====================");
    console.info(optionalValue);
  }
});

Handlebars.registerHelper("lowercase", (str) => {
  return (str || "").toLowerCase();
});

Handlebars.registerHelper("capitalize", (str) => {
  if (!str) return "";
  str = String(str);
  return str.charAt(0).toUpperCase() + str.slice(1);
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", () => {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createDocMacro(data, slot));
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
  console.info(`Rolling item macro for ${itemUuid}`);
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: "Item",
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
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
  });
}
