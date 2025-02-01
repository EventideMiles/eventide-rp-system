import { rollHandler } from "../helpers/roll-dice.mjs";
import { PrerequisitePopup } from "../sheets/prerequisite-popup.mjs";

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
    if (!this.actor || this.type !== "combatPower") return;
    let diceAdjustments;

    const rollData = this.getRollData();

    if (rollData.actor.power.value < rollData.cost) {
      ui.notifications.warn("You don't have enough power to use this ability!");
      return "";
    }

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
      };
    }

    if (rollData.roll.type === "flat")
      return `${rollData.roll.bonus}${
        rollData.roll.ability !== "unaugmented"
          ? ` + ${rollData.actor.abilities[rollData.roll.ability].total}`
          : ""
      }`;

    return `${diceAdjustments.absTotal + 1}d${
      rollData.actor.hiddenAbilities.dice.total
    }${diceAdjustments.mode}${
      rollData.roll.ability !== "unaugmented"
        ? ` + ${rollData.actor.abilities[rollData.roll.ability].total}`
        : ""
    } + ${rollData.roll.bonus}`;
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

  /**
   * Handle a click event on the item.
   * @param {Event} event - The triggering click event
   * @returns {Promise<void>}
   */
  async roll(event) {
    const item = this;

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get("core", "rollMode");
    const label = `[${item.type}] ${item.name}`;

    // if its a combat power we need special handling
    if (item.type === "combatPower") {
      const targetArray = await erps.utils.getTargetArray();

      // Only check for targets if this is a targeted power
      if (
        item.system.targeted &&
        targetArray.length === 0 &&
        item.system.roll.type !== "none"
      ) {
        return ui.notifications.error(
          `Please target at least one token first!`
        );
      }

      item.formula = item.getCombatRollFormula();

      if (item.formula === "") return;
      new PrerequisitePopup({ item }).render(
        this.system.prerequisites === "" || !this.system.prerequisites
          ? false
          : true
      );
    }
    // If there's no roll data, send a chat message.
    else if (!this.system.formula) {
      new ChatMessage({
        speaker,
        content: `${label}`,
        rollMode,
      });
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = {
        ...this.getRollData(),
        label: item.name ?? "",
        type: item.type ?? "",
      };

      const roll = await rollHandler(rollData, this.actor);
      return roll;
    }
  }
}
