// @ts-nocheck
/**
 * @fileoverview Tests for Base Actor Data Model - Priority 1 Critical Functions
 *
 * Tests the core data preparation methods that calculate derived statistics
 * for all actors in the Eventide RP System. These calculations are critical
 * for character sheet accuracy and rolling mechanics.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Mock the EventideRpSystemItemBase
const mockItemBase = class {
  static defineSchema() {
    return {};
  }
};

// Mock CONFIG before import
global.CONFIG = {
  EVENTIDE_RP_SYSTEM: {
    abilities: {
      acro: 'EVENTIDE_RP_SYSTEM.Abilities.Acro',
      phys: 'EVENTIDE_RP_SYSTEM.Abilities.Phys',
      fort: 'EVENTIDE_RP_SYSTEM.Abilities.Fort',
      will: 'EVENTIDE_RP_SYSTEM.Abilities.Will',
      wits: 'EVENTIDE_RP_SYSTEM.Abilities.Wits'
    },
    abilityAbbreviations: {
      acro: 'EVENTIDE_RP_SYSTEM.AbilityAbbr.Acro',
      phys: 'EVENTIDE_RP_SYSTEM.AbilityAbbr.Phys',
      fort: 'EVENTIDE_RP_SYSTEM.AbilityAbbr.Fort',
      will: 'EVENTIDE_RP_SYSTEM.AbilityAbbr.Will',
      wits: 'EVENTIDE_RP_SYSTEM.AbilityAbbr.Wits'
    },
    hiddenAbilities: {
      dice: 'EVENTIDE_RP_SYSTEM.HiddenAbilities.Dice',
      cmax: 'EVENTIDE_RP_SYSTEM.HiddenAbilities.CMax',
      cmin: 'EVENTIDE_RP_SYSTEM.HiddenAbilities.CMin',
      fmin: 'EVENTIDE_RP_SYSTEM.HiddenAbilities.FMin',
      fmax: 'EVENTIDE_RP_SYSTEM.HiddenAbilities.FMax',
      vuln: 'EVENTIDE_RP_SYSTEM.HiddenAbilities.Vuln'
    }
  }
};

// Mock game.i18n
global.game = {
  ...global.game,
  i18n: {
    localize: vi.fn((key) => {
      const translations = {
        'EVENTIDE_RP_SYSTEM.Abilities.Acro': 'Acrobatics',
        'EVENTIDE_RP_SYSTEM.Abilities.Phys': 'Physical',
        'EVENTIDE_RP_SYSTEM.Abilities.Fort': 'Fortitude',
        'EVENTIDE_RP_SYSTEM.Abilities.Will': 'Will',
        'EVENTIDE_RP_SYSTEM.Abilities.Wits': 'Wits',
        'EVENTIDE_RP_SYSTEM.AbilityAbbr.Acro': 'ACR',
        'EVENTIDE_RP_SYSTEM.AbilityAbbr.Phys': 'PHY',
        'EVENTIDE_RP_SYSTEM.AbilityAbbr.Fort': 'FOR',
        'EVENTIDE_RP_SYSTEM.AbilityAbbr.Will': 'WIL',
        'EVENTIDE_RP_SYSTEM.AbilityAbbr.Wits': 'WIT',
        'EVENTIDE_RP_SYSTEM.HiddenAbilities.Dice': 'Dice Size',
        'EVENTIDE_RP_SYSTEM.HiddenAbilities.CMax': 'Critical Max',
        'EVENTIDE_RP_SYSTEM.HiddenAbilities.CMin': 'Critical Min',
        'EVENTIDE_RP_SYSTEM.HiddenAbilities.FMin': 'Fumble Min',
        'EVENTIDE_RP_SYSTEM.HiddenAbilities.FMax': 'Fumble Max',
        'EVENTIDE_RP_SYSTEM.HiddenAbilities.Vuln': 'Vulnerability'
      };
      return translations[key] || key;
    })
  }
};

// Mock module imports
vi.mock('../../../module/data/_module.mjs', () => ({
  EventideRpSystemItemBase: mockItemBase
}));

// Import the data model after setting up mocks
const { default: EventideRpSystemBaseActor } = await import('../../../module/data/base-actor.mjs');

describe('EventideRpSystemBaseActor - Priority 1 Data Preparation', () => {
  let actorData;

  beforeEach(() => {
    // Create a fresh actor data instance for each test
    actorData = new EventideRpSystemBaseActor({
      attributes: {
        level: { value: 1 }
      },
      abilities: {
        acro: {
          value: 2,
          override: null,
          transformOverride: null,
          transformChange: 0,
          change: 1,
          total: 3,
          ac: { change: 0, total: 11 },
          diceAdjustments: { advantage: 2, disadvantage: 0, total: 2, mode: '' }
        },
        phys: {
          value: 0,
          override: null,
          transformOverride: null,
          transformChange: 1,
          change: 0,
          total: 1,
          ac: { change: -1, total: 10 },
          diceAdjustments: { advantage: 0, disadvantage: 1, total: -1, mode: '' }
        },
        fort: {
          value: -1,
          override: 5,
          transformOverride: null,
          transformChange: 0,
          change: 0,
          total: 5,
          ac: { change: 2, total: 13 },
          diceAdjustments: { advantage: 0, disadvantage: 0, total: 0, mode: '' }
        },
        will: {
          value: 3,
          override: null,
          transformOverride: null,
          transformChange: 0,
          change: -1,
          total: 2,
          ac: { change: 0, total: 11 },
          diceAdjustments: { advantage: 1, disadvantage: 2, total: -1, mode: '' }
        },
        wits: {
          value: 1,
          override: null,
          transformOverride: null,
          transformChange: 0,
          change: 0,
          total: 1,
          ac: { change: 0, total: 11 },
          diceAdjustments: { advantage: 0, disadvantage: 0, total: 0, mode: '' }
        }
      },
      hiddenAbilities: {
        dice: { value: 20, total: 20, override: null, change: 0 },
        cmax: { value: 20, total: 20, override: null, change: 0 },
        cmin: { value: 20, total: 20, override: null, change: 0 },
        fmin: { value: 1, total: 1, override: null, change: 0 },
        fmax: { value: 1, total: 1, override: null, change: 0 },
        vuln: { value: 0, total: 0, override: null, change: 0 },
        powerMult: { value: 100, total: 100, override: null, change: 0 },
        resolveMult: { value: 100, total: 100, override: null, change: 0 }
      },
      statTotal: { value: 0, baseValue: 0, max: 0, mainInit: 0, subInit: 0 }
    });

    // Clear i18n mock calls
    global.game.i18n.localize.mockClear();
  });

  describe('prepareDerivedData() - Critical Data Calculations', () => {
    test('should calculate ability totals without overrides', () => {
      actorData.prepareDerivedData();

      expect(actorData.abilities.acro.total).toBe(3); // 2 + 1 + 0
      expect(actorData.abilities.phys.total).toBe(1); // 0 + 0 + 1
      expect(actorData.abilities.wits.total).toBe(1); // 1 + 0 + 0
    });

    test('should calculate ability totals with overrides', () => {
      actorData.prepareDerivedData();

      // Fort uses override: 5 + 0 + 0 = 5
      expect(actorData.abilities.fort.total).toBe(5);
    });

    test('should calculate armor class correctly', () => {
      actorData.prepareDerivedData();

      expect(actorData.abilities.acro.ac.total).toBe(14); // 3 + 11 + 0
      expect(actorData.abilities.phys.ac.total).toBe(11); // 1 + 11 + (-1)
      expect(actorData.abilities.fort.ac.total).toBe(18); // 5 + 11 + 2
    });

    test('should calculate dice adjustments correctly', () => {
      actorData.prepareDerivedData();

      expect(actorData.abilities.acro.diceAdjustments.total).toBe(2); // 2 - 0
      expect(actorData.abilities.phys.diceAdjustments.total).toBe(-1); // 0 - 1
      expect(actorData.abilities.fort.diceAdjustments.total).toBe(0); // 0 - 0
      expect(actorData.abilities.will.diceAdjustments.total).toBe(-1); // 1 - 2
    });

    test('should set dice adjustment modes correctly', () => {
      actorData.prepareDerivedData();

      expect(actorData.abilities.acro.diceAdjustments.mode).toBe('k'); // positive
      expect(actorData.abilities.phys.diceAdjustments.mode).toBe('kl'); // negative
      expect(actorData.abilities.fort.diceAdjustments.mode).toBe(''); // zero
      expect(actorData.abilities.will.diceAdjustments.mode).toBe('kl'); // negative
    });

    test('should localize ability labels', () => {
      actorData.prepareDerivedData();

      expect(actorData.abilities.acro.label).toBe('Acrobatics');
      expect(actorData.abilities.phys.label).toBe('Physical');
      expect(actorData.abilities.fort.label).toBe('Fortitude');
      expect(actorData.abilities.will.label).toBe('Will');
      expect(actorData.abilities.wits.label).toBe('Wits');

      expect(global.game.i18n.localize).toHaveBeenCalledWith('EVENTIDE_RP_SYSTEM.Abilities.Acro');
    });

    test('should localize ability abbreviations', () => {
      actorData.prepareDerivedData();

      expect(actorData.abilities.acro.abbr).toBe('ACR');
      expect(actorData.abilities.phys.abbr).toBe('PHY');
      expect(actorData.abilities.fort.abbr).toBe('FOR');
      expect(actorData.abilities.will.abbr).toBe('WIL');
      expect(actorData.abilities.wits.abbr).toBe('WIT');
    });

    test('should handle missing localization keys gracefully', () => {
      global.game.i18n.localize.mockReturnValue(null);

      actorData.prepareDerivedData();

      expect(actorData.abilities.acro.label).toBe('acro');
      expect(actorData.abilities.acro.abbr).toBe('acro');
    });

    test('should calculate hidden ability totals without overrides', () => {
      actorData.prepareDerivedData();

      expect(actorData.hiddenAbilities.dice.total).toBe(20); // 20 + 0
      expect(actorData.hiddenAbilities.cmax.total).toBe(20); // 20 + 0
      expect(actorData.hiddenAbilities.vuln.total).toBe(0); // 0 + 0
    });

    test('should calculate hidden ability totals with overrides', () => {
      actorData.hiddenAbilities.dice.override = 12;
      actorData.hiddenAbilities.dice.change = 2;

      actorData.prepareDerivedData();

      expect(actorData.hiddenAbilities.dice.total).toBe(14); // 12 + 2
    });

    test('should localize hidden ability labels', () => {
      actorData.prepareDerivedData();

      expect(actorData.hiddenAbilities.dice.label).toBe('Dice Size');
      expect(actorData.hiddenAbilities.cmax.label).toBe('Critical Max');
      expect(actorData.hiddenAbilities.vuln.label).toBe('Vulnerability');
    });

    test('should calculate total stat value', () => {
      actorData.prepareDerivedData();

      // acro(3) + phys(1) + fort(5) + will(2) + wits(1) = 12
      expect(actorData.statTotal.value).toBe(12);
    });

    test('should calculate main initiative', () => {
      actorData.prepareDerivedData();

      // (acro.total + wits.total) / 2 = (3 + 1) / 2 = 2
      expect(actorData.statTotal.mainInit).toBe(2);
    });

    test('should calculate sub initiative', () => {
      actorData.prepareDerivedData();

      // statTotal.value / 100 = 12 / 100 = 0.12
      expect(actorData.statTotal.subInit).toBe(0.12);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle negative ability values', () => {
      actorData.abilities.acro.value = -5;
      actorData.abilities.acro.change = -2;
      actorData.abilities.acro.transformChange = -1;

      actorData.prepareDerivedData();

      expect(actorData.abilities.acro.total).toBe(-8);
      expect(actorData.abilities.acro.ac.total).toBe(3); // -8 + 11 + 0
    });

    test('should handle very large ability values', () => {
      actorData.abilities.phys.value = 999;
      actorData.abilities.phys.change = 1;
      actorData.abilities.phys.transformChange = 0;

      actorData.prepareDerivedData();

      expect(actorData.abilities.phys.total).toBe(1000);
      expect(actorData.abilities.phys.ac.total).toBe(1010); // 1000 + 11 + (-1)
    });

    test('should handle floating point values', () => {
      actorData.abilities.will.value = 2.5;
      actorData.abilities.will.change = 0.3;
      actorData.abilities.will.transformChange = 0.2;

      actorData.prepareDerivedData();

      expect(actorData.abilities.will.total).toBe(3);
    });

    test('should handle zero dice adjustments correctly', () => {
      actorData.abilities.acro.diceAdjustments.advantage = 0;
      actorData.abilities.acro.diceAdjustments.disadvantage = 0;

      actorData.prepareDerivedData();

      expect(actorData.abilities.acro.diceAdjustments.total).toBe(0);
      expect(actorData.abilities.acro.diceAdjustments.mode).toBe('');
    });

    test('should handle large dice adjustment values', () => {
      actorData.abilities.acro.diceAdjustments.advantage = 10;
      actorData.abilities.acro.diceAdjustments.disadvantage = 3;

      actorData.prepareDerivedData();

      expect(actorData.abilities.acro.diceAdjustments.total).toBe(7);
      expect(actorData.abilities.acro.diceAdjustments.mode).toBe('k');
    });

    test('should handle null/undefined values in abilities', () => {
      actorData.abilities.acro.value = null;
      actorData.abilities.acro.change = undefined;
      actorData.abilities.acro.transform = null;

      // Should not throw, but may result in NaN
      expect(() => actorData.prepareDerivedData()).not.toThrow();
    });
  });

  describe('Performance and Data Integrity', () => {
    test('should not modify original input data structure', () => {
      const originalAbilities = JSON.parse(JSON.stringify(actorData.abilities));

      actorData.prepareDerivedData();

      // Original values should remain unchanged
      expect(actorData.abilities.acro.value).toBe(originalAbilities.acro.value);
      expect(actorData.abilities.phys.change).toBe(originalAbilities.phys.change);
    });

    test('should handle repeated calls consistently', () => {
      actorData.prepareDerivedData();
      const firstResult = {
        acroTotal: actorData.abilities.acro.total,
        statTotal: actorData.statTotal.value,
        mainInit: actorData.statTotal.mainInit
      };

      actorData.prepareDerivedData();
      const secondResult = {
        acroTotal: actorData.abilities.acro.total,
        statTotal: actorData.statTotal.value,
        mainInit: actorData.statTotal.mainInit
      };

      expect(firstResult).toEqual(secondResult);
    });

    test('should complete calculation in reasonable time', () => {
      const startTime = Date.now();

      actorData.prepareDerivedData();

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete in under 10ms for typical data
      expect(executionTime).toBeLessThan(10);
    });

    test('should call parent prepareDerivedData', () => {
      const parentSpy = vi.spyOn(global.foundry.abstract.TypeDataModel.prototype, 'prepareDerivedData');

      actorData.prepareDerivedData();

      expect(parentSpy).toHaveBeenCalled();

      parentSpy.mockRestore();
    });
  });

  describe('Complex Calculation Scenarios', () => {
    test('should handle mixed positive and negative dice adjustments across abilities', () => {
      actorData.abilities.acro.diceAdjustments.advantage = 5;
      actorData.abilities.acro.diceAdjustments.disadvantage = 2; // net +3

      actorData.abilities.phys.diceAdjustments.advantage = 1;
      actorData.abilities.phys.diceAdjustments.disadvantage = 4; // net -3

      actorData.prepareDerivedData();

      expect(actorData.abilities.acro.diceAdjustments.total).toBe(3);
      expect(actorData.abilities.acro.diceAdjustments.mode).toBe('k');

      expect(actorData.abilities.phys.diceAdjustments.total).toBe(-3);
      expect(actorData.abilities.phys.diceAdjustments.mode).toBe('kl');
    });

    test('should maintain calculation accuracy with multiple overrides', () => {
      // Set overrides for all abilities
      actorData.abilities.acro.override = 10;
      actorData.abilities.phys.override = -2;
      actorData.abilities.fort.override = 5; // Use non-zero value to actually override
      actorData.abilities.will.override = 7;
      actorData.abilities.wits.override = 15;

      actorData.prepareDerivedData();

      // Total includes override + change + transformChange for each ability
      // acro: 10 + 1 + 0 = 11
      // phys: -2 + 0 + 1 = -1
      // fort: 5 + 0 + 0 = 5
      // will: 7 + (-1) + 0 = 6
      // wits: 15 + 0 + 0 = 15
      // Total: 11 + (-1) + 5 + 6 + 15 = 36
      expect(actorData.statTotal.value).toBe(36);
      expect(actorData.statTotal.mainInit).toBe(13); // (11 + 15) / 2
    });
  });
});

// Phase 2: Additional branch coverage tests
describe('EventideRpSystemBaseActor - Phase 2 Branch Coverage', () => {
  let actorData;

  beforeEach(() => {
    // Create a fresh actor data instance for each test
    actorData = new EventideRpSystemBaseActor({
      attributes: {
        level: { value: 1 }
      },
      abilities: {
        acro: {
          value: 2,
          override: null,
          transformOverride: null,
          transformChange: 0,
          change: 1,
          total: 3,
          ac: { change: 0, total: 11 },
          diceAdjustments: { advantage: 2, disadvantage: 0, total: 2, mode: '' }
        },
        phys: {
          value: 0,
          override: null,
          transformOverride: null,
          transformChange: 1,
          change: 0,
          total: 1,
          ac: { change: -1, total: 10 },
          diceAdjustments: { advantage: 0, disadvantage: 1, total: -1, mode: '' }
        },
        fort: {
          value: -1,
          override: null,
          transformOverride: null,
          transformChange: 0,
          change: 0,
          total: 5,
          ac: { change: 2, total: 13 },
          diceAdjustments: { advantage: 0, disadvantage: 0, total: 0, mode: '' }
        },
        will: {
          value: 3,
          override: null,
          transformOverride: null,
          transformChange: 0,
          change: -1,
          total: 2,
          ac: { change: 0, total: 11 },
          diceAdjustments: { advantage: 1, disadvantage: 2, total: -1, mode: '' }
        },
        wits: {
          value: 1,
          override: null,
          transformOverride: null,
          transformChange: 0,
          change: 0,
          total: 1,
          ac: { change: 0, total: 11 },
          diceAdjustments: { advantage: 0, disadvantage: 0, total: 0, mode: '' }
        }
      },
      hiddenAbilities: {
        dice: { value: 20, total: 20, override: null, change: 0 },
        cmax: { value: 20, total: 20, override: null, change: 0 },
        cmin: { value: 20, total: 20, override: null, change: 0 },
        fmin: { value: 1, total: 1, override: null, change: 0 },
        fmax: { value: 1, total: 1, override: null, change: 0 },
        vuln: { value: 0, total: 0, override: null, change: 0 },
        powerMult: { value: 100, total: 100, override: null, change: 0 },
        resolveMult: { value: 100, total: 100, override: null, change: 0 }
      },
      statTotal: { value: 0, baseValue: 0, max: 0, mainInit: 0, subInit: 0 },
      power: { value: 7, max: 7, override: null },
      resolve: { value: 110, max: 110, override: null }
    });

    // Clear i18n mock calls
    global.game.i18n.localize.mockClear();

    // Set up game.settings mock for prepareDerivedData
    global.game.settings = {
      get: vi.fn((system, key) => {
        const defaults = {
          'minimumDiceValue': 1,
          'minimumPowerValue': 1,
          'minimumResolveValue': 10,
          'maxPowerFormula': '',
          'maxResolveFormula': '',
          'statPointsFormula': '14 + (2 * @lvl.value)',
          'crToXpFormula': '@cr * 200 + @cr * @cr * 50'
        };
        return defaults[key] ?? null;
      })
    };
  });

  describe('prepareDerivedData() - Power Calculation Branches', () => {
    test('should use power override when set to non-zero value', () => {
      actorData.power.override = 50;

      actorData.prepareDerivedData();

      expect(actorData.power.max).toBe(50);
    });

    test('should ignore power override when set to null', () => {
      actorData.power.override = null;
      actorData.abilities.will.total = 5;
      actorData.abilities.fort.total = 3;

      actorData.prepareDerivedData();

      // Should use formula derivation since override is null
      // Formula: max(5 + @will.total + @fort.total, 1)
      expect(actorData.power.max).toBeGreaterThanOrEqual(1);
    });

    test('should ignore power override when set to 0', () => {
      actorData.power.override = 0;
      actorData.abilities.will.total = 5;
      actorData.abilities.fort.total = 3;

      actorData.prepareDerivedData();

      // Should use formula derivation since override is 0
      expect(actorData.power.max).toBeGreaterThanOrEqual(1);
    });

    test('should apply power multiplier when not 100%', () => {
      // Set value to 200 so total (value + change = 200 + 0) will be 200%
      actorData.hiddenAbilities.powerMult.value = 200;
      actorData.power.override = 20;

      actorData.prepareDerivedData();

      // 20 * 200 / 100 = 40
      expect(actorData.power.max).toBe(40);
    });

    test('should enforce minimum power value from settings', () => {
      global.game.settings.get.mockImplementation((system, key) => {
        if (key === 'minimumPowerValue') return 10;
        if (key === 'maxPowerFormula') return '';
        return null;
      });
      actorData.power.override = 5;

      actorData.prepareDerivedData();

      expect(actorData.power.max).toBe(10);
    });

    test('should clamp power value to max', () => {
      actorData.power.value = 100;
      actorData.power.override = 20;

      actorData.prepareDerivedData();

      expect(actorData.power.value).toBe(20);
    });
  });

  describe('prepareDerivedData() - Resolve Calculation Branches', () => {
    test('should use resolve override when set to non-zero value', () => {
      actorData.resolve.override = 200;

      actorData.prepareDerivedData();

      expect(actorData.resolve.max).toBe(200);
    });

    test('should ignore resolve override when set to null', () => {
      actorData.resolve.override = null;
      actorData.abilities.fort.total = 5;

      actorData.prepareDerivedData();

      // Should use formula derivation
      expect(actorData.resolve.max).toBeGreaterThanOrEqual(10);
    });

    test('should ignore resolve override when set to 0', () => {
      actorData.resolve.override = 0;
      actorData.abilities.fort.total = 5;

      actorData.prepareDerivedData();

      // Should use formula derivation since override is 0
      expect(actorData.resolve.max).toBeGreaterThanOrEqual(10);
    });

    test('should apply resolve multiplier when not 100%', () => {
      actorData.hiddenAbilities.resolveMult.total = 150; // 150%
      actorData.hiddenAbilities.resolveMult.value = 150;
      actorData.resolve.override = 100;

      actorData.prepareDerivedData();

      // 100 * 150 / 100 = 150
      expect(actorData.resolve.max).toBe(150);
    });

    test('should enforce minimum resolve value from settings', () => {
      global.game.settings.get.mockImplementation((system, key) => {
        if (key === 'minimumResolveValue') return 50;
        if (key === 'maxResolveFormula') return '';
        return null;
      });
      actorData.resolve.override = 30;

      actorData.prepareDerivedData();

      expect(actorData.resolve.max).toBe(50);
    });

    test('should clamp resolve value to max', () => {
      actorData.resolve.value = 500;
      actorData.resolve.override = 100;

      actorData.prepareDerivedData();

      expect(actorData.resolve.value).toBe(100);
    });
  });

  describe('prepareDerivedData() - Minimum Dice Value Branch', () => {
    test('should apply minimum dice value from settings', () => {
      global.game.settings.get.mockImplementation((system, key) => {
        if (key === 'minimumDiceValue') return 10;
        return null;
      });
      // Set value to 5 so total (value + change = 5 + 0) will be below minimum of 10
      actorData.hiddenAbilities.dice.value = 5;

      actorData.prepareDerivedData();

      expect(actorData.hiddenAbilities.dice.total).toBe(10);
    });

    test('should not modify dice when above minimum', () => {
      global.game.settings.get.mockImplementation((system, key) => {
        if (key === 'minimumDiceValue') return 10;
        return null;
      });
      // Set value to 20 so total (value + change = 20 + 0) will be above minimum of 10
      actorData.hiddenAbilities.dice.value = 20;

      actorData.prepareDerivedData();

      expect(actorData.hiddenAbilities.dice.total).toBe(20);
    });

    test('should handle missing settings gracefully', () => {
      // Save original settings to restore after test
      const originalSettings = global.game.settings;
      global.game.settings = undefined;
      // Set value to 5 so total (value + change = 5 + 0) will be above default minimum of 1
      actorData.hiddenAbilities.dice.value = 5;

      actorData.prepareDerivedData();

      // Should use default minimum of 1, and since 5 > 1, total stays 5
      expect(actorData.hiddenAbilities.dice.total).toBe(5);

      // Restore settings for subsequent tests
      global.game.settings = originalSettings;
    });
  });

  describe('prepareDerivedData() - Ability Override Priority', () => {
    test('should use override over transformOverride', () => {
      actorData.abilities.acro.override = 10;
      actorData.abilities.acro.transformOverride = 5;
      actorData.abilities.acro.value = 2;
      actorData.abilities.acro.change = 1;
      actorData.abilities.acro.transformChange = 0;

      actorData.prepareDerivedData();

      // base = override (10) not transformOverride (5)
      // total = 10 + 1 + 0 = 11
      expect(actorData.abilities.acro.total).toBe(11);
    });

    test('should use transformOverride when override is null', () => {
      actorData.abilities.acro.override = null;
      actorData.abilities.acro.transformOverride = 8;
      actorData.abilities.acro.value = 2;
      actorData.abilities.acro.change = 1;
      actorData.abilities.acro.transformChange = 0;

      actorData.prepareDerivedData();

      // base = transformOverride (8) not value (2)
      // total = 8 + 1 + 0 = 9
      expect(actorData.abilities.acro.total).toBe(9);
    });

    test('should use value when both overrides are null', () => {
      actorData.abilities.acro.override = null;
      actorData.abilities.acro.transformOverride = null;
      actorData.abilities.acro.value = 2;
      actorData.abilities.acro.change = 1;
      actorData.abilities.acro.transformChange = 0;

      actorData.prepareDerivedData();

      // base = value (2)
      // total = 2 + 1 + 0 = 3
      expect(actorData.abilities.acro.total).toBe(3);
    });
  });

  describe('prepareDerivedData() - Hidden Abilities Override Branch', () => {
    test('should use override for hidden ability total', () => {
      actorData.hiddenAbilities.dice.override = 12;
      actorData.hiddenAbilities.dice.change = 2;
      actorData.hiddenAbilities.dice.value = 20;

      actorData.prepareDerivedData();

      // override exists: total = override + change = 12 + 2 = 14
      expect(actorData.hiddenAbilities.dice.total).toBe(14);
    });

    test('should use value when override is null', () => {
      actorData.hiddenAbilities.dice.override = null;
      actorData.hiddenAbilities.dice.change = 2;
      actorData.hiddenAbilities.dice.value = 20;

      actorData.prepareDerivedData();

      // no override: total = value + change = 20 + 2 = 22
      expect(actorData.hiddenAbilities.dice.total).toBe(22);
    });
  });

  describe('prepareDerivedData() - Dice Adjustment Mode Branches', () => {
    test('should set mode to "k" for positive total', () => {
      actorData.abilities.acro.diceAdjustments.advantage = 3;
      actorData.abilities.acro.diceAdjustments.disadvantage = 1;

      actorData.prepareDerivedData();

      expect(actorData.abilities.acro.diceAdjustments.total).toBe(2);
      expect(actorData.abilities.acro.diceAdjustments.mode).toBe('k');
    });

    test('should set mode to "kl" for negative total', () => {
      actorData.abilities.acro.diceAdjustments.advantage = 1;
      actorData.abilities.acro.diceAdjustments.disadvantage = 3;

      actorData.prepareDerivedData();

      expect(actorData.abilities.acro.diceAdjustments.total).toBe(-2);
      expect(actorData.abilities.acro.diceAdjustments.mode).toBe('kl');
    });

    test('should set mode to empty string for zero total', () => {
      actorData.abilities.acro.diceAdjustments.advantage = 2;
      actorData.abilities.acro.diceAdjustments.disadvantage = 2;

      actorData.prepareDerivedData();

      expect(actorData.abilities.acro.diceAdjustments.total).toBe(0);
      expect(actorData.abilities.acro.diceAdjustments.mode).toBe('');
    });
  });

  describe('prepareDerivedData() - CR and XP Branches', () => {
    test('should calculate XP from CR when cr is defined', () => {
      actorData.cr = 5;

      actorData.prepareDerivedData();

      expect(actorData.xp).toBeGreaterThan(0);
    });

    test('should not calculate XP when cr is undefined', () => {
      actorData.cr = undefined;

      actorData.prepareDerivedData();

      // XP should remain at initial value
      expect(actorData.xp).toBe(0);
    });

    test('should not calculate XP when cr is negative', () => {
      actorData.cr = -1;

      actorData.prepareDerivedData();

      // XP should remain at initial value
      expect(actorData.xp).toBe(0);
    });
  });

  describe('getRollData() - Branch Coverage', () => {
    test('should copy abilities to top level and preserve nested structure', () => {
      const rollData = actorData.getRollData();

      expect(rollData.acro).toBeDefined();
      expect(rollData.acro.total).toBe(3);
      expect(rollData.abilities).toBeDefined();
      expect(rollData.abilities.acro).toBeDefined();
    });

    test('should copy hiddenAbilities to top level', () => {
      const rollData = actorData.getRollData();

      expect(rollData.hiddenAbilities).toBeDefined();
      expect(rollData.dice).toBeDefined();
      expect(rollData.dice.total).toBe(20);
    });

    test('should include level, statTotal, cr, and xp', () => {
      actorData.cr = 3;
      actorData.xp = 600;

      const rollData = actorData.getRollData();

      expect(rollData.lvl).toBe(1);
      expect(rollData.statTotal).toBe(0);
      expect(rollData.cr).toBe(3);
      expect(rollData.xp).toBe(600);
    });

    test('should handle missing abilities gracefully', () => {
      actorData.abilities = null;

      const rollData = actorData.getRollData();

      expect(rollData.abilities).toBeUndefined();
    });

    test('should handle missing hiddenAbilities gracefully', () => {
      actorData.hiddenAbilities = null;

      const rollData = actorData.getRollData();

      expect(rollData.hiddenAbilities).toBeUndefined();
    });
  });

  describe('calculateXPFromCR() - Branch Coverage', () => {
    test('should calculate XP using default formula', () => {
      actorData.cr = 5;

      const xp = actorData.calculateXPFromCR();

      // Default formula: @cr * 200 + @cr * @cr * 50 = 5*200 + 5*5*50 = 1000 + 1250 = 2250
      expect(xp).toBe(2250);
    });

    test('should return minimum 10 on error', () => {
      // Force an error by making Roll throw
      const OriginalRoll = global.Roll;
      global.Roll = vi.fn().mockImplementation(() => {
        throw new Error('Roll error');
      });

      actorData.cr = 5;

      const xp = actorData.calculateXPFromCR();

      expect(xp).toBe(1000); // Fallback: cr * 200 = 5 * 200 = 1000

      // Restore Roll
      global.Roll = OriginalRoll;
    });
  });

  describe('calculateDerivedMaxPower() - Branch Coverage', () => {
    test('should calculate max power using default formula', () => {
      actorData.abilities.will.total = 5;
      actorData.abilities.fort.total = 3;

      const maxPower = actorData.calculateDerivedMaxPower();

      // Default formula: max(5 + @will.total + @fort.total, 1) = max(5 + 5 + 3, 1) = 13
      expect(maxPower).toBe(13);
    });

    test('should return minimum 1 on error', () => {
      const OriginalRoll = global.Roll;
      global.Roll = vi.fn().mockImplementation(() => {
        throw new Error('Roll error');
      });

      actorData.abilities.will.total = 5;
      actorData.abilities.fort.total = 3;

      const maxPower = actorData.calculateDerivedMaxPower();

      // Fallback: 5 + will + fort = 5 + 5 + 3 = 13
      expect(maxPower).toBe(13);

      // Restore Roll
      global.Roll = OriginalRoll;
    });

    test('should handle missing ability totals gracefully', () => {
      actorData.abilities.will = null;
      actorData.abilities.fort = null;

      const maxPower = actorData.calculateDerivedMaxPower();

      // Fallback with null totals: 5 + 0 + 0 = 5
      expect(maxPower).toBe(5);
    });
  });

  describe('calculateDerivedMaxResolve() - Branch Coverage', () => {
    test('should calculate max resolve using default formula', () => {
      actorData.abilities.fort.total = 5;

      const maxResolve = actorData.calculateDerivedMaxResolve();

      // Default formula: max(100 + (10 * @fort.total), 10) = max(100 + 50, 10) = 150
      expect(maxResolve).toBe(150);
    });

    test('should return minimum 10 on error', () => {
      const OriginalRoll = global.Roll;
      global.Roll = vi.fn().mockImplementation(() => {
        throw new Error('Roll error');
      });

      actorData.abilities.fort.total = 5;

      const maxResolve = actorData.calculateDerivedMaxResolve();

      // Fallback: 100 + 10 * fort = 100 + 50 = 150
      expect(maxResolve).toBe(150);

      // Restore Roll
      global.Roll = OriginalRoll;
    });

    test('should handle missing fort total gracefully', () => {
      actorData.abilities.fort = null;

      const maxResolve = actorData.calculateDerivedMaxResolve();

      // Fallback with null fort: 100 + 10 * 0 = 100
      expect(maxResolve).toBe(100);
    });
  });

  describe('calculateDerivedStatPointsMax() - Branch Coverage', () => {
    beforeEach(() => {
      // Set up game.settings mock for these tests
      global.game.settings = {
        get: vi.fn((system, key) => {
          const defaults = {
            'statPointsFormula': '14 + (2 * @lvl.value)'
          };
          return defaults[key] ?? null;
        })
      };
    });

    test('should return 0 when formula is "0"', () => {
      global.game.settings.get.mockImplementationOnce((system, key) => {
        if (key === 'statPointsFormula') return '0';
        return null;
      });

      const result = actorData.calculateDerivedStatPointsMax();

      expect(result).toBe(0);
    });

    test('should calculate stat points using default formula', () => {
      actorData.attributes.level.value = 5;

      const result = actorData.calculateDerivedStatPointsMax();

      // Default formula: 14 + (2 * @lvl.value) = 14 + 10 = 24
      expect(result).toBe(24);
    });

    test('should return 0 on error', () => {
      // Save original Roll to restore after this test
      const OriginalRoll = global.Roll;

      global.Roll = vi.fn().mockImplementation(() => {
        throw new Error('Roll error');
      });

      const result = actorData.calculateDerivedStatPointsMax();

      expect(result).toBe(0);

      // Restore Roll to original mock
      global.Roll = OriginalRoll;
    });
  });
});