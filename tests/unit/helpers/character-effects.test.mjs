// @ts-nocheck
/**
 * @fileoverview Tests for character-effects helper module
 *
 * Tests for prepareCharacterEffects function that categorizes
 * character effects into regular, hidden, and override categories.
 */

import { prepareCharacterEffects } from '../../../module/helpers/character-effects.mjs';

describe('character-effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('prepareCharacterEffects()', () => {
    describe('No changes - returns empty arrays', () => {
      test('should return empty arrays when effect.changes is undefined', async () => {
        const effect = { changes: undefined };
        const result = await prepareCharacterEffects(effect);

        expect(result).toEqual({
          fullEffects: [],
          regularEffects: [],
          hiddenEffects: [],
          overrideEffects: []
        });
      });

      test('should return empty arrays when effect.changes is null', async () => {
        const effect = { changes: null };
        const result = await prepareCharacterEffects(effect);

        expect(result).toEqual({
          fullEffects: [],
          regularEffects: [],
          hiddenEffects: [],
          overrideEffects: []
        });
      });

      test('should return empty arrays when changes array is empty', async () => {
        const effect = { changes: [] };
        const result = await prepareCharacterEffects(effect);

        expect(result).toEqual({
          fullEffects: [],
          regularEffects: [],
          hiddenEffects: [],
          overrideEffects: []
        });
      });
    });

    describe('Regular abilities (acro, phys, fort, will, wits)', () => {
      test('should categorize single regular ability change', async () => {
        const effect = {
          changes: [
            { key: 'system.abilities.acro', value: '2', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.fullEffects).toHaveLength(1);
        expect(result.regularEffects).toHaveLength(1);
        expect(result.hiddenEffects).toHaveLength(0);
        expect(result.overrideEffects).toHaveLength(0);
        expect(result.regularEffects[0]).toEqual({
          ability: 'acro',
          value: '2',
          mode: 'change',
          hidden: false,
          override: false
        });
      });

      test('should categorize multiple regular ability changes', async () => {
        const effect = {
          changes: [
            { key: 'system.abilities.acro', value: '2', mode: 2 },
            { key: 'system.abilities.phys', value: '3', mode: 2 },
            { key: 'system.abilities.fort', value: '1', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.fullEffects).toHaveLength(3);
        expect(result.regularEffects).toHaveLength(3);
        expect(result.hiddenEffects).toHaveLength(0);
        expect(result.overrideEffects).toHaveLength(0);
        expect(result.regularEffects.map(e => e.ability)).toEqual(['acro', 'phys', 'fort']);
      });

      test('should populate regularEffects array correctly', async () => {
        const effect = {
          changes: [
            { key: 'system.abilities.will', value: '4', mode: 2 },
            { key: 'system.abilities.wits', value: '5', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.regularEffects).toHaveLength(2);
        expect(result.regularEffects[0].ability).toBe('will');
        expect(result.regularEffects[0].value).toBe('4');
        expect(result.regularEffects[0].mode).toBe('change');
        expect(result.regularEffects[0].hidden).toBe(false);
        expect(result.regularEffects[0].override).toBe(false);
      });
    });

    describe('Hidden abilities (dice, cmax, cmin, fmax, fmin, vuln, powerMult, resolveMult)', () => {
      test('should categorize single hidden ability change', async () => {
        const effect = {
          changes: [
            { key: 'system.abilities.dice', value: '1', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.fullEffects).toHaveLength(1);
        expect(result.regularEffects).toHaveLength(0);
        expect(result.hiddenEffects).toHaveLength(1);
        expect(result.overrideEffects).toHaveLength(0);
        expect(result.hiddenEffects[0]).toEqual({
          ability: 'dice',
          value: '1',
          mode: 'change',
          hidden: true,
          override: false
        });
      });

      test('should categorize multiple hidden ability changes', async () => {
        const effect = {
          changes: [
            { key: 'system.abilities.cmax', value: '2', mode: 2 },
            { key: 'system.abilities.cmin', value: '1', mode: 2 },
            { key: 'system.abilities.fmax', value: '3', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.fullEffects).toHaveLength(3);
        expect(result.regularEffects).toHaveLength(0);
        expect(result.hiddenEffects).toHaveLength(3);
        expect(result.overrideEffects).toHaveLength(0);
        expect(result.hiddenEffects.map(e => e.ability)).toEqual(['cmax', 'cmin', 'fmax']);
      });

      test('should populate hiddenEffects array correctly', async () => {
        const effect = {
          changes: [
            { key: 'system.abilities.vuln', value: '5', mode: 2 },
            { key: 'system.abilities.powerMult', value: '2', mode: 2 },
            { key: 'system.abilities.resolveMult', value: '1.5', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.hiddenEffects).toHaveLength(3);
        expect(result.hiddenEffects[0].ability).toBe('vuln');
        expect(result.hiddenEffects[0].value).toBe('5');
        expect(result.hiddenEffects[0].mode).toBe('change');
      });

      test('should set hidden flag to true for hidden abilities', async () => {
        const effect = {
          changes: [
            { key: 'system.abilities.fmin', value: '1', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.hiddenEffects[0].hidden).toBe(true);
        expect(result.hiddenEffects[0].override).toBe(false);
      });
    });

    describe('Override abilities (powerOverride, resolveOverride)', () => {
      test('should categorize powerOverride via system.power.override key', async () => {
        const effect = {
          changes: [
            { key: 'system.power.override', value: '10', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.fullEffects).toHaveLength(1);
        expect(result.regularEffects).toHaveLength(0);
        expect(result.hiddenEffects).toHaveLength(0);
        expect(result.overrideEffects).toHaveLength(1);
        expect(result.overrideEffects[0]).toEqual({
          ability: 'powerOverride',
          value: '10',
          mode: 'change',
          hidden: false,
          override: true
        });
      });

      test('should categorize resolveOverride via system.resolve.override key', async () => {
        const effect = {
          changes: [
            { key: 'system.resolve.override', value: '8', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.fullEffects).toHaveLength(1);
        expect(result.regularEffects).toHaveLength(0);
        expect(result.hiddenEffects).toHaveLength(0);
        expect(result.overrideEffects).toHaveLength(1);
        expect(result.overrideEffects[0]).toEqual({
          ability: 'resolveOverride',
          value: '8',
          mode: 'change',
          hidden: false,
          override: true
        });
      });

      test('should populate overrideEffects array correctly', async () => {
        const effect = {
          changes: [
            { key: 'system.power.override', value: '10', mode: 2 },
            { key: 'system.resolve.override', value: '8', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.overrideEffects).toHaveLength(2);
        expect(result.overrideEffects.map(e => e.ability)).toEqual(['powerOverride', 'resolveOverride']);
      });

      test('should set override flag to true for override abilities', async () => {
        const effect = {
          changes: [
            { key: 'system.power.override', value: '10', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.overrideEffects[0].hidden).toBe(false);
        expect(result.overrideEffects[0].override).toBe(true);
      });
    });

    describe('Effect modes', () => {
      test('should set disadvantage mode when key includes disadvantage', async () => {
        const effect = {
          changes: [
            { key: 'system.abilities.acro.disadvantage', value: '1', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.regularEffects[0].mode).toBe('disadvantage');
      });

      test('should set advantage mode when key includes advantage', async () => {
        const effect = {
          changes: [
            { key: 'system.abilities.phys.advantage', value: '1', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.regularEffects[0].mode).toBe('advantage');
      });

      test('should set ac.change mode when key includes ac.change', async () => {
        const effect = {
          changes: [
            { key: 'system.abilities.fort.ac.change', value: '2', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.regularEffects[0].mode).toBe('ac.change');
      });

      test('should set transformOverride mode when key includes transformOverride', async () => {
        const effect = {
          changes: [
            { key: 'system.abilities.will.transformOverride', value: '5', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.regularEffects[0].mode).toBe('transformOverride');
      });

      test('should set transformChange mode when key includes transformChange', async () => {
        const effect = {
          changes: [
            { key: 'system.abilities.wits.transformChange', value: '3', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.regularEffects[0].mode).toBe('transformChange');
      });

      test('should set override mode when mode equals 5', async () => {
        const effect = {
          changes: [
            { key: 'system.abilities.acro', value: '5', mode: 5 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.regularEffects[0].mode).toBe('override');
      });

      test('should set default change mode when no special mode applies', async () => {
        const effect = {
          changes: [
            { key: 'system.abilities.phys', value: '3', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.regularEffects[0].mode).toBe('change');
      });
    });

    describe('Mixed effects', () => {
      test('should categorize effect with regular, hidden, and override changes', async () => {
        const effect = {
          changes: [
            { key: 'system.abilities.acro', value: '2', mode: 2 },
            { key: 'system.abilities.dice', value: '1', mode: 2 },
            { key: 'system.power.override', value: '10', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.fullEffects).toHaveLength(3);
        expect(result.regularEffects).toHaveLength(1);
        expect(result.hiddenEffects).toHaveLength(1);
        expect(result.overrideEffects).toHaveLength(1);
        expect(result.regularEffects[0].ability).toBe('acro');
        expect(result.hiddenEffects[0].ability).toBe('dice');
        expect(result.overrideEffects[0].ability).toBe('powerOverride');
      });

      test('should populate all three effect arrays correctly', async () => {
        const effect = {
          changes: [
            { key: 'system.abilities.phys', value: '3', mode: 2 },
            { key: 'system.abilities.cmax', value: '2', mode: 2 },
            { key: 'system.resolve.override', value: '8', mode: 5 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.regularEffects[0]).toEqual({
          ability: 'phys',
          value: '3',
          mode: 'change',
          hidden: false,
          override: false
        });
        expect(result.hiddenEffects[0]).toEqual({
          ability: 'cmax',
          value: '2',
          mode: 'change',
          hidden: true,
          override: false
        });
        expect(result.overrideEffects[0]).toEqual({
          ability: 'resolveOverride',
          value: '8',
          mode: 'override',
          hidden: false,
          override: true
        });
      });
    });

    describe('Unknown ability', () => {
      test('should ignore change with unknown ability key', async () => {
        const effect = {
          changes: [
            { key: 'system.abilities.unknown', value: '5', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.fullEffects).toHaveLength(0);
        expect(result.regularEffects).toHaveLength(0);
        expect(result.hiddenEffects).toHaveLength(0);
        expect(result.overrideEffects).toHaveLength(0);
      });

      test('should ignore change with non-matching key', async () => {
        const effect = {
          changes: [
            { key: 'system.something.else', value: '3', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.fullEffects).toHaveLength(0);
      });
    });

    describe('Edge cases', () => {
      test('should handle effect with changes but no matching ability keys', async () => {
        const effect = {
          changes: [
            { key: 'system.unrelated.field', value: '1', mode: 2 },
            { key: 'another.random.key', value: '2', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.fullEffects).toHaveLength(0);
        expect(result.regularEffects).toHaveLength(0);
        expect(result.hiddenEffects).toHaveLength(0);
        expect(result.overrideEffects).toHaveLength(0);
      });

      test('should handle effect with mode field missing', async () => {
        const effect = {
          changes: [
            { key: 'system.abilities.acro', value: '2' }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.regularEffects[0].mode).toBe('change');
      });

      test('should handle effect with value field missing', async () => {
        const effect = {
          changes: [
            { key: 'system.abilities.phys', mode: 2 }
          ]
        };
        const result = await prepareCharacterEffects(effect);

        expect(result.regularEffects[0].value).toBeUndefined();
      });
    });
  });
});
