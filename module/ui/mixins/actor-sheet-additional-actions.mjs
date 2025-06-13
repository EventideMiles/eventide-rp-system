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
      Logger.methodEntry("ActorSheetAdditionalActionsMixin", "_onEditImage", {
        actorName: this.actor?.name,
        autoTokenUpdate: this.actor.getFlag(
          "eventide-rp-system",
          "autoTokenUpdate",
        ),
        hasActiveTransformation: !!this.actor.getFlag(
          "eventide-rp-system",
          "activeTransformation",
        ),
      });

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

          Logger.methodExit(
            "ActorSheetAdditionalActionsMixin",
            "_onEditImage",
            false,
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

              Logger.info(
                "Auto token update: updating token image along with actor image",
                {
                  actorName: this.actor.name,
                  imagePath: path,
                },
                "ADDITIONAL_ACTIONS",
              );

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
                    Logger.info(
                      `Updated ${updates.length} token(s) on scene: ${scene.name}`,
                      {
                        actorName: this.actor.name,
                        sceneId,
                        tokenCount: updates.length,
                      },
                      "ADDITIONAL_ACTIONS",
                    );
                  }
                }
              }
            }

            await this.document.update(updateData);

            Logger.info(
              `Image updated successfully`,
              {
                actorName: this.actor.name,
                attribute: attr,
                path,
                tokenUpdated: autoTokenUpdate && attr === "img",
              },
              "ADDITIONAL_ACTIONS",
            );
          },
          top: this.position.top + 40,
          left: this.position.left + 10,
        });

        const result = fp.browse();
        Logger.methodExit(
          "ActorSheetAdditionalActionsMixin",
          "_onEditImage",
          result,
        );
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

        Logger.methodExit(
          "ActorSheetAdditionalActionsMixin",
          "_onEditImage",
          null,
        );
      }
    }

    /**
     * Determines effect parent to pass to helper
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @private
     */
    static async _toggleEffect(_event, target) {
      Logger.methodEntry("ActorSheetAdditionalActionsMixin", "_toggleEffect", {
        actorName: this.actor?.name,
        targetDataset: target.dataset,
      });

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
          Logger.methodExit(
            "ActorSheetAdditionalActionsMixin",
            "_toggleEffect",
            null,
          );
          return;
        }

        const result = await effect.update({ disabled: !effect.disabled });

        Logger.info(
          `Effect ${effect.disabled ? "disabled" : "enabled"}: ${effect.name}`,
          {
            effectId: effect.id,
            effectName: effect.name,
            disabled: effect.disabled,
          },
          "ADDITIONAL_ACTIONS",
        );

        Logger.methodExit(
          "ActorSheetAdditionalActionsMixin",
          "_toggleEffect",
          result,
        );
        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Toggle effect for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.EffectToggleError",
          ),
        });

        Logger.methodExit(
          "ActorSheetAdditionalActionsMixin",
          "_toggleEffect",
          null,
        );
      }
    }

    /**
     * Handle configuring the actor's token
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} _target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _onConfigureToken(_event, _target) {
      Logger.methodEntry(
        "ActorSheetAdditionalActionsMixin",
        "_onConfigureToken",
        {
          actorName: this.actor?.name,
          hasActiveTokens: this.actor.getActiveTokens().length > 0,
        },
      );

      try {
        // First, try to get an active token on the current scene
        const activeTokens = this.actor.getActiveTokens();
        let token = null;

        if (activeTokens.length > 0) {
          // Use the first active token if available
          token = activeTokens[0];
          Logger.info(
            `Using active token for configuration`,
            {
              actorName: this.actor.name,
              tokenId: token.id,
              sceneName: token.scene.name,
            },
            "ADDITIONAL_ACTIONS",
          );
        } else {
          // No active token found, use the prototype token seamlessly
          token = this.actor.prototypeToken;
          Logger.info(
            `No active token found, configuring prototype token`,
            {
              actorName: this.actor.name,
              prototypeTokenName: token.name,
            },
            "ADDITIONAL_ACTIONS",
          );
        }

        // Open the token configuration sheet
        const result = token.sheet.render(true);
        Logger.methodExit(
          "ActorSheetAdditionalActionsMixin",
          "_onConfigureToken",
          result,
        );
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

        Logger.methodExit(
          "ActorSheetAdditionalActionsMixin",
          "_onConfigureToken",
          null,
        );
      }
    }

    /**
     * Handle clickable rolls.
     * @param {PointerEvent} event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _onRoll(event, target) {
      Logger.methodEntry("ActorSheetAdditionalActionsMixin", "_onRoll", {
        actorName: this.actor?.name,
        rollType: target.dataset.rollType,
        roll: target.dataset.roll,
      });

      try {
        event.preventDefault();

        const dataset = {
          ...target.dataset,
          formula: target.dataset.roll,
        };

        Logger.debug(
          "Processing roll request",
          {
            rollType: dataset.rollType,
            formula: dataset.formula,
            datasetKeys: Object.keys(dataset),
          },
          "ADDITIONAL_ACTIONS",
        );

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
              Logger.methodExit(
                "ActorSheetAdditionalActionsMixin",
                "_onRoll",
                null,
              );
              return;
            }

            Logger.info(
              `Rolling item: ${item.name}`,
              { itemId: item.id, itemType: item.type },
              "ADDITIONAL_ACTIONS",
            );

            const rollResult = await item.roll();
            Logger.methodExit(
              "ActorSheetAdditionalActionsMixin",
              "_onRoll",
              rollResult,
            );
            return rollResult;
          }
        }

        // Handle rolls that supply the formula directly.
        if (dataset.roll) {
          Logger.info(
            `Rolling formula: ${dataset.roll}`,
            { formula: dataset.roll, actorName: this.actor.name },
            "ADDITIONAL_ACTIONS",
          );

          // Add the current roll mode to the dataset
          const rollData = {
            ...dataset,
            rollMode: game.settings.get("core", "rollMode"),
          };

          const roll = await erpsRollHandler.handleRoll(rollData, this.actor);
          Logger.methodExit(
            "ActorSheetAdditionalActionsMixin",
            "_onRoll",
            roll,
          );
          return roll;
        }

        Logger.warn(
          "No valid roll configuration found",
          { dataset },
          "ADDITIONAL_ACTIONS",
        );

        Logger.methodExit("ActorSheetAdditionalActionsMixin", "_onRoll", null);
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Roll Action for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.RollError", {
            actorName: this.actor?.name || "Unknown",
          }),
        });

        Logger.methodExit("ActorSheetAdditionalActionsMixin", "_onRoll", null);
      }
    }

    /**
     * Handle executing an action card's attack chain
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _executeActionCard(_event, target) {
      Logger.methodEntry(
        "ActorSheetAdditionalActionsMixin",
        "_executeActionCard",
        {
          actorName: this.actor?.name,
          itemId: target.dataset.itemId,
        },
      );

      try {
        const itemId = target.dataset.itemId;
        const actionCard = this.actor.items.get(itemId);

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

        const result = await actionCard.execute(this.actor);

        Logger.info(
          "DEBUG: Action card execution result",
          {
            hasResult: !!result,
            success: result?.success,
            mode: result?.mode,
            hasDamageResults: !!result?.damageResults?.length,
            hasStatusResults: !!result?.statusResults?.length,
            damageResultsWithGMFlag:
              result?.damageResults?.filter((r) => r.needsGMApplication)
                ?.length || 0,
            statusResultsWithGMFlag:
              result?.statusResults?.filter((r) => r.needsGMApplication)
                ?.length || 0,
          },
          "ADDITIONAL_ACTIONS",
        );

        if (result.success) {
          if (result.mode === "attackChain") {
            // Attack chain mode - create follow-up message if needed
            Logger.info(
              "DEBUG: About to call createAttackChainMessage",
              {
                hasResult: !!result,
                mode: result.mode,
                hasDamageResults: !!result.damageResults?.length,
                hasStatusResults: !!result.statusResults?.length,
                isGM: game.user.isGM,
              },
              "ADDITIONAL_ACTIONS",
            );

            const followUpMessage = await actionCard.createAttackChainMessage(
              result,
              this.actor,
            );

            Logger.info(
              "DEBUG: createAttackChainMessage returned",
              {
                followUpMessage: !!followUpMessage,
                messageId: followUpMessage?.id,
              },
              "ADDITIONAL_ACTIONS",
            );

            if (followUpMessage) {
              ui.notifications.info(
                `Attack chain executed - GM apply effects created`,
              );
            } else {
              ui.notifications.info(`Attack chain executed successfully`);
            }
            Logger.info(
              "Action card attack chain executed",
              {
                itemId,
                targetsHit:
                  result.targetResults?.filter((r) => r.oneHit).length || 0,
              },
              "ADDITIONAL_ACTIONS",
            );
          } else if (result.mode === "savedDamage") {
            // Saved damage mode - create follow-up message if needed
            Logger.info(
              "DEBUG: About to call createSavedDamageMessage",
              {
                hasResult: !!result,
                mode: result.mode,
                hasDamageResults: !!result.damageResults?.length,
                isGM: game.user.isGM,
              },
              "ADDITIONAL_ACTIONS",
            );

            const followUpMessage = await actionCard.createSavedDamageMessage(
              result,
              this.actor,
            );

            Logger.info(
              "DEBUG: createSavedDamageMessage returned",
              {
                followUpMessage: !!followUpMessage,
                messageId: followUpMessage?.id,
              },
              "ADDITIONAL_ACTIONS",
            );

            if (followUpMessage) {
              ui.notifications.info(
                `Saved damage executed - GM apply effects created`,
              );
            } else {
              ui.notifications.info(
                `Saved damage applied to ${result.damageResults.length} target(s)`,
              );
            }
            Logger.info(
              "Action card saved damage executed",
              {
                itemId,
                targetsAffected: result.damageResults.length,
              },
              "ADDITIONAL_ACTIONS",
            );
          }
        } else {
          ui.notifications.warn(
            `Action card execution failed: ${result.reason}`,
          );
          Logger.warn(
            "Action card execution failed",
            { itemId, reason: result.reason },
            "ADDITIONAL_ACTIONS",
          );
        }

        Logger.methodExit(
          "ActorSheetAdditionalActionsMixin",
          "_executeActionCard",
        );
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
        Logger.methodExit(
          "ActorSheetAdditionalActionsMixin",
          "_executeActionCard",
        );
      }
    }
  };
