import { getSetting } from "./settings.mjs";
import { rollInitiative } from "./roll-dice.mjs";

/**
 * Handles combat-related functionality for the Eventide RP System
 */

/**
 * Initialize combat-related hooks
 */
export async function initializeCombatHooks() {
  // Auto-roll NPC initiative when combat starts
  Hooks.on("createCombatant", async (combatant, options, userId) => {
    if (game.user.id !== userId) return;

    // Only process NPCs if the setting is enabled
    let autoRollNpcInitiative = false;
    let hideNpcInitiativeRolls = false;

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

        // Debug log
        console.log("NPC Initiative Settings:", {
          autoRollNpcInitiative,
          hideNpcInitiativeRolls,
          combatantId: combatant.id,
          isNPC: !combatant.actor.hasPlayerOwner,
        });
      } catch (error) {
        console.warn("Could not get NPC initiative settings, using defaults");
      }
    }

    if (autoRollNpcInitiative && !combatant.actor.hasPlayerOwner) {
      // Roll initiative for this NPC using our custom handler
      try {
        await rollInitiative({
          combatant: combatant,
          whisperMode: hideNpcInitiativeRolls,
          customFlavor: `${combatant.name || combatant.actor.name} rolls for Initiative!`
        });
      } catch (error) {
        console.error("Error rolling NPC initiative:", error);
        // Fall back to the default method if our custom approach fails
        combatant.parent.rollInitiative(combatant.id);
      }
    }
  });

  // Completely override the Combat.rollInitiative method to use our custom initiative roller
  Combat.prototype.rollInitiative = async function(ids, options={}) {
    // Get the hideNpcInitiativeRolls setting
    let hideNpcInitiativeRolls = false;
    try {
      hideNpcInitiativeRolls = game.settings.get("eventide-rp-system", "hideNpcInitiativeRolls");
    } catch (error) {
      console.warn("Could not get hideNpcInitiativeRolls setting, using default");
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
      
      // Determine if this is an NPC roll that should be hidden
      const isNpc = !combatant.actor.hasPlayerOwner;
      const shouldWhisper = hideNpcInitiativeRolls && isNpc;
      
      // Use our custom initiative roller
      await rollInitiative({
        combatant: combatant,
        whisperMode: shouldWhisper || rollMode === "gmroll" || rollMode === "blindroll",
        customFlavor: options.messageOptions?.flavor || `${combatant.name} rolls for Initiative!`
      });
    }
    
    return this;
  };

  // Also override the Combatant.rollInitiative method to ensure all initiative rolls use our system
  Combatant.prototype.rollInitiative = async function(options={}) {
    // Get the hideNpcInitiativeRolls setting
    let hideNpcInitiativeRolls = false;
    try {
      hideNpcInitiativeRolls = game.settings.get("eventide-rp-system", "hideNpcInitiativeRolls");
    } catch (error) {
      console.warn("Could not get hideNpcInitiativeRolls setting, using default");
    }
    
    // Determine if this is an NPC roll that should be hidden
    const isNpc = !this.actor.hasPlayerOwner;
    const shouldWhisper = hideNpcInitiativeRolls && isNpc;
    const rollMode = options.messageOptions?.rollMode;
    
    // Use our custom initiative roller
    return await rollInitiative({
      combatant: this,
      whisperMode: shouldWhisper || rollMode === "gmroll" || rollMode === "blindroll",
      customFlavor: options.messageOptions?.flavor || `${this.name} rolls for Initiative!`
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
