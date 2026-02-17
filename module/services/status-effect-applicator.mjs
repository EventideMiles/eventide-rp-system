/**
 * StatusEffectApplicator Service
 *
 * Provides centralized status effect application for action card execution.
 * Handles effect filtering, gear inventory reduction, status intensification,
 * and error handling per effect.
 *
 * @module StatusEffectApplicator
 * @see module:item-action-card-execution
 */

import { Logger } from "./logger.mjs";
import { InventoryUtils } from "../helpers/_module.mjs";
import { StatusIntensification } from "../helpers/status-intensification.mjs";

/**
 * @typedef {Object} StatusEffectContext
 * @property {Array} results - Target hit results from action card execution
 * @property {Roll|null} rollResult - The roll result
 * @property {Array} embeddedStatusEffects - Array of status effect data
 * @property {Object} attackChain - Attack chain configuration
 * @property {string} attackChain.statusCondition - Condition for status application
 * @property {number} [attackChain.statusThreshold=15] - Threshold for status application
 * @property {Object} repetitionContext - Current repetition context state
 * @property {Array<string>} [repetitionContext.selectedEffectIds] - Pre-selected effect IDs
 * @property {number} [repetitionContext.statusApplicationLimit=1] - Max applications per target
 * @property {Map<string, number>} [repetitionContext.statusApplicationCounts] - Application counts per target
 * @property {Set<string>} [repetitionContext.appliedStatusEffects] - Already applied effects
 * @property {Actor} sourceActor - The actor executing the action card
 * @property {boolean} attemptInventoryReduction - Whether to reduce gear inventory
 * @property {Function} shouldApplyEffect - Function to check if effect should apply
 * @property {Function} waitForDelay - Function to wait for execution delay
 * @property {boolean} disableDelays - Whether to disable delays
 * @property {boolean} isFinalRepetition - Whether this is the final repetition
 */

/**
 * @typedef {Object} StatusEffectResult
 * @property {Actor} target - The target actor
 * @property {Object} effect - The effect data
 * @property {boolean} applied - Whether effect was applied
 * @property {boolean} [intensified] - Whether effect was intensified
 * @property {string} [warning] - Warning message
 * @property {string} [error] - Error message
 */

/**
 * @typedef {Object} GearValidationResult
 * @property {boolean} valid - Whether gear validation passed
 * @property {Item|null} gearItem - The gear item if found
 * @property {string} [warning] - Warning message if validation failed
 */

/**
 * StatusEffectApplicator class for applying status effects to actors
 *
 * @class StatusEffectApplicator
 */
export class StatusEffectApplicator {
  /**
   * Process status effect results for action card execution
   *
   * @static
   * @param {StatusEffectContext} context - The status effect context
   * @returns {Promise<StatusEffectResult[]>} Array of status effect results
   */
  static async processStatusResults(context) {
    const {
      results,
      rollResult,
      embeddedStatusEffects,
      attackChain,
      repetitionContext,
      sourceActor,
      attemptInventoryReduction,
      shouldApplyEffect,
      waitForDelay,
      disableDelays,
      isFinalRepetition,
    } = context;

    const statusResults = [];

    // Early exit if no embedded status effects to apply
    if (!embeddedStatusEffects || embeddedStatusEffects.length === 0) {
      return statusResults;
    }

    // Filter effects based on selection
    const effectsToApply = StatusEffectApplicator.filterEffectsBySelection(
      embeddedStatusEffects,
      repetitionContext?.selectedEffectIds,
    );

    try {
      for (const result of results) {
        // Skip invalid results
        if (!result || !result.target) {
          Logger.warn(
            "Invalid result structure in processStatusResults, skipping",
            { result },
            "ACTION_CARD",
          );
          continue;
        }

        // Determine if status effects should be applied based on chain configuration
        const shouldApplyStatus = shouldApplyEffect(
          attackChain.statusCondition,
          result.oneHit,
          result.bothHit,
          rollResult?.total || 0,
          attackChain.statusThreshold || 15,
        );

        if (shouldApplyStatus) {
          const targetResults =
            await StatusEffectApplicator.applyEffectsToTarget({
              target: result.target,
              effectsToApply,
              sourceActor,
              attemptInventoryReduction,
              repetitionContext,
              disableDelays,
              isFinalRepetition,
              waitForDelay,
            });

          statusResults.push(...targetResults);
        }
      }

      return statusResults;
    } catch (error) {
      Logger.error("Failed to process status results", error, "ACTION_CARD");
      throw error;
    }
  }

