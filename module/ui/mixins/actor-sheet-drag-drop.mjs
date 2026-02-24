import { Logger } from "../../services/logger.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";
import { DragDropHandler } from "../../services/drag-drop-handler.mjs";

const { TextEditor } = foundry.applications.ux;

/**
 * Actor Sheet Drag and Drop Mixin
 *
 * Provides drag and drop functionality for actor sheets, including
 * handling drops of items, actors, effects, and folders.
 *
 * This mixin delegates shared functionality to the DragDropHandler service
 * while keeping actor-specific logic in the mixin.
 *
 * @param {class} BaseClass - The base actor sheet class to extend
 * @returns {class} Extended class with drag and drop functionality
 */
export const ActorSheetDragDropMixin = (BaseClass) =>
  class extends BaseClass {
    // Private fields
    #dragDrop;

    constructor(options = {}) {
      super(options);
      // Initialize drag drop handlers if dragDrop options are available
      if (this.options?.dragDrop) {
        this.#dragDrop = this.#createDragDropHandlers();
      } else {
        this.#dragDrop = [];
      }
    }

    /**
     * Callback actions which occur when a dragged element is dropped on a target.
     * @param {DragEvent} event - The originating DragEvent
     * @protected
     * @override
     */
    async _onDrop(event) {
      try {
        const data = TextEditor.implementation.getDragEventData(event);
        const actor = this.actor;
        const allowed = Hooks.call("dropActorSheetData", actor, this, data);

        if (allowed === false) {
          return false;
        }

        // Handle different data types
        let result;
        switch (data.type) {
          case "Group":
            result = await this._onDropGroup(event, data);
            break;
          case "Actor":
            result = await this._onDropActor(event, data);
            break;
          case "Item":
            result = await this._onDropItem(event, data);
            break;
          case "Folder":
            result = await this._onDropFolder(event, data);
            break;
          default:
            Logger.warn(
              `Unhandled drop type: ${data.type}`,
              { data },
              "DRAG_DROP",
            );
            result = false;
        }

        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Handle drop on ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.UI,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.DropError",
          ),
        });

        return false;
      }
    }

    /**
     * Handle dropping of an Actor data onto another Actor sheet
     * @param {DragEvent} _event - The concluding DragEvent which contains drop data
     * @param {object} _data - The data transfer extracted from the event
     * @returns {Promise<object|boolean>} A data object which describes the result of the drop, or false if the drop was not permitted.
     * @protected
     */
    async _onDropActor(event, data) {
      if (!this.actor.isOwner) {
        return false;
      }

      // Use the actor to transformation API from the dropped actor to create a transformation
      // and apply it
      const actor = await fromUuid(data.uuid);

      const transformation =
        await erps.utils.TransformationConverter.actorToTransformation(actor);

      // Get the transformation item data (prefer compendium version)
      const transformationData = transformation.compendium || transformation.world;
      if (!transformationData) {
        Logger.warn("No transformation data available from conversion", null, "DRAG_DROP");
        return false;
      }

      // Check cursed transformation precedence BEFORE creating the item
      // This prevents effects from being applied when the transformation is denied
      const activeTransformationName = this.actor.getFlag(
        "eventide-rp-system",
        "activeTransformationName",
      );
      const activeTransformationCursed = this.actor.getFlag(
        "eventide-rp-system",
        "activeTransformationCursed",
      );
      const newTransformationCursed = transformationData.system?.cursed || false;

      // If actor has an active transformation
      if (activeTransformationName) {
        // If current transformation is cursed and new one is not cursed, deny
        if (activeTransformationCursed && !newTransformationCursed) {
          ui.notifications.warn(
            game.i18n.format(
              "EVENTIDE_RP_SYSTEM.Item.ActionCard.TransformationCursedOverrideDenied",
              {
                currentTransformation: activeTransformationName,
                newTransformation: transformationData.name,
              },
            ),
          );
          Logger.warn(
            "Transformation denied - cursed transformation override",
            {
              activeTransformationName,
              activeTransformationCursed,
              newTransformationName: transformationData.name,
              newTransformationCursed,
            },
            "DRAG_DROP",
          );
          return false;
        }
      }

      // Create the owned item (effects will be transferred at this point)
      const result = await this._onDropItemCreate(
        transformation.compendium,
        event,
      );

      // Transform the actor
      await this.actor.applyTransformation(
        Item.implementation.fromSource(result[0]),
      );

      return result;
    }

    /**
     * Handle dropping of an Item onto this Actor Sheet
     * @param {DragEvent} event - The concluding DragEvent which contains drop data
     * @param {object} data - The data transfer extracted from the event
     * @returns {Promise<Item[]|boolean>} The created Item objects or false if the drop was not permitted.
     * @protected
     */
    async _onDropItem(event, data) {
      try {
        // Remove drag feedback when drop occurs
        DragDropHandler.removeDragFeedback(
          DragDropHandler.CONFIG.ACTOR,
          this,
        );

        if (!this.actor.isOwner) {
          return false;
        }

        const item = await Item.implementation.fromDropData(data);

        // Handle item sorting within the same Actor
        if (this.actor.uuid === item.parent?.uuid) {
          const result = await this._onSortItem(event, item);
          return result;
        }

        // Check if dropped on action cards drop zone
        const actionCardDropZone = event.target.closest(
          DragDropHandler.CONFIG.ACTOR.dropZoneSelector,
        );
        if (
          actionCardDropZone &&
          ["feature", "combatPower", "gear", "status"].includes(item.type)
        ) {
          const result = await this._createActionCardFromItem(item, event);
          return result;
        }

        // Handle dropping a transformation directly on the actor
        if (item.type === "transformation") {
          // Apply the transformation (this will handle adding the item to the actor)
          await this.actor.applyTransformation(item);

          // Get the transformation item that was added to the actor
          const actorTransformationItem = this.actor.items.get(item.id);
          return [actorTransformationItem];
        }

        // Create the owned item
        // Convert Item instance to plain object before passing to _onDropItemCreate
        const itemData = item.toObject ? item.toObject() : item;
        const result = await this._onDropItemCreate(itemData, event);

        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Drop item on ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.ItemDropError",
          ),
        });

        return false;
      }
    }

    /**
     * Handle dropping of a Folder on an Actor Sheet.
     * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
     * @param {DragEvent} event - The concluding DragEvent which contains drop data
     * @param {object} data - The data transfer extracted from the event
     * @returns {Promise<Item[]>} The created items
     * @protected
     */
    async _onDropFolder(event, data) {
      try {
        if (!this.actor.isOwner) {
          return [];
        }

        const folder = await Folder.implementation.fromDropData(data);

        if (folder.type !== "Item") {
          return [];
        }

        const droppedItemData = await Promise.all(
          folder.contents.map(async (item) => {
            if (!(item instanceof Item)) item = await fromUuid(item.uuid);
            return item;
          }),
        );

        const result = await this._onDropItemCreate(droppedItemData, event);

        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Drop folder on ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.FolderDropError",
          ),
        });

        return [];
      }
    }

    /**
     * Handle the final creation of dropped Item data on the Actor.
     * @param {object[]|object} itemData - The item data requested for creation
     * @param {DragEvent} _event - The concluding DragEvent which provided the drop data
     * @returns {Promise<Item[]>} The created items
     * @private
     */
    async _onDropItemCreate(itemData, _event) {
      try {
        itemData = itemData instanceof Array ? itemData : [itemData];

        // Check if we're currently on the GM Actions tab
        const isGmActionsTabActive =
          DragDropHandler.CONFIG.ACTOR.isGmActionsTabActive(this);

        // Set gmOnly flag based on active tab for all action cards
        itemData = itemData.map((data) => {
          if (data.type === "actionCard") {
            // Convert to plain object if it's a Document or DataModel instance
            const plainData = data.toObject ? data.toObject() : foundry.utils.deepClone(data);

            // Ensure system is a plain object
            if (!plainData.system || typeof plainData.system.toObject === 'function') {
              plainData.system = plainData.system?.toObject?.() || {};
            }

            // Set the gmOnly flag based on active tab
            plainData.system.gmOnly = isGmActionsTabActive;
            return plainData;
          }
          return data;
        });

        const result = await this.actor.createEmbeddedDocuments(
          "Item",
          itemData,
        );

        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Create dropped items for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.ItemCreateError",
          ),
        });

        return [];
      }
    }

    /**
     * Handle a drop event for an existing embedded Item to sort that Item relative to its siblings
     * @param {Event} event - The drop event
     * @param {Item} item - The item being sorted
     * @returns {Promise<Item[]>} The updated items
     * @private
     */
    async _onSortItem(event, item) {
      return await DragDropHandler.handleSortItem(
        DragDropHandler.CONFIG.ACTOR,
        this,
        event,
        item,
      );
    }

    /**
     * Returns an array of DragDrop instances
     * @type {DragDrop.implementation[]}
     */
    get dragDrop() {
      return this.#dragDrop || [];
    }

    /**
     * Create drag-and-drop workflow handlers for this Application
     * @returns {DragDrop.implementation[]}     An array of DragDrop handlers
     * @private
     */
    #createDragDropHandlers() {
      const { DragDrop } = foundry.applications.ux;

      if (!this.options?.dragDrop) {
        return [];
      }

      return this.options.dragDrop.map((d) => {
        d.permissions = {
          dragstart: this._canDragStart.bind(this),
          drop: this._canDragDrop.bind(this),
        };
        d.callbacks = {
          dragstart: this._onDragStart.bind(this),
          dragover: this._onDragOver.bind(this),
          dragend: this._onDragEnd.bind(this),
          drop: this._onDrop.bind(this),
        };
        return new DragDrop.implementation(d);
      });
    }

    /**
     * Define whether a user is able to begin a dragstart workflow for a given drag selector
     * @param {string} selector - The candidate HTML selector for dragging
     * @returns {boolean} Can the current user drag this selector?
     * @protected
     */
    _canDragStart(_selector) {
      const canDrag = this.isEditable;
      return canDrag;
    }

    /**
     * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
     * @param {string} selector - The candidate HTML selector for the drop target
     * @returns {boolean} Can the current user drop on this selector?
     * @protected
     */
    _canDragDrop(_selector) {
      const canDrop = this.isEditable;
      return canDrop;
    }

    /**
     * Begins a drag operation from a popped out sheet
     * @param {DragEvent} event - The originating DragEvent
     * @protected
     */
    _onDragStart(event) {
      // Prevent dragging if the click originated from a non-draggable interactive element
      const target = event.target;

      // Check if clicking on an element with data-action (which handles its own click events)
      if (
        target.closest("[data-action]") ||
        target.closest(".erps-action-card-group__name") ||
        target.matches("button") ||
        target.matches("input") ||
        target.matches("a")
      ) {
        Logger.debug(
          "Drag prevented - clicked on interactive element",
          {
            targetClass: target.className,
            targetTag: target.tagName,
          },
          "DRAG_DROP",
        );
        return;
      }

      // Store modifier keys for drop operation
      this._dragModifiers = {
        shift: event.shiftKey,
        ctrl: event.ctrlKey || event.metaKey,
      };

      // Support li, tr elements, transformation cards, and group containers
      const docRow = event.currentTarget.closest(
        "li, tr, .eventide-transformation-card, .erps-action-card-group",
      );
      if (!docRow) {
        Logger.warn(
          "No draggable element found",
          {
            target: event.currentTarget,
            targetClasses: event.currentTarget.className,
            targetDataset: event.currentTarget.dataset,
          },
          "DRAG_DROP",
        );
        return;
      }

      // Check if dragging a group - only allow if clicked on drag handle
      if (docRow.classList.contains("erps-action-card-group")) {
        // Ensure we're clicking on the drag handle specifically
        if (!target.closest(".erps-action-card-group__drag-handle")) {
          Logger.debug(
            "Drag prevented - not clicking on group drag handle",
            {},
            "DRAG_DROP",
          );
          return;
        }
        const groupId = docRow.dataset.groupId;
        if (groupId) {
          const existingGroups = this.actor.system.actionCardGroups || [];
          const group = existingGroups.find((g) => g._id === groupId);

          if (group) {
            const dragData = {
              type: "Group",
              groupId,
              actorId: this.actor.id,
            };

            event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
            docRow.classList.add(DragDropHandler.CONFIG.ACTOR.groupDraggingClass);

            Logger.debug(
              "Started dragging group",
              { groupId, groupName: group.name },
              "DRAG_DROP",
            );
            return;
          }
        }
      }

      // Don't drag if clicking on a link or button (except the transformation card itself)
      if ("link" in event.target.dataset) {
        return;
      }

      // Allow dragging transformation cards even when clicking buttons, but prevent if clicking the revert button specifically
      if (event.target.closest(".eventide-transformation-card__revert")) {
        return;
      }

      // Get the embedded document for this element
      const document = this._getEmbeddedDocument(docRow);
      if (!document) {
        Logger.warn(
          "No document found for drag operation",
          {
            docRow,
            itemId: docRow.dataset?.itemId,
            documentClass: docRow.dataset?.documentClass,
            elementClass: docRow.className,
            actorItems: this.actor.items.size,
            activeTransformation: this.actor.getFlag(
              "eventide-rp-system",
              "activeTransformation",
            ),
          },
          "DRAG_DROP",
        );
        return;
      }

      // Store the dragged card's groupId for comparison on drop
      if (document.type === "actionCard") {
        this._draggedCardGroupId = document.system?.groupId;
        // Add dragging class to the row
        docRow.classList.add(DragDropHandler.CONFIG.ACTOR.draggingClass);
      }

      // Determine if this is a transformation item (not owned by actor)
      // This includes both action cards and combat powers from transformations
      const isTransformationItem =
        (document.type === "actionCard" || document.type === "combatPower") &&
        !this.actor.items.has(document.id);

      // Get drag data from the document
      let dragData;
      if (isTransformationItem) {
        // For transformation items, create clean drag data without parent/UUID
        // This allows them to be dragged to other actors or compendiums
        const itemData = document.toObject();
        delete itemData._id; // Remove ID to prevent collisions

        dragData = {
          type: "Item",
          data: itemData,
          // Don't include uuid or parent information
        };
      } else {
        // For regular items, use standard drag data
        dragData = document.toDragData();
      }
      if (!dragData) {
        Logger.warn(
          "No drag data available for document",
          {
            documentId: document.id,
            documentType: document.type || document.documentName,
          },
          "DRAG_DROP",
        );
        return;
      }

      // Add visual feedback
      if (docRow.classList.contains("eventide-transformation-card")) {
        docRow.classList.add("dragging");
      }

      // Set data transfer
      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }

    /**
     * Callback actions which occur when a dragged element is over a drop target.
     * @param {DragEvent} event - The originating DragEvent
     * @protected
     */
    _onDragOver(event) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";

      // Add visual feedback for action card drop zones
      DragDropHandler.addDragFeedback(
        DragDropHandler.CONFIG.ACTOR,
        this,
        event,
      );
    }

    /**
     * Callback actions which occur when a drag operation ends.
     * @param {DragEvent} event - The originating DragEvent
     * @protected
     */
    _onDragEnd(event) {
      // Remove visual feedback
      const docRow = event.currentTarget.closest(
        "li, tr, .eventide-transformation-card, .erps-action-card-group",
      );
      if (docRow) {
        if (docRow.classList.contains("eventide-transformation-card")) {
          docRow.classList.remove("dragging");
        }
        if (docRow.classList.contains("erps-action-card-group")) {
          docRow.classList.remove(DragDropHandler.CONFIG.ACTOR.groupDraggingClass);
        }
        docRow.classList.remove(DragDropHandler.CONFIG.ACTOR.draggingClass);
      }

      // Clear drag state
      this._dragModifiers = null;
      this._draggedCardGroupId = null;
    }

    /**
     * Callback actions which occur when a dragged element leaves a drop target.
     * @param {DragEvent} event - The drag leave event
     * @protected
     */
    _onDragLeave(event) {
      // Only remove feedback if we're actually leaving the sheet
      if (!this.element.contains(event.relatedTarget)) {
        DragDropHandler.removeDragFeedback(
          DragDropHandler.CONFIG.ACTOR,
          this,
        );
      }
    }

    /**
     * Fetches the embedded document representing the containing HTML element
     * @param {HTMLElement} target - The element subject to search
     * @returns {Item} The embedded Item
     */
    _getEmbeddedDocument(target) {
      return DragDropHandler.getEmbeddedDocument(
        DragDropHandler.CONFIG.ACTOR,
        this,
        target,
      );
    }

    /**
     * Find a transformation combat power by ID
     * @param {string} itemId - The item ID to search for
     * @returns {Item|null} The transformation combat power item or null if not found
     * @private
     */
    _findTransformationCombatPower(itemId) {
      return DragDropHandler.CONFIG.ACTOR.findTransformationCombatPower(
        this.actor,
        itemId,
      );
    }

    /**
     * Find a transformation action card by ID
     * @param {string} itemId - The item ID to search for
     * @returns {Item|null} The transformation action card item or null if not found
     * @private
     */
    _findTransformationActionCard(itemId) {
      return DragDropHandler.CONFIG.ACTOR.findTransformationActionCard(
        this.actor,
        itemId,
      );
    }

    /**
     * Create an action card from a dropped item
     * @param {Item} item - The item to create an action card from
     * @param {DragEvent} event - The drop event
     * @returns {Promise<Item[]>} The created action card
     * @private
     */
    async _createActionCardFromItem(item, _event) {
      try {
        // Handle status items differently - create saved damage action cards
        if (item.type === "status") {
          return await this._createStatusActionCard(item);
        }

        // Check if we're currently on the GM Actions tab
        const isGmActionsTabActive =
          DragDropHandler.CONFIG.ACTOR.isGmActionsTabActive(this);

        // Create the action card data for non-status items
        const actionCardData = {
          name: game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Actor.ActionCards.GeneratedName",
            {
              itemName: item.name,
            },
          ),
          type: "actionCard",
          img: item.img || "icons/svg/item-bag.svg",
          system: {
            description: item.system?.description || "",
            mode: "attackChain",
            bgColor: item.system?.bgColor || "#8B4513",
            textColor: item.system?.textColor || "#ffffff",
            advanceInitiative: false,
            attemptInventoryReduction: false,
            gmOnly: isGmActionsTabActive,
            attackChain: {
              firstStat: "acro",
              secondStat: "phys",
              damageCondition: "never",
              damageFormula: "1d6",
              damageType: "damage",
              statusCondition: "never",
              statusThreshold: 15,
            },
            embeddedStatusEffects: [],
          },
        };

        // Create the action card
        const createdItems = await this.actor.createEmbeddedDocuments("Item", [
          actionCardData,
        ]);
        const actionCard = createdItems[0];

        if (!actionCard) {
          throw new Error("Failed to create action card");
        }

        // Set the embedded item
        await actionCard.setEmbeddedItem(item);

        // Show success notification
        ui.notifications.info(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Actor.ActionCards.CreatedFromItem",
            {
              actionCardName: actionCard.name,
              itemName: item.name,
            },
          ),
        );

        return [actionCard];
      } catch (error) {
        Logger.error(
          "Failed to create action card from item",
          error,
          "DRAG_DROP",
        );

        ui.notifications.error(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.FailedToCreateActionCard",
            {
              itemName: item.name,
            },
          ),
        );

        return [];
      }
    }

    /**
     * Create a saved damage action card from a status item
     * @param {Item} statusItem - The status item to create an action card from
     * @returns {Promise<Item[]>} The created action card
     * @private
     */
    async _createStatusActionCard(statusItem) {
      try {
        // Extract data from the status item with sensible defaults
        const statusSystem = statusItem.system || {};
        const statusImg = statusItem.img || "icons/svg/aura.svg";
        const statusName = statusItem.name || "Unknown Damage";
        const statusDescription = statusSystem.description || "";

        // Extract colors with defaults
        const bgColor = statusSystem.bgColor || "#8B4513";
        const textColor = statusSystem.textColor || "#ffffff";

        // Check if we're currently on the GM Actions tab
        const isGmActionsTabActive =
          DragDropHandler.CONFIG.ACTOR.isGmActionsTabActive(this);

        // Create saved damage action card data with status appearance
        const actionCardData = {
          name: game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Actor.ActionCards.StatusGeneratedName",
            {
              statusName,
            },
          ),
          type: "actionCard",
          img: statusImg,
          system: {
            description: statusDescription,
            mode: "savedDamage",
            bgColor,
            textColor,
            advanceInitiative: false,
            attemptInventoryReduction: false,
            gmOnly: isGmActionsTabActive,
            attackChain: {
              firstStat: "acro",
              secondStat: "phys",
              damageCondition: "never",
              damageFormula: "1d6",
              damageType: "damage",
              statusCondition: "never",
              statusThreshold: 15,
            },
            savedDamage: {
              formula: "1d8",
              type: "damage",
              description: game.i18n.format(
                "EVENTIDE_RP_SYSTEM.Actor.ActionCards.StatusDamageDescription",
                {
                  statusName,
                },
              ),
            },
            embeddedStatusEffects: [],
          },
        };

        // Create the action card
        const createdItems = await this.actor.createEmbeddedDocuments("Item", [
          actionCardData,
        ]);
        const actionCard = createdItems[0];

        if (!actionCard) {
          throw new Error("Failed to create status action card");
        }

        // Show success notification
        ui.notifications.info(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Actor.ActionCards.CreatedStatusActionCard",
            {
              actionCardName: actionCard.name,
              statusName,
            },
          ),
        );

        return [actionCard];
      } catch (error) {
        Logger.error("Failed to create status action card", error, "DRAG_DROP");

        ui.notifications.error(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.FailedToCreateStatusActionCard",
            {
              statusName: statusItem.name || "Unknown Status",
            },
          ),
        );

        return [];
      }
    }

    /**
     * Handle dropping a group to reorder groups or copy from another actor
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

        const dropTarget = event.target.closest(
          DragDropHandler.CONFIG.ACTOR.groupSelector,
        );

        // Don't allow dropping on the same group
        if (dropTarget && dropTarget.dataset.groupId === data.groupId) {
          return false;
        }

        // Same actor - reorder groups (only if dropping on another group)
        if (data.actorId === this.actor.id) {
          if (!dropTarget) {
            // Dropping in empty space on same actor - do nothing
            return false;
          }

          const existingGroups = this.actor.system.actionCardGroups || [];
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

          await this.actor.update({ "system.actionCardGroups": updatedGroups });

          Logger.debug(
            "Reordered groups",
            { sourceId: data.groupId, targetId: dropTarget.dataset.groupId },
            "DRAG_DROP",
          );

          return true;
        }

        // Cross-actor drop - copy the group and its cards
        return await this._copyGroupFromAnotherActor(data, dropTarget);
      } catch (error) {
        Logger.error("Failed to drop group", error, "DRAG_DROP");
        return false;
      }
    }

    /**
     * Copy a group and its action cards from another actor or transformation
     * @param {object} data - The drag data containing source info and groupId
     * @param {HTMLElement} dropTarget - The drop target element (optional, for ordering)
     * @returns {Promise<boolean>} Success status
     * @private
     */
    async _copyGroupFromAnotherActor(data, dropTarget = null) {
      return await DragDropHandler.copyGroupToDestination(
        DragDropHandler.CONFIG.ACTOR,
        this,
        data,
        dropTarget,
      );
    }

    /**
     * Check if a group should be auto-dissolved
     * @param {string} groupId - The group ID to check
     * @returns {Promise<void>}
     * @private
     */
    async _checkGroupDissolution(groupId) {
      return await DragDropHandler.checkGroupDissolution(
        DragDropHandler.CONFIG.ACTOR,
        this,
        groupId,
      );
    }
  };
