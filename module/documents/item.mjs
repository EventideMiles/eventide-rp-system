import { CombatPowerPopup } from "../sheets/popups/combat-power-popup.mjs";
import { GearPopup } from "../sheets/popups/gear-popup.mjs";
import { StatusPopup } from "../sheets/popups/status-popup.mjs";
import { FeaturePopup } from "../sheets/popups/feature-popup.mjs";

/**
 * Extended Item class for the Eventide RP System.
 * Provides additional functionality for items including roll data preparation and chat message creation.
 * @extends {Item}
 */
export class EventideRpSystemItem extends Item {
  /** @override */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  /**
   * Prepare roll data for the item.
   * @override
   * @returns {Object} The prepared roll data
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const rollData = { ...this.system };

    // Quit early if there's no parent actor
    if (!this.actor) return rollData;

    // If present, add the actor's roll data
    rollData.actor = this.actor.getRollData();

    return rollData;
  }

  getCombatRollFormula() {
    if (!this.actor) return;
    let diceAdjustments;

    const rollData = this.getRollData();

    if (rollData.roll.type === "none") return "0";

    if (rollData.roll.ability !== "unaugmented") {
      const thisDiceAdjustments = rollData.roll.diceAdjustments;
      const actorDiceAdjustments =
        rollData.actor.abilities[rollData.roll.ability].diceAdjustments;
      const total = thisDiceAdjustments.total + actorDiceAdjustments.total;
      const absTotal = Math.abs(total);

      diceAdjustments = {
        total,
        advantage:
          thisDiceAdjustments.advantage + actorDiceAdjustments.advantage,
        disadvantage:
          thisDiceAdjustments.disadvantage + actorDiceAdjustments.disadvantage,
        mode: total >= 0 ? "k" : "kl",
        absTotal,
      };
    } else {
      diceAdjustments = {
        ...rollData.roll.diceAdjustments,
        mode: rollData.roll.diceAdjustments.total >= 0 ? "k" : "kl",
        absTotal: Math.abs(rollData.roll.diceAdjustments.total),
      };
    }

    if (rollData.roll.type === "flat")
      return `${rollData.roll.bonus}${
        rollData.roll.ability !== "unaugmented"
          ? ` + ${rollData.actor.abilities[rollData.roll.ability].total}`
          : ""
      }`;

    const returnFormula = `${diceAdjustments.absTotal + 1}d${
      rollData.actor.hiddenAbilities.dice.total
    }${diceAdjustments.mode}${
      rollData.roll.ability !== "unaugmented"
        ? ` + ${rollData.actor.abilities[rollData.roll.ability].total}`
        : ""
    } + ${rollData.roll.bonus}`;

    return returnFormula;
  }

  /**
   * Convert the item document to a plain object.
   * @returns {Object} Plain object representation of the item
   */
  toPlainObject() {
    const result = { ...this };

    // Simplify system data.
    result.system = this.system.toPlainObject();

    // Add effects.
    result.effects = this.effects?.size > 0 ? this.effects.contents : [];

    return result;
  }

  addQuantity(value) {
    this.update({
      "system.quantity": this.system.quantity + value,
    });
  }

  /**
   * Handle a click event on the item.
   * @param {Event} event - The triggering click event
   * @returns {Promise<void>}
   */
  async roll(event) {
    const item = this;

    // combat power handling
    if (item.type === "combatPower") {
      item.formula = item.getCombatRollFormula();
      new CombatPowerPopup({ item }).render(true);
    }
    // gear handling
    else if (item.type === "gear") {
      item.formula = item.getCombatRollFormula();
      new GearPopup({ item }).render(true);
    }
    // status roll handling
    else if (item.type === "status") {
      new StatusPopup({ item }).render(true);
    }
    // feature roll handling
    else if (item.type === "feature") {
      new FeaturePopup({ item }).render(true);
    }
  }
}
