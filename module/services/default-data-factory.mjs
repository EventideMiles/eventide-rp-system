/**
 * DefaultDataFactory Service
 *
 * Provides centralized default data generation for item creation.
 * Consolidates default data templates from EmbeddedItemManager and ContextMenuBuilder.
 *
 * @module DefaultDataFactory
 */

import { Logger } from "./logger.mjs";

/**
 * @typedef {Object} DefaultItemData
 * @property {string} name - The item name
 * @property {string} type - The item type
 * @property {string} img - The item image path
 * @property {object} system - The system data object
 * @property {Array} [effects] - Optional effects array for status items
 */

/**
 * @typedef {Object} RollData
 * @property {string} type - Roll type (e.g., "roll", "none")
 * @property {string} ability - Ability key (e.g., "unaugmented")
 * @property {number} bonus - Bonus to the roll
 * @property {object} diceAdjustments - Dice adjustment configuration
 */

/**
 * DefaultDataFactory class for generating default item data
 *
 * This service provides static factory methods for creating default data
 * objects for various item types used throughout the system.
 *
 * @class DefaultDataFactory
 */
export class DefaultDataFactory {
  // =================================
  // Combat Power Defaults
  // =================================

  /**
   * Get default data for creating a new combat power
   *
   * @static
   * @param {Item} parentItem - The parent item to inherit properties from
   * @param {string} context - Context: "actionCard" or "transformation"
   * @returns {DefaultItemData} Default combat power data
   */
  static getCombatPowerData(parentItem, context = "actionCard") {
    const baseData = {
      name: parentItem.name,
      type: "combatPower",
      img: parentItem.img,
      system: {
        description: parentItem.system.description,
        prerequisites: "",
        targeted: true,
        bgColor: parentItem.system.bgColor || "#8B4513",
        textColor: parentItem.system.textColor || "#ffffff",
        roll: this.getDefaultRollData(),
      },
    };

    if (context === "transformation") {
      baseData.name = `${parentItem.name} Power`;
      baseData.system.description = `Combat power from ${parentItem.name} transformation`;
    }

    return baseData;
  }

  // =================================
  // Status Effect Defaults
  // =================================

  /**
   * Get default data for creating a new status effect
   *
   * @static
   * @param {Item} parentItem - The parent action card
   * @returns {DefaultItemData} Default status effect data
   */
  static getStatusData(parentItem) {
    return {
      name: parentItem.name,
      type: "status",
      img: parentItem.img,
      system: {
        description: parentItem.system.description,
        bgColor: parentItem.system.bgColor,
        textColor: parentItem.system.textColor,
      },
      effects: [
        {
          _id: foundry.utils.randomID(),
          name: `${parentItem.name} Effect`,
          img: parentItem.img,
          changes: [],
          disabled: false,
          duration: this.getDefaultEffectDuration(),
          description: "",
          origin: "",
          tint: parentItem.system.textColor || "#ffffff",
          transfer: true,
          statuses: new Set(),
          flags: {},
        },
      ],
    };
  }

  // =================================
  // Transformation Defaults
  // =================================

  /**
   * Get default data for creating a new transformation
   *
   * @static
   * @param {Item} parentItem - The parent action card
   * @returns {DefaultItemData} Default transformation data
   */
  static getTransformationData(parentItem) {
    return {
      name: parentItem.name,
      type: "transformation",
      img: parentItem.img,
      system: {
        description: parentItem.system.description,
        size: 1,
        cursed: false,
        embeddedCombatPowers: [],
        resolveAdjustment: 0,
        powerAdjustment: 0,
        tokenImage: "",
      },
    };
  }

  // =================================
  // Action Card Defaults
  // =================================

