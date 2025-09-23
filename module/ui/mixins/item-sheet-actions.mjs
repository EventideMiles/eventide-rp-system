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
          Logger.warn("No action card ID provided for removal", {}, "ITEM_ACTIONS");
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

        actionCard.sheet.render(true);
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
            "You don't have permission to edit this action card's embedded items",
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

        // Explicitly render the sheet to ensure it updates
        this.render();

      } catch (error) {
        Logger.error("Failed to create new power", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.CreateNewPowerFailed",
          ),
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
            "You don't have permission to edit this action card's embedded items",
          );
          return;
        }

        // Double-check that there are no existing embedded effects (race condition protection)
        const currentEffects = item.system.embeddedStatusEffects || [];
        if (currentEffects.length > 0) {
          Logger.warn(
            "Create new status called but effects still exist - possible race condition",
            { currentEffectCount: currentEffects.length },
            "ITEM_ACTIONS"
          );
          ui.notifications.warn(game.i18n.localize("EVENTIDE_RP_SYSTEM.UI.PleaseWait"));
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
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.CreateNewStatusFailed",
          ),
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
            "You don't have permission to edit this action card's embedded items",
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
        Logger.error("Failed to create new transformation", error, "ITEM_ACTIONS");
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
            "You don't have permission to edit this action card's embedded transformations",
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
        Logger.error("Failed to edit embedded transformation", error, "ITEM_ACTIONS");
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.EditEmbeddedTransformationFailed",
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
            "You don't have permission to edit this action card's embedded transformations",
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
        Logger.error("Failed to remove embedded transformation", error, "ITEM_ACTIONS");
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
  };
