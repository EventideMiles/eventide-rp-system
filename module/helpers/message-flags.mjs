import { Logger } from "../services/logger.mjs";

/**
 * Utility functions for managing message flags in the GM control system
 * @class
 */
export class MessageFlags {
  /**
   * Create a GM apply flag structure for action card effects
   * @param {Object} options - Options for creating the flag
   * @param {Object} [options.damage] - Damage application data
   * @param {string} options.damage.targetId - Target actor ID
   * @param {string} options.damage.targetName - Target actor name
   * @param {string} options.damage.formula - Damage formula
   * @param {string} options.damage.type - Damage type
   * @param {Object} [options.status] - Status effect application data
   * @param {string} options.status.targetId - Target actor ID
   * @param {string} options.status.targetName - Target actor name
   * @param {Array} options.status.effects - Array of effect data objects
   * @param {string} options.actionCardId - ID of the action card that created this
   * @param {string} options.actorId - ID of the actor who used the action card
   * @returns {Object} GM apply flag structure
   */
  static createGMApplyFlag({
    damage = null,
    status = null,
    actionCardId,
    actorId,
  }) {
    Logger.methodEntry("MessageFlags", "createGMApplyFlag", {
      hasDamage: !!damage,
      hasStatus: !!status,
      actionCardId,
      actorId,
    });

    const flag = {
      actionCardId,
      actorId,
      timestamp: Date.now(),
    };

    if (damage) {
      // Validate target exists
      const target = game.actors.get(damage.targetId);
      flag.damage = {
        targetId: damage.targetId,
        targetName: damage.targetName,
        formula: damage.formula,
        type: damage.type,
        targetValid: !!target,
        applied: false,
      };
    }

    if (status) {
      // Validate target exists
      const target = game.actors.get(status.targetId);
      flag.status = {
        targetId: status.targetId,
        targetName: status.targetName,
        effects: status.effects,
        targetValid: !!target,
        applied: false,
      };
    }

    Logger.methodExit("MessageFlags", "createGMApplyFlag", flag);
    return flag;
  }

  /**
   * Update a GM apply flag's application state
   * @param {ChatMessage} message - The chat message containing the flag
   * @param {string} type - The type of application ("damage" or "status")
   * @param {Object} updates - Updates to apply to the flag
   * @returns {Promise<ChatMessage>} The updated message
   */
  static async updateGMApplyFlag(message, type, updates) {
    Logger.methodEntry("MessageFlags", "updateGMApplyFlag", {
      messageId: message.id,
      type,
      updates,
    });

    try {
      const flags = foundry.utils.deepClone(message.flags || {});
      flags["eventide-rp-system"] = flags["eventide-rp-system"] || {};
      flags["eventide-rp-system"].gmApplySection =
        flags["eventide-rp-system"].gmApplySection || {};

      if (!flags["eventide-rp-system"].gmApplySection[type]) {
        Logger.warn(
          `No ${type} section found in GM apply flag`,
          { messageId: message.id, type },
          "MESSAGE_FLAGS",
        );
        return message;
      }

      // Apply updates
      flags["eventide-rp-system"].gmApplySection[type] = {
        ...flags["eventide-rp-system"].gmApplySection[type],
        ...updates,
      };

      const updatedMessage = await message.update({ flags });
      Logger.methodExit("MessageFlags", "updateGMApplyFlag", updatedMessage);
      return updatedMessage;
    } catch (error) {
      Logger.error("Failed to update GM apply flag", error, "MESSAGE_FLAGS");
      Logger.methodExit("MessageFlags", "updateGMApplyFlag", null);
      throw error;
    }
  }

  /**
   * Get GM apply flag data from a message
   * @param {ChatMessage} message - The chat message to extract flags from
   * @returns {Object|null} GM apply flag data or null if not found
   */
  static getGMApplyFlag(message) {
    try {
      const flag = message.flags?.["eventide-rp-system"]?.gmApplySection;

      // Validate flag structure
      if (flag && this._validateFlagStructure(flag)) {
        return flag;
      }

      return null;
    } catch (error) {
      Logger.warn("Failed to get GM apply flag", error, "MESSAGE_FLAGS");
      return null;
    }
  }

