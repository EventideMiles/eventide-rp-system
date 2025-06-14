import { Logger } from "../services/logger.mjs";

/**
 * Utility functions for handling status effect intensification
 * @class
 */
export class StatusIntensification {
  /**
   * Check if a target already has a status effect with the same name and description
   * @param {Actor} target - The target actor
   * @param {Object} effectData - The effect data to check against
   * @returns {Item|null} The existing status item if found, null otherwise
   */
  static findExistingStatus(target, effectData) {
    if (effectData.type !== "status") {
      return null;
    }

    return target.items.find(
      (item) =>
        item.type === "status" &&
        item.name === effectData.name &&
        item.system.description === effectData.system.description,
    );
  }

  /**
   * Intensify an existing status effect using the same logic as the change-target-status macro
   * @param {Item} existingStatus - The existing status item to intensify
   * @param {Object} newEffectData - The new effect data containing the values to intensify with
   * @returns {Promise<boolean>} True if intensification was successful
   */
  static async intensifyStatus(existingStatus, newEffectData) {
    Logger.methodEntry("StatusIntensification", "intensifyStatus", {
      statusName: existingStatus.name,
      targetName: existingStatus.actor.name,
    });

    try {
      // Get the active effects from both the existing status and the new effect data
      const existingEffects = existingStatus.effects.contents[0]?.changes;

      if (!existingEffects) {
        Logger.warn(
          "No active effects found for intensification",
          {
            hasExistingEffects: !!existingEffects,
          },
          "STATUS_INTENSIFICATION",
        );
        return false;
      }

      const updateData = [];

      // Process each existing effect and intensify its values
      for (const existingEffect of existingEffects) {
        // Apply intensify logic: +1 to positive values, -1 to negative values, leave 0 unchanged
        const existingValue = Number(existingEffect.value) || 0;

        let intensifiedValue = existingValue;

        if (existingValue > 0) {
          // Positive value: add 1
          intensifiedValue = existingValue + 1;
        } else if (existingValue < 0) {
          // Negative value: subtract 1 (making it more negative)
          intensifiedValue = existingValue - 1;
        }
        // If existingValue is 0, leave it unchanged (intensifiedValue remains 0)

        updateData.push({
          ...existingEffect,
          value: intensifiedValue,
        });

        Logger.debug(
          `Intensifying effect: ${existingEffect.key}`,
          {
            existingValue,
            intensifiedValue,
            change: intensifiedValue - existingValue,
          },
          "STATUS_INTENSIFICATION",
        );
      }

      // Update the existing status with intensified values
      await existingStatus.updateEmbeddedDocuments("ActiveEffect", [
        { _id: existingStatus.effects.contents[0]._id, changes: updateData },
      ]);

      // Trigger the erpsUpdateItem hook for consistency with manual status updates
      Hooks.call("erpsUpdateItem", existingStatus, {}, {}, game.user.id);

      Logger.info(
        `Successfully intensified status "${existingStatus.name}" on target "${existingStatus.actor.name}"`,
        {
          effectsProcessed: updateData.length,
        },
        "STATUS_INTENSIFICATION",
      );

      Logger.methodExit("StatusIntensification", "intensifyStatus", true);
      return true;
    } catch (error) {
      Logger.error(
        "Failed to intensify status effect",
        error,
        "STATUS_INTENSIFICATION",
      );
      Logger.methodExit("StatusIntensification", "intensifyStatus", false);
      return false;
    }
  }

  /**
   * Apply or intensify a status effect on a target
   * @param {Actor} target - The target actor
   * @param {Object} effectData - The effect data to apply
   * @returns {Promise<{applied: boolean, intensified: boolean, item: Item|null}>} Result of the operation
   */
  static async applyOrIntensifyStatus(target, effectData) {
    Logger.methodEntry("StatusIntensification", "applyOrIntensifyStatus", {
      targetName: target.name,
      effectName: effectData.name,
      effectType: effectData.type,
    });

    try {
      // Only handle status effects
      if (effectData.type !== "status") {
        // For non-status effects, just create normally
        const createdItems = await target.createEmbeddedDocuments("Item", [
          effectData,
        ]);
        Logger.methodExit("StatusIntensification", "applyOrIntensifyStatus", {
          applied: true,
          intensified: false,
          item: createdItems[0],
        });
        return {
          applied: true,
          intensified: false,
          item: createdItems[0],
        };
      }

      // Check if an existing status with the same name and description exists
      const existingStatus = this.findExistingStatus(target, effectData);

      if (existingStatus) {
        // Intensify the existing status
        const intensified = await this.intensifyStatus(
          existingStatus,
          effectData,
        );
        Logger.methodExit("StatusIntensification", "applyOrIntensifyStatus", {
          applied: intensified,
          intensified: true,
          item: existingStatus,
        });
        return {
          applied: intensified,
          intensified: true,
          item: existingStatus,
        };
      } else {
        // Create new status effect
        const createdItems = await target.createEmbeddedDocuments("Item", [
          effectData,
        ]);
        Logger.methodExit("StatusIntensification", "applyOrIntensifyStatus", {
          applied: true,
          intensified: false,
          item: createdItems[0],
        });
        return {
          applied: true,
          intensified: false,
          item: createdItems[0],
        };
      }
    } catch (error) {
      Logger.error(
        "Failed to apply or intensify status effect",
        error,
        "STATUS_INTENSIFICATION",
      );
      Logger.methodExit("StatusIntensification", "applyOrIntensifyStatus", {
        applied: false,
        intensified: false,
        item: null,
      });
      return {
        applied: false,
        intensified: false,
        item: null,
      };
    }
  }
}
