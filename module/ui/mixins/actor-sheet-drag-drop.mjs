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
     * Handle the dropping of ActiveEffect data onto an Actor Sheet
     * @param {DragEvent} event - The concluding DragEvent which contains drop data
     * @param {object} data - The data transfer extracted from the event
     * @returns {Promise<ActiveEffect|boolean>} The created ActiveEffect object or false if it couldn't be created.
     * @protected
     */
    async _onDropActiveEffect(event, data) {

      try {
        const aeCls = getDocumentClass("ActiveEffect");
        const effect = await aeCls.fromDropData(data);

        if (!this.actor.isOwner || !effect) {
          return false;
        }

        if (effect.target === this.actor) {
          const result = await this._onSortActiveEffect(event, effect);
          return result;
        }

        const result = await aeCls.create(effect, { parent: this.actor });

        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Drop active effect on ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.EffectDropError",
          ),
        });

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

      try {
        const dropTarget = event.target.closest("[data-effect-id]");
        if (!dropTarget) {
          return null;
        }

        const target = this._getEmbeddedDocument(dropTarget);

        // Don't sort on yourself
        if (effect.uuid === target.uuid) {
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

        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Sort active effect for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.EffectSortError",
          ),
        });

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

      if (!this.actor.isOwner) {
        return false;
      }

      // Currently no specific actor-on-actor drop behavior implemented
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

      try {
        // Remove drag feedback when drop occurs
        this._removeDragFeedback();
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
        const actionCardDropZone = event.target.closest('[data-drop-zone="actionCard"]');
        if (actionCardDropZone && ["feature", "combatPower", "gear", "status"].includes(item.type)) {
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
        const result = await this._onDropItemCreate(item, event);

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

      try {
        // Get the drag source and drop target
        const items = this.actor.items;
        const dropTarget = event.target.closest("[data-item-id]");

        if (!dropTarget) {
          return null;
        }

        const target = items.get(dropTarget.dataset.itemId);

        // Don't sort on yourself
        if (item.id === target.id) {
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

        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Sort item for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.ItemSortError",
          ),
        });

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
      this._addDragFeedback(event);
    }

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

    }

    /**
     * Add visual feedback during drag operations
     * @param {DragEvent} event - The drag event
     * @private
     */
    _addDragFeedback(event) {
      // Only add feedback if we're dragging something that can create action cards
      try {
        const dragData = event.dataTransfer.getData("text/plain");
        if (!dragData) return;

        const data = JSON.parse(dragData);
        if (data.type === "Item" && ["feature", "combatPower", "gear", "status"].includes(data.data?.type)) {
          this._highlightActionCardDropZone();
        }
      } catch {
        // Ignore parsing errors - not all drags will have valid JSON data
      }
    }

    /**
     * Highlight the action card drop zone
     * @private
     */
    _highlightActionCardDropZone() {
      const dropZone = this.element.querySelector('[data-drop-zone="actionCard"]');
      if (dropZone) {
        dropZone.classList.add("drag-over");
      }
    }

    /**
     * Remove drag feedback from action card drop zone
     * @private
     */
    _removeDragFeedback() {
      const dropZone = this.element.querySelector('[data-drop-zone="actionCard"]');
      if (dropZone) {
        dropZone.classList.remove("drag-over");
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
            return transformationItem;
          }

          // If not found in actor's items, try to find it in the world or compendiums
          // This handles the case where the transformation was applied and the item was removed
          transformationItem = game.items.get(itemId);
          if (
            transformationItem &&
            transformationItem.type === "transformation"
          ) {
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

          // If still not found, check transformation action cards
          item = this._findTransformationActionCard(itemId);
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

          // If still not found, check transformation action cards
          item = this._findTransformationActionCard(itemId);
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

    _findTransformationActionCard(itemId) {
      // Get all transformation items
      const transformations = this.actor.items.filter(
        (i) => i.type === "transformation",
      );

      // Search through all embedded action cards
      for (const transformation of transformations) {
        const embeddedActionCards = transformation.system.getEmbeddedActionCards();
        const actionCard = embeddedActionCards.find((ac) => ac.id === itemId);
        if (actionCard) {
          return actionCard;
        }
      }

      return null;
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

        // Create the action card data for non-status items
        const actionCardData = {
          name: game.i18n.format("EVENTIDE_RP_SYSTEM.Actor.ActionCards.GeneratedName", {
            itemName: item.name,
          }),
          type: "actionCard",
          img: item.img || "icons/svg/item-bag.svg",
          system: {
            description: item.system?.description || "",
            mode: "attackChain",
            bgColor: item.system?.bgColor || "#8B4513",
            textColor: item.system?.textColor || "#ffffff",
            advanceInitiative: false,
            attemptInventoryReduction: false,
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
        const createdItems = await this.actor.createEmbeddedDocuments("Item", [actionCardData]);
        const actionCard = createdItems[0];

        if (!actionCard) {
          throw new Error("Failed to create action card");
        }

        // Set the embedded item
        await actionCard.setEmbeddedItem(item);

        // Show success notification
        ui.notifications.info(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Actor.ActionCards.CreatedFromItem", {
            actionCardName: actionCard.name,
            itemName: item.name,
          }),
        );

        return [actionCard];
      } catch (error) {
        Logger.error("Failed to create action card from item", error, "DRAG_DROP");
        
        ui.notifications.error(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.FailedToCreateActionCard", {
            itemName: item.name,
          }),
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

        // Create saved damage action card data with status appearance
        const actionCardData = {
          name: game.i18n.format("EVENTIDE_RP_SYSTEM.Actor.ActionCards.StatusGeneratedName", {
            statusName,
          }),
          type: "actionCard",
          img: statusImg,
          system: {
            description: statusDescription,
            mode: "savedDamage",
            bgColor,
            textColor,
            advanceInitiative: false,
            attemptInventoryReduction: false,
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
              description: game.i18n.format("EVENTIDE_RP_SYSTEM.Actor.ActionCards.StatusDamageDescription", {
                statusName,
              }),
            },
            embeddedStatusEffects: [],
          },
        };

        // Create the action card
        const createdItems = await this.actor.createEmbeddedDocuments("Item", [actionCardData]);
        const actionCard = createdItems[0];

        if (!actionCard) {
          throw new Error("Failed to create status action card");
        }

        // Show success notification
        ui.notifications.info(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Actor.ActionCards.CreatedStatusActionCard", {
            actionCardName: actionCard.name,
            statusName,
          }),
        );

        return [actionCard];
      } catch (error) {
        Logger.error("Failed to create status action card", error, "DRAG_DROP");
        
        ui.notifications.error(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.FailedToCreateStatusActionCard", {
            statusName: statusItem.name || "Unknown Status",
          }),
        );

        return [];
      }
    }
  };