  /**
   * Get default data for creating a new action card
   *
   * @static
   * @param {Item} parentItem - The parent transformation
   * @returns {DefaultItemData} Default action card data
   */
  static getActionCardData(parentItem) {
    return {
      name: `${parentItem.name} Action`,
      type: "actionCard",
      img: parentItem.img,
      system: {
        description: `Action card from ${parentItem.name} transformation`,
        bgColor: "#8B4513",
        textColor: "#ffffff",
        mode: "attackChain",
        attackChain: this.getDefaultAttackChainData(),
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
  }

  // =================================
  // Tab Context Defaults (from ContextMenuBuilder)
  // =================================

  /**
   * Get default system data for a given item type
   *
   * Used for creating embedded items in transformation tabs.
   *
   * @static
   * @param {string} itemType - The item type
   * @returns {object} Default system data
   */
  static getSystemData(itemType) {
    const defaults = {
      feature: {
        bgColor: "#70B87A",
        textColor: "#ffffff",
        targeted: false,
        roll: this.getDefaultRollData(),
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
        roll: this.getDefaultRollData(),
      },
      actionCard: {
        mode: "attackChain",
        bgColor: "#8B4513",
        textColor: "#ffffff",
      },
    };

    return defaults[itemType] || {};
  }

  // =================================
  // Unified Factory Method
  // =================================

  /**
   * Get default data for a new item based on item type
   *
   * @static
   * @param {string} itemType - The type of item to get default data for
   * @param {Item} parentItem - The parent item for context
   * @param {object} [options] - Additional options
   * @param {string} [options.context] - Context for combat powers ("actionCard" or "transformation")
   * @returns {DefaultItemData|null} Default item data or null if type not supported
   */
  static getItemData(itemType, parentItem, options = {}) {
    switch (itemType) {
      case "combatPower":
        return this.getCombatPowerData(
          parentItem,
          options.context || "actionCard",
        );
      case "status":
        return this.getStatusData(parentItem);
      case "transformation":
        return this.getTransformationData(parentItem);
      case "actionCard":
        return this.getActionCardData(parentItem);
      default:
        Logger.warn(
          `Unknown item type for default data: ${itemType}`,
          {},
          "DEFAULT_DATA_FACTORY",
        );
        return null;
    }
  }

  // =================================
  // Helper Methods
  // =================================

  /**
   * Get default roll data structure
   *
   * @static
   * @returns {RollData} Default roll data
   */
  static getDefaultRollData() {
    return {
      type: "roll",
      ability: "unaugmented",
      bonus: 0,
      diceAdjustments: {
        advantage: 0,
        disadvantage: 0,
        total: 0,
      },
    };
  }

  /**
   * Get default effect duration structure
   *
   * @static
   * @returns {object} Default duration data
   */
  static getDefaultEffectDuration() {
    return {
      startTime: null,
      seconds: 18000, // 5 hours - matches the effect creator pattern
      combat: "",
      rounds: 0,
      turns: 0,
      startRound: 0,
      startTurn: 0,
    };
  }

  /**
   * Get default attack chain configuration
   *
   * @static
   * @returns {object} Default attack chain data
   */
  static getDefaultAttackChainData() {
    return {
      firstStat: "acro",
      secondStat: "phys",
      damageCondition: "never",
      damageFormula: "1d6",
      damageType: "damage",
      damageThreshold: 15,
      statusCondition: "oneSuccess",
      statusThreshold: 15,
    };
  }

  /**
   * Create a new embedded item data object with ID
   *
   * @static
   * @param {string} itemType - The type of item to create
   * @param {object} [overrides] - Optional overrides for default data
   * @returns {object} New item data with generated ID
   */
  static createEmbeddedItemData(itemType, overrides = {}) {
    const defaultSystemData = this.getSystemData(itemType);
    const newItem = {
      _id: foundry.utils.randomID(),
      name: game.i18n.localize(
        `EVENTIDE_RP_SYSTEM.Item.New.${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`,
      ),
      type: itemType,
      img: "icons/svg/item-bag.svg",
      system: { ...defaultSystemData, ...overrides.system },
    };

    // Apply any top-level overrides
    return { ...newItem, ...overrides };
  }
}

export default DefaultDataFactory;
