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
     * Actions performed after any render of this Application.
     * @param {ApplicationRenderContext} context - Prepared context data
     * @param {RenderOptions} options - Provided render options
     * @protected
     */
    _onRender(context, options) {
      super._onRender?.(context, options);
      this._attachGroupNameListeners();
    }

    /**
     * Attach change listeners to group name inputs
     * @private
     */
    _attachGroupNameListeners() {
      if (!this.element) return;

      const nameInputs = this.element.querySelectorAll(
        ".erps-action-card-group__name",
      );
      nameInputs.forEach((input) => {
        // Remove existing listeners to avoid duplicates
        input.removeEventListener("change", this._handleGroupNameChange);
        input.removeEventListener("blur", this._handleGroupNameChange);

        // Add listeners
        input.addEventListener(
          "change",
          this._handleGroupNameChange.bind(this),
        );
        input.addEventListener("blur", this._handleGroupNameChange.bind(this));
      });
    }

    /**
     * Handle group name input change
     * @param {Event} event - The change/blur event
     * @private
     */
    async _handleGroupNameChange(event) {
      const input = event.target;
      const groupId = input.dataset.groupId;
      const newName = input.value.trim();

      if (!groupId || !newName) return;

      try {
        const existingGroups = this.actor.system.actionCardGroups || [];
        const groupIndex = existingGroups.findIndex((g) => g._id === groupId);

        if (groupIndex === -1) return;

        // Only update if name changed
        if (newName !== existingGroups[groupIndex].name) {
          const updatedGroups = [...existingGroups];
          updatedGroups[groupIndex] = {
            ...updatedGroups[groupIndex],
            name: newName,
            _id: groupId,
          };
          await this.actor.update({ "system.actionCardGroups": updatedGroups });

          Logger.debug(
            `Renamed group to: ${newName}`,
            { groupId },
            "ADDITIONAL_ACTIONS",
          );
        }
      } catch (error) {
        Logger.error("Failed to rename group", error, "ADDITIONAL_ACTIONS");
        // Revert input to original value
        const existingGroups = this.actor.system.actionCardGroups || [];
        const group = existingGroups.find((g) => g._id === groupId);
        if (group) {
          input.value = group.name;
        }
      }
    }

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
            const bypassableTypes = [
              "combatPower",
              "gear",
              "feature",
              "status",
            ];
            const bypass =
              (event.ctrlKey || event.metaKey) &&
              bypassableTypes.includes(item.type);

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

    /**
     * Create a new action card group with the specified card IDs
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @param {string[]} cardIds - Optional array of card IDs to add to the group
     * @protected
     */
    async _createActionCardGroup(_event, target, cardIds = []) {
      try {
        // Get existing groups
        const existingGroups = this.actor.system.actionCardGroups || [];

        // Find highest group number to generate unique name
        let highestNumber = 0;
        for (const group of existingGroups) {
          const match = group.name.match(/^Group (\d+)$/);
          if (match) {
            highestNumber = Math.max(highestNumber, parseInt(match[1], 10));
          }
        }

        const newGroupNumber = highestNumber + 1;
        const newGroupName = `Group ${newGroupNumber}`;

        // Generate new group ID
        const newGroupId = foundry.utils.randomID();

        // Create new group
        const newGroup = {
          _id: newGroupId,
          name: newGroupName,
          collapsed: false,
          sort: existingGroups.length * 100000,
        };

        // Add group to actor
        const updatedGroups = [...existingGroups, newGroup];
        await this.actor.update({ "system.actionCardGroups": updatedGroups });

        // If card IDs provided, assign them to the group
        if (cardIds.length > 0) {
          const updates = cardIds.map((id, index) => ({
            _id: id,
            "system.groupId": newGroupId,
            sort: index * 100000,
          }));
          await this.actor.updateEmbeddedDocuments("Item", updates);
        }

        // Re-render to show the new group
        this.render();

        Logger.debug(
          `Created action card group: ${newGroupName}`,
          { groupId: newGroupId, cardCount: cardIds.length },
          "ADDITIONAL_ACTIONS",
        );

        ui.notifications.info(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Actor.ActionCards.CreateGroupSuccess",
            {
              name: newGroupName,
            },
          ),
        );

        return newGroupId;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Create action card group for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.CreateGroupError",
          ),
        });
      }
    }

    /**
     * Delete an action card group (moves cards to ungrouped)
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _deleteActionCardGroup(_event, target) {
      try {
        const groupId =
          target.dataset.groupId ||
          target.closest("[data-group-id]")?.dataset.groupId;
        if (!groupId) {
          Logger.warn(
            "No group ID found for delete",
            { target },
            "ADDITIONAL_ACTIONS",
          );
          return;
        }

        const existingGroups = this.actor.system.actionCardGroups || [];
        const group = existingGroups.find((g) => g._id === groupId);

        if (!group) {
          Logger.warn(`Group not found: ${groupId}`, {}, "ADDITIONAL_ACTIONS");
          return;
        }

        // Confirm deletion
        const confirmed = await foundry.applications.api.DialogV2.confirm({
          title: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.ContextMenu.DeleteGroup",
          ),
          content: game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Actor.ActionCards.DeleteGroupConfirm",
            {
              name: group.name,
            },
          ),
        });

        if (!confirmed) return;

        // Find all cards in this group
        const cardsInGroup = this.actor.items.filter(
          (i) => i.type === "actionCard" && i.system.groupId === groupId,
        );

        // Update cards to remove groupId
        if (cardsInGroup.length > 0) {
          const updates = cardsInGroup.map((card) => ({
            _id: card.id,
            "system.groupId": null,
          }));
          await this.actor.updateEmbeddedDocuments("Item", updates);
        }

        // Remove group from actor
        const updatedGroups = existingGroups.filter((g) => g._id !== groupId);
        await this.actor.update({ "system.actionCardGroups": updatedGroups });

        Logger.debug(
          `Deleted action card group: ${group.name}`,
          { groupId, cardCount: cardsInGroup.length },
          "ADDITIONAL_ACTIONS",
        );

        ui.notifications.info(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Actor.ActionCards.DeleteGroupSuccess",
            {
              name: group.name,
            },
          ),
        );
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Delete action card group for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.DeleteGroupError",
          ),
        });
      }
    }

    /**
     * Toggle the collapsed state of an action card group (session-only)
     * @param {PointerEvent} event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _toggleGroupCollapse(event, target) {
      try {
        const groupId =
          target.dataset.groupId ||
          target.closest("[data-group-id]")?.dataset.groupId;
        if (!groupId) {
          Logger.warn(
            "No group ID found for toggle collapse",
            { target },
            "ADDITIONAL_ACTIONS",
          );
          return;
        }

        Logger.debug(
          "Toggling group collapse",
          { groupId },
          "ADDITIONAL_ACTIONS",
        );

        // Initialize collapsed groups set if not exists
        if (!this._collapsedGroups) {
          this._collapsedGroups = new Set();
        }

        // Toggle the collapsed state
        if (this._collapsedGroups.has(groupId)) {
          this._collapsedGroups.delete(groupId);
          Logger.debug(`Expanded group: ${groupId}`, {}, "ADDITIONAL_ACTIONS");
        } else {
          this._collapsedGroups.add(groupId);
          Logger.debug(`Collapsed group: ${groupId}`, {}, "ADDITIONAL_ACTIONS");
        }

        // Re-render to update UI
        this.render();

        Logger.debug(
          `Toggled group collapse: ${groupId}`,
          { collapsed: this._collapsedGroups.has(groupId) },
          "ADDITIONAL_ACTIONS",
        );
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Toggle group collapse for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.UI,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.ToggleGroupError",
          ),
        });
      }
    }
  };
