/**
 * TransformationApplicator Service
 *
 * Provides centralized transformation application for action card execution.
 * Handles transformation selection, validation, and application to target actors.
 *
 * @module TransformationApplicator
 * @see module:item-action-card-execution
 */

import { Logger } from "./logger.mjs";

/**
 * @typedef {Object} TransformationContext
 * @property {Array} results - Target results from action card execution
 * @property {Roll|null} rollResult - The roll result
 * @property {Array} embeddedTransformations - Array of transformation data
 * @property {Object} transformationConfig - Configuration for transformation application
 * @property {Object} repetitionContext - Current repetition context state
 * @property {Map<string, string>} [repetitionContext.transformationSelections] - Pre-selected transformations per target
 * @property {Set<string>} [repetitionContext.appliedTransformations] - Already applied transformations
 * @property {Function} getEmbeddedTransformations - Function to get embedded transformation items
 * @property {Function} shouldApplyEffect - Function to check if effect should apply
 * @property {Function} waitForDelay - Function to wait for execution delay
 * @property {string} mode - Action card mode ("attackChain" | "savedDamage")
 * @property {boolean} disableDelays - Whether to disable delays
 * @property {boolean} isFinalRepetition - Whether this is the final repetition
 */

/**
 * @typedef {Object} TransformationResult
 * @property {Actor} target - The target actor
 * @property {Item} transformation - The transformation item
 * @property {boolean} applied - Whether transformation was applied
 * @property {string} [reason] - Reason code for result
 * @property {string} [warning] - Warning message
 * @property {string} [error] - Error message
 */

/**
 * @typedef {Object} ApplicationResult
 * @property {boolean} applied - Whether application succeeded
 * @property {string} reason - Result reason code
 * @property {string} [warning] - Warning message
 * @property {string} [error] - Error message
 */

/**
 * @typedef {Object} SelectionDialogOptions
 * @property {string} [title] - Dialog title localization key
 * @property {string} [prompt] - Prompt message localization key
 * @property {string} [label] - Select label localization key
 * @property {string} [applyButton] - Apply button localization key
 * @property {string} [cancelButton] - Cancel button localization key
 */

/**
 * TransformationApplicator class for applying transformations to actors
 *
 * @class TransformationApplicator
 */
