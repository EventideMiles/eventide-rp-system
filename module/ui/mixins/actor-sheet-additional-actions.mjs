import { Logger } from "../../services/logger.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";
import { erpsRollHandler } from "../../services/_module.mjs";

const FilePicker = foundry.applications.apps.FilePicker.implementation;

/**
 * Actor Sheet Additional Actions Mixin
 *
 * Provides additional action methods for actor sheets including image editing,
 * effect toggling, token configuration, rolling, and action card execution.
 *
 * @param {class} BaseClass - The base actor sheet class to extend
 * @returns {class} Extended class with additional action functionality
 */
export const ActorSheetAdditionalActionsMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Handle changing a Document's image.
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @returns {Promise}
     * @protected
     */
    static async _onEditImage(_event, target) {

      try {
        // Check if actor has an active transformation - if so, prevent image changes
        const activeTransformation = this.actor.getFlag(
          "eventide-rp-system",
          "activeTransformation",
        );
        if (activeTransformation) {
          ui.notifications.warn(
            game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Warnings.CannotChangeImageWhileTransformed",
            ) ||
              "Cannot change actor image while transformed. Remove the transformation first.",
          );

          Logger.warn(
            "Blocked image change attempt while actor is transformed",
            {
              actorName: this.actor.name,
              transformationId: activeTransformation,
            },
            "ADDITIONAL_ACTIONS",
          );

          return false;
        }

        const attr = target.dataset.edit;
        const current = foundry.utils.getProperty(this.document, attr);
        const { img } =
          this.document.constructor.getDefaultArtwork?.(
            this.document.toObject(),
          ) ?? {};

        const fp = new FilePicker({
          current,
          type: "image",
          redirectToRoot: img ? [img] : [],
          callback: async (path) => {
            const updateData = { [attr]: path };

            // If auto token update is enabled, also update the token image
            const autoTokenUpdate = this.actor.getFlag(
              "eventide-rp-system",
              "autoTokenUpdate",
            );
            if (autoTokenUpdate && attr === "img") {
              updateData["prototypeToken.texture.src"] = path;


              // Also update any existing tokens on the scene
              const tokens = this.actor.getActiveTokens();
              if (tokens.length > 0) {
                // Update tokens on their respective scenes
                const sceneUpdates = new Map();
                for (const token of tokens) {
                  const sceneId = token.scene.id;
                  if (!sceneUpdates.has(sceneId)) {
                    sceneUpdates.set(sceneId, []);
                  }
                  sceneUpdates.get(sceneId).push({
                    _id: token.id,
                    "texture.src": path,
                  });
                }

                // Execute updates for each scene
                for (const [sceneId, updates] of sceneUpdates) {
                  const scene = game.scenes.get(sceneId);
                  if (scene) {
                    await scene.updateEmbeddedDocuments("Token", updates);
                  }
                }
              }
            }

            await this.document.update(updateData);

          },
          top: this.position.top + 40,
          left: this.position.left + 10,
        });

        const result = fp.browse();
        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Edit image for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.EditImageError",
            {
              actorName: this.actor?.name || "Unknown",
            },
          ),
        });

      }
    }

    /**
     * Determines effect parent to pass to helper
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @private
     */
    static async _toggleEffect(_event, target) {

      try {
        const effect = this._getEmbeddedDocument(target);
        if (!effect) {
          Logger.warn(
            "No effect found for toggle",
            { targetDataset: target.dataset },
            "ADDITIONAL_ACTIONS",
          );
          ui.notifications.warn(
            game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.EffectNotFound"),
          );
          return;
        }

        const result = await effect.update({ disabled: !effect.disabled });


        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Toggle effect for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.EffectToggleError",
          ),
        });

      }
    }

    /**
     * Handle configuring the actor's token
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} _target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _onConfigureToken(_event, _target) {

      try {
        // First, try to get an active token on the current scene
        const activeTokens = this.actor.getActiveTokens();
        let token = null;

        if (activeTokens.length > 0) {
          // Use the first active token if available
          token = activeTokens[0];
        } else {
          // No active token found, use the prototype token seamlessly
          token = this.actor.prototypeToken;
        }

        // Open the token configuration sheet
        const result = token.sheet.render(true);
        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Configure token for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.ConfigureTokenError",
            {
              actorName: this.actor?.name || "Unknown",
            },
          ),
        });

      }
    }

    /**
     * Handle clickable rolls.
     * @param {PointerEvent} event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _onRoll(event, target) {

      try {
        event.preventDefault();

        const dataset = {
          ...target.dataset,
          formula: target.dataset.roll,
        };


        // Handle item rolls.
        switch (dataset.rollType) {
          case "item": {
            const item = this._getEmbeddedDocument(target);
            if (!item) {
              Logger.warn(
                "No item found for item roll",
                { targetDataset: target.dataset },
                "ADDITIONAL_ACTIONS",
              );
              ui.notifications.warn(
                game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.ItemNotFound"),
              );
              return;
            }

            // Check for ctrl+click to bypass dialog (exclude action cards)
            const bypassableTypes = ["combatPower", "gear", "feature", "status"];
            const bypass = (event.ctrlKey || event.metaKey) && bypassableTypes.includes(item.type);


            const rollResult = await item.roll({ bypass });
            return rollResult;
          }
        }

        // Handle rolls that supply the formula directly.
        if (dataset.roll) {

          // Add the current roll mode to the dataset
          const rollData = {
            ...dataset,
            rollMode: game.settings.get("core", "rollMode"),
          };

          const roll = await erpsRollHandler.handleRoll(rollData, this.actor);
          return roll;
        }

        Logger.warn(
          "No valid roll configuration found",
          { dataset },
          "ADDITIONAL_ACTIONS",
        );
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Roll Action for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.RollError", {
            actorName: this.actor?.name || "Unknown",
          }),
        });
      }
    }

    /**
     * Handle executing an action card's attack chain
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _executeActionCard(_event, target) {

      try {
        const itemId = target.dataset.itemId;
        const actionCard = this._getEmbeddedDocument(target);

        if (!actionCard || actionCard.type !== "actionCard") {
          Logger.warn(
            "Invalid action card for execution",
            { itemId },
            "ADDITIONAL_ACTIONS",
          );
          ui.notifications.warn(
            game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.ActionCardInvalid"),
          );
          return;
        }

        // Use the same popup flow as row clicks to ensure consistent behavior and proper callouts

        const rollResult = await actionCard.roll();
        return rollResult;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Execute action card for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.ActionCardExecuteError",
          ),
        });

        Logger.error(
          "Failed to execute action card",
          error,
          "ADDITIONAL_ACTIONS",
        );
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.ActionCardExecuteFailed",
          ),
        );
      }
    }
  };
