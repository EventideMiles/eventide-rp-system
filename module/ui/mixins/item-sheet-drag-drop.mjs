import { Logger } from "../../services/logger.mjs";
import { EventideDialog } from "../components/_module.mjs";

const { TextEditor } = foundry.applications.ux;

/**
 * Item Sheet Drag-Drop Management Mixin
 *
 * Provides comprehensive drag-drop functionality for item sheets including:
 * - Drag start/end handling for embedded items and effects
 * - Drop zone visual feedback
 * - Action card specific drop logic with category selection
 * - Transformation combat power handling
 * - Gear category selection dialogs
 *
 * @param {class} BaseClass - The base item sheet class to extend
 * @returns {class} Extended class with drag-drop functionality
 */
export const ItemSheetDragDropMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Define whether a user is able to begin a dragstart workflow for a given drag selector
     * @param {string} selector - The candidate HTML selector for dragging
     * @returns {boolean} Can the current user drag this selector?
     * @protected
     */
    _canDragStart(_selector) {
      return this.isEditable;
    }

    /**
     * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
     * @param {string} selector - The candidate HTML selector for the drop target
     * @returns {boolean} Can the current user drop on this selector?
     * @protected
     */
    _canDragDrop(_selector) {
      return this.isEditable;
    }

    /**
     * Callback actions which occur at the beginning of a drag start workflow.
     * @param {DragEvent} event - The originating DragEvent
     * @protected
     */
    _onDragStart(event) {
      const li = event.currentTarget;
      if ("link" in event.target.dataset) return;

      let dragData = null;

      // Handle embedded combat powers from transformations
      if (this.item.type === "transformation" && li.dataset.itemId) {
        const powerId = li.dataset.itemId;
        const embeddedPowers = this.item.system.getEmbeddedCombatPowers();
        const power = embeddedPowers.find((p) => p.id === powerId);

        if (power) {
          // Create clean drag data without parent relationship to avoid embedded document errors
          const powerData = power.toObject();
          // Strip ID to prevent Foundry colliding IDs.
          delete powerData._id;

          dragData = {
            type: "Item",
            data: powerData,
            // Don't include uuid or parent information that would make Foundry think this is an embedded document
          };
        }
      }
      // Active Effect
      else if (li.dataset.effectId) {
        const effect = this.item.effects.get(li.dataset.effectId);
        dragData = effect.toDragData();
      }

      if (!dragData) return;

      // Set data transfer
      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));

      Logger.debug(
        "Drag start initiated from item sheet",
        {
          itemName: this.item?.name,
          itemType: this.item?.type,
          dragDataType: dragData.type,
          hasEmbeddedPower: !!li.dataset.itemId,
          hasEffect: !!li.dataset.effectId,
        },
        "DRAG_DROP",
      );
    }

    /**
     * Callback actions which occur when a dragged element is dropped on a target.
     * @param {DragEvent} event - The originating DragEvent
     * @protected
     */
    async _onDrop(event) {
      const data = TextEditor.implementation.getDragEventData(event);
      const item = this.item;
      const allowed = Hooks.call("dropItemSheetData", item, this, data);
      if (allowed === false) return;

      Logger.debug(
        "Drop event received on item sheet",
        {
          itemName: this.item?.name,
          itemType: this.item?.type,
          dropDataType: data.type,
        },
        "DRAG_DROP",
      );

      // Handle different data types
      switch (data.type) {
        case "ActiveEffect":
          return this._onDropActiveEffect(event, data);
        case "Actor":
          return this._onDropActor(event, data);
        case "Item":
          return this._onDropItem(event, data);
        case "Folder":
          return this._onDropFolder(event, data);
      }
    }

    /**
     * Callback actions which occur when a dragged element enters a drop target.
     * @param {DragEvent} event - The drag enter event
     * @protected
     */
    _onDragOver(event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";

      // Add visual feedback for action card sheets
      if (this.item.type === "actionCard") {
        this._addDragFeedback(event);
      }
    }

    /**
     * Callback actions which occur when a dragged element leaves a drop target.
     * @param {DragEvent} event - The drag leave event
     * @protected
     */
    _onDragLeave(event) {
      // Only remove feedback if we're actually leaving the sheet
      if (!this.element.contains(event.relatedTarget)) {
        this._removeDragFeedback();
      }
    }

    /**
     * Add visual feedback during drag operations
     * @param {DragEvent} event - The drag event
     * @private
     */
    _addDragFeedback(_event) {
      // Remove any existing feedback first
      this._removeDragFeedback();

      // For action cards, always highlight drop zones during drag
      if (this.item.type === "actionCard") {
        this._highlightValidDropZones("universal");
      }
    }

    /**
     * Highlight valid drop zones based on item type
     * @param {string} itemType - The type of item being dragged
     * @private
     */
    _highlightValidDropZones(_itemType) {
      const dropZones = this.element.querySelectorAll(
        ".erps-items-panel__drop-zone",
      );
      const actionCardSheet = this.element.querySelector(".tab.embedded-items");

      // Add drag-over class to all drop zones for universal feedback
      dropZones.forEach((zone) => {
        zone.classList.add("drag-over");
      });

      // Add a general drag feedback class to the action card sheet
      if (actionCardSheet) {
        actionCardSheet.classList.add("drag-active");
      }
    }

    /**
     * Remove all drag feedback
     * @private
     */
    _removeDragFeedback() {
      const dropZones = this.element.querySelectorAll(
        ".erps-items-panel__drop-zone",
      );
      const actionCardSheet = this.element.querySelector(".tab.embedded-items");

      dropZones.forEach((zone) => {
        zone.classList.remove("drag-over");
      });

      if (actionCardSheet) {
        actionCardSheet.classList.remove("drag-active");
      }
    }

    /**
     * Handles dropping of an Item onto this Item Sheet
     * @param {DragEvent} event - The concluding DragEvent which contains drop data
     * @param {object} data - The data transfer extracted from the event
     * @returns {Promise<Item[]|boolean>} The created Item objects or false if the drop was not permitted.
     * @protected
     */
    async _onDropItem(event, data) {
      // Remove drag feedback when drop occurs
      this._removeDragFeedback();
      if (!this.item.isOwner) return false;

      // Get the dropped item
      const droppedItem = await Item.implementation.fromDropData(data);
      if (!droppedItem) return false;

      Logger.debug(
        "Item dropped on item sheet",
        {
          itemName: this.item?.name,
          itemType: this.item?.type,
          droppedItemName: droppedItem.name,
          droppedItemType: droppedItem.type,
        },
        "DRAG_DROP",
      );

      // Handle transformation items receiving combat powers
      if (this.item.type === "transformation") {
        return this._handleTransformationDrop(droppedItem);
      }

      // Handle action cards receiving items and status effects
      if (this.item.type === "actionCard") {
        return this._handleActionCardDrop(event, droppedItem);
      }

      return false;
    }

    /**
     * Handle drops on transformation items
     * @param {Item} droppedItem - The item being dropped
     * @returns {Promise<boolean>} True if handled successfully
     * @private
     */
    async _handleTransformationDrop(droppedItem) {
      // Only allow combat powers to be added to transformations
      if (droppedItem.type !== "combatPower") {
        ui.notifications.warn(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.TransformationItemTypes",
          ),
        );
        return false;
      }

      try {
        await this.item.system.addCombatPower(droppedItem);
        Logger.info(
          "Combat power added to transformation",
          {
            transformationName: this.item.name,
            combatPowerName: droppedItem.name,
          },
          "DRAG_DROP",
        );
        return true;
      } catch (error) {
        Logger.error(
          "Failed to add combat power to transformation",
          error,
          "DRAG_DROP",
        );
        ui.notifications.error(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.FailedToAddCombatPower", {
            powerName: droppedItem.name,
            transformationName: this.item.name,
          }),
        );
        return false;
      }
    }

    /**
     * Handle drops on action card items
     * @param {DragEvent} event - The drop event
     * @param {Item} droppedItem - The item being dropped
     * @returns {Promise<boolean>} True if handled successfully
     * @private
     */
    async _handleActionCardDrop(event, droppedItem) {
      // Check what type of drop zone this is
      const dropZone = event.target.closest("[data-drop-zone]");
      const dropType = dropZone?.dataset.dropZone;

      // If dropped on a specific drop zone, use that logic
      if (dropType === "actionItem") {
        return this._handleActionItemDrop(droppedItem);
      } else if (dropType === "effect") {
        return this._handleEffectDrop(droppedItem);
      } else {
        // Universal drop - no specific drop zone found, route based on item type
        return this._handleUniversalActionCardDrop(droppedItem);
      }
    }

    /**
     * Handle drops on action item drop zones
     * @param {Item} droppedItem - The item being dropped
     * @returns {Promise<boolean>} True if handled successfully
     * @private
     */
    async _handleActionItemDrop(droppedItem) {
      const supportedTypes = ["combatPower", "gear", "feature"];
      if (!supportedTypes.includes(droppedItem.type)) {
        ui.notifications.warn(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.ActionCardItemTypes", {
            type: droppedItem.type,
            supported: supportedTypes.join(", "),
          }),
        );
        return false;
      }

      try {
        await this.item.setEmbeddedItem(droppedItem);
        Logger.info(
          "Item added to action card as action item",
          {
            actionCardName: this.item.name,
            itemName: droppedItem.name,
            itemType: droppedItem.type,
          },
          "DRAG_DROP",
        );
        return true;
      } catch (error) {
        Logger.error("Failed to add item to action card", error, "DRAG_DROP");
        ui.notifications.error(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.FailedToAddItemToActionCard",
            {
              itemName: droppedItem.name,
              actionCardName: this.item.name,
            },
          ),
        );
        return false;
      }
    }

    /**
     * Handle drops on effect drop zones
     * @param {Item} droppedItem - The item being dropped
     * @returns {Promise<boolean>} True if handled successfully
     * @private
     */
    async _handleEffectDrop(droppedItem) {
      const supportedTypes = ["status", "gear"];
      if (!supportedTypes.includes(droppedItem.type)) {
        ui.notifications.warn(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.ActionCardEffectTypes", {
            type: droppedItem.type,
            supported: supportedTypes.join(", "),
          }),
        );
        return false;
      }

      try {
        await this.item.addEmbeddedEffect(droppedItem);
        Logger.info(
          "Item added to action card as effect",
          {
            actionCardName: this.item.name,
            itemName: droppedItem.name,
            itemType: droppedItem.type,
          },
          "DRAG_DROP",
        );
        return true;
      } catch (error) {
        Logger.error("Failed to add effect to action card", error, "DRAG_DROP");
        ui.notifications.error(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.FailedToAddEffectToActionCard",
            {
              itemName: droppedItem.name,
              actionCardName: this.item.name,
            },
          ),
        );
        return false;
      }
    }

    /**
     * Handle universal drops on action cards when no specific drop zone is targeted
     * @param {Item} droppedItem - The item being dropped
     * @returns {Promise<boolean>} True if handled successfully
     * @private
     */
    async _handleUniversalActionCardDrop(droppedItem) {
      // Determine where the item should go based on its type
      const itemRouting = {
        combatPower: "actionItem",
        feature: "actionItem",
        status: "effect",
        gear: "needsSelection", // Special case - needs user choice
      };

      const destination = itemRouting[droppedItem.type];

      if (!destination) {
        ui.notifications.warn(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.ActionCardItemTypes", {
            type: droppedItem.type,
            supported: Object.keys(itemRouting).join(", "),
          }),
        );
        return false;
      }

      // Handle gear items that need category selection
      if (destination === "needsSelection") {
        return this._showGearCategoryDialog(droppedItem);
      }

      // Route to the appropriate destination
      if (destination === "actionItem") {
        const success = await this._handleActionItemDrop(droppedItem);
        if (success) {
          ui.notifications.info(
            game.i18n.format(
              "EVENTIDE_RP_SYSTEM.Item.ActionCard.ItemAddedToAction",
              {
                itemName: droppedItem.name,
              },
            ),
          );
        }
        return success;
      } else if (destination === "effect") {
        const success = await this._handleEffectDrop(droppedItem);
        if (success) {
          ui.notifications.info(
            game.i18n.format(
              "EVENTIDE_RP_SYSTEM.Item.ActionCard.ItemAddedToEffects",
              {
                itemName: droppedItem.name,
              },
            ),
          );
        }
        return success;
      }

      return false;
    }

    /**
     * Show gear category selection dialog using EventideDialog
     * @param {Item} gearItem - The gear item to categorize
     * @returns {Promise<boolean>} True if handled successfully
     * @private
     */
    async _showGearCategoryDialog(gearItem) {
      try {
        Logger.debug(
          "Showing gear category dialog",
          {
            gearItemName: gearItem.name,
            gearItemId: gearItem.id,
            actionCardName: this.item.name,
          },
          "DRAG_DROP",
        );

        const choice = await this._createGearCategoryDialog(gearItem);

        Logger.debug(
          "Gear category dialog result",
          {
            choice,
            gearItemName: gearItem.name,
            actionCardName: this.item.name,
          },
          "DRAG_DROP",
        );

        if (!choice) {
          Logger.debug("No choice made, dialog was cancelled", {}, "DRAG_DROP");
          return false;
        }

        // Add the gear item to the selected category
        if (choice === "actionItem") {
          Logger.debug("Adding gear as action item", {}, "DRAG_DROP");
          const success = await this._handleActionItemDrop(gearItem);
          if (success) {
            ui.notifications.info(
              game.i18n.format(
                "EVENTIDE_RP_SYSTEM.Item.ActionCard.GearAddedToAction",
                {
                  itemName: gearItem.name,
                },
              ),
            );
          }
          return success;
        } else if (choice === "effect") {
          Logger.debug("Adding gear as effect", {}, "DRAG_DROP");
          const success = await this._handleEffectDrop(gearItem);
          if (success) {
            ui.notifications.info(
              game.i18n.format(
                "EVENTIDE_RP_SYSTEM.Item.ActionCard.GearAddedToEffects",
                {
                  itemName: gearItem.name,
                },
              ),
            );
          }
          return success;
        }

        return false;
      } catch (error) {
        Logger.error("Failed to show gear category dialog", error, "DRAG_DROP");
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.ShowGearCategoryDialogFailed",
          ),
        );
        return false;
      }
    }

    /**
     * Create and show an EventideDialog for gear category selection
     * @param {Item} gearItem - The gear item to categorize
     * @returns {Promise<string|null>} The selected category or null if cancelled
     * @private
     */
    async _createGearCategoryDialog(gearItem) {
      let resolveChoice;
      const choicePromise = new Promise((resolve) => {
        resolveChoice = resolve;
      });

      const buttons = [
        {
          label: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Dialogs.GearMode.UseAsAction",
          ),
          action: "actionItem",
          cssClass: "erps-button erps-button--primary",
          icon: "fas fa-bolt",
        },
        {
          label: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Dialogs.GearMode.UseAsEffect",
          ),
          action: "effect",
          cssClass: "erps-button erps-button--primary",
          icon: "fas fa-magic",
        },
        {
          label: game.i18n.localize("EVENTIDE_RP_SYSTEM.Forms.Buttons.Close"),
          action: "cancel",
          cssClass: "erps-button",
          icon: "fas fa-times",
        },
      ];

      const callback = async (action, _data, _dialog) => {
        Logger.debug("Gear category dialog callback triggered", {
          action,
          gearItemName: gearItem.name,
        });

        if (action === "actionItem") {
          resolveChoice("actionItem");
          return true; // Close dialog
        } else if (action === "effect") {
          resolveChoice("effect");
          return true; // Close dialog
        } else if (action === "cancel") {
          resolveChoice(null);
          return true; // Close dialog
        }
        return false; // Keep dialog open
      };

      const templateData = {
        gearItem: {
          name: gearItem.name,
          img: gearItem.img,
        },
        questionText: game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.GearCategoryQuestion",
          { itemName: gearItem.name },
        ),
        actionItemTitle: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.ActionItem",
        ),
        actionItemDescription: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.ActionItemDescription",
        ),
        effectsTitle: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.Effects",
        ),
        effectsDescription: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Item.ActionCard.EffectsDescription",
        ),
      };

      try {
        const dialog = await EventideDialog.show({
          title: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Dialogs.GearMode.Title",
          ),
          template:
            "systems/eventide-rp-system/templates/dialogs/gear-category-dialog.hbs",
          data: templateData,
          buttons,
          callback,
          windowOptions: {
            icon: "fa-solid fa-sack",
            width: 650,
            height: "auto",
          },
        });

        // Set up a close handler to resolve with null if dialog is closed without selection
        const originalClose = dialog.close.bind(dialog);
        dialog.close = function (...args) {
          resolveChoice(null);
          return originalClose(...args);
        };

        // Wait for the user's choice
        return await choicePromise;
      } catch (error) {
        Logger.error("Failed to show gear category dialog", error);
        return null;
      }
    }

    /**
     * Handles the dropping of ActiveEffect data onto an Item Sheet.
     * Creates new effects or sorts existing ones.
     *
     * @param {DragEvent} event - The concluding DragEvent which contains drop data
     * @param {Object} data - The data transfer extracted from the event
     * @returns {Promise<ActiveEffect|boolean>} The created ActiveEffect object or false if it couldn't be created
     * @protected
     */
    async _onDropActiveEffect(event, data) {
      const aeCls = foundry.utils.getDocumentClass("ActiveEffect");
      const effect = await aeCls.fromDropData(data);
      if (!this.item.isOwner || !effect) return false;

      if (this.item.uuid === effect.parent?.uuid) {
        return this._onEffectSort(event, effect);
      }
      return aeCls.create(effect, { parent: this.item });
    }

    /**
     * Sorts an Active Effect based on its surrounding attributes.
     *
     * @param {DragEvent} event - The drag event
     * @param {ActiveEffect} effect - The effect being sorted
     * @returns {Promise<void>}
     * @protected
     */
    _onEffectSort(event, effect) {
      const effects = this.item.effects;
      const dropTarget = event.target.closest("[data-effect-id]");
      if (!dropTarget) return;

      const target = effects.get(dropTarget.dataset.effectId);

      // Don't sort on yourself
      if (effect.id === target.id) return;

      // Identify sibling items based on adjacent HTML elements
      const siblings = [];
      for (const el of dropTarget.parentElement.children) {
        const siblingId = el.dataset.effectId;
        if (siblingId && siblingId !== effect.id) {
          siblings.push(effects.get(el.dataset.effectId));
        }
      }

      // Perform the sort
      const sortUpdates = SortingHelpers.performIntegerSort(effect, {
        target,
        siblings,
      });
      const updateData = sortUpdates.map((u) => {
        const update = u.update;
        update._id = u.target._id;
        return update;
      });

      // Perform the update
      return this.item.updateEmbeddedDocuments("ActiveEffect", updateData);
    }

    /**
     * Handle dropping of an Actor data onto another Actor sheet
     * @param {DragEvent} event - The concluding DragEvent which contains drop data
     * @param {object} data - The data transfer extracted from the event
     * @returns {Promise<object|boolean>} A data object which describes the result of the drop, or false if the drop was not permitted.
     * @protected
     */
    async _onDropActor(_event, _data) {
      if (!this.item.isOwner) return false;
    }

    /**
     * Handle dropping of a Folder on an Actor Sheet.
     * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
     * @param {DragEvent} event - The concluding DragEvent which contains drop data
     * @param {object} data - The data transfer extracted from the event
     * @returns {Promise<Item[]>}
     * @protected
     */
    async _onDropFolder(_event, _data) {
      if (!this.item.isOwner) return [];
    }
  };
