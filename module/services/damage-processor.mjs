/**
 * DamageProcessor Service
 *
 * Provides centralized damage processing for action card execution.
 * Handles damage roll resolution, vulnerability modifier application,
 * and damage condition evaluation for both attack chains and saved damage.
 *
 * @module DamageProcessor
 * @see module:item-action-card-execution
 */

import { Logger } from "./logger.mjs";

/**
 * @typedef {Object} TargetHitResult
 * @property {Actor} target - The target actor
 * @property {boolean} oneHit - Whether at least one AC check hit
 * @property {boolean} bothHit - Whether both AC checks hit
 */

/**
 * @typedef {Object} DamageResult
 * @property {Actor} target - The target actor that received damage
 * @property {Roll} roll - The damage roll result
 */

/**
 * @typedef {Object} DamageProcessingContext
 * @property {Item} actionCard - The action card item being executed
 * @property {string} damageFormula - The base damage formula
 * @property {string} damageType - The type of damage (e.g., "heal", "physical", etc.)
 * @property {string} damageCondition - Condition for damage application
 * @property {number} [damageThreshold=15] - Threshold for rollValue condition
 * @property {string} label - The label for the damage roll
 * @property {string} description - Description for the damage roll
 * @property {string} img - Image for the damage roll
 * @property {string} bgColor - Background color for the damage roll
 * @property {string} textColor - Text color for the damage roll
 */

/**
 * @typedef {Object} SavedDamageContext
 * @property {Item} actionCard - The action card item being executed
 * @property {string} formula - The saved damage formula
 * @property {string} type - The type of damage
 * @property {string} label - The label for the damage roll
 * @property {string} description - Description for the damage roll
 * @property {string} img - Image for the damage roll
 * @property {string} bgColor - Background color for the damage roll
 * @property {string} textColor - Text color for the damage roll
 */

/**
 * DamageProcessor class for processing damage rolls and applications
 *
 * @class DamageProcessor
 */
export class DamageProcessor {
  /**
   * Process damage results for attack chain targets
   *
   * Iterates through target hit results, evaluates damage conditions,
   * applies vulnerability modifiers, and resolves damage rolls.
   *
   * @static
   * @param {TargetHitResult[]} results - Array of target hit results
   * @param {Roll|null} rollResult - The attack roll result
   * @param {DamageProcessingContext} context - The damage processing context
   * @returns {Promise<DamageResult[]>} Array of damage results
   */
  static async processDamageResults(results, rollResult, context) {
    const damageResults = [];

    for (const result of results) {
      const shouldApplyDamage = DamageProcessor.shouldApplyEffect(
        context.damageCondition,
        result.oneHit,
        result.bothHit,
        rollResult?.total || 0,
        context.damageThreshold || 15,
      );

      if (shouldApplyDamage && context.damageFormula) {
        try {
          const damageRoll = await DamageProcessor.resolveDamageForTarget(
            result.target,
            context,
          );
          if (damageRoll) {
            damageResults.push({ target: result.target, roll: damageRoll });
          }
        } catch (damageError) {
          Logger.error(
            "Failed to apply chain damage",
            damageError,
            "ACTION_CARD",
          );
          // Continue processing other targets even if one fails
        }
      }
    }

    return damageResults;
  }

  /**
   * Process saved damage for targets
   *
   * Applies saved damage to each target with vulnerability modifiers.
   * Used for action cards with saved damage mode.
   *
   * @static
   * @param {Token[]} targetArray - Array of target tokens
   * @param {SavedDamageContext} context - The saved damage context
   * @returns {Promise<DamageResult[]>} Array of damage results
   */
  static async processSavedDamage(targetArray, context) {
    const damageResults = [];

    for (const target of targetArray) {
      try {
        const damageRoll = await DamageProcessor.resolveDamageForTarget(
          target.actor,
          {
            damageFormula: context.formula,
            damageType: context.type,
            label: context.label,
            description: context.description,
            img: context.img,
            bgColor: context.bgColor,
            textColor: context.textColor,
          },
        );
        if (damageRoll) {
          damageResults.push({ target: target.actor, roll: damageRoll });
        }
      } catch (damageError) {
        Logger.error(
          "Failed to apply saved damage",
          damageError,
          "ACTION_CARD",
        );
        // Continue processing other targets even if one fails
      }
    }

    return damageResults;
  }

