import { Logger } from "../../services/logger.mjs";
import { MessageFlags } from "../../helpers/_module.mjs";
import { ERPSRollUtilities } from "../../utils/_module.mjs";
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

      Logger.methodEntry("ItemActionCardExecutionMixin", "execute", {
        actorName: actor?.name,
        actionCardName: this.name,
        mode: this.system.mode,
      });

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
            Logger.info(
              "Advanced initiative to next turn after action card execution",
              { actionCardName: this.name },
              "ACTION_CARD",
            );
          }
        }

        Logger.methodExit("ItemActionCardExecutionMixin", "execute", result);
        return result;
      } catch (error) {
        Logger.error("Failed to execute action card", error, "ACTION_CARD");
        Logger.methodExit("ItemActionCardExecutionMixin", "execute", null);
        throw error;
      }
    }

    /**
     * Execute the action card with a pre-computed roll result
     * @param {Actor} actor - The actor executing the action card
     * @param {Roll} rollResult - The pre-computed roll result from the embedded item
     * @returns {Promise<Object>} Result of the execution
     */
    async executeWithRollResult(actor, rollResult) {
      // Only action cards can be executed
      if (this.type !== "actionCard") {
        throw new Error(
          "executeWithRollResult can only be called on action card items",
        );
      }

      Logger.methodEntry(
        "ItemActionCardExecutionMixin",
        "executeWithRollResult",
        {
          actorName: actor?.name,
          actionCardName: this.name,
          mode: this.system.mode,
          hasRollResult: !!rollResult,
          repetitions: this.system.repetitions,
        },
      );

      try {
        // Calculate number of repetitions
        const repetitionsRoll = new Roll(
          this.system.repetitions || "1",
          actor.getRollData(),
        );
        await repetitionsRoll.evaluate();
        const repetitionCount = Math.floor(repetitionsRoll.total);

        Logger.info(
          `Action card repetition roll result: ${repetitionCount}`,
          {
            actionCardName: this.name,
            repetitionsFormula: this.system.repetitions,
            repetitionCount,
          },
          "ACTION_CARD",
        );

        // Check if action fails due to insufficient repetitions
        if (repetitionCount <= 0) {
          Logger.info(
            `Action card execution failed - insufficient repetitions: ${repetitionCount}`,
            { actionCardName: this.name },
            "ACTION_CARD",
          );

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

          Logger.methodExit(
            "ItemActionCardExecutionMixin",
            "executeWithRollResult",
            failureResult,
          );
          return failureResult;
        }

        // Store current repetition context for cost control
        this._currentRepetitionContext = {
          inExecution: true,
          costOnRepetition: this.system.costOnRepetition,
        };

        // Execute repetitions
        const results = [];
        for (let i = 0; i < repetitionCount; i++) {
          Logger.info(
            `Executing repetition ${i + 1} of ${repetitionCount}`,
            {
              actionCardName: this.name,
            },
            "ACTION_CARD",
          );

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

              Logger.methodExit(
                "ItemActionCardExecutionMixin",
                "executeWithRollResult",
                partialResult,
              );
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
            Logger.info(
              "Advanced initiative to next turn after action card execution",
              { actionCardName: this.name },
              "ACTION_CARD",
            );
          }
        }

        // Clean up repetition context
        delete this._currentRepetitionContext;

        // Aggregate results
        const combinedResult = this.aggregateRepetitionResults(
          results,
          repetitionCount,
        );

        Logger.methodExit(
          "ItemActionCardExecutionMixin",
          "executeWithRollResult",
          combinedResult,
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
        Logger.methodExit(
          "ItemActionCardExecutionMixin",
          "executeWithRollResult",
          null,
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
        Logger.debug(
          `Waiting ${delay}ms for execution delay (${this.system.timingOverride ? "override" : "system default"})`,
          null,
          "ACTION_CARD",
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    /**
     * Execute the action card's attack chain
     * @param {Actor} actor - The actor executing the action card
     * @returns {Promise<Object>} Result of the attack chain execution
     */
    async executeAttackChain(actor) {
      Logger.methodEntry("ItemActionCardExecutionMixin", "executeAttackChain", {
        actorName: actor?.name,
        actionCardName: this.name,
      });

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
        Logger.info(
          `Executing embedded item roll: ${embeddedItem.name}`,
          { itemType: embeddedItem.type },
          "ACTION_CARD",
        );

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

        Logger.info(
          `Attack chain executed successfully`,
          {
            targetsHit: chainResult.targetResults.length,
          },
          "ACTION_CARD",
        );

        Logger.methodExit(
          "ItemActionCardExecutionMixin",
          "executeAttackChain",
          chainResult,
        );
        return chainResult;
      } catch (error) {
        Logger.error("Failed to execute attack chain", error, "ACTION_CARD");
        Logger.methodExit(
          "ItemActionCardExecutionMixin",
          "executeAttackChain",
          null,
        );
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
      Logger.methodEntry(
        "ItemActionCardExecutionMixin",
        "executeAttackChainWithRollResult",
        {
          actorName: actor?.name,
          actionCardName: this.name,
          rollTotal: rollResult?.total,
        },
      );

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
            Logger.debug(
              "Embedded item has 'none' roll type - treating as automatic two successes",
              { itemName: embeddedItem.name, targetName: target.actor.name },
              "ACTION_CARD",
            );
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

        const chainResult = {
          success: true,
          mode: "attackChain",
          baseRoll: rollResult,
          embeddedItemRollMessage: rollResult?.messageId || null,
          targetResults: results,
          damageResults,
          statusResults,
        };

        Logger.info(
          `Attack chain executed successfully`,
          {
            targetsHit: results.filter((r) => r.oneHit).length,
            damageApplications: damageResults.length,
            statusApplications: statusResults.length,
          },
          "ACTION_CARD",
        );

        Logger.methodExit(
          "ItemActionCardExecutionMixin",
          "executeAttackChainWithRollResult",
          chainResult,
        );
        return chainResult;
      } catch (error) {
        Logger.error(
          "Failed to execute attack chain with roll result",
          error,
          "ACTION_CARD",
        );
        Logger.methodExit(
          "ItemActionCardExecutionMixin",
          "executeAttackChainWithRollResult",
          null,
        );
        throw error;
      }
    }

    /**
     * Execute saved damage mode
     * @param {Actor} actor - The actor executing the action card
     * @returns {Promise<Object>} Result of the saved damage execution
     */
    async executeSavedDamage(actor) {
      Logger.methodEntry("ItemActionCardExecutionMixin", "executeSavedDamage", {
        actorName: actor?.name,
        actionCardName: this.name,
      });

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
        const currentTargets = await erps.utils.getTargetArray();
        const playerOwnsAllTargets =
          currentTargets.length === 0 ||
          currentTargets.every((target) => target.actor.isOwner);
        for (const target of targetArray) {
          try {
            if (game.user.isGM || playerOwnsAllTargets) {
              // GM applies damage directly
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
                  this.system.description ||
                  this.system.savedDamage.description,
                type: this.system.savedDamage.type,
                img: this._getEffectiveImage(),
                bgColor: this.system.bgColor,
                textColor: this.system.textColor,
              });

              damageResults.push({ target: target.actor, roll: damageRoll });
            } else {
              // Player creates GM apply card - vulnerability will be applied by GM
              const gmApplyResult = {
                target: target.actor,
                needsGMApplication: true,
                formula: this.system.savedDamage.formula,
                type: this.system.savedDamage.type,
              };
              damageResults.push(gmApplyResult);
            }
          } catch (damageError) {
            Logger.error(
              "Failed to apply saved damage",
              damageError,
              "ACTION_CARD",
            );
          }
        }

        const result = {
          success: true,
          mode: "savedDamage",
          damageResults,
        };

        Logger.info(
          `Saved damage executed successfully`,
          { targetsAffected: damageResults.length },
          "ACTION_CARD",
        );

        Logger.methodExit(
          "ItemActionCardExecutionMixin",
          "executeSavedDamage",
          result,
        );
        return result;
      } catch (error) {
        Logger.error("Failed to execute saved damage", error, "ACTION_CARD");
        Logger.methodExit(
          "ItemActionCardExecutionMixin",
          "executeSavedDamage",
          null,
        );
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
          this.system.attackChain.statusThreshold || 15,
        );

        const currentTargets = await erps.utils.getTargetArray();
        const playerOwnsAllTargets =
          currentTargets.length === 0 ||
          currentTargets.every((target) => target.actor.isOwner);

        if (shouldApplyDamage && this.system.attackChain.damageFormula) {
          if (game.user.isGM || playerOwnsAllTargets) {
            // GM applies damage directly
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
          } else {
            // Player creates GM apply card - vulnerability will be applied by GM
            const gmApplyResult = {
              target: result.target,
              needsGMApplication: true,
              formula: this.system.attackChain.damageFormula,
              type: this.system.attackChain.damageType,
            };
            damageResults.push(gmApplyResult);
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
      Logger.methodEntry(
        "ItemActionCardExecutionMixin",
        "_processStatusResults",
        {
          resultsCount: results.length,
          rollResult: rollResult?.total,
        },
      );

      const statusResults = [];

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

                  Logger.info(
                    `Reduced quantity of "${effectData.name}" in actor inventory`,
                    {
                      actorName: this.actor.name,
                      effectName: effectData.name,
                      previousQuantity: currentQuantity,
                      newQuantity,
                      costDeducted: requiredQuantity,
                    },
                    "ACTION_CARD",
                  );
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

              const currentTargets = await erps.utils.getTargetArray();
              const playerOwnsAllTargets =
                currentTargets.length === 0 ||
                currentTargets.every((target) => target.actor.isOwner);
              if (game.user.isGM || playerOwnsAllTargets) {
                // GM applies status effects directly
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

                    Logger.debug(
                      `Setting gear effect "${effectData.name}" to equipped state for transfer`,
                      {
                        targetName: result.target.name,
                        gearName: effectData.name,
                        equipped: true,
                      },
                      "ACTION_CARD",
                    );
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

                  Logger.info(
                    `${applicationResult.intensified ? "Intensified" : "Applied"} effect "${effectData.name}" to target "${result.target.name}"`,
                    {
                      statusCondition: this.system.attackChain.statusCondition,
                      statusThreshold: this.system.attackChain.statusThreshold,
                      rollTotal: rollResult?.total || 0,
                      equipped:
                        effectData.type === "gear"
                          ? effectData.system.equipped
                          : "N/A",
                      intensified: applicationResult.intensified,
                    },
                    "ACTION_CARD",
                  );
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
              } else {
                // Player creates GM apply card - also ensure gear is equipped in the data
                if (effectData.type === "gear") {
                  effectData.system = effectData.system || {};
                  effectData.system.equipped = true;

                  Logger.debug(
                    `Setting gear effect "${effectData.name}" to equipped state for GM application`,
                    {
                      targetName: result.target.name,
                      gearName: effectData.name,
                      equipped: true,
                    },
                    "ACTION_CARD",
                  );
                }

                const gmApplyResult = {
                  target: result.target,
                  effect: effectData,
                  needsGMApplication: true,
                };
                statusResults.push(gmApplyResult);
              }
            }
          }
        }

        Logger.methodExit(
          "ItemActionCardExecutionMixin",
          "_processStatusResults",
          statusResults,
        );
        return statusResults;
      } catch (error) {
        Logger.error("Failed to process status results", error, "ACTION_CARD");
        Logger.methodExit(
          "ItemActionCardExecutionMixin",
          "_processStatusResults",
          null,
        );
        throw error;
      }
    }

    /**
     * Create GM apply messages for attack chain results
     * @param {Object} chainResult - The attack chain result
     * @param {Actor} actor - The actor who executed the action card
     * @returns {Promise<ChatMessage[]>} Array of created messages
     */
    async createAttackChainMessage(chainResult, actor) {
      // Only action cards can create messages
      if (this.type !== "actionCard") {
        return [];
      }

      Logger.methodEntry(
        "ItemActionCardExecutionMixin",
        "createAttackChainMessage",
        {
          actorName: actor?.name,
          actionCardName: this.name,
        },
      );

      try {
        // Check if there are any results that need GM application
        const needsGMDamage = chainResult.damageResults?.some(
          (result) => result.needsGMApplication,
        );
        const needsGMStatus = chainResult.statusResults?.some(
          (result) => result.needsGMApplication,
        );

        if (!needsGMDamage && !needsGMStatus) {
          Logger.debug(
            "No GM application needed for attack chain",
            { actionCardName: this.name },
            "ACTION_CARD",
          );
          return [];
        }

        // Group results by target for cleaner messages
        const targetGroups = new Map();

        // Process damage results
        if (needsGMDamage) {
          chainResult.damageResults
            .filter((result) => result.needsGMApplication)
            .forEach((result) => {
              const targetId = result.target.id;
              if (!targetGroups.has(targetId)) {
                targetGroups.set(targetId, {
                  target: result.target,
                  damage: null,
                  status: null,
                });
              }
              targetGroups.get(targetId).damage = {
                targetId: result.target.id,
                targetName: result.target.name,
                formula: result.formula,
                type: result.type,
              };
            });
        }

        // Process status results
        if (needsGMStatus) {
          chainResult.statusResults
            .filter((result) => result.needsGMApplication)
            .forEach((result) => {
              const targetId = result.target.id;
              if (!targetGroups.has(targetId)) {
                targetGroups.set(targetId, {
                  target: result.target,
                  damage: null,
                  status: null,
                });
              }

              const targetGroup = targetGroups.get(targetId);
              if (!targetGroup.status) {
                targetGroup.status = {
                  targetId: result.target.id,
                  targetName: result.target.name,
                  effects: [],
                };
              }
              targetGroup.status.effects.push(result.effect);
            });
        }

        // Create messages
        const createdMessages = [];
        for (const [_targetId, group] of targetGroups) {
          const message = await this._createGMApplyMessage(
            group,
            actor,
            "attack chain",
          );
          if (message) {
            createdMessages.push(message);
          }
        }

        return createdMessages;
      } catch (error) {
        Logger.error(
          "Failed to create attack chain message",
          error,
          "ACTION_CARD",
        );
        return [];
      }
    }

    /**
     * Create GM apply messages for saved damage results
     * @param {Object} savedDamageResult - The saved damage result
     * @param {Actor} actor - The actor who executed the action card
     * @returns {Promise<ChatMessage[]>} Array of created messages
     */
    async createSavedDamageMessage(savedDamageResult, actor) {
      // Only action cards can create messages
      if (this.type !== "actionCard") {
        return [];
      }

      Logger.methodEntry(
        "ItemActionCardExecutionMixin",
        "createSavedDamageMessage",
        {
          actorName: actor?.name,
          actionCardName: this.name,
        },
      );

      try {
        // Check if there are any results that need GM application
        const needsGMDamage = savedDamageResult.damageResults?.some(
          (result) => result.needsGMApplication,
        );

        if (!needsGMDamage) {
          Logger.debug(
            "No GM application needed for saved damage",
            { actionCardName: this.name },
            "ACTION_CARD",
          );
          return [];
        }

        // Create a message for each target that needs GM application
        const createdMessages = [];
        const damageTargets = savedDamageResult.damageResults.filter(
          (result) => result.needsGMApplication,
        );

        for (const result of damageTargets) {
          const group = {
            target: result.target,
            damage: {
              targetId: result.target.id,
              targetName: result.target.name,
              formula: result.formula,
              type: result.type,
            },
            status: null,
          };

          const message = await this._createGMApplyMessage(
            group,
            actor,
            "saved damage",
          );
          if (message) {
            createdMessages.push(message);
          }
        }

        return createdMessages;
      } catch (error) {
        Logger.error(
          "Failed to create saved damage message",
          error,
          "ACTION_CARD",
        );
        return [];
      }
    }

    /**
     * Create a single GM apply message
     * @private
     * @param {Object} group - The target group with damage and status data
     * @param {Actor} actor - The actor who executed the action card
     * @param {string} context - Context string for the message
     * @returns {Promise<ChatMessage|null>} The created message or null
     */
    async _createGMApplyMessage(group, actor, context) {
      try {
        // Create GM apply flag
        const gmApplyFlag = MessageFlags.createGMApplyFlag({
          damage: group.damage,
          status: group.status,
          actionCardId: this.id,
          actorId: actor.id,
        });

        // Prepare message data
        const messageData = {
          content: await renderTemplate(
            "systems/eventide-rp-system/templates/chat/roll-message.hbs",
            {
              item: this,
              actor,
              label: `${this.name} - GM Apply Required`,
              description: `${actor.name} used ${this.name} (${context}). GM approval required for effects on ${group.target.name}.`,
              gmApplySection: gmApplyFlag,
              messageId: null, // Will be set after message creation
              bgColor: this.system.bgColor,
              textColor: this.system.textColor,
            },
          ),
          speaker: ERPSRollUtilities.getSpeaker(
            actor,
            "EVENTIDE_RP_SYSTEM.MessageHeaders.ActionCard",
          ),
          flags: {
            "eventide-rp-system": {
              gmApplySection: gmApplyFlag,
            },
          },
          whisper: game.users.filter((u) => u.isGM).map((u) => u.id),
        };

        // Create the message
        const message = await ChatMessage.create(messageData);

        // Update the message with its own ID for template reference
        if (message) {
          await message.update({
            content: await renderTemplate(
              "systems/eventide-rp-system/templates/chat/roll-message.hbs",
              {
                item: this,
                actor,
                label: `${this.name} - GM Apply Required`,
                description: `${actor.name} used ${this.name} (${context}). GM approval required for effects on ${group.target.name}.`,
                gmApplySection: gmApplyFlag,
                messageId: message.id,
                bgColor: this.system.bgColor,
                textColor: this.system.textColor,
              },
            ),
          });
        }

        return message;
      } catch (error) {
        Logger.error("Failed to create GM apply message", error, "ACTION_CARD");
        return null;
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
        Logger.info(
          "Sent action card resource failure message to chat",
          {
            actionCardName: this.name,
            repetitionIndex,
            reason: resourceCheck.reason,
          },
          "ACTION_CARD",
        );
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
        Logger.info(
          "Sent action card failure message to chat",
          { actionCardName: this.name, repetitionCount },
          "ACTION_CARD",
        );
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
                Logger.debug(
                  "Captured fresh roll result for repeatToHit",
                  { rollTotal: roll.total, itemName: embeddedItem.name },
                  "ACTION_CARD",
                );
                // Add messageId to the roll object
                roll.messageId = message.id;
                resolved = true;
                Hooks.off("createChatMessage", hookId);
                resolve(roll);
              } else {
                // Non-roll message from our actor - still counts as completion
                Logger.debug(
                  "Captured non-roll message from embedded item repetition",
                  { messageId: message.id, itemName: embeddedItem.name },
                  "ACTION_CARD",
                );
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

        Logger.debug(
          "Completed embedded item execution for repeatToHit repetition",
          { itemName: embeddedItem.name, hasRoll: !!rollResult },
          "ACTION_CARD",
        );

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
        Logger.debug(
          `Applying ${delay}ms delay between repetitions`,
          {
            actionCardName: this.name,
          },
          "ACTION_CARD",
        );
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
  };
}
