import { Logger } from "../../services/logger.mjs";
import { getSetting } from "../../services/_module.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";

/**
 * Item Rolls Mixin
 *
 * Provides roll formula calculation functionality for items, including combat rolls,
 * dice adjustments calculation, and formula generation for different roll types.
 *
 * @param {class} BaseClass - The base item class to extend
 * @returns {class} Extended class with roll calculation functionality
 */
export const ItemRollsMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Generate a roll formula for a combat-related roll
     * Takes into account dice adjustments from both the item and actor
     *
     * @returns {string|undefined} The complete roll formula or undefined if no actor
     */
    getCombatRollFormula() {
      Logger.methodEntry("ItemRollsMixin", "getCombatRollFormula", {
        itemName: this.name,
        itemType: this.type,
        hasActor: !!this.actor,
      });

      if (!this.actor) {
        Logger.warn(
          "Cannot generate combat roll formula without parent actor",
          { itemId: this.id, itemName: this.name },
          "ITEM_ROLLS",
        );
        return undefined;
      }

      try {
        const rollData = this.getRollData();

        // Validate roll data structure
        if (!rollData.roll || typeof rollData.roll.type !== "string") {
          Logger.warn(
            "Invalid roll data structure",
            { rollData },
            "ITEM_ROLLS",
          );
          return undefined;
        }

        // Handle different roll types
        const formula = this._generateFormulaByType(rollData);

        Logger.debug(
          `Generated combat roll formula: ${formula}`,
          {
            rollType: rollData.roll.type,
            ability: rollData.roll.ability,
            formula,
          },
          "ITEM_ROLLS",
        );

        Logger.methodExit("ItemRollsMixin", "getCombatRollFormula", formula);
        return formula;
      } catch (error) {
        const [, _handledError] = ErrorHandler.safeExecute(() =>
          ErrorHandler.handleAsync(Promise.reject(error), {
            context: `Combat Roll Formula Generation for ${this.name}`,
            errorType: ErrorHandler.ERROR_TYPES.DATA,
            showToUser: false,
          }),
        );

        Logger.methodExit("ItemRollsMixin", "getCombatRollFormula", null);
        return undefined;
      }
    }

    /**
     * Generate formula based on roll type
     *
     * @private
     * @param {Object} rollData - The roll data object
     * @returns {string} The generated formula
     */
    _generateFormulaByType(rollData) {
      Logger.methodEntry("ItemRollsMixin", "_generateFormulaByType", {
        rollType: rollData.roll.type,
      });

      let formula;

      switch (rollData.roll.type) {
        case "none":
          formula = "0";
          break;
        case "flat":
          formula = this._getFlatBonusFormula(rollData);
          break;
        case "roll":
        default:
          formula = this._getDiceRollFormula(rollData);
          break;
      }

      Logger.methodExit("ItemRollsMixin", "_generateFormulaByType", formula);
      return formula;
    }

    /**
     * Calculate formula for flat bonus (no dice) rolls
     *
     * @private
     * @param {Object} rollData - The roll data
     * @returns {string} The flat bonus formula
     */
    _getFlatBonusFormula(rollData) {
      Logger.methodEntry("ItemRollsMixin", "_getFlatBonusFormula", {
        bonus: rollData.roll.bonus,
        ability: rollData.roll.ability,
      });

      const baseBonus = rollData.roll.bonus || 0;

      if (rollData.roll.ability === "unaugmented") {
        const formula = baseBonus.toString();
        Logger.methodExit("ItemRollsMixin", "_getFlatBonusFormula", formula);
        return formula;
      }

      // Validate ability exists in actor data
      if (!rollData.actor?.abilities?.[rollData.roll.ability]) {
        Logger.warn(
          `Ability "${rollData.roll.ability}" not found in actor data`,
          { availableAbilities: Object.keys(rollData.actor?.abilities || {}) },
          "ITEM_ROLLS",
        );
        const formula = baseBonus.toString();
        Logger.methodExit("ItemRollsMixin", "_getFlatBonusFormula", formula);
        return formula;
      }

      const abilityTotal =
        rollData.actor.abilities[rollData.roll.ability].total || 0;
      const formula = `${baseBonus} + ${abilityTotal}`;

      Logger.methodExit("ItemRollsMixin", "_getFlatBonusFormula", formula);
      return formula;
    }

    /**
     * Generate dice roll formula with adjustments
     *
     * @private
     * @param {Object} rollData - The roll data
     * @returns {string} The dice roll formula
     */
    _getDiceRollFormula(rollData) {
      Logger.methodEntry("ItemRollsMixin", "_getDiceRollFormula", {
        ability: rollData.roll.ability,
      });

      // Get dice adjustments for the formula
      const diceAdjustments = this._calculateDiceAdjustments(rollData);

      // Build the complete dice formula
      const formula = this._buildDiceFormula(rollData, diceAdjustments);

      Logger.methodExit("ItemRollsMixin", "_getDiceRollFormula", formula);
      return formula;
    }

    /**
     * Calculate dice adjustments for the formula
     *
     * @private
     * @param {Object} rollData - The roll data
     * @returns {Object} The dice adjustments
     */
    _calculateDiceAdjustments(rollData) {
      Logger.methodEntry("ItemRollsMixin", "_calculateDiceAdjustments", {
        ability: rollData.roll.ability,
      });

      let adjustments;

      // Handle ability-based rolls
      if (rollData.roll.ability !== "unaugmented") {
        adjustments = this._calculateAbilityBasedAdjustments(rollData);
      } else {
        // Handle unaugmented rolls
        adjustments = this._calculateUnaugmentedAdjustments(rollData);
      }

      Logger.debug("Calculated dice adjustments", adjustments, "ITEM_ROLLS");

      Logger.methodExit(
        "ItemRollsMixin",
        "_calculateDiceAdjustments",
        adjustments,
      );
      return adjustments;
    }

    /**
     * Calculate dice adjustments for ability-based rolls
     *
     * @private
     * @param {Object} rollData - The roll data
     * @returns {Object} The dice adjustments
     */
    _calculateAbilityBasedAdjustments(rollData) {
      Logger.methodEntry(
        "ItemRollsMixin",
        "_calculateAbilityBasedAdjustments",
        {
          ability: rollData.roll.ability,
        },
      );

      // Validate roll data structure
      if (!rollData.roll?.diceAdjustments) {
        Logger.warn(
          "Missing diceAdjustments in roll data",
          { rollData: rollData.roll },
          "ITEM_ROLLS",
        );
        return this._getDefaultAdjustments();
      }

      // Validate actor ability data
      if (
        !rollData.actor?.abilities?.[rollData.roll.ability]?.diceAdjustments
      ) {
        Logger.warn(
          `Missing diceAdjustments for ability "${rollData.roll.ability}" in actor data`,
          { ability: rollData.roll.ability },
          "ITEM_ROLLS",
        );
        return this._getDefaultAdjustments();
      }

      const thisDiceAdjustments = rollData.roll.diceAdjustments;
      const actorDiceAdjustments =
        rollData.actor.abilities[rollData.roll.ability].diceAdjustments;

      // Combine adjustments from item and actor
      const total =
        (thisDiceAdjustments.total || 0) + (actorDiceAdjustments.total || 0);
      const absTotal = Math.abs(total);

      const adjustments = {
        total,
        advantage:
          (thisDiceAdjustments.advantage || 0) +
          (actorDiceAdjustments.advantage || 0),
        disadvantage:
          (thisDiceAdjustments.disadvantage || 0) +
          (actorDiceAdjustments.disadvantage || 0),
        mode: total >= 0 ? "k" : "kl", // k = keep highest, kl = keep lowest
        absTotal,
      };

      Logger.methodExit(
        "ItemRollsMixin",
        "_calculateAbilityBasedAdjustments",
        adjustments,
      );
      return adjustments;
    }

    /**
     * Calculate dice adjustments for unaugmented rolls
     *
     * @private
     * @param {Object} rollData - The roll data
     * @returns {Object} The dice adjustments
     */
    _calculateUnaugmentedAdjustments(rollData) {
      Logger.methodEntry("ItemRollsMixin", "_calculateUnaugmentedAdjustments");

      // Validate roll data structure
      if (!rollData.roll?.diceAdjustments) {
        Logger.warn(
          "Missing diceAdjustments in roll data for unaugmented roll",
          { rollData: rollData.roll },
          "ITEM_ROLLS",
        );
        return this._getDefaultAdjustments();
      }

      const diceAdjustments = rollData.roll.diceAdjustments;
      const total = diceAdjustments.total || 0;

      const adjustments = {
        ...diceAdjustments,
        mode: total >= 0 ? "k" : "kl",
        absTotal: Math.abs(total),
      };

      Logger.methodExit(
        "ItemRollsMixin",
        "_calculateUnaugmentedAdjustments",
        adjustments,
      );
      return adjustments;
    }

    /**
     * Build the complete dice formula string
     *
     * @private
     * @param {Object} rollData - The roll data
     * @param {Object} diceAdjustments - The calculated dice adjustments
     * @returns {string} The complete dice formula
     */
    _buildDiceFormula(rollData, diceAdjustments) {
      Logger.methodEntry("ItemRollsMixin", "_buildDiceFormula", {
        absTotal: diceAdjustments.absTotal,
        mode: diceAdjustments.mode,
      });

      // Validate required data
      if (!rollData.actor?.hiddenAbilities?.dice?.total) {
        Logger.error(
          "Missing hiddenAbilities.dice.total in actor data",
          { actorData: rollData.actor },
          "ITEM_ROLLS",
        );
        // Fallback to common die size
        const formula = `${diceAdjustments.absTotal + 1}d20`;
        Logger.methodExit("ItemRollsMixin", "_buildDiceFormula", formula);
        return formula;
      }

      const diceCount = diceAdjustments.absTotal + 1;
      const dieSize = rollData.actor.hiddenAbilities.dice.total;
      const diceMode = diceAdjustments.mode;

      let formula;
      if (diceAdjustments.absTotal > 0) {
        // When there are dice adjustments, roll multiple dice and keep the best/worst
        formula = `${diceCount}d${dieSize}${diceMode}1`;
      } else {
        // When no dice adjustments, roll a single die
        formula = `1d${dieSize}`;
      }

      // Add ability modifier if not unaugmented
      if (rollData.roll.ability !== "unaugmented") {
        if (rollData.actor?.abilities?.[rollData.roll.ability]?.total) {
          const abilityTotal =
            rollData.actor.abilities[rollData.roll.ability].total;
          formula += ` + ${abilityTotal}`;
        } else {
          Logger.warn(
            `Missing ability total for "${rollData.roll.ability}"`,
            { ability: rollData.roll.ability },
            "ITEM_ROLLS",
          );
        }
      }

      // Add item bonus
      const bonus = rollData.roll.bonus || 0;
      if (bonus !== 0) {
        formula += ` + ${bonus}`;
      }

      Logger.debug(
        `Built dice formula: ${formula}`,
        { diceCount, dieSize, diceMode, bonus },
        "ITEM_ROLLS",
      );

      Logger.methodExit("ItemRollsMixin", "_buildDiceFormula", formula);
      return formula;
    }

    /**
     * Get default dice adjustments as fallback
     *
     * @private
     * @returns {Object} Default adjustments object
     */
    _getDefaultAdjustments() {
      return {
        total: 0,
        advantage: 0,
        disadvantage: 0,
        mode: "k",
        absTotal: 0,
      };
    }

    /**
     * Validate if the item can perform rolls
     *
     * @returns {boolean} Whether the item can roll
     */
    canRoll() {
      const hasActor = !!this.actor;
      const hasRollData = !!this.system?.roll?.type;
      const isNotNoneType = this.system?.roll?.type !== "none";

      const canRoll = hasActor && hasRollData && isNotNoneType;

      // Only log in testing mode to reduce noise
      if (getSetting("testingMode")) {
        Logger.debug(
          `Item roll validation`,
          {
            hasActor,
            hasRollData,
            isNotNoneType,
            rollType: this.system?.roll?.type,
            canRoll,
          },
          "ITEM_ROLLS",
        );
      }

      return canRoll;
    }

    /**
     * Get the roll type for this item
     *
     * @returns {string} The roll type ("roll", "flat", "none")
     */
    getRollType() {
      return this.system?.roll?.type || "none";
    }

    /**
     * Get the roll ability for this item
     *
     * @returns {string} The ability identifier
     */
    getRollAbility() {
      return this.system?.roll?.ability || "unaugmented";
    }

    /**
     * Get the roll bonus for this item
     *
     * @returns {number} The bonus value
     */
    getRollBonus() {
      return this.system?.roll?.bonus || 0;
    }

    /**
     * Check if this item has dice adjustments
     *
     * @returns {boolean} Whether the item has dice adjustments
     */
    hasDiceAdjustments() {
      const adjustments = this.system?.roll?.diceAdjustments;
      if (!adjustments) return false;

      return (
        (adjustments.advantage || 0) !== 0 ||
        (adjustments.disadvantage || 0) !== 0
      );
    }
  };
