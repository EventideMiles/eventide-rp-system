/**
 * System-specific configuration constants.
 * @const {Object}
 */
export const EVENTIDE_RP_SYSTEM = {};

/**
 * The set of Ability Scores used within the system.
 * @type {Object<string, string>}
 */
EVENTIDE_RP_SYSTEM.abilities = {
  acro: "EVENTIDE_RP_SYSTEM.Ability.Acro.long",
  phys: "EVENTIDE_RP_SYSTEM.Ability.Phys.long",
  fort: "EVENTIDE_RP_SYSTEM.Ability.Fort.long",
  will: "EVENTIDE_RP_SYSTEM.Ability.Will.long",
  wits: "EVENTIDE_RP_SYSTEM.Ability.Wits.long",
};

/**
 * Abbreviated names for ability scores.
 * @type {Object<string, string>}
 */
EVENTIDE_RP_SYSTEM.abilityAbbreviations = {
  acro: "EVENTIDE_RP_SYSTEM.Ability.Acro.abbr",
  phys: "EVENTIDE_RP_SYSTEM.Ability.Phys.abbr",
  fort: "EVENTIDE_RP_SYSTEM.Ability.Fort.abbr",
  will: "EVENTIDE_RP_SYSTEM.Ability.Will.abbr",
  wits: "EVENTIDE_RP_SYSTEM.Ability.Wits.abbr",
};

/**
 * Hidden abilities used for system mechanics.
 * @type {Object<string, string>}
 */
EVENTIDE_RP_SYSTEM.hiddenAbilities = {
  dice: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Dice.long`,
  cmax: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Cmax.long`,
  cmin: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Cmin.long`,
  fmax: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Fmax.long`,
  fmin: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Fmin.long`,
  sens: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Sens.long`,
};

/**
 * Abbreviated names for hidden abilities.
 * @type {Object<string, string>}
 */
EVENTIDE_RP_SYSTEM.hiddenAbilityAbbreviations = {
  dice: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Dice.abbr`,
  cmax: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Cmax.abbr`,
  cmin: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Cmin.abbr`,
  fmax: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Fmax.abbr`,
  fmin: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Fmin.abbr`,
  sens: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Sens.abbr`,
};

/**
 * Roll types used for system mechanics.
 * @type {Object<string, string>}
 */
EVENTIDE_RP_SYSTEM.rollTypes = {
  none: "EVENTIDE_RP_SYSTEM.RollTypes.None",
  roll: "EVENTIDE_RP_SYSTEM.RollTypes.Roll",
  flat: "EVENTIDE_RP_SYSTEM.RollTypes.Flat",
};
