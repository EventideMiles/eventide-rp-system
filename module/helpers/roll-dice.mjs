import { getTargetArray } from "./common-foundry-tasks.mjs";
/**
 * Roll handler for the Eventide RP System
 * This function processes dice rolls for various actions in the game system.
 * It handles critical hits/misses, AC checks against targets, and formats
 * the results into chat messages.
 *
 * @param {Object} rollData - Object containing roll data
 * @param {string} [rollData.formula="1"] - The dice formula to roll (e.g. "1d20+5")
 * @param {string} [rollData.label="unknown roll"] - Display name for the roll
 * @param {string} [rollData.type="unknown"] - Type of roll (e.g. "damage", "heal", ability code)
 * @param {boolean} [rollData.critAllowed=true] - Whether critical hits/misses are possible
 * @param {boolean} [rollData.acCheck=true] - Whether to check against target AC values
 * @param {string} [rollData.description=""] - Optional description of the roll
 * @param {boolean} [rollData.toMessage=true] - Whether to create a chat message
 * @param {Actor} actor - Actor performing the roll
 * @returns {Promise<Roll>} - Resolved promise containing the evaluated roll
 */
const rollHandler = async (
  {
    formula = "1",
    label = "unknown roll",
    type = "unknown",
    critAllowed = true,
    acCheck = true,
    description = "",
    toMessage = true,
  } = {},
  actor
) => {
  const rollData = actor.getRollData();
  const roll = new Roll(formula, rollData);
  const result = await roll.evaluate();
  const targetArray = await erps.utils.getTargetArray();
  const addCheck = (acCheck ?? true) && targetArray.length ? true : false;

  const pickedType = type.toLowerCase();

  let critHit = false;
  let critMiss = false;
  let stolenCrit = false;
  let savedMiss = false;

  if (critAllowed && formula.includes("d")) {
    const dieArray = result.terms[0].results;
    const [cmin, cmax, fmin, fmax] = Object.values(rollData.hiddenAbilities);

    critHit = dieArray.some(
      (die) => die.result <= cmax.total && die.result >= cmin.total
    );
    critMiss = dieArray.some(
      (die) => die.result <= fmax.total && die.result >= fmin.total
    );

    stolenCrit =
      dieArray.some(
        (die) =>
          die.result <= cmax.total &&
          die.result >= cmin.total &&
          formula.toLowerCase().includes("kl")
      ) &&
      !dieArray.every(
        (die) => die.result <= cmax.total && die.result >= cmin.total
      );

    savedMiss =
      dieArray.some(
        (die) =>
          die.result >= fmin.total &&
          die.result <= fmax.total &&
          formula.toLowerCase().includes("k") &&
          !formula.toLowerCase().includes("kl")
      ) &&
      !dieArray.every(
        (die) => die.result >= fmin.total && die.result <= fmax.total
      );

    if (stolenCrit && critHit) {
      critHit = false;
    }

    if (savedMiss && critMiss) {
      critMiss = false;
    }
  }

  const targetRollData = addCheck
    ? targetArray.map((target) => ({
        name: target.actor.name,
        compare: result.total,
        ...target.actor.getRollData(),
      }))
    : [];

  const [pickedCardClass, pickedIcon] = pickedType.includes("acro")
    ? ["chat-card__header--acrobatics", "fa-solid fa-feather-pointed"]
    : pickedType.includes("phys")
    ? ["chat-card__header--physical", "fa-solid fa-dragon"]
    : pickedType.includes("fort")
    ? ["chat-card__header--fortitude", "fa-solid fa-shield"]
    : pickedType.includes("will")
    ? ["chat-card__header--will", "fa-solid fa-fire-flame-curved"]
    : pickedType.includes("wits")
    ? ["chat-card__header--wits", "fa-solid fa-chess"]
    : pickedType.includes("gear")
    ? ["chat-card__header--gear", "fa-solid fa-toolbox"]
    : pickedType.includes("damage")
    ? ["chat-card__header--damage", "fa-sharp-duotone fa-light fa-claw-marks"]
    : pickedType.includes("heal")
    ? ["chat-card__header--heal", "fa-regular fa-wave-pulse"]
    : ["chat-card__header--unknown", "fa-solid fa-question"];

  const data = {
    rollData,
    roll,
    result,
    label,
    description,
    pickedCardClass,
    pickedIcon,
    critAllowed,
    acCheck: addCheck,
    targetArray,
    targetRollData,
    actor,
    critHit: critHit ?? false,
    critMiss: critMiss ?? false,
    savedMiss: savedMiss ?? false,
    stolenCrit: stolenCrit ?? false,
  };

  const content = await renderTemplate(
    `systems/eventide-rp-system/templates/chat/roll-message.hbs`,
    data
  );

  if (toMessage) {
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: content,
      rollMode: game.settings.get("core", "rollMode"),
    });
  }

  return roll;
};

export { rollHandler };
