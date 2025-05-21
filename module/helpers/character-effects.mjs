/**
 * Helper functions for character effects
 * @module helpers/character-effects
 */

/**
 * Prepares character effects by categorizing them into regular and hidden effects
 *
 * This function processes an effect object and categorizes its changes based on
 * which abilities they affect and whether those abilities are hidden or regular.
 *
 * @param {Object} effect - The effect object to process
 * @param {Array} [effect.changes] - Array of changes in the effect
 * @returns {Object} Object containing categorized effects
 * @returns {Array} returns.fullEffects - All effects
 * @returns {Array} returns.regularEffects - Effects that affect visible abilities
 * @returns {Array} returns.hiddenEffects - Effects that affect hidden abilities
 */
const prepareCharacterEffects = async (effect) => {
  const fullEffects = [];
  const regularEffects = [];
  const hiddenEffects = [];

  // If there are no changes, return empty arrays
  if (!effect.changes) {
    return {
      fullEffects,
      regularEffects,
      hiddenEffects,
    };
  }

  // Define ability categories
  const abilities = ["acro", "phys", "fort", "will", "wits"];
  const hiddenAbilities = ["dice", "cmax", "cmin", "fmax", "fmin", "vuln"];
  const allAbilities = [...abilities, ...hiddenAbilities];

  // Process each change in the effect
  for (const change of effect.changes) {
    // Determine which ability this change affects
    const ability = allAbilities.find((ability) =>
      change.key.includes(ability)
    );

    // Determine the mode of the effect
    const mode = determineEffectMode(change);

    // If this change affects an ability, add it to the effects list
    if (ability) {
      fullEffects.push({
        ability,
        value: change.value,
        mode,
        hidden: hiddenAbilities.includes(ability),
      });
    }
  }

  // Categorize effects as either hidden or regular
  for (const e of fullEffects) {
    if (e.hidden) {
      hiddenEffects.push(e);
    } else {
      regularEffects.push(e);
    }
  }

  return {
    fullEffects,
    regularEffects,
    hiddenEffects,
  };
};

/**
 * Determines the mode of an effect change
 *
 * @private
 * @param {Object} change - The change object
 * @returns {string} The mode of the effect ("disadvantage", "advantage", "override", or "change")
 */
const determineEffectMode = (change) => {
  if (change.key.includes("disadvantage")) return "disadvantage";
  if (change.key.includes("advantage")) return "advantage";
  if (change.mode === 5) return "override";
  return "change";
};

export { prepareCharacterEffects };
