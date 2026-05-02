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
   * @param {Object} [context.intensifyConfig] - Configuration for intensify amounts per effect type
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
      intensifyConfig,
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
          rollResult,
          sourceActor,
          rollResult?.formula,
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
              intensifyConfig,
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
   * @param {Object} [params.intensifyConfig] - Configuration for intensify amounts per effect type
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
      intensifyConfig,
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
        intensifyConfig,
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
   * Process self-effects for action cards (apply to card owner)
   *
   * @static
   * @param {Object} params - Method parameters
   * @param {Array} params.results - Target hit results (for condition checking)
   * @param {Roll} params.rollResult - The roll result
   * @param {Array} params.embeddedSelfEffects - Self-effect items to apply
   * @param {Object} params.selfEffectsConfig - Configuration for when to apply
   * @param {Object} params.repetitionContext - Current repetition context
   * @param {Actor} params.actor - The card owner (target for self-effects)
   * @param {boolean} params.attemptInventoryReduction - Whether to reduce inventory
   * @param {number} params.applicationLimit - How many times to apply (0 = unlimited)
   * @param {Function} params.shouldApplyEffect - Function to check condition
   * @param {Function} params.waitForDelay - Function to wait for delays
   * @param {boolean} params.disableDelays - Skip delays flag
   * @param {boolean} params.isFinalRepetition - Is this the final repetition?
   * @param {Object} [params.intensifyConfig] - Configuration for intensify amounts per effect type
   * @returns {Promise<Array>} Self-effect results
   */
  static async processSelfEffectResults({
    results,
    rollResult,
    embeddedSelfEffects,
    selfEffectsConfig,
    repetitionContext,
    actor,
    attemptInventoryReduction: _attemptInventoryReduction,
    applicationLimit,
    shouldApplyEffect,
    waitForDelay,
    disableDelays = false,
    intensifyConfig,
    scalePerTarget = false,
  }) {
    if (!embeddedSelfEffects || embeddedSelfEffects.length === 0) {
      return [];
    }

    const rollTotal = rollResult?.total || 0;

    if (scalePerTarget) {
      return StatusEffectApplicator._processSelfEffectsPerTarget({
        results,
        rollResult,
        rollTotal,
        embeddedSelfEffects,
        selfEffectsConfig,
        repetitionContext,
        actor,
        applicationLimit,
        shouldApplyEffect,
        waitForDelay,
        disableDelays,
        intensifyConfig,
      });
    }

    return StatusEffectApplicator._processSelfEffectsAggregated({
      results,
      rollResult,
      rollTotal,
      embeddedSelfEffects,
      selfEffectsConfig,
      repetitionContext,
      actor,
      applicationLimit,
      shouldApplyEffect,
      waitForDelay,
      disableDelays,
      intensifyConfig,
    });
  }

  static async _processSelfEffectsPerTarget({
    results,
    rollResult,
    rollTotal,
    embeddedSelfEffects,
    selfEffectsConfig,
    repetitionContext,
    actor,
    applicationLimit,
    shouldApplyEffect,
    waitForDelay,
    disableDelays,
    intensifyConfig,
  }) {
    const resultsArray = [];

    for (const targetResult of results || []) {
      const currentApplications =
        repetitionContext?.selfEffectApplications || 0;
      if (applicationLimit > 0 && currentApplications >= applicationLimit) {
        Logger.debug(
          `Self-effects application limit reached during per-target scaling (${currentApplications}/${applicationLimit})`,
          {
            actorName: actor.name,
            limit: applicationLimit,
            count: currentApplications,
          },
          "ACTION_CARD",
        );
        break;
      }

      const oneHit = targetResult.firstHit || targetResult.secondHit;
      const bothHit = targetResult.firstHit && targetResult.secondHit;

      const conditionMet = shouldApplyEffect(
        selfEffectsConfig.condition,
        oneHit,
        bothHit,
        rollTotal,
        selfEffectsConfig.threshold || 15,
        rollResult,
        actor,
        rollResult?.formula,
      );

      if (!conditionMet) {
        Logger.debug(
          `Self-effects condition not met for target "${targetResult.target?.name}" (per-target scaling)`,
          {
            condition: selfEffectsConfig.condition,
            targetName: targetResult.target?.name,
            oneHit,
            bothHit,
            rollTotal,
            threshold: selfEffectsConfig.threshold,
          },
          "ACTION_CARD",
        );
        continue;
      }

      for (const effect of embeddedSelfEffects) {
        try {
          const effectData = foundry.utils.deepClone(effect);

          if (effectData.type === "gear" || effectData.type === "status") {
            effectData.flags = effectData.flags || {};
            effectData.flags["eventide-rp-system"] =
              effectData.flags["eventide-rp-system"] || {};
            effectData.flags["eventide-rp-system"].isEffect = true;
          }

          if (effectData.type === "gear") {
            effectData.system = effectData.system || {};
            effectData.system.equipped = true;
            effectData.system.quantity = 1;
          }

          const applicationResult =
            await StatusIntensification.applyOrIntensifyStatus(
              actor,
              effectData,
              intensifyConfig,
            );

          if (repetitionContext) {
            repetitionContext.selfEffectApplications =
              (repetitionContext.selfEffectApplications || 0) + 1;
          }

          resultsArray.push({
            success: applicationResult.applied,
            effect: effect.name,
            target: actor.name,
            applied: applicationResult.applied,
            intensified: applicationResult.intensified,
            triggeredBy: targetResult.target?.name,
          });

          Logger.debug(
            `Applied self-effect "${effect.name}" to actor "${actor.name}" (per-target: "${targetResult.target?.name}")`,
            {
              effectName: effect.name,
              actorName: actor.name,
              effectType: effect.type,
              triggeredBy: targetResult.target?.name,
            },
            "ACTION_CARD",
          );

          if (!disableDelays && waitForDelay) {
            await waitForDelay();
          }
        } catch (error) {
          Logger.error(
            `Failed to apply self-effect "${effect.name}" (per-target)`,
            error,
            "ACTION_CARD",
          );
          resultsArray.push({
            success: false,
            effect: effect.name,
            error: error.message,
          });
        }
      }
    }

    return resultsArray;
  }

  static async _processSelfEffectsAggregated({
    results,
    rollResult,
    rollTotal,
    embeddedSelfEffects,
    selfEffectsConfig,
    repetitionContext,
    actor,
    applicationLimit,
    shouldApplyEffect,
    waitForDelay,
    disableDelays,
    intensifyConfig,
  }) {
    const hasHits = results?.some((r) => r.firstHit || r.secondHit) || false;
    const oneHit = hasHits;
    const bothHit = results?.every((r) => r.firstHit && r.secondHit) || false;

    const conditionMet = shouldApplyEffect(
      selfEffectsConfig.condition,
      oneHit,
      bothHit,
      rollTotal,
      selfEffectsConfig.threshold || 15,
      rollResult,
      actor,
      rollResult?.formula,
    );

    if (!conditionMet) {
      Logger.debug(
        `Self-effects condition not met: ${selfEffectsConfig.condition}`,
        {
          condition: selfEffectsConfig.condition,
          hasHits,
          oneHit,
          bothHit,
          rollTotal,
          threshold: selfEffectsConfig.threshold,
        },
        "ACTION_CARD",
      );
      return [];
    }

    if (repetitionContext) {
      const selfEffectApplications =
        repetitionContext.selfEffectApplications || 0;
      if (applicationLimit > 0 && selfEffectApplications >= applicationLimit) {
        Logger.debug(
          `Self-effects application limit reached (${selfEffectApplications}/${applicationLimit})`,
          {
            actorName: actor.name,
            limit: applicationLimit,
            count: selfEffectApplications,
          },
          "ACTION_CARD",
        );
        return [];
      }
    }

    const resultsArray = [];
    for (const effect of embeddedSelfEffects) {
      try {
        const effectData = foundry.utils.deepClone(effect);

        if (effectData.type === "gear" || effectData.type === "status") {
          effectData.flags = effectData.flags || {};
          effectData.flags["eventide-rp-system"] =
            effectData.flags["eventide-rp-system"] || {};
          effectData.flags["eventide-rp-system"].isEffect = true;
        }

        if (effectData.type === "gear") {
          effectData.system = effectData.system || {};
          effectData.system.equipped = true;
          effectData.system.quantity = 1;
        }

        const applicationResult =
          await StatusIntensification.applyOrIntensifyStatus(
            actor,
            effectData,
            intensifyConfig,
          );

        if (repetitionContext) {
          repetitionContext.selfEffectApplications =
            (repetitionContext.selfEffectApplications || 0) + 1;
        }

        resultsArray.push({
          success: applicationResult.applied,
          effect: effect.name,
          target: actor.name,
          applied: applicationResult.applied,
          intensified: applicationResult.intensified,
        });

        Logger.debug(
          `Applied self-effect "${effect.name}" to actor "${actor.name}"`,
          {
            effectName: effect.name,
            actorName: actor.name,
            effectType: effect.type,
          },
          "ACTION_CARD",
        );

        if (!disableDelays && waitForDelay) {
          await waitForDelay();
        }
      } catch (error) {
        Logger.error(
          `Failed to apply self-effect "${effect.name}"`,
          error,
          "ACTION_CARD",
        );
        resultsArray.push({
          success: false,
          effect: effect.name,
          error: error.message,
        });
      }
    }

    return resultsArray;
  }

  /**
   * Apply a single effect to a target
   *
   * @static
   * @param {Object} params - Application parameters
   * @param {Object} params.effectData - The effect data
   * @param {Actor} params.target - The target actor
   * @param {string} params.effectKey - Unique key for effect
   * @param {Object} params.repetitionContext - Repetition context
   * @param {boolean} params.disableDelays - Whether to disable delays
   * @param {boolean} params.isFinalRepetition - Whether this is final repetition
   * @param {Function} params.waitForDelay - Function to wait for delay
   * @param {Object} [params.intensifyConfig] - Configuration for intensify amounts per effect type
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
      intensifyConfig,
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

      // Apply or intensify the effect on the target with intensify config
      const applicationResult =
        await StatusIntensification.applyOrIntensifyStatus(
          target,
          effectData,
          intensifyConfig,
        );

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
