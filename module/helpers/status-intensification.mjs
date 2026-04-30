import { Logger } from "../services/logger.mjs";

/**
 * Mapping from effect change mode to schema key name
 * Used to look up the intensify amount for each effect type
 * @constant
 * @type {Object.<string, string>}
 */
const MODE_TO_SCHEMA_KEY = {
  add: "add",
  override: "override",
  advantage: "advantage",
  disadvantage: "disadvantage",
  "ac.change": "acChange",
  multiply: "multiply",
  divide: "divide",
  multiplyBuff: "multiplyBuff",
  multiplyDebuff: "multiplyDebuff",
  transformOverride: "transformOverride",
  transformChange: "transformChange",
};

/**
 * Determine the mode of an effect change from its key path
 * This reconstructs the original mode from the change key, similar to
 * how character-effects.mjs determines the mode.
 *
 * @param {Object} change - The change object with key and type properties
 * @returns {string} The mode of the effect
 */
function determineChangeMode(change) {
  const key = change.key || "";

  // Check for specific mode suffixes in the key path
  if (key.includes("disadvantage")) return "disadvantage";
  if (key.includes("advantage")) return "advantage";
  if (key.includes("ac.change")) return "ac.change";
  if (key.includes("transformOverride")) return "transformOverride";
  if (key.includes("transformChange")) return "transformChange";
  // Multiply mode detection
  if (key.includes("multiplyBuff")) return "multiplyBuff";
  if (key.includes("multiplyDebuff")) return "multiplyDebuff";
  if (key.includes("multiplyNeutral")) return "multiply";
  if (key.includes("divideNeutral")) return "divide";
  // For override, check the type
  if (change.type === "override") return "override";
  // Default to add/change
  return "add";
}

/**
 * Get the default intensify configuration with all values set to 1
 * @returns {Object} Default intensify configuration
 */
