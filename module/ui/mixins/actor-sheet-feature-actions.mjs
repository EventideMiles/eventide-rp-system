import { Logger } from "../../services/logger.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";

/**
 * Actor Sheet Feature Actions Mixin
 *
 * Provides feature management functionality for actor sheets, including
 * activating/deactivating features and related actions.
 *
 * @param {class} BaseClass - The base actor sheet class to extend
 * @returns {class} Extended class with feature management functionality
 */
export const ActorSheetFeatureActionsMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Toggle feature active state
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     * @static
     */
    static async _toggleFeature(_event, target) {
      Logger.methodEntry("ActorSheetFeatureActionsMixin", "_toggleFeature", {
        actorName: this.actor?.name,
        targetDataset: target.dataset,
      });

      try {
        const feature = this._getEmbeddedDocument(target);

        if (!feature) {
          throw new Error("Feature item not found");
        }

        const newActiveState = !feature.system.active;
        await feature.update({ "system.active": newActiveState });

        // Create feature toggle message
        // TODO: Implement erps.messages.createFeatureToggleMessage(feature);

        Logger.debug(
          `Feature ${feature.name} active state changed to: ${newActiveState}`,
          {
            featureId: feature.id,
            featureName: feature.name,
            active: newActiveState,
          },
          "FEATURE_ACTIONS",
        );

        Logger.methodExit("ActorSheetFeatureActionsMixin", "_toggleFeature", feature);
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Toggle feature for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.FeatureToggleError",
          ),
        });

        Logger.methodExit("ActorSheetFeatureActionsMixin", "_toggleFeature", null);
      }
    }
  };
