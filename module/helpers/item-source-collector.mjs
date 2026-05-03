import { Logger } from "../services/logger.mjs";

/**
 * Valid source scope identifiers for the selective global selector
 * @type {string[]}
 */
export const SOURCE_SCOPES = ["thisCharacter", "actor", "compendium", "world"];

/**
 * All scope identifiers (default: show everything)
 * @type {string[]}
 */
export const ALL_SCOPES = [...SOURCE_SCOPES];

/**
 * Centralized system for collecting items from all accessible sources
 * including compendiums, character sheets, and world items
 */
export class ItemSourceCollector {
  /**
   * Get all accessible items of specified types for the current user,
   * optionally filtered by source scopes
   * @param {User} user - The current user
   * @param {string[]} itemTypes - Array of item types to include
   * @param {string[]|null} sourceScopes - Array of source scopes to include, or null for all
   * @param {Actor|null} parentActor - The parent actor for "thisCharacter" scope
   * @returns {Promise<Object[]>} Array of formatted item objects
   */
  static async getAllAccessibleItems(
    user = game.user,
    itemTypes = [],
    sourceScopes = null,
    parentActor = null,
  ) {
    const scopes = sourceScopes || ALL_SCOPES;
    const allItems = [];

    try {
      const fetchPromises = [];

      if (scopes.includes("thisCharacter") && parentActor) {
        fetchPromises.push(
          this.getThisCharacterItems(itemTypes, user, parentActor),
        );
      }

      if (scopes.includes("actor")) {
        fetchPromises.push(this.getCharacterSheetItems(itemTypes, user));
      }

      if (scopes.includes("compendium")) {
        fetchPromises.push(this.getCompendiumItems(itemTypes, user));
      }

      if (scopes.includes("world")) {
        fetchPromises.push(this.getWorldItems(itemTypes, user));
      }

      const results = await Promise.all(fetchPromises);
      for (const items of results) {
        allItems.push(...items);
      }

      const uniqueItems = this._removeDuplicates(allItems);

      return uniqueItems.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      Logger.error(
        "Error collecting items from sources",
        error,
        "ItemSourceCollector",
      );
      ui.notifications.error(
        "Failed to load available items. Please try again.",
      );
      return [];
    }
  }

  /**
   * Get items from all accessible compendiums
   * @param {string[]} itemTypes - Array of item types to include
   * @param {User} user - The current user
   * @returns {Promise<Object[]>} Array of formatted item objects
   */
  static async getCompendiumItems(itemTypes = [], _user = game.user) {
    const items = [];

    for (const pack of game.packs) {
      // Skip if user doesn't have permission to view this pack
      if (!pack.visible) continue;

      // Skip if not an Item pack
      if (pack.documentName !== "Item") continue;

      try {
        // Get pack index for performance (avoids loading full documents)
        const index = await pack.getIndex();

        for (const indexEntry of index) {
          // Filter by item type if specified
          if (itemTypes.length > 0 && !itemTypes.includes(indexEntry.type)) {
            continue;
          }

          // Use pack.collection as fallback if pack.id is undefined (Foundry v13 compatibility)
          const packIdentifier = pack.id || pack.collection;
          const uuid = `Compendium.${packIdentifier}.Item.${indexEntry._id}`;

          // Create lightweight item representation
          const formattedItem = this.formatItemForDisplay(indexEntry, {
            source: `Compendium: ${pack.metadata.label}`,
            sourceType: "compendium",
            packId: packIdentifier,
            uuid,
          });

          items.push(formattedItem);
        }
      } catch (error) {
        Logger.warn(
          `Failed to load compendium ${pack.id || pack.collection}`,
          error,
          "ItemSourceCollector",
        );
      }
    }

    return items;
  }

  /**
   * Get items from all accessible character sheets
   * @param {string[]} itemTypes - Array of item types to include
   * @param {User} user - The current user
   * @returns {Promise<Object[]>} Array of formatted item objects
   */
  static async getCharacterSheetItems(itemTypes = [], user = game.user) {
    const items = [];

    for (const actor of game.actors) {
      // Skip if user doesn't have permission to view this actor
      if (!actor.testUserPermission(user, "LIMITED")) continue;

      // Skip non-character actors (if we only want characters)
      if (actor.type !== "character") continue;

      for (const item of actor.items) {
        // Filter by item type if specified
        if (itemTypes.length > 0 && !itemTypes.includes(item.type)) {
          continue;
        }

        const formattedItem = this.formatItemForDisplay(item, {
          source: `Character: ${actor.name}`,
          sourceType: "actor",
          actorId: actor.id,
          uuid: item.uuid,
        });

        items.push(formattedItem);
      }
    }

    return items;
  }