function getDefaultIntensifyConfig() {
  return {
    add: 1,
    advantage: 1,
    disadvantage: 1,
    acChange: 1,
    multiply: 1,
    divide: 1,
    multiplyBuff: 1,
    multiplyDebuff: 1,
    override: 1,
    transformOverride: 1,
    transformChange: 1,
  };
}

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
   * Get the intensify amount for a specific effect change
   * Uses the change key to determine the original mode (advantage, disadvantage, multiplyBuff, etc.)
   * rather than just the Foundry type which collapses multiple modes into single types.
   *
   * @param {Object} effect - The effect change object with key and type properties
   * @param {Object} intensifyConfig - The intensify configuration object
   * @returns {number} The intensify amount (0 means don't intensify)
   */
  static getIntensifyAmount(effect, intensifyConfig) {
    // Determine the original mode from the change key path
    // This correctly identifies advantage, disadvantage, multiplyBuff, etc.
    // rather than collapsing them all into "add" or "multiply"
    const mode = determineChangeMode(effect);
    const schemaKey = MODE_TO_SCHEMA_KEY[mode] || "add";

    // Return the configured amount, defaulting to 1
    return intensifyConfig?.[schemaKey] ?? 1;
  }

  /**
   * Intensify an existing status effect using configurable intensify amounts
   * @param {Item} existingStatus - The existing status item to intensify
   * @param {Object} _newEffectData - The new effect data (currently not used)
   * @param {Object} [intensifyConfig] - Configuration for how much to intensify each effect type
   * @param {number} [intensifyConfig.add] - Amount to intensify additive effects (default: 1)
   * @param {number} [intensifyConfig.advantage] - Amount to intensify advantage effects (default: 1)
   * @param {number} [intensifyConfig.disadvantage] - Amount to intensify disadvantage effects (default: 1)
   * @param {number} [intensifyConfig.acChange] - Amount to intensify AC effects (default: 1)
   * @param {number} [intensifyConfig.multiply] - Amount to intensify multiply effects (default: 1)
   * @param {number} [intensifyConfig.divide] - Amount to intensify divide effects (default: 1)
   * @param {number} [intensifyConfig.multiplyBuff] - Amount to intensify multiplyBuff effects (default: 1)
   * @param {number} [intensifyConfig.multiplyDebuff] - Amount to intensify multiplyDebuff effects (default: 1)
   * @param {number} [intensifyConfig.override] - Amount to intensify override effects (default: 1)
   * @param {number} [intensifyConfig.transformOverride] - Amount to intensify transformOverride effects (default: 1)
   * @param {number} [intensifyConfig.transformChange] - Amount to intensify transformChange effects (default: 1)
   * @returns {Promise<boolean>} True if intensification was successful
   */
  static async intensifyStatus(
    existingStatus,
    _newEffectData,
    intensifyConfig,
  ) {
    Logger.methodEntry("StatusIntensification", "intensifyStatus", {
      statusName: existingStatus.name,
      targetName: existingStatus.actor.name,
      intensifyConfig,
    });

    // Use default config if not provided
    const config = intensifyConfig || getDefaultIntensifyConfig();

    try {
      // Get the active effects from the existing status
      const existingEffects =
        existingStatus.effects.contents[0]?.system?.changes;

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

      // Process each existing effect and intensify its values based on config
      for (const existingEffect of existingEffects) {
        const existingValue = Number(existingEffect.value) || 0;
        const intensifyAmount = this.getIntensifyAmount(existingEffect, config);

        // If intensify amount is 0, skip this effect (don't intensify)
        if (intensifyAmount === 0) {
          updateData.push({
            ...existingEffect,
          });
          Logger.debug(
            `Skipping intensification for effect: ${existingEffect.key} (amount: 0)`,
            {
              key: existingEffect.key,
              type: existingEffect.type,
              existingValue,
            },
            "STATUS_INTENSIFICATION",
          );
          continue;
        }

        let intensifiedValue = existingValue;

        if (existingValue > 0) {
          // Positive value: add the intensify amount
          intensifiedValue = existingValue + intensifyAmount;
        } else if (existingValue < 0) {
          // Negative value: subtract the intensify amount (making it more negative)
          intensifiedValue = existingValue - intensifyAmount;
        }
        // If existingValue is 0, leave it unchanged (intensifiedValue remains 0)

        updateData.push({
          ...existingEffect,
          value: intensifiedValue,
        });

        Logger.debug(
          `Intensifying effect: ${existingEffect.key}`,
          {
            type: existingEffect.type,
            existingValue,
            intensifiedValue,
            intensifyAmount,
            change: intensifiedValue - existingValue,
          },
          "STATUS_INTENSIFICATION",
        );
      }

      // Update the existing status with intensified values
      await existingStatus.updateEmbeddedDocuments("ActiveEffect", [
        {
          _id: existingStatus.effects.contents[0]._id,
          system: { changes: updateData },
        },
      ]);

      // Trigger the erpsUpdateItem hook for consistency with manual status updates
      Hooks.call("erpsUpdateItem", existingStatus, {}, {}, game.user.id);

      Logger.info(
        `Successfully intensified status "${existingStatus.name}" on target "${existingStatus.actor.name}"`,
        {
          effectsProcessed: updateData.length,
          configUsed: config,
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
   * @param {Object} [intensifyConfig] - Configuration for how much to intensify each effect type
   * @param {number} [intensifyConfig.add] - Amount to intensify additive effects (default: 1)
   * @param {number} [intensifyConfig.advantage] - Amount to intensify advantage effects (default: 1)
   * @param {number} [intensifyConfig.disadvantage] - Amount to intensify disadvantage effects (default: 1)
   * @param {number} [intensifyConfig.acChange] - Amount to intensify AC effects (default: 1)
   * @param {number} [intensifyConfig.multiply] - Amount to intensify multiply effects (default: 1)
   * @param {number} [intensifyConfig.divide] - Amount to intensify divide effects (default: 1)
   * @param {number} [intensifyConfig.multiplyBuff] - Amount to intensify multiplyBuff effects (default: 1)
   * @param {number} [intensifyConfig.multiplyDebuff] - Amount to intensify multiplyDebuff effects (default: 1)
   * @param {number} [intensifyConfig.override] - Amount to intensify override effects (default: 1)
   * @param {number} [intensifyConfig.transformOverride] - Amount to intensify transformOverride effects (default: 1)
   * @param {number} [intensifyConfig.transformChange] - Amount to intensify transformChange effects (default: 1)
   * @returns {Promise<{applied: boolean, intensified: boolean, item: Item|null}>} Result of the operation
   */
  static async applyOrIntensifyStatus(target, effectData, intensifyConfig) {
    Logger.methodEntry("StatusIntensification", "applyOrIntensifyStatus", {
      targetName: target.name,
      effectName: effectData.name,
      effectType: effectData.type,
      hasIntensifyConfig: !!intensifyConfig,
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
        // Intensify the existing status with the provided config
        const intensified = await this.intensifyStatus(
          existingStatus,
          effectData,
          intensifyConfig,
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
