/**
 * EmbeddedItemManager Service
 *
 * Provides centralized embedded item management for action cards and transformations.
 * Handles creation, editing, and removal of embedded items, effects, and transformations.
 *
 * @module EmbeddedItemManager
 */

import { Logger } from "./logger.mjs";

/**
 * EmbeddedItemManager class for centralized embedded item operations
 *
 * @class EmbeddedItemManager
 */
export class EmbeddedItemManager {
  // =================================
  // Default Data Templates
  // =================================

  /**
   * Get default data for creating a new combat power
   *
   * @static
   * @param {Item} parentItem - The parent item to inherit properties from
   * @param {string} context - Context: "actionCard" or "transformation"
   * @returns {object} Default combat power data
   */
  static getDefaultCombatPowerData(parentItem, context = "actionCard") {
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
        roll: {
          type: "roll",
          ability: "unaugmented",
          bonus: 0,
          diceAdjustments: {
            advantage: 0,
            disadvantage: 0,
            total: 0,
          },
        },
      },
    };

    if (context === "transformation") {
      baseData.name = `${parentItem.name} Power`;
      baseData.system.description = `Combat power from ${parentItem.name} transformation`;
    }

    return baseData;
  }

  /**
   * Get default data for creating a new status effect
   *
   * @static
   * @param {Item} parentItem - The parent action card
   * @returns {object} Default status effect data
   */
  static getDefaultStatusData(parentItem) {
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
          duration: {
            startTime: null,
            seconds: 18000, // 5 hours - matches the effect creator pattern
            combat: "",
            rounds: 0,
            turns: 0,
            startRound: 0,
            startTurn: 0,
          },
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

  /**
   * Get default data for creating a new transformation
   *
   * @static
   * @param {Item} parentItem - The parent action card
   * @returns {object} Default transformation data
   */
  static getDefaultTransformationData(parentItem) {
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

  /**
   * Get default data for creating a new action card
   *
   * @static
   * @param {Item} parentItem - The parent transformation
   * @returns {object} Default action card data
   */
  static getDefaultActionCardData(parentItem) {
    return {
      name: `${parentItem.name} Action`,
      type: "actionCard",
      img: parentItem.img,
      system: {
        description: `Action card from ${parentItem.name} transformation`,
        bgColor: "#8B4513",
        textColor: "#ffffff",
        mode: "attackChain",
        attackChain: {
          firstStat: "acro",
          secondStat: "phys",
          damageCondition: "never",
          damageFormula: "1d6",
          damageType: "damage",
          damageThreshold: 15,
          statusCondition: "oneSuccess",
          statusThreshold: 15,
        },
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

  /**
   * Get default data for a new item based on item type
   *
   * @static
   * @param {string} itemType - The type of item to get default data for
   * @param {Item} parentItem - The parent item for context
   * @returns {object|null} Default item data or null if type not supported
   */
  static getDefaultItemData(itemType, parentItem) {
    switch (itemType) {
      case "combatPower":
        return this.getDefaultCombatPowerData(parentItem, "actionCard");
      case "status":
        return this.getDefaultStatusData(parentItem);
      case "transformation":
        return this.getDefaultTransformationData(parentItem);
      case "actionCard":
        return this.getDefaultActionCardData(parentItem);
      default:
        Logger.warn(
          `Unknown item type for default data: ${itemType}`,
          {},
          "EMBEDDED_ITEM_MANAGER",
        );
        return null;
    }
  }

  // =================================
  // Transformation Embedded Item Operations
  // =================================

  /**
   * Remove a combat power from a transformation
   *
   * @static
   * @param {Item} item - The parent transformation
   * @param {string} powerId - The power ID to remove
   * @returns {Promise<boolean>} Success status
   */
  static async removeCombatPower(item, powerId) {
    try {
      if (!powerId) {
        Logger.warn(
          "No power ID provided for removal",
          {},
          "EMBEDDED_ITEM_MANAGER",
        );
        return false;
      }

      await item.system.removeCombatPower(powerId);
      return true;
    } catch (error) {
      Logger.error(
        "Failed to remove combat power",
        error,
        "EMBEDDED_ITEM_MANAGER",
      );
      return false;
    }
  }

  /**
   * Remove an action card from a transformation
   *
   * @static
   * @param {Item} item - The parent transformation
   * @param {string} cardId - The action card ID to remove
   * @returns {Promise<boolean>} Success status
   */
  static async removeActionCard(item, cardId) {
    try {
      if (!cardId) {
        Logger.warn(
          "No action card ID provided for removal",
          {},
          "EMBEDDED_ITEM_MANAGER",
        );
        return false;
      }

      await item.system.removeActionCard(cardId);
      return true;
    } catch (error) {
      Logger.error(
        "Failed to remove action card",
        error,
        "EMBEDDED_ITEM_MANAGER",
      );
      return false;
    }
  }

  /**
   * Open embedded action card sheet for editing
   *
   * @static
   * @param {Item} item - The parent transformation
   * @param {string} cardId - The action card ID to edit
   * @returns {Promise<boolean>} Success status
   */
  static async editEmbeddedActionCard(item, cardId) {
    try {
      if (!cardId) {
        Logger.warn(
          "No action card ID found for editing",
          {},
          "EMBEDDED_ITEM_MANAGER",
        );
        return false;
      }

      const actionCardList = item.system.getEmbeddedActionCards();
      if (!actionCardList || actionCardList.length === 0) {
        Logger.warn(
          "No embedded action cards found",
          {},
          "EMBEDDED_ITEM_MANAGER",
        );
        return false;
      }

      const actionCard = actionCardList.find((ac) => ac.id === cardId);
      if (!actionCard) {
        Logger.warn(
          "Action card not found for editing",
          { cardId, availableIds: actionCardList.map((ac) => ac.id) },
          "EMBEDDED_ITEM_MANAGER",
        );
        return false;
      }

      actionCard.sheet.render(true);
      return true;
    } catch (error) {
      Logger.error(
        "Failed to edit embedded action card",
        error,
        "EMBEDDED_ITEM_MANAGER",
      );
      return false;
    }
  }

  // =================================
  // Action Card Embedded Item Operations
  // =================================

  /**
   * Clear an embedded item from an action card
   *
   * @static
   * @param {Item} item - The action card to clear
   * @returns {Promise<boolean>} Success status
   */
  static async clearEmbeddedItem(item) {
    try {
      await item.clearEmbeddedItem();
      return true;
    } catch (error) {
      Logger.error(
        "Failed to clear embedded item",
        error,
        "EMBEDDED_ITEM_MANAGER",
      );
      return false;
    }
  }

  /**
   * Create a new combat power as an embedded item in an action card
   *
   * @static
   * @param {Item} item - The parent action card
   * @returns {Promise<boolean>} Success status
   */
  static async createNewPower(item) {
    try {
      const newPowerData = this.getDefaultCombatPowerData(item, "actionCard");

      const tempItem = new CONFIG.Item.documentClass(newPowerData, {
        parent: null,
      });

      await item.setEmbeddedItem(tempItem);
      return true;
    } catch (error) {
      Logger.error(
        "Failed to create new power",
        error,
        "EMBEDDED_ITEM_MANAGER",
      );
      return false;
    }
  }

  /**
   * Create a new status effect in an action card
   *
   * @static
   * @param {Item} item - The parent action card
   * @returns {Promise<boolean>} Success status
   */
  static async createNewStatus(item) {
    try {
      // Double-check that there are no existing embedded effects (race condition protection)
      const currentEffects = item.system.embeddedStatusEffects || [];
      if (currentEffects.length > 0) {
        Logger.warn(
          "Create new status called but effects still exist - possible race condition",
          { currentEffectCount: currentEffects.length },
          "EMBEDDED_ITEM_MANAGER",
        );
        return false;
      }

      const newStatusData = this.getDefaultStatusData(item);

      const tempItem = new CONFIG.Item.documentClass(newStatusData, {
        parent: null,
      });

      await item.addEmbeddedEffect(tempItem);
      return true;
    } catch (error) {
      Logger.error(
        "Failed to create new status",
        error,
        "EMBEDDED_ITEM_MANAGER",
      );
      return false;
    }
  }

  /**
   * Create a new transformation in an action card
   *
   * @static
   * @param {Item} item - The parent action card
   * @returns {Promise<boolean>} Success status
   */
  static async createNewTransformation(item) {
    try {
      const newTransformationData = this.getDefaultTransformationData(item);

      const tempItem = new CONFIG.Item.documentClass(newTransformationData, {
        parent: null,
      });

      await item.addEmbeddedTransformation(tempItem);
      return true;
    } catch (error) {
      Logger.error(
        "Failed to create new transformation",
        error,
        "EMBEDDED_ITEM_MANAGER",
      );
      return false;
    }
  }

  /**
   * Edit an embedded item from an action card
   *
   * @static
   * @param {Item} item - The parent action card
   * @returns {Promise<boolean>} Success status
   */
  static async editEmbeddedItem(item) {
    try {
      const embeddedItem = item.getEmbeddedItem();
      if (!embeddedItem) {
        Logger.warn(
          "No embedded item found to edit",
          null,
          "EMBEDDED_ITEM_MANAGER",
        );
        return false;
      }

      // Create and render the embedded item sheet using dynamic import
      const { EmbeddedItemSheet } =
        await import("../ui/sheets/embedded-item-sheet.mjs");
      const sheet = new EmbeddedItemSheet(embeddedItem.toObject(), item);
      sheet.render(true);
      return true;
    } catch (error) {
      Logger.error(
        "Failed to edit embedded item",
        error,
        "EMBEDDED_ITEM_MANAGER",
      );
      return false;
    }
  }

  /**
   * Edit an embedded effect from an action card
   *
   * @static
   * @param {Item} item - The parent action card
   * @param {string} effectId - The effect ID to edit
   * @returns {Promise<boolean>} Success status
   */
  static async editEmbeddedEffect(item, effectId) {
    try {
      if (!effectId) {
        Logger.warn(
          "No effect ID provided for editing",
          null,
          "EMBEDDED_ITEM_MANAGER",
        );
        return false;
      }

      const embeddedEffects = item.getEmbeddedEffects();
      const effect = embeddedEffects.find((e) => e.originalId === effectId);

      if (!effect) {
        Logger.warn(
          "Embedded effect not found",
          { effectId },
          "EMBEDDED_ITEM_MANAGER",
        );
        return false;
      }

      // Create and render the embedded effect sheet using dynamic import
      const { EmbeddedItemSheet } =
        await import("../ui/sheets/embedded-item-sheet.mjs");
      const sheet = new EmbeddedItemSheet(effect.toObject(), item, {}, true);
      sheet.render(true);
      return true;
    } catch (error) {
      Logger.error(
        "Failed to edit embedded effect",
        error,
        "EMBEDDED_ITEM_MANAGER",
      );
      return false;
    }
  }

  /**
   * Remove an embedded effect from an action card
   *
   * @static
   * @param {Item} item - The parent action card
   * @param {string} effectId - The effect ID to remove
   * @returns {Promise<boolean>} Success status
   */
  static async removeEmbeddedEffect(item, effectId) {
    try {
      if (!effectId) {
        Logger.warn(
          "No effect ID provided for removal",
          null,
          "EMBEDDED_ITEM_MANAGER",
        );
        return false;
      }

      await item.removeEmbeddedEffect(effectId);
      return true;
    } catch (error) {
      Logger.error(
        "Failed to remove embedded effect",
        error,
        "EMBEDDED_ITEM_MANAGER",
      );
      return false;
    }
  }

  /**
   * Edit an embedded transformation on an action card
   *
   * @static
   * @param {Item} item - The parent action card
   * @param {string} transformationId - The transformation ID to edit
   * @returns {Promise<boolean>} Success status
   */
  static async editEmbeddedTransformation(item, transformationId) {
    try {
      if (!transformationId) {
        Logger.warn(
          "No transformation ID provided for editing",
          null,
          "EMBEDDED_ITEM_MANAGER",
        );
        return false;
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
          "EMBEDDED_ITEM_MANAGER",
        );
        return false;
      }

      // Open the transformation sheet
      await transformation.sheet.render(true);
      return true;
    } catch (error) {
      Logger.error(
        "Failed to edit embedded transformation",
        error,
        "EMBEDDED_ITEM_MANAGER",
      );
      return false;
    }
  }

  /**
   * Remove an embedded transformation from an action card
   *
   * @static
   * @param {Item} item - The parent action card
   * @param {string} transformationId - The transformation ID to remove
   * @returns {Promise<boolean>} Success status
   */
  static async removeEmbeddedTransformation(item, transformationId) {
    try {
      if (!transformationId) {
        Logger.warn(
          "No transformation ID provided for removal",
          null,
          "EMBEDDED_ITEM_MANAGER",
        );
        return false;
      }

      await item.removeEmbeddedTransformation(transformationId);
      return true;
    } catch (error) {
      Logger.error(
        "Failed to remove embedded transformation",
        error,
        "EMBEDDED_ITEM_MANAGER",
      );
      return false;
    }
  }

  // =================================
  // Transformation Creation Methods
  // =================================

  /**
   * Create a new combat power for a transformation
   *
   * @static
   * @param {Item} item - The parent transformation
   * @returns {Promise<boolean>} Success status
   */
  static async createNewCombatPower(item) {
    try {
      const newPowerData = this.getDefaultCombatPowerData(
        item,
        "transformation",
      );

      const tempItem = new CONFIG.Item.documentClass(newPowerData, {
        parent: null,
      });

      await item.system.addCombatPower(tempItem);
      return true;
    } catch (error) {
      Logger.error(
        "Failed to create new combat power",
        error,
        "EMBEDDED_ITEM_MANAGER",
      );
      return false;
    }
  }

  /**
   * Create a new action card for a transformation
   *
   * @static
   * @param {Item} item - The parent transformation
   * @returns {Promise<boolean>} Success status
   */
  static async createNewActionCard(item) {
    try {
      const newActionCardData = this.getDefaultActionCardData(item);

      const tempItem = new CONFIG.Item.documentClass(newActionCardData, {
        parent: null,
      });

      await item.system.addActionCard(tempItem);
      return true;
    } catch (error) {
      Logger.error(
        "Failed to create new action card",
        error,
        "EMBEDDED_ITEM_MANAGER",
      );
      return false;
    }
  }

  // =================================
  // Helper Methods
  // =================================

  /**
   * Get the appropriate embedded collection for an item type
   *
   * @static
   * @param {Item} item - The parent item
   * @param {string} itemType - The type of embedded item
   * @returns {Array|null} The embedded collection or null if not found
   */
  static getEmbeddedCollection(item, itemType) {
    if (!item || !item.system) {
      return null;
    }

    switch (itemType) {
      case "combatPower":
        if (item.type === "transformation") {
          return item.system.embeddedCombatPowers || [];
        }
        return null;
      case "actionCard":
        if (item.type === "transformation") {
          return item.system.embeddedActionCards || [];
        }
        return null;
      case "status":
        if (item.type === "actionCard") {
          return item.system.embeddedStatusEffects || [];
        }
        return null;
      case "transformation":
        if (item.type === "actionCard") {
          return item.system.embeddedTransformations || [];
        }
        return null;
      default:
        return null;
    }
  }
}

export default EmbeddedItemManager;
