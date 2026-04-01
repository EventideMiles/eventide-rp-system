// @ts-nocheck
/**
 * @fileoverview Config Service Tests
 *
 * Unit tests for the config service which contains system configuration
 * constants for abilities, roll types, class names, and other system settings.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect are available globally

// Import the config module
import { EVENTIDE_RP_SYSTEM } from '../../../../module/services/settings/config.mjs';

describe('Config Service', () => {
  describe('EVENTIDE_RP_SYSTEM', () => {
    test('should be defined as an object', () => {
      // Assert
      expect(EVENTIDE_RP_SYSTEM).toBeDefined();
      expect(typeof EVENTIDE_RP_SYSTEM).toBe('object');
    });
  });

  describe('abilities', () => {
    test('should define all ability scores', () => {
      // Assert
      expect(EVENTIDE_RP_SYSTEM.abilities).toBeDefined();
      expect(EVENTIDE_RP_SYSTEM.abilities.acro).toBe('EVENTIDE_RP_SYSTEM.Ability.Acro.long');
      expect(EVENTIDE_RP_SYSTEM.abilities.phys).toBe('EVENTIDE_RP_SYSTEM.Ability.Phys.long');
      expect(EVENTIDE_RP_SYSTEM.abilities.fort).toBe('EVENTIDE_RP_SYSTEM.Ability.Fort.long');
      expect(EVENTIDE_RP_SYSTEM.abilities.will).toBe('EVENTIDE_RP_SYSTEM.Ability.Will.long');
      expect(EVENTIDE_RP_SYSTEM.abilities.wits).toBe('EVENTIDE_RP_SYSTEM.Ability.Wits.long');
    });

    test('should have exactly 5 abilities', () => {
      // Assert
      expect(Object.keys(EVENTIDE_RP_SYSTEM.abilities)).toHaveLength(5);
    });
  });

  describe('abilityAbbreviations', () => {
    test('should define abbreviations for all abilities', () => {
      // Assert
      expect(EVENTIDE_RP_SYSTEM.abilityAbbreviations).toBeDefined();
      expect(EVENTIDE_RP_SYSTEM.abilityAbbreviations.acro).toBe('EVENTIDE_RP_SYSTEM.Ability.Acro.abbr');
      expect(EVENTIDE_RP_SYSTEM.abilityAbbreviations.phys).toBe('EVENTIDE_RP_SYSTEM.Ability.Phys.abbr');
      expect(EVENTIDE_RP_SYSTEM.abilityAbbreviations.fort).toBe('EVENTIDE_RP_SYSTEM.Ability.Fort.abbr');
      expect(EVENTIDE_RP_SYSTEM.abilityAbbreviations.will).toBe('EVENTIDE_RP_SYSTEM.Ability.Will.abbr');
      expect(EVENTIDE_RP_SYSTEM.abilityAbbreviations.wits).toBe('EVENTIDE_RP_SYSTEM.Ability.Wits.abbr');
    });

    test('should have exactly 5 ability abbreviations', () => {
      // Assert
      expect(Object.keys(EVENTIDE_RP_SYSTEM.abilityAbbreviations)).toHaveLength(5);
    });
  });

  describe('hiddenAbilities', () => {
    test('should define all hidden abilities', () => {
      // Assert
      expect(EVENTIDE_RP_SYSTEM.hiddenAbilities).toBeDefined();
      expect(EVENTIDE_RP_SYSTEM.hiddenAbilities.dice).toBe('EVENTIDE_RP_SYSTEM.HiddenAbilities.Dice.long');
      expect(EVENTIDE_RP_SYSTEM.hiddenAbilities.cmax).toBe('EVENTIDE_RP_SYSTEM.HiddenAbilities.Cmax.long');
      expect(EVENTIDE_RP_SYSTEM.hiddenAbilities.cmin).toBe('EVENTIDE_RP_SYSTEM.HiddenAbilities.Cmin.long');
      expect(EVENTIDE_RP_SYSTEM.hiddenAbilities.fmax).toBe('EVENTIDE_RP_SYSTEM.HiddenAbilities.Fmax.long');
      expect(EVENTIDE_RP_SYSTEM.hiddenAbilities.fmin).toBe('EVENTIDE_RP_SYSTEM.HiddenAbilities.Fmin.long');
      expect(EVENTIDE_RP_SYSTEM.hiddenAbilities.vuln).toBe('EVENTIDE_RP_SYSTEM.HiddenAbilities.Vuln.long');
      expect(EVENTIDE_RP_SYSTEM.hiddenAbilities.powerMult).toBe('EVENTIDE_RP_SYSTEM.HiddenAbilities.PowerMult.long');
      expect(EVENTIDE_RP_SYSTEM.hiddenAbilities.resolveMult).toBe('EVENTIDE_RP_SYSTEM.HiddenAbilities.ResolveMult.long');
    });

    test('should have exactly 8 hidden abilities', () => {
      // Assert
      expect(Object.keys(EVENTIDE_RP_SYSTEM.hiddenAbilities)).toHaveLength(8);
    });
  });

  describe('overrideAbilities', () => {
    test('should define override abilities', () => {
      // Assert
      expect(EVENTIDE_RP_SYSTEM.overrideAbilities).toBeDefined();
      expect(EVENTIDE_RP_SYSTEM.overrideAbilities.powerOverride).toBe('EVENTIDE_RP_SYSTEM.HiddenAbilities.PowerOverride.long');
      expect(EVENTIDE_RP_SYSTEM.overrideAbilities.resolveOverride).toBe('EVENTIDE_RP_SYSTEM.HiddenAbilities.ResolveOverride.long');
    });

    test('should have exactly 2 override abilities', () => {
      // Assert
      expect(Object.keys(EVENTIDE_RP_SYSTEM.overrideAbilities)).toHaveLength(2);
    });
  });

  describe('hiddenAbilityAbbreviations', () => {
    test('should define abbreviations for all hidden abilities', () => {
      // Assert
      expect(EVENTIDE_RP_SYSTEM.hiddenAbilityAbbreviations).toBeDefined();
      expect(EVENTIDE_RP_SYSTEM.hiddenAbilityAbbreviations.dice).toBe('EVENTIDE_RP_SYSTEM.HiddenAbilities.Dice.abbr');
      expect(EVENTIDE_RP_SYSTEM.hiddenAbilityAbbreviations.cmax).toBe('EVENTIDE_RP_SYSTEM.HiddenAbilities.Cmax.abbr');
      expect(EVENTIDE_RP_SYSTEM.hiddenAbilityAbbreviations.cmin).toBe('EVENTIDE_RP_SYSTEM.HiddenAbilities.Cmin.abbr');
      expect(EVENTIDE_RP_SYSTEM.hiddenAbilityAbbreviations.fmax).toBe('EVENTIDE_RP_SYSTEM.HiddenAbilities.Fmax.abbr');
      expect(EVENTIDE_RP_SYSTEM.hiddenAbilityAbbreviations.fmin).toBe('EVENTIDE_RP_SYSTEM.HiddenAbilities.Fmin.abbr');
      expect(EVENTIDE_RP_SYSTEM.hiddenAbilityAbbreviations.vuln).toBe('EVENTIDE_RP_SYSTEM.HiddenAbilities.Vuln.abbr');
      expect(EVENTIDE_RP_SYSTEM.hiddenAbilityAbbreviations.powerMult).toBe('EVENTIDE_RP_SYSTEM.HiddenAbilities.PowerMult.abbr');
      expect(EVENTIDE_RP_SYSTEM.hiddenAbilityAbbreviations.resolveMult).toBe('EVENTIDE_RP_SYSTEM.HiddenAbilities.ResolveMult.abbr');
    });

    test('should have exactly 8 hidden ability abbreviations', () => {
      // Assert
      expect(Object.keys(EVENTIDE_RP_SYSTEM.hiddenAbilityAbbreviations)).toHaveLength(8);
    });
  });

  describe('overrideAbilityAbbreviations', () => {
    test('should define abbreviations for override abilities', () => {
      // Assert
      expect(EVENTIDE_RP_SYSTEM.overrideAbilityAbbreviations).toBeDefined();
      expect(EVENTIDE_RP_SYSTEM.overrideAbilityAbbreviations.powerOverride).toBe('EVENTIDE_RP_SYSTEM.HiddenAbilities.PowerOverride.abbr');
      expect(EVENTIDE_RP_SYSTEM.overrideAbilityAbbreviations.resolveOverride).toBe('EVENTIDE_RP_SYSTEM.HiddenAbilities.ResolveOverride.abbr');
    });

    test('should have exactly 2 override ability abbreviations', () => {
      // Assert
      expect(Object.keys(EVENTIDE_RP_SYSTEM.overrideAbilityAbbreviations)).toHaveLength(2);
    });
  });

  describe('rollTypes', () => {
    test('should define all roll types', () => {
      // Assert
      expect(EVENTIDE_RP_SYSTEM.rollTypes).toBeDefined();
      expect(EVENTIDE_RP_SYSTEM.rollTypes.none).toBe('EVENTIDE_RP_SYSTEM.RollTypes.None');
      expect(EVENTIDE_RP_SYSTEM.rollTypes.roll).toBe('EVENTIDE_RP_SYSTEM.RollTypes.Roll');
      expect(EVENTIDE_RP_SYSTEM.rollTypes.flat).toBe('EVENTIDE_RP_SYSTEM.RollTypes.Flat');
      expect(EVENTIDE_RP_SYSTEM.rollTypes.mixedRoll).toBe('EVENTIDE_RP_SYSTEM.RollTypes.MixedRoll');
    });

    test('should have exactly 4 roll types', () => {
      // Assert
      expect(Object.keys(EVENTIDE_RP_SYSTEM.rollTypes)).toHaveLength(4);
    });
  });

  describe('classNames', () => {
    test('should define all class names', () => {
      // Assert
      expect(EVENTIDE_RP_SYSTEM.classNames).toBeDefined();
      expect(EVENTIDE_RP_SYSTEM.classNames.weapon).toBe('EVENTIDE_RP_SYSTEM.ClassNames.Weapon');
      expect(EVENTIDE_RP_SYSTEM.classNames.armor).toBe('EVENTIDE_RP_SYSTEM.ClassNames.Armor');
      expect(EVENTIDE_RP_SYSTEM.classNames.tool).toBe('EVENTIDE_RP_SYSTEM.ClassNames.Tool');
      expect(EVENTIDE_RP_SYSTEM.classNames.spell).toBe('EVENTIDE_RP_SYSTEM.ClassNames.Spell');
      expect(EVENTIDE_RP_SYSTEM.classNames.other).toBe('EVENTIDE_RP_SYSTEM.ClassNames.Other');
    });

    test('should have exactly 5 class names', () => {
      // Assert
      expect(Object.keys(EVENTIDE_RP_SYSTEM.classNames)).toHaveLength(5);
    });
  });

  describe('ability key consistency', () => {
    test('should have matching keys between abilities and abbreviations', () => {
      // Assert
      const abilityKeys = Object.keys(EVENTIDE_RP_SYSTEM.abilities);
      const abbrKeys = Object.keys(EVENTIDE_RP_SYSTEM.abilityAbbreviations);
      expect(abilityKeys).toEqual(abbrKeys);
    });

    test('should have matching keys between hiddenAbilities and abbreviations', () => {
      // Assert
      const hiddenKeys = Object.keys(EVENTIDE_RP_SYSTEM.hiddenAbilities);
      const hiddenAbbrKeys = Object.keys(EVENTIDE_RP_SYSTEM.hiddenAbilityAbbreviations);
      expect(hiddenKeys).toEqual(hiddenAbbrKeys);
    });

    test('should have matching keys between overrideAbilities and abbreviations', () => {
      // Assert
      const overrideKeys = Object.keys(EVENTIDE_RP_SYSTEM.overrideAbilities);
      const overrideAbbrKeys = Object.keys(EVENTIDE_RP_SYSTEM.overrideAbilityAbbreviations);
      expect(overrideKeys).toEqual(overrideAbbrKeys);
    });
  });

  describe('value format consistency', () => {
    test('should use consistent i18n key format for abilities', () => {
      // Assert
      Object.values(EVENTIDE_RP_SYSTEM.abilities).forEach((value) => {
        expect(value).toMatch(/^EVENTIDE_RP_SYSTEM\.Ability\.\w+\.long$/);
      });
    });

    test('should use consistent i18n key format for ability abbreviations', () => {
      // Assert
      Object.values(EVENTIDE_RP_SYSTEM.abilityAbbreviations).forEach((value) => {
        expect(value).toMatch(/^EVENTIDE_RP_SYSTEM\.Ability\.\w+\.abbr$/);
      });
    });

    test('should use consistent i18n key format for hidden abilities', () => {
      // Assert
      Object.values(EVENTIDE_RP_SYSTEM.hiddenAbilities).forEach((value) => {
        expect(value).toMatch(/^EVENTIDE_RP_SYSTEM\.HiddenAbilities\.\w+\.long$/);
      });
    });

    test('should use consistent i18n key format for hidden ability abbreviations', () => {
      // Assert
      Object.values(EVENTIDE_RP_SYSTEM.hiddenAbilityAbbreviations).forEach((value) => {
        expect(value).toMatch(/^EVENTIDE_RP_SYSTEM\.HiddenAbilities\.\w+\.abbr$/);
      });
    });

    test('should use consistent i18n key format for class names', () => {
      // Assert
      Object.values(EVENTIDE_RP_SYSTEM.classNames).forEach((value) => {
        expect(value).toMatch(/^EVENTIDE_RP_SYSTEM\.ClassNames\.\w+$/);
      });
    });
  });
});