  /**
   * Get items from the parent actor of the current sheet (this character)
   * @param {string[]} itemTypes - Array of item types to include
   * @param {User} user - The current user
   * @param {Actor} parentActor - The parent actor whose items to collect
   * @returns {Promise<Object[]>} Array of formatted item objects
   */
  static async getThisCharacterItems(
    itemTypes = [],
    user = game.user,
    parentActor = null,
  ) {
    const items = [];

    if (!parentActor) return items;

    if (!parentActor.testUserPermission(user, "LIMITED")) return items;

    for (const item of parentActor.items) {
      if (itemTypes.length > 0 && !itemTypes.includes(item.type)) {
        continue;
      }

      const formattedItem = this.formatItemForDisplay(item, {
        source: `This Character: ${parentActor.name}`,
        sourceType: "thisCharacter",
        actorId: parentActor.id,
        uuid: item.uuid,
      });

      items.push(formattedItem);
    }

    return items;
  }

  /**
   * Get items from the world items database
   * @param {string[]} itemTypes - Array of item types to include
   * @param {User} user - The current user
   * @returns {Promise<Object[]>} Array of formatted item objects
   */
  static async getWorldItems(itemTypes = [], user = game.user) {
    const items = [];

    for (const item of game.items) {
      // Skip if user doesn't have permission to view this item
      if (!item.testUserPermission(user, "LIMITED")) continue;

      // Filter by item type if specified
      if (itemTypes.length > 0 && !itemTypes.includes(item.type)) {
        continue;
      }

      const formattedItem = this.formatItemForDisplay(item, {
        source: "World Items",
        sourceType: "world",
        uuid: item.uuid,
      });

      items.push(formattedItem);
    }

    return items;
  }

  /**
   * Format item data for consistent display in UI
   * @param {Object} item - The item or item index entry
   * @param {Object} sourceInfo - Information about the item's source
   * @returns {Object} Formatted item object
   */
  static formatItemForDisplay(item, sourceInfo) {
    return {
      id: item.uuid || sourceInfo.uuid,
      name: item.name,
      type: item.type,
      img: item.img || "icons/svg/item-bag.svg", // Fallback icon
      source: sourceInfo.source,
      sourceType: sourceInfo.sourceType,
      uuid: sourceInfo.uuid,
      // Store additional source metadata for later retrieval
      metadata: {
        packId: sourceInfo.packId,
        actorId: sourceInfo.actorId,
        originalId: item._id,
      },
    };
  }

  /**
   * Get the actual Item document from a formatted item object
   * @param {Object} formattedItem - Formatted item from getAllAccessibleItems
   * @returns {Promise<Item|null>} The actual Item document
   */
  static async getItemDocument(formattedItem) {
    try {
      return await fromUuid(formattedItem.uuid);
    } catch (error) {
      Logger.error(
        `Failed to load item from UUID ${formattedItem.uuid}`,
        error,
        "ItemSourceCollector",
      );
      return null;
    }
  }

  /**
   * Remove duplicate items based on name and type
   * Prioritizes items from more accessible sources (actor > world > compendium)
   * @param {Object[]} items - Array of formatted items
   * @returns {Object[]} Deduplicated array
   */
  static _removeDuplicates(items) {
    const seen = new Map();
    const priorityOrder = {
      thisCharacter: 0,
      actor: 1,
      world: 2,
      compendium: 3,
    };

    for (const item of items) {
      const key = `${item.name}|${item.type}`;
      const existing = seen.get(key);

      if (
        !existing ||
        priorityOrder[item.sourceType] < priorityOrder[existing.sourceType]
      ) {
        seen.set(key, item);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Filter items based on search text
   * @param {Object[]} items - Array of formatted items
   * @param {string} searchText - Text to search for
   * @returns {Object[]} Filtered items
   */
  static filterItems(items, searchText) {
    if (!searchText.trim()) return items;

    const search = searchText.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(search) ||
        item.type.toLowerCase().includes(search) ||
        item.source.toLowerCase().includes(search),
    );
  }

  /**
   * Filter items to exclude those with roll type "none" (for action items)
   * @param {Object[]} items - Array of formatted items
   * @returns {Promise<Object[]>} Filtered items with valid roll types
   */
  static async filterActionItemsByRollType(items) {
    const validItems = [];

    for (const item of items) {
      try {
        // Get the actual document to check roll type
        const itemDoc = await fromUuid(item.uuid);
        if (!itemDoc) {
          Logger.warn(
            `Could not load item ${item.uuid} for roll type check`,
            null,
            "ItemSourceCollector",
          );
          continue;
        }

        // Check if item has a valid roll type (not "none")
        const rollType = itemDoc.system?.roll?.type;

        if (rollType && rollType !== "none") {
          validItems.push(item);
        }
      } catch (error) {
        Logger.warn(
          `Error checking roll type for ${item.name}`,
          error,
          "ItemSourceCollector",
        );
      }
    }

    return validItems;
  }

  /**
   * Get item types appropriate for action items
   * @returns {string[]} Array of valid action item types
   */
  static getActionItemTypes() {
    const types = ["combatPower", "gear", "feature"];
    return types;
  }

  /**
   * Get item types appropriate for effects
   * @returns {string[]} Array of valid effect item types
   */
  static getEffectItemTypes() {
    const types = ["gear", "status"];
    return types;
  }
}
