import { Logger } from "../services/logger.mjs";

/**
 * Utility functions for attaching effects to targets based on thresholds
 */
export class EffectAttachment {
  /**
   * Apply effects to targets based on threshold results
   * @param {Array} effects - Array of effect entries with threshold configuration
   * @param {Array} targetResults - Array of target results with hit information
   * @param {number} rollTotal - The total roll result
   * @param {boolean} isGM - Whether the current user is a GM
   * @returns {Promise<Array>} Array of effect application results
   */
  static async applyThresholdEffects(effects, targetResults, rollTotal, isGM) {
    Logger.methodEntry("EffectAttachment", "applyThresholdEffects", {
      effectCount: effects.length,
      targetCount: targetResults.length,
      rollTotal,
      isGM,
    });

    const results = [];

    try {
      for (const targetResult of targetResults) {
        for (const effectEntry of effects) {
          const shouldApply = this.checkThreshold(
            effectEntry.threshold,
            targetResult.oneHit,
            targetResult.bothHit,
            rollTotal,
          );

          if (shouldApply) {
            if (isGM) {
              // GM applies effects directly
              try {
                await targetResult.target.createEmbeddedDocuments("Item", [
                  effectEntry.itemData,
                ]);
                results.push({
                  target: targetResult.target,
                  effect: effectEntry.itemData,
                  threshold: effectEntry.threshold,
                  applied: true,
                });

                Logger.info(
                  `Applied effect "${effectEntry.itemData.name}" to target "${targetResult.target.name}"`,
                  {
                    thresholdType: effectEntry.threshold.type,
                    thresholdValue: effectEntry.threshold.value,
                    rollTotal,
                  },
                  "EFFECT_ATTACHMENT",
                );
              } catch (error) {
                Logger.error(
                  "Failed to apply effect to target",
                  error,
                  "EFFECT_ATTACHMENT",
                );
                results.push({
                  target: targetResult.target,
                  effect: effectEntry.itemData,
                  threshold: effectEntry.threshold,
                  applied: false,
                  error: error.message,
                });
              }
            } else {
              // Player creates GM apply card
              results.push({
                target: targetResult.target,
                effect: effectEntry.itemData,
                threshold: effectEntry.threshold,
                needsGMApplication: true,
              });

              Logger.debug(
                `Flagged effect "${effectEntry.itemData.name}" for GM application to target "${targetResult.target.name}"`,
                {
                  thresholdType: effectEntry.threshold.type,
                  thresholdValue: effectEntry.threshold.value,
                  rollTotal,
                },
                "EFFECT_ATTACHMENT",
              );
            }
          }
        }
      }

      Logger.methodExit("EffectAttachment", "applyThresholdEffects", results);
      return results;
    } catch (error) {
      Logger.error(
        "Failed to apply threshold effects",
        error,
        "EFFECT_ATTACHMENT",
      );
      Logger.methodExit("EffectAttachment", "applyThresholdEffects", []);
      throw error;
    }
  }

  /**
   * Check if a threshold condition is met
   * @param {Object} threshold - The threshold configuration
   * @param {boolean} oneHit - Whether at least one AC was hit
   * @param {boolean} bothHit - Whether both ACs were hit
   * @param {number} rollTotal - The total roll result
   * @returns {boolean} Whether the threshold is met
   */
  static checkThreshold(threshold, oneHit, bothHit, rollTotal) {
    if (!threshold) {
      return oneHit; // Default fallback
    }

    switch (threshold.type) {
      case "never":
        return false;
      case "oneSuccess":
        return oneHit;
      case "twoSuccesses":
        return bothHit;
      case "rollValue":
        return rollTotal >= (threshold.value || 15);
      default:
        Logger.warn(
          `Unknown threshold type: ${threshold.type}`,
          null,
          "EFFECT_ATTACHMENT",
        );
        return oneHit; // Default fallback
    }
  }

  /**
   * Validate threshold configuration
   * @param {Object} threshold - The threshold configuration to validate
   * @returns {boolean} Whether the threshold configuration is valid
   */
  static validateThreshold(threshold) {
    if (!threshold || typeof threshold !== "object") {
      return false;
    }

    const validTypes = ["never", "oneSuccess", "twoSuccesses", "rollValue"];
    if (!validTypes.includes(threshold.type)) {
      return false;
    }

    // For rollValue type, ensure value is a valid number
    if (threshold.type === "rollValue") {
      if (
        typeof threshold.value !== "number" ||
        threshold.value < 1 ||
        threshold.value > 30
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Create a default threshold configuration
   * @param {string} type - The threshold type
   * @param {number} value - The threshold value (for rollValue type)
   * @returns {Object} Default threshold configuration
   */
  static createDefaultThreshold(type = "oneSuccess", value = 15) {
    return {
      type,
      value: type === "rollValue" ? value : undefined,
    };
  }

  /**
   * Get human-readable description of a threshold
   * @param {Object} threshold - The threshold configuration
   * @returns {string} Human-readable description
   */
  static getThresholdDescription(threshold) {
    if (!threshold) {
      return "On one success";
    }

    switch (threshold.type) {
      case "never":
        return "Never";
      case "oneSuccess":
        return "On one success";
      case "twoSuccesses":
        return "On two successes";
      case "rollValue":
        return `On roll ${threshold.value || 15}+`;
      default:
        return "Unknown condition";
    }
  }
}
