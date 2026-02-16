/**
 * RepetitionHandler Service
 *
 * Provides centralized repetition handling for action card execution.
 * Manages repetition count calculation, context state, result aggregation,
 * and iteration success checking.
 *
 * @module RepetitionHandler
 * @see module:item-action-card-execution
 */

import { Logger } from "./logger.mjs";

/**
 * @typedef {Object} RepetitionContext
 * @property {boolean} inExecution - Whether currently in execution
 * @property {boolean} costOnRepetition - Whether to apply cost on each repetition
 * @property {Set<string>} appliedTransformations - Track applied transformations
 * @property {Map<string, string>} transformationSelections - Pre-selected transformations
 * @property {string[]|null} selectedEffectIds - Pre-selected effect IDs
 * @property {Set<string>} appliedStatusEffects - Track applied status effects
 * @property {Map<string, number>} statusApplicationCounts - Status application counts per target
 * @property {number} statusApplicationLimit - Max status applications per target
 * @property {number} repetitionIndex - Current repetition index
 * @property {boolean} shouldApplyCost - Whether to apply cost this iteration
 */

/**
 * @typedef {Object} RepetitionOptions
 * @property {Map<string, string>} [transformationSelections] - Pre-selected transformations
 * @property {string[]} [selectedEffectIds] - Pre-selected effect IDs
 */

/**
 * @typedef {Object} AggregatedResults
 * @property {Array} damageResults - All damage results
 * @property {Array} statusResults - All status results
 * @property {Array} targetResults - All target results
 * @property {number} successCount - Number of successful iterations
 * @property {number} failureCount - Number of failed iterations
 */

/**
 * @typedef {Object} RepetitionCountResult
 * @property {number} count - The calculated repetition count
 * @property {Roll} roll - The roll object used for calculation
 */

/**
 * RepetitionHandler class for managing action card repetitions
 *
 * @class RepetitionHandler
 */
export class RepetitionHandler {
  /**
   * Calculate repetition count from formula
   *
   * @static
   * @param {string} formula - Roll formula for repetitions
   * @param {Actor} actor - Actor for roll data
   * @returns {Promise<RepetitionCountResult>} Count and roll result
   */
  static async calculateRepetitionCount(formula, actor) {
    const roll = new Roll(formula || "1", actor.getRollData());
    await roll.evaluate();
    let count = Math.floor(roll.total);

    // Warn and adjust if count is zero or negative
    if (count <= 0) {
      const originalCount = count;
      Logger.warn(
        `Repetition formula resulted in ${originalCount}, adjusting to minimum of 1`,
        { formula, originalCount },
        "ACTION_CARD",
      );
      ui.notifications.warn(
        game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.RepetitionCountAdjusted",
          { originalCount },
        ),
      );
      count = 1;
    }

