/**
 * System configuration constants for the Eventide RP System
 * @module services/settings/config
 */

/**
 * System-specific configuration constants.
 * This object contains all the configuration constants used by the system.
 *
 * @const {Object}
 */
export const EVENTIDE_RP_SYSTEM = {};

/**
 * The set of Ability Scores used within the system.
 * These are used for character attributes and skill checks.
 *
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
 * Used in places where space is limited.
 *
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
 * These represent underlying game mechanics that aren't directly visible to players.
 *
 * @type {Object<string, string>}
 */
EVENTIDE_RP_SYSTEM.hiddenAbilities = {
  dice: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Dice.long`,
  cmax: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Cmax.long`,
  cmin: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Cmin.long`,
  fmax: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Fmax.long`,
  fmin: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Fmin.long`,
  vuln: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Vuln.long`,
};

/**
 * Abbreviated names for hidden abilities.
 * Used in places where space is limited.
 *
 * @type {Object<string, string>}
 */
EVENTIDE_RP_SYSTEM.hiddenAbilityAbbreviations = {
  dice: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Dice.abbr`,
  cmax: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Cmax.abbr`,
  cmin: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Cmin.abbr`,
  fmax: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Fmax.abbr`,
  fmin: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Fmin.abbr`,
  vuln: `EVENTIDE_RP_SYSTEM.HiddenAbilities.Vuln.abbr`,
};

/**
 * Roll types used for system mechanics.
 * These define how rolls are handled by the system.
 *
 * @type {Object<string, string>}
 */
EVENTIDE_RP_SYSTEM.rollTypes = {
  none: "EVENTIDE_RP_SYSTEM.RollTypes.None",
  roll: "EVENTIDE_RP_SYSTEM.RollTypes.Roll",
  flat: "EVENTIDE_RP_SYSTEM.RollTypes.Flat",
  mixedRoll: "EVENTIDE_RP_SYSTEM.RollTypes.MixedRoll",
};

/**
 * Class names for items in the system.
 * These define the different categories of items that can be created.
 *
 * @type {Object<string, string>}
 */
EVENTIDE_RP_SYSTEM.classNames = {
  weapon: "EVENTIDE_RP_SYSTEM.ClassNames.Weapon",
  armor: "EVENTIDE_RP_SYSTEM.ClassNames.Armor",
  tool: "EVENTIDE_RP_SYSTEM.ClassNames.Tool",
  spell: "EVENTIDE_RP_SYSTEM.ClassNames.Spell",
  other: "EVENTIDE_RP_SYSTEM.ClassNames.Other",
};
