// @ts-nocheck
/**
 * @fileoverview Tests for Base Actor Data Model - Priority 1 Critical Functions
 *
 * Tests the core data preparation methods that calculate derived statistics
 * for all actors in the Eventide RP System. These calculations are critical
 * for character sheet accuracy and rolling mechanics.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock the FoundryVTT TypeDataModel before importing
class MockTypeDataModel {
  prepareDerivedData() {
    // Mock parent prepareDerivedData
  }

  getRollData() {
    return {};
  }
}

// Mock the EventideRpSystemItemBase
const mockItemBase = class {
  static defineSchema() {
    return {};
  }
};

// Set up global mocks
global.foundry = {
  ...global.foundry,
  abstract: {
    ...global.foundry.abstract,
    TypeDataModel: MockTypeDataModel
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
    localize: jest.fn((key) => {
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
jest.unstable_mockModule('../../../module/data/_module.mjs', () => ({
  EventideRpSystemItemBase: mockItemBase
}));

// Import the data model after setting up mocks
const { default: EventideRpSystemBaseActor } = await import('../../../module/data/base-actor.mjs');

describe('EventideRpSystemBaseActor - Priority 1 Data Preparation', () => {
  let actorData;

  beforeEach(() => {
    // Create a fresh actor data instance for each test
    actorData = new EventideRpSystemBaseActor({
      abilities: {
        acro: {
          value: 2,
          override: null,
          change: 1,
          transform: 0,
          ac: { change: 0 },
          diceAdjustments: { advantage: 2, disadvantage: 0 }
        },
        phys: {
          value: 0,
          override: null,
          change: 0,
          transform: 1,
          ac: { change: -1 },
          diceAdjustments: { advantage: 0, disadvantage: 1 }
        },
        fort: {
          value: -1,
          override: 5,
          change: 0,
          transform: 0,
          ac: { change: 2 },
          diceAdjustments: { advantage: 0, disadvantage: 0 }
        },
        will: {
          value: 3,
          override: null,
          change: -1,
          transform: 0,
          ac: { change: 0 },
          diceAdjustments: { advantage: 1, disadvantage: 2 }
        },
        wits: {
          value: 1,
          override: null,
          change: 0,
          transform: 0,
          ac: { change: 0 },
          diceAdjustments: { advantage: 0, disadvantage: 0 }
        }
      },
      hiddenAbilities: {
        dice: { value: 20, override: null, change: 0 },
        cmax: { value: 20, override: null, change: 0 },
        cmin: { value: 20, override: null, change: 0 },
        fmin: { value: 1, override: null, change: 0 },
        fmax: { value: 1, override: null, change: 0 },
        vuln: { value: 0, override: null, change: 0 }
      },
      statTotal: { value: 0, mainInit: 0, subInit: 0 }
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
      actorData.abilities.acro.transform = -1;

      actorData.prepareDerivedData();

      expect(actorData.abilities.acro.total).toBe(-8);
      expect(actorData.abilities.acro.ac.total).toBe(3); // -8 + 11 + 0
    });

    test('should handle very large ability values', () => {
      actorData.abilities.phys.value = 999;
      actorData.abilities.phys.change = 1;

      actorData.prepareDerivedData();

      expect(actorData.abilities.phys.total).toBe(1000);
      expect(actorData.abilities.phys.ac.total).toBe(1010); // 1000 + 11 + (-1)
    });

    test('should handle floating point values', () => {
      actorData.abilities.will.value = 2.5;
      actorData.abilities.will.change = 0.3;
      actorData.abilities.will.transform = 0.2;

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

    test('should handle missing abilities gracefully', () => {
      // Remove an ability
      delete actorData.abilities.wits;

      // Should not throw error
      expect(() => actorData.prepareDerivedData()).not.toThrow();

      // Other abilities should still be processed
      expect(actorData.abilities.acro.total).toBe(3);
    });

    test('should handle missing hidden abilities gracefully', () => {
      // Remove a hidden ability
      delete actorData.hiddenAbilities.dice;

      // Should not throw error
      expect(() => actorData.prepareDerivedData()).not.toThrow();
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
      const parentSpy = jest.spyOn(MockTypeDataModel.prototype, 'prepareDerivedData');

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
      actorData.abilities.fort.override = 0;
      actorData.abilities.will.override = 7;
      actorData.abilities.wits.override = 15;

      actorData.prepareDerivedData();

      // Total should be: 10 + (-2) + 0 + 7 + 15 = 30
      expect(actorData.statTotal.value).toBe(30);
      expect(actorData.statTotal.mainInit).toBe(12.5); // (10 + 15) / 2
    });
  });
});