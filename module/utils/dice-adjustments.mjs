/**
 * Dice Adjustments Utility
 *
 * Provides shared functionality for calculating dice adjustments
 * (advantage/disadvantage) across actors and items.
 *
 * This consolidates duplicate logic from actor-rolls.mjs and item-rolls.mjs
 */

/**
 * Calculate combined dice adjustments from multiple sources
 *
 * @param {Object} adjustments1 - First adjustments object
 * @param {Object} adjustments2 - Second adjustments object
 * @returns {Object} Combined adjustments with total, advantage, disadvantage, mode, absTotal
 */
export function combineDiceAdjustments(adjustments1, adjustments2) {
  const advantage =
    (adjustments1?.advantage || 0) + (adjustments2?.advantage || 0);
  const disadvantage =
    (adjustments1?.disadvantage || 0) + (adjustments2?.disadvantage || 0);
  const total = advantage - disadvantage;
  const absTotal = Math.abs(total);
  const mode = total >= 0 ? "k" : "kl"; // k = keep highest, kl = keep lowest

  return {
    total,
    advantage,
    disadvantage,
    mode,
    absTotal,
  };
}

/**
 * Calculate dice adjustments for mixed rolls (averaging two abilities)
 *
 * @param {Object} ability1DiceAdj - First ability's dice adjustments
 * @param {Object} ability2DiceAdj - Second ability's dice adjustments
 * @param {Object} itemDiceAdj - Item's dice adjustments
 * @returns {Object} Combined adjustments
 */
export function calculateMixedRollAdjustments(
  ability1DiceAdj,
  ability2DiceAdj,
  itemDiceAdj,
) {
  const combinedAdvantage =
    (ability1DiceAdj?.advantage || 0) +
    (ability2DiceAdj?.advantage || 0) +
    (itemDiceAdj?.advantage || 0);

  const combinedDisadvantage =
    (ability1DiceAdj?.disadvantage || 0) +
    (ability2DiceAdj?.disadvantage || 0) +
    (itemDiceAdj?.disadvantage || 0);

  return combineDiceAdjustments(
    { advantage: combinedAdvantage, disadvantage: combinedDisadvantage },
    {},
  );
}

/**
 * Build dice formula string based on adjustments
 *
 * @param {number} dieSize - The die size (e.g., 20)
 * @param {Object} adjustments - Dice adjustments object
 * @returns {string} The dice formula (e.g., "2d20kh1" or "1d20")
 */
export function buildDiceFormula(dieSize, adjustments) {
  const { absTotal, mode } = adjustments;

  if (absTotal > 0) {
    // When there are dice adjustments, roll multiple dice and keep best/worst
    return `${absTotal + 1}d${dieSize}${mode}1`;
  } else {
    // When no dice adjustments, roll a single die
    return `1d${dieSize}`;
  }
}

/**
 * Get default dice adjustments object
 *
 * @returns {Object} Default adjustments with all zeros
 */
export function getDefaultAdjustments() {
  return {
    total: 0,
    advantage: 0,
    disadvantage: 0,
    mode: "k",
    absTotal: 0,
  };
}

/**
 * Check if adjustments object has any non-zero values
 *
 * @param {Object} adjustments - Dice adjustments object
 * @returns {boolean} True if adjustments have any effect
 */
export function hasAdjustments(adjustments) {
  if (!adjustments) return false;
  return (
    (adjustments.advantage || 0) !== 0 || (adjustments.disadvantage || 0) !== 0
  );
}
