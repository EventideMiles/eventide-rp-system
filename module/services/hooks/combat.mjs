import { erpsRollHandler } from "../managers/roll-dice.mjs";

/**
 * Initialize combat-related hooks
 */
export async function initializeCombatHooks() {
  Hooks.on("createCombatant", async (combatant, options, userId) => {
    if (game.user.id !== userId) return;

    let autoRollNpcInitiative = false;
    let hideNpcInitiativeRolls = false;
    let autoRollPlayerInitiative = false;

    if (game.settings && game.settings.get) {
      try {
        autoRollNpcInitiative = game.settings.get(
          "eventide-rp-system",
          "autoRollNpcInitiative"
        );
        hideNpcInitiativeRolls = game.settings.get(
          "eventide-rp-system",
          "hideNpcInitiativeRolls"
        );
        autoRollPlayerInitiative = game.settings.get(
          "eventide-rp-system",
          "autoRollPlayerInitiative"
        );
      } catch (error) {
        console.warn("Could not get NPC initiative settings, using defaults");
      }
    }

    if (autoRollNpcInitiative && !combatant.actor.hasPlayerOwner) {
      try {
        await erpsRollHandler.rollInitiative({
          combatant: combatant,
          npc: true,
          whisperMode: hideNpcInitiativeRolls,
          customFlavor: `${
            combatant.name || combatant.actor.name
          } rolls for Initiative!`,
        });
      } catch (error) {
        console.error("Error rolling NPC initiative:", error);
        // Fall back to the default method if our custom approach fails
        combatant.parent.rollInitiative(combatant.id);
      }
    }

    if (autoRollPlayerInitiative && combatant.actor.hasPlayerOwner) {
      try {
        await erpsRollHandler.rollInitiative({
          combatant: combatant,
          npc: false,
          whisperMode: false,
          customFlavor: `${
            combatant.name || combatant.actor.name
          } rolls for Initiative!`,
        });
      } catch (error) {
        console.error("Error rolling player initiative:", error);
        // Fall back to the default method if our custom approach fails
        combatant.parent.rollInitiative(combatant.id);
      }
    }
  });

  // Override the Combat.rollInitiative method to use our custom initiative roller
  Combat.prototype.rollInitiative = async function (ids, options = {}) {
    // Get the hideNpcInitiativeRolls setting
    let hideNpcInitiativeRolls = false;
    try {
      hideNpcInitiativeRolls = game.settings.get(
        "eventide-rp-system",
        "hideNpcInitiativeRolls"
      );
    } catch (error) {
      console.warn(
        "Could not get hideNpcInitiativeRolls setting, using default"
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
        combatant: combatant,
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

  // Also override the Combatant.rollInitiative method to ensure all initiative rolls use our system
  Combatant.prototype.rollInitiative = async function (options = {}) {
    // Get the hideNpcInitiativeRolls setting
    let hideNpcInitiativeRolls = false;
    try {
      hideNpcInitiativeRolls = game.settings.get(
        "eventide-rp-system",
        "hideNpcInitiativeRolls"
      );
    } catch (error) {
      console.warn(
        "Could not get hideNpcInitiativeRolls setting, using default"
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

  // Set combat round duration
  Hooks.on("createCombat", (combat) => {
    if (game.settings && game.settings.get) {
      try {
        const roundDuration = game.settings.get(
          "eventide-rp-system",
          "defaultCombatRoundDuration"
        );
        if (roundDuration) {
          combat.update({ roundTime: roundDuration });
        }
      } catch (error) {
        console.warn(
          "Could not get combat round duration setting, using default"
        );
      }
    }
  });
}