  /**
   * Filter effects based on user selection
   *
   * @static
   * @param {Array} embeddedStatusEffects - All embedded status effects
   * @param {Array<string>|null} selectedEffectIds - Selected effect IDs
   * @returns {Array} Filtered effects to apply
   */
  static filterEffectsBySelection(embeddedStatusEffects, selectedEffectIds) {
    let effectsToApply = embeddedStatusEffects;

    Logger.debug(
      "Status effect filtering - checking selection",
      {
        selectedEffectIds,
        selectedEffectIdsType: typeof selectedEffectIds,
        isArray: Array.isArray(selectedEffectIds),
        totalEffects: embeddedStatusEffects.length,
        allEffectIds: embeddedStatusEffects.map(
          (e, i) => e._id || `effect-${i}`,
        ),
      },
      "ACTION_CARD",
    );

    // Always respect user selections (enforceStatusChoice is only for front-end validation)
    if (selectedEffectIds !== null && selectedEffectIds !== undefined) {
      effectsToApply = embeddedStatusEffects.filter((effect, index) => {
        const effectId = effect._id || `effect-${index}`;
        const isIncluded = selectedEffectIds.includes(effectId);
        Logger.debug(
          `Checking effect ${effectId}`,
          {
            effectName: effect.name,
            effectId,
            isIncluded,
            selectedEffectIds,
          },
          "ACTION_CARD",
        );
        return isIncluded;
      });

      Logger.debug(
        "Filtered status effects based on user selection",
        {
          totalEffects: embeddedStatusEffects.length,
          selectedCount: effectsToApply.length,
          selectedIds: selectedEffectIds,
          filteredEffectNames: effectsToApply.map((e) => e.name),
        },
        "ACTION_CARD",
      );
    }

    return effectsToApply;
  }

  /**
   * Apply effects to a single target
   *
   * @static
   * @param {Object} params - Application parameters
   * @param {Actor} params.target - The target actor
   * @param {Array} params.effectsToApply - Effects to apply
   * @param {Actor} params.sourceActor - The source actor
   * @param {boolean} params.attemptInventoryReduction - Whether to reduce inventory
   * @param {Object} params.repetitionContext - Repetition context
   * @param {boolean} params.disableDelays - Whether to disable delays
   * @param {boolean} params.isFinalRepetition - Whether this is the final repetition
   * @param {Function} params.waitForDelay - Function to wait for delay
   * @returns {Promise<StatusEffectResult[]>} Array of status effect results
   */
  static async applyEffectsToTarget(params) {
    const {
      target,
      effectsToApply,
      sourceActor,
      attemptInventoryReduction,
      repetitionContext,
      disableDelays,
      isFinalRepetition,
      waitForDelay,
    } = params;

    const statusResults = [];

    // Check limit BEFORE entering effects loop (per application, not per effect)
    const statusApplicationLimit =
      repetitionContext?.statusApplicationLimit ?? 1;
    const statusApplicationCounts =
      repetitionContext?.statusApplicationCounts ?? new Map();
    const targetId = target.id;
    const statusApplicationCount = statusApplicationCounts.get(targetId) ?? 0;

    if (
      statusApplicationLimit > 0 &&
      statusApplicationCount >= statusApplicationLimit
    ) {
      Logger.debug(
        `Skipping all effects for target "${target.name}" - status application limit reached (${statusApplicationCount}/${statusApplicationLimit})`,
        {
          targetId,
          targetName: target.name,
          limit: statusApplicationLimit,
          count: statusApplicationCount,
        },
        "ACTION_CARD",
      );
      return statusResults; // Skip this target entirely
    }

    // Apply ALL effects for this target
    for (const effectData of effectsToApply) {
      // Validate effect entry structure
      if (!effectData) {
        Logger.warn(
          "Invalid effect entry structure, skipping",
          {
            effectData,
            targetName: target.name,
          },
          "ACTION_CARD",
        );
        continue;
      }

      // Track effect application for logging purposes
      const effectKey = `${target.id}-${effectData.name}`;

      Logger.debug("Effect application check", { effectKey }, "ACTION_CARD");

      // Handle gear effects differently based on attemptInventoryReduction setting
      if (effectData.type === "gear" && attemptInventoryReduction) {
        const gearResult = await StatusEffectApplicator.processGearEffect({
          effectData,
          sourceActor,
          target,
        });

        if (!gearResult.valid) {
          statusResults.push(gearResult.result);
          continue;
        }
      }

      // Apply the status effect
      const applyResult = await StatusEffectApplicator.applySingleEffect({
        effectData,
        target,
        effectKey,
        repetitionContext,
        disableDelays,
        isFinalRepetition,
        waitForDelay,
      });

      statusResults.push(applyResult);
    }

    // Increment count AFTER all effects applied (per application, not per effect)
    if (repetitionContext?.statusApplicationCounts instanceof Map) {
      const currentCount =
        repetitionContext.statusApplicationCounts.get(targetId) ?? 0;
      repetitionContext.statusApplicationCounts.set(targetId, currentCount + 1);

      Logger.debug(
        `Status application count incremented for target "${target.name}"`,
        {
          targetId,
          targetName: target.name,
          newCount: currentCount + 1,
          limit: repetitionContext.statusApplicationLimit,
        },
        "ACTION_CARD",
      );
    }

    return statusResults;
  }

