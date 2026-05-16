/**
 * ConditionEvaluator
 *
 * Shared condition evaluation logic for effect application thresholds.
 * Provides a single source of truth for the 12-condition switch used
 * across action card execution, damage processing, and effect attachment.
 *
 * Usage:
 *   ConditionEvaluator.evaluate('oneSuccess', oneHit, bothHit);
 *   ConditionEvaluator.evaluate('criticalSuccess', oneHit, bothHit, 0, 15, roll, actor, formula);
 *
 * @module ConditionEvaluator
 */

import { ERPSRollUtilities } from "../utils/roll-utilities.mjs";

export class ConditionEvaluator {
  /**
   * Evaluate whether a condition/threshold is met.
   *
   * @param {string} condition - The condition type
   * @param {boolean} oneHit - Whether at least one AC was hit
   * @param {boolean} bothHit - Whether both ACs were hit
   * @param {number} [rollTotal=0] - The total roll result (for rollValue conditions)
   * @param {number} [threshold=15] - The threshold value (for rollValue conditions)
   * @param {Roll} [roll=null] - The full roll object (for critical detection)
   * @param {Actor} [actor=null] - The actor (for critical thresholds)
   * @param {string} [formula=null] - The roll formula (for critical detection)
   * @returns {boolean} Whether the condition is met
   */
  static evaluate(
    condition,
    oneHit,
    bothHit,
    rollTotal = 0,
    threshold = 15,
    roll = null,
    actor = null,
    formula = null,
  ) {
    switch (condition) {
      case "never":
        return false;
      case "oneSuccess":
        return oneHit;
      case "twoSuccesses":
        return bothHit;
      case "rollValue":
        return rollTotal >= threshold;
      case "rollUnderValue":
        return rollTotal < threshold;
      case "rollEven":
        return rollTotal % 2 === 0;
      case "rollOdd":
        return rollTotal % 2 !== 0;
      case "rollOnValue":
        return rollTotal === threshold;
      case "zeroSuccesses":
        return !oneHit;
      case "always":
        return true;
      case "criticalSuccess":
      case "criticalFailure": {
        if (!roll || !actor || !formula) {
          return false;
        }

        const actorRollData = actor.getRollData();
        const criticalStates = ERPSRollUtilities.determineCriticalStates({
          roll,
          thresholds: actorRollData.hiddenAbilities,
          formula,
          critAllowed: true,
        });

        const result =
          condition === "criticalSuccess"
            ? criticalStates.critHit && !criticalStates.stolenCrit
            : criticalStates.critMiss && !criticalStates.savedMiss;

        return result;
      }
      default:
        return false;
    }
  }
}
