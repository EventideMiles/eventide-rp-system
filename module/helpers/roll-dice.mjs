import { getSetting } from "./settings.mjs";

/**
 * Determines critical success/failure states for a roll
 * @param {Object} options - Options for critical state determination
 * @param {Roll} options.roll - The roll to check
 * @param {Object} options.thresholds - Object containing critical thresholds: gotten from hiddenAbilities
 * @param {Object} options.thresholds.cmin - Minimum value for critical hit
 * @param {Object} options.thresholds.cmax - Maximum value for critical hit
 * @param {Object} options.thresholds.fmin - Minimum value for critical miss
 * @param {Object} options.thresholds.fmax - Maximum value for critical miss
 * @param {string} options.formula - The roll formula
 * @param {boolean} [options.critAllowed=true] - Whether critical hits/misses are allowed
 * @returns {Object} Object containing critical states
 */
function determineCriticalStates({
  roll,
  thresholds,
  formula,
  critAllowed = true,
}) {
  // Early return if crits aren't allowed or there are no dice in the formula
  if (!critAllowed || !formula.includes("d") || !roll.terms[0]?.results) {
    return {
      critHit: false,
      critMiss: false,
      stolenCrit: false,
      savedMiss: false,
    };
  }

  const dieArray = roll.terms[0].results;
  const { cmin, cmax, fmin, fmax } = thresholds;
  const formulaLower = formula.toLowerCase();
  const isKeepLowest = formulaLower.includes("kl");
  const isKeepHighest = formulaLower.includes("k") && !isKeepLowest;

  // Check for basic crit hit/miss conditions
  const hasCritValue = (die) =>
    die.result <= cmax.total && die.result >= cmin.total;
  const hasMissValue = (die) =>
    die.result <= fmax.total && die.result >= fmin.total;

  // Determine base critical states
  let critHit = dieArray.some(hasCritValue);
  let critMiss = dieArray.some(hasMissValue);

  // Check for special conditions with advantage/disadvantage
  const allDiceCrit = dieArray.every(hasCritValue);
  const allDiceMiss = dieArray.every(hasMissValue);

  // Determine special cases
  const stolenCrit = critHit && isKeepLowest && !allDiceCrit;
  const savedMiss = critMiss && isKeepHighest && !allDiceMiss;

  // Adjust final states
  if (stolenCrit) critHit = false;
  if (savedMiss) critMiss = false;

  return { critHit, critMiss, stolenCrit, savedMiss };
}

/**
 * Roll handler for the Eventide RP System
 * This function processes dice rolls for various actions in the game system.
 * It handles critical hits/misses, AC checks against targets, and formats
 * the results into chat messages.
 *
 * @param {Object} rollData - Object containing roll data
 * @param {string} [rollData.formula="1"] - The dice formula to roll (e.g. "1d20+5")
 * @param {string} [rollData.label="unknown roll"] - Display name for the roll
 * @param {string} [rollData.type="unknown"] - Type of roll (e.g. "damage", "heal", ability code)
 * @param {boolean} [rollData.critAllowed=true] - Whether critical hits/misses are possible
 * @param {boolean} [rollData.acCheck=true] - Whether to check against target AC values
 * @param {string} [rollData.description=""] - Optional description of the roll
 * @param {boolean} [rollData.toMessage=true] - Whether to create a chat message
 * @param {Actor} actor - Actor performing the roll
 * @returns {Promise<Roll>} - Resolved promise containing the evaluated roll
 */
