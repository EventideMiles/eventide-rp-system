const rollHandler = async (dataSet, actor, cardData) => {
  const rollData = actor.getRollData();
  const roll = new Roll(dataSet.formula, rollData);
  const result = await roll.evaluate();

  const pickedType = await dataSet.type?.toLowerCase();

  console.log(pickedType);

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
    : "fa-solid fa-question";

  let label = dataSet.label
    ? `<div class="${pickedCardClass}"><i class="${pickedIcon}"></i> ${dataSet.label}</div>`
    : "";

  if (
    result.terms[0].results[0].result <= rollData.hiddenAbilities.cmax.value &&
    result.terms[0].results[0].result >= rollData.hiddenAbilities.cmin.value
  ) {
    label = `${label} <p class="eventide-critical-hit"><i class="fa-solid fa-meteor"></i> Critical Hit!</p>`;
  } else if (result.terms[0].results[0].result === 1) {
    label = `${label} <p class="eventide-critical-miss"><i class="fa-solid fa-flag"></i> Critical Miss!</p>`;
  }

  // determine if a dice dc applies to the roll and if so, apply it
  // if (
  //   (rollData.acrodc.value > 0 &&
  //     dataSet.formula.toLowerCase().contains("acro")) ||
  //   (rollData.physdc.value > 0 &&
  //     dataSet.formula.toLowerCase().contains("phys")) ||
  //   (rollData.fortdc.value > 0 &&
  //     dataSet.formula.toLowerCase().contains("fort")) ||
  //   (rollData.willdc.value > 0 &&
  //     dataSet.formula.toLowerCase().contains("will")) ||
  //   (rollData.witsdc.value > 0 &&
  //     dataSet.formula.toLowerCase().contains("wits"))
  // ) {
  //   const dcImpact = await checkDcImpact(dataSet, actor);
  // }

  if (cardData?.description) {
    label = `${label} <p class="eventide-card-description">${cardData.description}</p>`;
  }

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: actor }),
    flavor: label,
    rollMode: game.settings.get("core", "rollMode"),
  });

  return roll;
};

export { rollHandler };
