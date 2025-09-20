import { Logger } from "../../services/logger.mjs";

const FilePicker = foundry.applications.apps.FilePicker.implementation;

/**
 * Item Sheet Actions Mixin
 *
 * Provides action methods for item sheets including:
 * - Image editing (reused from actor sheet pattern)
 * - Combat power management for transformations
 * - Embedded item and effect management for action cards
 * - Effect creation, deletion, and toggling
 * - Document viewing and editing
 *
 * @param {class} BaseClass - The base item sheet class to extend
 * @returns {class} Extended class with action functionality
 */
export const ItemSheetActionsMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Handle changing a Document's image.
     * Reused pattern from actor sheet for consistency.
     *
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @returns {Promise}
     * @protected
     */
    static async _onEditImage(_event, target) {
      Logger.methodEntry("ItemSheetActionsMixin", "_onEditImage", {
        itemName: this.item?.name,
        itemType: this.item?.type,
        targetDataset: target.dataset,
      });

      try {
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
          callback: (path) => {
            this.document.update({ [attr]: path });
          },
          top: this.position.top + 40,
          left: this.position.left + 10,
        });

        Logger.info(
          "Image picker opened for item",
          {
            itemName: this.item.name,
            currentImage: current,
            attribute: attr,
          },
          "ITEM_ACTIONS",
        );

        Logger.methodExit("ItemSheetActionsMixin", "_onEditImage");
        return fp.browse();
      } catch (error) {
        Logger.error("Failed to open image picker", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.ImagePickerFailed", {
            itemName: this.item?.name || "Unknown",
          }),
        );
        Logger.methodExit("ItemSheetActionsMixin", "_onEditImage");
        throw error;
      }
    }

    /**
     * Handle removing a combat power from a transformation
     *
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _removeCombatPower(_event, target) {
      Logger.methodEntry("ItemSheetActionsMixin", "_removeCombatPower", {
        itemName: this.item?.name,
        itemType: this.item?.type,
        powerId: target.dataset.powerId,
      });

      try {
        const powerId = target.dataset.powerId;
        if (!powerId) {
          Logger.warn("No power ID provided for removal", {}, "ITEM_ACTIONS");
          return;
        }

        await this.item.system.removeCombatPower(powerId);

        Logger.info(
          "Combat power removed from transformation",
          {
            transformationName: this.item.name,
            powerId,
          },
          "ITEM_ACTIONS",
        );

        Logger.methodExit("ItemSheetActionsMixin", "_removeCombatPower");
      } catch (error) {
        Logger.error("Failed to remove combat power", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.CombatPowerRemovalFailed",
            {
              itemName: this.item?.name || "Unknown",
            },
          ),
        );
        Logger.methodExit("ItemSheetActionsMixin", "_removeCombatPower");
      }
    }

    /**
     * Handle removing an action card from a transformation
     *
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _removeActionCard(_event, target) {
      Logger.methodEntry("ItemSheetActionsMixin", "_removeActionCard", {
        itemName: this.item?.name,
        itemType: this.item?.type,
        actionCardId: target.dataset.actionCardId,
      });

      try {
        const actionCardId = target.dataset.actionCardId;
        if (!actionCardId) {
          Logger.warn("No action card ID provided for removal", {}, "ITEM_ACTIONS");
          return;
        }

        await this.item.system.removeActionCard(actionCardId);

        Logger.info(
          "Action card removed from transformation",
          {
            transformationName: this.item.name,
            actionCardId,
          },
          "ITEM_ACTIONS",
        );

        Logger.methodExit("ItemSheetActionsMixin", "_removeActionCard");
      } catch (error) {
        Logger.error("Failed to remove action card", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.ActionCardRemovalFailed",
            {
              itemName: this.item?.name || "Unknown",
            },
          ),
        );
        Logger.methodExit("ItemSheetActionsMixin", "_removeActionCard");
      }
    }

    /**
     * Handle editing an embedded action card from a transformation
     *
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _editEmbeddedActionCard(_event, target) {
      Logger.methodEntry("ItemSheetActionsMixin", "_editEmbeddedActionCard", {
        itemName: this.item?.name,
        itemType: this.item?.type,
      });

      try {
        // Find the specific action card to edit using the data-action-card-id
        const actionCardId = target.dataset.actionCardId;
        if (!actionCardId) {
          Logger.warn("No action card ID found on target element", {}, "ITEM_ACTIONS");
          return;
        }

        const actionCardList = this.item.system.getEmbeddedActionCards();
        if (!actionCardList || actionCardList.length === 0) {
          Logger.warn("No embedded action cards found", {}, "ITEM_ACTIONS");
          return;
        }

        // Find the specific action card by ID
        const actionCard = actionCardList.find((ac) => ac.id === actionCardId);
        if (!actionCard) {
          Logger.warn(
            "Action card not found for editing",
            { actionCardId, availableIds: actionCardList.map(ac => ac.id) },
            "ITEM_ACTIONS"
          );
          return;
        }

        Logger.info(
          "Opening embedded action card for editing",
          {
            transformationName: this.item.name,
            actionCardName: actionCard.name,
            actionCardId: actionCard.id,
          },
          "ITEM_ACTIONS",
        );

        actionCard.sheet.render(true);
        Logger.methodExit("ItemSheetActionsMixin", "_editEmbeddedActionCard");
      } catch (error) {
        Logger.error("Failed to edit embedded action card", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.ActionCardEditFailed",
            {
              itemName: this.item?.name || "Unknown",
            },
          ),
        );
        Logger.methodExit("ItemSheetActionsMixin", "_editEmbeddedActionCard");
      }
    }

    /**
     * Handle dice adjustment input changes to recalculate totals
     *
     * @param {Event} _event - The originating change event
     * @param {HTMLElement} _target - The capturing HTML element which defined a [data-action]
     * @protected
     */
    static async _onDiceAdjustmentChange(_event, _target) {
      // The form submission will handle the actual update and recalculation
      // This is just a placeholder for any additional logic if needed
      Logger.debug(
        "Dice adjustment change detected",
        {
          itemName: this.item?.name,
          itemType: this.item?.type,
        },
        "ITEM_ACTIONS",
      );
    }

    /**
     * Renders an embedded document's sheet.
     * Handles both combat powers and effects.
     *
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @returns {Promise<void>}
     * @protected
     */
    static async _viewDoc(_event, target) {
      Logger.methodEntry("ItemSheetActionsMixin", "_viewDoc", {
        itemName: this.item?.name,
        itemType: this.item?.type,
        targetDataset: target.dataset,
      });

      try {
        const docRow = target.closest("li");

        // Handle viewing embedded combat powers
        if (this.item.type === "transformation" && docRow.dataset.itemId) {
          const powerId = docRow.dataset.itemId;
          const embeddedPowers = this.item.system.getEmbeddedCombatPowers();
          const power = embeddedPowers.find((p) => p.id === powerId);

          if (power) {
            Logger.info(
              "Opening embedded combat power sheet",
              {
                transformationName: this.item.name,
                powerName: power.name,
                powerId,
              },
              "ITEM_ACTIONS",
            );

            // Open the sheet in read-only mode since these are temporary items
            // that can't be properly saved due to their parent relationship
            Logger.methodExit("ItemSheetActionsMixin", "_viewDoc");
            return power.sheet.render(true, { readOnly: true });
          }
        }

        // Handle viewing effects
        if (docRow.dataset.effectId) {
          const effect = this.item.effects.get(docRow.dataset.effectId);
          if (effect) {
            Logger.info(
              "Opening effect sheet",
              {
                itemName: this.item.name,
                effectName: effect.name,
                effectId: docRow.dataset.effectId,
              },
              "ITEM_ACTIONS",
            );

            effect.sheet.render(true);
          }
        }

        Logger.methodExit("ItemSheetActionsMixin", "_viewDoc");
      } catch (error) {
        Logger.error("Failed to view document", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.DocumentViewFailed", {
            itemName: this.item?.name || "Unknown",
          }),
        );
        Logger.methodExit("ItemSheetActionsMixin", "_viewDoc");
      }
    }

    /**
     * Handles item deletion.
     *
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @returns {Promise<void>}
     * @protected
     */
    static async _deleteEffect(_event, target) {
      Logger.methodEntry("ItemSheetActionsMixin", "_deleteEffect", {
        itemName: this.item?.name,
        itemType: this.item?.type,
        targetDataset: target.dataset,
      });

      try {
        const effect = this._getEffect(target);
        if (!effect) {
          Logger.warn("No effect found for deletion", {}, "ITEM_ACTIONS");
          return;
        }

        await effect.delete();

        Logger.info(
          "Effect deleted successfully",
          {
            itemName: this.item.name,
            effectName: effect.name,
            effectId: effect.id,
          },
          "ITEM_ACTIONS",
        );

        Logger.methodExit("ItemSheetActionsMixin", "_deleteEffect");
      } catch (error) {
        Logger.error("Failed to delete effect", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.EffectDeletionFailed", {
            itemName: this.item?.name || "Unknown",
          }),
        );
        Logger.methodExit("ItemSheetActionsMixin", "_deleteEffect");
      }
    }

    /**
     * Creates a new Owned Item or ActiveEffect for the actor using initial data defined in the HTML dataset.
     *
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @returns {Promise<void>}
     * @private
     */
    static async _createEffect(_event, target) {
      Logger.methodEntry("ItemSheetActionsMixin", "_createEffect", {
        itemName: this.item?.name,
        itemType: this.item?.type,
        targetDataset: target.dataset,
      });

      try {
        // Retrieve the configured document class for ActiveEffect
        const aeCls = foundry.utils.getDocumentClass("ActiveEffect");
        // Prepare the document creation data by initializing it a default name.
        // As of v12, you can define custom Active Effect subtypes just like Item subtypes if you want
        const effectData = {
          name: aeCls.defaultName({
            // defaultName handles an undefined type gracefully
            type: target.dataset.type,
            parent: this.item,
          }),
        };
        // Loop through the dataset and add it to our effectData
        for (const [dataKey, value] of Object.entries(target.dataset)) {
          // These data attributes are reserved for the action handling
          if (["action", "documentClass"].includes(dataKey)) continue;
          // Nested properties require dot notation in the HTML, e.g. anything with `system`
          foundry.utils.setProperty(effectData, dataKey, value);
        }

        // Finally, create the embedded document!
        const createdEffect = await aeCls.create(effectData, {
          parent: this.item,
        });

        Logger.info(
          "Effect created successfully",
          {
            itemName: this.item.name,
            effectName: createdEffect.name,
            effectId: createdEffect.id,
          },
          "ITEM_ACTIONS",
        );

        Logger.methodExit("ItemSheetActionsMixin", "_createEffect");
      } catch (error) {
        Logger.error("Failed to create effect", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.EffectCreationFailed", {
            itemName: this.item?.name || "Unknown",
          }),
        );
        Logger.methodExit("ItemSheetActionsMixin", "_createEffect");
      }
    }

    /**
     * Toggles the disabled state of an effect.
     *
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @returns {Promise<void>}
     * @private
     */
    static async _toggleEffect(_event, target) {
      Logger.methodEntry("ItemSheetActionsMixin", "_toggleEffect", {
        itemName: this.item?.name,
        itemType: this.item?.type,
        targetDataset: target.dataset,
      });

      try {
        const effect = this._getEffect(target);
        if (!effect) {
          Logger.warn("No effect found for toggling", {}, "ITEM_ACTIONS");
          return;
        }

        await effect.update({ disabled: !effect.disabled });

        Logger.info(
          "Effect toggled successfully",
          {
            itemName: this.item.name,
            effectName: effect.name,
            effectId: effect.id,
            newDisabledState: !effect.disabled,
          },
          "ITEM_ACTIONS",
        );

        Logger.methodExit("ItemSheetActionsMixin", "_toggleEffect");
      } catch (error) {
        Logger.error("Failed to toggle effect", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.EffectToggleFailed", {
            itemName: this.item?.name || "Unknown",
          }),
        );
        Logger.methodExit("ItemSheetActionsMixin", "_toggleEffect");
      }
    }

    /**
     * Handle clearing the embedded item from an action card
     * @param {Event} _event - The click event
     * @param {HTMLElement} _target - The target element
     * @private
     */
    static async _clearEmbeddedItem(_event, _target) {
      Logger.methodEntry("ItemSheetActionsMixin", "_clearEmbeddedItem", {
        itemName: this.item?.name,
        itemType: this.item?.type,
      });

      try {
        // Get the item from the sheet instance, not from the form
        const item = this.item;
        if (!item || item.type !== "actionCard") {
          Logger.warn(
            "Clear embedded item called on non-action card",
            { itemType: item?.type },
            "ITEM_ACTIONS",
          );
          return;
        }

        // Use a more reliable permission check
        const hasPermission =
          item.isOwner ||
          item.canUserModify(game.user, "update") ||
          game.user.isGM;

        if (!hasPermission) {
          Logger.warn(
            "User lacks permission to edit embedded item",
            {
              itemName: item.name,
              userId: game.user.id,
              isOwner: item.isOwner,
              canUserModify: item.canUserModify(game.user, "update"),
              isGM: game.user.isGM,
            },
            "ITEM_ACTIONS",
          );
          ui.notifications.warn(
            "You don't have permission to edit this action card's embedded items",
          );
          return;
        }

        await item.clearEmbeddedItem();

        Logger.info("Embedded item cleared successfully", null, "ITEM_ACTIONS");
        Logger.methodExit("ItemSheetActionsMixin", "_clearEmbeddedItem");
      } catch (error) {
        Logger.error("Failed to clear embedded item", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.ClearEmbeddedItemFailed",
          ),
        );
        Logger.methodExit("ItemSheetActionsMixin", "_clearEmbeddedItem");
      }
    }

    /**
     * Handle creating a new power as an embedded item in an action card
     * @param {Event} _event - The click event
     * @param {HTMLElement} _target - The target element
     * @private
     */
    static async _createNewPower(_event, _target) {
      Logger.methodEntry("ItemSheetActionsMixin", "_createNewPower", {
        itemName: this.item?.name,
        itemType: this.item?.type,
      });

      try {
        const item = this.item;
        if (!item || item.type !== "actionCard") {
          Logger.warn(
            "Create new power called on non-action card",
            { itemType: item?.type },
            "ITEM_ACTIONS",
          );
          return;
        }

        // Use a more reliable permission check
        const hasPermission =
          item.isOwner ||
          item.canUserModify(game.user, "update") ||
          game.user.isGM;

        if (!hasPermission) {
          Logger.warn(
            "User lacks permission to create new power",
            {
              itemName: item.name,
              userId: game.user.id,
              isOwner: item.isOwner,
              canUserModify: item.canUserModify(game.user, "update"),
              isGM: game.user.isGM,
            },
            "ITEM_ACTIONS",
          );
          ui.notifications.warn(
            "You don't have permission to edit this action card's embedded items",
          );
          return;
        }

        // Create a new combat power with default data inherited from the action card
        const newPowerData = {
          name: item.name,
          type: "combatPower",
          img: item.img,
          system: {
            description: item.system.description,
            prerequisites: "",
            targeted: true,
            bgColor: item.system.bgColor,
            textColor: item.system.textColor,
            roll: {
              type: "roll",
              ability: "unaugmented",
            },
          },
        };

        // Create a temporary Item document from the data
        const tempItem = new CONFIG.Item.documentClass(newPowerData, {
          parent: null,
        });

        await item.setEmbeddedItem(tempItem);

        Logger.info("New power created successfully", null, "ITEM_ACTIONS");
        Logger.methodExit("ItemSheetActionsMixin", "_createNewPower");
      } catch (error) {
        Logger.error("Failed to create new power", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.CreateNewPowerFailed",
          ),
        );
        Logger.methodExit("ItemSheetActionsMixin", "_createNewPower");
      }
    }

    /**
     * Handle creating a new status effect as an embedded effect in an action card
     * @param {Event} _event - The click event
     * @param {HTMLElement} _target - The target element
     * @private
     */
    static async _createNewStatus(_event, _target) {
      Logger.methodEntry("ItemSheetActionsMixin", "_createNewStatus", {
        itemName: this.item?.name,
        itemType: this.item?.type,
      });

      try {
        const item = this.item;
        if (!item || item.type !== "actionCard") {
          Logger.warn(
            "Create new status called on non-action card",
            { itemType: item?.type },
            "ITEM_ACTIONS",
          );
          return;
        }

        // Use a more reliable permission check
        const hasPermission =
          item.isOwner ||
          item.canUserModify(game.user, "update") ||
          game.user.isGM;

        if (!hasPermission) {
          Logger.warn(
            "User lacks permission to create new status",
            {
              itemName: item.name,
              userId: game.user.id,
              isOwner: item.isOwner,
              canUserModify: item.canUserModify(game.user, "update"),
              isGM: game.user.isGM,
            },
            "ITEM_ACTIONS",
          );
          ui.notifications.warn(
            "You don't have permission to edit this action card's embedded items",
          );
          return;
        }

        // Create a new status effect with default data inherited from the action card
        const newStatusData = {
          name: item.name,
          type: "status",
          img: item.img,
          system: {
            description: item.system.description,
            bgColor: item.system.bgColor,
            textColor: item.system.textColor,
          },
        };

        // Create a temporary Item document from the data
        const tempItem = new CONFIG.Item.documentClass(newStatusData, {
          parent: null,
        });

        await item.addEmbeddedEffect(tempItem);

        Logger.info("New status created successfully", null, "ITEM_ACTIONS");
        Logger.methodExit("ItemSheetActionsMixin", "_createNewStatus");
      } catch (error) {
        Logger.error("Failed to create new status", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.CreateNewStatusFailed",
          ),
        );
        Logger.methodExit("ItemSheetActionsMixin", "_createNewStatus");
      }
    }

    /**
     * Handle editing an embedded item from an action card
     * @param {Event} _event - The click event
     * @param {HTMLElement} _target - The target element
     * @private
     */
    static async _editEmbeddedItem(_event, _target) {
      Logger.methodEntry("ItemSheetActionsMixin", "_editEmbeddedItem", {
        itemName: this.item?.name,
        itemType: this.item?.type,
      });

      try {
        const item = this.item;
        if (!item || item.type !== "actionCard") {
          Logger.warn(
            "Edit embedded item called on non-action card",
            { itemType: item?.type },
            "ITEM_ACTIONS",
          );
          return;
        }

        // Use a more reliable permission check
        const hasPermission =
          item.isOwner ||
          item.canUserModify(game.user, "update") ||
          game.user.isGM;

        if (!hasPermission) {
          Logger.warn(
            "User lacks permission to edit embedded item",
            {
              itemName: item.name,
              userId: game.user.id,
              isOwner: item.isOwner,
              canUserModify: item.canUserModify(game.user, "update"),
              isGM: game.user.isGM,
            },
            "ITEM_ACTIONS",
          );
          ui.notifications.warn(
            "You don't have permission to edit this action card's embedded items",
          );
          return;
        }

        const embeddedItem = item.getEmbeddedItem();
        if (!embeddedItem) {
          Logger.warn("No embedded item found to edit", null, "ITEM_ACTIONS");
          return;
        }

        // Create and render the embedded item sheet using dynamic import
        const { EmbeddedItemSheet } = await import(
          "../sheets/embedded-item-sheet.mjs"
        );
        const sheet = new EmbeddedItemSheet(embeddedItem.toObject(), item);
        sheet.render(true);

        Logger.info(
          "Embedded item sheet opened",
          { itemName: embeddedItem.name },
          "ITEM_ACTIONS",
        );
        Logger.methodExit("ItemSheetActionsMixin", "_editEmbeddedItem");
      } catch (error) {
        Logger.error("Failed to edit embedded item", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.EditEmbeddedItemFailed",
          ),
        );
        Logger.methodExit("ItemSheetActionsMixin", "_editEmbeddedItem");
      }
    }

    /**
     * Handle editing an embedded effect from an action card
     * @param {Event} _event - The click event
     * @param {HTMLElement} target - The target element
     * @private
     */
    static async _editEmbeddedEffect(_event, target) {
      Logger.methodEntry("ItemSheetActionsMixin", "_editEmbeddedEffect", {
        itemName: this.item?.name,
        itemType: this.item?.type,
        effectId: target.dataset.effectId,
      });

      try {
        const item = this.item;
        const effectId = target.dataset.effectId;

        if (!item || item.type !== "actionCard") {
          Logger.warn(
            "Edit embedded effect called on non-action card",
            { itemType: item?.type },
            "ITEM_ACTIONS",
          );
          return;
        }

        // Check if user has permission to edit this action card
        const hasPermission =
          item.isOwner ||
          item.canUserModify(game.user, "update") ||
          game.user.isGM;

        if (!hasPermission) {
          Logger.warn(
            "User lacks permission to edit embedded effect",
            {
              itemName: item.name,
              userId: game.user.id,
              isOwner: item.isOwner,
              canUserModify: item.canUserModify(game.user, "update"),
              isGM: game.user.isGM,
            },
            "ITEM_ACTIONS",
          );
          ui.notifications.warn(
            "You don't have permission to edit this action card's embedded effects",
          );
          return;
        }

        if (!effectId) {
          Logger.warn(
            "No effect ID provided for editing",
            null,
            "ITEM_ACTIONS",
          );
          return;
        }

        const embeddedEffects = item.getEmbeddedEffects();
        const effect = embeddedEffects.find((e) => e.originalId === effectId);

        if (!effect) {
          Logger.warn(
            "Embedded effect not found",
            { effectId },
            "ITEM_ACTIONS",
          );
          return;
        }

        // Create and render the embedded effect sheet using dynamic import
        const { EmbeddedItemSheet } = await import(
          "../sheets/embedded-item-sheet.mjs"
        );
        const sheet = new EmbeddedItemSheet(effect.toObject(), item, {}, true);
        sheet.render(true);

        Logger.info(
          "Embedded effect sheet opened",
          { effectName: effect.name },
          "ITEM_ACTIONS",
        );
        Logger.methodExit("ItemSheetActionsMixin", "_editEmbeddedEffect");
      } catch (error) {
        Logger.error("Failed to edit embedded effect", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.EditEmbeddedEffectFailed",
          ),
        );
        Logger.methodExit("ItemSheetActionsMixin", "_editEmbeddedEffect");
      }
    }

    /**
     * Handle removing an embedded effect from an action card
     * @param {Event} _event - The click event
     * @param {HTMLElement} target - The target element
     * @private
     */
    static async _removeEmbeddedEffect(_event, target) {
      Logger.methodEntry("ItemSheetActionsMixin", "_removeEmbeddedEffect", {
        itemName: this.item?.name,
        itemType: this.item?.type,
        effectId: target.dataset.effectId,
      });

      try {
        const item = this.item;
        const effectId = target.dataset.effectId;

        if (!item || item.type !== "actionCard") {
          Logger.warn(
            "Remove embedded effect called on non-action card",
            { itemType: item?.type },
            "ITEM_ACTIONS",
          );
          return;
        }

        // Check if user has permission to edit this action card
        const hasPermission =
          item.isOwner ||
          item.canUserModify(game.user, "update") ||
          game.user.isGM;

        if (!hasPermission) {
          Logger.warn(
            "User lacks permission to remove embedded effect",
            {
              itemName: item.name,
              userId: game.user.id,
              isOwner: item.isOwner,
              canUserModify: item.canUserModify(game.user, "update"),
              isGM: game.user.isGM,
            },
            "ITEM_ACTIONS",
          );
          ui.notifications.warn(
            "You don't have permission to edit this action card's embedded effects",
          );
          return;
        }

        if (!effectId) {
          Logger.warn(
            "No effect ID provided for removal",
            null,
            "ITEM_ACTIONS",
          );
          return;
        }

        await item.removeEmbeddedEffect(effectId);

        Logger.info(
          "Embedded effect removed successfully",
          { effectId },
          "ITEM_ACTIONS",
        );
        Logger.methodExit("ItemSheetActionsMixin", "_removeEmbeddedEffect");
      } catch (error) {
        Logger.error("Failed to remove embedded effect", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.RemoveEmbeddedEffectFailed",
          ),
        );
        Logger.methodExit("ItemSheetActionsMixin", "_removeEmbeddedEffect");
      }
    }

    /**
     * Fetches the row with the data for the rendered embedded document.
     *
     * @param {HTMLElement} target - The element with the action
     * @returns {HTMLLIElement} The document's row
     * @private
     */
    _getEffect(target) {
      const li = target.closest(".effect");
      return this.item.effects.get(li?.dataset?.effectId);
    }
  };
