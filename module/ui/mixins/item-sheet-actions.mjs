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
      // CRITICAL FIX: Detect if this is being called on an embedded item sheet
      // and delegate to the correct embedded item method
      if (this.constructor.name === "EmbeddedItemSheet" || this.parentItem) {
        // Call the embedded item sheet's image editing method directly
        if (typeof this._onEditImageEmbedded === "function") {
          return this._onEditImageEmbedded(_event, target);
        } else if (this.constructor._onEditImageEmbedded) {
          return this.constructor._onEditImageEmbedded.call(
            this,
            _event,
            target,
          );
        }
        return;
      }

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

        return fp.browse();
      } catch (error) {
        Logger.error("Failed to open image picker", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.ImagePickerFailed", {
            itemName: this.item?.name || "Unknown",
          }),
        );
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
      try {
        const powerId = target.dataset.powerId;
        if (!powerId) {
          Logger.warn("No power ID provided for removal", {}, "ITEM_ACTIONS");
          return;
        }

        await this.item.system.removeCombatPower(powerId);
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
      try {
        const actionCardId = target.dataset.actionCardId;
        if (!actionCardId) {
          Logger.warn(
            "No action card ID provided for removal",
            {},
            "ITEM_ACTIONS",
          );
          return;
        }

        await this.item.system.removeActionCard(actionCardId);
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
      try {
        // Find the specific action card to edit using the data-action-card-id
        const actionCardId = target.dataset.actionCardId;
        if (!actionCardId) {
          Logger.warn(
            "No action card ID found on target element",
            {},
            "ITEM_ACTIONS",
          );
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
            { actionCardId, availableIds: actionCardList.map((ac) => ac.id) },
            "ITEM_ACTIONS",
          );
          return;
        }

        actionCard.sheet.render(true);
      } catch (error) {
        Logger.error(
          "Failed to edit embedded action card",
          error,
          "ITEM_ACTIONS",
        );
        ui.notifications.error(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.ActionCardEditFailed", {
            itemName: this.item?.name || "Unknown",
          }),
        );
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
      try {
        const docRow = target.closest("li");

        // Handle viewing embedded combat powers
        if (this.item.type === "transformation" && docRow.dataset.itemId) {
          const powerId = docRow.dataset.itemId;
          const embeddedPowers = this.item.system.getEmbeddedCombatPowers();
          const power = embeddedPowers.find((p) => p.id === powerId);

          if (power) {
            // Open the sheet in read-only mode since these are temporary items
            // that can't be properly saved due to their parent relationship
            return power.sheet.render(true, { readOnly: true });
          }
        }

        // Handle viewing effects
        if (docRow.dataset.effectId) {
          const effect = this.item.effects.get(docRow.dataset.effectId);
          if (effect) {
            effect.sheet.render(true);
          }
        }
      } catch (error) {
        Logger.error("Failed to view document", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.DocumentViewFailed", {
            itemName: this.item?.name || "Unknown",
          }),
        );
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
      try {
        const effect = this._getEffect(target);
        if (!effect) {
          Logger.warn("No effect found for deletion", {}, "ITEM_ACTIONS");
          return;
        }

        await effect.delete();
      } catch (error) {
        Logger.error("Failed to delete effect", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.EffectDeletionFailed", {
            itemName: this.item?.name || "Unknown",
          }),
        );
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
        await aeCls.create(effectData, {
          parent: this.item,
        });
      } catch (error) {
        Logger.error("Failed to create effect", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.EffectCreationFailed", {
            itemName: this.item?.name || "Unknown",
          }),
        );
      }
    }

    /**
     * Create a new document (like ActiveEffect) on this item
     * This method handles document creation
     * @param {Event} _event - The triggering event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @returns {Promise<void>}
     * @private
     */
    static async _createDoc(_event, target) {
      try {
        const { documentClass } = target.dataset;

        if (!documentClass) {
          throw new Error("Document class not specified");
        }

        // Get the document class
        const docCls = foundry.utils.getDocumentClass(documentClass);

        if (!docCls) {
          throw new Error(`Document class ${documentClass} not found`);
        }

        // Prepare the document creation data
        const createData = {
          name: docCls.defaultName({
            type: target.dataset.type,
            parent: this.item,
          }),
        };

        // Loop through the dataset and add it to our createData
        for (const [dataKey, value] of Object.entries(target.dataset)) {
          // These data attributes are reserved for the action handling
          if (["action", "documentClass"].includes(dataKey)) continue;
          // Nested properties require dot notation in the HTML
          foundry.utils.setProperty(createData, dataKey, value);
        }

        // Create the embedded document
        await docCls.create(createData, {
          parent: this.item,
        });
      } catch (error) {
        Logger.error("Failed to create document", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.DocumentCreationFailed", {
            itemName: this.item?.name || "Unknown",
            documentClass: target.dataset.documentClass || "Unknown",
          }),
        );
      }
    }

    /**
     * Delete a document (like ActiveEffect) from this item
     * Routes to the appropriate specific delete method
     * @param {Event} event - The triggering event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @returns {Promise<void>}
     * @private
     */
    static async _deleteDoc(event, target) {
      try {
        const { documentClass } = target.dataset;

        if (!documentClass) {
          throw new Error("Document class not specified");
        }

        // Route to the appropriate specific delete method
        if (documentClass === "ActiveEffect") {
          // Call the existing deleteEffect method
          await this._deleteEffect(event, target);
        } else {
          // Handle other document types if needed in the future
          throw new Error(`Deletion of ${documentClass} not yet implemented`);
        }
      } catch (error) {
        Logger.error("Failed to delete document", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.DocumentDeletionFailed", {
            itemName: this.item?.name || "Unknown",
            documentClass: target.dataset.documentClass || "Unknown",
          }),
        );
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
      try {
        const effect = this._getEffect(target);
        if (!effect) {
          Logger.warn("No effect found for toggling", {}, "ITEM_ACTIONS");
          return;
        }

        await effect.update({ disabled: !effect.disabled });
      } catch (error) {
        Logger.error("Failed to toggle effect", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.EffectToggleFailed", {
            itemName: this.item?.name || "Unknown",
          }),
        );
      }
    }

    /**
     * Handle clearing the embedded item from an action card
     * @param {Event} _event - The click event
     * @param {HTMLElement} _target - The target element
     * @private
     */
    static async _clearEmbeddedItem(_event, _target) {
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
            game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Errors.NoPermissionEditEmbeddedItems",
            ),
          );
          return;
        }

        await item.clearEmbeddedItem();

        // Explicitly render the sheet to ensure it updates
        this.render();
      } catch (error) {
        Logger.error("Failed to clear embedded item", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.ClearEmbeddedItemFailed",
          ),
        );
      }
    }

    /**
     * Handle creating a new power as an embedded item in an action card
     * @param {Event} _event - The click event
     * @param {HTMLElement} _target - The target element
     * @private
     */
    static async _createNewPower(_event, _target) {
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
            game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Errors.NoPermissionEditEmbeddedItems",
            ),
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

        // Explicitly render the sheet to ensure it updates
        this.render();
      } catch (error) {
        Logger.error("Failed to create new power", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.CreateNewPowerFailed"),
        );
      }
    }

    /**
     * Handle creating a new status effect as an embedded effect in an action card
     * @param {Event} _event - The click event
     * @param {HTMLElement} _target - The target element
     * @private
     */
    static async _createNewStatus(_event, _target) {
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
            game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Errors.NoPermissionEditEmbeddedItems",
            ),
          );
          return;
        }

        // Double-check that there are no existing embedded effects (race condition protection)
        const currentEffects = item.system.embeddedStatusEffects || [];
        if (currentEffects.length > 0) {
          Logger.warn(
            "Create new status called but effects still exist - possible race condition",
            { currentEffectCount: currentEffects.length },
            "ITEM_ACTIONS",
          );
          ui.notifications.warn(
            game.i18n.localize("EVENTIDE_RP_SYSTEM.UI.PleaseWait"),
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
          effects: [
            {
              _id: foundry.utils.randomID(),
              name: `${item.name} Effect`,
              img: item.img,
              changes: [],
              disabled: false,
              duration: {
                startTime: null,
                seconds: 18000, // 5 hours - matches the effect creator pattern for displayOnToken
                combat: "",
                rounds: 0,
                turns: 0,
                startRound: 0,
                startTurn: 0,
              },
              description: "",
              origin: "",
              tint: item.system.textColor || "#ffffff",
              transfer: true,
              statuses: new Set(),
              flags: {},
            },
          ],
        };

        // Create a temporary Item document from the data
        const tempItem = new CONFIG.Item.documentClass(newStatusData, {
          parent: null,
        });

        await item.addEmbeddedEffect(tempItem);

        // Explicitly render the sheet to ensure it updates
        this.render();
      } catch (error) {
        Logger.error("Failed to create new status", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.CreateNewStatusFailed"),
        );
      }
    }

    /**
     * Handle creating a new transformation as an embedded transformation in an action card
     * @param {Event} _event - The click event
     * @param {HTMLElement} _target - The target element
     * @private
     */
    static async _createNewTransformation(_event, _target) {
      try {
        const item = this.item;
        if (!item || item.type !== "actionCard") {
          Logger.warn(
            "Create new transformation called on non-action card",
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
            "User lacks permission to create new transformation",
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
            game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Errors.NoPermissionEditEmbeddedItems",
            ),
          );
          return;
        }

        // Create a new transformation with default data inherited from the action card
        const newTransformationData = {
          name: item.name,
          type: "transformation",
          img: item.img,
          system: {
            description: item.system.description,
            size: 1,
            cursed: false,
            embeddedCombatPowers: [],
            resolveAdjustment: 0,
            powerAdjustment: 0,
            tokenImage: "",
          },
        };

        // Create a temporary Item document from the data
        const tempItem = new CONFIG.Item.documentClass(newTransformationData, {
          parent: null,
        });

        await item.addEmbeddedTransformation(tempItem);

        // Explicitly render the sheet to ensure it updates
        this.render();
      } catch (error) {
        Logger.error(
          "Failed to create new transformation",
          error,
          "ITEM_ACTIONS",
        );
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.CreateNewTransformationFailed",
          ),
        );
      }
    }

    /**
     * Handle editing an embedded item from an action card
     * @param {Event} _event - The click event
     * @param {HTMLElement} _target - The target element
     * @private
     */
    static async _editEmbeddedItem(_event, _target) {
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
            game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Errors.NoPermissionEditEmbeddedItems",
            ),
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
      } catch (error) {
        Logger.error("Failed to edit embedded item", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.EditEmbeddedItemFailed",
          ),
        );
      }
    }

    /**
     * Handle editing an embedded effect from an action card
     * @param {Event} _event - The click event
     * @param {HTMLElement} target - The target element
     * @private
     */
    static async _editEmbeddedEffect(_event, target) {
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
            game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Errors.NoPermissionEditEmbeddedEffects",
            ),
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
      } catch (error) {
        Logger.error("Failed to edit embedded effect", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.EditEmbeddedEffectFailed",
          ),
        );
      }
    }

    /**
     * Handle removing an embedded effect from an action card
     * @param {Event} _event - The click event
     * @param {HTMLElement} target - The target element
     * @private
     */
    static async _removeEmbeddedEffect(_event, target) {
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
            game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Errors.NoPermissionEditEmbeddedEffects",
            ),
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

        // Explicitly render the sheet to ensure it updates
        this.render();
      } catch (error) {
        Logger.error("Failed to remove embedded effect", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.RemoveEmbeddedEffectFailed",
          ),
        );
      }
    }

    /**
     * Handle editing an embedded transformation on an action card
     * @param {Event} _event - The click event
     * @param {HTMLElement} target - The target element
     * @private
     */
    static async _editEmbeddedTransformation(_event, target) {
      try {
        const item = this.item;
        const transformationId = target.dataset.transformationId;

        if (!item || item.type !== "actionCard") {
          Logger.warn(
            "Edit embedded transformation called on non-action card",
            { itemType: item?.type },
            "ITEM_ACTIONS",
          );
          return;
        }

        // Check if user has permission to edit this action card
        const hasPermission =
          item.isOwner || game.user.isGM || item.getUserLevel() >= 2;

        if (!hasPermission) {
          Logger.warn(
            "User does not have permission to edit embedded transformations",
            {
              userId: game.user.id,
              userName: game.user.name,
              itemOwnerId: item.ownership,
              userLevel: item.getUserLevel(),
            },
            "ITEM_ACTIONS",
          );
          ui.notifications.warn(
            game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Errors.NoPermissionEditEmbeddedTransformations",
            ),
          );
          return;
        }

        if (!transformationId) {
          Logger.warn(
            "No transformation ID provided for editing",
            null,
            "ITEM_ACTIONS",
          );
          return;
        }

        // Get the embedded transformations
        const embeddedTransformations = await item.getEmbeddedTransformations();
        const transformation = embeddedTransformations.find(
          (t) => t.id === transformationId,
        );

        if (!transformation) {
          Logger.warn(
            "Transformation not found in embedded transformations",
            { transformationId },
            "ITEM_ACTIONS",
          );
          return;
        }

        // Open the transformation sheet
        await transformation.sheet.render(true);
      } catch (error) {
        Logger.error(
          "Failed to edit embedded transformation",
          error,
          "ITEM_ACTIONS",
        );
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.EditEmbeddedTransformationFailed",
          ),
        );
      }
    }

    /**
     * Handle creating a new combat power for a transformation
     * @param {Event} _event - The click event
     * @param {HTMLElement} _target - The target element
     * @private
     */
    static async _createNewCombatPower(_event, _target) {
      try {
        const item = this.item;
        if (!item || item.type !== "transformation") {
          Logger.warn(
            "Create new combat power called on non-transformation",
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
            "User lacks permission to create new combat power",
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
            game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Errors.NoPermissionEditTransformationCombatPowers",
            ),
          );
          return;
        }

        // Create a new combat power with default data inherited from the transformation
        const newPowerData = {
          name: `${item.name} Power`,
          type: "combatPower",
          img: item.img,
          system: {
            description: `Combat power from ${item.name} transformation`,
            prerequisites: "",
            targeted: true,
            bgColor: "#8B4513",
            textColor: "#ffffff",
            roll: {
              type: "roll",
              ability: "unaugmented",
              bonus: 0,
              diceAdjustments: {
                advantage: 0,
                disadvantage: 0,
                total: 0,
              },
            },
          },
        };

        // Create a temporary Item document from the data
        const tempItem = new CONFIG.Item.documentClass(newPowerData, {
          parent: null,
        });

        await item.system.addCombatPower(tempItem);

        // Explicitly render the sheet to ensure it updates
        this.render();
      } catch (error) {
        Logger.error(
          "Failed to create new combat power",
          error,
          "ITEM_ACTIONS",
        );
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.CreateNewCombatPowerFailed",
          ),
        );
      }
    }

    /**
     * Handle creating a new action card for a transformation
     * @param {Event} _event - The click event
     * @param {HTMLElement} _target - The target element
     * @private
     */
    static async _createNewActionCard(_event, _target) {
      try {
        const item = this.item;
        if (!item || item.type !== "transformation") {
          Logger.warn(
            "Create new action card called on non-transformation",
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
            "User lacks permission to create new action card",
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
            game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Errors.NoPermissionEditTransformationActionCards",
            ),
          );
          return;
        }

        // Create a new action card with default data inherited from the transformation
        const newActionCardData = {
          name: `${item.name} Action`,
          type: "actionCard",
          img: item.img,
          system: {
            description: `Action card from ${item.name} transformation`,
            bgColor: "#8B4513",
            textColor: "#ffffff",
            mode: "attackChain",
            attackChain: {
              firstStat: "acro",
              secondStat: "phys",
              damageCondition: "never",
              damageFormula: "1d6",
              damageType: "damage",
              damageThreshold: 15,
              statusCondition: "oneSuccess",
              statusThreshold: 15,
            },
            embeddedItem: {},
            embeddedStatusEffects: [],
            embeddedTransformations: [],
            transformationConfig: {
              condition: "oneSuccess",
              threshold: 15,
            },
            savedDamage: {
              formula: "1d6",
              type: "damage",
              description: "",
            },
            advanceInitiative: false,
            attemptInventoryReduction: false,
            repetitions: "1",
            repeatToHit: false,
            damageApplication: false,
            statusApplicationLimit: 1,
            timingOverride: 0.0,
            costOnRepetition: false,
            failOnFirstMiss: true,
          },
        };

        // Create a temporary Item document from the data
        const tempItem = new CONFIG.Item.documentClass(newActionCardData, {
          parent: null,
        });

        await item.system.addActionCard(tempItem);

        // Explicitly render the sheet to ensure it updates
        this.render();
      } catch (error) {
        Logger.error("Failed to create new action card", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.CreateNewActionCardFailed",
          ),
        );
      }
    }

    /**
     * Handle removing an embedded transformation from an action card
     * @param {Event} _event - The click event
     * @param {HTMLElement} target - The target element
     * @private
     */
    static async _removeEmbeddedTransformation(_event, target) {
      try {
        const item = this.item;
        const transformationId = target.dataset.transformationId;

        if (!item || item.type !== "actionCard") {
          Logger.warn(
            "Remove embedded transformation called on non-action card",
            { itemType: item?.type },
            "ITEM_ACTIONS",
          );
          return;
        }

        // Check if user has permission to edit this action card
        const hasPermission =
          item.isOwner || game.user.isGM || item.getUserLevel() >= 2;

        if (!hasPermission) {
          Logger.warn(
            "User does not have permission to remove embedded transformations",
            {
              userId: game.user.id,
              userName: game.user.name,
              itemOwnerId: item.ownership,
              userLevel: item.getUserLevel(),
            },
            "ITEM_ACTIONS",
          );
          ui.notifications.warn(
            game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Errors.NoPermissionEditEmbeddedTransformations",
            ),
          );
          return;
        }

        if (!transformationId) {
          Logger.warn(
            "No transformation ID provided for removal",
            null,
            "ITEM_ACTIONS",
          );
          return;
        }

        await item.removeEmbeddedTransformation(transformationId);

        // Explicitly render the sheet to ensure it updates
        this.render();
      } catch (error) {
        Logger.error(
          "Failed to remove embedded transformation",
          error,
          "ITEM_ACTIONS",
        );
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.RemoveEmbeddedTransformationFailed",
          ),
        );
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

    /**
     * Attach change listeners to group name inputs
     * @private
     */
    _attachGroupNameListeners() {
      if (!this.element) return;

      // Initialize bound handler storage if it doesn't exist
      if (!this._boundGroupNameHandlers) {
        this._boundGroupNameHandlers = new WeakMap();
      }

      const nameInputs = this.element.querySelectorAll(
        ".erps-action-card-group__name",
      );
      nameInputs.forEach((input) => {
        // Get or create bound handler for this input
        let boundHandler = this._boundGroupNameHandlers.get(input);

        if (boundHandler) {
          // Remove existing listeners to avoid duplicates
          input.removeEventListener("change", boundHandler);
          input.removeEventListener("blur", boundHandler);
        } else {
          // Create and store bound handler
          boundHandler = this._handleGroupNameChange.bind(this);
          this._boundGroupNameHandlers.set(input, boundHandler);
        }

        // Add listeners with consistent bound reference
        input.addEventListener("change", boundHandler);
        input.addEventListener("blur", boundHandler);
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
        const existingGroups = this.item.system.actionCardGroups || [];
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
          await this.item.update({ "system.actionCardGroups": updatedGroups });

          Logger.debug(
            `Renamed group to: ${newName}`,
            { groupId },
            "ITEM_SHEET_ACTIONS",
          );
        }
      } catch (error) {
        Logger.error("Failed to rename group", error, "ITEM_SHEET_ACTIONS");
        // Revert input to original value
        const existingGroups = this.item.system.actionCardGroups || [];
        const group = existingGroups.find((g) => g._id === groupId);
        if (group) {
          input.value = group.name;
        }
      }
    }

    /**
     * Create a new action card group for transformation
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The button element
     * @returns {Promise<void>}
     * @private
     */
    static async _createActionCardGroup(_event, _target) {
      if (this.item.type !== "transformation") {
        Logger.warn(
          "Can only create action card groups on transformations",
          {},
          "ITEM_SHEET_ACTIONS",
        );
        return;
      }

      try {
        const existingGroups = this.item.system.actionCardGroups || [];
        const newGroupId = foundry.utils.randomID();

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

        // Determine sort order for new group
        const maxSort =
          existingGroups.length > 0
            ? Math.max(...existingGroups.map((g) => g.sort || 0))
            : 0;

        const newGroup = {
          _id: newGroupId,
          name: newGroupName,
          sort: maxSort + 1,
        };

        const updatedGroups = [...existingGroups, newGroup];
        await this.item.update({ "system.actionCardGroups": updatedGroups });

        Logger.debug(
          "Created action card group",
          { groupId: newGroupId },
          "ITEM_SHEET_ACTIONS",
        );

        ui.notifications.info(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Actor.ActionCards.CreateGroupSuccess",
            {
              name: newGroup.name,
            },
          ),
        );
      } catch (error) {
        Logger.error(
          "Failed to create action card group",
          error,
          "ITEM_SHEET_ACTIONS",
        );
        ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.CreateGroupError"),
        );
      }
    }

    /**
     * Delete an action card group from transformation
     * @param {Event} event - The click event
     * @param {HTMLElement} target - The button element
     * @returns {Promise<void>}
     * @private
     */
    static async _deleteActionCardGroup(event, target) {
      if (this.item.type !== "transformation") {
        Logger.warn(
          "Can only delete action card groups from transformations",
          {},
          "ITEM_SHEET_ACTIONS",
        );
        return;
      }

      try {
        const groupId =
          target.dataset.groupId ||
          target.closest("[data-group-id]")?.dataset.groupId;
        if (!groupId) {
          Logger.warn(
            "No group ID found for delete",
            { target },
            "ITEM_SHEET_ACTIONS",
          );
          return;
        }

        const existingGroups = this.item.system.actionCardGroups || [];
        const group = existingGroups.find((g) => g._id === groupId);

        if (!group) {
          Logger.warn("Group not found", { groupId }, "ITEM_SHEET_ACTIONS");
          return;
        }

        // Confirm deletion
        const confirmed = await foundry.applications.api.DialogV2.confirm({
          title: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Actor.ActionCards.DeleteGroup",
          ),
          content: game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Actor.ActionCards.DeleteGroupConfirm",
            {
              name: group.name,
            },
          ),
        });

        if (!confirmed) return;

        // Remove the group
        const updatedGroups = existingGroups.filter((g) => g._id !== groupId);

        // Un-group all action cards in this group
        const actionCards = this.item.system.embeddedActionCards || [];
        const updatedActionCards = actionCards.map((card) => {
          if (card.system?.groupId === groupId) {
            const updatedCard = foundry.utils.deepClone(card);
            delete updatedCard.system.groupId;
            return updatedCard;
          }
          return card;
        });

        await this.item.update({
          "system.actionCardGroups": updatedGroups,
          "system.embeddedActionCards": updatedActionCards,
        });

        Logger.debug(
          "Deleted action card group",
          { groupId },
          "ITEM_SHEET_ACTIONS",
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
        Logger.error(
          "Failed to delete action card group",
          error,
          "ITEM_SHEET_ACTIONS",
        );
        ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.DeleteGroupError"),
        );
      }
    }

    /**
     * Wrapper for creating context menus with overflow handling and drop zone disabling
     * This fixes the issue where context menus get clipped by parent containers with overflow:hidden
     * and disables drop zones to prevent focus fighting between context menu and drop zones
     *
     * @param {ContextMenu} contextMenu - The context menu instance to enhance
     * @param {string} stopSelector - CSS selector for the container to stop at when searching for overflow parents
     * @private
     */
    _enhanceContextMenuWithOverflowFix(contextMenu, stopSelector = ".window-content") {
      if (!contextMenu) return;

      // Check if this context menu has already been enhanced
      // This prevents duplicate onOpen/onClose handlers when context menus are rebound
      if (contextMenu._erpsOverflowFixApplied) {
        return;
      }

      // Mark this context menu as enhanced to prevent duplicate enhancement
      contextMenu._erpsOverflowFixApplied = true;

      // Override the onOpen callback to fix overflow clipping and disable drop zones
      const originalOnOpen = contextMenu.onOpen;
      contextMenu.onOpen = (target) => {
        // Check if a context menu is already open for this sheet
        // Multiple context menus can match the same click target (e.g., row selector + tab selector)
        // Only the first one should create the scrollbar hide style
        if (this._contextMenuOpen) {
          if (originalOnOpen) originalOnOpen.call(contextMenu, target);
          return;
        }

        // Cancel any pending cleanup from a previous menu close
        // This handles rapid open/close/reopen scenarios where the cleanup
        // timer hasn't fired yet but a new menu is being opened
        if (this._contextMenuCleanupTimer) {
          clearTimeout(this._contextMenuCleanupTimer);
          this._contextMenuCleanupTimer = null;
        }

        // Mark that a context menu is now open
        this._contextMenuOpen = true;

        // Find parent containers with overflow hidden
        const containers = [];
        let current = target;

        // Stop at the specified container
        const stopElement = target.closest(stopSelector);

        while (current && current !== stopElement) {
          const computedStyle = window.getComputedStyle(current);

          // Check any element with overflow hidden
          if (
            computedStyle.overflow === "hidden" ||
            computedStyle.overflowY === "hidden"
          ) {
            containers.push({
              element: current,
              overflow: current.style.overflow,
              overflowY: current.style.overflowY,
            });
            current.style.setProperty("overflow", "visible", "important");
            current.style.setProperty("overflowY", "visible", "important");
          }
          current = current.parentElement;
        }
        // Store for restoration
        this._overflowContainers = containers;

        // Disable ALL drop zones globally while context menu is open
        this._disableAllDropZones();

        // Add scoped style to hide scrollbars only for this specific sheet instance
        const scrollbarHideStyle = document.createElement("style");
        scrollbarHideStyle.id = `erps-context-menu-scrollbar-hide-${this.id}`;

        // Get unique identifier for this sheet to scope the style
        const sheetId = this.element.id || this.element.getAttribute('data-appid');

        scrollbarHideStyle.textContent = `
          #${sheetId} *,
          #${sheetId} *::before,
          #${sheetId} *::after {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          #${sheetId} *::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
        `;
        document.head.appendChild(scrollbarHideStyle);
        this._scrollbarHideStyle = scrollbarHideStyle;

        if (originalOnOpen) originalOnOpen.call(contextMenu, target);
      };

      // Override the onClose callback to restore overflow and re-enable drop zones
      const originalOnClose = contextMenu.onClose;
      const self = this; // Capture the correct 'this' context for item sheet
      contextMenu.onClose = () => {
        // Clear the context menu open flag immediately to allow rapid reopen
        // This must happen synchronously to handle double right-click scenarios
        self._contextMenuOpen = false;

        // Call original close first to allow animation to complete
        if (originalOnClose) originalOnClose.call(contextMenu);

        // Delay restoration to allow ContextMenu animation to complete
        // The animation uses getBoundingClientRect which needs the menu visible
        window.requestAnimationFrame(() => {
          self._contextMenuCleanupTimer = window.setTimeout(() => {

            // Restore all overflow values
            if (self._overflowContainers) {
              for (const {
                element,
                overflow,
                overflowY,
              } of self._overflowContainers) {
                element.style.overflow = overflow;
                element.style.overflowY = overflowY;
              }
              self._overflowContainers = [];
            }

            // Remove scrollbar hide style
            if (self._scrollbarHideStyle) {
              self._scrollbarHideStyle.remove();
              self._scrollbarHideStyle = null;
            }

            // Force scrollbars to redisplay by triggering a reflow
            // This ensures the browser recalculates scrollbar visibility
            if (self.element) {
              // eslint-disable-next-line no-unused-expressions
              self.element.offsetHeight; // Force reflow
            }

            // Re-enable ALL drop zones globally
            self._enableAllDropZones();

            // Clear the cleanup timer reference
            self._contextMenuCleanupTimer = null;
          }, 100); // Wait for animation to complete (Foundry's default is ~50ms)
        });
      };
    }

    /**
     * Disable ALL drop zones globally to prevent focus fighting with context menus
     * This affects drop zones across all sheets, including other item sheets
     * @private
     */
    _disableAllDropZones() {
      const dropZones = document.querySelectorAll("[data-drop-zone]");
      dropZones.forEach((zone) => {
        zone.classList.add("erps-drop-zone-disabled");
        zone.style.pointerEvents = "none";
      });
    }

    /**
     * Re-enable ALL drop zones globally after context menu closes
     * @private
     */
    _enableAllDropZones() {
      const dropZones = document.querySelectorAll("[data-drop-zone]");
      dropZones.forEach((zone) => {
        zone.classList.remove("erps-drop-zone-disabled");
        zone.style.pointerEvents = "";
      });
    }

    /**
     * Create context menu for transformation action cards to move them between groups
     * @private
     */
    _createTransformationActionCardContextMenu() {
      try {
        const contextMenu = this._createContextMenu(
          () => this._getTransformationActionCardContextOptions(),
          ".tab.embedded-action-cards .erps-data-table__row[data-item-id]",
        );

        // Store reference for potential cleanup
        if (contextMenu) {
          this._transformationActionCardContextMenu = contextMenu;

          // Apply overflow fix - stop at the embedded action cards tab (same as actor sheet)
          this._enhanceContextMenuWithOverflowFix(contextMenu, ".tab.embedded-action-cards");
        } else {
          Logger.warn(
            "Context menu not created for transformation action cards",
            {},
            "ITEM_SHEET_ACTIONS",
          );
        }
      } catch (error) {
        Logger.error(
          "Failed to create transformation action card context menu",
          error,
          "ITEM_SHEET_ACTIONS",
        );
      }
    }

    /**
     * Get context menu options for transformation action cards
     * @returns {Array<ContextMenuEntry>} Array of context menu entries
     * @private
     */
    _getTransformationActionCardContextOptions() {
      const groups = this.item.system.actionCardGroups || [];

      return [
        {
          name: "EVENTIDE_RP_SYSTEM.ContextMenu.MoveToGroup",
          icon: '<i class="fas fa-folder-open"></i>',
          callback: (target) => {
            const itemId = target.dataset.itemId;
            this._showMoveToGroupDialogForTransformation(itemId, groups);
          },
        },
        {
          name: "EVENTIDE_RP_SYSTEM.ContextMenu.RemoveFromGroup",
          icon: '<i class="fas fa-folder-minus"></i>',
          condition: (target) => {
            const itemId = target.dataset.itemId;
            const actionCards = this.item.system.embeddedActionCards || [];
            const actionCard = actionCards.find((card) => card._id === itemId);
            return actionCard && actionCard.system.groupId;
          },
          callback: async (target) => {
            const itemId = target.dataset.itemId;
            const actionCards = this.item.system.embeddedActionCards || [];
            const actionCard = actionCards.find((card) => card._id === itemId);

            if (actionCard && actionCard.system.groupId) {
              const removedGroupId = actionCard.system.groupId;

              // Update the embedded action card's groupId using deepClone
              const updatedActionCards = actionCards.map((card) => {
                if (card._id === itemId) {
                  const updatedCard = foundry.utils.deepClone(card);
                  updatedCard.system.groupId = null;
                  return updatedCard;
                }
                return card;
              });

              // Check if the group is now empty
              let updatedGroups = this.item.system.actionCardGroups || [];
              const cardsInGroup = updatedActionCards.filter(
                (card) => card.system?.groupId === removedGroupId,
              );

              if (cardsInGroup.length === 0) {
                // Remove the empty group
                updatedGroups = updatedGroups.filter((g) => g._id !== removedGroupId);
              }

              await this.item.update({
                "system.embeddedActionCards": updatedActionCards,
                "system.actionCardGroups": updatedGroups,
              });
            }
          },
        },
        {
          name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewGroup",
          icon: '<i class="fas fa-folder-plus"></i>',
          callback: async (target) => {
            const itemId = target.dataset.itemId;

            // Create the new group first
            const existingGroups = this.item.system.actionCardGroups || [];
            const newGroupId = foundry.utils.randomID();

            // Find highest group number
            let highestNumber = 0;
            for (const group of existingGroups) {
              const match = group.name.match(/^Group (\d+)$/);
              if (match) {
                highestNumber = Math.max(highestNumber, parseInt(match[1], 10));
              }
            }

            const newGroupNumber = highestNumber + 1;
            const newGroupName = `Group ${newGroupNumber}`;

            const maxSort =
              existingGroups.length > 0
                ? Math.max(...existingGroups.map((g) => g.sort || 0))
                : 0;

            const newGroup = {
              _id: newGroupId,
              name: newGroupName,
              sort: maxSort + 1,
            };

            const updatedGroups = [...existingGroups, newGroup];

            // Update the action card's groupId
            const actionCards = this.item.system.embeddedActionCards || [];
            const updatedActionCards = actionCards.map((card) => {
              if (card._id === itemId) {
                const updatedCard = foundry.utils.deepClone(card);
                updatedCard.system.groupId = newGroupId;
                return updatedCard;
              }
              return card;
            });

            // Update both groups and action cards
            await this.item.update({
              "system.actionCardGroups": updatedGroups,
              "system.embeddedActionCards": updatedActionCards,
            });
          },
        },
      ];
    }

    /**
     * Show dialog to select a group for moving a transformation action card
     * @param {string} itemId - The ID of the action card
     * @param {Array} groups - Available groups
     * @private
     */
    async _showMoveToGroupDialogForTransformation(itemId, groups) {
      // Get the current group of this action card
      const actionCards = this.item.system.embeddedActionCards || [];
      const actionCard = actionCards.find((card) => card._id === itemId);
      const currentGroupId = actionCard?.system.groupId;

      // Filter out the current group from available options
      const availableGroups = currentGroupId
        ? groups.filter((group) => group._id !== currentGroupId)
        : groups;

      // Check if there are no groups available
      if (availableGroups.length === 0) {
        ui.notifications.warn(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.ContextMenu.NoGroupsAvailable",
          ),
        );
        return;
      }

      const groupChoices = availableGroups.reduce((acc, group) => {
        acc[group._id] = group.name;
        return acc;
      }, {});

      const result = await foundry.applications.api.DialogV2.prompt({
        window: {
          title: game.i18n.localize("EVENTIDE_RP_SYSTEM.ContextMenu.MoveToGroup"),
        },
        content: `
          <form>
            <div class="form-group">
              <label>${game.i18n.localize("EVENTIDE_RP_SYSTEM.ContextMenu.SelectGroup")}</label>
              <select name="groupId">
                ${Object.entries(groupChoices)
                  .map(([id, name]) => `<option value="${id}">${name}</option>`)
                  .join("")}
              </select>
            </div>
          </form>
        `,
        rejectClose: false,
        modal: true,
        ok: {
          label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Confirm"),
          callback: (event, button) => button.form.elements.groupId.value,
        },
      });

      if (result) {
        // Update the action card's groupId
        const actionCards = this.item.system.embeddedActionCards || [];
        const updatedActionCards = actionCards.map((card) => {
          if (card._id === itemId) {
            const updatedCard = foundry.utils.deepClone(card);
            updatedCard.system.groupId = result;
            return updatedCard;
          }
          return card;
        });

        await this.item.update({
          "system.embeddedActionCards": updatedActionCards,
        });
      }
    }

    /**
     * Create context menu for transformation group headers
     * @private
     */
    _createTransformationGroupHeaderContextMenu() {
      const contextMenu = this._createContextMenu(
        () => this._getTransformationGroupHeaderContextOptions(),
        ".erps-action-card-group__header",
      );

      if (contextMenu) {
        this._transformationGroupHeaderContextMenu = contextMenu;
        this._enhanceContextMenuWithOverflowFix(
          contextMenu,
          ".tab.embedded-action-cards",
        );
      }
    }

    /**
     * Get context menu options for transformation group headers
     * @returns {Array<ContextMenuEntry>} Array of context menu entries
     * @private
     */
    _getTransformationGroupHeaderContextOptions() {
      return [
        {
          name: "EVENTIDE_RP_SYSTEM.ContextMenu.CreateActionInGroup",
          icon: '<i class="fas fa-plus"></i>',
          callback: async (target) => {
            const groupId =
              target.dataset.groupId ||
              target.closest("[data-group-id]")?.dataset.groupId;
            if (groupId) {
              // Create new embedded action card with groupId
              const existingCards = this.item.system.embeddedActionCards || [];
              const newCard = {
                _id: foundry.utils.randomID(),
                name: game.i18n.localize(
                  "EVENTIDE_RP_SYSTEM.Item.New.ActionCard",
                ),
                type: "actionCard",
                img: "icons/svg/item-bag.svg",
                system: {
                  groupId,
                  mode: "attackChain",
                  bgColor: "#8B4513",
                  textColor: "#ffffff",
                },
              };

              await this.item.update({
                "system.embeddedActionCards": [...existingCards, newCard],
              });

              // Open embedded item sheet for editing
              const EmbeddedItemSheet = (
                await import("../sheets/embedded-item-sheet.mjs")
              ).default;
              const sheet = new EmbeddedItemSheet({
                document: this.item,
                embeddedItemId: newCard._id,
              });
              sheet.render(true);
            }
          },
        },
      ];
    }

    /**
     * Create context-sensitive context menus for transformation tab content areas
     * @private
     */
    _createTransformationTabContentContextMenus() {
      // Embedded items tab
      this._createTransformationTabContextMenu("embeddedItems", "feature");
      // Embedded combat powers tab
      this._createTransformationTabContextMenu(
        "embeddedCombatPowers",
        "combatPower",
      );
      // Embedded action cards tab
      this._createTransformationTabContextMenu(
        "embeddedActionCards",
        "actionCard",
      );
    }

    /**
     * Create a context menu for a specific transformation tab
     * @param {string} tabName - The tab name (e.g., "embeddedItems")
     * @param {string} itemType - The item type to create (e.g., "feature")
     * @private
     */
    _createTransformationTabContextMenu(tabName, itemType) {
      const tabClass = tabName
        .replace(/([A-Z])/g, "-$1")
        .toLowerCase()
        .replace(/^-/, "");
      const contextMenu = this._createContextMenu(
        () => this._getTransformationTabContextOptions(itemType),
        `.tab.${tabClass}`,
      );

      if (contextMenu) {
        this[`_${tabName}TabContextMenu`] = contextMenu;
        this._enhanceContextMenuWithOverflowFix(contextMenu, `.tab.${tabClass}`);
      }
    }

    /**
     * Get context menu options for transformation tab content areas
     * @param {string} itemType - The item type to create
     * @returns {Array<ContextMenuEntry>} Array of context menu entries
     * @private
     */
    _getTransformationTabContextOptions(itemType) {
      return [
        {
          name: `EVENTIDE_RP_SYSTEM.ContextMenu.CreateNew${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`,
          icon: '<i class="fas fa-plus"></i>',
          callback: async () => {
            await this._createEmbeddedItemInTab(itemType);
          },
        },
      ];
    }

    /**
     * Create an embedded item in the appropriate transformation tab
     * @param {string} itemType - The item type to create
     * @private
     */
    async _createEmbeddedItemInTab(itemType) {
      // Map item types to tab IDs and embedded fields
      const tabMap = {
        feature: { tabId: "embeddedItems", field: "embeddedActionCards" },
        status: { tabId: "embeddedItems", field: "embeddedActionCards" },
        gear: { tabId: "embeddedItems", field: "embeddedActionCards" },
        combatPower: {
          tabId: "embeddedCombatPowers",
          field: "embeddedCombatPowers",
        },
        actionCard: {
          tabId: "embeddedActionCards",
          field: "embeddedActionCards",
        },
      };

      const mapping = tabMap[itemType];
      if (!mapping) return;

      // Switch to the correct tab
      if (this.tabGroups.primary !== mapping.tabId) {
        await this.changeTab(mapping.tabId, "primary");
      }

      // Create the embedded item
      const newId = foundry.utils.randomID();
      const existingItems = this.item.system[mapping.field] || [];

      const newItem = {
        _id: newId,
        name: game.i18n.localize(
          `EVENTIDE_RP_SYSTEM.Item.New.${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`,
        ),
        type: itemType,
        img: "icons/svg/item-bag.svg",
        system: this._getDefaultSystemData(itemType),
      };

      await this.item.update({
        [`system.${mapping.field}`]: [...existingItems, newItem],
      });

      // Open embedded item sheet for editing
      const EmbeddedItemSheet = (
        await import("../sheets/embedded-item-sheet.mjs")
      ).default;
      const sheet = new EmbeddedItemSheet({
        document: this.item,
        embeddedItemId: newId,
      });
      sheet.render(true);
    }

    /**
     * Get default system data for a given item type
     * @param {string} itemType - The item type
     * @returns {object} Default system data
     * @private
     */
    _getDefaultSystemData(itemType) {
      const defaults = {
        feature: {
          bgColor: "#70B87A",
          textColor: "#ffffff",
          targeted: false,
          roll: {
            type: "none",
            ability: "unaugmented",
            bonus: 0,
            diceAdjustments: { advantage: 0, disadvantage: 0, total: 0 },
          },
        },
        status: {
          bgColor: "#7A70B8",
          textColor: "#ffffff",
        },
        gear: {
          bgColor: "#8B4513",
          textColor: "#ffffff",
          equipped: true,
          quantity: 1,
          className: "other",
        },
        combatPower: {
          bgColor: "#B8860B",
          textColor: "#ffffff",
          cost: 1,
          targeted: true,
          roll: {
            type: "none",
            ability: "unaugmented",
            bonus: 0,
            diceAdjustments: { advantage: 0, disadvantage: 0, total: 0 },
          },
        },
        actionCard: {
          mode: "attackChain",
          bgColor: "#8B4513",
          textColor: "#ffffff",
        },
      };

      return defaults[itemType] || {};
    }
  };
