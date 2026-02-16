import { Logger } from "../../services/logger.mjs";
import { ResourceValidator } from "../../services/resource-validator.mjs";
import { TransformationApplicator } from "../../services/transformation-applicator.mjs";
import { RepetitionHandler } from "../../services/repetition-handler.mjs";
import { InventoryUtils } from "../../helpers/_module.mjs";
import { StatusIntensification } from "../../helpers/status-intensification.mjs";

/**
 * Mixin that provides action card execution functionality to Item documents.
 * This includes execute, executeWithRollResult, and message creation methods.
 *
 * @param {class} Base - The base class to extend
 * @returns {class} The extended class with action card execution functionality
 */
export function ItemActionCardExecutionMixin(Base) {
  return class extends Base {
    /**
     * Execute the action card based on its mode
     * @param {Actor} actor - The actor executing the action card
     * @returns {Promise<Object>} Result of the execution
     */
    async execute(actor) {
      // Only action cards can be executed
      if (this.type !== "actionCard") {
        throw new Error("execute can only be called on action card items");
      }

      // Permission check for GM-only action cards
      if (this.system.gmOnly && !game.user.isGM) {
        ui.notifications.error(
          "Only GMs can execute GM-only action cards.",
        );
        throw new Error("Insufficient permissions to execute GM-only action card");
      }

      try {
        let result;
        if (this.system.mode === "attackChain") {
          result = await this.executeAttackChain(actor);
        } else if (this.system.mode === "savedDamage") {
          result = await this.executeSavedDamage(actor);
        } else {
          const error = new Error(
            `Unknown action card mode: ${this.system.mode}`,
          );
          Logger.error("Unknown action card mode", error, "ACTION_CARD");
          throw error;
        }

        // Advance initiative if setting is enabled
        if (this.system.advanceInitiative) {
          const combat = game.combat;
          if (combat) {
            await combat.nextTurn();
          }
        }

        return result;
      } catch (error) {
        Logger.error("Failed to execute action card", error, "ACTION_CARD");
        throw error;
      }
    }

    /**
     * Execute the action card with a pre-computed roll result
     * @param {Actor} actor - The actor executing the action card
     * @param {Roll} rollResult - The pre-computed roll result from the embedded item
     * @param {Object} options - Additional execution options
     * @param {Map} options.transformationSelections - Map of target IDs to selected transformation IDs
     * @returns {Promise<Object>} Result of the execution
     */
    async executeWithRollResult(actor, rollResult, options = {}) {
      // Only action cards can be executed
      if (this.type !== "actionCard") {
        throw new Error(
          "executeWithRollResult can only be called on action card items",
        );
      }

      // Permission check for GM-only action cards
      if (this.system.gmOnly && !game.user.isGM) {
        ui.notifications.error(
          "Only GMs can execute GM-only action cards.",
        );
        throw new Error("Insufficient permissions to execute GM-only action card");
      }

      try {
        // Calculate number of repetitions using RepetitionHandler
        const { count: repetitionCount, roll: repetitionsRoll } =
          await RepetitionHandler.calculateRepetitionCount(
            this.system.repetitions || "1",
            actor,
          );

        // Check if action fails due to insufficient repetitions
        if (repetitionCount <= 0) {

          // Send failure message to chat
          await this.sendFailureMessage(
            actor,
            repetitionCount,
            repetitionsRoll,
          );

          const failureResult = {
            success: false,
            repetitionCount,
            results: [],
            mode: this.system.mode,
            reason: "insufficientRepetitions",
          };

          return failureResult;
        }

        // Apply system-level execution limit using RepetitionHandler
        const effectiveRepetitionCount = RepetitionHandler.applySystemLimit(
          repetitionCount,
          this.name,
        );

        // Create repetition context using RepetitionHandler
        this._currentRepetitionContext = RepetitionHandler.createContext(
          this.system,
          options,
        );

        // Execute repetitions
        const results = [];
        for (let i = 0; i < effectiveRepetitionCount; i++) {

          // Check if resource was depleted in a previous iteration (flag it forward pattern)
          // This check happens AFTER the first iteration, checking the flag set by handleBypass
          if (i > 0 && options?.actionCardContext?.resourceDepleted) {
            Logger.warn(
              `Action card execution halted at repetition ${i + 1} - resource depleted in previous iteration`,
              {
                actionCardName: this.name,
                depletedType: options.actionCardContext.depletedResourceType,
                depletedItem: options.actionCardContext.depletedItemName,
              },
              "ACTION_CARD",
            );

            // Create a resource check result from the depletion info
            const depletionCheck = {
              canExecute: false,
              reason: options.actionCardContext.depletedResourceType === "quantity"
                ? "insufficientQuantity"
                : "insufficientPower",
              required: options.actionCardContext.depletedRequired,
              available: options.actionCardContext.depletedAvailable,
            };

            // Send resource failure message
            const embeddedItem = this.getEmbeddedItem();
            await this.sendResourceFailureMessage(
              actor,
              depletionCheck,
              embeddedItem,
              i,
              effectiveRepetitionCount,
            );

            // Return partial results with failure reason
            const partialResult = {
              success: false,
              repetitionCount: effectiveRepetitionCount,
              completedRepetitions: i,
              results,
              mode: this.system.mode,
              reason: "insufficientResources",
              resourceFailure: depletionCheck,
            };

            return partialResult;
          }

          // Check resource constraints before execution
          // IMPORTANT: Skip resource check on first iteration if actionCardContext exists,
          // because handleBypass already consumed the resource and set the depletion flag.
          // The depletion will be caught on the NEXT iteration via the flag-it-forward check above.
          const embeddedItem = this.getEmbeddedItem();
          if (embeddedItem && !(i === 0 && options?.actionCardContext)) {
            // Only check for cost consumption if costs should be applied for this repetition
            const shouldConsumeCost = this.system.costOnRepetition || i === 0;
            const resourceCheck = this.checkEmbeddedItemResources(
              embeddedItem,
              actor,
              shouldConsumeCost,
            );
            if (!resourceCheck.canExecute) {
              Logger.warn(
                `Action card execution halted due to insufficient resources at repetition ${i + 1}`,
                { actionCardName: this.name, reason: resourceCheck.reason },
                "ACTION_CARD",
              );

              // Send resource failure message
              await this.sendResourceFailureMessage(
                actor,
                resourceCheck,
                embeddedItem,
                i,
                effectiveRepetitionCount,
              );

              // Return partial results with failure reason
              const partialResult = {
                success: false,
                repetitionCount: effectiveRepetitionCount,
                completedRepetitions: i,
                results,
                mode: this.system.mode,
                reason: "insufficientResources",
                resourceFailure: resourceCheck,
              };

              return partialResult;
            }
          }

          // Update repetition context for cost control BEFORE any embedded item calls
          RepetitionHandler.updateContextForIteration(
            this._currentRepetitionContext,
            i,
            this.system.costOnRepetition,
          );

          let currentRollResult = rollResult;

          // Handle repeatToHit logic for attack chains
          if (
            this.system.repeatToHit &&
            i > 0 &&
            this.system.mode === "attackChain" &&
            rollResult
          ) {
            currentRollResult =
              await this.executeEmbeddedItemForRepetition(actor);
          }

          // Execute single iteration
          const result = await this.executeSingleIteration(
            actor,
            currentRollResult,
            i,
            effectiveRepetitionCount,
          );
          results.push(result);

          // Check "fail on first miss" condition after first iteration (Issue #128)
          if (
            i === 0 &&
            this.system.failOnFirstMiss &&
            this.system.repeatToHit &&
            this.system.mode === "attackChain" &&
            effectiveRepetitionCount > 1
          ) {
            // Check if first iteration failed to trigger any effects
            const firstIterationSuccess = RepetitionHandler.checkIterationSuccess(
              result,
              this.system,
              (condition, oneHit, bothHit, rollTotal, threshold) =>
                this._shouldApplyEffect(condition, oneHit, bothHit, rollTotal, threshold),
            );
            if (!firstIterationSuccess) {
              Logger.info(
                `Action card execution stopped due to failOnFirstMiss`,
                { actionCardName: this.name, result },
                "ACTION_CARD",
              );

              // Return with reason for stopping
              const partialResult = {
                success: false,
                repetitionCount: effectiveRepetitionCount,
                completedRepetitions: 1,
                results,
                mode: this.system.mode,
                reason: "firstMissFailed",
              };

              // Clean up repetition context
              delete this._currentRepetitionContext;

              return partialResult;
            }
          }
        }

        // Advance initiative if setting is enabled
        if (this.system.advanceInitiative) {
          const combat = game.combat;
          if (combat) {
            await combat.nextTurn();
          }
        }

        // Clean up repetition context
        delete this._currentRepetitionContext;

        // Aggregate results using RepetitionHandler
        const combinedResult = RepetitionHandler.aggregateResults(
          results,
          repetitionCount,
          this.system.mode,
        );

        return combinedResult;
      } catch (error) {
        // Clean up repetition context on error
        delete this._currentRepetitionContext;

        Logger.error(
          "Failed to execute action card with roll result",
          error,
          "ACTION_CARD",
        );
        throw error;
      }
    }

    /**
     * Get the effective image for damage rolls
     * @private
     */
    _getEffectiveImage() {
      const defaultImages = [
        "icons/svg/item-bag.svg",
        "icons/svg/mystery-man.svg",
        "",
        null,
        undefined,
      ];

      // Use action card image unless it's default, then fall back to embedded item
      if (!defaultImages.includes(this.img)) {
        return this.img;
      }

      const embeddedItem = this.getEmbeddedItem();
      if (embeddedItem && !defaultImages.includes(embeddedItem.img)) {
        return embeddedItem.img;
      }

      return this.img;
    }

    /**
     * Get the effective label for rolls based on rollActorName setting (Issue #130)
     * @param {Object} [embeddedItem] - Optional embedded item to check for its own rollActorName setting
     * @returns {string} The label to use for rolls, or empty string if rollActorName is false
     * @private
     */
    _getEffectiveLabel(embeddedItem = null) {
      // Check embedded item's rollActorName setting first if provided
      if (embeddedItem && embeddedItem.system?.rollActorName === false) {
        return "";
      }
      // Fall back to action card's rollActorName setting
      if (this.system.rollActorName === false) {
        return "";
      }
      // Use embedded item name if available, otherwise use action card name
      return embeddedItem?.name || this.name;
    }

    /**
     * Helper method to determine if an effect should be applied based on conditions
     * @param {string} condition - The condition type
     * @param {boolean} oneHit - Whether at least one AC was hit
     * @param {boolean} bothHit - Whether both ACs were hit
     * @param {number} rollTotal - The total roll result (for rollValue condition)
     * @param {number} threshold - The threshold value (for rollValue condition)
     * @returns {boolean} Whether the effect should be applied
     * @private
     */
    _shouldApplyEffect(
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
     * Helper method to wait for the configured execution delay
     * @private
     * @returns {Promise<void>}
     */
    async _waitForExecutionDelay() {
      // Check for timing override first
      const delay =
        this.system.timingOverride && this.system.timingOverride > 0
          ? this.system.timingOverride * 1000 // Convert seconds to milliseconds
          : game.settings.get("eventide-rp-system", "actionCardExecutionDelay");

      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    /**
     * Execute the action card's attack chain
     * @param {Actor} actor - The actor executing the action card
     * @returns {Promise<Object>} Result of the attack chain execution
     */
    async executeAttackChain(_actor) {

      try {
        // Check if attack chains are enabled globally
        const chainsEnabled = game.settings.get(
          "eventide-rp-system",
          "enableActionCardChains",
        );
        if (!chainsEnabled) {
          const error = new Error("Attack chains are disabled by GM settings");
          Logger.warn("Attack chains disabled by GM", error, "ACTION_CARD");
          throw error;
        }

        const embeddedItem = this.getEmbeddedItem({ executionContext: true });
        if (!embeddedItem) {
          const error = new Error("No embedded item found for attack chain");
          Logger.error(
            "No embedded item for attack chain",
            error,
            "ACTION_CARD",
          );
          throw error;
        }

        // Get targets for AC checking
        let targetArray = await erps.utils.getTargetArray();

        // Handle self-targeting: create synthetic target array with actor's token
        if (this.system.selfTarget) {
          const selfToken = this._getSelfTargetToken(_actor);
          if (selfToken) {
            targetArray = [selfToken];
            Logger.debug(
              "Self-targeting enabled - using synthetic target array",
              { actorId: _actor.id, actorName: _actor.name },
              "ACTION_CARD",
            );
          } else {
            Logger.warn(
              "Self-targeting enabled but no token found for actor",
              { actorId: _actor.id, actorName: _actor.name },
              "ACTION_CARD",
            );
            ui.notifications.warn(
              game.i18n.localize(
                "EVENTIDE_RP_SYSTEM.Errors.SelfTargetNoToken",
              ),
            );
            return { success: false, reason: "noSelfToken" };
          }
        }

        if (targetArray.length === 0) {
          Logger.warn("No targets found for attack chain", null, "ACTION_CARD");
          ui.notifications.warn(
            game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Errors.NoTargetsAttackChain",
            ),
          );
          return { success: false, reason: "noTargets" };
        }

        // Execute the embedded item's roll and capture result

        // For now, we'll execute without capturing the roll result
        // This can be enhanced later to capture the actual roll
        const popup = await embeddedItem.roll();
        if (!popup) {
          const error = new Error("Failed to open embedded item popup");
          Logger.error("Failed to open popup", error, "ACTION_CARD");
          throw error;
        }

        // For demonstration, we'll create a basic result structure
        const chainResult = {
          success: true,
          mode: "attackChain",
          targetResults: targetArray.map((target) => ({
            target: target.actor,
            firstHit: true, // Simplified for now
            secondHit: true,
            bothHit: true,
            oneHit: true,
          })),
          damageResults: [],
          statusResults: [],
        };


        return chainResult;
      } catch (error) {
        Logger.error("Failed to execute attack chain", error, "ACTION_CARD");
        throw error;
      }
    }

    /**
     * Execute the action card's attack chain with a pre-computed roll result
     * @param {Actor} actor - The actor executing the action card
     * @param {Roll} rollResult - The pre-computed roll result from the embedded item
     * @param {boolean} disableDelays - If true, skip internal timing delays (for repetition contexts)
     * @param {boolean} shouldApplyDamage - If true, apply damage effects (for repetition damage control)
     * @param {boolean} shouldApplyStatus - If true, apply status effects (for repetition status control)
     * @param {boolean} isFinalRepetition - If true, allow final status delay (prevents double delay with repetition delay)
     * @returns {Promise<Object>} Result of the attack chain execution
     */
    async executeAttackChainWithRollResult(
      actor,
      rollResult,
      disableDelays = false,
      shouldApplyDamage = true,
      shouldApplyStatus = true,
      isFinalRepetition = true,
    ) {

      try {
        // Get targets for AC checking
        const targetArray = await erps.utils.getTargetArray();
        if (targetArray.length === 0) {
          Logger.warn("No targets found for attack chain", null, "ACTION_CARD");
          ui.notifications.warn(
            game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Errors.NoTargetsAttackChain",
            ),
          );
          return { success: false, reason: "noTargets" };
        }

        const embeddedItem = this.getEmbeddedItem({ executionContext: true });
        if (!embeddedItem) {
          const error = new Error("No embedded item found for attack chain");
          Logger.error(
            "No embedded item for attack chain",
            error,
            "ACTION_CARD",
          );
          throw error;
        }

        // Check hits against target ACs using the roll result
        const results = targetArray.map((target) => {
          const targetRollData = target.actor.getRollData();
          const firstAC =
            targetRollData.abilities[this.system.attackChain.firstStat]?.ac
              ?.total || 11;
          const secondAC =
            targetRollData.abilities[this.system.attackChain.secondStat]?.ac
              ?.total || 11;

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

        // Add delay after roll calculation but before damage application (GM only)
        if (game.user.isGM && !disableDelays) {
          await this._waitForExecutionDelay();
        }

        // Handle damage and status effects with delays
        let damageResults = [];
        if (shouldApplyDamage) {
          damageResults = await this._processDamageResults(
            results,
            rollResult,
            disableDelays,
          );
          if (!disableDelays) {
            await this._waitForExecutionDelay();
          }
        }
        let statusResults = [];
        if (shouldApplyStatus) {
          statusResults = await this._processStatusResults(
            results,
            rollResult,
            disableDelays,
            isFinalRepetition,
          );
        }

        // Process transformations after status effects
        let transformationResults = [];
        if (this.system.embeddedTransformations.length > 0) {
          transformationResults = await this._processTransformationResults(
            results,
            rollResult,
            disableDelays,
            isFinalRepetition,
          );
        }

        const chainResult = {
          success: true,
          mode: "attackChain",
          baseRoll: rollResult,
          embeddedItemRollMessage: rollResult?.messageId || null,
          targetResults: results,
          damageResults,
          statusResults,
          transformationResults,
        };


        return chainResult;
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
     * Execute saved damage mode
     * @param {Actor} actor - The actor executing the action card
     * @returns {Promise<Object>} Result of the saved damage execution
     */
    async executeSavedDamage(_actor) {

      try {
        // Get targets
        let targetArray = await erps.utils.getTargetArray();

        // Handle self-targeting: create synthetic target array with actor's token
        if (this.system.selfTarget) {
          const selfToken = this._getSelfTargetToken(_actor);
          if (selfToken) {
            targetArray = [selfToken];
            Logger.debug(
              "Self-targeting enabled - using synthetic target array",
              { actorId: _actor.id, actorName: _actor.name },
              "ACTION_CARD",
            );
          } else {
            Logger.warn(
              "Self-targeting enabled but no token found for actor",
              { actorId: _actor.id, actorName: _actor.name },
              "ACTION_CARD",
            );
            ui.notifications.warn(
              game.i18n.localize(
                "EVENTIDE_RP_SYSTEM.Errors.SelfTargetNoToken",
              ),
            );
            return { success: false, reason: "noSelfToken" };
          }
        }

        if (targetArray.length === 0) {
          Logger.warn("No targets found for saved damage", null, "ACTION_CARD");
          ui.notifications.warn(
            game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Errors.NoTargetsSavedDamage",
            ),
          );
          return { success: false, reason: "noTargets" };
        }

        const damageResults = [];

        // Apply saved damage to each target
        for (const target of targetArray) {
          try {
            // Apply damage directly (GM or player owns all targets)
            // Apply vulnerability modifier to damage formula
            const originalFormula = this.system.savedDamage.formula;
            const formula =
              this.system.savedDamage.type !== "heal" &&
              target.actor.system.hiddenAbilities.vuln.total > 0
                ? `${originalFormula} + ${Math.abs(target.actor.system.hiddenAbilities.vuln.total)}`
                : originalFormula;

            const damageRoll = await target.actor.damageResolve({
              formula,
              label: this._getEffectiveLabel(),
              description:
                this.system.description || this.system.savedDamage.description,
              type: this.system.savedDamage.type,
              img: this._getEffectiveImage(),
              bgColor: this.system.bgColor,
              textColor: this.system.textColor,
            });

            damageResults.push({ target: target.actor, roll: damageRoll });
          } catch (damageError) {
            Logger.error(
              "Failed to apply saved damage",
              damageError,
              "ACTION_CARD",
            );
          }
        }

        // Process transformations after damage for saved damage mode
        let transformationResults = [];
        if (this.system.embeddedTransformations.length > 0) {
          transformationResults = await this._processTransformationResults(
            targetArray.map((target) => ({ target: target.actor })),
            null,
            false,
            true,
          );
        }

        const result = {
          success: true,
          mode: "savedDamage",
          damageResults,
          transformationResults,
        };


        return result;
      } catch (error) {
        Logger.error("Failed to execute saved damage", error, "ACTION_CARD");
        throw error;
      }
    }

    /**
     * Process damage results for attack chain
     * @private
     * @param {Array} results - Target hit results
     * @param {Roll} rollResult - The roll result
     * @param {boolean} disableDelays - If true, skip internal timing delays
     * @returns {Promise<Array>} Damage results
     */
    async _processDamageResults(results, rollResult, _disableDelays = false) {
      const damageResults = [];

      for (const result of results) {
        const shouldApplyDamage = this._shouldApplyEffect(
          this.system.attackChain.damageCondition,
          result.oneHit,
          result.bothHit,
          rollResult?.total || 0,
          this.system.attackChain.damageThreshold || 15,
        );

        if (shouldApplyDamage && this.system.attackChain.damageFormula) {
          // Apply damage directly (GM or player owns all targets)
          try {
            // Apply vulnerability modifier to damage formula
            const originalFormula = this.system.attackChain.damageFormula;
            const formula =
              this.system.attackChain.damageType !== "heal" &&
              result.target.system.hiddenAbilities.vuln.total > 0
                ? `${originalFormula} + ${Math.abs(result.target.system.hiddenAbilities.vuln.total)}`
                : originalFormula;

            const damageRoll = await result.target.damageResolve({
              formula,
              label: this._getEffectiveLabel(),
              description:
                this.system.description ||
                (this.system.rollActorName !== false ? `Attack chain damage from ${this.name}` : "Attack chain damage"),
              type: this.system.attackChain.damageType,
              img: this._getEffectiveImage(),
              bgColor: this.system.bgColor,
              textColor: this.system.textColor,
            });
            damageResults.push({ target: result.target, roll: damageRoll });
          } catch (damageError) {
            Logger.error(
              "Failed to apply chain damage",
              damageError,
              "ACTION_CARD",
            );
          }
        }
      }

      return damageResults;
    }

    /**
     * Process status effect results for attack chain
     * @private
     * @param {Array} results - Target hit results
     * @param {Roll} rollResult - The roll result
     * @param {boolean} disableDelays - If true, skip internal timing delays
     * @param {boolean} isFinalRepetition - If true, allow final status delay (prevents double delay)
     * @returns {Promise<Array>} Status results
     */
    async _processStatusResults(
      results,
      rollResult,
      disableDelays = false,
      isFinalRepetition = true,
    ) {

      const statusResults = [];

      // Early exit if no embedded status effects to apply
      if (!this.system.embeddedStatusEffects || this.system.embeddedStatusEffects.length === 0) {
        return statusResults;
      }

      // Filter effects based on selection
      let effectsToApply = this.system.embeddedStatusEffects;
      const selectedEffectIds = this._currentRepetitionContext?.selectedEffectIds;

      Logger.debug(
        `Status effect filtering - checking selection`,
        {
          hasContext: !!this._currentRepetitionContext,
          selectedEffectIds,
          selectedEffectIdsType: typeof selectedEffectIds,
          isArray: Array.isArray(selectedEffectIds),
          totalEffects: this.system.embeddedStatusEffects.length,
          allEffectIds: this.system.embeddedStatusEffects.map((e, i) => e._id || `effect-${i}`),
        },
        "ACTION_CARD",
      );

      // Always respect user selections (enforceStatusChoice is only for front-end validation)
      if (selectedEffectIds !== null && selectedEffectIds !== undefined) {
        effectsToApply = this.system.embeddedStatusEffects.filter((effect, index) => {
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
          `Filtered status effects based on user selection`,
          {
            totalEffects: this.system.embeddedStatusEffects.length,
            selectedCount: effectsToApply.length,
            selectedIds: selectedEffectIds,
            filteredEffectNames: effectsToApply.map(e => e.name),
          },
          "ACTION_CARD",
        );
      }

      try {
        for (const result of results) {
          // Skip invalid results
          if (!result || !result.target) {
            Logger.warn(
              "Invalid result structure in _processStatusResults, skipping",
              { result },
              "ACTION_CARD",
            );
            continue;
          }

          // Determine if status effects should be applied based on chain configuration
          const shouldApplyStatus = this._shouldApplyEffect(
            this.system.attackChain.statusCondition,
            result.oneHit,
            result.bothHit,
            rollResult?.total || 0,
            this.system.attackChain.statusThreshold || 15,
          );

          if (shouldApplyStatus) {
            // Check limit BEFORE entering effects loop (per application, not per effect)
            const statusApplicationLimit = this._currentRepetitionContext?.statusApplicationLimit ?? 1;
            const statusApplicationCounts = this._currentRepetitionContext?.statusApplicationCounts ?? new Map();
            const targetId = result.target.id;
            const statusApplicationCount = statusApplicationCounts.get(targetId) ?? 0;

            if (statusApplicationLimit > 0 && statusApplicationCount >= statusApplicationLimit) {
              Logger.debug(
                `Skipping all effects for target "${result.target.name}" - status application limit reached (${statusApplicationCount}/${statusApplicationLimit})`,
                {
                  targetId,
                  targetName: result.target.name,
                  limit: statusApplicationLimit,
                  count: statusApplicationCount,
                },
                "ACTION_CARD",
              );
              continue; // Skip this target entirely
            }

            // Apply ALL effects for this target
            for (const effectData of effectsToApply) {
              // Validate effect entry structure
              if (!effectData) {
                Logger.warn(
                  "Invalid effect entry structure, skipping",
                  {
                    effectData,
                    actionCardName: this.name,
                    targetName: result.target.name,
                  },
                  "ACTION_CARD",
                );
                continue;
              }

              // Track effect application for logging purposes
              const effectKey = `${result.target.id}-${effectData.name}`;

              Logger.debug("Effect application check", {
                effectKey
              }, "ACTION_CARD")

              // Handle gear effects differently based on attemptInventoryReduction setting
              if (
                effectData.type === "gear" &&
                this.system.attemptInventoryReduction
              ) {
                try {
                  // Check if the actor has the gear item
                  const actualGearItem = InventoryUtils.findGearByName(
                    this.actor,
                    effectData.name,
                  );

                  if (!actualGearItem) {
                    // Log warning and continue without applying the effect
                    Logger.warn(
                      `Gear effect "${effectData.name}" not found in actor inventory`,
                      {
                        actorName: this.actor.name,
                        effectName: effectData.name,
                        targetName: result.target.name,
                      },
                      "ACTION_CARD",
                    );

                    // Add warning to results
                    statusResults.push({
                      target: result.target,
                      effect: effectData,
                      applied: false,
                      warning: game.i18n.format(
                        "EVENTIDE_RP_SYSTEM.Item.ActionCard.GearEffectNotFoundWarning",
                        { gearName: effectData.name },
                      ),
                    });

                    // Show UI notification to user
                    ui.notifications.warn(
                      game.i18n.format(
                        "EVENTIDE_RP_SYSTEM.Item.ActionCard.GearEffectNotFoundWarning",
                        { gearName: effectData.name },
                      ),
                    );
                    continue;
                  }

                  // Check if there's enough quantity
                  const requiredQuantity = effectData.system.cost || 0;
                  if (actualGearItem.system.quantity < requiredQuantity) {
                    // Log warning and continue without applying the effect
                    Logger.warn(
                      `Insufficient quantity of "${effectData.name}" in actor inventory`,
                      {
                        actorName: this.actor.name,
                        effectName: effectData.name,
                        requiredQuantity,
                        availableQuantity: actualGearItem.system.quantity,
                        targetName: result.target.name,
                      },
                      "ACTION_CARD",
                    );

                    // Add warning to results
                    statusResults.push({
                      target: result.target,
                      effect: effectData,
                      applied: false,
                      warning: game.i18n.format(
                        "EVENTIDE_RP_SYSTEM.Item.ActionCard.GearEffectInsufficientWarning",
                        {
                          gearName: effectData.name,
                          required: requiredQuantity,
                          available: actualGearItem.system.quantity,
                        },
                      ),
                    });

                    // Show UI notification to user
                    ui.notifications.warn(
                      game.i18n.format(
                        "EVENTIDE_RP_SYSTEM.Item.ActionCard.GearEffectInsufficientWarning",
                        {
                          gearName: effectData.name,
                          required: requiredQuantity,
                          available: actualGearItem.system.quantity,
                        },
                      ),
                    );
                    continue;
                  }

                  // Reduce quantity from inventory
                  const currentQuantity = actualGearItem.system.quantity;
                  const newQuantity = Math.max(
                    0,
                    currentQuantity - requiredQuantity,
                  );
                  await actualGearItem.update({
                    "system.quantity": newQuantity,
                  });

                } catch (error) {
                  Logger.error(
                    `Failed to process gear effect "${effectData.name}"`,
                    error,
                    "ACTION_CARD",
                  );

                  // Add error to results
                  statusResults.push({
                    target: result.target,
                    effect: effectData,
                    applied: false,
                    error: game.i18n.format(
                      "EVENTIDE_RP_SYSTEM.Item.ActionCard.GearEffectInventoryError",
                      { error: error.message },
                    ),
                  });
                  continue;
                }
              }

              // Apply status effects directly (GM or player owns all targets)
              try {
                // Set flag for effects to trigger appropriate message via createItem hook
                if (
                  effectData.type === "gear" ||
                  effectData.type === "status"
                ) {
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
                  await StatusIntensification.applyOrIntensifyStatus(
                    result.target,
                    effectData,
                  );

                // Track that this effect has been applied to this target
                if (applicationResult.applied && this._currentRepetitionContext?.appliedStatusEffects) {
                  const effectKey = `${result.target.id}-${effectData.name}`;
                  this._currentRepetitionContext.appliedStatusEffects.add(effectKey);
                }

                // Wait for execution delay after applying status effects
                // Delay except on final repetition (where sequence ends)
                if (!disableDelays && !isFinalRepetition) {
                  await this._waitForExecutionDelay();
                }

                // Messages are handled by createItem hook
                statusResults.push({
                  target: result.target,
                  effect: effectData,
                  applied: applicationResult.applied,
                  intensified: applicationResult.intensified,
                });

              } catch (error) {
                Logger.error(
                  `Failed to apply effect "${effectData.name}" to target "${result.target.name}"`,
                  error,
                  "ACTION_CARD",
                );

                // Add error to results
                statusResults.push({
                  target: result.target,
                  effect: effectData,
                  applied: false,
                  error: error.message,
                });
              }
            }

            // Increment count AFTER all effects applied (per application, not per effect)
            if (this._currentRepetitionContext?.statusApplicationCounts instanceof Map) {
              const targetId = result.target.id;
              const currentCount = this._currentRepetitionContext.statusApplicationCounts.get(targetId) ?? 0;
              this._currentRepetitionContext.statusApplicationCounts.set(targetId, currentCount + 1);

              Logger.debug(
                `Status application count incremented for target "${result.target.name}"`,
                {
                  targetId,
                  targetName: result.target.name,
                  newCount: currentCount + 1,
                  limit: this._currentRepetitionContext.statusApplicationLimit,
                },
                "ACTION_CARD",
              );
            }
          }
        }

        return statusResults;
      } catch (error) {
        Logger.error("Failed to process status results", error, "ACTION_CARD");
        throw error;
      }
    }

    /**
     * Check if embedded item has sufficient resources to execute
     * Delegates to ResourceValidator service for validation logic.
     * @param {Item} embeddedItem - The embedded item to check
     * @param {Actor} actor - The actor executing the action card
     * @param {boolean} [shouldConsumeCost=true] - Whether to check cost consumption
     * @returns {Object} Object with canExecute boolean and reason string
     */
    checkEmbeddedItemResources(embeddedItem, actor, shouldConsumeCost = true) {
      return ResourceValidator.checkEmbeddedItemResources(embeddedItem, actor, shouldConsumeCost);
    }

    /**
     * Send resource failure message to chat
     * Delegates to ResourceValidator service for message creation.
     * @param {Actor} actor - The actor executing the action card
     * @param {Object} resourceCheck - The resource check result
     * @param {Item} embeddedItem - The embedded item that failed
     * @param {number} repetitionIndex - Current repetition index
     * @param {number|null} [repetitionCount=null] - Total repetitions (optional)
     * @returns {Promise<void>}
     */
    async sendResourceFailureMessage(
      actor,
      resourceCheck,
      embeddedItem,
      repetitionIndex,
      repetitionCount = null,
    ) {
      await ResourceValidator.sendResourceFailureMessage({
        actor,
        resourceCheck,
        embeddedItem,
        repetitionIndex,
        repetitionCount,
        cardData: {
          name: this.name,
          img: this._getEffectiveImage(),
          textColor: this.system.textColor,
          bgColor: this.system.bgColor,
          rollActorName: this.system.rollActorName,
        },
      });
    }

    /**
     * Send a failure message to chat when action card execution fails
     * @param {Actor} actor - The actor that attempted to execute the action card
     * @param {number} repetitionCount - The failed repetition count
     * @param {Roll} repetitionsRoll - The roll that determined the repetition count
     */
    async sendFailureMessage(actor, repetitionCount, repetitionsRoll) {
      try {
        // Issue #130: Respect rollActorName setting for failure messages
        const displayName = this.system.rollActorName !== false ? this.name : "Action Card";
        const messageData = {
          speaker: ChatMessage.getSpeaker({ actor }),
          content: `
            <div class="action-card-failure">
              <h3>${displayName} - Execution Failed</h3>
              <p><strong>Repetitions Roll:</strong> ${repetitionsRoll.formula} = ${repetitionCount}</p>
              <p class="failure-reason">Action failed due to insufficient repetitions (${repetitionCount} ≤ 0)</p>
            </div>
          `,
          type: CONST.CHAT_MESSAGE_TYPES.OTHER,
        };

        await ChatMessage.create(messageData);
      } catch (error) {
        Logger.error("Failed to send failure message", error, "ACTION_CARD");
      }
    }

    /**
     * Execute embedded item for repeatToHit scenarios with roll capture
     * @param {Actor} actor - The actor executing the action card
     * @returns {Promise<Roll|null>} Fresh roll result or null
     */
    async executeEmbeddedItemForRepetition(actor) {
      // Get fresh roll result for repeatToHit scenarios
      const embeddedItem = this.getEmbeddedItem({ executionContext: true });
      if (!embeddedItem) {
        Logger.warn(
          "No embedded item found for repeatToHit repetition",
          null,
          "ACTION_CARD",
        );
        return null;
      }

      try {
        // Set up roll capture using the same logic as ActionCardPopup
        const rollResultPromise = new Promise((resolve, _reject) => {
          let resolved = false;

          // Set up a one-time hook to capture the chat message
          const hookId = Hooks.on("createChatMessage", (message) => {
            // Only process if we haven't already resolved
            if (resolved) return;

            // Check if this message is from our actor
            const isFromOurActor =
              message.speaker?.actor === actor.id ||
              message.speaker?.alias === actor.name ||
              message.speaker?.token === actor.token?.id;

            if (isFromOurActor) {
              const roll = message.rolls?.[0];
              if (roll) {
                // Add messageId to the roll object
                roll.messageId = message.id;
                resolved = true;
                Hooks.off("createChatMessage", hookId);
                resolve(roll);
              } else {
                // Non-roll message from our actor - still counts as completion
                resolved = true;
                Hooks.off("createChatMessage", hookId);
                resolve(null);
              }
            }
          });

          // Set up a timeout to prevent hanging
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              Hooks.off("createChatMessage", hookId);
              Logger.warn(
                "Timeout waiting for embedded item repetition roll result",
                { itemName: embeddedItem.name },
                "ACTION_CARD",
              );
              resolve(null); // Resolve with null instead of reject to prevent breaking execution
            }
          }, 3000); // Shorter timeout for repetitions
        });

        // Execute embedded item with bypass
        await embeddedItem.roll({ bypass: true });

        // Wait for the roll result
        const rollResult = await rollResultPromise;


        return rollResult;
      } catch (error) {
        Logger.error(
          "Failed to execute embedded item for repetition",
          error,
          "ACTION_CARD",
        );
        return null;
      }
    }

    /**
     * Execute a single iteration of the action card
     * @param {Actor} actor - The actor executing the action card
     * @param {Roll} rollResult - The roll result for this iteration
     * @param {number} repetitionIndex - Current repetition index (0-based)
     * @param {number} totalRepetitions - Total number of repetitions
     * @returns {Promise<Object>} Result of the single iteration
     */
    async executeSingleIteration(
      actor,
      rollResult,
      repetitionIndex,
      totalRepetitions,
    ) {
      if (this.system.mode === "attackChain") {
        return await this.executeAttackChainIteration(
          actor,
          rollResult,
          repetitionIndex,
          totalRepetitions,
        );
      } else if (this.system.mode === "savedDamage") {
        return await this.executeSavedDamageIteration(
          actor,
          repetitionIndex,
          totalRepetitions,
        );
      } else {
        throw new Error(`Unknown action card mode: ${this.system.mode}`);
      }
    }

    /**
     * Get the actor's token for self-targeting
     * @param {Actor} actor - The actor to get the token for
     * @returns {TokenDocument|null} The actor's token or null if not found
     * @private
     */
    _getSelfTargetToken(actor) {
      // First try to get the actor's synthetic token (preferred)
      if (actor.token) {
        return actor.token;
      }

      // Fallback to getting active tokens from the canvas
      const activeTokens = actor.getActiveTokens();
      if (activeTokens.length > 0) {
        // Return the first active token
        return activeTokens[0];
      }

      // No token found
      return null;
    }

    /**
     * Execute a single attack chain iteration with repetition awareness
     * @param {Actor} actor - The actor executing the action card
     * @param {Roll} rollResult - The roll result for this iteration
     * @param {number} repetitionIndex - Current repetition index (0-based)
     * @param {number} totalRepetitions - Total number of repetitions
     * @returns {Promise<Object>} Result of the attack chain iteration
     */
    async executeAttackChainIteration(
      actor,
      rollResult,
      repetitionIndex,
      totalRepetitions,
    ) {
      // Determine if damage should be applied based on damageApplication setting and repetition index
      const shouldApplyDamage =
        this.system.damageApplication || repetitionIndex === 0;

      // IMPORTANT: Always check status conditions on each repetition
      // The _processStatusResults method will handle tracking which effects have already been applied
      const shouldApplyStatus = true;

      // Determine if this is the final repetition (affects final status delay)
      const isFinalRepetition = repetitionIndex === totalRepetitions - 1;

      // Reuse existing executeAttackChainWithRollResult logic with normal step delays
      // Keep all step delays, only control the final status delay
      const result = await this.executeAttackChainWithRollResult(
        actor,
        rollResult,
        false,
        shouldApplyDamage,
        shouldApplyStatus,
        isFinalRepetition,
      );

      // For repeatToHit scenarios, we need to evaluate each repetition independently
      // Don't filter based on repetitionIndex - each repetition should be evaluated on its own merits

      return {
        ...result,
        repetitionIndex,
        totalRepetitions,
      };
    }

    /**
     * Execute a single saved damage iteration with repetition awareness
     * @param {Actor} actor - The actor executing the action card
     * @param {number} repetitionIndex - Current repetition index (0-based)
     * @param {number} totalRepetitions - Total number of repetitions
     * @returns {Promise<Object>} Result of the saved damage iteration
     */
    async executeSavedDamageIteration(
      actor,
      repetitionIndex,
      totalRepetitions,
    ) {
      // For saved damage, only apply on first iteration unless damageApplication is true
      if (repetitionIndex > 0 && !this.system.damageApplication) {
        return {
          success: true,
          mode: "savedDamage",
          repetitionIndex,
          totalRepetitions,
          damageResults: [],
          skipped: true,
        };
      }

      // Reuse existing executeSavedDamage logic
      const result = await this.executeSavedDamage(actor);

      // Add delay after saved damage except on final repetition
      const isFinalRepetition = repetitionIndex === totalRepetitions - 1;
      if (!isFinalRepetition) {
        await this._waitForExecutionDelay();
      }

      return {
        ...result,
        repetitionIndex,
        totalRepetitions,
      };
    }

    /**
     * Wait for the configured repetition delay
     * Delegates to RepetitionHandler service for delay logic.
     * @returns {Promise<void>}
     */
    async waitForRepetitionDelay() {
      await RepetitionHandler.waitForDelay(this.system.timingOverride);
    }

    /**
     * Aggregate results from multiple repetitions into a combined result
     * Delegates to RepetitionHandler service for aggregation logic.
     * @param {Array} results - Array of individual repetition results
     * @param {number} repetitionCount - Total number of repetitions executed
     * @returns {Object} Combined result object
     */
    aggregateRepetitionResults(results, repetitionCount) {
      return RepetitionHandler.aggregateResults(
        results,
        repetitionCount,
        this.system.mode,
      );
    }

    /**
     * Check if an iteration was successful (Issue #128)
     * Delegates to RepetitionHandler service for success checking logic.
     * @private
     * @param {Object} result - The iteration result
     * @returns {boolean} Whether the iteration was successful
     */
    _checkIterationSuccess(result) {
      return RepetitionHandler.checkIterationSuccess(
        result,
        this.system,
        (condition, oneHit, bothHit, rollTotal, threshold) =>
          this._shouldApplyEffect(condition, oneHit, bothHit, rollTotal, threshold),
      );
    }

    /**
     * Process transformation results for action card execution
     * @private
     * @param {Array} results - Target hit results
     * @param {Roll} rollResult - The roll result
     * @param {boolean} disableDelays - If true, skip internal timing delays
     * @param {boolean} isFinalRepetition - If true, allow final delay
     * @returns {Promise<Array>} Transformation results
     */
    async _processTransformationResults(
      results,
      rollResult,
      disableDelays = false,
      isFinalRepetition = true,
    ) {
      // Delegate to TransformationApplicator service
      return TransformationApplicator.processTransformationResults({
        results,
        rollResult,
        embeddedTransformations: this.system.embeddedTransformations,
        transformationConfig: this.system.transformationConfig,
        repetitionContext: this._currentRepetitionContext,
        getEmbeddedTransformations: (options) => this.getEmbeddedTransformations(options),
        shouldApplyEffect: (condition, oneHit, bothHit, rollTotal, threshold) =>
          this._shouldApplyEffect(condition, oneHit, bothHit, rollTotal, threshold),
        waitForDelay: () => this._waitForExecutionDelay(),
        mode: this.system.mode,
        disableDelays,
        isFinalRepetition,
      });
    }

    /**
     * Apply transformation with validation checks
     * @private
     * @param {Actor} targetActor - The actor to apply transformation to
     * @param {Object} transformationData - The transformation data
     * @returns {Promise<Object>} Application result
     */
    async _applyTransformationWithValidation(targetActor, transformationData) {
      // Delegate to TransformationApplicator service
      return TransformationApplicator.applyWithValidation(targetActor, transformationData);
    }

    /**
     * Prompt GM to choose which transformation to apply from multiple options
     * @private
     * @returns {Promise<Object|null>} Selected transformation data or null if cancelled
     */
    async _promptGMForTransformationChoice() {
      // Delegate to TransformationApplicator service
      return TransformationApplicator.promptForSelection(this.system.embeddedTransformations);
    }
  };
}