  /**
   * Resolve damage for a single target
   *
   * Applies vulnerability modifiers to the damage formula and
   * calls the target's damageResolve method.
   *
   * @static
   * @param {Actor} target - The target actor
   * @param {Object} context - Damage context with formula, type, and display properties
   * @param {string} context.damageFormula - The base damage formula
   * @param {string} context.damageType - The type of damage
   * @param {string} context.label - Label for the damage roll
   * @param {string} context.description - Description for the damage roll
   * @param {string} context.img - Image for the damage roll
   * @param {string} context.bgColor - Background color for the damage roll
   * @param {string} context.textColor - Text color for the damage roll
   * @returns {Promise<Roll|null>} The damage roll result or null if failed
   */
  static async resolveDamageForTarget(target, context) {
    const {
      damageFormula,
      damageType,
      label,
      description,
      img,
      bgColor,
      textColor,
    } = context;

    // Apply vulnerability modifier to damage formula
    const formula = DamageProcessor.applyVulnerabilityModifier(
      damageFormula,
      damageType,
      target,
    );

    const damageRoll = await target.damageResolve({
      formula,
      label,
      description,
      type: damageType,
      img,
      bgColor,
      textColor,
    });

    return damageRoll;
  }

  /**
   * Apply vulnerability modifier to damage formula
   *
   * Adds the target's vulnerability total to the damage formula
   * for non-healing damage types.
   *
   * @static
   * @param {string} originalFormula - The original damage formula
   * @param {string} damageType - The type of damage
   * @param {Actor} target - The target actor
   * @returns {string} The modified formula with vulnerability applied
   */
  static applyVulnerabilityModifier(originalFormula, damageType, target) {
    const vulnerabilityTotal = target.system?.hiddenAbilities?.vuln?.total || 0;

    // Only apply vulnerability for non-healing damage
    if (damageType !== "heal" && vulnerabilityTotal > 0) {
      return `${originalFormula} + ${Math.abs(vulnerabilityTotal)}`;
    }

    return originalFormula;
  }

  /**
   * Determine if an effect should be applied based on conditions
   *
   * Evaluates the condition against hit results and roll values
   * to determine if damage or other effects should be applied.
   *
   * @static
   * @param {string} condition - The condition type ("never", "oneSuccess", "twoSuccesses", "rollValue")
   * @param {boolean} oneHit - Whether at least one AC was hit
   * @param {boolean} bothHit - Whether both ACs were hit
   * @param {number} rollTotal - The total roll result (for rollValue condition)
   * @param {number} threshold - The threshold value (for rollValue condition)
   * @returns {boolean} Whether the effect should be applied
   */
  static shouldApplyEffect(
    condition,
    oneHit,
    bothHit,
    rollTotal = 0,
    threshold = 15,
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
      default:
        return false;
    }
  }

  /**
   * Check if damage should be applied based on attack chain configuration
   *
   * Convenience method that combines condition evaluation with
   * damage formula presence check.
   *
   * @static
   * @param {Object} attackChain - Attack chain configuration
   * @param {string} attackChain.damageCondition - Condition for damage
   * @param {string} [attackChain.damageFormula] - Damage formula
   * @param {number} [attackChain.damageThreshold=15] - Threshold for damage
   * @param {boolean} oneHit - Whether at least one AC was hit
   * @param {boolean} bothHit - Whether both ACs were hit
   * @param {number} rollTotal - The total roll result
   * @returns {boolean} Whether damage should be applied
   */
  static shouldApplyDamage(attackChain, oneHit, bothHit, rollTotal) {
    if (!attackChain.damageFormula) {
      return false;
    }

    return DamageProcessor.shouldApplyEffect(
      attackChain.damageCondition,
      oneHit,
      bothHit,
      rollTotal,
      attackChain.damageThreshold || 15,
    );
  }

  /**
   * Get vulnerability total for a target
   *
   * Safely retrieves the vulnerability total from a target's hidden abilities.
   *
   * @static
   * @param {Actor} target - The target actor
   * @returns {number} The vulnerability total (0 if not found)
   */
  static getVulnerabilityTotal(target) {
    return target.system?.hiddenAbilities?.vuln?.total || 0;
  }

  /**
   * Check if a target has vulnerability
   *
   * @static
   * @param {Actor} target - The target actor
   * @returns {boolean} True if the target has vulnerability
   */
  static hasVulnerability(target) {
    return DamageProcessor.getVulnerabilityTotal(target) > 0;
  }

  /**
   * Check if damage type is healing
   *
   * @static
   * @param {string} damageType - The damage type to check
   * @returns {boolean} True if the damage type is healing
   */
  static isHealing(damageType) {
    return damageType === "heal";
  }

  /**
   * Validate damage formula
   *
   * Checks if a damage formula is valid (non-empty string).
   *
   * @static
   * @param {string} formula - The formula to validate
   * @returns {boolean} True if the formula is valid
   */
  static isValidFormula(formula) {
    return typeof formula === "string" && formula.trim().length > 0;
  }
}