export class TransformationApplicator {
  /**
   * Process transformation results for action card execution
   *
   * @static
   * @param {TransformationContext} context - The transformation context
   * @returns {Promise<TransformationResult[]>} Array of transformation results
   */
  static async processTransformationResults(context) {
    const {
      results,
      rollResult,
      embeddedTransformations,
      transformationConfig,
      repetitionContext,
      getEmbeddedTransformations,
      shouldApplyEffect,
      waitForDelay,
      mode,
      disableDelays,
      isFinalRepetition,
    } = context;

    const transformationResults = [];

    try {
      // Skip if no transformations embedded
      if (!embeddedTransformations || embeddedTransformations.length === 0) {
        return transformationResults;
      }

      // ISSUE: Transformations should NEVER apply in savedDamage mode
      // Saved damage mode is for applying pre-calculated damage only, not transformations
      if (mode === "savedDamage") {
        Logger.debug(
          "Skipping transformation processing for savedDamage mode - transformations are not allowed",
          { mode },
          "ACTION_CARD",
        );
        return transformationResults;
      }

      // Apply transformations to each target based on pre-selections or default logic
      for (const result of results) {
        // Skip invalid results
        if (!result || !result.target) {
          Logger.warn(
            "Invalid result structure in processTransformationResults, skipping",
            { result },
            "ACTION_CARD",
          );
          continue;
        }

        // Determine which transformation to apply for this target
        let selectedTransformation = null;
        const transformationSelections =
          repetitionContext?.transformationSelections;

        // Check multiple possible target ID formats for robust lookup
        let selectedTransformationId = null;
        if (transformationSelections) {
          // Try actor ID first
          if (transformationSelections.has(result.target.id)) {
            selectedTransformationId = transformationSelections.get(
              result.target.id,
            );
          }
          // Try actor UUID as fallback
          else if (
            result.target.uuid &&
            transformationSelections.has(result.target.uuid)
          ) {
            selectedTransformationId = transformationSelections.get(
              result.target.uuid,
            );
          }
          // Try token ID if actor is connected to a token
          else if (
            result.target.token?.id &&
            transformationSelections.has(result.target.token.id)
          ) {
            selectedTransformationId = transformationSelections.get(
              result.target.token.id,
            );
          }
        }

        if (selectedTransformationId) {
          // Use pre-selected transformation for this target
          // First get the embedded transformations as temporary items
          const embeddedTransformationItems = await getEmbeddedTransformations({
            executionContext: true,
          });
          selectedTransformation = embeddedTransformationItems.find(
            (t) => t.originalId === selectedTransformationId,
          );
        } else if (embeddedTransformations.length === 1) {
          // Only one transformation available, use it by default
          const embeddedTransformationItems = await getEmbeddedTransformations({
            executionContext: true,
          });
          selectedTransformation = embeddedTransformationItems[0];
        } else if (embeddedTransformations.length > 1) {
          // Multiple transformations but no pre-selection - skip transformation
          // Transformations should only apply to pre-selected targets, not prompt GM
          Logger.warn(
            `Multiple transformations available but no pre-selection for target ${result.target.name}, skipping transformation`,
            {
              targetId: result.target.id,
              transformationCount: embeddedTransformations.length,
            },
            "ACTION_CARD",
          );
          continue;
        }

        // Skip if no transformation was selected
        if (!selectedTransformation) {
          Logger.warn(
            `No transformation selected for target ${result.target.name}, skipping transformation application`,
            {
              targetId: result.target.id,
              hasSelections: !!transformationSelections,
              transformationCount: embeddedTransformations.length,
            },
            "ACTION_CARD",
          );
          continue;
        }

        // Check if transformation should be applied based on configuration
        let shouldApplyTransformation = true;
        if (mode === "attackChain") {
          shouldApplyTransformation = shouldApplyEffect(
            transformationConfig.condition,
            result.oneHit,
            result.bothHit,
            rollResult?.total || 0,
            transformationConfig.threshold || 15,
          );
        } else if (mode === "savedDamage") {
          // For saved damage mode, check transformation condition
          // Since there's no roll result, we only apply if condition is "never" -> false or anything else -> true
          shouldApplyTransformation =
            transformationConfig.condition !== "never";
        }

        if (shouldApplyTransformation) {
          // Check if this transformation has already been applied during repetitions
          const transformationKey = `${result.target.id}-${selectedTransformation.originalId || selectedTransformation.id}`;
          const alreadyApplied =
            repetitionContext?.appliedTransformations?.has(transformationKey);

          if (alreadyApplied) {
            continue;
          }

          try {
            const applicationResult =
              await TransformationApplicator.applyWithValidation(
                result.target,
                selectedTransformation,
              );

            // Track that this transformation has been applied to this target
            if (
              applicationResult.applied &&
              repetitionContext?.appliedTransformations
            ) {
              repetitionContext.appliedTransformations.add(transformationKey);
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
      if (!disableDelays && !isFinalRepetition && waitForDelay) {
        await waitForDelay();
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
   *
   * @static
   * @param {Actor} targetActor - The actor to transform
   * @param {Object|Item} transformationData - Transformation data or item
   * @returns {Promise<ApplicationResult>} Application result
   */
  static async applyWithValidation(targetActor, transformationData) {
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
      transformationItemData = foundry.utils.deepClone(
        transformationData.toObject(),
      );

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
        "TRANSFORMATION_APPLICATION",
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
   *
   * @static
   * @param {Array} transformations - Array of transformation data
   * @param {SelectionDialogOptions} [options] - Dialog customization options
   * @returns {Promise<Object|null>} Selected transformation or null if cancelled
   */
  static async promptForSelection(transformations, options = {}) {
    return new Promise((resolve) => {
      // Create dialog content
      const transformationOptions = transformations
        .map(
          (transformation, index) =>
            `<option value="${index}">${transformation.name}</option>`,
        )
        .join("");

      const titleKey =
        options.title ||
        "EVENTIDE_RP_SYSTEM.Item.ActionCard.TransformationSelectionTitle";
      const promptKey =
        options.prompt ||
        "EVENTIDE_RP_SYSTEM.Item.ActionCard.TransformationSelectionPrompt";
      const labelKey =
        options.label ||
        "EVENTIDE_RP_SYSTEM.Item.ActionCard.TransformationSelectionLabel";
      const applyKey =
        options.applyButton ||
        "EVENTIDE_RP_SYSTEM.Item.ActionCard.TransformationSelectionApply";
      const cancelKey =
        options.cancelButton ||
        "EVENTIDE_RP_SYSTEM.Item.ActionCard.TransformationSelectionCancel";

      const content = `
        <div class="transformation-selection">
          <p>${game.i18n.localize(promptKey)}</p>
          <div class="form-group">
            <label>${game.i18n.localize(labelKey)}</label>
            <select id="transformation-choice" style="width: 100%;">
              ${transformationOptions}
            </select>
          </div>
        </div>
      `;

      new Dialog({
        title: game.i18n.localize(titleKey),
        content,
        buttons: {
          apply: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize(applyKey),
            callback: (html) => {
              const selectedIndex = parseInt(
                html.find("#transformation-choice").val(),
                10,
              );
              resolve(transformations[selectedIndex]);
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize(cancelKey),
            callback: () => resolve(null),
          },
        },
        default: "apply",
        close: () => resolve(null),
      }).render(true);
    });
  }
}
