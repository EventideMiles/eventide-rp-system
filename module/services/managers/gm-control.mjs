import { Logger } from "../logger.mjs";
import { MessageFlags } from "../../helpers/message-flags.mjs";
import { StatusIntensification } from "../../helpers/status-intensification.mjs";

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
          const actionCard = sourceActor.items.get(actionCardId);
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
        const finalFormula = type !== "heal" &&
          target.system.hiddenAbilities.vuln.total > 0
          ? `${formula} + ${Math.abs(target.system.hiddenAbilities.vuln.total)}`
          : formula;

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

          // Apply or intensify the status effect on the target
          const applicationResult =
            await StatusIntensification.applyOrIntensifyStatus(
              target,
              statusData,
            );

          if (applicationResult.applied) {
            appliedCount++;
            Logger.debug(
              `${applicationResult.intensified ? "Intensified" : "Applied"} status effect: ${statusData.name}`,
              {
                targetName: target.name,
                statusName: statusData.name,
                statusType: statusData.type,
                intensified: applicationResult.intensified,
              },
              "GM_CONTROL",
            );
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
    Logger.methodEntry("GMControlManager", "discardDamage", {
      messageId: message.id,
    });

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

      Logger.info(
        `Discarded damage via GM control`,
        { messageId: message.id },
        "GM_CONTROL",
      );

      Logger.methodExit("GMControlManager", "discardDamage", true);
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
      Logger.methodExit("GMControlManager", "discardDamage", false);
      return false;
    }
  }

  /**
   * Discard status effects from a GM apply message
   * @param {ChatMessage} message - The message containing the GM apply flag
   * @returns {Promise<boolean>} True if discard was successful
   */
  async discardStatusEffects(message) {
    Logger.methodEntry("GMControlManager", "discardStatusEffects", {
      messageId: message.id,
    });

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

      Logger.info(
        `Discarded status effects via GM control`,
        { messageId: message.id },
        "GM_CONTROL",
      );

      Logger.methodExit("GMControlManager", "discardStatusEffects", true);
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
      Logger.methodExit("GMControlManager", "discardStatusEffects", false);
      return false;
    }
  }

  /**
   * Validate all pending GM apply messages
   * @returns {Promise<number>} Number of messages updated
   */
  async validateAllPendingMessages() {
    Logger.methodEntry("GMControlManager", "validateAllPendingMessages");

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

      Logger.methodExit(
        "GMControlManager",
        "validateAllPendingMessages",
        updatedCount,
      );
      return updatedCount;
    } catch (error) {
      Logger.error("Failed to validate pending messages", error, "GM_CONTROL");
      Logger.methodExit("GMControlManager", "validateAllPendingMessages", 0);
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
    Logger.methodEntry("GMControlManager", "_checkAutoCleanup", {
      messageId: message.id,
    });

    try {
      const flag = MessageFlags.getGMApplyFlag(message);
      if (!flag) {
        Logger.methodExit("GMControlManager", "_checkAutoCleanup", false);
        return false;
      }

      // Check if all effects have been resolved
      const damageResolved = !flag.damage || flag.damage.applied;
      const statusResolved = !flag.status || flag.status.applied;

      if (damageResolved && statusResolved) {
        // Delete immediately - no need for artificial delays
        try {
          await message.delete();
          Logger.info(
            "Auto-cleaned up resolved GM apply message",
            { messageId: message.id },
            "GM_CONTROL",
          );
          Logger.methodExit("GMControlManager", "_checkAutoCleanup", true);
          return true;
        } catch (error) {
          Logger.warn("Failed to auto-cleanup message", error, "GM_CONTROL");
        }
      }

      Logger.methodExit("GMControlManager", "_checkAutoCleanup", false);
      return false;
    } catch (error) {
      Logger.error("Failed to check auto-cleanup", error, "GM_CONTROL");
      Logger.methodExit("GMControlManager", "_checkAutoCleanup", false);
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
    Logger.methodEntry("GMControlManager", "applyAllEffects", {
      messageId: message.id,
    });

    try {
      const flag = MessageFlags.getGMApplyFlag(message);
      if (!flag) {
        ui.notifications.warn(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.NoGMApplyData"),
        );
        Logger.methodExit("GMControlManager", "applyAllEffects", false);
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

      Logger.methodExit("GMControlManager", "applyAllEffects", allSuccessful);
      return allSuccessful;
    } catch (error) {
      Logger.error("Failed to apply all effects", error, "GM_CONTROL");
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.ApplyEffectsFailed"),
      );
      Logger.methodExit("GMControlManager", "applyAllEffects", false);
      return false;
    }
  }

  /**
   * Discard all pending effects for a message at once
   * @param {ChatMessage} message - The message containing pending effects
   * @returns {Promise<boolean>} True if all discards were successful
   */
  async discardAllEffects(message) {
    Logger.methodEntry("GMControlManager", "discardAllEffects", {
      messageId: message.id,
    });

    try {
      const flag = MessageFlags.getGMApplyFlag(message);
      if (!flag) {
        ui.notifications.warn(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.NoGMApplyData"),
        );
        Logger.methodExit("GMControlManager", "discardAllEffects", false);
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

      Logger.methodExit("GMControlManager", "discardAllEffects", allSuccessful);
      return allSuccessful;
    } catch (error) {
      Logger.error("Failed to discard all effects", error, "GM_CONTROL");
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.DiscardEffectsFailed"),
      );
      Logger.methodExit("GMControlManager", "discardAllEffects", false);
      return false;
    }
  }

  /**
   * Bulk cleanup of all resolved GM apply messages
   * @param {number} [maxAge=3600000] - Maximum age in milliseconds (default: 1 hour)
   * @returns {Promise<number>} Number of messages cleaned up
   */
  async bulkCleanupResolvedMessages(maxAge = 3600000) {
    Logger.methodEntry("GMControlManager", "bulkCleanupResolvedMessages", {
      maxAge,
    });

    try {
      const cutoffTime = Date.now() - maxAge;
      let cleanedCount = 0;

      // Find all resolved GM apply messages
      const messages = game.messages.filter((message) => {
        const flag = MessageFlags.getGMApplyFlag(message);
        if (!flag || !flag.timestamp) return false;

        // Check if message is old enough and fully resolved
        const isOldEnough = flag.timestamp < cutoffTime;
        const isFullyResolved =
          (!flag.damage || flag.damage.applied) &&
          (!flag.status || flag.status.applied);

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

      Logger.info(
        `Bulk cleanup completed`,
        {
          cleanedCount,
          totalChecked: messages.length,
        },
        "GM_CONTROL",
      );

      Logger.methodExit(
        "GMControlManager",
        "bulkCleanupResolvedMessages",
        cleanedCount,
      );
      return cleanedCount;
    } catch (error) {
      Logger.error("Failed to bulk cleanup messages", error, "GM_CONTROL");
      Logger.methodExit("GMControlManager", "bulkCleanupResolvedMessages", 0);
      return 0;
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
    Logger.debug("Cleaning up GM Control Manager", {}, "GM_CONTROL");
  }
}

// Create and export singleton instance
export const gmControlManager = new GMControlManager();
