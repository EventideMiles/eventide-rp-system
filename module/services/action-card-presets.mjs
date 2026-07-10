/**
 * Action Card Preset Library Service
 *
 * Provides preset configurations for the action card creation macro.
 * Each preset defines a common action card pattern with default system data
 * and key fields that drive the dynamic form in the preset picker dialog.
 *
 * Follows the same pattern as module/helpers/theme/theme-presets.mjs.
 *
 * @module ActionCardPresets
 */

import { DefaultDataFactory } from "./default-data-factory.mjs";
import { Logger } from "./logger.mjs";

// =================================
// Choice Sets
// =================================

/**
 * Available ability stat keys
 * @type {string[]}
 * @private
 */
const STAT_CHOICES = ["acro", "phys", "fort", "will", "wits"];

/**
 * Available damage type choices
 * @type {string[]}
 * @private
 */
const DAMAGE_TYPE_CHOICES = ["damage", "heal"];

/**
 * Available condition choices for attack chain and status conditions
 * @type {string[]}
 * @private
 */
const CONDITION_CHOICES = [
  "never",
  "oneSuccess",
  "twoSuccesses",
  "rollValue",
  "rollUnderValue",
  "rollEven",
  "rollOdd",
  "rollOnValue",
  "zeroSuccesses",
  "always",
  "criticalSuccess",
  "criticalFailure",
];

/**
 * Maps choice set names to their value arrays
 * Used by select fields to resolve their options
 * @type {Object<string, string[]>}
 */
export const CHOICE_SETS = {
  STATS: STAT_CHOICES,
  DAMAGE_TYPE: DAMAGE_TYPE_CHOICES,
  CONDITION: CONDITION_CHOICES,
};

// =================================
// Display Order
// =================================

/**
 * Preset IDs in display order for the preset picker dialog
 * @type {string[]}
 */
const PRESET_DISPLAY_ORDER = [
  "basicAttack",
  "damageAndStatus",
  "spellWithStatus",
  "healingSpell",
  "multiHitAttack",
  "multiHitStatus",
  "defensiveBuff",
  "transformationTrigger",
  "critFishing",
  "directDamage",
];

// =================================
// Key Field Definitions
// =================================

/**
 * Shared key field descriptors referenced by multiple presets
 * @type {Object<string, Object>}
 * @private
 */
const KEY_FIELDS = {
  name: {
    path: "name",
    type: "text",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.Fields.Name",
    choices: null,
    default: "",
  },
  firstStat: {
    path: "system.attackChain.firstStat",
    type: "select",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.Fields.FirstStat",
    choices: "STATS",
    default: "acro",
  },
  secondStat: {
    path: "system.attackChain.secondStat",
    type: "select",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.Fields.SecondStat",
    choices: "STATS",
    default: "phys",
  },
  damageFormula: {
    path: "system.attackChain.damageFormula",
    type: "text",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.Fields.DamageFormula",
    choices: null,
    default: "1d6",
  },
  savedDamageFormula: {
    path: "system.savedDamage.formula",
    type: "text",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.Fields.SavedDamageFormula",
    choices: null,
    default: "2d6",
  },
  savedDamageType: {
    path: "system.savedDamage.type",
    type: "select",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.Fields.SavedDamageType",
    choices: "DAMAGE_TYPE",
    default: "damage",
  },
  damageType: {
    path: "system.attackChain.damageType",
    type: "select",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.Fields.DamageType",
    choices: "DAMAGE_TYPE",
    default: "damage",
  },
  advanceInitiative: {
    path: "system.advanceInitiative",
    type: "checkbox",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.Fields.AdvanceInitiative",
    hint: "EVENTIDE_RP_SYSTEM.ActionCardPresets.Fields.AdvanceInitiativeHint",
    choices: null,
    default: false,
  },
  selfTarget: {
    path: "system.selfTarget",
    type: "checkbox",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.Fields.SelfTarget",
    hint: "EVENTIDE_RP_SYSTEM.ActionCardPresets.Fields.SelfTargetHint",
    choices: null,
    default: true,
  },
  statusApplicationLimit: {
    path: "system.statusApplicationLimit",
    type: "number",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.Fields.StatusApplicationLimit",
    hint: "EVENTIDE_RP_SYSTEM.ActionCardPresets.Fields.StatusApplicationLimitHint",
    choices: null,
    default: 1,
  },
  repetitions: {
    path: "system.repetitions",
    type: "text",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.Fields.Repetitions",
    hint: "EVENTIDE_RP_SYSTEM.ActionCardPresets.Fields.RepetitionsHint",
    choices: null,
    default: "1d4",
  },
  selfEffectsCondition: {
    path: "system.selfEffectsConfig.condition",
    type: "select",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.Fields.SelfEffectsCondition",
    choices: "CONDITION",
    default: "oneSuccess",
  },
  transformationCondition: {
    path: "system.transformationConfig.condition",
    type: "select",
    label:
      "EVENTIDE_RP_SYSTEM.ActionCardPresets.Fields.TransformationCondition",
    choices: "CONDITION",
    default: "oneSuccess",
  },
};

