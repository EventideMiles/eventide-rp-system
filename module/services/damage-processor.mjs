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
import { ConditionEvaluator } from "../helpers/condition-evaluator.mjs";

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
 * @property {Actor} [actor] - The actor (for critical detection)
 * @property {string} [formula] - The roll formula (for critical detection)
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
    const rollTotal = rollResult?.total || 0;

    for (const result of results) {
      // Resolve damage condition
      const hasResolveFormula = !DamageProcessor.isZeroFormula(
        context.damageFormula,
      );
      const applyResolve =
        hasResolveFormula &&
        context.applyResolve !== false &&
        DamageProcessor.shouldApplyEffect(
          context.damageCondition,
          result.oneHit,
          result.bothHit,
          rollTotal,
          context.damageThreshold || 15,
          rollResult,
          context.actor,
          context.formula,
        );

      // Power damage condition (independent of resolve damage)
      const hasPowerFormula = !DamageProcessor.isZeroFormula(
        context.powerDamageFormula,
      );
      const applyPower =
        hasPowerFormula &&
        context.applyPower !== false &&
        DamageProcessor.shouldApplyEffect(
          context.powerDamageCondition,
          result.oneHit,
          result.bothHit,
          rollTotal,
          context.powerDamageThreshold || 15,
          rollResult,
          context.actor,
          context.formula,
        );

      if (applyResolve || applyPower) {
        try {
          const bundle = await DamageProcessor.resolveDamageBundleForTarget(
            result.target,
            {
              resolveDamage: applyResolve
                ? {
                    formula: context.damageFormula,
                    damageType: context.damageType,
                  }
                : null,
              powerDamage: applyPower
                ? {
                    formula: context.powerDamageFormula,
                    damageType: context.powerDamageType,
                  }
                : null,
              label: context.label,
              description: context.description,
              img: context.img,
              bgColor: context.bgColor,
              textColor: context.textColor,
            },
          );
          if (bundle) {
            damageResults.push({ target: result.target, ...bundle });
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

    const hasResolveFormula = !DamageProcessor.isZeroFormula(context.formula);
    const hasPowerFormula = !DamageProcessor.isZeroFormula(
      context.powerFormula,
    );

    for (const target of targetArray) {
      // Apply per-repetition gates from context
      const applyResolve = hasResolveFormula && context.applyResolve !== false;
      const applyPower = hasPowerFormula && context.applyPower !== false;

      if (!applyResolve && !applyPower) {
        continue;
      }

      try {
        const bundle = await DamageProcessor.resolveDamageBundleForTarget(
          target.actor,
          {
            resolveDamage: applyResolve
              ? {
                  formula: context.formula,
                  damageType: context.type,
                }
              : null,
            powerDamage: applyPower
              ? {
                  formula: context.powerFormula,
                  damageType: context.powerType,
                }
              : null,
            label: context.label,
            description: context.description,
            img: context.img,
            bgColor: context.bgColor,
            textColor: context.textColor,
          },
        );
        if (bundle) {
          damageResults.push({ target: target.actor, ...bundle });
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
   * Process self-damage for the card owner based on a condition
   *
   * Evaluates the self-damage condition against aggregated target hit results
   * (mirroring the self-effects pattern). When the condition is met and at
   * least one formula is non-zero, applies a resolve + power damage bundle to
   * the owner actor via resolveDamageBundleForTarget.
   *
   * @static
   * @param {Array} results - Target hit results
   * @param {Roll|null} rollResult - The attack roll result
   * @param {Object} context - Self-damage context
   * @param {Object} context.config - selfDamageConfig ({ condition, threshold, resolveFormula, resolveType, powerFormula, powerType })
   * @param {Actor} context.actor - The card owner (recipient of self-damage)
   * @param {Function} context.shouldApplyEffect - Condition evaluator function
   * @param {string} [context.label] - Label for the damage roll
   * @param {string} [context.description] - Description for the damage roll
   * @param {string} [context.img] - Image for the damage roll
   * @param {string} [context.bgColor] - Background color
   * @param {string} [context.textColor] - Text color
   * @returns {Promise<Object|null>} The bundle result or null if not applied
   */
  static async processSelfDamageResults(results, rollResult, context) {
    const { config, actor, shouldApplyEffect } = context;

    if (!config || !actor) return null;

    const hasResolveFormula = !DamageProcessor.isZeroFormula(
      config.resolveFormula,
    );
    const hasPowerFormula = !DamageProcessor.isZeroFormula(config.powerFormula);

    // Nothing to do if both formulas are zero
    if (!hasResolveFormula && !hasPowerFormula) return null;

    // Aggregate hit results across all targets (mirrors self-effects default path)
    const hasHits = results?.some((r) => r.firstHit || r.secondHit) || false;
    const oneHit = hasHits;
    const bothHit = results?.every((r) => r.firstHit && r.secondHit) || false;
    const rollTotal = rollResult?.total || 0;

    const conditionMet = shouldApplyEffect(
      config.condition,
      oneHit,
      bothHit,
      rollTotal,
      config.threshold || 15,
      rollResult,
      actor,
      rollResult?.formula,
    );

    if (!conditionMet) return null;

    return await DamageProcessor.resolveDamageBundleForTarget(actor, {
      resolveDamage: hasResolveFormula
        ? { formula: config.resolveFormula, damageType: config.resolveType }
        : null,
      powerDamage: hasPowerFormula
        ? { formula: config.powerFormula, damageType: config.powerType }
        : null,
      label: context.label,
      description: context.description,
      img: context.img,
      bgColor: context.bgColor,
      textColor: context.textColor,
    });
  }

  /**
   * Resolve damage for a single target
   *
   * Applies vulnerability modifiers (for damage) or healing increase modifiers
   * (for healing) to the formula, then calls the target's damageResolve method.
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

    let formula = damageFormula;

    // Apply healing increase modifier for healing type
    if (damageType === "heal") {
      formula = DamageProcessor.applyHealingIncreaseModifierToFormula(
        damageFormula,
        target,
      );
    } else {
      // Apply vulnerability modifier for non-healing damage
      formula = DamageProcessor.applyVulnerabilityModifier(
        damageFormula,
        damageType,
        target,
      );
    }

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
   * Resolve a damage bundle (resolve + power) for a single target
   *
   * Applies vulnerability/healing modifiers to the resolve formula only
   * (power damage has no vulnerability concept), then calls the target's
   * applyDamageBundle method to render a combined chat card and apply
   * each damage type to its respective resource.
   *
   * @static
   * @param {Actor} target - The target actor
   * @param {Object} context - Bundle context
   * @param {Object|null} [context.resolveDamage] - Resolve damage payload ({ formula, damageType })
   * @param {Object|null} [context.powerDamage] - Power damage payload ({ formula, damageType })
   * @param {string} context.label - Label for the damage roll
   * @param {string} context.description - Description for the damage roll
   * @param {string} context.img - Image for the damage roll
   * @param {string} context.bgColor - Background color for the damage roll
   * @param {string} context.textColor - Text color for the damage roll
   * @returns {Promise<Object|null>} { resolveRoll, powerRoll } or null
   */
  static async resolveDamageBundleForTarget(target, context) {
    const {
      resolveDamage = null,
      powerDamage = null,
      label,
      description,
      img,
      bgColor,
      textColor,
    } = context;

    // Apply modifiers to the resolve formula (vulnerability / healing increase)
    let resolvePayload = null;
    if (resolveDamage) {
      let resolveFormula = resolveDamage.formula;
      const resolveType = resolveDamage.damageType;
      if (resolveType === "heal") {
        resolveFormula = DamageProcessor.applyHealingIncreaseModifierToFormula(
          resolveFormula,
          target,
        );
      } else {
        resolveFormula = DamageProcessor.applyVulnerabilityModifier(
          resolveFormula,
          resolveType,
          target,
        );
      }
      resolvePayload = { formula: resolveFormula, type: resolveType };
    }

    // Power damage uses the raw formula (no vulnerability concept for power)
    const powerPayload = powerDamage
      ? { formula: powerDamage.formula, type: powerDamage.damageType }
      : null;

    // Route based on how many damage types are present:
    // - Both types → stacked card (applyDamageBundle)
    // - Single type → classic tall card (damageResolve)
    const displayProps = { label, description, img, bgColor, textColor };

    if (resolvePayload && powerPayload) {
      // Both resolve and power → combined stacked card
      return await target.applyDamageBundle({
        resolveDamage: resolvePayload,
        powerDamage: powerPayload,
        ...displayProps,
      });
    } else if (resolvePayload) {
      // Only resolve → classic single tall card
      return {
        resolveRoll: await target.damageResolve({
          formula: resolvePayload.formula,
          type: resolvePayload.type,
          ...displayProps,
        }),
        powerRoll: null,
      };
    } else if (powerPayload) {
      // Only power → single tall card with purple styling
      return {
        resolveRoll: null,
        powerRoll: await target.damageResolve({
          formula: powerPayload.formula,
          type: powerPayload.type,
          resource: "power",
          ...displayProps,
        }),
      };
    }

    return null;
  }

  /**
   * Check if a damage formula represents zero/no damage
   *
   * Returns true for empty strings, whitespace, or a literal "0".
   * Used to skip power damage (or any damage) that should not appear.
   *
   * @static
   * @param {string} [formula] - The formula to check
   * @returns {boolean} True if the formula represents zero damage
   */
  static isZeroFormula(formula) {
    if (!formula) return true;
    const trimmed = String(formula).trim();
    if (trimmed === "") return true;
    // Evaluate simple numeric "0" (possibly with surrounding whitespace/parens)
    if (/^[0(.\s)]*$/.test(trimmed)) return true;
    return false;
  }

  /**
   * Build a modified formula for hidden abilities with multiplicative modes
   *
   * Constructs a formula that properly represents the order of operations:
   * 1. Additive: formula + (value + change)
   * 2. Multiplicative: Apply multiply/divide operations
   *
   * This creates formulas like:
   * - Add only: "d20 + 5"
   * - Multiply: "2 * (d20 + 3)" when vuln has value=3 and multiplyNeutral=2
   * - Divide: "floor((d20 + 3) / 2)" when vuln has value=3 and divideNeutral=2
   *
   * @static
   * @param {string} baseFormula - The original formula (e.g., "d20", "2d6")
   * @param {Object} hiddenAbility - The hidden ability object with value, change, and multiply fields
   * @param {Object} options - Additional options
   * @param {boolean} options.isHealing - Whether this is for healing (uses min 1 constraint)
   * @returns {string} The modified formula
   */
  static buildModifiedFormula(baseFormula, hiddenAbility, options = {}) {
    const { isHealing = false } = options;

    if (!hiddenAbility) {
      return baseFormula;
    }

    // Get additive portion (value + change)
    const additiveTotal =
      (hiddenAbility.value || 0) + (hiddenAbility.change || 0);

    // Get multiplicative values (default to 1 = no-op)
    const multiplyNeutral = hiddenAbility.multiplyNeutral ?? 1;
    const divideNeutral = hiddenAbility.divideNeutral ?? 1;
    const multiplyBuff = hiddenAbility.multiplyBuff ?? 1;
    const multiplyDebuff = hiddenAbility.multiplyDebuff ?? 1;

    // Check if any multiplicative effects are active
    const hasMultiplyNeutral = multiplyNeutral !== 1;
    const hasDivideNeutral = divideNeutral !== 1 && divideNeutral !== 0;
    const hasMultiplyBuff = multiplyBuff !== 1;
    const hasMultiplyDebuff = multiplyDebuff !== 1;
    const hasMultiplicative =
      hasMultiplyNeutral ||
      hasDivideNeutral ||
      hasMultiplyBuff ||
      hasMultiplyDebuff;

    // If no modifications, return original
    if (additiveTotal === 0 && !hasMultiplicative) {
      return baseFormula;
    }

    // Start with base formula
    let formula = baseFormula;

    // Step 1: Add additive portion
    if (additiveTotal !== 0) {
      if (additiveTotal > 0) {
        formula = `${formula} + ${additiveTotal}`;
      } else {
        formula = `${formula} - ${Math.abs(additiveTotal)}`;
      }
    }

    // Step 2: Apply multiplicative operations (order matches prepareDerivedData)
    if (hasMultiplicative) {
      // Wrap additive portion in parentheses before applying multiplicative
      formula = `(${formula})`;

      // Apply multiplyNeutral
      if (hasMultiplyNeutral) {
        formula = `${multiplyNeutral} * ${formula}`;
      }

      // Apply divideNeutral (with zero protection)
      if (hasDivideNeutral) {
        formula = `floor(${formula} / ${divideNeutral})`;
      }

      // Apply multiplyBuff (for positives: multiply, for negatives: divide)
      if (hasMultiplyBuff) {
        const buffFactor = multiplyBuff !== 0 ? multiplyBuff : 1;
        formula = `${buffFactor} * ${formula}`;
      }

      // Apply multiplyDebuff (for positives: divide, for negatives: multiply)
      if (hasMultiplyDebuff) {
        const debuffFactor = multiplyDebuff !== 0 ? multiplyDebuff : 1;
        formula = `floor(${formula} / ${debuffFactor})`;
      }
    }

    // For healing, ensure minimum of 1 (can't turn healing into damage)
    if (isHealing && (additiveTotal < 0 || hasMultiplicative)) {
      formula = `max(1, ${formula})`;
    }

    return formula;
  }

  /**
   * Apply vulnerability modifier to damage formula
   *
   * Constructs a formula that properly represents vulnerability modifications
   * including additive and multiplicative effects.
   *
   * Example outputs:
   * - Add mode: "d20 + 5" for vuln with value=5
   * - Multiply mode: "2 * (d20 + 3)" for vuln with value=3 and multiplyNeutral=2
   *
   * @static
   * @param {string} originalFormula - The original damage formula
   * @param {string} damageType - The type of damage
   * @param {Actor} target - The target actor
   * @returns {string} The modified formula with vulnerability applied
   */
  static applyVulnerabilityModifier(originalFormula, damageType, target) {
    // Only apply vulnerability for non-healing damage
    if (damageType === "heal") {
      return originalFormula;
    }

    const vuln = target.system?.hiddenAbilities?.vuln;
    if (!vuln) {
      return originalFormula;
    }

    // Check if there's any modification to apply
    const additiveTotal = (vuln.value || 0) + (vuln.change || 0);
    const hasMultiplicative =
      (vuln.multiplyNeutral ?? 1) !== 1 ||
      (vuln.divideNeutral ?? 1) !== 1 ||
      (vuln.multiplyBuff ?? 1) !== 1 ||
      (vuln.multiplyDebuff ?? 1) !== 1;

    if (additiveTotal === 0 && !hasMultiplicative) {
      return originalFormula;
    }

    // Build and return the modified formula
    return DamageProcessor.buildModifiedFormula(originalFormula, vuln, {
      isHealing: false,
    });
  }

  /**
   * Apply healing increase modifier to healing formula
   *
   * Constructs a formula that properly represents healing increase modifications
   * including additive and multiplicative effects.
   *
   * Example outputs:
   * - Add mode: "d20 + 5" for healIncrease with value=5
   * - Multiply mode: "2 * (d20 + 3)" for healIncrease with value=3 and multiplyNeutral=2
   * - Negative add: "max(1, d20 - 5)" for healIncrease with value=-5
   *
   * @static
   * @param {string} originalFormula - The original healing formula
   * @param {Actor} target - The target actor receiving healing
   * @returns {string} The modified formula with healing increase applied
   */
  static applyHealingIncreaseModifierToFormula(originalFormula, target) {
    const healIncrease = target.system?.hiddenAbilities?.healIncrease;
    if (!healIncrease) {
      return originalFormula;
    }

    // Check if there's any modification to apply
    const additiveTotal =
      (healIncrease.value || 0) + (healIncrease.change || 0);
    const hasMultiplicative =
      (healIncrease.multiplyNeutral ?? 1) !== 1 ||
      (healIncrease.divideNeutral ?? 1) !== 1 ||
      (healIncrease.multiplyBuff ?? 1) !== 1 ||
      (healIncrease.multiplyDebuff ?? 1) !== 1;

    if (additiveTotal === 0 && !hasMultiplicative) {
      return originalFormula;
    }

    // Build and return the modified formula (isHealing=true for min 1 constraint)
    return DamageProcessor.buildModifiedFormula(originalFormula, healIncrease, {
      isHealing: true,
    });
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
   * @param {Roll} [roll=null] - The full roll object (for critical detection)
   * @param {Actor} [actor=null] - The actor (for critical thresholds)
   * @param {string} [formula=null] - The roll formula (for critical detection)
   * @returns {boolean} Whether the effect should be applied
   */
  static shouldApplyEffect(
    condition,
    oneHit,
    bothHit,
    rollTotal = 0,
    threshold = 15,
    roll = null,
    actor = null,
    formula = null,
  ) {
    return ConditionEvaluator.evaluate(
      condition,
      oneHit,
      bothHit,
      rollTotal,
      threshold,
      roll,
      actor,
      formula,
    );
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
   * Apply healing increase modifier to a healing amount
   *
   * Calculates the modified healing amount based on the target's healIncrease
   * hidden ability. Supports add, multiply, divide, multiplyBuff, and multiplyDebuff modes.
   *
   * The calculation follows the same order as ability score multiplicative effects:
   * 1. Add mode: Add healIncrease.change to the rolled amount
   * 2. Multiply/Divide modes: Apply multiplicative modifiers
   * 3. Minimum healing of 1 (negative healing increase cannot turn healing into damage)
   *
   * @static
   * @param {number} baseAmount - The base healing amount (from roll)
   * @param {Actor} target - The target actor receiving healing
   * @returns {{finalAmount: number, baseAmount: number, healIncreaseTotal: number, overage: number}} Healing result with details
   */
  static applyHealingIncreaseModifier(baseAmount, target) {
    // Get healIncrease from hidden abilities
    const healIncrease = target.system?.hiddenAbilities?.healIncrease;

    // If no healIncrease or amount is 0, return as-is
    if (!healIncrease || baseAmount <= 0) {
      return {
        finalAmount: baseAmount,
        baseAmount,
        healIncreaseTotal: 0,
        overage: 0,
      };
    }

    // Get the total healIncrease value (after modifiers)
    const healIncreaseTotal = healIncrease.total || 0;

    // If no modification needed, return as-is
    if (healIncreaseTotal === 0) {
      return {
        finalAmount: baseAmount,
        baseAmount,
        healIncreaseTotal: 0,
        overage: 0,
      };
    }

    // Calculate modified healing amount
    // Start with base amount and apply the healIncrease total as an additive bonus
    // The healIncrease.total represents the combined effect of:
    // - value + change (additive)
    // - multiplicative modifiers (multiplyNeutral, divideNeutral, multiplyBuff, multiplyDebuff)
    let finalAmount = baseAmount + healIncreaseTotal;

    // Ensure minimum healing of 1 (cannot turn healing into damage)
    finalAmount = Math.max(1, finalAmount);

    // Calculate overage (healing above and beyond max resolve)
    const currentResolve = target.system.resolve.value;
    const maxResolve = target.system.resolve.max;
    const overage = Math.max(0, finalAmount - (maxResolve - currentResolve));

    Logger.debug(
      `Healing increase applied: ${baseAmount} + ${healIncreaseTotal} = ${finalAmount} (min 1), overage: ${overage}`,
      {
        target: target.name,
        baseAmount,
        healIncreaseTotal,
        finalAmount,
        overage,
      },
      "HEALING",
    );

    return {
      finalAmount,
      baseAmount,
      healIncreaseTotal,
      overage,
    };
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
