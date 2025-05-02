const prepareCharacterEffects = async (effect) => {
  let fullEffects = [];
  let regularEffects = [];
  let hiddenEffects = [];

  if (!effect.changes) {
    return {
      fullEffects: fullEffects,
      regularEffects: regularEffects,
      hiddenEffects: hiddenEffects,
    };
  }

  const abilities = ["acro", "phys", "fort", "will", "wits"];
  const hiddenAbilities = ["dice", "cmax", "cmin", "fmax", "fmin", "vuln"];
  const allAbilities = [...abilities, ...hiddenAbilities];

  for (const change of effect.changes) {
    const ability = allAbilities.find((ability) =>
      change.key.includes(ability)
    );
    const mode = change.key.includes("disadvantage")
      ? "disadvantage"
      : change.key.includes("advantage")
      ? "advantage"
      : change.mode === 5
      ? "override"
      : "change";
    if (ability) {
      fullEffects.push({
        ability,
        value: change.value,
        mode,
        hidden: hiddenAbilities.includes(ability),
      });
    }
  }

  for (const e of fullEffects) {
    if (e.hidden) {
      hiddenEffects.push(e);
    } else {
      regularEffects.push(e);
    }
  }

  return {
    fullEffects: fullEffects,
    regularEffects: regularEffects,
    hiddenEffects: hiddenEffects,
  };
};

export { prepareCharacterEffects };
