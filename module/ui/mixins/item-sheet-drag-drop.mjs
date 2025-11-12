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
      const target = event.target;

      if ("link" in target.dataset) return;

      // Prevent dragging if clicking on interactive elements
      if (
        target.closest("[data-action]") ||
        target.closest(".erps-action-card-group__name") ||
        target.matches("button") ||
        target.matches("input") ||
        target.matches("a")
      ) {
        return;
      }

      // Store modifier keys for drop operation
      this._dragModifiers = {
        shift: event.shiftKey,
        ctrl: event.ctrlKey || event.metaKey,
      };

      let dragData = null;

      // Check if dragging a group from transformation
      // The drag selector matches the drag handle, so we need to find the group container
      if (
        this.item.type === "transformation" &&
        li.classList.contains("erps-action-card-group__drag-handle")
      ) {
        const groupContainer = li.closest(".erps-action-card-group");
        if (groupContainer) {
          const groupId = groupContainer.dataset.groupId;
          if (groupId) {
            const existingGroups = this.item.system.actionCardGroups || [];
            const group = existingGroups.find((g) => g._id === groupId);

            if (group) {
              dragData = {
                type: "Group",
                groupId,
                transformationId: this.item.id,
              };

              event.dataTransfer.setData(
                "text/plain",
                JSON.stringify(dragData),
              );
              groupContainer.classList.add("erps-action-card-group--dragging");

              Logger.debug(
                "Started dragging group from transformation",
                {
                  groupId,
                  groupName: group.name,
                  transformationId: this.item.id,
                },
                "DRAG_DROP",
              );
              return;
            }
          }
        }
      }

      // Handle embedded items from transformations (combat powers and action cards)
      if (this.item.type === "transformation" && li.dataset.itemId) {
        const itemId = li.dataset.itemId;

        // First try to find it in embedded combat powers
        const embeddedPowers = this.item.system.getEmbeddedCombatPowers();
        const power = embeddedPowers.find((p) => p.id === itemId);

        if (power) {
          // Create clean drag data for combat power
          const powerData = power.toObject();
          // Strip ID to prevent Foundry colliding IDs.
          delete powerData._id;

          dragData = {
            type: "Item",
            data: powerData,
            // Don't include uuid or parent information that would make Foundry think this is an embedded document
          };
        } else {
          // Try to find it in embedded action cards
          const embeddedActionCards = this.item.system.getEmbeddedActionCards();
          const actionCard = embeddedActionCards.find((ac) => ac.id === itemId);

          if (actionCard) {
            // For action cards, we need to support both internal sorting and external extraction
            const actionCardRow = li.closest(".erps-items-panel__item");
            if (actionCardRow && actionCardRow.dataset.itemId === itemId) {
              // Store the action card for sorting within transformation
              this._draggedActionCard = actionCard;
              this._draggedCardGroupId = actionCard.system?.groupId;

              // Add dragging class
              actionCardRow.classList.add("erps-items-panel__item--dragging");
            }

            // Create standard Item drag data for extraction
            // This works for BOTH internal sorting and external extraction
            const actionCardData = actionCard.toObject();
            delete actionCardData._id; // Strip ID to prevent collisions
            delete actionCardData.system.groupId; // Don't carry over group membership

            dragData = {
              type: "Item",
              data: actionCardData,
            };
          }
        }
      }
      // Handle embedded items and effects from action cards
      else if (
        this.item.type === "actionCard" &&
        li.dataset.itemId &&
        li.dataset.embeddedType
      ) {
        const embeddedType = li.dataset.embeddedType;
        const targetId = li.dataset.itemId;

        if (embeddedType === "action-item") {
          // Handle embedded action item
          const embeddedItem = this.item.getEmbeddedItem();
          if (embeddedItem && embeddedItem.id === targetId) {
            // Create clean drag data for the embedded action item
            const itemData = foundry.utils.deepClone(
              this.item.system.embeddedItem,
            );
            // Strip ID to prevent Foundry colliding IDs
            delete itemData._id;

            dragData = {
              type: "Item",
              data: itemData,
              // Don't include uuid or parent information that would make Foundry think this is an embedded document
            };
          }
        } else if (embeddedType === "effect") {
          // Handle embedded effects
          const embeddedEffects = this.item.getEmbeddedEffects();
          const targetEffect = embeddedEffects.find(
            (effect) => effect.id === targetId,
          );

          if (targetEffect) {
            // Get the original effect data from the raw storage
            // We need to find the matching effect data by recreating temp items and matching IDs
            const originalEffectData =
              this.item.system.embeddedStatusEffects?.find((effectData) => {
                const tempItem = new CONFIG.Item.documentClass(effectData, {
                  parent: null,
                });
                return tempItem.id === targetId;
              });

            if (originalEffectData) {
              // Create clean drag data for the embedded effect
              const effectData = foundry.utils.deepClone(originalEffectData);
              // Strip ID to prevent Foundry colliding IDs
              delete effectData._id;

              dragData = {
                type: "Item",
                data: effectData,
                // Don't include uuid or parent information that would make Foundry think this is an embedded document
              };
            }
          }
        } else if (embeddedType === "transformation") {
          // Handle embedded transformations
          const embeddedTransformations =
            this.item.getEmbeddedTransformations();
          const targetTransformation = embeddedTransformations.find(
            (transformation) => transformation.id === targetId,
          );

          if (targetTransformation) {
            // Get the original transformation data from the raw storage
            // We need to find the matching transformation data by recreating temp items and matching IDs
            const originalTransformationData =
              this.item.system.embeddedTransformations?.find(
                (transformationData) => {
                  const tempItem = new CONFIG.Item.documentClass(
                    transformationData,
                    { parent: null },
                  );
                  return tempItem.id === targetId;
                },
              );

            if (originalTransformationData) {
              // Create clean drag data for the embedded transformation
              const transformationData = foundry.utils.deepClone(
                originalTransformationData,
              );
              // Strip ID to prevent Foundry colliding IDs
              delete transformationData._id;

              dragData = {
                type: "Item",
                data: transformationData,
                // Don't include uuid or parent information that would make Foundry think this is an embedded document
              };
            }
          }
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

      // Clean up dragging state
      const draggingCards = this.element.querySelectorAll(
        ".erps-items-panel__item--dragging",
      );
      draggingCards.forEach((card) =>
        card.classList.remove("erps-items-panel__item--dragging"),
      );

      Logger.debug(
        "Drop event received on item sheet",
        {
          itemName: this.item?.name,
          itemType: this.item?.type,
          dropDataType: data.type,
          hasStoredActionCard: !!this._draggedActionCard,
        },
        "DRAG_DROP",
      );

      // Check if this is an internal transformation action card sort
      // (indicated by having a stored dragged card from _onDragStart)
      if (this._draggedActionCard && this.item.type === "transformation") {
        return this._onDropTransformationActionCard(event, data);
      }

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
        case "Group":
          return this._onDropGroup(event, data);
      }
    }

    /**
     * Handle dropping a transformation action card (for sorting/grouping within transformation)
     * @param {DragEvent} event - The drop event
     * @param {object} data - The drag data
     * @returns {Promise<boolean>} Success status
     * @private
     */
    async _onDropTransformationActionCard(event, _data) {
      try {
        const draggedCard = this._draggedActionCard;

        if (!draggedCard) {
          return false;
        }

        // Check if dropped on ungrouped zone FIRST (before checking for specific cards)
        const ungroupedZone = event.target.closest("[data-ungrouped-zone]");
        if (ungroupedZone && draggedCard.system.groupId) {
          // Ungroup the card
          await this._ungroupTransformationActionCard(draggedCard.id);
          return true;
        }

        // Check if dropped on another action card
        const dropTarget = event.target.closest("[data-item-id]");

        if (dropTarget && dropTarget.dataset.itemId !== draggedCard.id) {
          const targetId = dropTarget.dataset.itemId;
          const embeddedActionCards = this.item.system.getEmbeddedActionCards();
          const targetCard = embeddedActionCards.find(
            (ac) => ac.id === targetId,
          );

          if (targetCard) {
            return await this._handleTransformationActionCardSort(
              draggedCard,
              targetCard,
            );
          }
        }

        // Check if dropped on a group (not on a specific item)
        const groupTarget = event.target.closest(".erps-action-card-group");

        if (groupTarget) {
          return await this._handleTransformationCardDropOnGroup(
            draggedCard,
            groupTarget,
          );
        }

        return false;
      } catch (error) {
        Logger.error(
          "Failed to drop transformation action card",
          error,
          "DRAG_DROP",
        );
        return false;
      } finally {
        // Clean up drag state
        this._dragModifiers = null;
        this._draggedActionCard = null;
        this._draggedCardGroupId = null;
      }
    }

    /**
     * Handle sorting/grouping action cards within a transformation
     * @param {Item} draggedCard - The dragged action card
     * @param {Item} targetCard - The target action card
     * @returns {Promise<boolean>} Success status
     * @private
     */
    async _handleTransformationActionCardSort(draggedCard, targetCard) {
      const { shift, ctrl } = this._dragModifiers || {};

      // Shift+drag: Ungroup card
      if (shift && draggedCard.system.groupId) {
        await this._ungroupTransformationActionCard(draggedCard.id);
        return true;
      }

      // Ctrl+drag: Copy card (not supported for transformations yet)
      if (ctrl) {
        ui.notifications.warn(
          "Copying action cards within transformations is not yet supported",
        );
        return false;
      }

      // Check if dragging card onto another card to create/modify groups
      const draggedGroupId = draggedCard.system.groupId;
      const targetGroupId = targetCard.system.groupId;

      // Neither card is grouped - create a new group
      if (!draggedGroupId && !targetGroupId) {
        const groupId = await this._createTransformationActionCardGroup([
          draggedCard.id,
          targetCard.id,
        ]);
        Logger.debug(
          "Created group from card drag in transformation",
          { groupId, cards: [draggedCard.id, targetCard.id] },
          "DRAG_DROP",
        );
        return true;
      }

      // One card is grouped - add the ungrouped card to that group
      if (!draggedGroupId && targetGroupId) {
        await this._addCardToTransformationGroup(draggedCard.id, targetGroupId);
        return true;
      }

      // Cards are in different groups - move dragged card to target's group
      if (draggedGroupId && targetGroupId && draggedGroupId !== targetGroupId) {
        const oldGroupId = draggedGroupId;
        await this._addCardToTransformationGroup(draggedCard.id, targetGroupId);
        await this._checkTransformationGroupDissolution(oldGroupId);
        return true;
      }

      // Both cards are in the same group - reorder within group
      if (draggedGroupId === targetGroupId) {
        try {
          const embeddedActionCards =
            this.item.system.embeddedActionCards || [];

          const groupCards = embeddedActionCards.filter(
            (card) => card.system.groupId === draggedGroupId,
          );

          const draggedCardData = embeddedActionCards.find(
            (c) => c._id === draggedCard._id,
          );
          const targetCardData = embeddedActionCards.find(
            (c) => c._id === targetCard._id,
          );

          const siblings = groupCards.filter((c) => c._id !== draggedCard._id);

          const sortUpdates = foundry.utils.performIntegerSort(
            draggedCardData,
            {
              target: targetCardData,
              siblings,
            },
          );

          const updatedActionCards = embeddedActionCards.map((card) => {
            const update = sortUpdates.find((u) => u.target._id === card._id);
            return update ? { ...card, ...update.update } : card;
          });

          const finalSortedCards = updatedActionCards.sort((a, b) => {
            const aSort = a.sort ?? 0;
            const bSort = b.sort ?? 0;
            return aSort - bSort;
          });

          await this.item.update({
            "system.embeddedActionCards": finalSortedCards,
          });

          await this.render(true);

          Logger.debug(
            "Reordered cards within group in transformation",
            { groupId: draggedGroupId },
            "DRAG_DROP",
          );
          return true;
        } catch (error) {
          Logger.error("ERROR during sort", error, "ItemSheetDragDrop");
          throw error;
        }
      }

      return false;
    }

    /**
     * Handle dropping a card on a group container
     * @param {Item} card - The action card being dropped
     * @param {HTMLElement} groupTarget - The group element
     * @returns {Promise<boolean>} Success status
     * @private
     */
    async _handleTransformationCardDropOnGroup(card, groupTarget) {
      const groupId = groupTarget.dataset.groupId;
      if (!groupId) {
        return false;
      }

      const { shift, ctrl } = this._dragModifiers || {};

      // Shift+drag: Ungroup card
      if (shift && card.system.groupId) {
        await this._ungroupTransformationActionCard(card.id);
        return true;
      }

      // Ctrl+drag: Copy card (not supported yet)
      if (ctrl) {
        ui.notifications.warn(
          "Copying action cards within transformations is not yet supported",
        );
        return false;
      }

      // Normal drop: Add card to group
      const oldGroupId = card.system.groupId;
      if (oldGroupId !== groupId) {
        await this._addCardToTransformationGroup(card.id, groupId);

        if (oldGroupId) {
          await this._checkTransformationGroupDissolution(oldGroupId);
        }

        return true;
      }

      return false;
    }

    /**
     * Create a new action card group in the transformation
     * @param {string[]} cardIds - Array of action card IDs to group
     * @returns {Promise<string>} The new group ID
     * @private
     */
    async _createTransformationActionCardGroup(cardIds) {
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

      // Update the embedded action cards to assign them to the group
      const embeddedActionCards = this.item.system.embeddedActionCards || [];
      const updatedActionCards = embeddedActionCards.map((card) => {
        if (cardIds.includes(card._id)) {
          return {
            ...card,
            system: {
              ...card.system,
              groupId: newGroupId,
            },
          };
        }
        return card;
      });

      await this.item.update({
        "system.actionCardGroups": updatedGroups,
        "system.embeddedActionCards": updatedActionCards,
      });

      ui.notifications.info(
        game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Actor.ActionCards.CreateGroupSuccess",
          {
            name: newGroup.name,
          },
        ),
      );

      return newGroupId;
    }

    /**
     * Add an action card to a transformation group
     * @param {string} cardId - The action card ID
     * @param {string} groupId - The group ID
     * @returns {Promise<void>}
     * @private
     */
    async _addCardToTransformationGroup(cardId, groupId) {
      const embeddedActionCards = this.item.system.embeddedActionCards || [];
      const updatedActionCards = embeddedActionCards.map((card) => {
        if (card._id === cardId) {
          return {
            ...card,
            system: {
              ...card.system,
              groupId,
            },
          };
        }
        return card;
      });

      await this.item.update({
        "system.embeddedActionCards": updatedActionCards,
      });

      Logger.debug(
        "Added card to transformation group",
        { cardId, groupId },
        "DRAG_DROP",
      );
    }

    /**
     * Remove an action card from its group in a transformation
     * @param {string} cardId - The action card ID
     * @returns {Promise<void>}
     * @private
     */
    async _ungroupTransformationActionCard(cardId) {
      const embeddedActionCards = this.item.system.embeddedActionCards || [];
      const card = embeddedActionCards.find((c) => c._id === cardId);

      if (!card || !card.system.groupId) {
        return;
      }

      const oldGroupId = card.system.groupId;
      const updatedActionCards = embeddedActionCards.map((c) => {
        if (c._id === cardId) {
          return {
            ...c,
            system: {
              ...c.system,
              groupId: null,
            },
          };
        }
        return c;
      });

      await this.item.update({
        "system.embeddedActionCards": updatedActionCards,
      });

      // Check if the group should be dissolved
      await this._checkTransformationGroupDissolution(oldGroupId);

      Logger.debug(
        "Ungrouped transformation action card",
        { cardId, oldGroupId },
        "DRAG_DROP",
      );
    }

    /**
     * Check if a transformation group should be auto-dissolved
     * @param {string} groupId - The group ID to check
     * @returns {Promise<void>}
     * @private
     */
    async _checkTransformationGroupDissolution(groupId) {
      const embeddedActionCards = this.item.system.embeddedActionCards || [];
      const cardsInGroup = embeddedActionCards.filter(
        (card) => card.system.groupId === groupId,
      );

      if (cardsInGroup.length === 0) {
        // Remove the empty group
        const existingGroups = this.item.system.actionCardGroups || [];
        const updatedGroups = existingGroups.filter((g) => g._id !== groupId);

        await this.item.update({
          "system.actionCardGroups": updatedGroups,
        });

        Logger.debug(
          "Auto-dissolved empty transformation group",
          { groupId },
          "DRAG_DROP",
        );
      }
    }

    /**
     * Handle dropping a group to reorder groups or copy groups between sheets
     * @param {DragEvent} event - The drop event
     * @param {object} data - The drag data
     * @returns {Promise<boolean>} Success status
     * @private
     */
    async _onDropGroup(event, data) {
      try {
        if (!this.isEditable) {
          return false;
        }

        const dropTarget = event.target.closest(".erps-action-card-group");

        // Don't allow dropping on the same group
        if (dropTarget && dropTarget.dataset.groupId === data.groupId) {
          return false;
        }

        // Same transformation - reorder groups (only if dropping on another group)
        if (data.transformationId === this.item.id) {
          if (!dropTarget) {
            // Dropping in empty space on same transformation - do nothing
            return false;
          }

          const existingGroups = this.item.system.actionCardGroups || [];
          const sourceGroup = existingGroups.find(
            (g) => g._id === data.groupId,
          );
          const targetGroup = existingGroups.find(
            (g) => g._id === dropTarget.dataset.groupId,
          );

          if (!sourceGroup || !targetGroup) {
            return false;
          }

          // Perform the sort
          const sortUpdates = foundry.utils.performIntegerSort(sourceGroup, {
            target: targetGroup,
            siblings: existingGroups,
          });

          const updatedGroups = existingGroups.map((g) => {
            const update = sortUpdates.find((u) => u.target._id === g._id);
            return update ? { ...g, ...update.update } : g;
          });

          await this.item.update({ "system.actionCardGroups": updatedGroups });

          Logger.debug(
            "Reordered groups in transformation",
            { sourceId: data.groupId, targetId: dropTarget.dataset.groupId },
            "DRAG_DROP",
          );

          return true;
        }

        // Cross-sheet drop - copy the group and its cards
        return await this._copyGroupToTransformation(data, dropTarget);
      } catch (error) {
        Logger.error(
          "Failed to drop group on transformation",
          error,
          "DRAG_DROP",
        );
        return false;
      }
    }

    /**
     * Copy a group and its action cards to this transformation
     * @param {object} data - The drag data containing source info and groupId
     * @param {HTMLElement} dropTarget - The drop target element (optional, for ordering)
     * @returns {Promise<boolean>} Success status
     * @private
     */
    async _copyGroupToTransformation(data, dropTarget = null) {
      try {
        let sourceGroup;
        let sourceCards;

        // Determine if source is an actor or transformation
        if (data.actorId) {
          // Source is an actor
          const sourceActor = game.actors.get(data.actorId);
          if (!sourceActor) {
            Logger.error(
              "Source actor not found",
              { actorId: data.actorId },
              "DRAG_DROP",
            );
            return false;
          }

          const sourceGroups = sourceActor.system.actionCardGroups || [];
          sourceGroup = sourceGroups.find((g) => g._id === data.groupId);
          if (!sourceGroup) {
            Logger.error(
              "Source group not found in actor",
              { groupId: data.groupId },
              "DRAG_DROP",
            );
            return false;
          }

          sourceCards = sourceActor.items.filter(
            (i) => i.type === "actionCard" && i.system.groupId === data.groupId,
          );
        } else if (data.transformationId) {
          // Source is a transformation
          const sourceTransformation = await fromUuid(
            `Item.${data.transformationId}`,
          );
          if (!sourceTransformation) {
            Logger.error(
              "Source transformation not found",
              { transformationId: data.transformationId },
              "DRAG_DROP",
            );
            return false;
          }

          const sourceGroups =
            sourceTransformation.system.actionCardGroups || [];
          sourceGroup = sourceGroups.find((g) => g._id === data.groupId);
          if (!sourceGroup) {
            Logger.error(
              "Source group not found in transformation",
              { groupId: data.groupId },
              "DRAG_DROP",
            );
            return false;
          }

          const embeddedActionCards =
            sourceTransformation.system.getEmbeddedActionCards();
          sourceCards = embeddedActionCards.filter(
            (card) => card.system.groupId === data.groupId,
          );
        } else {
          Logger.error(
            "Invalid group drag data - no source specified",
            data,
            "DRAG_DROP",
          );
          return false;
        }

        if (sourceCards.length === 0) {
          ui.notifications.warn(
            game.i18n.localize(
              "EVENTIDE_RP_SYSTEM.Actor.ActionCards.NoCardsInGroup",
            ),
          );
          return false;
        }

        // Create the new group on this transformation
        const newGroupId = foundry.utils.randomID();
        const existingGroups = this.item.system.actionCardGroups || [];

        // Determine sort order for the new group
        let newGroupSort = 0;
        if (dropTarget) {
          const targetGroupId = dropTarget.dataset.groupId;
          const targetGroup = existingGroups.find(
            (g) => g._id === targetGroupId,
          );
          if (targetGroup) {
            newGroupSort = targetGroup.sort || 0;
          }
        } else if (existingGroups.length > 0) {
          newGroupSort =
            Math.max(...existingGroups.map((g) => g.sort || 0)) + 1;
        }

        const newGroup = {
          _id: newGroupId,
          name: sourceGroup.name,
          sort: newGroupSort,
        };

        // Get existing embedded action cards
        const existingEmbeddedCards =
          this.item.system.embeddedActionCards || [];

        // Copy all action cards with new group ID
        const newCardDataArray = sourceCards.map((card) => {
          const cardData = card.toObject
            ? card.toObject()
            : foundry.utils.deepClone(card);

          // Generate a new ID for the card
          const newCardId = foundry.utils.randomID();
          cardData._id = newCardId;
          cardData.system.groupId = newGroupId; // Assign to new group

          return cardData;
        });

        // Combine existing and new cards
        const updatedEmbeddedCards = [
          ...existingEmbeddedCards,
          ...newCardDataArray,
        ];

        // Update transformation with new group and cards
        const updatedGroups = [...existingGroups, newGroup];
        await this.item.update({
          "system.actionCardGroups": updatedGroups,
          "system.embeddedActionCards": updatedEmbeddedCards,
        });

        Logger.debug(
          "Copied group to transformation",
          {
            sourceType: data.actorId ? "actor" : "transformation",
            sourceId: data.actorId || data.transformationId,
            sourceGroupId: data.groupId,
            newGroupId,
            cardCount: newCardDataArray.length,
          },
          "DRAG_DROP",
        );

        ui.notifications.info(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Actor.ActionCards.GroupCopied", {
            groupName: sourceGroup.name,
            cardCount: newCardDataArray.length,
          }),
        );

        return true;
      } catch (error) {
        Logger.error(
          "Failed to copy group to transformation",
          error,
          "DRAG_DROP",
        );
        ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.FailedToCopyGroup"),
        );
        return false;
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
      // Allow combat powers and action cards to be added to transformations
      if (
        droppedItem.type !== "combatPower" &&
        droppedItem.type !== "actionCard"
      ) {
        ui.notifications.warn(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.TransformationItemTypes",
          ),
        );
        return false;
      }

      try {
        if (droppedItem.type === "combatPower") {
          await this.item.system.addCombatPower(droppedItem);
          Logger.info(
            "Combat power added to transformation",
            {
              transformationName: this.item.name,
              combatPowerName: droppedItem.name,
            },
            "DRAG_DROP",
          );
        } else if (droppedItem.type === "actionCard") {
          await this.item.system.addActionCard(droppedItem);
          Logger.info(
            "Action card added to transformation",
            {
              transformationName: this.item.name,
              actionCardName: droppedItem.name,
            },
            "DRAG_DROP",
          );
        }
        return true;
      } catch (error) {
        Logger.error(
          `Failed to add ${droppedItem.type} to transformation`,
          error,
          "DRAG_DROP",
        );
        ui.notifications.error(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.FailedToAddItemToTransformation",
            {
              itemName: droppedItem.name,
              itemType: droppedItem.type,
              transformationName: this.item.name,
            },
          ),
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
      } else if (dropType === "transformation") {
        return this._handleTransformationEffectDrop(droppedItem);
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
     * Handle drops on transformation drop zones
     * @param {Item} droppedItem - The item being dropped
     * @returns {Promise<boolean>} True if handled successfully
     * @private
     */
    async _handleTransformationEffectDrop(droppedItem) {
      const supportedTypes = ["transformation"];
      if (!supportedTypes.includes(droppedItem.type)) {
        ui.notifications.warn(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.ActionCardTransformationTypes",
            {
              type: droppedItem.type,
              supported: supportedTypes.join(", "),
            },
          ),
        );
        return false;
      }

      try {
        await this.item.addEmbeddedTransformation(droppedItem);

        Logger.info(
          "Transformation added to action card as effect",
          {
            actionCardName: this.item.name,
            transformationName: droppedItem.name,
            transformationType: droppedItem.type,
          },
          "DRAG_DROP",
        );

        return true;
      } catch (error) {
        Logger.error(
          "Failed to add transformation to action card",
          error,
          "DRAG_DROP",
        );
        ui.notifications.error(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.FailedToAddTransformationToActionCard",
            {
              transformationName: droppedItem.name,
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
        transformation: "transformation",
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
      } else if (destination === "transformation") {
        const success = await this._handleTransformationEffectDrop(droppedItem);
        if (success) {
          ui.notifications.info(
            game.i18n.format(
              "EVENTIDE_RP_SYSTEM.Item.ActionCard.TransformationAddedToEffects",
              {
                transformationName: droppedItem.name,
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
          "EVENTIDE_RP_SYSTEM.Forms.Sections.Effects",
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
