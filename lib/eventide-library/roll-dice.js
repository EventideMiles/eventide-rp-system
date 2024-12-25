const rollHandler = async (dataSet, actor) => {
  const rollData = actor.getRollData();
  const roll = new Roll(dataSet.formula, rollData);
  const result = await roll.evaluate();

  console.log(actor.appliedEffects);

  const pickedType = dataSet.type?.toLowerCase();

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
    result.terms[0].results[0].result <= rollData.cmax.value &&
    result.terms[0].results[0].result >= rollData.cmin.value
  ) {
    label = `${label} <p class="eventide-critical-hit"><i class="fa-solid fa-meteor"></i> Critical Hit!</p>`;
  } else if (result.terms[0].results[0].result === 1) {
    label = `${label} <p class="eventide-critical-miss"><i class="fa-solid fa-flag"></i> Critical Miss!</p>`;
  }

  // determine if a dice dc applies to the roll and if so, apply it
  if (
    (rollData.acrodc.value > 0 &&
      dataSet.formula.toLowerCase().contains("acro")) ||
    (rollData.physdc.value > 0 &&
      dataSet.formula.toLowerCase().contains("phys")) ||
    (rollData.fortdc.value > 0 &&
      dataSet.formula.toLowerCase().contains("fort")) ||
    (rollData.willdc.value > 0 &&
      dataSet.formula.toLowerCase().contains("will")) ||
    (rollData.witsdc.value > 0 &&
      dataSet.formula.toLowerCase().contains("wits"))
  ) {
    const dcImpact = await checkDcImpact(dataSet, actor);
  }

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: actor }),
    flavor: label,
    rollMode: game.settings.get("core", "rollMode"),
  });

  return roll;
};

const checkDcImpact = async (dataset, actor) => {
  let label = ``;
  const impactedStat = dataset.formula.toLowerCase().contains("acro")
    ? "acro"
    : dataset.formula.toLowerCase().contains("phys")
    ? "phys"
    : dataset.formula.toLowerCase().contains("fort")
    ? "fort"
    : dataset.formula.toLowerCase().contains("will")
    ? "will"
    : dataset.formula.toLowerCase().contains("wits")
    ? "wits"
    : "unknown";

  if (impactedStat === "unknown") return null;

  const formula = `1d20`;
  const roll = new Roll(formula, actor.getRollData());

  const result = await roll.evaluate();

  if (result.total <= actor.hiddenAbilities[`${impactedStat}dc`].value) 
    label = `<p class="eventide-dice-dc-card"><i class="fa-solid fa-lock"></i> Dice DC Triggered!</p>`;
  
  return label;
};

export { rollHandler };