// =================================
// Preset Definitions
// =================================

/**
 * Action card preset configurations
 *
 * Each preset defines:
 * - id: Machine key for the preset
 * - label: i18n key for display name
 * - description: i18n key for description
 * - icon: FontAwesome icon class
 * - systemData: Partial system data to deep-merge onto defaults
 * - keyFields: Array of field descriptors for the preset picker dialog
 *
 * @type {Object<string, Object>}
 */
export const ACTION_CARD_PRESETS = {
  /**
   * Basic Attack - One stat pair, oneSuccess damage, no effects
   */
  basicAttack: {
    id: "basicAttack",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.BasicAttack.Label",
    description: "EVENTIDE_RP_SYSTEM.ActionCardPresets.BasicAttack.Description",
    icon: "fas fa-sword",
    systemData: {
      mode: "attackChain",
      attackChain: {
        firstStat: "acro",
        secondStat: "phys",
        damageCondition: "oneSuccess",
        damageFormula: "1d6",
        damageType: "damage",
        statusCondition: "never",
      },
      advanceInitiative: false,
    },
    keyFields: [
      KEY_FIELDS.name,
      KEY_FIELDS.firstStat,
      KEY_FIELDS.secondStat,
      KEY_FIELDS.damageFormula,
      KEY_FIELDS.advanceInitiative,
    ],
  },

  /**
   * Damage and Status - Physical attack that also applies a status (most common pattern)
   */
  damageAndStatus: {
    id: "damageAndStatus",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.DamageAndStatus.Label",
    description:
      "EVENTIDE_RP_SYSTEM.ActionCardPresets.DamageAndStatus.Description",
    icon: "fas fa-skull-crossbones",
    systemData: {
      mode: "attackChain",
      attackChain: {
        firstStat: "acro",
        secondStat: "phys",
        damageCondition: "oneSuccess",
        damageFormula: "1d6",
        damageType: "damage",
        statusCondition: "oneSuccess",
      },
      statusApplicationLimit: 1,
      advanceInitiative: false,
      enforceStatusChoice: false,
    },
    keyFields: [
      KEY_FIELDS.name,
      KEY_FIELDS.firstStat,
      KEY_FIELDS.secondStat,
      KEY_FIELDS.damageFormula,
      KEY_FIELDS.damageType,
      KEY_FIELDS.statusApplicationLimit,
      KEY_FIELDS.advanceInitiative,
    ],
  },

  /**
   * Spell with Status - Caster pattern with status rider
   */
  spellWithStatus: {
    id: "spellWithStatus",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.SpellWithStatus.Label",
    description:
      "EVENTIDE_RP_SYSTEM.ActionCardPresets.SpellWithStatus.Description",
    icon: "fas fa-hat-wizard",
    systemData: {
      mode: "attackChain",
      attackChain: {
        firstStat: "wits",
        secondStat: "will",
        damageCondition: "oneSuccess",
        damageFormula: "1d6",
        damageType: "damage",
        statusCondition: "oneSuccess",
      },
      statusApplicationLimit: 1,
      advanceInitiative: false,
      enforceStatusChoice: false,
    },
    keyFields: [
      KEY_FIELDS.name,
      KEY_FIELDS.firstStat,
      KEY_FIELDS.secondStat,
      KEY_FIELDS.damageFormula,
      KEY_FIELDS.damageType,
      KEY_FIELDS.statusApplicationLimit,
      KEY_FIELDS.advanceInitiative,
    ],
  },

  /**
   * Healing Spell - Self-targeting heal (savedDamage mode)
   */
  healingSpell: {
    id: "healingSpell",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.HealingSpell.Label",
    description:
      "EVENTIDE_RP_SYSTEM.ActionCardPresets.HealingSpell.Description",
    icon: "fas fa-heart",
    systemData: {
      mode: "savedDamage",
      savedDamage: {
        formula: "2d6",
        type: "heal",
      },
      selfTarget: true,
      advanceInitiative: false,
    },
    keyFields: [
      KEY_FIELDS.name,
      KEY_FIELDS.savedDamageFormula,
      KEY_FIELDS.savedDamageType,
      KEY_FIELDS.selfTarget,
      KEY_FIELDS.advanceInitiative,
    ],
  },

  /**
   * Multi-Hit Attack - Repetitions enabled, repeatToHit on
   */
  multiHitAttack: {
    id: "multiHitAttack",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.MultiHitAttack.Label",
    description:
      "EVENTIDE_RP_SYSTEM.ActionCardPresets.MultiHitAttack.Description",
    icon: "fas fa-burst",
    systemData: {
      mode: "attackChain",
      attackChain: {
        firstStat: "acro",
        secondStat: "phys",
        damageCondition: "oneSuccess",
        damageFormula: "1d6",
        damageType: "damage",
        statusCondition: "oneSuccess",
      },
      repetitions: "1d4",
      repeatToHit: true,
      damageApplication: true,
      statusApplicationLimit: 1,
      advanceInitiative: false,
    },
    keyFields: [
      KEY_FIELDS.name,
      KEY_FIELDS.firstStat,
      KEY_FIELDS.secondStat,
      KEY_FIELDS.damageFormula,
      KEY_FIELDS.repetitions,
      KEY_FIELDS.statusApplicationLimit,
      KEY_FIELDS.advanceInitiative,
    ],
  },

  /**
   * Multi-Hit Status - Multi-hit with status application (common NPC pattern like poison ticks)
   */
  multiHitStatus: {
    id: "multiHitStatus",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.MultiHitStatus.Label",
    description:
      "EVENTIDE_RP_SYSTEM.ActionCardPresets.MultiHitStatus.Description",
    icon: "fas fa-biohazard",
    systemData: {
      mode: "attackChain",
      attackChain: {
        firstStat: "acro",
        secondStat: "phys",
        damageCondition: "oneSuccess",
        damageFormula: "1d4",
        damageType: "damage",
        statusCondition: "oneSuccess",
      },
      repetitions: "1d4",
      repeatToHit: true,
      damageApplication: true,
      advanceInitiative: false,
      enforceStatusChoice: false,
    },
    keyFields: [
      KEY_FIELDS.name,
      KEY_FIELDS.firstStat,
      KEY_FIELDS.secondStat,
      KEY_FIELDS.damageFormula,
      KEY_FIELDS.repetitions,
      KEY_FIELDS.damageType,
      KEY_FIELDS.statusApplicationLimit,
      KEY_FIELDS.advanceInitiative,
    ],
  },

  /**
   * Defensive Buff - No damage, self-effects only
   */
  defensiveBuff: {
    id: "defensiveBuff",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.DefensiveBuff.Label",
    description:
      "EVENTIDE_RP_SYSTEM.ActionCardPresets.DefensiveBuff.Description",
    icon: "fas fa-shield-halved",
    systemData: {
      mode: "attackChain",
      attackChain: {
        firstStat: "fort",
        secondStat: "will",
        damageCondition: "never",
        damageFormula: "0",
        damageType: "damage",
        statusCondition: "never",
      },
      selfEffectsConfig: {
        condition: "oneSuccess",
        threshold: 15,
      },
      selfTarget: true,
      advanceInitiative: false,
    },
    keyFields: [
      KEY_FIELDS.name,
      KEY_FIELDS.firstStat,
      KEY_FIELDS.secondStat,
      KEY_FIELDS.selfEffectsCondition,
      KEY_FIELDS.advanceInitiative,
    ],
  },

  /**
   * Transformation Trigger - Triggers transformation, no damage
   */
  transformationTrigger: {
    id: "transformationTrigger",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.TransformationTrigger.Label",
    description:
      "EVENTIDE_RP_SYSTEM.ActionCardPresets.TransformationTrigger.Description",
    icon: "fas fa-mask",
    systemData: {
      mode: "attackChain",
      attackChain: {
        firstStat: "acro",
        secondStat: "phys",
        damageCondition: "never",
        damageFormula: "0",
        damageType: "damage",
        statusCondition: "never",
      },
      transformationConfig: {
        condition: "oneSuccess",
        threshold: 15,
      },
      advanceInitiative: false,
    },
    keyFields: [
      KEY_FIELDS.name,
      KEY_FIELDS.firstStat,
      KEY_FIELDS.secondStat,
      KEY_FIELDS.transformationCondition,
      KEY_FIELDS.advanceInitiative,
    ],
  },

  /**
   * Crit Fishing - criticalSuccess damage only
   */
  critFishing: {
    id: "critFishing",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.CritFishing.Label",
    description: "EVENTIDE_RP_SYSTEM.ActionCardPresets.CritFishing.Description",
    icon: "fas fa-dice-d20",
    systemData: {
      mode: "attackChain",
      attackChain: {
        firstStat: "acro",
        secondStat: "phys",
        damageCondition: "criticalSuccess",
        damageFormula: "3d6",
        damageType: "damage",
        statusCondition: "never",
      },
      advanceInitiative: false,
    },
    keyFields: [
      KEY_FIELDS.name,
      KEY_FIELDS.firstStat,
      KEY_FIELDS.secondStat,
      KEY_FIELDS.damageFormula,
      KEY_FIELDS.advanceInitiative,
    ],
  },

  /**
   * Direct Damage - Flat damage, no attack roll (savedDamage mode)
   */
  directDamage: {
    id: "directDamage",
    label: "EVENTIDE_RP_SYSTEM.ActionCardPresets.DirectDamage.Label",
    description:
      "EVENTIDE_RP_SYSTEM.ActionCardPresets.DirectDamage.Description",
    icon: "fas fa-fire",
    systemData: {
      mode: "savedDamage",
      savedDamage: {
        formula: "2d6",
        type: "damage",
      },
      advanceInitiative: false,
    },
    keyFields: [
      KEY_FIELDS.name,
      KEY_FIELDS.savedDamageFormula,
      KEY_FIELDS.savedDamageType,
      KEY_FIELDS.advanceInitiative,
    ],
  },
};

