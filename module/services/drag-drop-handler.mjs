/**
 * DragDropHandler Service
 *
 * A stateless service that provides drag-drop functionality for both actor and item sheets.
 * Uses configuration objects to handle context-specific differences between actor and item sheets.
 *
 * This service consolidates the drag-drop logic that was previously duplicated between
 * actor-sheet-drag-drop.mjs and item-sheet-drag-drop.mjs.
 *
 * @static
 * @class DragDropHandler
 */

import { Logger } from "./logger.mjs";
import { ErrorHandler } from "../utils/error-handler.mjs";

const { TextEditor } = foundry.applications.ux;

/**
 * Configuration object for actor sheet drag-drop operations
 * @constant
 */
const ACTOR_DRAG_DROP_CONFIG = Object.freeze({
  // Context identification
  type: "actor",

  // Data accessors
  getDataStore: (sheet) => sheet.actor,
  getItems: (dataStore) => dataStore.items,
  getGroups: (dataStore) => dataStore.system.actionCardGroups || [],

  // Update methods
  updateDocument: (dataStore, updateData) => dataStore.update(updateData),
  updateEmbeddedDocuments: (dataStore, embeddedType, updates) =>
    dataStore.updateEmbeddedDocuments(embeddedType, updates),
  createEmbeddedDocuments: (dataStore, embeddedType, data) =>
    dataStore.createEmbeddedDocuments(embeddedType, data),

  // Group management
  updateGroups: (dataStore, groups) =>
    dataStore.update({ "system.actionCardGroups": groups }),

  // Action card specific
  getActionCards: (dataStore) =>
    dataStore.items.filter((i) => i.type === "actionCard"),
  getGroupCards: (dataStore, groupId) =>
    dataStore.items.filter(
      (i) => i.type === "actionCard" && i.system.groupId === groupId,
    ),

  // Embedded document retrieval
  findItem: (dataStore, itemId) => dataStore.items.get(itemId),

  // Transformation support
  findTransformationCombatPower: (dataStore, itemId) => {
    // First check if actor has getCurrentCombatPowers method (from transformation mixin)
    if (typeof dataStore.getCurrentCombatPowers === "function") {
      const currentCombatPowers = dataStore.getCurrentCombatPowers();
      const power = currentCombatPowers.find((p) => p.id === itemId);
      if (power) {
        return power;
      }
    }

    // Fallback: Get all transformation items and search embedded combat powers
    const transformations = dataStore.items.filter(
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
  },

  findTransformationActionCard: (dataStore, itemId) => {
    // First check if actor has getCurrentActionCards method (from transformation mixin)
    if (typeof dataStore.getCurrentActionCards === "function") {
      const currentActionCards = dataStore.getCurrentActionCards();
      const actionCard = currentActionCards.find((ac) => ac.id === itemId);
      if (actionCard) {
        return actionCard;
      }
    }

    // Fallback: Get all transformation items and search embedded action cards
    const transformations = dataStore.items.filter(
      (i) => i.type === "transformation",
    );

    // Search through all embedded action cards
    for (const transformation of transformations) {
      const embeddedActionCards =
        transformation.system.getEmbeddedActionCards();
      const actionCard = embeddedActionCards.find((ac) => ac.id === itemId);
      if (actionCard) {
        return actionCard;
      }
    }

    return null;
  },

  // Selectors
  dropZoneSelector: '[data-drop-zone="actionCard"]',
  itemSelector: "[data-item-id]",
  groupSelector: ".erps-action-card-group",
  ungroupedZoneSelector: "[data-ungrouped-zone]",

  // CSS classes
  draggingClass: "erps-data-table__row--dragging",
  groupDraggingClass: "erps-action-card-group--dragging",
  dragOverClass: "drag-over",

  // Feature flags
  supportsTransformationItems: true,
  supportsActionCardCreation: true,
  supportsGroupCopy: true,
  supportsCardCopy: true,

  // Tab detection for GM actions
  isGmActionsTabActive: (sheet) =>
    sheet.tabGroups?.primary === "gmActionCards" ||
    sheet.element?.querySelector(".tab.gm-action-cards.active") !== null,

  // Sorting function
  sortFunction: foundry.utils.performIntegerSort,

  // Hooks
  dropHookName: "dropActorSheetData",

  // Error context
  errorContextPrefix: "actor",
});

/**
 * Configuration object for item sheet drag-drop operations
 * @constant
 */
const ITEM_DRAG_DROP_CONFIG = Object.freeze({
  // Context identification
  type: "item",

  // Data accessors
  getDataStore: (sheet) => sheet.item,
  getItems: (dataStore) => {
    // For transformations, return embedded action cards
    if (dataStore.type === "transformation") {
      return dataStore.system.getEmbeddedActionCards();
    }
    return [];
  },
  getGroups: (dataStore) => dataStore.system.actionCardGroups || [],

  // Update methods
  updateDocument: (dataStore, updateData) => dataStore.update(updateData),
  updateEmbeddedDocuments: (dataStore, embeddedType, updates) =>
    dataStore.updateEmbeddedDocuments(embeddedType, updates),
  createEmbeddedDocuments: (dataStore, embeddedType, data) =>
    dataStore.createEmbeddedDocuments(embeddedType, data),

  // Group management (for transformations)
  updateGroups: (dataStore, groups) =>
    dataStore.update({ "system.actionCardGroups": groups }),
  updateEmbeddedActionCards: (dataStore, cards) =>
    dataStore.update({ "system.embeddedActionCards": cards }),

  // Action card specific
  getActionCards: (dataStore) => {
    if (dataStore.type === "transformation") {
      return dataStore.system.getEmbeddedActionCards();
    }
    return [];
  },
  getGroupCards: (dataStore, groupId) => {
    if (dataStore.type === "transformation") {
      const cards = dataStore.system.getEmbeddedActionCards();
      return cards.filter((c) => c.system.groupId === groupId);
    }
    return [];
  },

  // Embedded document retrieval
  findItem: (dataStore, itemId) => {
    if (dataStore.type === "transformation") {
      const cards = dataStore.system.getEmbeddedActionCards();
      return cards.find((c) => c._id === itemId || c.id === itemId);
    }
    return null;
  },

  // Transformation support
  findTransformationCombatPower: (dataStore, itemId) => {
    if (dataStore.type === "transformation") {
      const powers = dataStore.system.getEmbeddedCombatPowers();
      return powers.find((p) => p.id === itemId);
    }
    return null;
  },
  findTransformationActionCard: (dataStore, itemId) => {
    if (dataStore.type === "transformation") {
      const cards = dataStore.system.getEmbeddedActionCards();
      return cards.find((c) => c.id === itemId);
    }
    return null;
  },

  // Selectors
  dropZoneSelector: ".erps-items-panel__drop-zone",
  itemSelector: "[data-item-id]",
  groupSelector: ".erps-action-card-group",
  ungroupedZoneSelector: "[data-ungrouped-zone]",

  // CSS classes
  draggingClass: "erps-items-panel__item--dragging",
  groupDraggingClass: "erps-action-card-group--dragging",
  dragOverClass: "drag-over",
  dragActiveClass: "drag-active",

  // Feature flags
  supportsTransformationItems: false,
  supportsActionCardCreation: false,
  supportsGroupCopy: true,
  supportsCardCopy: false, // Not supported for transformations yet

  // Tab detection (not applicable for item sheets)
  isGmActionsTabActive: () => false,

  // Sorting function
  sortFunction: foundry.utils.performIntegerSort,

  // Hooks
  dropHookName: "dropItemSheetData",

  // Error context
  errorContextPrefix: "item",
});

/**
 * DragDropHandler Service
 *
 * Provides static methods for handling drag-drop operations on actor and item sheets.
 * All methods are stateless and use configuration objects to handle context differences.
 */
export class DragDropHandler {
  /**
   * Handle the main drop event
   *
   * Routes to appropriate handler based on data type.
   *
   * @param {object} config - Configuration object (ACTOR_DRAG_DROP_CONFIG or ITEM_DRAG_DROP_CONFIG)
   * @param {object} sheet - The sheet instance (actor or item sheet)
   * @param {DragEvent} event - The drag event
   * @returns {Promise<boolean>} Success status
   * @static
   */
  static async handleDrop(config, sheet, event) {
    try {
      const data = TextEditor.implementation.getDragEventData(event);
      const dataStore = config.getDataStore(sheet);
      const allowed = Hooks.call(config.dropHookName, dataStore, sheet, data);

      if (allowed === false) {
        return false;
      }

      // Handle different data types
      let result;
      switch (data.type) {
        case "Group":
          result = await DragDropHandler.handleDropGroup(
            config,
            sheet,
            event,
            data,
          );
          break;
        case "Item":
          result = await DragDropHandler.handleDropItem(
            config,
            sheet,
            event,
            data,
          );
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
        context: `Handle drop on ${config.getDataStore(sheet)?.name}`,
        errorType: ErrorHandler.ERROR_TYPES.UI,
        userMessage: game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.DropError"),
      });

      return false;
    }
  }

  /**
   * Handle dropping an Item
   *
   * Creates new items or sorts existing ones.
   *
   * @param {object} config - Configuration object
   * @param {object} sheet - The sheet instance
   * @param {DragEvent} event - The drag event
   * @param {object} data - The drag data
   * @returns {Promise<Item[]|boolean>} Created items or false
   * @static
   */
  static async handleDropItem(config, sheet, event, data) {
    try {
      // Remove drag feedback
      DragDropHandler.removeDragFeedback(config, sheet);

      const dataStore = config.getDataStore(sheet);

      if (!dataStore.isOwner) {
        return false;
      }

      // Get item from drop data
      const item = await fromUuid(data.uuid);
      if (!item) {
        return false;
      }

      // Handle item sorting if same parent
      if (item.parent === dataStore) {
        return await DragDropHandler.handleSortItem(config, sheet, event, item);
      }

      // Handle action card drop zone (actor only)
      if (
        config.supportsActionCardCreation &&
        event.target.closest(config.dropZoneSelector)
      ) {
        // This is handled by sheet-specific logic
        return false;
      }

      // Handle transformation items (actor only)
      if (
        config.supportsTransformationItems &&
        item.type === "transformation"
      ) {
        // This is handled by sheet-specific logic
        return false;
      }

      // Create item using config.createEmbeddedDocuments
      const itemData = item.toObject();
      delete itemData._id; // Remove ID to prevent collisions

      // Check if we're currently on the GM Actions tab (actor only)
      if (
        config.isGmActionsTabActive(sheet) &&
        itemData.type === "actionCard"
      ) {
        itemData.system.gmOnly = true;
      }

      const result = await config.createEmbeddedDocuments(dataStore, "Item", [
        itemData,
      ]);

      return result;
    } catch (error) {
      await ErrorHandler.handleAsync(Promise.reject(error), {
        context: `Create dropped items for ${config.getDataStore(sheet)?.name}`,
        errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
        userMessage: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Errors.ItemCreateError",
        ),
      });

      return [];
    }
  }

  /**
   * Handle sorting an Item
   *
   * Reorders items within their parent container.
   *
   * @param {object} config - Configuration object
   * @param {object} sheet - The sheet instance
   * @param {DragEvent} event - The drag event
   * @param {Item} item - The item being sorted
   * @returns {Promise<Item[]>} Updated items
   * @static
   */
  static async handleSortItem(config, sheet, event, item) {
    try {
      const dataStore = config.getDataStore(sheet);

      // Handle action card tab switching (actor only)
      if (config.type === "actor" && item.type === "actionCard") {
        const isGmActionsTabActive = config.isGmActionsTabActive(sheet);

        // Update gmOnly flag if it doesn't match the current tab
        if (item.system.gmOnly !== isGmActionsTabActive) {
          await item.update({ "system.gmOnly": isGmActionsTabActive });
        }
      }

      // Get the drop target
      const dropTarget = event.target.closest(config.itemSelector);

      if (!dropTarget) {
        // Check if dropped on the ungrouped zone
        const ungroupedZone = event.target.closest(
          config.ungroupedZoneSelector,
        );
        if (
          ungroupedZone &&
          item.type === "actionCard" &&
          item.system.groupId
        ) {
          // Ungroup the card by removing its groupId
          const oldGroupId = item.system.groupId;
          await item.update({ "system.groupId": null });
          await DragDropHandler.checkGroupDissolution(
            config,
            sheet,
            oldGroupId,
          );
          Logger.debug(
            "Card moved to ungrouped",
            { cardId: item.id, oldGroupId },
            "DRAG_DROP",
          );
          return [item];
        }

        // Check if dropped on a group (not on a specific item)
        const groupTarget = event.target.closest(config.groupSelector);
        if (groupTarget && item.type === "actionCard") {
          return await DragDropHandler.handleCardDropOnGroup(
            config,
            sheet,
            event,
            item,
            groupTarget,
          );
        }
        return null;
      }

      const target = config.findItem(dataStore, dropTarget.dataset.itemId);

      // Don't sort on yourself
      if (item.id === target.id) {
        return null;
      }

      // Handle action card specific logic
      if (item.type === "actionCard" && target.type === "actionCard") {
        return await DragDropHandler.handleActionCardSort(
          config,
          sheet,
          event,
          item,
          target,
          dropTarget,
        );
      }

      // Identify sibling items based on adjacent HTML elements
      const siblings = [];
      for (const el of dropTarget.parentElement.children) {
        const siblingId = el.dataset.itemId;
        if (siblingId && siblingId !== item.id) {
          siblings.push(config.findItem(dataStore, siblingId));
        }
      }

      // Perform the sort
      const sortUpdates = config.sortFunction(item, {
        target,
        siblings,
      });

      const updateData = sortUpdates.map((u) => ({
        _id: u.target.id,
        ...u.update,
      }));
      const result = await config.updateEmbeddedDocuments(
        dataStore,
        "Item",
        updateData,
      );

      return result;
    } catch (error) {
      await ErrorHandler.handleAsync(Promise.reject(error), {
        context: `Sort item for ${config.getDataStore(sheet)?.name}`,
        errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
        userMessage: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.Errors.ItemSortError",
        ),
      });

      return null;
    }
  }

  /**
   * Handle dropping a Group
   *
   * Reorders groups or copies groups between sheets.
   *
   * @param {object} config - Configuration object
   * @param {object} sheet - The sheet instance
   * @param {DragEvent} event - The drag event
   * @param {object} data - The drag data
   * @returns {Promise<boolean>} Success status
   * @static
   */
  static async handleDropGroup(config, sheet, event, data) {
    try {
      if (!sheet.isEditable) {
        return false;
      }

      const dataStore = config.getDataStore(sheet);
      const dropTarget = event.target.closest(config.groupSelector);

      // Don't allow dropping on the same group
      if (dropTarget && dropTarget.dataset.groupId === data.groupId) {
        return false;
      }

      // Determine if this is the same source
      const isSameSource =
        (config.type === "actor" && data.actorId === dataStore.id) ||
        (config.type === "item" && data.transformationId === dataStore.id);

      if (isSameSource) {
        // Same source - reorder groups (only if dropping on another group)
        if (!dropTarget) {
          // Dropping in empty space on same source - do nothing
          return false;
        }

        const existingGroups = config.getGroups(dataStore);
        const sourceGroup = existingGroups.find((g) => g._id === data.groupId);
        const targetGroup = existingGroups.find(
          (g) => g._id === dropTarget.dataset.groupId,
        );

        if (!sourceGroup || !targetGroup) {
          return false;
        }

        // Perform the sort
        const sortUpdates = config.sortFunction(sourceGroup, {
          target: targetGroup,
          siblings: existingGroups,
        });

        const updatedGroups = existingGroups.map((g) => {
          const update = sortUpdates.find((u) => u.target._id === g._id);
          return update ? { ...g, ...update.update } : g;
        });

        await config.updateGroups(dataStore, updatedGroups);

        Logger.debug(
          "Reordered groups",
          { sourceId: data.groupId, targetId: dropTarget.dataset.groupId },
          "DRAG_DROP",
        );

        return true;
      }

      // Cross-source drop - copy the group and its cards
      // This is handled by sheet-specific logic
      return false;
    } catch (error) {
      Logger.error("Failed to drop group", error, "DRAG_DROP");
      return false;
    }
  }

  /**
   * Create a new action card group
   *
   * Creates a group from the specified card IDs.
   *
   * @param {object} config - Configuration object
   * @param {object} sheet - The sheet instance
   * @param {string[]} cardIds - Array of card IDs to group
   * @param {object} options - Options for group creation
   * @param {string} [options.groupName] - Optional name for the group
   * @param {number} [options.sort] - Optional sort order for the group
   * @returns {Promise<string>} The new group ID
   * @static
   */
  static async createGroup(config, sheet, cardIds, options = {}) {
    try {
      const dataStore = config.getDataStore(sheet);
      const existingGroups = config.getGroups(dataStore);

      // Generate new group ID and name
      const groupId = foundry.utils.randomID();
      const groupCount = existingGroups.length + 1;
      const groupName =
        options.groupName ||
        game.i18n.format("EVENTIDE_RP_SYSTEM.Actor.ActionCards.NewGroupName", {
          number: groupCount,
        });

      // Determine sort order
      let sort = options.sort;
      if (sort === undefined) {
        if (existingGroups.length > 0) {
          sort = Math.max(...existingGroups.map((g) => g.sort || 0)) + 1;
        } else {
          sort = 0;
        }
      }

      // Create the new group
      const newGroup = {
        _id: groupId,
        name: groupName,
        sort,
      };

      // Update cards with new groupId
      const actionCards = config.getActionCards(dataStore);
      const updatedCards = actionCards.map((card) => {
        if (cardIds.includes(card.id || card._id)) {
          return {
            _id: card.id || card._id,
            system: {
              ...card.system,
              groupId,
            },
          };
        }
        return card;
      });

      // Update groups array
      const updatedGroups = [...existingGroups, newGroup];

      // Apply updates based on config type
      if (config.type === "actor") {
        // For actors, update embedded documents
        const cardUpdates = cardIds.map((cardId) => ({
          _id: cardId,
          "system.groupId": groupId,
        }));
        await config.updateEmbeddedDocuments(dataStore, "Item", cardUpdates);
        await config.updateGroups(dataStore, updatedGroups);
      } else {
        // For transformations, update the embedded action cards array
        await config.updateEmbeddedActionCards(dataStore, updatedCards);
        await config.updateGroups(dataStore, updatedGroups);
      }

      ui.notifications.info(
        game.i18n.format(
          "EVENTIDE_RP_SYSTEM.Actor.ActionCards.CreateGroupSuccess",
          {
            name: newGroup.name,
          },
        ),
      );

      Logger.debug(
        "Created action card group",
        { groupId, cardIds },
        "DRAG_DROP",
      );

      return groupId;
    } catch (error) {
      Logger.error("Failed to create action card group", error, "DRAG_DROP");
      throw error;
    }
  }

  /**
   * Add a card to a group
   *
   * Updates the card's groupId to add it to the specified group.
   *
   * @param {object} config - Configuration object
   * @param {object} sheet - The sheet instance
   * @param {string} cardId - The card ID
   * @param {string} groupId - The group ID
   * @returns {Promise<void>}
   * @static
   */
  static async addCardToGroup(config, sheet, cardId, groupId) {
    try {
      const dataStore = config.getDataStore(sheet);

      if (config.type === "actor") {
        // For actors, update the embedded document
        const card = config.findItem(dataStore, cardId);
        if (card) {
          await card.update({ "system.groupId": groupId });
        }
      } else {
        // For transformations, update the embedded action cards array
        const embeddedActionCards = dataStore.system.embeddedActionCards || [];
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

        await config.updateEmbeddedActionCards(dataStore, updatedActionCards);
      }

      Logger.debug("Added card to group", { cardId, groupId }, "DRAG_DROP");
    } catch (error) {
      Logger.error("Failed to add card to group", error, "DRAG_DROP");
      throw error;
    }
  }

  /**
   * Remove a card from its group
   *
   * Sets the card's groupId to null and checks for group dissolution.
   *
   * @param {object} config - Configuration object
   * @param {object} sheet - The sheet instance
   * @param {string} cardId - The card ID
   * @returns {Promise<void>}
   * @static
   */
  static async ungroupCard(config, sheet, cardId) {
    try {
      const dataStore = config.getDataStore(sheet);
      let oldGroupId = null;

      if (config.type === "actor") {
        // For actors, update the embedded document
        const card = config.findItem(dataStore, cardId);
        if (card && card.system.groupId) {
          oldGroupId = card.system.groupId;
          await card.update({ "system.groupId": null });
        }
      } else {
        // For transformations, update the embedded action cards array
        const embeddedActionCards = dataStore.system.embeddedActionCards || [];
        const card = embeddedActionCards.find((c) => c._id === cardId);

        if (card && card.system.groupId) {
          oldGroupId = card.system.groupId;
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

          await config.updateEmbeddedActionCards(dataStore, updatedActionCards);
        }
      }

      // Check if the group should be dissolved
      if (oldGroupId) {
        await DragDropHandler.checkGroupDissolution(config, sheet, oldGroupId);
      }

      Logger.debug("Ungrouped card", { cardId, oldGroupId }, "DRAG_DROP");
    } catch (error) {
      Logger.error("Failed to ungroup card", error, "DRAG_DROP");
      throw error;
    }
  }

  /**
   * Check if a group should be dissolved (no cards left)
   *
   * Removes the group from the groups array if it has no cards.
   *
   * @param {object} config - Configuration object
   * @param {object} sheet - The sheet instance
   * @param {string} groupId - The group ID to check
   * @returns {Promise<void>}
   * @static
   */
  static async checkGroupDissolution(config, sheet, groupId) {
    try {
      const dataStore = config.getDataStore(sheet);
      const cardsInGroup = config.getGroupCards(dataStore, groupId);

      if (cardsInGroup.length === 0) {
        // No cards left in group - remove it
        const existingGroups = config.getGroups(dataStore);
        const updatedGroups = existingGroups.filter((g) => g._id !== groupId);
        await config.updateGroups(dataStore, updatedGroups);

        Logger.debug("Auto-dissolved empty group", { groupId }, "DRAG_DROP");
      }
    } catch (error) {
      Logger.error("Failed to check group dissolution", error, "DRAG_DROP");
    }
  }

  /**
   * Handle action card to action card sorting/grouping
   *
   * Handles the complex logic of grouping, ungrouping, copying, and reordering action cards.
   *
   * @param {object} config - Configuration object
   * @param {object} sheet - The sheet instance
   * @param {DragEvent} event - The drag event
   * @param {Item} draggedCard - The dragged card
   * @param {Item} targetCard - The target card
   * @param {HTMLElement} dropTarget - The drop target element
   * @returns {Promise<Item[]>} Updated items
   * @static
   */
  static async handleActionCardSort(
    config,
    sheet,
    event,
    draggedCard,
    targetCard,
    _dropTarget,
  ) {
    const { shift, ctrl } = sheet._dragModifiers || {};

    // Shift+drag: Ungroup card
    if (shift && draggedCard.system.groupId) {
      const oldGroupId = draggedCard.system.groupId;
      await draggedCard.update({ "system.groupId": null });

      // Check if the group should be dissolved
      await DragDropHandler.checkGroupDissolution(config, sheet, oldGroupId);

      Logger.debug(
        "Ungrouped card via shift+drag",
        { cardId: draggedCard.id, oldGroupId },
        "DRAG_DROP",
      );
      return [draggedCard];
    }

    // Ctrl+drag: Copy card (if supported)
    if (ctrl && config.supportsCardCopy) {
      const dataStore = config.getDataStore(sheet);
      const newCardData = draggedCard.toObject();
      delete newCardData._id;
      newCardData.system.groupId = targetCard.system.groupId || null;

      const [newCard] = await config.createEmbeddedDocuments(
        dataStore,
        "Item",
        [newCardData],
      );

      Logger.debug(
        "Copied card via ctrl+drag",
        { originalId: draggedCard.id, newId: newCard.id },
        "DRAG_DROP",
      );
      ui.notifications.info(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Actor.ActionCards.CardCopied", {
          name: newCard.name,
        }),
      );

      return [newCard];
    }

    // Check if dragging card onto another card to create a group
    const draggedGroupId = draggedCard.system.groupId;
    const targetGroupId = targetCard.system.groupId;

    // Neither card is grouped - create a new group
    if (!draggedGroupId && !targetGroupId) {
      const groupId = await DragDropHandler.createGroup(
        config,
        sheet,
        [draggedCard.id, targetCard.id],
        {},
      );
      Logger.debug(
        "Created group from card drag",
        { groupId, cards: [draggedCard.id, targetCard.id] },
        "DRAG_DROP",
      );
      return [draggedCard, targetCard];
    }

    // One card is grouped - add the ungrouped card to that group
    if (!draggedGroupId && targetGroupId) {
      await DragDropHandler.addCardToGroup(
        config,
        sheet,
        draggedCard.id,
        targetGroupId,
      );
      Logger.debug(
        "Added card to existing group",
        { cardId: draggedCard.id, groupId: targetGroupId },
        "DRAG_DROP",
      );
      return [draggedCard];
    }

    // Both cards are in the same group - reorder within group
    if (draggedGroupId === targetGroupId) {
      const dataStore = config.getDataStore(sheet);

      if (config.type === "actor") {
        // For actors, use updateEmbeddedDocuments
        const groupCards = config.getGroupCards(dataStore, draggedGroupId);

        const siblings = groupCards.filter(
          (c) => (c.id || c._id) !== draggedCard.id,
        );

        const sortUpdates = config.sortFunction(draggedCard, {
          target: targetCard,
          siblings,
        });

        const updateData = sortUpdates.map((u) => ({
          _id: u.target.id,
          ...u.update,
        }));

        const result = await config.updateEmbeddedDocuments(
          dataStore,
          "Item",
          updateData,
        );
        Logger.debug(
          "Reordered cards within group",
          { groupId: draggedGroupId },
          "DRAG_DROP",
        );
        return result;
      } else {
        // For transformations, update the entire embedded action cards array
        const embeddedActionCards = dataStore.system.embeddedActionCards || [];

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

        const sortUpdates = config.sortFunction(draggedCardData, {
          target: targetCardData,
          siblings,
        });

        const updatedActionCards = embeddedActionCards.map((card) => {
          const update = sortUpdates.find((u) => u.target._id === card._id);
          return update ? { ...card, ...update.update } : card;
        });

        const finalSortedCards = updatedActionCards.sort((a, b) => {
          const aSort = a.sort ?? 0;
          const bSort = b.sort ?? 0;
          return aSort - bSort;
        });

        await config.updateEmbeddedActionCards(dataStore, finalSortedCards);

        Logger.debug(
          "Reordered cards within group in transformation",
          { groupId: draggedGroupId },
          "DRAG_DROP",
        );
        return [draggedCard, targetCard];
      }
    }

    // Cards are in different groups - move dragged card to target's group
    if (draggedGroupId && targetGroupId && draggedGroupId !== targetGroupId) {
      const oldGroupId = draggedGroupId;
      await DragDropHandler.addCardToGroup(
        config,
        sheet,
        draggedCard.id,
        targetGroupId,
      );

      // Check if the old group should be dissolved
      await DragDropHandler.checkGroupDissolution(config, sheet, oldGroupId);

      Logger.debug(
        "Moved card between groups",
        { cardId: draggedCard.id, oldGroupId, newGroupId: targetGroupId },
        "DRAG_DROP",
      );
      return [draggedCard];
    }

    // Default: just sort normally
    return null;
  }

  /**
   * Handle dropping a card on a group container
   *
   * Adds the card to the group, with support for modifier keys.
   *
   * @param {object} config - Configuration object
   * @param {object} sheet - The sheet instance
   * @param {DragEvent} event - The drag event
   * @param {Item} card - The dropped card
   * @param {HTMLElement} groupElement - The group element
   * @returns {Promise<Item[]>} Updated items
   * @static
   */
  static async handleCardDropOnGroup(config, sheet, event, card, groupElement) {
    const groupId = groupElement.dataset.groupId;
    if (!groupId) return null;

    const { shift, ctrl } = sheet._dragModifiers || {};

    // Shift+drag: Ungroup card (only if dropping outside all groups)
    if (shift && card.system.groupId) {
      const oldGroupId = card.system.groupId;
      await DragDropHandler.ungroupCard(config, sheet, card.id);
      Logger.debug(
        "Ungrouped card",
        { cardId: card.id, oldGroupId },
        "DRAG_DROP",
      );
      return [card];
    }

    // Ctrl+drag: Copy card to group (if supported)
    if (ctrl && config.supportsCardCopy) {
      const dataStore = config.getDataStore(sheet);
      const newCardData = card.toObject();
      delete newCardData._id;
      newCardData.system.groupId = groupId;

      const [newCard] = await config.createEmbeddedDocuments(
        dataStore,
        "Item",
        [newCardData],
      );
      Logger.debug(
        "Copied card to group",
        { originalId: card.id, newId: newCard.id, groupId },
        "DRAG_DROP",
      );
      return [newCard];
    }

    // Normal drop: Add card to group
    const oldGroupId = card.system.groupId;
    if (oldGroupId !== groupId) {
      await DragDropHandler.addCardToGroup(config, sheet, card.id, groupId);

      if (oldGroupId) {
        await DragDropHandler.checkGroupDissolution(config, sheet, oldGroupId);
      }

      Logger.debug(
        "Added card to group",
        { cardId: card.id, groupId },
        "DRAG_DROP",
      );
      return [card];
    }

    return null;
  }

  /**
   * Copy a group and its action cards from a source to a destination
   *
   * Handles copying groups between actors, between transformations, or from actor to transformation.
   *
   * @param {object} config - Configuration object (ACTOR_DRAG_DROP_CONFIG or ITEM_DRAG_DROP_CONFIG)
   * @param {object} sheet - The destination sheet instance
   * @param {object} sourceData - The source data containing actorId or transformationId and groupId
   * @param {HTMLElement} dropTarget - The drop target element (optional, for ordering)
   * @returns {Promise<boolean>} Success status
   * @static
   */
  static async copyGroupToDestination(
    config,
    sheet,
    sourceData,
    dropTarget = null,
  ) {
    try {
      let sourceGroup;
      let sourceCards;

      // Determine if source is an actor or transformation
      if (sourceData.actorId) {
        // Source is an actor
        const sourceActor = game.actors.get(sourceData.actorId);
        if (!sourceActor) {
          Logger.error(
            "Source actor not found",
            { actorId: sourceData.actorId },
            "DRAG_DROP",
          );
          return false;
        }

        const sourceGroups = sourceActor.system.actionCardGroups || [];
        sourceGroup = sourceGroups.find((g) => g._id === sourceData.groupId);
        if (!sourceGroup) {
          Logger.error(
            "Source group not found in actor",
            { groupId: sourceData.groupId },
            "DRAG_DROP",
          );
          return false;
        }

        sourceCards = sourceActor.items.filter(
          (i) =>
            i.type === "actionCard" && i.system.groupId === sourceData.groupId,
        );
      } else if (sourceData.transformationId) {
        // Source is a transformation
        const sourceTransformation = await fromUuid(
          `Item.${sourceData.transformationId}`,
        );
        if (!sourceTransformation) {
          Logger.error(
            "Source transformation not found",
            { transformationId: sourceData.transformationId },
            "DRAG_DROP",
          );
          return false;
        }

        const sourceGroups = sourceTransformation.system.actionCardGroups || [];
        sourceGroup = sourceGroups.find((g) => g._id === sourceData.groupId);
        if (!sourceGroup) {
          Logger.error(
            "Source group not found in transformation",
            { groupId: sourceData.groupId },
            "DRAG_DROP",
          );
          return false;
        }

        const embeddedActionCards =
          sourceTransformation.system.getEmbeddedActionCards();
        sourceCards = embeddedActionCards.filter(
          (card) => card.system.groupId === sourceData.groupId,
        );
      } else {
        Logger.error(
          "Invalid group drag data - no source specified",
          sourceData,
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

      const dataStore = config.getDataStore(sheet);
      const existingGroups = config.getGroups(dataStore);

      // Create the new group
      const newGroupId = foundry.utils.randomID();

      // Determine sort order for the new group
      let newGroupSort = 0;
      if (dropTarget) {
        const targetGroupId = dropTarget.dataset.groupId;
        const targetGroup = existingGroups.find((g) => g._id === targetGroupId);
        if (targetGroup) {
          newGroupSort = targetGroup.sort || 0;
        }
      } else if (existingGroups.length > 0) {
        newGroupSort = Math.max(...existingGroups.map((g) => g.sort || 0)) + 1;
      }

      const newGroup = {
        _id: newGroupId,
        name: sourceGroup.name,
        sort: newGroupSort,
      };

      // Handle copying based on config type
      if (config.type === "actor") {
        // For actors: create embedded documents
        const updatedGroups = [...existingGroups, newGroup];
        await config.updateGroups(dataStore, updatedGroups);

        // Copy all action cards
        const cardDataArray = sourceCards.map((card) => {
          const cardData = card.toObject
            ? card.toObject()
            : foundry.utils.deepClone(card);
          delete cardData._id; // Let Foundry create new IDs
          cardData.system.groupId = newGroupId; // Assign to new group
          return cardData;
        });

        const createdCards = await config.createEmbeddedDocuments(
          dataStore,
          "Item",
          cardDataArray,
        );

        Logger.debug(
          "Copied group to actor",
          {
            sourceType: sourceData.actorId ? "actor" : "transformation",
            sourceId: sourceData.actorId || sourceData.transformationId,
            sourceGroupId: sourceData.groupId,
            newGroupId,
            cardCount: createdCards.length,
          },
          "DRAG_DROP",
        );

        ui.notifications.info(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Actor.ActionCards.GroupCopied", {
            groupName: sourceGroup.name,
            cardCount: createdCards.length,
          }),
        );
      } else {
        // For transformations: update embedded action cards array
        const existingEmbeddedCards =
          dataStore.system.embeddedActionCards || [];

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
        await dataStore.update({
          "system.actionCardGroups": updatedGroups,
          "system.embeddedActionCards": updatedEmbeddedCards,
        });

        Logger.debug(
          "Copied group to transformation",
          {
            sourceType: sourceData.actorId ? "actor" : "transformation",
            sourceId: sourceData.actorId || sourceData.transformationId,
            sourceGroupId: sourceData.groupId,
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
      }

      return true;
    } catch (error) {
      Logger.error(
        `Failed to copy group to ${config.type}`,
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
   * Add visual drag feedback
   *
   * Highlights drop zones when dragging items that can create action cards.
   *
   * @param {object} config - Configuration object
   * @param {object} sheet - The sheet instance
   * @param {DragEvent} event - The drag event
   * @static
   */
  static addDragFeedback(config, sheet, event) {
    // Only add feedback if we're dragging something that can create action cards
    try {
      const dragData = event.dataTransfer.getData("text/plain");
      if (!dragData) return;

      const data = JSON.parse(dragData);
      if (
        config.supportsActionCardCreation &&
        data.type === "Item" &&
        ["feature", "combatPower", "gear", "status"].includes(data.data?.type)
      ) {
        const dropZone = sheet.element.querySelector(config.dropZoneSelector);
        if (dropZone) {
          dropZone.classList.add(config.dragOverClass);
        }
      }
    } catch {
      // Ignore parsing errors - not all drags will have valid JSON data
    }
  }

  /**
   * Remove visual drag feedback
   *
   * Removes CSS classes from drop zones.
   *
   * @param {object} config - Configuration object
   * @param {object} sheet - The sheet instance
   * @static
   */
  static removeDragFeedback(config, sheet) {
    if (config.type === "item") {
      // For item sheets, handle multiple drop zones and action card sheet
      const dropZones = sheet.element.querySelectorAll(config.dropZoneSelector);
      const actionCardSheet = sheet.element.querySelector(
        ".tab.embedded-items",
      );

      dropZones.forEach((zone) => {
        zone.classList.remove(config.dragOverClass);
      });

      if (actionCardSheet) {
        actionCardSheet.classList.remove(config.dragActiveClass);
      }
    } else {
      // For actor sheets, handle single drop zone
      const dropZone = sheet.element.querySelector(config.dropZoneSelector);
      if (dropZone) {
        dropZone.classList.remove(config.dragOverClass);
      }
    }
  }

  /**
   * Get an embedded document from a target element
   *
   * Retrieves the Item from a DOM element.
   *
   * @param {object} config - Configuration object
   * @param {object} sheet - The sheet instance
   * @param {HTMLElement} target - The target element
   * @returns {Item|null} The document or null
   * @static
   */
  static getEmbeddedDocument(config, sheet, target) {
    const dataStore = config.getDataStore(sheet);

    // Support li, tr elements, and transformation cards for different template structures
    const docRow =
      target.closest(
        "li[data-document-class], tr[data-document-class], .eventide-transformation-card[data-item-id]",
      ) || target.closest("[data-item-id]");

    if (docRow) {
      const itemId = docRow.dataset.itemId;

      // Handle transformation cards specifically
      if (docRow.classList.contains("eventide-transformation-card")) {
        // First try to find the transformation item in the data store's items
        let transformationItem = config.findItem(dataStore, itemId);
        if (
          transformationItem &&
          transformationItem.type === "transformation"
        ) {
          return transformationItem;
        }

        // If not found, try to find it in the world or compendiums
        transformationItem = game.items.get(itemId);
        if (
          transformationItem &&
          transformationItem.type === "transformation"
        ) {
          return transformationItem;
        }

        // For actors, check if this is the active transformation
        if (config.type === "actor") {
          const activeTransformationId = dataStore.getFlag(
            "eventide-rp-system",
            "activeTransformation",
          );
          if (activeTransformationId === itemId) {
            const transformationName = dataStore.getFlag(
              "eventide-rp-system",
              "activeTransformationName",
            );
            const transformationCursed = dataStore.getFlag(
              "eventide-rp-system",
              "activeTransformationCursed",
            );
            const embeddedCombatPowersData = dataStore.getFlag(
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
        }

        Logger.warn(
          "Could not find transformation item for drag",
          {
            itemId,
            dataStoreType: config.type,
          },
          "DRAG_DROP",
        );
        return null;
      }

      // Handle direct item ID reference
      if (itemId && !docRow.dataset.documentClass) {
        // First try to find in data store's items
        let item = config.findItem(dataStore, itemId);
        if (item) return item;

        // If not found, check transformation combat powers
        item = config.findTransformationCombatPower(dataStore, itemId);
        if (item) return item;

        // If still not found, check transformation action cards
        item = config.findTransformationActionCard(dataStore, itemId);
        if (item) return item;
      }

      // Handle document class structure
      if (docRow.dataset.documentClass === "Item") {
        // First try to find in data store's items
        let item = config.findItem(dataStore, itemId);
        if (item) return item;

        // If not found, check transformation combat powers
        item = config.findTransformationCombatPower(dataStore, itemId);
        if (item) return item;

        // If still not found, check transformation action cards
        item = config.findTransformationActionCard(dataStore, itemId);
        if (item) return item;
      }
    }

    // Fallback: check if target itself has item-id
    if (target.dataset.itemId) {
      // First try to find in data store's items
      let item = config.findItem(dataStore, target.dataset.itemId);
      if (item) return item;

      // If not found, check transformation combat powers
      item = config.findTransformationCombatPower(
        dataStore,
        target.dataset.itemId,
      );
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
   * Export configuration objects for use in mixins
   *
   * @returns {object} Configuration objects
   * @static
   */
  static get CONFIG() {
    return {
      ACTOR: ACTOR_DRAG_DROP_CONFIG,
      ITEM: ITEM_DRAG_DROP_CONFIG,
    };
  }
}
