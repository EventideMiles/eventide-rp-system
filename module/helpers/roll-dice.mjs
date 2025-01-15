import { getTargetArray } from "./common-foundry-tasks.mjs";

/**
 * Roll handler for the Eventide RP System
 * @param {Object} dataSet - Object containing roll data
 * @param {Actor} actor - Actor performing the roll
 * @returns {Promise<Roll>} - Resolved promise containing the evaluated roll
 * @example
 * const rollData = {
 *   formula: "1d20 + 5",
 *   label: "Acrobatics",
 *   type: "acro",
 *   critAllowed: true,
 *   acCheck: true,
 *   description: "Landing a backflip while being chased by a pack of wolves.",
 * };
 *
 * const actor = game.actors.getName("Test Character");
 * const result = await rollHandler(rollData, actor);
 */
const rollHandler = async (dataSet, actor) => {
  const rollData = actor.getRollData();
  const roll = new Roll(dataSet.formula, rollData);
  const result = await roll.evaluate();
  const targetArray = await getTargetArray();
  const critAllowed = dataSet?.critAllowed ?? true;
  const acCheck =
    (dataSet?.acCheck ?? true) && targetArray.length ? true : false;
  const description = dataSet?.description ?? "";

  const pickedType = await dataSet?.type?.toLowerCase();
  let critHit = false;
  let critMiss = false;

  if (critAllowed && dataSet.formula.includes("d")) {
    const dieRoll = result.terms[0].results[0].result;
    critHit =
      dieRoll <= rollData.hiddenAbilities.cmax.total &&
      dieRoll >= rollData.hiddenAbilities.cmin.total
        ? true
        : false;
    critMiss =
      dieRoll >= rollData.hiddenAbilities.fmin.total &&
      dieRoll <= rollData.hiddenAbilities.fmax.total
        ? true
        : false;
  }

  let targetRollData = [];
  for (const target of targetArray) {
    targetRollData.push({
      name: target.actor.name,
      compare: result.total,
      ...target.actor.getRollData(),
    });
  }

  const pickedCardClass = pickedType.includes("acro")
    ? "chat-card__header--acrobatics"
    : pickedType.includes("phys")
    ? "chat-card__header--physical"
    : pickedType.includes("fort")
    ? "chat-card__header--fortitude"
    : pickedType.includes("will")
    ? "chat-card__header--will"
    : pickedType.includes("wits")
    ? "chat-card__header--wits"
    : pickedType.includes("combat")
    ? "chat-card__header--combat-power"
    : pickedType.includes("item")
    ? "chat-card__header--item"
    : pickedType.includes("damage")
    ? "chat-card__header--damage"
    : pickedType.includes("heal")
    ? "chat-card__header--heal"
    : "chat-card__header--unknown";

  const pickedIcon = pickedType.includes("acro")
    ? "fa-solid fa-feather-pointed"
    : pickedType.includes("phys")
    ? "fa-solid fa-dragon"
    : pickedType.includes("fort")
    ? "fa-solid fa-shield"
    : pickedType.includes("will")
    ? "fa-solid fa-fire-flame-curved"
    : pickedType.includes("wits")
    ? "fa-solid fa-chess"
    : pickedType.includes("combat")
    ? "fa-solid fa-sword"
    : pickedType.includes("item")
    ? "fa-solid fa-toolbox"
    : pickedType.includes("damage")
    ? "fa-sharp-duotone fa-light fa-claw-marks"
    : pickedType.includes("heal")
    ? "fa-regular fa-wave-pulse"
    : "fa-solid fa-question";

  const data = {
    rollData,
    roll,
    result,
    label: dataSet.label,
    description: dataSet.description,
    pickedCardClass,
    pickedIcon,
    critAllowed,
    acCheck,
    targetArray,
    targetRollData,
    actor,
    dataSet,
    critHit,
    critMiss,
    description,
  };

  const content = await renderTemplate(
    `systems/eventide-rp-system/templates/chat/roll-message.hbs`,
    data
  );

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: content,
    rollMode: game.settings.get("core", "rollMode"),
  });

  return roll;
};

export { rollHandler };