    return { count, roll };
  }

  /**
   * Apply system execution limit to repetition count
   *
   * @static
   * @param {number} count - Original count
   * @param {string} [actionCardName] - Action card name for logging
   * @returns {number} Capped count
   */
  static applySystemLimit(count, actionCardName = "Unknown") {
    const systemLimit =
      game.settings?.get("eventide-rp-system", "actionCardExecutionLimit") ?? 0;

    if (systemLimit > 0 && count > systemLimit) {
      Logger.info(
        `Action card repetitions capped by system limit: ${count} -> ${systemLimit}`,
        { actionCardName, originalCount: count, limit: systemLimit },
        "ACTION_CARD",
      );
      return systemLimit;
    }

    return count;
  }

  /**
   * Create new repetition context
   *
   * @static
   * @param {Object} system - Action card system data
   * @param {RepetitionOptions} [options={}] - Execution options
   * @returns {RepetitionContext} New context object
   */
  static createContext(system, options = {}) {
    return {
      inExecution: true,
      costOnRepetition: system.costOnRepetition || false,
      appliedTransformations: new Set(),
      transformationSelections: options.transformationSelections || new Map(),
      selectedEffectIds: options.selectedEffectIds || null,
      appliedStatusEffects: new Set(),
      statusApplicationCounts: new Map(),
      statusApplicationLimit: system.statusApplicationLimit ?? 1,
      repetitionIndex: 0,
      shouldApplyCost: true,
    };
  }

  /**
   * Update context for iteration
   *
   * @static
   * @param {RepetitionContext} context - Context to update
   * @param {number} index - Current repetition index
   * @param {boolean} costOnRepetition - Whether cost applies each repetition
   */
  static updateContextForIteration(context, index, costOnRepetition) {
    context.repetitionIndex = index;
    context.shouldApplyCost = costOnRepetition || index === 0;
  }

  /**
   * Aggregate results from all repetitions
   *
   * @static
   * @param {Object[]} results - Array of iteration results
   * @param {number} count - Total repetition count
   * @param {string} mode - Execution mode ("attackChain" | "savedDamage")
   * @returns {AggregatedResults} Aggregated results
   */
  static aggregateResults(results, count, mode) {
    const aggregated = {
      success: results.every((r) => r.success),
      repetitionCount: count,
      results,
      mode,
      damageResults: results.flatMap((r) => r.damageResults || []),
      statusResults: results.flatMap((r) => r.statusResults || []),
    };

    // For attack chains, aggregate target results
    if (mode === "attackChain") {
      aggregated.targetResults = results[0]?.targetResults || [];
      aggregated.baseRoll = results[0]?.baseRoll;
      aggregated.embeddedItemRollMessage = results[0]?.embeddedItemRollMessage;
    }

    // Count successes and failures
    aggregated.successCount = results.filter((r) => r.success).length;
    aggregated.failureCount = results.filter((r) => !r.success).length;

    return aggregated;
  }

  /**
   * Check if iteration triggered any effects (for failOnFirstMiss)
   *
   * @static
   * @param {Object} result - Iteration result
   * @param {Object} system - Action card system data
   * @param {Function} shouldApplyEffect - Function to check effect conditions
   * @returns {boolean} Whether iteration was successful
   */
  static checkIterationSuccess(result, system, shouldApplyEffect) {
    if (!result || !result.targetResults) {
      return false;
    }

    const rollTotal = result.baseRoll?.total || 0;
    const hasStatusEffects = system.embeddedStatusEffects?.length > 0;
    const hasTransformations = system.embeddedTransformations?.length > 0;
    const hasDamageFormula =
      system.attackChain?.damageFormula &&
      system.attackChain?.damageCondition !== "never";

    // Check each target for any successful condition
    for (const targetResult of result.targetResults) {
      // Check damage condition (only if damage formula exists and condition isn't "never")
      if (hasDamageFormula) {
        const damageSuccess = shouldApplyEffect(
          system.attackChain.damageCondition,
          targetResult.oneHit,
          targetResult.bothHit,
          rollTotal,
          system.attackChain.damageThreshold || 15,
        );

        if (damageSuccess) {
          return true;
        }
      }

      // Check status condition (only if there are status effects to apply)
      if (hasStatusEffects) {
        const statusSuccess = shouldApplyEffect(
          system.attackChain.statusCondition,
          targetResult.oneHit,
          targetResult.bothHit,
          rollTotal,
          system.attackChain.statusThreshold || 15,
        );

        if (statusSuccess) {
          return true;
        }
      }

      // Check transformation condition (only if there are transformations to apply)
      if (hasTransformations) {
        const transformationSuccess = shouldApplyEffect(
          system.transformationConfig?.condition || "never",
          targetResult.oneHit,
          targetResult.bothHit,
          rollTotal,
          system.transformationConfig?.threshold || 15,
        );

        if (transformationSuccess) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Wait for configured execution delay
   *
   * @static
   * @param {number} [timingOverride] - Optional timing override in seconds
   * @returns {Promise<void>}
   */
  static async waitForDelay(timingOverride) {
    // Only apply delay for GM clients
    if (!game.user.isGM) {
      return;
    }

    const delay =
      timingOverride && timingOverride > 0
        ? timingOverride * 1000 // Convert seconds to milliseconds
        : game.settings.get("eventide-rp-system", "actionCardExecutionDelay");

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
