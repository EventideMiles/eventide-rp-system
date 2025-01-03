import { getTargetArray } from "./common-foundry-tasks.js";

/**
 * Handles rolling dice for a given actor and creating a formatted chat card.
 * @param {*} dataSet expects formula, type, and label. critAllowed, acCheck and description are optional.
 * @param {*} actor The actor that is rolling the dice.
 * @returns The roll object.
 */
const rollHandler = async (dataSet, actor) => {
  const rollData = actor.getRollData();
  const roll = new Roll(dataSet.formula, rollData);
  const result = await roll.evaluate();
  const targetArray = await getTargetArray();
  const critAllowed = dataSet?.critAllowed ?? true;
  const acCheck = dataSet?.acCheck ?? true;

  const pickedType = await dataSet?.type?.toLowerCase();

  const pickedCardClass = pickedType.includes("acro")
    ? "eventide-acro-card"
    : pickedType.includes("phys")
    ? "eventide-phys-card"
    : pickedType.includes("fort")
    ? "eventide-fort-card"
    : pickedType.includes("will")
    ? "eventide-will-card"
    : pickedType.includes("wits")
    ? "eventide-wits-card"
    : pickedType.includes("combat")
    ? "eventide-combat-power-card"
    : pickedType.includes("item")
    ? "eventide-item-card"
    : pickedType.includes("damage")
    ? "eventide-damage-card"
    : "eventide-unknown-card";

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
    : "fa-solid fa-question";

  let card = dataSet.label
    ? `<div class="${pickedCardClass}"><i class="${pickedIcon}"></i> ${dataSet.label}</div>`
    : "";

  if (critAllowed && dataSet.formula.includes("d")) {
    const dieRoll = result.terms[0].results[0].result;

    if (
      dieRoll <= rollData.hiddenAbilities.cmax.total &&
      dieRoll >= rollData.hiddenAbilities.cmin.total
    ) {
      card = `${card} <p class="eventide-critical-hit"><i class="fa-solid fa-meteor"></i> Critical Hit!</p>`;
    } else if (
      dieRoll >= rollData.hiddenAbilities.fmin.total &&
      dieRoll <= rollData.hiddenAbilities.fmax.total
    ) {
      card = `${card} <p class="eventide-critical-miss"><i class="fa-solid fa-flag"></i> Critical Miss!</p>`;
    }
  }

  if (targetArray.length && acCheck) {
    card = `${card} <secret><p class="eventide-card-effects-title">AC Check:</p>`;
    for (const target of targetArray) {
      card = `${card} <div class="eventide-card-effects flexrow">${target.actor.name}:`;

      const targetRollData = target.actor.getRollData();

      for (const ability in targetRollData.abilities) {
        card = `${card} <div class="${
          result.total >= targetRollData.abilities[ability].ac
            ? "eventide-card-hit-box flex-group-center"
            : "eventide-card-miss-box flex-group-center"
        }">${targetRollData.abilities[ability].abbr}</div>`;
      }
      card = `${card} </div></secret>`;
    }
  }

  if (dataSet?.description) {
    card = `${card} <div class="eventide-card-description">
      <div class="eventide-card-name">${actor.name}. . . </div> 
      ${dataSet.description}</div>`;
  }

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: card,
    rollMode: game.settings.get("core", "rollMode"),
  });

  return roll;
};

export { rollHandler };
