import { Logger } from "../../services/logger.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";

/**
 * Actor Sheet Transformation Actions Mixin
 *
 * Provides transformation management functionality for actor sheets, including
 * applying and removing transformations.
 *
 * @param {class} BaseClass - The base actor sheet class to extend
 * @returns {class} Extended class with transformation management functionality
 */
export const ActorSheetTransformationActionsMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Apply a transformation to the actor
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     * @static
     */
    static async _applyTransformation(_event, target) {
      Logger.methodEntry(
        "ActorSheetTransformationActionsMixin",
        "_applyTransformation",
        {
          actorName: this.actor?.name,
          targetDataset: target.dataset,
        },
      );

      try {
        const transformation = this._getEmbeddedDocument(target);

        if (!transformation) {
          throw new Error("Transformation not found");
        }

        if (transformation.type !== "transformation") {
          throw new Error("Document is not a transformation");
        }

        const result = await this.actor.applyTransformation(transformation);

        // Force sheet re-render to update combat powers section
        this.render(false);

        Logger.info(
          `Applied transformation: ${transformation.name}`,
          {
            transformationId: transformation.id,
            transformationName: transformation.name,
            actorName: this.actor.name,
          },
          "TRANSFORMATION_ACTIONS",
        );

        Logger.methodExit(
          "ActorSheetTransformationActionsMixin",
          "_applyTransformation",
          result,
        );
        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Apply transformation for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.TransformationApplyError",
          ),
        });

        Logger.methodExit(
          "ActorSheetTransformationActionsMixin",
          "_applyTransformation",
          null,
        );
      }
    }

    /**
     * Remove the active transformation from the actor
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} _target - The capturing HTML element which defined a [data-action]
     * @protected
     * @static
     */
    static async _removeTransformation(_event, _target) {
      Logger.methodEntry(
        "ActorSheetTransformationActionsMixin",
        "_removeTransformation",
        {
          actorName: this.actor?.name,
          hasActiveTransformation: !!this.actor.getFlag(
            "eventide-rp-system",
            "activeTransformation",
          ),
        },
      );

      try {
        // Check if there's an active transformation to remove
        const activeTransformationId = this.actor.getFlag(
          "eventide-rp-system",
          "activeTransformation",
        );
        if (!activeTransformationId) {
          ui.notifications.warn(
            game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Warnings.NoActiveTransformation",
            ),
          );
          Logger.methodExit(
            "ActorSheetTransformationActionsMixin",
            "_removeTransformation",
            false,
          );
          return false;
        }

        const result = await this.actor.removeTransformation();

        // Force sheet re-render to update combat powers section
        this.render(false);

        Logger.info(
          `Removed active transformation from actor: ${this.actor.name}`,
          {
            actorName: this.actor.name,
          },
          "TRANSFORMATION_ACTIONS",
        );

        Logger.methodExit(
          "ActorSheetTransformationActionsMixin",
          "_removeTransformation",
          result,
        );
        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Remove transformation for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.TransformationRemoveError",
          ),
        });

        Logger.methodExit(
          "ActorSheetTransformationActionsMixin",
          "_removeTransformation",
          null,
        );
      }
    }

    /**
     * Toggle the auto token update flag
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} _target - The capturing HTML element which defined a [data-action]
     * @protected
     * @static
     */
    static async _toggleAutoTokenUpdate(_event, _target) {
      Logger.methodEntry(
        "ActorSheetTransformationActionsMixin",
        "_toggleAutoTokenUpdate",
        {
          actorName: this.actor?.name,
          currentValue: this.actor.getFlag(
            "eventide-rp-system",
            "autoTokenUpdate",
          ),
        },
      );

      try {
        const currentValue =
          this.actor.getFlag("eventide-rp-system", "autoTokenUpdate") || false;
        const newValue = !currentValue;

        await this.actor.setFlag(
          "eventide-rp-system",
          "autoTokenUpdate",
          newValue,
        );

        Logger.info(
          `Auto token update toggled to: ${newValue}`,
          {
            actorName: this.actor.name,
            previousValue: currentValue,
            newValue,
          },
          "TRANSFORMATION_ACTIONS",
        );

        Logger.methodExit(
          "ActorSheetTransformationActionsMixin",
          "_toggleAutoTokenUpdate",
          newValue,
        );
        return newValue;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Toggle auto token update for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.ToggleAutoTokenUpdateError",
            {
              actorName: this.actor?.name || "Unknown",
            },
          ),
        });

        Logger.methodExit(
          "ActorSheetTransformationActionsMixin",
          "_toggleAutoTokenUpdate",
          null,
        );
      }
    }
  };
