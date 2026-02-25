/**
 * ContextPreparationHelper Service
 *
 * Provides centralized context preparation for item sheet templates.
 * Handles attribute part preparation, action card grouping, and common
 * context building patterns used across item sheets.
 *
 * This service uses the delegation pattern - item sheets delegate context
 * preparation to this service rather than handling it inline.
 *
 * @module ContextPreparationHelper
 * @see module:item-sheet
 * @see module:embedded-item-sheet
 */

import { EventideSheetHelpers } from "../ui/components/_module.mjs";

/**
 * ContextPreparationHelper class for preparing template context data
 *
 * This service provides methods for preparing context objects for various
 * item sheet parts, including attributes, action cards, and common options.
 *
 * @class ContextPreparationHelper
 */
export class ContextPreparationHelper {
  /**
   * Item types that require roll type and ability options in their context
   *
   * @static
   * @type {Set<string>}
   */
  static ROLL_TYPE_ITEM_TYPES = new Set([
    "attributesCombatPower",
    "attributesGear",
    "attributesFeature",
    "attributesActionCard",
    "attributesActionCardConfig",
  ]);

  /**
   * Standard size options for select inputs
   *
   * @static
   * @type {Array<number>}
   */
  static SIZE_OPTIONS = [0, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

  /**
   * Prepare attributes context for various item types
   *
   * Adds common context properties like roll types, abilities, and size options
   * to the context object for attribute parts.
   *
   * @param {string} partId - The part identifier (e.g., "attributesFeature")
   * @param {Object} context - The context object to modify
   * @returns {Object} The updated context object
   * @static
   *
   * @example
   * const context = { tabs: { attributesFeature: { active: true } } };
   * ContextPreparationHelper.prepareAttributesContext("attributesFeature", context);
   * // context now includes rollTypes, abilities, and sizeOptions
   */
  static prepareAttributesContext(partId, context) {
    // Set the active tab for this part
    context.tab = context.tabs[partId];

    // Add roll type and ability options for relevant item types
    if (this.ROLL_TYPE_ITEM_TYPES.has(partId)) {
      context.rollTypes = EventideSheetHelpers.rollTypeObject;
      context.abilities = {
        ...EventideSheetHelpers.abilityObject,
        unaugmented: "unaugmented",
      };
    }

    // Add size options for the select input
    context.sizeOptions = this.SIZE_OPTIONS;

    return context;
  }

  /**
   * Prepare grouped and ungrouped action cards
   *
   * Takes an array of action cards and groups them based on their groupId.
   * Returns an object with both grouped and ungrouped action cards.
   *
   * @param {Array} actionCards - Array of action card items or objects
   * @param {Array} groups - Array of group definitions with _id and sort properties
   * @returns {Object} Object with groupedActionCards and ungroupedActionCards properties
   * @static
   *
   * @example
   * const cards = [{ id: "card1", system: { groupId: "group1" } }];
   * const groups = [{ _id: "group1", sort: 0, name: "Group 1" }];
   * const result = ContextPreparationHelper.prepareActionCardGroups(cards, groups);
   * // result.groupedActionCards[0].cards contains cards in group1
   * // result.ungroupedActionCards contains cards without a groupId
   */
  static prepareActionCardGroups(actionCards, groups) {
    // Sort groups by sort order
    const sortedGroups = [...groups].sort(
      (a, b) => (a.sort || 0) - (b.sort || 0),
    );

    // Create grouped action cards
    const groupedActionCards = sortedGroups
      .map((group) => ({
        ...group,
        id: group._id, // Add id field for Handlebars template compatibility
        collapsed: false, // Always show expanded in item sheets
        cards: actionCards
          .filter((card) => card.system.groupId === group._id)
          .map((card) => ({
            ...card,
            // Ensure id is set for Handlebars template compatibility
            // Item instances have .id, but plain objects only have ._id
            id: card.id || card._id,
          })),
      }))
      .filter((group) => group.cards.length > 0); // Only include groups with cards

    // Get ungrouped action cards
    const ungroupedActionCards = actionCards
      .filter((card) => !card.system.groupId)
      .map((card) => ({
        ...card,
        // Ensure id is set for Handlebars template compatibility
        id: card.id || card._id,
      }));

    return {
      groupedActionCards,
      ungroupedActionCards,
    };
  }

  /**
   * Get common size options for select inputs
   *
   * Returns the standard array of size values used throughout the system.
   *
   * @returns {Array<number>} Array of size values
   * @static
   *
   * @example
   * const sizes = ContextPreparationHelper.getSizeOptions();
   * // [0, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
   */
  static getSizeOptions() {
    return this.SIZE_OPTIONS;
  }

  /**
   * Prepare description context with enriched HTML
   *
   * Enriches the description text by converting inline rolls and other
   * Foundry syntax into interactive elements.
   *
   * @param {string} description - The description text to enrich
   * @param {Object} document - The document being rendered (for roll data)
   * @param {boolean} isOwner - Whether the current user is the owner
   * @returns {Promise<string>} The enriched HTML string
   * @static
   *
   * @example
   * const enriched = await ContextPreparationHelper.prepareDescriptionContext(
   *   item.system.description,
   *   item,
   *   true
   * );
   */
  static async prepareDescriptionContext(description, document, isOwner) {
    const { TextEditor } = foundry.applications.ux;

    return await TextEditor.implementation.enrichHTML(description, {
      secrets: isOwner,
      rollData: document.getRollData(),
      relativeTo: document,
    });
  }

  /**
   * Prepare embedded items context
   *
   * Prepares context for embedded items, effects, and transformations.
   *
   * @param {Object} item - The item instance
   * @returns {Promise<Object>} Object with embeddedItem, embeddedEffects, and embeddedTransformations
   * @static
   *
   * @example
   * const embedded = await ContextPreparationHelper.prepareEmbeddedItemsContext(this.item);
   * // embedded.embeddedItem, embedded.embeddedEffects, embedded.embeddedTransformations
   */
  static async prepareEmbeddedItemsContext(item) {
    const context = {
      embeddedItem: item.getEmbeddedItem(),
      embeddedEffects: item.getEmbeddedEffects(),
    };

    // getEmbeddedTransformations is async, so we need to await it
    context.embeddedTransformations = item.getEmbeddedTransformations
      ? await item.getEmbeddedTransformations()
      : [];

    return context;
  }

  /**
   * Prepare embedded combat powers context
   *
   * @param {Object} item - The item instance
   * @returns {Object} Object with embeddedCombatPowers array
   * @static
   *
   * @example
   * const combatPowers = ContextPreparationHelper.prepareEmbeddedCombatPowersContext(this.item);
   * // { embeddedCombatPowers: [...] }
   */
  static prepareEmbeddedCombatPowersContext(item) {
    return {
      embeddedCombatPowers: item.system.getEmbeddedCombatPowers(),
    };
  }

  /**
   * Prepare embedded action cards context
   *
   * Prepares both the raw action cards array and the grouped/ungrouped structure.
   *
   * @param {Object} item - The item instance
   * @returns {Object} Object with embeddedActionCards, groupedActionCards, and ungroupedActionCards
   * @static
   *
   * @example
   * const actionCards = ContextPreparationHelper.prepareEmbeddedActionCardsContext(this.item);
   * // actionCards.embeddedActionCards, actionCards.groupedActionCards, actionCards.ungroupedActionCards
   */
  static prepareEmbeddedActionCardsContext(item) {
    const embeddedActionCards = item.system.getEmbeddedActionCards();
    const groups = item.system.actionCardGroups || [];

    const { groupedActionCards, ungroupedActionCards } =
      this.prepareActionCardGroups(embeddedActionCards, groups);

    return {
      embeddedActionCards,
      groupedActionCards,
      ungroupedActionCards,
    };
  }

  /**
   * Prepare prerequisites context
   *
   * @param {Object} item - The item instance
   * @param {Object} context - The context object to modify
   * @returns {Object} The updated context object
   * @static
   *
   * @example
   * ContextPreparationHelper.preparePrerequisitesContext(this.item, context);
   */
  static preparePrerequisitesContext(item, context) {
    context.prerequisites = item.system.prerequisites;
    context.tab = context.tabs.prerequisites;
    return context;
  }

  /**
   * Prepare effects context
   *
   * Prepares active effects for display in the effects tab.
   *
   * @param {Object} effectsCollection - The effects collection from the item
   * @param {Object} context - The context object to modify
   * @returns {Promise<Object>} The updated context object
   * @static
   *
   * @example
   * await ContextPreparationHelper.prepareEffectsContext(this.item.effects, context);
   */
  static async prepareEffectsContext(effectsCollection, context) {
    const { prepareActiveEffectCategories } =
      await import("../helpers/_module.mjs");

    context.tab = context.tabs.effects;
    context.effects = await prepareActiveEffectCategories(effectsCollection);

    return context;
  }

  /**
   * Prepare character effects context
   *
   * Prepares character effects for display in the character effects tab.
   *
   * @param {Object} effectsCollection - The effects collection from the item
   * @param {Object} context - The context object to modify
   * @returns {Promise<Object>} The updated context object
   * @static
   *
   * @example
   * await ContextPreparationHelper.prepareCharacterEffectsContext(this.item.effects, context);
   */
  static async prepareCharacterEffectsContext(effectsCollection, context) {
    const { prepareCharacterEffects } = await import("../helpers/_module.mjs");

    context.tab = context.tabs.characterEffects;

    const firstEffect = effectsCollection.contents[0];
    if (firstEffect) {
      context.characterEffects = await prepareCharacterEffects(firstEffect);
    } else {
      // Return empty character effects structure if no effects exist
      context.characterEffects = {
        fullEffects: [],
        regularEffects: [],
        hiddenEffects: [],
      };
    }

    return context;
  }
}
