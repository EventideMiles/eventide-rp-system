// Import document classes.
import { EventideRpSystemActor } from "./documents/actor.mjs";
import { EventideRpSystemItem } from "./documents/item.mjs";
// Import sheet classes.
import { EventideRpSystemActorSheet } from "./sheets/actor-sheet.mjs";
import { EventideRpSystemItemSheet } from "./sheets/item-sheet.mjs";
import { GearCreator } from "./sheets/gear-creator.mjs";
import { DamageTargets } from "./sheets/damage-targets.mjs";
import { RestoreTarget } from "./sheets/restore-target.mjs";
import { ChangeTargetStatus } from "./sheets/change-target-status.mjs";
import { SelectAbilityRoll } from "./sheets/select-ability-roll.mjs";
import { GearTransfer } from "./sheets/gear-transfer.mjs";
import { EffectCreator } from "./sheets/effect-creator.mjs";
// Import helper/utility classes and constants.
import { EVENTIDE_RP_SYSTEM } from "./helpers/config.mjs";
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { registerSettings, getSetting } from "./helpers/settings.mjs";
import { initializeCombatHooks } from "./helpers/combat.mjs";
// Import DataModel classes
import * as models from "./data/_module.mjs";
import {
  getSelectedArray,
  getTargetArray,
  retrieveLocal,
  storeLocal,
} from "./helpers/common-foundry-tasks.mjs";
import {
  createStatusMessage,
  featureMessage,
  deleteStatusMessage,
  restoreMessage,
  combatPowerMessage,
  gearTransferMessage,
  gearEquipMessage,
} from "./helpers/system-messages.mjs";

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
    rollItemMacro,
    getTargetArray,
    getSelectedArray,
    storeLocal,
    retrieveLocal,
  },
  macros: {
    GearTransfer,
    GearCreator,
    DamageTargets,
    RestoreTarget,
    ChangeTargetStatus,
    SelectAbilityRoll,
    EffectCreator,
  },
  messages: {
    createStatusMessage,
    featureMessage,
    deleteStatusMessage,
    restoreMessage,
    combatPowerMessage,
    gearTransferMessage,
    gearEquipMessage,
  },
  models,
};

Hooks.once("init", function () {
  // Add custom constants for configuration.
  CONFIG.EVENTIDE_RP_SYSTEM = EVENTIDE_RP_SYSTEM;

  // Register system settings
  registerSettings();

  // Initialize combat hooks
  initializeCombatHooks();

  /**
   * Set an initiative formula for the system
   * @type {String}
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
      console.warn("Could not get initiative settings, using defaults");
    }
  }

  // Define custom Document and DataModel classes
  CONFIG.Actor.documentClass = EventideRpSystemActor;

  // Note that you don't need to declare a DataModel
  // for the base actor/item classes - they are included
  // with the Character/NPC as part of super.defineSchema()
  CONFIG.Actor.dataModels = {
    character: models.EventideRpSystemCharacter,
    npc: models.EventideRpSystemNPC,
  };
  CONFIG.Item.documentClass = EventideRpSystemItem;
  CONFIG.Item.dataModels = {
    gear: models.EventideRpSystemGear,
    feature: models.EventideRpSystemFeature,
    status: models.EventideRpSystemStatus,
    combatPower: models.EventideRpSystemCombatPower,
  };

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
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
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper("toLowerCase", function (str) {
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

Handlebars.registerHelper("keySplit", function (key, choice) {
  return key.split(".")[choice];
});

Handlebars.registerHelper("abs", function (value) {
  return Math.abs(value);
});

Handlebars.registerHelper("console", function (str) {
  console.log(str);
});

Handlebars.registerHelper("debug", function (optionalValue) {
  console.log("Current Context");
  console.log("====================");
  console.log(this);
  if (optionalValue) {
    console.log("Value");
    console.log("====================");
    console.log(optionalValue);
  }
});

Handlebars.registerHelper("lowercase", function (str) {
  return (str || "").toLowerCase();
});

Handlebars.registerHelper("capitalize", function (str) {
  if (!str) return "";
  str = String(str);
  return str.charAt(0).toUpperCase() + str.slice(1);
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", function () {
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
  if (data.type !== "Item") return;
  if (!data.uuid.includes("Actor.") && !data.uuid.includes("Token.")) {
    return ui.notifications.warn(
      game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.OwnedMacrosOnly")
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `erps.utils.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
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
  console.log("Rolling item macro for " + itemUuid);
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
        })
      );
    }

    // Trigger the item roll
    item.roll();
  });
}

/* -------------------------------------------- */
/*  System Hooks                                */
/* -------------------------------------------- */
Hooks.on("updateItem", (item, changed, options, triggerPlayer) => {
  if (
    item.type === "status" &&
    item.system.description &&
    item.actor !== null &&
    item.actor !== undefined &&
    game.user.id === triggerPlayer
  ) {
    createStatusMessage(item);
  } else if (item.type === "gear" && item.actor !== null) {
    console.log(item);
    if (item.system.quantity >= 1 && item.system.equipped) {
      item.effects.forEach((effect) => effect.update({ disabled: false }));
    } else {
      item.effects.forEach((effect) => effect.update({ disabled: true }));
    }
  }
});

Hooks.on("createItem", (item, options, triggerPlayer) => {
  // Status Message Handler
  if (
    item.type === "status" &&
    item.actor !== null &&
    game.user.id === triggerPlayer
  ) {
    createStatusMessage(item);
  }
  if (
    item.type === "feature" &&
    item.actor !== null &&
    game.user.id === triggerPlayer
  ) {
    featureMessage(item);
  }
});

Hooks.on("deleteItem", (item, options, triggerPlayer) => {
  // Delete Status Message Handler
  if (
    item.type === "status" &&
    item.parent !== null &&
    game.user.id === triggerPlayer
  ) {
    deleteStatusMessage(item);
  }
});

Hooks.on("renderChatMessage", (message, [html]) => {
  if (game.user.isGM) return;

  html.querySelector(".chat-card__effects--ac-check")?.remove();
  html.querySelector(".secret")?.remove();
});
