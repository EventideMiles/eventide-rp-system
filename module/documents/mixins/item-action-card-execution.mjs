import { Logger } from "../../services/logger.mjs";
import { InventoryUtils } from "../../helpers/_module.mjs";
import { StatusIntensification } from "../../helpers/status-intensification.mjs";

const { renderTemplate } = foundry.applications.handlebars;

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


      try {
        // Calculate number of repetitions
        const repetitionsRoll = new Roll(
          this.system.repetitions || "1",
          actor.getRollData(),
        );
        await repetitionsRoll.evaluate();
        const repetitionCount = Math.floor(repetitionsRoll.total);


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

        // Store current repetition context for cost control
        this._currentRepetitionContext = {
          inExecution: true,
          costOnRepetition: this.system.costOnRepetition,
          appliedTransformations: new Set(), // Track which transformations have been applied
          transformationSelections: options.transformationSelections || new Map(), // Pre-selected transformations
        };

        // Execute repetitions
        const results = [];
        for (let i = 0; i < repetitionCount; i++) {

          // Check resource constraints before execution
          const embeddedItem = this.getEmbeddedItem();
          if (embeddedItem) {
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
                repetitionCount,
              );

              // Return partial results with failure reason
              const partialResult = {
                success: false,
                repetitionCount,
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
          this._currentRepetitionContext.repetitionIndex = i;
          this._currentRepetitionContext.shouldApplyCost =
            this.system.costOnRepetition || i === 0;

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
            repetitionCount,
          );
          results.push(result);
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

        // Aggregate results
        const combinedResult = this.aggregateRepetitionResults(
          results,
          repetitionCount,
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
        const targetArray = await erps.utils.getTargetArray();
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
              label: this.name,
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
              label: this.name,
              description:
                this.system.description ||
                `Attack chain damage from ${this.name}`,
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
            for (const effectData of this.system.embeddedStatusEffects) {
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
     * @param {Item} embeddedItem - The embedded item to check
     * @param {Actor} actor - The actor executing the action card
     * @returns {Object} Object with canExecute boolean and reason string
     */
    checkEmbeddedItemResources(embeddedItem, actor, shouldConsumeCost = true) {
      if (!embeddedItem) {
        return { canExecute: false, reason: "noEmbeddedItem" };
      }

      // Check combat power costs
      if (embeddedItem.type === "combatPower") {
        const powerCost = shouldConsumeCost ? embeddedItem.system.cost || 0 : 0;
        const currentPower = actor.system.power?.value || 0;

        if (powerCost > currentPower) {
          return {
            canExecute: false,
            reason: "insufficientPower",
            required: powerCost,
            available: currentPower,
          };
        }
      }

      // Check gear quantity costs
      if (embeddedItem.type === "gear") {
        const gearCost = shouldConsumeCost ? embeddedItem.system.cost || 0 : 0;
        const currentQuantity = embeddedItem.system.quantity || 0;

        if (gearCost > currentQuantity) {
          return {
            canExecute: false,
            reason: "insufficientQuantity",
            required: gearCost,
            available: currentQuantity,
          };
        }
      }

      return { canExecute: true };
    }

    /**
     * Send resource failure message to chat
     * @param {Actor} actor - The actor executing the action card
     * @param {Object} resourceCheck - The resource check result
     * @param {Item} embeddedItem - The embedded item that failed
     * @param {number} repetitionIndex - Current repetition index
     * @returns {Promise<void>}
     */
    async sendResourceFailureMessage(
      actor,
      resourceCheck,
      embeddedItem,
      repetitionIndex,
      repetitionCount = null,
    ) {
      try {
        let failureTitle = "";
        let failureMessage = "";

        if (resourceCheck.reason === "insufficientPower") {
          failureTitle = "Insufficient Power";
          failureMessage = `Cannot execute <strong>${embeddedItem.name}</strong> - requires ${resourceCheck.required} power but only ${resourceCheck.available} available`;
        } else if (resourceCheck.reason === "insufficientQuantity") {
          failureTitle = "Insufficient Quantity";
          failureMessage = `Cannot execute <strong>${embeddedItem.name}</strong> - requires ${resourceCheck.required} quantity but only ${resourceCheck.available} available`;
        } else {
          failureTitle = "Resource Constraint";
          failureMessage = "Unknown resource constraint preventing execution";
        }

        const templateData = {
          actionCard: {
            name: this.name,
            img: this._getEffectiveImage(),
          },
          style: this.system.textColor
            ? `color: ${this.system.textColor}; background-color: ${this.system.bgColor || "#8B0000"}`
            : "background-color: #8B0000",
          repetitionInfo: repetitionCount
            ? {
                current: repetitionIndex + 1,
                total: repetitionCount,
                completed: repetitionIndex,
              }
            : null,
          failureTitle,
          failureMessage,
          resourceInfo: {
            required: resourceCheck.required,
            available: resourceCheck.available,
          },
        };

        const content = await renderTemplate(
          "systems/eventide-rp-system/templates/chat/action-card-failure-message.hbs",
          templateData,
        );

        const messageData = {
          speaker: ChatMessage.getSpeaker({ actor }),
          content,
          type: CONST.CHAT_MESSAGE_TYPES.OTHER,
        };

        await ChatMessage.create(messageData);
      } catch (error) {
        Logger.error(
          "Failed to send resource failure message",
          error,
          "ACTION_CARD",
        );
      }
    }

    /**
     * Send a failure message to chat when action card execution fails
     * @param {Actor} actor - The actor that attempted to execute the action card
     * @param {number} repetitionCount - The failed repetition count
     * @param {Roll} repetitionsRoll - The roll that determined the repetition count
     */
    async sendFailureMessage(actor, repetitionCount, repetitionsRoll) {
      try {
        const messageData = {
          speaker: ChatMessage.getSpeaker({ actor }),
          content: `
            <div class="action-card-failure">
              <h3>${this.name} - Execution Failed</h3>
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

      // Determine if status should be applied based on statusPerSuccess setting and repetition index
      const shouldApplyStatus =
        this.system.statusPerSuccess || repetitionIndex === 0;

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
     * @returns {Promise<void>}
     */
    async waitForRepetitionDelay() {
      const delay =
        this.system.timingOverride > 0
          ? this.system.timingOverride * 1000 // Convert seconds to milliseconds
          : game.settings.get("eventide-rp-system", "actionCardExecutionDelay");

      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    /**
     * Aggregate results from multiple repetitions into a combined result
     * @param {Array} results - Array of individual repetition results
     * @param {number} repetitionCount - Total number of repetitions executed
     * @returns {Object} Combined result object
     */
    aggregateRepetitionResults(results, repetitionCount) {
      const combinedResult = {
        success: results.every((r) => r.success),
        repetitionCount,
        results,
        mode: this.system.mode,
      };

      // Aggregate damage results
      combinedResult.damageResults = results.flatMap(
        (r) => r.damageResults || [],
      );

      // Aggregate status results
      combinedResult.statusResults = results.flatMap(
        (r) => r.statusResults || [],
      );

      // For attack chains, aggregate target results
      if (this.system.mode === "attackChain") {
        combinedResult.targetResults = results[0]?.targetResults || [];
        combinedResult.baseRoll = results[0]?.baseRoll;
        combinedResult.embeddedItemRollMessage =
          results[0]?.embeddedItemRollMessage;
      }

      return combinedResult;
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

      const transformationResults = [];

      try {
        // Skip if no transformations embedded
        if (this.system.embeddedTransformations.length === 0) {
          return transformationResults;
        }


        // Apply transformations to each target based on pre-selections or default logic
        for (const result of results) {
          // Skip invalid results
          if (!result || !result.target) {
            Logger.warn(
              "Invalid result structure in _processTransformationResults, skipping",
              { result },
              "ACTION_CARD",
            );
            continue;
          }

          // Determine which transformation to apply for this target
          let selectedTransformation = null;
          const transformationSelections = this._currentRepetitionContext?.transformationSelections;


          // Check multiple possible target ID formats for robust lookup
          let selectedTransformationId = null;
          if (transformationSelections) {
            // Try actor ID first
            if (transformationSelections.has(result.target.id)) {
              selectedTransformationId = transformationSelections.get(result.target.id);
            }
            // Try actor UUID as fallback
            else if (result.target.uuid && transformationSelections.has(result.target.uuid)) {
              selectedTransformationId = transformationSelections.get(result.target.uuid);
            }
            // Try token ID if actor is connected to a token
            else if (result.target.token?.id && transformationSelections.has(result.target.token.id)) {
              selectedTransformationId = transformationSelections.get(result.target.token.id);
            }
          }

          if (selectedTransformationId) {
            // Use pre-selected transformation for this target
            // First get the embedded transformations as temporary items
            const embeddedTransformations = await this.getEmbeddedTransformations({ executionContext: true });
            selectedTransformation = embeddedTransformations.find(
              t => t.originalId === selectedTransformationId
            );

          } else if (this.system.embeddedTransformations.length === 1) {
            // Only one transformation available, use it by default
            const embeddedTransformations = await this.getEmbeddedTransformations({ executionContext: true });
            selectedTransformation = embeddedTransformations[0];
          } else if (this.system.embeddedTransformations.length > 1) {
            // Multiple transformations but no pre-selection - fallback to GM prompt
            selectedTransformation = await this._promptGMForTransformationChoice();
            if (!selectedTransformation) {
              continue; // Skip this target instead of returning
            }
          }

          // Skip if no transformation was selected
          if (!selectedTransformation) {
            Logger.warn(
              `No transformation selected for target ${result.target.name}, skipping transformation application`,
              {
                targetId: result.target.id,
                hasSelections: !!transformationSelections,
                transformationCount: this.system.embeddedTransformations.length,
              },
              "ACTION_CARD",
            );
            continue;
          }

          // Check if transformation should be applied based on configuration
          let shouldApplyTransformation = true;
          if (this.system.mode === "attackChain") {
            shouldApplyTransformation = this._shouldApplyEffect(
              this.system.transformationConfig.condition,
              result.oneHit,
              result.bothHit,
              rollResult?.total || 0,
              this.system.transformationConfig.threshold || 15,
            );

          } else if (this.system.mode === "savedDamage") {
            // For saved damage mode, check transformation condition
            // Since there's no roll result, we only apply if condition is "never" -> false or anything else -> true
            shouldApplyTransformation = this.system.transformationConfig.condition !== "never";

          }

          if (shouldApplyTransformation) {
            // Check if this transformation has already been applied during repetitions
            const transformationKey = `${result.target.id}-${selectedTransformation.originalId || selectedTransformation.id}`;
            const alreadyApplied = this._currentRepetitionContext?.appliedTransformations?.has(transformationKey);


            if (alreadyApplied) {
              continue;
            }

            try {
              const applicationResult = await this._applyTransformationWithValidation(
                result.target,
                selectedTransformation,
              );

              // Track that this transformation has been applied to this target
              if (applicationResult.applied && this._currentRepetitionContext?.appliedTransformations) {
                this._currentRepetitionContext.appliedTransformations.add(transformationKey);
              }

              transformationResults.push({
                target: result.target,
                transformation: selectedTransformation,
                applied: applicationResult.applied,
                reason: applicationResult.reason,
                warning: applicationResult.warning,
              });
            } catch (error) {
              Logger.error(
                `Failed to apply transformation "${selectedTransformation.name}" to target "${result.target.name}"`,
                error,
                "ACTION_CARD",
              );

              transformationResults.push({
                target: result.target,
                transformation: selectedTransformation,
                applied: false,
                error: error.message,
              });
            }
          }
        }

        // Wait for execution delay if not final repetition
        if (!disableDelays && !isFinalRepetition) {
          await this._waitForExecutionDelay();
        }

        return transformationResults;
      } catch (error) {
        Logger.error(
          "Failed to process transformation results",
          error,
          "ACTION_CARD",
        );
        throw error;
      }
    }

    /**
     * Apply transformation with validation checks
     * @private
     * @param {Actor} targetActor - The actor to apply transformation to
     * @param {Object} transformationData - The transformation data
     * @returns {Promise<Object>} Application result
     */
    async _applyTransformationWithValidation(targetActor, transformationData) {
      // Check if actor already has a transformation with the same name
      const activeTransformationName = targetActor.getFlag(
        "eventide-rp-system",
        "activeTransformationName",
      );

      if (activeTransformationName === transformationData.name) {
        return {
          applied: false,
          reason: "duplicate_name",
          warning: game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Item.ActionCard.TransformationDuplicateNameWarning",
            { transformationName: transformationData.name },
          ),
        };
      }

      // Check cursed transformation precedence
      const activeTransformationCursed = targetActor.getFlag(
        "eventide-rp-system",
        "activeTransformationCursed",
      );
      const newTransformationCursed = transformationData.system?.cursed || false;

      // If actor has an active transformation
      if (activeTransformationName) {
        // If current transformation is cursed and new one is not cursed, deny
        if (activeTransformationCursed && !newTransformationCursed) {
          return {
            applied: false,
            reason: "cursed_override_denied",
            warning: game.i18n.format(
              "EVENTIDE_RP_SYSTEM.Item.ActionCard.TransformationCursedOverrideDenied",
              {
                currentTransformation: activeTransformationName,
                newTransformation: transformationData.name,
              },
            ),
          };
        }
      }

      // Create temporary transformation item for application
      // Ensure effects data is preserved from the embedded transformation

      let transformationItemData;
      if (transformationData.toObject) {
        // This is a temporary item, get its full data including effects
        transformationItemData = foundry.utils.deepClone(transformationData.toObject());

        // Ensure effects are included - if the temporary item has effects, preserve them
        if (transformationData.effects && transformationData.effects.size > 0) {
          transformationItemData.effects = [];
          for (const effect of transformationData.effects) {
            const effectData = effect.toObject();
            transformationItemData.effects.push(effectData);
          }
        }
      } else {
        // This is raw data, use as is
        transformationItemData = foundry.utils.deepClone(transformationData);
      }

      // Ensure the temporary item has a unique ID to avoid conflicts
      transformationItemData._id = foundry.utils.randomID();

      // Create temporary item WITHOUT parent to avoid automatic collection embedding
      const tempTransformationItem = new CONFIG.Item.documentClass(
        transformationItemData,
      );

      // Apply the transformation
      try {
        await targetActor.applyTransformation(tempTransformationItem);

        Logger.debug(
          "Applied embedded transformation to target actor",
          {
            targetActorName: targetActor.name,
            transformationName: tempTransformationItem.name,
          },
          "TRANSFORMATION_APPLICATION"
        );
        return {
          applied: true,
          reason: "success",
        };
      } catch (error) {
        return {
          applied: false,
          reason: "application_error",
          error: error.message,
        };
      }
    }

    /**
     * Prompt GM to choose which transformation to apply from multiple options
     * @private
     * @returns {Promise<Object|null>} Selected transformation data or null if cancelled
     */
    async _promptGMForTransformationChoice() {
      return new Promise((resolve) => {
        // Create dialog content
        const transformationOptions = this.system.embeddedTransformations
          .map(
            (transformation, index) =>
              `<option value="${index}">${transformation.name}</option>`,
          )
          .join("");

        const content = `
          <div class="transformation-selection">
            <p>${game.i18n.localize("EVENTIDE_RP_SYSTEM.Item.ActionCard.TransformationSelectionPrompt")}</p>
            <div class="form-group">
              <label>${game.i18n.localize("EVENTIDE_RP_SYSTEM.Item.ActionCard.TransformationSelectionLabel")}</label>
              <select id="transformation-choice" style="width: 100%;">
                ${transformationOptions}
              </select>
            </div>
          </div>
        `;

        new Dialog({
          title: game.i18n.localize("EVENTIDE_RP_SYSTEM.Item.ActionCard.TransformationSelectionTitle"),
          content,
          buttons: {
            apply: {
              icon: '<i class="fas fa-check"></i>',
              label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Item.ActionCard.TransformationSelectionApply"),
              callback: (html) => {
                const selectedIndex = parseInt(
                  html.find("#transformation-choice").val(),
                  10,
                );
                resolve(this.system.embeddedTransformations[selectedIndex]);
              },
            },
            cancel: {
              icon: '<i class="fas fa-times"></i>',
              label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Item.ActionCard.TransformationSelectionCancel"),
              callback: () => resolve(null),
            },
          },
          default: "apply",
          close: () => resolve(null),
        }).render(true);
      });
    }
  };
}
