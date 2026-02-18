/**
 * AttackChainExecutor Service
 *
 * Provides centralized attack chain execution for action card processing.
 * Handles target AC calculation, hit determination, damage/status/transformation
 * orchestration, and delay management.
 *
 * @module AttackChainExecutor
 * @see module:item-action-card-execution
 */

import { Logger } from "./logger.mjs";
import { TargetResolver } from "./target-resolver.mjs";

/**
 * @typedef {Object} TargetHitResult
 * @property {Actor} target - The target actor
 * @property {boolean} firstHit - Whether the first AC check hit
 * @property {boolean} secondHit - Whether the second AC check hit
 * @property {boolean} bothHit - Whether both AC checks hit
 * @property {boolean} oneHit - Whether at least one AC check hit
 */

/**
 * @typedef {Object} AttackChainContext
 * @property {Item} actionCard - The action card item being executed
 * @property {Actor} actor - The actor executing the action card
 * @property {Roll|null} rollResult - The pre-computed roll result
 * @property {Item} embeddedItem - The embedded item for roll type checking
 * @property {Object} attackChain - Attack chain configuration from system data
 * @property {string} attackChain.firstStat - First stat for AC calculation
 * @property {string} attackChain.secondStat - Second stat for AC calculation
 * @property {string} attackChain.damageCondition - Condition for damage application
 * @property {number} [attackChain.damageThreshold=15] - Threshold for damage
 * @property {string} attackChain.statusCondition - Condition for status application
 * @property {number} [attackChain.statusThreshold=15] - Threshold for status
 * @property {string} [attackChain.damageFormula] - Damage formula if applicable
 * @property {string} [attackChain.damageType] - Type of damage
 * @property {Array} embeddedTransformations - Embedded transformation data
 * @property {LockedTargetData[]} lockedTargets - Locked targets from popup
 * @property {Function} processDamage - Function to process damage results
 * @property {Function} processStatus - Function to process status results
 * @property {Function} processTransformation - Function to process transformations
 * @property {Function} waitForDelay - Function to wait for execution delay
 * @property {boolean} disableDelays - Whether to disable delays
 * @property {boolean} shouldApplyDamage - Whether to apply damage
 * @property {boolean} shouldApplyStatus - Whether to apply status effects
 * @property {boolean} isFinalRepetition - Whether this is the final repetition
 */

/**
 * @typedef {Object} AttackChainResult
 * @property {boolean} success - Whether the execution was successful
 * @property {string} mode - The execution mode ("attackChain")
 * @property {Roll|null} baseRoll - The base roll result
 * @property {string|null} embeddedItemRollMessage - Roll message ID if applicable
 * @property {TargetHitResult[]} targetResults - Results per target
 * @property {Array} damageResults - Damage application results
 * @property {Array} statusResults - Status effect results
 * @property {Array} transformationResults - Transformation results
 * @property {string} [reason] - Failure reason if unsuccessful
 */

/**
 * AttackChainExecutor class for executing attack chains
 *
 * @class AttackChainExecutor
 */
export class AttackChainExecutor {
  /**
   * Execute an attack chain with a pre-computed roll result
   *
   * @static
   * @param {AttackChainContext} context - The attack chain execution context
   * @returns {Promise<AttackChainResult>} The attack chain result
   */
  static async executeWithRollResult(context) {
    const {
      actionCard: _actionCard,
      rollResult,
      embeddedItem,
      attackChain,
      embeddedTransformations,
      lockedTargets,
      processDamage,
      processStatus,
      processTransformation,
      waitForDelay,
      disableDelays,
      shouldApplyDamage,
      shouldApplyStatus,
      isFinalRepetition,
    } = context;

    try {
      // Resolve locked targets instead of fetching from game.user.targets
      const { valid: resolvedTargets, invalid: _invalid } = lockedTargets
        ? TargetResolver.resolveLockedTargets(lockedTargets)
        : { valid: await erps.utils.getTargetArray(), invalid: [] };

      // Extract tokens from resolved targets
      const targetArray = resolvedTargets.map((r) => r.token).filter(Boolean);

      if (targetArray.length === 0) {
        Logger.warn(
          "No valid targets found for attack chain",
          null,
          "ACTION_CARD",
        );
        ui.notifications.warn(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.NoTargetsAttackChain"),
        );
        return { success: false, reason: "noTargets" };
      }

      // Check hits against target ACs using the roll result
      const results = AttackChainExecutor.calculateTargetHits(
        targetArray,
        rollResult,
        embeddedItem,
        attackChain,
      );

      // Add delay after roll calculation but before damage application (GM only)
      if (game.user.isGM && !disableDelays) {
        await waitForDelay();
      }

      // Handle damage and status effects with delays
      let damageResults = [];
      if (shouldApplyDamage) {
        damageResults = await processDamage(results, rollResult, disableDelays);
        if (!disableDelays) {
          await waitForDelay();
        }
      }

      let statusResults = [];
      if (shouldApplyStatus) {
        statusResults = await processStatus(
          results,
          rollResult,
          disableDelays,
          isFinalRepetition,
        );
      }

      // Process transformations after status effects
      let transformationResults = [];
      if (embeddedTransformations.length > 0) {
        transformationResults = await processTransformation(
          results,
          rollResult,
          disableDelays,
          isFinalRepetition,
        );
      }

      return {
        success: true,
        mode: "attackChain",
        baseRoll: rollResult,
        embeddedItemRollMessage: rollResult?.messageId || null,
        targetResults: results,
        damageResults,
        statusResults,
        transformationResults,
      };
    } catch (error) {
      Logger.error(
        "Failed to execute attack chain with roll result",
        error,
        "ACTION_CARD",
      );
      throw error;
    }
  }

  /**
   * Calculate hit results for all targets
   *
   * @static
   * @param {Token[]} targetArray - Array of target tokens
   * @param {Roll|null} rollResult - The roll result
   * @param {Item} embeddedItem - The embedded item for roll type checking
   * @param {Object} attackChain - Attack chain configuration
   * @returns {TargetHitResult[]} Array of hit results per target
   */
  static calculateTargetHits(
    targetArray,
    rollResult,
    embeddedItem,
    attackChain,
  ) {
    return targetArray.map((target) => {
      const targetRollData = target.actor.getRollData();
      const firstAC =
        targetRollData.abilities[attackChain.firstStat]?.ac?.total || 11;
      const secondAC =
        targetRollData.abilities[attackChain.secondStat]?.ac?.total || 11;

      // Handle "none" roll types as automatic two successes
      if (embeddedItem.system.roll?.type === "none") {
        return {
          target: target.actor,
          firstHit: true,
          secondHit: true,
          bothHit: true,
          oneHit: true,
        };
      }

      // Normal roll-based hit calculation
      const rollTotal = rollResult?.total || 0;
      const firstHit = rollResult ? rollTotal >= firstAC : false;
      const secondHit = rollResult ? rollTotal >= secondAC : false;

      return {
        target: target.actor,
        firstHit,
        secondHit,
        bothHit: firstHit && secondHit,
        oneHit: firstHit || secondHit,
      };
    });
  }
}