  /**
   * Validate the structure of a GM apply flag
   * @param {Object} flag - The flag to validate
   * @returns {boolean} True if flag structure is valid
   * @private
   */
  static _validateFlagStructure(flag) {
    if (!flag || typeof flag !== "object") return false;

    // Check required fields
    if (!flag.actionCardId || !flag.actorId || !flag.timestamp) return false;

    // Validate damage section if present
    if (flag.damage) {
      if (
        !flag.damage.targetId ||
        !flag.damage.targetName ||
        !flag.damage.formula
      ) {
        return false;
      }
    }

    // Validate status section if present
    if (flag.status) {
      if (
        !flag.status.targetId ||
        !flag.status.targetName ||
        !Array.isArray(flag.status.effects)
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a message has pending GM applications
   * @param {ChatMessage} message - The chat message to check
   * @returns {boolean} True if there are pending applications
   */
  static hasPendingApplications(message) {
    const flag = this.getGMApplyFlag(message);
    if (!flag) return false;

    const hasPendingDamage = flag.damage && !flag.damage.applied;
    const hasPendingStatus = flag.status && !flag.status.applied;

    return hasPendingDamage || hasPendingStatus;
  }

  /**
   * Validate that targets in GM apply flags still exist
   * @param {ChatMessage} message - The chat message to validate
   * @returns {Promise<boolean>} True if validation resulted in changes
   */
  static async validateTargets(message) {
    Logger.methodEntry("MessageFlags", "validateTargets", {
      messageId: message.id,
    });

    const flag = this.getGMApplyFlag(message);
    if (!flag) {
      Logger.methodExit("MessageFlags", "validateTargets", false);
      return false;
    }

    let needsUpdate = false;
    const updates = {};

    // Check damage target validity
    if (flag.damage && !flag.damage.applied) {
      const targetExists = !!game.actors.get(flag.damage.targetId);
      if (flag.damage.targetValid !== targetExists) {
        updates.damage = { ...flag.damage, targetValid: targetExists };
        needsUpdate = true;
      }
    }

    // Check status target validity
    if (flag.status && !flag.status.applied) {
      const targetExists = !!game.actors.get(flag.status.targetId);
      if (flag.status.targetValid !== targetExists) {
        updates.status = { ...flag.status, targetValid: targetExists };
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      const flags = foundry.utils.deepClone(message.flags || {});
      flags["eventide-rp-system"].gmApplySection = {
        ...flags["eventide-rp-system"].gmApplySection,
        ...updates,
      };
      await message.update({ flags });
    }

    Logger.methodExit("MessageFlags", "validateTargets", needsUpdate);
    return needsUpdate;
  }

  /**
   * Repair corrupted GM apply messages by removing invalid flags
   * @returns {Promise<number>} Number of messages repaired
   */
  static async repairCorruptedMessages() {
    Logger.methodEntry("MessageFlags", "repairCorruptedMessages");

    try {
      let repairedCount = 0;

      // Find messages with potentially corrupted GM apply flags
      const messages = game.messages.filter((message) => {
        const rawFlag = message.flags?.["eventide-rp-system"]?.gmApplySection;
        return rawFlag && !this._validateFlagStructure(rawFlag);
      });

      // Remove corrupted flags
      for (const message of messages) {
        try {
          const flags = foundry.utils.deepClone(message.flags || {});
          delete flags["eventide-rp-system"].gmApplySection;

          // If no other system flags, remove the entire system section
          if (Object.keys(flags["eventide-rp-system"]).length === 0) {
            delete flags["eventide-rp-system"];
          }

          await message.update({ flags });
          repairedCount++;

          Logger.info(
            `Repaired corrupted GM apply flag`,
            { messageId: message.id },
            "MESSAGE_FLAGS",
          );
        } catch (error) {
          Logger.warn(
            `Failed to repair message ${message.id}`,
            error,
            "MESSAGE_FLAGS",
          );
        }
      }

      if (repairedCount > 0) {
        ui.notifications.info(
          `Repaired ${repairedCount} corrupted GM apply message(s)`,
        );
      }

      Logger.info(
        `Repair completed`,
        { repairedCount, totalChecked: messages.length },
        "MESSAGE_FLAGS",
      );

      Logger.methodExit(
        "MessageFlags",
        "repairCorruptedMessages",
        repairedCount,
      );
      return repairedCount;
    } catch (error) {
      Logger.error(
        "Failed to repair corrupted messages",
        error,
        "MESSAGE_FLAGS",
      );
      Logger.methodExit("MessageFlags", "repairCorruptedMessages", 0);
      return 0;
    }
  }

  /**
   * Clean up old GM apply messages that have been fully resolved
   * @param {number} [maxAge=86400000] - Maximum age in milliseconds (default: 24 hours)
   * @returns {Promise<number>} Number of messages cleaned up
   */
  static async cleanupOldMessages(maxAge = 86400000) {
    Logger.methodEntry("MessageFlags", "cleanupOldMessages", { maxAge });

    try {
      const cutoffTime = Date.now() - maxAge;
      let cleanedCount = 0;

      // Find messages with GM apply flags
      const messages = game.messages.filter((message) => {
        const flag = this.getGMApplyFlag(message);
        return flag && flag.timestamp && flag.timestamp < cutoffTime;
      });

      // Delete fully resolved messages
      for (const message of messages) {
        const flag = this.getGMApplyFlag(message);
        const allResolved =
          (!flag.damage || flag.damage.applied) &&
          (!flag.status || flag.status.applied);

        if (allResolved) {
          await message.delete();
          cleanedCount++;
        }
      }

      Logger.info(
        `Cleaned up ${cleanedCount} old GM apply messages`,
        { cleanedCount, totalChecked: messages.length },
        "MESSAGE_FLAGS",
      );

      Logger.methodExit("MessageFlags", "cleanupOldMessages", cleanedCount);
      return cleanedCount;
    } catch (error) {
      Logger.error("Failed to cleanup old messages", error, "MESSAGE_FLAGS");
      Logger.methodExit("MessageFlags", "cleanupOldMessages", 0);
      return 0;
    }
  }
}
