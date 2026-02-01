/**
 * Helper functions for character effects
 * @module helpers/character-effects
 */

/**
 * Prepares character effects by categorizing them into regular, hidden, and override effects
 *
 * This function processes an effect object and categorizes its changes based on
 * which abilities they affect and whether those abilities are hidden, override, or regular.
 *
 * @param {Object} effect - The effect object to process
 * @param {Array} [effect.changes] - Array of changes in the effect
 * @returns {Object} Object containing categorized effects
 * @returns {Array} returns.fullEffects - All effects
 * @returns {Array} returns.regularEffects - Effects that affect visible abilities
 * @returns {Array} returns.hiddenEffects - Effects that affect hidden abilities
 * @returns {Array} returns.overrideEffects - Effects that affect override abilities
 */
const prepareCharacterEffects = async (effect) => {
  const fullEffects = [];
  const regularEffects = [];
  const hiddenEffects = [];
  const overrideEffects = [];

  // If there are no changes, return empty arrays
  if (!effect.changes) {
    return {
      fullEffects,
      regularEffects,
      hiddenEffects,
      overrideEffects,
    };
  }

  // Define ability categories
  const abilities = ["acro", "phys", "fort", "will", "wits"];
  const hiddenAbilities = [
    "dice",
    "cmax",
    "cmin",
    "fmax",
    "fmin",
    "vuln",
    "powerMult",
    "resolveMult",
  ];
  const overrideAbilities = ["powerOverride", "resolveOverride"];
  const allAbilities = [...abilities, ...hiddenAbilities, ...overrideAbilities];

  // Process each change in the effect
  for (const change of effect.changes) {
    // Determine which ability this change affects
    let ability;

    // Special handling for override abilities (powerOverride, resolveOverride)
    if (change.key === "system.power.override") {
      ability = "powerOverride";
    } else if (change.key === "system.resolve.override") {
      ability = "resolveOverride";
    } else {
      // Regular and hidden abilities use includes matching
      ability = allAbilities.find((ability) => change.key.includes(ability));
    }

    // Determine the mode of the effect
    const mode = determineEffectMode(change);

    // If this change affects an ability, add it to the effects list
    if (ability) {
      fullEffects.push({
        ability,
        value: change.value,
        mode,
        hidden: hiddenAbilities.includes(ability),
        override: overrideAbilities.includes(ability),
      });
    }
  }

  // Categorize effects as either hidden, override, or regular
  for (const e of fullEffects) {
    if (e.hidden) {
      hiddenEffects.push(e);
    } else if (e.override) {
      overrideEffects.push(e);
    } else {
      regularEffects.push(e);
    }
  }

  return {
    fullEffects,
    regularEffects,
    hiddenEffects,
    overrideEffects,
  };
};

/**
 * Determines the mode of an effect change
 *
 * @private
 * @param {Object} change - The change object
 * @returns {string} The mode of the effect ("disadvantage", "advantage", "override", "ac.change", "transformOverride", "transformChange", or "change")
 */
const determineEffectMode = (change) => {
  if (change.key.includes("disadvantage")) return "disadvantage";
  if (change.key.includes("advantage")) return "advantage";
  if (change.key.includes("ac.change")) return "ac.change";
  if (change.key.includes("transformOverride")) return "transformOverride";
  if (change.key.includes("transformChange")) return "transformChange";
  if (change.mode === 5) return "override";
  return "change";
};

export { prepareCharacterEffects };