// =================================
// Public API
// =================================

/**
 * Get a preset by ID
 *
 * @param {string} presetId - The preset ID to look up
 * @returns {Object|null} The preset configuration, or null if not found
 */
export const getActionCardPreset = (presetId) => {
  return ACTION_CARD_PRESETS[presetId] || null;
};

/**
 * Get all preset IDs in display order
 *
 * @returns {string[]} Array of preset IDs in the intended display order
 */
export const getPresetIds = () => PRESET_DISPLAY_ORDER;

/**
 * Get the key fields for a preset
 *
 * Returns the array of field descriptors that drive the dynamic form
 * in the preset picker dialog for the given preset.
 *
 * @param {string} presetId - The preset ID to get key fields for
 * @returns {Object[]|null} Array of key field descriptors, or null if preset not found
 */
export const getPresetKeyFields = (presetId) => {
  const preset = getActionCardPreset(presetId);
  if (!preset) {
    Logger.warn(
      `Action card preset not found: ${presetId}`,
      {},
      "ACTION_CARD_PRESETS",
    );
    return null;
  }
  return preset.keyFields;
};

/**
 * Deep-merge preset data onto default data, applying user overrides
 *
 * The merge order is:
 * 1. Start with the full default system data from DefaultDataFactory.getSystemData("actionCard")
 * 2. Add attackChain defaults from DefaultDataFactory.getDefaultAttackChainData()
 * 3. Add savedDamage defaults: { formula: "1d6", type: "damage" }
 * 4. Deep-merge the preset's systemData on top
 * 5. Deep-merge the user's overrides on top
 *
 * @param {string} presetId - The preset ID to merge
 * @param {Object} [userOverrides={}] - Optional user overrides to merge on top
 * @returns {Object|null} The complete merged system data object, or null if preset not found
 */
