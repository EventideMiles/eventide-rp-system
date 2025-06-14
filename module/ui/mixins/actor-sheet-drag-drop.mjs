import { Logger } from "../../services/logger.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";

const { TextEditor } = foundry.applications.ux;

/**
 * Actor Sheet Drag and Drop Mixin
 *
 * Provides drag and drop functionality for actor sheets, including
 * handling drops of items, actors, effects, and folders.
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
      Logger.methodEntry("ActorSheetDragDropMixin", "_onDrop", {
        actorName: this.actor?.name,
        eventType: event.type,
      });

      try {
        const data = TextEditor.implementation.getDragEventData(event);
        const actor = this.actor;
        const allowed = Hooks.call("dropActorSheetData", actor, this, data);

        if (allowed === false) {
          Logger.debug("Drop prevented by hook", { data }, "DRAG_DROP");
          Logger.methodExit("ActorSheetDragDropMixin", "_onDrop", false);
          return false;
        }

        // Handle different data types
        let result;
        switch (data.type) {
          case "ActiveEffect":
            result = await this._onDropActiveEffect(event, data);
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

        Logger.methodExit("ActorSheetDragDropMixin", "_onDrop", result);
        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Handle drop on ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.UI,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.DropError",
          ),
        });

        Logger.methodExit("ActorSheetDragDropMixin", "_onDrop", null);
        return false;
      }
    }

    /**
     * Handle the dropping of ActiveEffect data onto an Actor Sheet
     * @param {DragEvent} event - The concluding DragEvent which contains drop data
     * @param {object} data - The data transfer extracted from the event
     * @returns {Promise<ActiveEffect|boolean>} The created ActiveEffect object or false if it couldn't be created.
     * @protected
     */
    async _onDropActiveEffect(event, data) {
      Logger.methodEntry("ActorSheetDragDropMixin", "_onDropActiveEffect", {
        actorName: this.actor?.name,
        effectData: data,
      });

      try {
        const aeCls = getDocumentClass("ActiveEffect");
        const effect = await aeCls.fromDropData(data);

        if (!this.actor.isOwner || !effect) {
          Logger.debug(
            "Drop not allowed - no ownership or effect",
            {
              isOwner: this.actor.isOwner,
              hasEffect: !!effect,
            },
            "DRAG_DROP",
          );
          Logger.methodExit(
            "ActorSheetDragDropMixin",
            "_onDropActiveEffect",
            false,
          );
          return false;
        }

        if (effect.target === this.actor) {
          Logger.debug(
            "Sorting existing effect",
            { effectId: effect.id },
            "DRAG_DROP",
          );
          const result = await this._onSortActiveEffect(event, effect);
          Logger.methodExit(
            "ActorSheetDragDropMixin",
            "_onDropActiveEffect",
            result,
          );
          return result;
        }

        const result = await aeCls.create(effect, { parent: this.actor });

        Logger.info(
          `Created new active effect: ${effect.name}`,
          {
            effectId: result.id,
            effectName: result.name,
          },
          "DRAG_DROP",
        );

        Logger.methodExit(
          "ActorSheetDragDropMixin",
          "_onDropActiveEffect",
          result,
        );
        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Drop active effect on ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.EffectDropError",
          ),
        });

        Logger.methodExit(
          "ActorSheetDragDropMixin",
          "_onDropActiveEffect",
          null,
        );
        return false;
      }
    }

    /**
     * Handle a drop event for an existing embedded Active Effect to sort that Active Effect relative to its siblings
     * @param {DragEvent} event - The drag event
     * @param {ActiveEffect} effect - The effect being sorted
     * @returns {Promise<ActiveEffect[]>} The updated effects
     * @protected
     */
    async _onSortActiveEffect(event, effect) {
      Logger.methodEntry("ActorSheetDragDropMixin", "_onSortActiveEffect", {
        effectId: effect.id,
        effectName: effect.name,
      });

      try {
        const dropTarget = event.target.closest("[data-effect-id]");
        if (!dropTarget) {
          Logger.debug("No valid drop target found", null, "DRAG_DROP");
          Logger.methodExit(
            "ActorSheetDragDropMixin",
            "_onSortActiveEffect",
            null,
          );
          return null;
        }

        const target = this._getEmbeddedDocument(dropTarget);

        // Don't sort on yourself
        if (effect.uuid === target.uuid) {
          Logger.debug(
            "Cannot sort effect on itself",
            { effectId: effect.id },
            "DRAG_DROP",
          );
          Logger.methodExit(
            "ActorSheetDragDropMixin",
            "_onSortActiveEffect",
            null,
          );
          return null;
        }

        // Identify sibling items based on adjacent HTML elements
        const siblings = [];
        for (const el of dropTarget.parentElement.children) {
          const siblingId = el.dataset.effectId;
          const parentId = el.dataset.parentId;
          if (
            siblingId &&
            parentId &&
            (siblingId !== effect.id || parentId !== effect.parent.id)
          ) {
            siblings.push(this._getEmbeddedDocument(el));
          }
        }

        // Perform the sort
        const sortUpdates = SortingHelpers.performIntegerSort(effect, {
          target,
          siblings,
        });

        // Split the updates up by parent document
        const directUpdates = [];
        const grandchildUpdateData = sortUpdates.reduce((items, u) => {
          const parentId = u.target.parent.id;
          const update = { _id: u.target.id, ...u.update };
          if (parentId === this.actor.id) {
            directUpdates.push(update);
            return items;
          }
          if (items[parentId]) items[parentId].push(update);
          else items[parentId] = [update];
          return items;
        }, {});

        // Effects-on-items updates
        for (const [itemId, updates] of Object.entries(grandchildUpdateData)) {
          await this.actor.items
            .get(itemId)
            .updateEmbeddedDocuments("ActiveEffect", updates);
        }

        // Update on the main actor
        const result = await this.actor.updateEmbeddedDocuments(
          "ActiveEffect",
          directUpdates,
        );

        Logger.debug(
          "Effect sorting completed",
          {
            effectId: effect.id,
            updatesCount: directUpdates.length,
          },
          "DRAG_DROP",
        );

        Logger.methodExit(
          "ActorSheetDragDropMixin",
          "_onSortActiveEffect",
          result,
        );
        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Sort active effect for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.EffectSortError",
          ),
        });

        Logger.methodExit(
          "ActorSheetDragDropMixin",
          "_onSortActiveEffect",
          null,
        );
        return null;
      }
    }

    /**
     * Handle dropping of an Actor data onto another Actor sheet
     * @param {DragEvent} _event - The concluding DragEvent which contains drop data
     * @param {object} _data - The data transfer extracted from the event
     * @returns {Promise<object|boolean>} A data object which describes the result of the drop, or false if the drop was not permitted.
     * @protected
     */
    async _onDropActor(_event, _data) {
      Logger.methodEntry("ActorSheetDragDropMixin", "_onDropActor", {
        actorName: this.actor?.name,
        isOwner: this.actor.isOwner,
      });

      if (!this.actor.isOwner) {
        Logger.debug("Drop not allowed - no ownership", null, "DRAG_DROP");
        Logger.methodExit("ActorSheetDragDropMixin", "_onDropActor", false);
        return false;
      }

      // Currently no specific actor-on-actor drop behavior implemented
      Logger.methodExit("ActorSheetDragDropMixin", "_onDropActor", false);
      return false;
    }

    /**
     * Handle dropping of an Item onto this Actor Sheet
     * @param {DragEvent} event - The concluding DragEvent which contains drop data
     * @param {object} data - The data transfer extracted from the event
     * @returns {Promise<Item[]|boolean>} The created Item objects or false if the drop was not permitted.
     * @protected
     */
    async _onDropItem(event, data) {
      Logger.methodEntry("ActorSheetDragDropMixin", "_onDropItem", {
        actorName: this.actor?.name,
        itemData: data,
      });

      try {
        if (!this.actor.isOwner) {
          Logger.debug("Drop not allowed - no ownership", null, "DRAG_DROP");
          Logger.methodExit("ActorSheetDragDropMixin", "_onDropItem", false);
          return false;
        }

        const item = await Item.implementation.fromDropData(data);

        // Handle item sorting within the same Actor
        if (this.actor.uuid === item.parent?.uuid) {
          Logger.debug(
            "Sorting existing item",
            { itemId: item.id },
            "DRAG_DROP",
          );
          const result = await this._onSortItem(event, item);
          Logger.methodExit("ActorSheetDragDropMixin", "_onDropItem", result);
          return result;
        }

        // Handle dropping a transformation directly on the actor
        if (item.type === "transformation") {
          Logger.info(
            `Applying transformation: ${item.name}`,
            {
              itemId: item.id,
              itemName: item.name,
            },
            "DRAG_DROP",
          );

          // Apply the transformation (this will handle adding the item to the actor)
          await this.actor.applyTransformation(item);

          // Get the transformation item that was added to the actor
          const actorTransformationItem = this.actor.items.get(item.id);
          Logger.methodExit("ActorSheetDragDropMixin", "_onDropItem", [
            actorTransformationItem,
          ]);
          return [actorTransformationItem];
        }

        // Create the owned item
        const result = await this._onDropItemCreate(item, event);

        Logger.info(
          `Created item: ${item.name}`,
          {
            itemId: result[0]?.id,
            itemName: result[0]?.name,
            itemType: result[0]?.type,
          },
          "DRAG_DROP",
        );

        Logger.methodExit("ActorSheetDragDropMixin", "_onDropItem", result);
        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Drop item on ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.ItemDropError",
          ),
        });

        Logger.methodExit("ActorSheetDragDropMixin", "_onDropItem", null);
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
      Logger.methodEntry("ActorSheetDragDropMixin", "_onDropFolder", {
        actorName: this.actor?.name,
        folderData: data,
      });

      try {
        if (!this.actor.isOwner) {
          Logger.debug("Drop not allowed - no ownership", null, "DRAG_DROP");
          Logger.methodExit("ActorSheetDragDropMixin", "_onDropFolder", []);
          return [];
        }

        const folder = await Folder.implementation.fromDropData(data);

        if (folder.type !== "Item") {
          Logger.debug(
            "Folder is not an Item folder",
            { folderType: folder.type },
            "DRAG_DROP",
          );
          Logger.methodExit("ActorSheetDragDropMixin", "_onDropFolder", []);
          return [];
        }

        const droppedItemData = await Promise.all(
          folder.contents.map(async (item) => {
            if (!(item instanceof Item)) item = await fromUuid(item.uuid);
            return item;
          }),
        );

        const result = await this._onDropItemCreate(droppedItemData, event);

        Logger.info(
          `Created ${result.length} items from folder: ${folder.name}`,
          {
            folderId: folder.id,
            folderName: folder.name,
            itemCount: result.length,
          },
          "DRAG_DROP",
        );

        Logger.methodExit("ActorSheetDragDropMixin", "_onDropFolder", result);
        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Drop folder on ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.FolderDropError",
          ),
        });

        Logger.methodExit("ActorSheetDragDropMixin", "_onDropFolder", []);
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
      Logger.methodEntry("ActorSheetDragDropMixin", "_onDropItemCreate", {
        itemCount: Array.isArray(itemData) ? itemData.length : 1,
      });

      try {
        itemData = itemData instanceof Array ? itemData : [itemData];
        const result = await this.actor.createEmbeddedDocuments(
          "Item",
          itemData,
        );

        Logger.methodExit(
          "ActorSheetDragDropMixin",
          "_onDropItemCreate",
          result,
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

        Logger.methodExit("ActorSheetDragDropMixin", "_onDropItemCreate", []);
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
      Logger.methodEntry("ActorSheetDragDropMixin", "_onSortItem", {
        itemId: item.id,
        itemName: item.name,
      });

      try {
        // Get the drag source and drop target
        const items = this.actor.items;
        const dropTarget = event.target.closest("[data-item-id]");

        if (!dropTarget) {
          Logger.debug("No valid drop target found", null, "DRAG_DROP");
          Logger.methodExit("ActorSheetDragDropMixin", "_onSortItem", null);
          return null;
        }

        const target = items.get(dropTarget.dataset.itemId);

        // Don't sort on yourself
        if (item.id === target.id) {
          Logger.debug(
            "Cannot sort item on itself",
            { itemId: item.id },
            "DRAG_DROP",
          );
          Logger.methodExit("ActorSheetDragDropMixin", "_onSortItem", null);
          return null;
        }

        // Identify sibling items based on adjacent HTML elements
        const siblings = [];
        for (const el of dropTarget.parentElement.children) {
          const siblingId = el.dataset.itemId;
          if (siblingId && siblingId !== item.id) {
            siblings.push(items.get(siblingId));
          }
        }

        // Perform the sort
        const sortUpdates = SortingHelpers.performIntegerSort(item, {
          target,
          siblings,
        });

        const updateData = sortUpdates.map((u) => ({
          _id: u.target.id,
          ...u.update,
        }));
        const result = await this.actor.updateEmbeddedDocuments(
          "Item",
          updateData,
        );

        Logger.debug(
          "Item sorting completed",
          {
            itemId: item.id,
            updatesCount: updateData.length,
          },
          "DRAG_DROP",
        );

        Logger.methodExit("ActorSheetDragDropMixin", "_onSortItem", result);
        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Sort item for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.ItemSortError",
          ),
        });

        Logger.methodExit("ActorSheetDragDropMixin", "_onSortItem", null);
        return null;
      }
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
    _canDragStart(selector) {
      const canDrag = this.isEditable;
      Logger.debug(
        "Drag permission check",
        {
          selector,
          canDrag,
          isEditable: this.isEditable,
          actorName: this.actor?.name,
        },
        "DRAG_DROP",
      );
      return canDrag;
    }

    /**
     * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
     * @param {string} selector - The candidate HTML selector for the drop target
     * @returns {boolean} Can the current user drop on this selector?
     * @protected
     */
    _canDragDrop(selector) {
      const canDrop = this.isEditable;
      Logger.debug(
        "Drop permission check",
        {
          selector,
          canDrop,
          isEditable: this.isEditable,
          actorName: this.actor?.name,
        },
        "DRAG_DROP",
      );
      return canDrop;
    }

    /**
     * Begins a drag operation from a popped out sheet
     * @param {DragEvent} event - The originating DragEvent
     * @protected
     */
    _onDragStart(event) {
      Logger.debug(
        "Drag start event triggered",
        {
          currentTarget: event.currentTarget,
          target: event.target,
          targetDataset: event.target.dataset,
          currentTargetDataset: event.currentTarget.dataset,
          currentTargetClasses: event.currentTarget.className,
        },
        "DRAG_DROP",
      );

      // Support li, tr elements, and transformation cards
      const docRow = event.currentTarget.closest(
        "li, tr, .eventide-transformation-card",
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

      Logger.debug(
        "Found draggable element",
        {
          docRow,
          docRowClasses: docRow.className,
          docRowDataset: docRow.dataset,
          isTransformationCard: docRow.classList.contains(
            "eventide-transformation-card",
          ),
        },
        "DRAG_DROP",
      );

      // Don't drag if clicking on a link or button (except the transformation card itself)
      if ("link" in event.target.dataset) {
        Logger.debug(
          "Preventing drag on link element",
          { target: event.target },
          "DRAG_DROP",
        );
        return;
      }

      // Allow dragging transformation cards even when clicking buttons, but prevent if clicking the revert button specifically
      if (event.target.closest(".eventide-transformation-card__revert")) {
        Logger.debug(
          "Preventing drag on revert button",
          { target: event.target },
          "DRAG_DROP",
        );
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

      Logger.debug(
        "Found document for drag",
        {
          documentId: document.id,
          documentName: document.name,
          documentType: document.type || document.documentName,
        },
        "DRAG_DROP",
      );

      // Get drag data from the document
      const dragData = document.toDragData();
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

      Logger.info(
        "Drag operation started successfully",
        {
          documentId: document.id,
          documentName: document.name,
          documentType: document.type || document.documentName,
          dragDataType: dragData.type,
          elementType: docRow.classList.contains("eventide-transformation-card")
            ? "transformation-card"
            : "table-row",
        },
        "DRAG_DROP",
      );
    }

    /**
     * Callback actions which occur when a dragged element is over a drop target.
     * @param {DragEvent} _event - The originating DragEvent
     * @protected
     */
    _onDragOver(_event) {}

    /**
     * Callback actions which occur when a drag operation ends.
     * @param {DragEvent} event - The originating DragEvent
     * @protected
     */
    _onDragEnd(event) {
      // Remove visual feedback
      const docRow = event.currentTarget.closest(
        "li, tr, .eventide-transformation-card",
      );
      if (docRow && docRow.classList.contains("eventide-transformation-card")) {
        docRow.classList.remove("dragging");
      }

      Logger.debug(
        "Drag operation ended",
        {
          currentTarget: event.currentTarget,
          elementType: docRow?.classList.contains(
            "eventide-transformation-card",
          )
            ? "transformation-card"
            : "table-row",
        },
        "DRAG_DROP",
      );
    }

    /**
     * Fetches the embedded document representing the containing HTML element
     * @param {HTMLElement} target - The element subject to search
     * @returns {Item | ActiveEffect} The embedded Item or ActiveEffect
     */
    _getEmbeddedDocument(target) {
      // Support li, tr elements, and transformation cards for different template structures
      const docRow =
        target.closest(
          "li[data-document-class], tr[data-document-class], .eventide-transformation-card[data-item-id]",
        ) || target.closest("[data-item-id]");

      if (docRow) {
        const itemId = docRow.dataset.itemId;

        // Handle transformation cards specifically
        if (docRow.classList.contains("eventide-transformation-card")) {
          // First try to find the transformation item in the actor's items
          let transformationItem = this.actor.items.get(itemId);
          if (
            transformationItem &&
            transformationItem.type === "transformation"
          ) {
            Logger.debug(
              "Found transformation item in actor's items for drag",
              {
                itemId,
                itemName: transformationItem.name,
                itemType: transformationItem.type,
              },
              "DRAG_DROP",
            );
            return transformationItem;
          }

          // If not found in actor's items, try to find it in the world or compendiums
          // This handles the case where the transformation was applied and the item was removed
          transformationItem = game.items.get(itemId);
          if (
            transformationItem &&
            transformationItem.type === "transformation"
          ) {
            Logger.debug(
              "Found transformation item in world items for drag",
              {
                itemId,
                itemName: transformationItem.name,
                itemType: transformationItem.type,
              },
              "DRAG_DROP",
            );
            return transformationItem;
          }

          // Last resort: create a temporary item from stored flag data
          const activeTransformationId = this.actor.getFlag(
            "eventide-rp-system",
            "activeTransformation",
          );
          if (activeTransformationId === itemId) {
            const transformationName = this.actor.getFlag(
              "eventide-rp-system",
              "activeTransformationName",
            );
            const transformationCursed = this.actor.getFlag(
              "eventide-rp-system",
              "activeTransformationCursed",
            );
            const embeddedCombatPowersData = this.actor.getFlag(
              "eventide-rp-system",
              "activeTransformationCombatPowers",
            );

            if (transformationName) {
              // Create a minimal transformation item for dragging
              const tempTransformationData = {
                _id: itemId,
                name: transformationName,
                type: "transformation",
                system: {
                  cursed: transformationCursed || false,
                  embeddedCombatPowers: embeddedCombatPowersData || [],
                },
              };

              const tempItem = new CONFIG.Item.documentClass(
                tempTransformationData,
                {
                  parent: null, // No parent since this is a temporary item
                },
              );

              Logger.debug(
                "Created temporary transformation item for drag from flags",
                {
                  itemId,
                  itemName: transformationName,
                  itemType: "transformation",
                },
                "DRAG_DROP",
              );
              return tempItem;
            }
          }

          Logger.warn(
            "Could not find transformation item for drag",
            {
              itemId,
              actorItems: this.actor.items.size,
              worldItems: game.items.size,
              activeTransformationId: this.actor.getFlag(
                "eventide-rp-system",
                "activeTransformation",
              ),
            },
            "DRAG_DROP",
          );
          return null;
        }

        // Handle direct item ID reference
        if (itemId && !docRow.dataset.documentClass) {
          // First try to find in actor's items
          let item = this.actor.items.get(itemId);
          if (item) return item;

          // If not found, check transformation combat powers
          item = this._findTransformationCombatPower(itemId);
          if (item) return item;
        }

        // Handle document class structure
        if (docRow.dataset.documentClass === "Item") {
          // First try to find in actor's items
          let item = this.actor.items.get(itemId);
          if (item) return item;

          // If not found, check transformation combat powers
          item = this._findTransformationCombatPower(itemId);
          if (item) return item;
        } else if (docRow.dataset.documentClass === "ActiveEffect") {
          const parent =
            docRow.dataset.parentId === this.actor.id
              ? this.actor
              : this.actor.items.get(docRow?.dataset.parentId);
          return parent.effects.get(docRow?.dataset.effectId);
        }
      }

      // Fallback: check if target itself has item-id
      if (target.dataset.itemId) {
        // First try to find in actor's items
        let item = this.actor.items.get(target.dataset.itemId);
        if (item) return item;

        // If not found, check transformation combat powers
        item = this._findTransformationCombatPower(target.dataset.itemId);
        if (item) return item;
      }

      Logger.warn(
        "Could not find document class or item ID",
        {
          target,
          docRow,
          itemId: docRow?.dataset?.itemId,
          documentClass: docRow?.dataset?.documentClass,
          isTransformationCard: docRow?.classList?.contains(
            "eventide-transformation-card",
          ),
        },
        "DRAG_DROP",
      );
      return null;
    }

    /**
     * Find a transformation combat power by ID
     * @param {string} itemId - The item ID to search for
     * @returns {Item|null} The transformation combat power item or null if not found
     * @private
     */
    _findTransformationCombatPower(itemId) {
      // Get all transformation items
      const transformations = this.actor.items.filter(
        (i) => i.type === "transformation",
      );

      // Search through all embedded combat powers
      for (const transformation of transformations) {
        const embeddedPowers = transformation.system.getEmbeddedCombatPowers();
        const power = embeddedPowers.find((p) => p.id === itemId);
        if (power) {
          return power;
        }
      }

      return null;
    }
  };