  /**
   * Process gear effect with inventory reduction
   *
   * @static
   * @param {Object} params - Processing parameters
   * @param {Object} params.effectData - The effect data
   * @param {Actor} params.sourceActor - The source actor
   * @param {Actor} params.target - The target actor
   * @returns {Promise<Object>} Result object with valid flag and result data
   */
  static async processGearEffect({ effectData, sourceActor, target }) {
    try {
      // Check if the actor has the gear item
      const actualGearItem = InventoryUtils.findGearByName(
        sourceActor,
        effectData.name,
      );

      if (!actualGearItem) {
        // Log warning and return without applying the effect
        Logger.warn(
          `Gear effect "${effectData.name}" not found in actor inventory`,
          {
            actorName: sourceActor.name,
            effectName: effectData.name,
            targetName: target.name,
          },
          "ACTION_CARD",
        );

        const warning = game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.GearEffectNotFoundWarning",
          { gearName: effectData.name },
        );

        // Show UI notification to user
        ui.notifications.warn(warning);

        return {
          valid: false,
          gearItem: null,
          result: {
            target,
            effect: effectData,
            applied: false,
            warning,
          },
        };
      }

      // Check if there's enough quantity
      const requiredQuantity = effectData.system?.cost || 0;
      if (actualGearItem.system.quantity < requiredQuantity) {
        // Log warning and return without applying the effect
        Logger.warn(
          `Insufficient quantity of "${effectData.name}" in actor inventory`,
          {
            actorName: sourceActor.name,
            effectName: effectData.name,
            requiredQuantity,
            availableQuantity: actualGearItem.system.quantity,
            targetName: target.name,
          },
          "ACTION_CARD",
        );

        const warning = game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.GearEffectInsufficientWarning",
          {
            gearName: effectData.name,
            required: requiredQuantity,
            available: actualGearItem.system.quantity,
          },
        );

        // Show UI notification to user
        ui.notifications.warn(warning);

        return {
          valid: false,
          gearItem: actualGearItem,
          result: {
            target,
            effect: effectData,
            applied: false,
            warning,
          },
        };
      }

      // Reduce quantity from inventory
      const currentQuantity = actualGearItem.system.quantity;
      const newQuantity = Math.max(0, currentQuantity - requiredQuantity);
      await actualGearItem.update({
        "system.quantity": newQuantity,
      });

      return { valid: true, gearItem: actualGearItem, result: null };
    } catch (error) {
      Logger.error(
        `Failed to process gear effect "${effectData.name}"`,
        error,
        "ACTION_CARD",
      );

      return {
        valid: false,
        gearItem: null,
        result: {
          target,
          effect: effectData,
          applied: false,
          error: game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Item.ActionCard.GearEffectInventoryError",
            { error: error.message },
          ),
        },
      };
    }
  }

  /**
   * Apply a single effect to a target
   *
   * @static
   * @param {Object} params - Application parameters
   * @param {Object} params.effectData - The effect data
   * @param {Actor} params.target - The target actor
   * @param {string} params.effectKey - Unique key for the effect
   * @param {Object} params.repetitionContext - Repetition context
   * @param {boolean} params.disableDelays - Whether to disable delays
   * @param {boolean} params.isFinalRepetition - Whether this is the final repetition
   * @param {Function} params.waitForDelay - Function to wait for delay
   * @returns {Promise<StatusEffectResult>} The status effect result
   */
  static async applySingleEffect(params) {
    const {
      effectData,
      target,
      effectKey,
      repetitionContext,
      disableDelays,
      isFinalRepetition,
      waitForDelay,
    } = params;

    try {
      // Set flag for effects to trigger appropriate message via createItem hook
      if (effectData.type === "gear" || effectData.type === "status") {
        effectData.flags = effectData.flags || {};
        effectData.flags["eventide-rp-system"] =
          effectData.flags["eventide-rp-system"] || {};
        effectData.flags["eventide-rp-system"].isEffect = true;
      }

      // Ensure gear effects are equipped when transferred
      if (effectData.type === "gear") {
        effectData.system = effectData.system || {};
        effectData.system.equipped = true;
        effectData.system.quantity = 1;
      }

      // Apply or intensify the effect on the target
      const applicationResult =
        await StatusIntensification.applyOrIntensifyStatus(target, effectData);

      // Track that this effect has been applied to this target
      if (
        applicationResult.applied &&
        repetitionContext?.appliedStatusEffects
      ) {
        repetitionContext.appliedStatusEffects.add(effectKey);
      }

      // Wait for execution delay after applying status effects
      // Delay except on final repetition (where sequence ends)
      if (!disableDelays && !isFinalRepetition && waitForDelay) {
        await waitForDelay();
      }

      // Messages are handled by createItem hook
      return {
        target,
        effect: effectData,
        applied: applicationResult.applied,
        intensified: applicationResult.intensified,
      };
    } catch (error) {
      Logger.error(
        `Failed to apply effect "${effectData.name}" to target "${target.name}"`,
        error,
        "ACTION_CARD",
      );

      return {
        target,
        effect: effectData,
        applied: false,
        error: error.message,
      };
    }
  }
}