export const mergePresetData = (presetId, userOverrides = {}) => {
  const preset = getActionCardPreset(presetId);
  if (!preset) {
    Logger.warn(
      `Cannot merge preset data: preset not found with ID "${presetId}"`,
      {},
      "ACTION_CARD_PRESETS",
    );
    return null;
  }

  // Step 1: Base system defaults from DefaultDataFactory
  const baseSystemData = DefaultDataFactory.getSystemData("actionCard");

  // Step 2: Add attackChain defaults
  const attackChainDefaults = DefaultDataFactory.getDefaultAttackChainData();

  // Step 3: Add savedDamage defaults
  const savedDamageDefaults = {
    formula: "1d6",
    type: "damage",
    powerFormula: "0",
    powerType: "damage",
  };

  // Build the full defaults by merging layers
  const merged = foundry.utils.mergeObject(
    {},
    {
      ...baseSystemData,
      attackChain: attackChainDefaults,
      savedDamage: savedDamageDefaults,
    },
    { inplace: false },
  );

  // Step 4: Deep-merge preset systemData on top
  foundry.utils.mergeObject(merged, preset.systemData, { inplace: true });

  // Step 5: Deep-merge user overrides on top
  foundry.utils.mergeObject(merged, userOverrides, { inplace: true });

  return merged;
};