const rollHandler = async (
  {
    formula = "1",
    label = "unknown roll",
    type = "unknown",
    critAllowed = true,
    acCheck = true,
    description = "",
    toMessage = true,
  } = {},
  actor
) => {
  const rollData = actor.getRollData();
  const roll = new Roll(formula, rollData);
  const result = await roll.evaluate();
  const targetArray = await erps.utils.getTargetArray();
  const addCheck = (acCheck ?? true) && targetArray.length ? true : false;

  const pickedType = type.toLowerCase();

  // Determine critical states using the helper function
  const { critHit, critMiss, stolenCrit, savedMiss } = determineCriticalStates({
    roll: result,
    thresholds: rollData.hiddenAbilities,
    formula,
    critAllowed,
  });

  const targetRollData = addCheck
    ? targetArray.map((target) => ({
        name: target.actor.name,
        compare: result.total,
        ...target.actor.getRollData(),
      }))
    : [];

  const [pickedCardClass, pickedIcon] = pickedType.includes("acro")
    ? ["chat-card__header--acrobatics", "fa-solid fa-feather-pointed"]
    : pickedType.includes("phys")
    ? ["chat-card__header--physical", "fa-solid fa-dragon"]
    : pickedType.includes("fort")
    ? ["chat-card__header--fortitude", "fa-solid fa-shield"]
    : pickedType.includes("will")
    ? ["chat-card__header--will", "fa-solid fa-fire-flame-curved"]
    : pickedType.includes("wits")
    ? ["chat-card__header--wits", "fa-solid fa-chess"]
    : pickedType.includes("gear")
    ? ["chat-card__header--gear", "fa-solid fa-toolbox"]
    : pickedType.includes("damage")
    ? ["chat-card__header--damage", "fa-sharp-duotone fa-light fa-claw-marks"]
    : pickedType.includes("heal")
    ? ["chat-card__header--heal", "fa-regular fa-wave-pulse"]
    : ["chat-card__header--unknown", "fa-solid fa-question"];

  const data = {
    rollData,
    roll,
    result,
    label,
    description,
    pickedCardClass,
    pickedIcon,
    pickedType, // Add the picked type to the data
    critAllowed,
    acCheck: addCheck,
    targetArray,
    targetRollData,
    actor,
    critHit: critHit ?? false,
    critMiss: critMiss ?? false,
    savedMiss: savedMiss ?? false,
    stolenCrit: stolenCrit ?? false,
    // Add these properties to match initiative roll template
    name: actor.name,
    total: result.total,
    formula: formula,
  };

  const content = await renderTemplate(
    `systems/eventide-rp-system/templates/chat/roll-message.hbs`,
    data
  );

  if (toMessage) {
    // Use the system setting for default dice roll mode if available
    let rollMode = game.settings.get("core", "rollMode");

    // Create the chat message directly, similar to rollInitiative
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor }),
      content: content,
      sound: CONFIG.sounds.dice,
      rolls: [roll],
      flags: {
        "eventide-rp-system": {
          roll: {
            type: pickedType,
            formula: formula,
            total: result.total,
          },
        },
      },
    };

    // Apply roll mode if specified
    if (rollMode !== "roll") {
      messageData.rollMode = rollMode;
      if (rollMode === "gmroll" || rollMode === "blindroll") {
        messageData.whisper = game.users
          .filter((user) => user.isGM)
          .map((user) => user.id);
      }
    }

    ChatMessage.create(messageData);
  }

  return roll;
};

/**
 * Custom initiative roll handler for the Eventide RP System
 * This function handles initiative rolls with custom messaging and visibility options
 *
 * @param {Object} options - Options for the initiative roll
 * @param {Combatant} options.combatant - The combatant rolling initiative
 * @param {boolean} options.whisperMode - Whether to whisper the roll to GMs only
 * @param {string} options.customFlavor - Optional custom flavor text for the roll
 * @param {string} options.description - Optional description to include in the message
 * @returns {Promise<Roll>} The evaluated roll
 */
const rollInitiative = async ({
  combatant,
  whisperMode = false,
  description = "",
}) => {
  // Get initiative formula from settings or combatant
  let formula = CONFIG.Combat.initiative.formula;

  // Create and evaluate the roll
  const roll = new Roll(formula, combatant.actor?.getRollData() || {});
  await roll.evaluate();

  // Set combatant initiative
  const combat = combatant.parent;
  await combat.updateEmbeddedDocuments("Combatant", [
    {
      _id: combatant.id,
      initiative: roll.total,
    },
  ]);

  // Prepare template data
  const data = {
    name: combatant.name,
    formula: roll.formula,
    total: roll.total.toFixed(2),
    description: description,
    roll: roll, // Pass the roll object to the template
  };

  // Render the template
  const content = await renderTemplate(
    "systems/eventide-rp-system/templates/chat/initiative-roll.hbs",
    data
  );

  // Prepare the message data
  const messageData = {
    speaker: ChatMessage.getSpeaker({ actor: combatant.actor }),
    content: content,
    sound: CONFIG.sounds.dice,
    // Pass the roll data directly
    rolls: [roll],
  };

  // If whisper mode is enabled, only show to GMs
  if (whisperMode) {
    messageData.whisper = game.users
      .filter((user) => user.isGM)
      .map((user) => user.id);

    console.log("Whispering initiative roll to GMs only");
  }

  // Send the message
  await ChatMessage.create(messageData);

  return roll;
};

export { rollHandler, rollInitiative };
