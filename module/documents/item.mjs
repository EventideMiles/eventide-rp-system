import { CombatPowerPopup } from "../ui/popups/combat-power-popup.mjs";
import { GearPopup } from "../ui/popups/gear-popup.mjs";
import { StatusPopup } from "../ui/popups/status-popup.mjs";
import { FeaturePopup } from "../ui/popups/feature-popup.mjs";

/**
 * Extended Item document class for the Eventide RP System.
 *
 * Provides additional functionality for items including roll data preparation,
 * chat message creation, and item-specific actions.
 *
 * @extends {foundry.documents.Item}
 */
export class EventideRpSystemItem extends Item {
  /**
   * Prepare base item data
   * @override
   */
  prepareData() {
    // Call the parent class' prepareData method to handle the core
    // data preparation steps like applying active effects
    super.prepareData();

    // Any item-specific data preparation should be added here in the future
  }

  /**
   * Prepare data to be used for roll calculations
   * @override
   * @returns {Object} The prepared roll data
   */
  getRollData() {
    // Start with a shallow copy of the item's system data
    const rollData = { ...this.system };

    // If there's no parent actor, return early
    if (!this.actor) return rollData;

    // Add the actor's roll data to provide context for the item
    rollData.actor = this.actor.getRollData();

    return rollData;
  }

  /**
   * Generate a roll formula for a combat-related roll
   * Takes into account dice adjustments from both the item and actor
   *
   * @returns {string|undefined} The complete roll formula or undefined if no actor
   */
  getCombatRollFormula() {
    if (!this.actor) return;

    const rollData = this.getRollData();

    // If roll type is 'none', return "0" as the formula (no roll)
    if (rollData.roll.type === "none") return "0";

    // Handle flat bonuses (no dice)
    if (rollData.roll.type === "flat") {
      return this._getFlatBonusFormula(rollData);
    }

    // Get dice adjustments for the formula
    const diceAdjustments = this._calculateDiceAdjustments(rollData);

    // Build the complete dice formula
    return this._buildDiceFormula(rollData, diceAdjustments);
  }

  /**
   * Calculate formula for flat bonus (no dice) rolls
   *
   * @private
   * @param {Object} rollData - The roll data
   * @returns {string} The flat bonus formula
   */
  _getFlatBonusFormula(rollData) {
    return `${rollData.roll.bonus}${
      rollData.roll.ability !== "unaugmented"
        ? ` + ${rollData.actor.abilities[rollData.roll.ability].total}`
        : ""
    }`;
  }

  /**
   * Calculate dice adjustments for the formula
   *
   * @private
   * @param {Object} rollData - The roll data
   * @returns {Object} The dice adjustments
   */
  _calculateDiceAdjustments(rollData) {
    // Handle ability-based rolls
    if (rollData.roll.ability !== "unaugmented") {
      return this._calculateAbilityBasedAdjustments(rollData);
    }
    // Handle unaugmented rolls
    return this._calculateUnaugmentedAdjustments(rollData);
  }

  /**
   * Calculate dice adjustments for ability-based rolls
   *
   * @private
   * @param {Object} rollData - The roll data
   * @returns {Object} The dice adjustments
   */
  _calculateAbilityBasedAdjustments(rollData) {
    const thisDiceAdjustments = rollData.roll.diceAdjustments;
    const actorDiceAdjustments =
      rollData.actor.abilities[rollData.roll.ability].diceAdjustments;

    // Combine adjustments from item and actor
    const total = thisDiceAdjustments.total + actorDiceAdjustments.total;
    const absTotal = Math.abs(total);

    return {
      total,
      advantage: thisDiceAdjustments.advantage + actorDiceAdjustments.advantage,
      disadvantage:
        thisDiceAdjustments.disadvantage + actorDiceAdjustments.disadvantage,
      mode: total >= 0 ? "k" : "kl", // k = keep highest, kl = keep lowest
      absTotal,
    };
  }

  /**
   * Calculate dice adjustments for unaugmented rolls
   *
   * @private
   * @param {Object} rollData - The roll data
   * @returns {Object} The dice adjustments
   */
  _calculateUnaugmentedAdjustments(rollData) {
    return {
      ...rollData.roll.diceAdjustments,
      mode: rollData.roll.diceAdjustments.total >= 0 ? "k" : "kl",
      absTotal: Math.abs(rollData.roll.diceAdjustments.total),
    };
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
    return `${diceAdjustments.absTotal + 1}d${
      rollData.actor.hiddenAbilities.dice.total
    }${diceAdjustments.mode}${
      rollData.roll.ability !== "unaugmented"
        ? ` + ${rollData.actor.abilities[rollData.roll.ability].total}`
        : ""
    } + ${rollData.roll.bonus}`;
  }

  /**
   * Convert the item document to a plain object for export or serialization.
   *
   * @returns {Object} Plain object representation of the item
   */
  toPlainObject() {
    const result = { ...this };

    // Simplify system data
    result.system = this.system.toPlainObject();

    // Add effects if they exist
    result.effects = this.effects?.size > 0 ? this.effects.contents : [];

    return result;
  }

  /**
   * Update the item's quantity
   *
   * @param {number} value - The amount to add (positive) or subtract (negative)
   * @returns {Promise<Item>} The updated item
   */
  async addQuantity(value) {
    return this.update({
      "system.quantity": this.system.quantity + value,
    });
  }

  /**
   * Handle a click event on the item, displaying appropriate popup based on item type.
   *
   * @param {Event} [event] - The triggering click event (optional)
   * @returns {Promise<Application>} The opened application
   */
  async roll(event) {
    const item = this;
    let application;

    // Open the appropriate popup based on item type
    switch (item.type) {
      case "combatPower":
        item.formula = item.getCombatRollFormula();
        application = new CombatPowerPopup({ item });
        break;
      case "gear":
        item.formula = item.getCombatRollFormula();
        application = new GearPopup({ item });
        break;
      case "status":
        application = new StatusPopup({ item });
        break;
      case "feature":
        application = new FeaturePopup({ item });
        break;
      default:
        console.warn(`No handler for item type: ${item.type}`);
        return null;
    }

    return application.render(true);
  }
}
