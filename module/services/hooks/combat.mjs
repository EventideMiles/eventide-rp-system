/**
 * Combat-related hooks for the Eventide RP System
 * @module services/hooks/combat
 */
import { erpsRollHandler } from "../managers/_module.mjs";
import { Logger } from "../logger.mjs";

/**
 * Initialize combat-related hooks
 *
 * Sets up hooks for combat initialization, initiative rolling, and handles
 * both player and NPC initiative rolls based on system settings.
 *
 * @returns {Promise<void>}
 */
export const initializeCombatHooks = async () => {
  // Hook into combatant creation to handle automatic initiative rolling
  Hooks.on("createCombatant", async (combatant, options, userId) => {
    // Only process if this is the user who created the combatant
    if (game.user.id !== userId) return;

    // Get initiative settings
    const settings = getCombatSettings();

    // Roll initiative for NPCs if automatic rolling is enabled
    if (settings.autoRollNpcInitiative && !combatant.actor.hasPlayerOwner) {
      await rollInitiativeForCombatant(
        combatant,
        true,
        settings.hideNpcInitiativeRolls,
      );
    }

    // Roll initiative for players if automatic rolling is enabled
    if (settings.autoRollPlayerInitiative && combatant.actor.hasPlayerOwner) {
      await rollInitiativeForCombatant(combatant, false, false);
    }
  });

  // Override the Combat.rollInitiative method to use our custom initiative roller
  overrideCombatRollInitiative();

  // Override the Combatant.rollInitiative method to ensure all initiative rolls use our system
  overrideCombatantRollInitiative();

  // Set combat round duration when a new combat is created
  Hooks.on("createCombat", (combat) => {
    if (!game.settings || !game.settings.get) return;

    try {
      const roundDuration = game.settings.get(
        "eventide-rp-system",
        "defaultCombatRoundDuration",
      );

      if (roundDuration) {
        combat.update({ roundTime: roundDuration });
      }
    } catch (error) {
      Logger.warn(
        "Could not get combat round duration setting, using default",
        error,
        "COMBAT_HOOKS",
      );
    }
  });
};

/**
 * Get combat-related settings
 *
 * @private
 * @returns {Object} Object containing combat settings
 */
const getCombatSettings = () => {
  let autoRollNpcInitiative = false;
  let hideNpcInitiativeRolls = false;
  let autoRollPlayerInitiative = false;

  if (game.settings && game.settings.get) {
    try {
      autoRollNpcInitiative = game.settings.get(
        "eventide-rp-system",
        "autoRollNpcInitiative",
      );
      hideNpcInitiativeRolls = game.settings.get(
        "eventide-rp-system",
        "hideNpcInitiativeRolls",
      );
      autoRollPlayerInitiative = game.settings.get(
        "eventide-rp-system",
        "autoRollPlayerInitiative",
      );
    } catch (error) {
      Logger.warn(
        "Could not get initiative settings, using defaults",
        error,
        "COMBAT_HOOKS",
      );
    }
  }

  return {
    autoRollNpcInitiative,
    hideNpcInitiativeRolls,
    autoRollPlayerInitiative,
  };
};

/**
 * Roll initiative for a combatant
 *
 * @private
 * @param {Combatant} combatant - The combatant to roll initiative for
 * @param {boolean} isNpc - Whether the combatant is an NPC
 * @param {boolean} whisperMode - Whether to whisper the roll
 * @returns {Promise<void>}
 */
const rollInitiativeForCombatant = async (combatant, isNpc, whisperMode) => {
  try {
    await erpsRollHandler.rollInitiative({
      combatant,
      npc: isNpc,
      whisperMode,
      customFlavor: `${
        combatant.name || combatant.actor.name
      } rolls for Initiative!`,
    });
  } catch (error) {
    Logger.error(
      `Error rolling initiative for ${isNpc ? "NPC" : "player"}`,
      error,
      "COMBAT_HOOKS",
    );
    // Fall back to the default method if our custom approach fails
    combatant.parent.rollInitiative(combatant.id);
  }
};

/**
 * Override the Combat.rollInitiative method
 *
 * @private
 */
const overrideCombatRollInitiative = () => {
  Combat.prototype.rollInitiative = async function (ids, options = {}) {
    // Get the hideNpcInitiativeRolls setting
    let hideNpcInitiativeRolls = false;
    try {
      hideNpcInitiativeRolls = game.settings.get(
        "eventide-rp-system",
        "hideNpcInitiativeRolls",
      );
    } catch (error) {
      Logger.warn(
        "Could not get hideNpcInitiativeRolls setting, using default",
        error,
        "COMBAT_HOOKS",
      );
    }

    // If options.messageOptions.rollMode is specified, respect that
    const rollMode = options.messageOptions?.rollMode;

    // Convert ids to an array
    ids = typeof ids === "string" ? [ids] : ids;
    if (!ids.length) return this;

    // Process each combatant
    for (const id of ids) {
      const combatant = this.combatants.get(id);
      if (!combatant?.isOwner) continue;

      const isNpc = !combatant.actor.hasPlayerOwner;
      const shouldWhisper = hideNpcInitiativeRolls && isNpc;

      await erpsRollHandler.rollInitiative({
        combatant,
        npc: isNpc,
        whisperMode:
          shouldWhisper || rollMode === "gmroll" || rollMode === "blindroll",
        customFlavor:
          options.messageOptions?.flavor ||
          `${combatant.name} rolls for Initiative!`,
      });
    }

    return this;
  };
};

/**
 * Override the Combatant.rollInitiative method
 *
 * @private
 */
const overrideCombatantRollInitiative = () => {
  Combatant.prototype.rollInitiative = async function (options = {}) {
    // Get the hideNpcInitiativeRolls setting
    let hideNpcInitiativeRolls = false;
    try {
      hideNpcInitiativeRolls = game.settings.get(
        "eventide-rp-system",
        "hideNpcInitiativeRolls",
      );
    } catch (error) {
      Logger.warn(
        "Could not get hideNpcInitiativeRolls setting, using default",
        error,
        "COMBAT_HOOKS",
      );
    }

    const isNpc = !this.actor.hasPlayerOwner;
    const shouldWhisper = hideNpcInitiativeRolls && isNpc;
    const rollMode = options.messageOptions?.rollMode;

    return await erpsRollHandler.rollInitiative({
      combatant: this,
      npc: isNpc,
      whisperMode:
        shouldWhisper || rollMode === "gmroll" || rollMode === "blindroll",
      customFlavor:
        options.messageOptions?.flavor || `${this.name} rolls for Initiative!`,
    });
  };
};
