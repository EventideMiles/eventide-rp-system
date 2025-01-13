import { getTargetArray } from "./common-foundry-tasks.js";

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

  // let card = dataSet.label
  //   ? `<div class="chat-card chat-card__header ${pickedCardClass}"><i class="${pickedIcon}"></i> ${dataSet.label}</div>`
  //   : "";

  // if (critAllowed && dataSet.formula.includes("d")) {
  //   const dieRoll = result.terms[0].results[0].result;

  //   if (
  //     dieRoll <= rollData.hiddenAbilities.cmax.total &&
  //     dieRoll >= rollData.hiddenAbilities.cmin.total
  //   ) {
  //     card = `${card} <div class="chat-card__header chat-card__header--critical-hit"><i class="fa-solid fa-meteor"></i> Critical Hit!</div>`;
  //   } else if (
  //     dieRoll >= rollData.hiddenAbilities.fmin.total &&
  //     dieRoll <= rollData.hiddenAbilities.fmax.total
  //   ) {
  //     card = `${card} <div class="chat-card__header chat-card__header--critical-miss"><i class="fa-solid fa-flag"></i> Critical Miss!</div>`;
  //   }
  // }

  // if (targetArray.length && acCheck) {
  //   card = `${card} <div class="chat-card__effects chat-card__effects--ac-check"><p class="chat-card__effects--title">AC Check:</p>`;
  //   for (const target of targetArray) {
  //     card = `${card} <div class="chat-card__effects--name flexrow">${target.actor.name}:`;

  //     const targetRollData = target.actor.getRollData();

  //     for (const ability in targetRollData.abilities) {
  //       card = `${card} <div class="${
  //         result.total >= targetRollData.abilities[ability].ac
  //           ? "chat-card__effects--hit flex-group-center"
  //           : "chat-card__effects--miss flex-group-center"
  //       }">${targetRollData.abilities[ability].abbr}</div>`;
  //     }
  //     card = `${card} </div></div>`;
  //   }
  // }

  // if (dataSet?.description) {
  //   card = `${card} <div class="chat-card__description">
  //     <div class="chat-card__description--header">${actor.name}. . . </div>
  //     ${dataSet.description}</div>`;
  // }

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: content,
    rollMode: game.settings.get("core", "rollMode"),
  });

  return roll;
};

export { rollHandler };
