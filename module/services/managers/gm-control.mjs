import { Logger } from "../logger.mjs";
import { MessageFlags } from "../../helpers/message-flags.mjs";
import { StatusIntensification } from "../../helpers/status-intensification.mjs";
import { DamageProcessor } from "../damage-processor.mjs";

/**
 * Manager for GM control of action card effects
 * Handles the application and denial of damage and status effects from player action cards
 * @class
 */
class GMControlManager {
  constructor() {
    this.pendingApplications = new Map();
  }

  /**
   * Apply damage from a GM apply message
   * @param {ChatMessage} message - The message containing the GM apply flag
   * @param {string} targetId - ID of the target actor
   * @param {string} formula - Damage formula
   * @param {string} type - Damage type
   * @param {Object} [options={}] - Additional options
   * @returns {Promise<boolean>} True if application was successful
   */
  async applyDamage(message, targetId, formula, type, _options = {}) {
    Logger.methodEntry("GMControlManager", "applyDamage", {
      messageId: message.id,
      targetId,
      formula,
      type,
    });

    try {
      // Find the target actor
      const target = game.actors.get(targetId);
      if (!target) {
        ui.notifications.warn(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.TargetActorMissing"),
        );
        await MessageFlags.updateGMApplyFlag(message, "damage", {
          applied: false,
          targetValid: false,
        });
        Logger.methodExit("GMControlManager", "applyDamage", false);
        return false;
      }

      // Get action card info from the flag
      const flag = MessageFlags.getGMApplyFlag(message);
      const actionCardId = flag?.actionCardId;
      const actorId = flag?.actorId;

      // Get the action card for proper labeling
      let actionCardName = "Action Card";
      let actionCardDescription = "Damage from action card attack chain";
      let actionCardImg = null;
      let bgColor = null;
      let textColor = null;

      if (actionCardId && actorId) {
        const sourceActor = game.actors.get(actorId);
        if (sourceActor) {
          // First try to get action card from actor's items
          let actionCard = sourceActor.items.get(actionCardId);

          // If not found, check if we have stored action card data in the flag
          if (!actionCard && flag?.actionCardData) {
            // Create temporary action card from stored data (for transformation support)
            actionCard = new CONFIG.Item.documentClass(flag.actionCardData, {
              parent: sourceActor,
            });
          }

          if (actionCard) {
            actionCardName = actionCard.name;
            actionCardDescription =
              actionCard.system.description || actionCardDescription;
            actionCardImg =
              actionCard.system._getEffectiveImage?.() || actionCard.img;
            bgColor = actionCard.system.bgColor;
            textColor = actionCard.system.textColor;
          }
        }
      }

      // Apply the damage with enhanced error handling
      let damageRoll;
      try {
        // Apply vulnerability modifier to damage formula
        const finalFormula = DamageProcessor.applyVulnerabilityModifier(
          formula,
          type,
          target,
        );

        damageRoll = await target.damageResolve({
          formula: finalFormula,
          label: actionCardName,
          description: actionCardDescription,
          type,
          img: actionCardImg,
          bgColor,
          textColor,
        });
      } catch (damageError) {
        Logger.error("Failed to resolve damage", damageError, "GM_CONTROL");
        ui.notifications.error(
          `Failed to apply damage: ${damageError.message}`,
        );

        // Mark as failed but applied to prevent retry loops
        await MessageFlags.updateGMApplyFlag(message, "damage", {
          applied: true,
          failed: true,
          error: damageError.message,
        });

        Logger.methodExit("GMControlManager", "applyDamage", false);
        return false;
      }

      // Mark as applied in the message
      await MessageFlags.updateGMApplyFlag(message, "damage", {
        applied: true,
        targetValid: true,
      });

      // Wait for execution delay before allowing status effects
      const delay =
        game.settings.get("eventide-rp-system", "actionCardExecutionDelay") ||
        2000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Check if message should be cleaned up immediately
      await this._checkAutoCleanup(message);

      ui.notifications.info(
        `Applied ${damageRoll.total} ${type} damage to ${target.name}`,
      );

      Logger.info(
        `Successfully applied damage via GM control`,
        {
          targetName: target.name,
          damage: damageRoll.total,
          type,
          actionCardName,
        },
        "GM_CONTROL",
      );

      Logger.methodExit("GMControlManager", "applyDamage", true);
      return true;
    } catch (error) {
      Logger.error(
        "Failed to apply damage via GM control",
        error,
        "GM_CONTROL",
      );
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.ApplyDamageFailed"),
      );
      Logger.methodExit("GMControlManager", "applyDamage", false);
      return false;
    }
  }

  /**
   * Apply status effects from a GM apply message
   * @param {ChatMessage} message - The message containing the GM apply flag
   * @param {string} targetId - ID of the target actor
   * @returns {Promise<boolean>} True if application was successful
   */
  async applyStatusEffects(message, targetId) {
    Logger.methodEntry("GMControlManager", "applyStatusEffects", {
      messageId: message.id,
      targetId,
    });

    try {
      // Find the target actor
      const target = game.actors.get(targetId);
      if (!target) {
        ui.notifications.warn(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.TargetActorMissing"),
        );
        await MessageFlags.updateGMApplyFlag(message, "status", {
          applied: false,
          targetValid: false,
        });
        Logger.methodExit("GMControlManager", "applyStatusEffects", false);
        return false;
      }

      // Get status effects from message flags
      const flag = MessageFlags.getGMApplyFlag(message);
      if (!flag?.status?.effects) {
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.NoStatusEffectsInMessage",
          ),
        );
        Logger.methodExit("GMControlManager", "applyStatusEffects", false);
        return false;
      }

      // Apply each status effect
      let appliedCount = 0;
      const effects = flag.status.effects;

      for (const statusData of effects) {
        try {
          // Set flag for effects to trigger appropriate message via createItem hook
          if (statusData.type === "gear" || statusData.type === "status") {
            statusData.flags = statusData.flags || {};
            statusData.flags["eventide-rp-system"] =
              statusData.flags["eventide-rp-system"] || {};
            statusData.flags["eventide-rp-system"].isEffect = true;
          }

          // Prepare gear effects with equipped and quantity
          if (statusData.type === "gear") {
            statusData.system = statusData.system || {};
            statusData.system.equipped = true;
            statusData.system.quantity = 1;
          }

          // Apply or intensify the status effect on the target
          const applicationResult =
            await StatusIntensification.applyOrIntensifyStatus(
              target,
              statusData,
            );

          if (applicationResult.applied) {
            appliedCount++;
          }
        } catch (statusError) {
          Logger.warn(
            `Failed to apply status effect: ${statusData.name}`,
            statusError,
            "GM_CONTROL",
          );
        }
      }

      // Mark as applied in the message
      await MessageFlags.updateGMApplyFlag(message, "status", {
        applied: true,
        targetValid: true,
        appliedCount,
      });

      // Wait for execution delay before cleanup
      const delay =
        game.settings.get("eventide-rp-system", "actionCardExecutionDelay") ||
        2000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Check if message should be cleaned up immediately
      await this._checkAutoCleanup(message);

      if (appliedCount > 0) {
        ui.notifications.info(
          `Applied ${appliedCount} status effect(s) to ${target.name}`,
        );
      } else {
        ui.notifications.warn(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.NoStatusApplied"),
        );
      }

      Logger.info(
        `Applied status effects via GM control`,
        {
          targetName: target.name,
          totalEffects: effects.length,
          appliedCount,
        },
        "GM_CONTROL",
      );

      Logger.methodExit("GMControlManager", "applyStatusEffects", true);
      return true;
    } catch (error) {
      Logger.error(
        "Failed to apply status effects via GM control",
        error,
        "GM_CONTROL",
      );
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.ApplyStatusFailed"),
      );
      Logger.methodExit("GMControlManager", "applyStatusEffects", false);
      return false;
    }
  }

  /**
   * Discard damage from a GM apply message
   * @param {ChatMessage} message - The message containing the GM apply flag
   * @returns {Promise<boolean>} True if discard was successful
   */
  async discardDamage(message) {
    try {
      // Mark damage as applied (discarded) in the message
      await MessageFlags.updateGMApplyFlag(message, "damage", {
        applied: true,
        discarded: true,
      });

      // Check if message should be cleaned up immediately
      await this._checkAutoCleanup(message);

      ui.notifications.info(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Info.DamageDiscarded"),
      );

      return true;
    } catch (error) {
      Logger.error(
        "Failed to discard damage via GM control",
        error,
        "GM_CONTROL",
      );
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.DiscardDamageFailed"),
      );
      return false;
    }
  }

  /**
   * Discard status effects from a GM apply message
   * @param {ChatMessage} message - The message containing the GM apply flag
   * @returns {Promise<boolean>} True if discard was successful
   */
  async discardStatusEffects(message) {
    try {
      // Mark status as applied (discarded) in the message
      await MessageFlags.updateGMApplyFlag(message, "status", {
        applied: true,
        discarded: true,
      });

      // Check if message should be cleaned up immediately
      await this._checkAutoCleanup(message);

      ui.notifications.info(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Info.StatusEffectsDiscarded"),
      );

      return true;
    } catch (error) {
      Logger.error(
        "Failed to discard status effects via GM control",
        error,
        "GM_CONTROL",
      );
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.DiscardStatusFailed"),
      );
      return false;
    }
  }

  /**
   * Validate all pending GM apply messages
   * @returns {Promise<number>} Number of messages updated
   */
  async validateAllPendingMessages() {
    try {
      const messages = game.messages.filter((message) => {
        return MessageFlags.hasPendingApplications(message);
      });

      let updatedCount = 0;

      // Validate each message
      for (const message of messages) {
        try {
          const wasUpdated = await MessageFlags.validateTargets(message);
          if (wasUpdated) {
            updatedCount++;
          }
        } catch (error) {
          Logger.warn(
            `Failed to validate message ${message.id}`,
            error,
            "GM_CONTROL",
          );
        }
      }

      Logger.info(
        `Validated ${messages.length} pending GM apply messages, updated ${updatedCount}`,
        { totalMessages: messages.length, updatedCount },
        "GM_CONTROL",
      );

      return updatedCount;
    } catch (error) {
      Logger.error("Failed to validate pending messages", error, "GM_CONTROL");
      return 0;
    }
  }

  /**
   * Check if a message should be auto-cleaned up after resolution
   * @param {ChatMessage} message - The message to check
   * @returns {Promise<boolean>} True if message was deleted
   * @private
   */
  async _checkAutoCleanup(message) {
    try {
      const flag = MessageFlags.getGMApplyFlag(message);
      if (!flag) {
        return false;
      }

      // Check if all effects have been resolved
      const damageResolved = !flag.damage || flag.damage.applied;
      const statusResolved = !flag.status || flag.status.applied;

      if (damageResolved && statusResolved) {
        // Delete immediately - no need for artificial delays
        try {
          await message.delete();
          return true;
        } catch (error) {
          Logger.warn("Failed to auto-cleanup message", error, "GM_CONTROL");
        }
      }

      return false;
    } catch (error) {
      Logger.error("Failed to check auto-cleanup", error, "GM_CONTROL");
      return false;
    }
  }

  /**
   * Check if a user has permission to apply GM controls
   * @param {User} user - The user to check
   * @returns {boolean} True if user has GM permissions
   */
  hasGMPermission(user = game.user) {
    return user.isGM;
  }

  /**
   * Apply all pending effects for a message at once
   * @param {ChatMessage} message - The message containing pending effects
   * @returns {Promise<boolean>} True if all applications were successful
   */
  async applyAllEffects(message) {
    try {
      const flag = MessageFlags.getGMApplyFlag(message);
      if (!flag) {
        ui.notifications.warn(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.NoGMApplyData"),
        );
        return false;
      }

      let allSuccessful = true;
      const results = [];

      // Apply damage if pending
      if (flag.damage && !flag.damage.applied) {
        const damageResult = await this.applyDamage(
          message,
          flag.damage.targetId,
          flag.damage.formula,
          flag.damage.type,
        );
        results.push({ type: "damage", success: damageResult });
        if (!damageResult) allSuccessful = false;
      }

      // Apply status effects if pending
      if (flag.status && !flag.status.applied) {
        const statusResult = await this.applyStatusEffects(
          message,
          flag.status.targetId,
        );
        results.push({ type: "status", success: statusResult });
        if (!statusResult) allSuccessful = false;
      }

      if (allSuccessful) {
        ui.notifications.info(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Info.AllEffectsApplied"),
        );
      } else {
        ui.notifications.warn(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.SomeEffectsFailed"),
        );
      }

      Logger.info(
        `Applied all effects for message`,
        {
          messageId: message.id,
          allSuccessful,
          results,
        },
        "GM_CONTROL",
      );

      return allSuccessful;
    } catch (error) {
      Logger.error("Failed to apply all effects", error, "GM_CONTROL");
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.ApplyEffectsFailed"),
      );
      return false;
    }
  }

  /**
   * Discard all pending effects for a message at once
   * @param {ChatMessage} message - The message containing pending effects
   * @returns {Promise<boolean>} True if all discards were successful
   */
  async discardAllEffects(message) {
    try {
      const flag = MessageFlags.getGMApplyFlag(message);
      if (!flag) {
        ui.notifications.warn(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.NoGMApplyData"),
        );
        return false;
      }

      let allSuccessful = true;
      const results = [];

      // Discard damage if pending
      if (flag.damage && !flag.damage.applied) {
        const damageResult = await this.discardDamage(message);
        results.push({ type: "damage", success: damageResult });
        if (!damageResult) allSuccessful = false;
      }

      // Discard status effects if pending
      if (flag.status && !flag.status.applied) {
        const statusResult = await this.discardStatusEffects(message);
        results.push({ type: "status", success: statusResult });
        if (!statusResult) allSuccessful = false;
      }

      if (allSuccessful) {
        ui.notifications.info(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Info.AllEffectsDiscarded"),
        );
      } else {
        ui.notifications.warn(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.SomeDiscardFailed"),
        );
      }

      Logger.info(
        `Discarded all effects for message`,
        {
          messageId: message.id,
          allSuccessful,
          results,
        },
        "GM_CONTROL",
      );

      return allSuccessful;
    } catch (error) {
      Logger.error("Failed to discard all effects", error, "GM_CONTROL");
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.DiscardEffectsFailed"),
      );
      return false;
    }
  }

  /**
   * Bulk cleanup of all resolved GM apply messages
   * @param {number} [maxAge=3600000] - Maximum age in milliseconds (default: 1 hour)
   * @returns {Promise<number>} Number of messages cleaned up
   */
  async bulkCleanupResolvedMessages(maxAge = 3600000) {
    try {
      const cutoffTime = Date.now() - maxAge;
      let cleanedCount = 0;

      // Find all resolved player action approval messages (backup cleanup)
      // Note: These should normally be auto-deleted immediately when processed,
      // but this serves as a backup cleanup for any that might have failed to delete
      const messages = game.messages.filter((message) => {
        const flag = MessageFlags.getPlayerActionApprovalFlag(message);
        if (!flag || !flag.timestamp) return false;

        // Check if message is old enough and fully resolved
        const isOldEnough = flag.timestamp < cutoffTime;
        const isFullyResolved = flag.processed;

        return isOldEnough && isFullyResolved;
      });

      // Delete resolved messages
      for (const message of messages) {
        try {
          await message.delete();
          cleanedCount++;
        } catch (error) {
          Logger.warn(
            `Failed to delete message ${message.id}`,
            error,
            "GM_CONTROL",
          );
        }
      }

      if (cleanedCount > 0) {
        ui.notifications.info(
          `Cleaned up ${cleanedCount} resolved GM apply message(s)`,
        );
      }

      return cleanedCount;
    } catch (error) {
      Logger.error("Failed to bulk cleanup messages", error, "GM_CONTROL");
      return 0;
    }
  }

  /**
   * Process a player action approval request (approve or deny)
   * @param {ChatMessage} message - The message containing the player action approval flag
   * @param {boolean} approved - Whether the action was approved
   * @returns {Promise<boolean>} True if processing was successful
   */
  async approvePlayerAction(message, approved) {
    Logger.methodEntry("GMControlManager", "approvePlayerAction", {
      messageId: message.id,
      approved,
      gmName: game.user.name,
    });

    try {
      // Get player action approval flag
      const flag = MessageFlags.getPlayerActionApprovalFlag(message);
      if (!flag) {
        ui.notifications.warn(game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.NoPlayerActionApproval"));
        Logger.methodExit("GMControlManager", "approvePlayerAction", false);
        return false;
      }

      // Check if already processed
      if (flag.processed) {
        ui.notifications.warn(game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.ActionAlreadyProcessed"));
        Logger.methodExit("GMControlManager", "approvePlayerAction", false);
        return false;
      }

      // Update the message flag to mark as processed
      await MessageFlags.updatePlayerActionApprovalFlag(
        message,
        approved,
        game.user.name,
      );

      // Delete the approval message immediately since it's no longer actionable
      try {
        await message.delete();
        Logger.info(
          "Auto-deleted processed player action approval message",
          { 
            messageId: message.id, 
            approved, 
            processedBy: game.user.name 
          },
          "GM_CONTROL"
        );
      } catch (deleteError) {
        Logger.warn(
          "Failed to auto-delete approval message", 
          { 
            error: deleteError.message,
            messageId: message.id 
          }, 
          "GM_CONTROL"
        );
        // Don't fail the entire operation if deletion fails
      }

      // Notify the player of the result
      const { notifyPlayerActionResult } = await import(
        "./system-messages.mjs"
      );
      await notifyPlayerActionResult(
        flag.playerId,
        flag.playerName,
        flag.actionCardId,
        approved,
        game.user.name,
      );

      if (approved) {
        // Execute the action as if the GM initiated it
        try {
          // Get the actor
          const actor = game.actors.get(flag.actorId);
          if (!actor) {
            ui.notifications.error(game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.UnableToFindActor"));
            Logger.methodExit("GMControlManager", "approvePlayerAction", false);
            return false;
          }

          // Get the action card - first try from actor's items, then use stored data
          let actionCard = actor.items.get(flag.actionCardId);

          if (!actionCard && flag.actionCardData) {
            // Action card not found in actor items (likely from transformation)
            // Create a temporary action card from the stored data
            actionCard = new CONFIG.Item.documentClass(flag.actionCardData, {
              parent: actor,
            });
            Logger.debug("Using stored action card data for transformation-sourced action", {
              actionCardId: flag.actionCardId,
              actionCardName: actionCard.name,
            });
          }

          if (!actionCard) {
            ui.notifications.error(
              "Unable to find action card for execution",
            );
            Logger.methodExit("GMControlManager", "approvePlayerAction", false);
            return false;
          }

          // Set targets based on the stored target IDs
          const targetTokens = [];
          for (const targetId of flag.targetIds) {
            const targetActor = game.actors.get(targetId);
            if (targetActor) {
              // Find tokens for this actor on the current scene
              const tokens =
                canvas.tokens?.placeables?.filter(
                  (t) => t.actor?.id === targetId,
                ) || [];
              if (tokens.length > 0) {
                targetTokens.push(tokens[0]); // Use the first token found
              }
            }
          }

          // Set targets for the execution using Foundry v13 API
          let targetsSet = false;
          if (targetTokens.length > 0) {
            try {
              // Use the correct Foundry v13 targeting API
              canvas.tokens.setTargets(targetTokens.map((t) => t.id));
              targetsSet = true;
            } catch {
              // Don't fail the entire operation - action cards can work without canvas targeting
              // if the target information is passed directly to the execution
            }
          }

          // Execute the action card with the stored roll result and locked targets
          const result = await actionCard.executeWithRollResult(
            actor,
            flag.rollResult,
            { lockedTargets: flag.lockedTargets },
          );

          if (result.success) {
            ui.notifications.info(
              `Action "${actionCard.name}" executed successfully for ${flag.playerName}`,
            );
          } else {
            ui.notifications.warn(`Action execution failed: ${result.reason}`);
          }

          // Clear targets if they were set
          if (targetsSet) {
            try {
              canvas.tokens.setTargets([]);
            } catch {
              // Non-critical error - don't fail the operation
            }
          }
        } catch (execError) {
          Logger.error("Failed to execute approved player action", execError);
          ui.notifications.error(game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.FailedToExecuteAction"));
          Logger.methodExit("GMControlManager", "approvePlayerAction", false);
          return false;
        }
      } else {
        // Action was denied
        ui.notifications.info(
          `Action request from ${flag.playerName} has been denied`,
        );
      }

      Logger.methodExit("GMControlManager", "approvePlayerAction", true);
      return true;
    } catch (error) {
      Logger.error("Failed to process player action approval", error);
      ui.notifications.error(game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.FailedToProcessApproval"));
      Logger.methodExit("GMControlManager", "approvePlayerAction", false);
      return false;
    }
  }

  /**
   * Get statistics about pending GM applications
   * @returns {Object} Statistics object
   */
  getPendingStats() {
    const messages = game.messages.filter((message) => {
      return MessageFlags.hasPendingApplications(message);
    });

    let pendingDamage = 0;
    let pendingStatus = 0;

    messages.forEach((message) => {
      const flag = MessageFlags.getGMApplyFlag(message);
      if (flag.damage && !flag.damage.applied) pendingDamage++;
      if (flag.status && !flag.status.applied) pendingStatus++;
    });

    return {
      totalMessages: messages.length,
      pendingDamage,
      pendingStatus,
    };
  }

  /**
   * Clean up all tracked timeouts (for system cleanup)
   */
  cleanup() {
    // Cleanup method for system cleanup
  }
}

// Create and export singleton instance
export const gmControlManager = new GMControlManager();
