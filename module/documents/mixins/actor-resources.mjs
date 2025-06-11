import { Logger } from "../../services/logger.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";
import {
  erpsRollHandler,
  erpsMessageHandler,
} from "../../services/_module.mjs";

/**
 * Actor Resource Management Mixin
 *
 * Provides resource management functionality for actors, including resolve and power
 * manipulation, damage handling, and restoration capabilities.
 *
 * @param {class} BaseClass - The base actor class to extend
 * @returns {class} Extended class with resource management functionality
 */
export const ActorResourceMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Add resolve points to the actor
     *
     * @param {number} value - The amount of resolve to add
     * @returns {Promise<Actor>} The updated actor
     */
    async addResolve(value) {
      Logger.methodEntry("ActorResourceMixin", "addResolve", { value });

      if (typeof value !== "number") {
        Logger.warn(
          "Invalid resolve value provided",
          { value, type: typeof value },
          "RESOURCES",
        );
        return this;
      }

      const newValue = this._clampValue(
        this.system.resolve.value + value,
        0,
        this.system.resolve.max,
      );

      const [result, error] = await ErrorHandler.handleDocumentOperation(
        this.update({ "system.resolve.value": newValue }),
        "update resolve",
        "actor",
      );

      if (!error) {
        Logger.debug(
          `Updated resolve: ${this.system.resolve.value} -> ${newValue}`,
          null,
          "RESOURCES",
        );
      }

      Logger.methodExit("ActorResourceMixin", "addResolve", result || this);
      return result || this;
    }

    /**
     * Add power points to the actor
     *
     * @param {number} value - The amount of power to add
     * @returns {Promise<Actor>} The updated actor
     */
    async addPower(value) {
      Logger.methodEntry("ActorResourceMixin", "addPower", { value });

      if (typeof value !== "number") {
        Logger.warn(
          "Invalid power value provided",
          { value, type: typeof value },
          "RESOURCES",
        );
        return this;
      }

      const newValue = this._clampValue(
        this.system.power.value + value,
        0,
        this.system.power.max,
      );

      const [result, error] = await ErrorHandler.handleDocumentOperation(
        this.update({ "system.power.value": newValue }),
        "update power",
        "actor",
      );

      if (!error) {
        Logger.debug(
          `Updated power: ${this.system.power.value} -> ${newValue}`,
          null,
          "RESOURCES",
        );
      }

      Logger.methodExit("ActorResourceMixin", "addPower", result || this);
      return result || this;
    }

    /**
     * Apply damage or healing to the actor's resolve
     *
     * @param {Object} options - The damage options
     * @param {string} [options.formula="1"] - The damage formula
     * @param {string} [options.label="Damage"] - Label for the damage roll
     * @param {string} [options.description=""] - Description of the damage
     * @param {string} [options.type="damage"] - "damage" or "heal"
     * @param {boolean} [options.critAllowed=false] - Whether crits are allowed
     * @param {boolean} [options.acCheck=false] - Whether to check against AC
     * @param {string|null} [options.soundKey=null] - Sound effect key
     * @returns {Promise<Roll>} The damage roll
     */
    async damageResolve({
      formula = "1",
      label = "Damage",
      description = "",
      type = "damage",
      critAllowed = false,
      acCheck = false,
      soundKey = null,
      img = null,
      bgColor = null,
      textColor = null,
    } = {}) {
      Logger.methodEntry("ActorResourceMixin", "damageResolve", {
        formula,
        label,
        type,
      });

      // Validate type parameter
      if (!["damage", "heal"].includes(type)) {
        const error = new Error(
          `Invalid damage type: ${type}. Must be "damage" or "heal".`,
        );
        Logger.error("Invalid damage type provided", error, "RESOURCES");
        throw error;
      }

      const rollData = {
        formula,
        label,
        type,
        critAllowed,
        description,
        acCheck,
        soundKey,
        img,
        bgColor,
        textColor,
      };

      try {
        // Use the imported roll handler
        const roll = await erpsRollHandler.handleRoll(rollData, this);

        // Only apply damage if user has permission
        if (this.isOwner) {
          const damageAmount = Math.abs(roll.total);

          // Apply damage to resolve
          if (type === "heal") {
            await this.addResolve(damageAmount);
            Logger.info(
              `Healed ${damageAmount} resolve for actor "${this.name}"`,
              null,
              "RESOURCES",
            );
          } else {
            await this.addResolve(-damageAmount);
            Logger.info(
              `Applied ${damageAmount} damage to actor "${this.name}"`,
              null,
              "RESOURCES",
            );
          }
        } else {
          Logger.warn(
            "User lacks permission to apply damage",
            null,
            "RESOURCES",
          );
        }

        Logger.methodExit("ActorResourceMixin", "damageResolve", roll);
        return roll;
      } catch (error) {
        Logger.error("Error in damage resolve operation", error, "RESOURCES");
        Logger.methodExit("ActorResourceMixin", "damageResolve", null);
        throw error;
      }
    }

    /**
     * Restore the actor's resources and remove status effects
     *
     * This function can restore the actor's resolve and power to their maximum values,
     * and can remove specific status effects or all status effects from the actor.
     * Only Game Masters can use this function.
     *
     * @param {Object} options - The restoration options
     * @param {boolean} [options.resolve=false] - Whether to restore resolve to maximum
     * @param {boolean} [options.power=false] - Whether to restore power to maximum
     * @param {Item[]} [options.statuses=[]] - Array of status items to be removed
     * @param {boolean} [options.all=false] - Whether to remove all status effects
     * @returns {Promise<ChatMessage|null>} Message detailing the restoration process, or null if not GM
     */
    async restore({
      resolve = false,
      power = false,
      statuses = [],
      all = false,
    } = {}) {
      Logger.methodEntry("ActorResourceMixin", "restore", {
        resolve,
        power,
        statusCount: statuses.length,
        all,
      });

      if (!game.user.isGM) {
        ui.notifications.warn(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.GMOnly"),
        );
        Logger.warn(
          "Non-GM user attempted to use restore function",
          null,
          "RESOURCES",
        );
        return null;
      }

      try {
        // Determine which status effects to remove
        const statusArray = this._determineStatusesToRemove(statuses, all);

        // Restore resources if requested
        const restorationPromises = [];

        if (resolve) {
          const maxResolve = this.system.resolve.max || 0;
          restorationPromises.push(this.addResolve(maxResolve));
          Logger.debug(
            `Restoring resolve to maximum: ${maxResolve}`,
            null,
            "RESOURCES",
          );
        }

        if (power) {
          const maxPower = this.system.power.max || 0;
          restorationPromises.push(this.addPower(maxPower));
          Logger.debug(
            `Restoring power to maximum: ${maxPower}`,
            null,
            "RESOURCES",
          );
        }

        await Promise.all(restorationPromises);

        // Remove status effects if any were specified
        if (statusArray && statusArray.length > 0) {
          await this._removeStatusEffects(statusArray);
        }

        // Create chat message about the restoration
        const chatMessage = await erpsMessageHandler.createRestoreMessage({
          all,
          resolve,
          power,
          statuses: statuses
            ? Array.from(statuses).filter((i) => i.type === "status")
            : [],
          actor: this,
        });

        Logger.info(
          `Restored actor "${this.name}" - resolve: ${resolve}, power: ${power}, statuses removed: ${statusArray.length}`,
          null,
          "RESOURCES",
        );
        Logger.methodExit("ActorResourceMixin", "restore", chatMessage);

        return chatMessage;
      } catch (error) {
        const [, _handledError] = await ErrorHandler.handleAsync(
          Promise.reject(error),
          {
            context: "Actor Restoration",
            errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          },
        );

        Logger.methodExit("ActorResourceMixin", "restore", null);
        return null;
      }
    }

    /**
     * Get the current resource percentages for the actor
     *
     * @returns {Object} Object containing resolve and power percentages
     */
    getResourcePercentages() {
      const resolvePercent =
        this.system.resolve.max > 0
          ? Math.round(
              (this.system.resolve.value / this.system.resolve.max) * 100,
            )
          : 0;

      const powerPercent =
        this.system.power.max > 0
          ? Math.round((this.system.power.value / this.system.power.max) * 100)
          : 0;

      return {
        resolve: resolvePercent,
        power: powerPercent,
      };
    }

    /**
     * Check if the actor is at low resources (below specified thresholds)
     *
     * @param {Object} [thresholds] - Resource thresholds
     * @param {number} [thresholds.resolve=25] - Resolve percentage threshold
     * @param {number} [thresholds.power=25] - Power percentage threshold
     * @returns {Object} Object indicating if resources are low
     */
    isLowResources({
      resolve: resolveThreshold = 25,
      power: powerThreshold = 25,
    } = {}) {
      const percentages = this.getResourcePercentages();

      return {
        resolve: percentages.resolve <= resolveThreshold,
        power: percentages.power <= powerThreshold,
        any:
          percentages.resolve <= resolveThreshold ||
          percentages.power <= powerThreshold,
      };
    }

    /**
     * Determine which status effects to remove based on input parameters
     *
     * @private
     * @param {Item[]} statuses - Array of specific status items
     * @param {boolean} all - Whether to remove all status effects
     * @returns {string[]} Array of status item IDs to remove
     */
    _determineStatusesToRemove(statuses, all) {
      if (all) {
        return Array.from(this.items)
          .filter((i) => i.type === "status")
          .map((i) => i.id);
      }

      if (statuses?.length) {
        return Array.from(statuses)
          .filter((i) => i.type === "status")
          .map((i) => i.id);
      }

      return [];
    }

    /**
     * Remove the specified status effects from the actor
     *
     * @private
     * @param {string[]} statusArray - Array of status item IDs to remove
     * @returns {Promise<void>}
     */
    async _removeStatusEffects(statusArray) {
      const statusIds = Array.from(this.items)
        .filter((i) => i.type === "status" && statusArray.includes(i.id))
        .map((i) => i.id);

      if (statusIds.length > 0) {
        Logger.debug(
          `Removing ${statusIds.length} status effects`,
          statusIds,
          "RESOURCES",
        );
        await this.deleteEmbeddedDocuments("Item", statusIds);
      }
    }

    /**
     * Utility method to clamp a value between min and max
     *
     * @private
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    _clampValue(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }
  };
