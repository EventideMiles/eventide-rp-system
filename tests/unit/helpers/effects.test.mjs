// @ts-nocheck
/**
 * @fileoverview Tests for effects helper module
 *
 * Tests for prepareActiveEffectCategories function that organizes
 * active effects into temporary, passive, and inactive categories.
 */

import { prepareActiveEffectCategories } from '../../../module/helpers/effects.mjs';

// Mock game.i18n.localize for effect labels
global.game = {
  ...global.game,
  i18n: {
    localize: vi.fn((key) => {
      const translations = {
        'EVENTIDE_RP_SYSTEM.Effect.Temporary': 'Temporary',
        'EVENTIDE_RP_SYSTEM.Effect.Passive': 'Passive',
        'EVENTIDE_RP_SYSTEM.Effect.Inactive': 'Inactive'
      };
      return translations[key] || key;
    })
  }
};

describe('effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('prepareActiveEffectCategories()', () => {
    describe('Empty effects - returns empty categories', () => {
      test('should return empty categories when effects array is empty', () => {
        const result = prepareActiveEffectCategories([]);

        expect(result.temporary.effects).toHaveLength(0);
        expect(result.passive.effects).toHaveLength(0);
        expect(result.inactive.effects).toHaveLength(0);
      });

      test('should throw error when effects parameter is undefined', () => {
        expect(() => prepareActiveEffectCategories(undefined)).toThrow('effects is not iterable');
      });
    });

    describe('Temporary effects', () => {
      test('should categorize single temporary effect', () => {
        const effect = { id: 'temp1', name: 'Bless', isTemporary: true, disabled: false };
        const result = prepareActiveEffectCategories([effect]);

        expect(result.temporary.effects).toHaveLength(1);
        expect(result.passive.effects).toHaveLength(0);
        expect(result.inactive.effects).toHaveLength(0);
        expect(result.temporary.effects[0]).toEqual(effect);
      });

      test('should categorize multiple temporary effects', () => {
        const effects = [
          { id: 'temp1', name: 'Bless', isTemporary: true, disabled: false },
          { id: 'temp2', name: 'Haste', isTemporary: true, disabled: false }
        ];
        const result = prepareActiveEffectCategories(effects);

        expect(result.temporary.effects).toHaveLength(2);
        expect(result.passive.effects).toHaveLength(0);
        expect(result.inactive.effects).toHaveLength(0);
      });

      test('should populate temporary category correctly', () => {
        const effects = [
          { id: 'temp1', name: 'Bless', isTemporary: true, disabled: false }
        ];
        const result = prepareActiveEffectCategories(effects);

        expect(result.temporary.type).toBe('temporary');
        expect(result.temporary.label).toBe('Temporary');
        expect(result.temporary.effects).toHaveLength(1);
      });

      test('should verify i18n localization for temporary label', () => {
        const result = prepareActiveEffectCategories([]);

        expect(global.game.i18n.localize).toHaveBeenCalledWith('EVENTIDE_RP_SYSTEM.Effect.Temporary');
        expect(result.temporary.label).toBe('Temporary');
      });
    });

    describe('Passive effects', () => {
      test('should categorize single passive effect', () => {
        const effect = { id: 'pass1', name: 'Endurance', isTemporary: false, disabled: false };
        const result = prepareActiveEffectCategories([effect]);

        expect(result.temporary.effects).toHaveLength(0);
        expect(result.passive.effects).toHaveLength(1);
        expect(result.inactive.effects).toHaveLength(0);
        expect(result.passive.effects[0]).toEqual(effect);
      });

      test('should categorize multiple passive effects', () => {
        const effects = [
          { id: 'pass1', name: 'Endurance', isTemporary: false, disabled: false },
          { id: 'pass2', name: 'Alertness', isTemporary: false, disabled: false }
        ];
        const result = prepareActiveEffectCategories(effects);

        expect(result.temporary.effects).toHaveLength(0);
        expect(result.passive.effects).toHaveLength(2);
        expect(result.inactive.effects).toHaveLength(0);
      });

      test('should populate passive category correctly', () => {
        const effects = [
          { id: 'pass1', name: 'Endurance', isTemporary: false, disabled: false }
        ];
        const result = prepareActiveEffectCategories(effects);

        expect(result.passive.type).toBe('passive');
        expect(result.passive.label).toBe('Passive');
        expect(result.passive.effects).toHaveLength(1);
      });

      test('should verify i18n localization for passive label', () => {
        const result = prepareActiveEffectCategories([]);

        expect(global.game.i18n.localize).toHaveBeenCalledWith('EVENTIDE_RP_SYSTEM.Effect.Passive');
        expect(result.passive.label).toBe('Passive');
      });
    });

    describe('Inactive effects', () => {
      test('should categorize single inactive effect', () => {
        const effect = { id: 'inact1', name: 'Poisoned', disabled: true, isTemporary: false };
        const result = prepareActiveEffectCategories([effect]);

        expect(result.temporary.effects).toHaveLength(0);
        expect(result.passive.effects).toHaveLength(0);
        expect(result.inactive.effects).toHaveLength(1);
        expect(result.inactive.effects[0]).toEqual(effect);
      });

      test('should categorize multiple inactive effects', () => {
        const effects = [
          { id: 'inact1', name: 'Poisoned', disabled: true, isTemporary: false },
          { id: 'inact2', name: 'Bleeding', disabled: true, isTemporary: true }
        ];
        const result = prepareActiveEffectCategories(effects);

        expect(result.temporary.effects).toHaveLength(0);
        expect(result.passive.effects).toHaveLength(0);
        expect(result.inactive.effects).toHaveLength(2);
      });

      test('should populate inactive category correctly', () => {
        const effects = [
          { id: 'inact1', name: 'Poisoned', disabled: true, isTemporary: false }
        ];
        const result = prepareActiveEffectCategories(effects);

        expect(result.inactive.type).toBe('inactive');
        expect(result.inactive.label).toBe('Inactive');
        expect(result.inactive.effects).toHaveLength(1);
      });

      test('should verify i18n localization for inactive label', () => {
        const result = prepareActiveEffectCategories([]);

        expect(global.game.i18n.localize).toHaveBeenCalledWith('EVENTIDE_RP_SYSTEM.Effect.Inactive');
        expect(result.inactive.label).toBe('Inactive');
      });
    });

    describe('Mixed effects', () => {
      test('should categorize effect with temporary, passive, and inactive effects', () => {
        const effects = [
          { id: 'temp1', name: 'Bless', isTemporary: true, disabled: false },
          { id: 'pass1', name: 'Endurance', isTemporary: false, disabled: false },
          { id: 'inact1', name: 'Poisoned', disabled: true, isTemporary: false }
        ];
        const result = prepareActiveEffectCategories(effects);

        expect(result.temporary.effects).toHaveLength(1);
        expect(result.passive.effects).toHaveLength(1);
        expect(result.inactive.effects).toHaveLength(1);
        expect(result.temporary.effects[0].id).toBe('temp1');
        expect(result.passive.effects[0].id).toBe('pass1');
        expect(result.inactive.effects[0].id).toBe('inact1');
      });

      test('should verify each category has correct effects', () => {
        const effects = [
          { id: 'temp1', name: 'Bless', isTemporary: true, disabled: false },
          { id: 'temp2', name: 'Haste', isTemporary: true, disabled: false },
          { id: 'pass1', name: 'Endurance', isTemporary: false, disabled: false },
          { id: 'inact1', name: 'Poisoned', disabled: true, isTemporary: false },
          { id: 'inact2', name: 'Stunned', disabled: true, isTemporary: true }
        ];
        const result = prepareActiveEffectCategories(effects);

        expect(result.temporary.effects.map(e => e.id)).toEqual(['temp1', 'temp2']);
        expect(result.passive.effects.map(e => e.id)).toEqual(['pass1']);
        expect(result.inactive.effects.map(e => e.id)).toEqual(['inact1', 'inact2']);
      });

      test('should prioritize disabled over isTemporary for categorization', () => {
        const effects = [
          { id: 'tempDisabled', name: 'Disabled Temp', isTemporary: true, disabled: true }
        ];
        const result = prepareActiveEffectCategories(effects);

        expect(result.temporary.effects).toHaveLength(0);
        expect(result.passive.effects).toHaveLength(0);
        expect(result.inactive.effects).toHaveLength(1);
      });
    });

    describe('Category structure', () => {
      test('should verify category type field', () => {
        const result = prepareActiveEffectCategories([]);

        expect(result.temporary.type).toBe('temporary');
        expect(result.passive.type).toBe('passive');
        expect(result.inactive.type).toBe('inactive');
      });

      test('should verify category label field using i18n', () => {
        const result = prepareActiveEffectCategories([]);

        expect(result.temporary.label).toBe('Temporary');
        expect(result.passive.label).toBe('Passive');
        expect(result.inactive.label).toBe('Inactive');
      });

      test('should verify effects array field exists', () => {
        const result = prepareActiveEffectCategories([]);

        expect(Array.isArray(result.temporary.effects)).toBe(true);
        expect(Array.isArray(result.passive.effects)).toBe(true);
        expect(Array.isArray(result.inactive.effects)).toBe(true);
      });
    });

    describe('Sorting', () => {
      test('should sort effects with different sort values ascending', () => {
        const effects = [
          { id: 'e3', name: 'Effect 3', isTemporary: true, disabled: false, sort: 30 },
          { id: 'e1', name: 'Effect 1', isTemporary: true, disabled: false, sort: 10 },
          { id: 'e2', name: 'Effect 2', isTemporary: true, disabled: false, sort: 20 }
        ];
        const result = prepareActiveEffectCategories(effects);

        expect(result.temporary.effects.map(e => e.id)).toEqual(['e1', 'e2', 'e3']);
      });

      test('should verify lowest sort first', () => {
        const effects = [
          { id: 'low', name: 'Low', isTemporary: false, disabled: false, sort: -10 },
          { id: 'zero', name: 'Zero', isTemporary: false, disabled: false, sort: 0 },
          { id: 'high', name: 'High', isTemporary: false, disabled: false, sort: 10 }
        ];
        const result = prepareActiveEffectCategories(effects);

        expect(result.passive.effects.map(e => e.id)).toEqual(['low', 'zero', 'high']);
      });

      test('should treat effects without sort property as 0', () => {
        const effects = [
          { id: 'nosort', name: 'No Sort', isTemporary: true, disabled: false },
          { id: 'hasSort', name: 'Has Sort', isTemporary: true, disabled: false, sort: 5 },
          { id: 'zero', name: 'Zero', isTemporary: true, disabled: false, sort: 0 }
        ];
        const result = prepareActiveEffectCategories(effects);

        // Both nosort and zero should have sort of 0, order may vary
        expect(result.temporary.effects[0].id).toBe('nosort');
        expect(result.temporary.effects[2].id).toBe('hasSort');
      });

      test('should sort inactive category by sort property', () => {
        const effects = [
          { id: 'e2', name: 'Effect 2', disabled: true, sort: 20 },
          { id: 'e1', name: 'Effect 1', disabled: true, sort: 10 }
        ];
        const result = prepareActiveEffectCategories(effects);

        expect(result.inactive.effects.map(e => e.id)).toEqual(['e1', 'e2']);
      });
    });

    describe('Edge cases', () => {
      test('should handle effects with undefined isTemporary property', () => {
        const effects = [
          { id: 'pass1', name: 'Endurance', isTemporary: undefined, disabled: false }
        ];
        const result = prepareActiveEffectCategories(effects);

        // undefined is falsy, so it should go to passive
        expect(result.passive.effects).toHaveLength(1);
      });

      test('should handle effects with undefined disabled property', () => {
        const effects = [
          { id: 'temp1', name: 'Bless', isTemporary: true, disabled: undefined }
        ];
        const result = prepareActiveEffectCategories(effects);

        // undefined is falsy, so it should not be inactive
        expect(result.temporary.effects).toHaveLength(1);
      });

      test('should throw error when effects parameter is null', () => {
        expect(() => prepareActiveEffectCategories(null)).toThrow('effects is not iterable');
      });

      test('should handle generator/object that can be iterated', () => {
        // Create an array-like object that can be iterated
        const effects = {
          [Symbol.iterator]: function* () {
            yield { id: 'temp1', name: 'Bless', isTemporary: true, disabled: false };
          }
        };
        const result = prepareActiveEffectCategories(effects);

        expect(result.temporary.effects).toHaveLength(1);
      });
    });
  });
});