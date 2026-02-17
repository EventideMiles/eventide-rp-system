import { Logger } from "../../services/logger.mjs";
import { ResourceValidator } from "../../services/resource-validator.mjs";
import { TransformationApplicator } from "../../services/transformation-applicator.mjs";
import { RepetitionHandler } from "../../services/repetition-handler.mjs";
import {
  StatusEffectApplicator,
  TargetResolver,
  ChatMessageBuilder,
  DamageProcessor,
  AttackChainExecutor,
} from "../../services/_module.mjs";

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

        // Resolve targets using TargetResolver service
        const resolution = await TargetResolver.resolveTargets({
          actor: _actor,
          selfTarget: this.system.selfTarget,
          contextName: "attack chain",
        });
        if (!resolution.success) {
          return { success: false, reason: resolution.reason };
        }
        const targetArray = resolution.targets;

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

      return AttackChainExecutor.executeWithRollResult({
        actionCard: this,
        rollResult,
        embeddedItem,
        attackChain: this.system.attackChain,
        embeddedTransformations: this.system.embeddedTransformations,
        processDamage: (results, roll, delays) =>
          this._processDamageResults(results, roll, delays),
        processStatus: (results, roll, delays, isFinal) =>
          this._processStatusResults(results, roll, delays, isFinal),
        processTransformation: (results, roll, delays, isFinal) =>
          this._processTransformationResults(results, roll, delays, isFinal),
        waitForDelay: () => this._waitForExecutionDelay(),
        disableDelays,
        shouldApplyDamage,
        shouldApplyStatus,
        isFinalRepetition,
      });
    }

    /**
     * Execute saved damage mode
     * @param {Actor} actor - The actor executing the action card
     * @returns {Promise<Object>} Result of the saved damage execution
     */
    async executeSavedDamage(_actor) {

      try {
        // Resolve targets using TargetResolver service
        const resolution = await TargetResolver.resolveTargets({
          actor: _actor,
          selfTarget: this.system.selfTarget,
          contextName: "saved damage",
        });
        if (!resolution.success) {
          return { success: false, reason: resolution.reason };
        }
        const targetArray = resolution.targets;

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
     * Delegates to DamageProcessor service for damage resolution.
     * @private
     * @param {Array} results - Target hit results
     * @param {Roll} rollResult - The roll result
     * @param {boolean} _disableDelays - If true, skip internal timing delays (unused, kept for signature compatibility)
     * @returns {Promise<Array>} Damage results
     */
    async _processDamageResults(results, rollResult, _disableDelays = false) {
      return await DamageProcessor.processDamageResults(results, rollResult, {
        damageFormula: this.system.attackChain.damageFormula,
        damageType: this.system.attackChain.damageType,
        damageCondition: this.system.attackChain.damageCondition,
        damageThreshold: this.system.attackChain.damageThreshold || 15,
        label: this._getEffectiveLabel(),
        description:
          this.system.description ||
          (this.system.rollActorName !== false ? `Attack chain damage from ${this.name}` : "Attack chain damage"),
        img: this._getEffectiveImage(),
        bgColor: this.system.bgColor,
        textColor: this.system.textColor,
      });
    }

    /**
     * Process status effect results for attack chain
     * Delegates to StatusEffectApplicator service for status effect application.
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
      return await StatusEffectApplicator.processStatusResults({
        results,
        rollResult,
        embeddedStatusEffects: this.system.embeddedStatusEffects,
        attackChain: this.system.attackChain,
        repetitionContext: this._currentRepetitionContext,
        sourceActor: this.actor,
        attemptInventoryReduction: this.system.attemptInventoryReduction,
        shouldApplyEffect: this._shouldApplyEffect.bind(this),
        waitForDelay: this._waitForExecutionDelay.bind(this),
        disableDelays,
        isFinalRepetition,
      });
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
     * Delegates to ChatMessageBuilder service for message creation.
     * @param {Actor} actor - The actor that attempted to execute the action card
     * @param {number} repetitionCount - The failed repetition count
     * @param {Roll} repetitionsRoll - The roll that determined the repetition count
     */
    async sendFailureMessage(actor, repetitionCount, repetitionsRoll) {
      await ChatMessageBuilder.sendRepetitionFailureMessage({
        actor,
        cardName: this.name,
        repetitionCount,
        repetitionsRoll,
        rollActorName: this.system.rollActorName,
      });
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
     * Delegates to TargetResolver service for token resolution.
     * @param {Actor} actor - The actor to get the token for
     * @returns {TokenDocument|null} The actor's token or null if not found
     * @private
     */
    _getSelfTargetToken(actor) {
      return TargetResolver.getSelfTargetToken(actor);
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
