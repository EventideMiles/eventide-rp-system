/**
 * ERPSRollUtilities - Shared utilities for dice rolling and message handling
 * @class
 */
export class ERPSRollUtilities {
  /**
   * Determines critical success/failure states for a roll
   * @param {Object} options - Options for critical state determination
   * @param {Roll} options.roll - The roll to check
   * @param {Object} options.thresholds - Object containing critical thresholds
   * @param {Object} options.thresholds.cmin - Minimum value for critical hit
   * @param {Object} options.thresholds.cmax - Maximum value for critical hit
   * @param {Object} options.thresholds.fmin - Minimum value for critical miss
   * @param {Object} options.thresholds.fmax - Maximum value for critical miss
   * @param {string} options.formula - The roll formula
   * @param {boolean} [options.critAllowed=true] - Whether critical hits/misses are allowed
   * @returns {Object} Object containing critical states
   */
  static determineCriticalStates({
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

    // Check if all dice meet the condition
    const allDiceCrit = dieArray.every(hasCritValue);
    const allDiceMiss = dieArray.every(hasMissValue);

    // Determine special cases
    let stolenCrit = critHit && isKeepLowest && !allDiceCrit;
    let savedMiss = critMiss && isKeepHighest && !allDiceMiss;

    // Adjust final states
    if (stolenCrit) critHit = false;
    if (savedMiss) critMiss = false;
    if (critHit) savedMiss = false;
    if (critMiss) stolenCrit = false;

    return { critHit, critMiss, stolenCrit, savedMiss };
  }

  /**
   * Helper method to generate style string from item colors
   * @param {Item} item - The item to get colors from
   * @returns {string} CSS style string
   */
  static getItemStyle(item) {
    const bgColor = item.system.bgColor?.css || "#444";
    const textColor = item.system.textColor?.css || "#fff";
    return `background-color: ${bgColor}; color: ${textColor};`;
  }

  /**
   * Helper method to generate a speaker object for chat messages
   * @param {Actor} actor - The actor speaking
   * @param {string} [headerKey] - The i18n key for the message header
   * @returns {Object} Speaker object for ChatMessage.create
   */
  static getSpeaker(actor, headerKey = null) {
    const speakerData = { actor };

    if (headerKey) {
      speakerData.alias = game.i18n.format(headerKey, {
        name: actor.name,
      });
    }

    return ChatMessage.getSpeaker(speakerData);
  }
}
