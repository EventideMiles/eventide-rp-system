// @ts-nocheck
/**
 * @fileoverview Roll Utilities Tests
 *
 * Unit tests for the ERPSRollUtilities class which provides shared utilities
 * for dice rolling and message handling.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

import { ERPSRollUtilities } from '../../../module/utils/roll-utilities.mjs';

// =================================
// Mock Setup
// =================================

// Mock ChatMessage.getSpeaker
const mockGetSpeaker = vi.fn((data) => {
  if (!data) return { alias: 'Default Speaker' };
  if (data.alias) return { alias: data.alias, actor: data.actor };
  return { alias: data.actor?.name || 'Unknown', actor: data.actor };
});

global.ChatMessage = {
  getSpeaker: mockGetSpeaker,
};

// Mock game.i18n.format
const mockI18nFormat = vi.fn((key, data) => {
  if (key === 'ERPS.MessageHeader') {
    return `${data.name} Action`;
  }
  return `${key}: ${JSON.stringify(data)}`;
});

global.game = {
  i18n: {
    format: mockI18nFormat,
  },
};

// =================================
// getItemStyle() Tests
// =================================
describe('ERPSRollUtilities.getItemStyle()', () => {
  describe('with valid item colors', () => {
    test('should return style string with custom colors', () => {
      const mockItem = {
        system: {
          bgColor: { css: '#ff0000' },
          textColor: { css: '#00ff00' },
        },
      };

      const result = ERPSRollUtilities.getItemStyle(mockItem);

      expect(result).toBe('background-color: #ff0000; color: #00ff00;');
    });

    test('should handle hex color codes', () => {
      const mockItem = {
        system: {
          bgColor: { css: '#1a2b3c' },
          textColor: { css: '#4d5e6f' },
        },
      };

      const result = ERPSRollUtilities.getItemStyle(mockItem);

      expect(result).toContain('background-color: #1a2b3c');
      expect(result).toContain('color: #4d5e6f');
    });

    test('should handle rgb color values', () => {
      const mockItem = {
        system: {
          bgColor: { css: 'rgb(255, 128, 0)' },
          textColor: { css: 'rgb(0, 64, 128)' },
        },
      };

      const result = ERPSRollUtilities.getItemStyle(mockItem);

      expect(result).toContain('background-color: rgb(255, 128, 0)');
      expect(result).toContain('color: rgb(0, 64, 128)');
    });
  });

  describe('with missing colors', () => {
    test('should use default background color when bgColor is missing', () => {
      const mockItem = {
        system: {
          textColor: { css: '#ffffff' },
        },
      };

      const result = ERPSRollUtilities.getItemStyle(mockItem);

      expect(result).toContain('background-color: #444');
      expect(result).toContain('color: #ffffff');
    });

    test('should use default text color when textColor is missing', () => {
      const mockItem = {
        system: {
          bgColor: { css: '#000000' },
        },
      };

      const result = ERPSRollUtilities.getItemStyle(mockItem);

      expect(result).toContain('background-color: #000000');
      expect(result).toContain('color: #fff');
    });

    test('should use both default colors when both are missing', () => {
      const mockItem = {
        system: {},
      };

      const result = ERPSRollUtilities.getItemStyle(mockItem);

      expect(result).toBe('background-color: #444; color: #fff;');
    });

    test('should handle null bgColor.css', () => {
      const mockItem = {
        system: {
          bgColor: { css: null },
          textColor: { css: '#000000' },
        },
      };

      const result = ERPSRollUtilities.getItemStyle(mockItem);

      expect(result).toContain('background-color: #444');
    });

    test('should handle null textColor.css', () => {
      const mockItem = {
        system: {
          bgColor: { css: '#ff0000' },
          textColor: { css: null },
        },
      };

      const result = ERPSRollUtilities.getItemStyle(mockItem);

      expect(result).toContain('color: #fff');
    });

    test('should handle undefined bgColor object', () => {
      const mockItem = {
        system: {
          bgColor: undefined,
          textColor: { css: '#000000' },
        },
      };

      const result = ERPSRollUtilities.getItemStyle(mockItem);

      expect(result).toContain('background-color: #444');
    });
  });
});

// =================================
// getSpeaker() Tests
// =================================
describe('ERPSRollUtilities.getSpeaker()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with null actor', () => {
    test('should call ChatMessage.getSpeaker without arguments', () => {
      ERPSRollUtilities.getSpeaker(null);

      expect(mockGetSpeaker).toHaveBeenCalledWith();
    });

    test('should call ChatMessage.getSpeaker without arguments for undefined actor', () => {
      ERPSRollUtilities.getSpeaker(undefined);

      expect(mockGetSpeaker).toHaveBeenCalledWith();
    });
  });

  describe('with valid actor', () => {
    test('should call ChatMessage.getSpeaker with actor data', () => {
      const mockActor = { name: 'Test Character', id: 'actor123' };

      ERPSRollUtilities.getSpeaker(mockActor);

      expect(mockGetSpeaker).toHaveBeenCalledWith({ actor: mockActor });
    });

    test('should return speaker object from ChatMessage.getSpeaker', () => {
      const mockActor = { name: 'Test Character', id: 'actor123' };

      const result = ERPSRollUtilities.getSpeaker(mockActor);

      expect(result).toHaveProperty('alias');
      expect(result).toHaveProperty('actor', mockActor);
    });
  });

  describe('with actor and headerKey', () => {
    test('should call game.i18n.format with headerKey and actor name', () => {
      const mockActor = { name: 'Test Character', id: 'actor123' };

      ERPSRollUtilities.getSpeaker(mockActor, 'ERPS.MessageHeader');

      expect(mockI18nFormat).toHaveBeenCalledWith('ERPS.MessageHeader', {
        name: 'Test Character',
      });
    });

    test('should include formatted alias in speaker data', () => {
      const mockActor = { name: 'Test Character', id: 'actor123' };

      ERPSRollUtilities.getSpeaker(mockActor, 'ERPS.MessageHeader');

      expect(mockGetSpeaker).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: mockActor,
          alias: 'Test Character Action',
        })
      );
    });

    test('should not include alias if actor has no name', () => {
      const mockActor = { id: 'actor123' };

      ERPSRollUtilities.getSpeaker(mockActor, 'ERPS.MessageHeader');

      expect(mockGetSpeaker).toHaveBeenCalledWith({ actor: mockActor });
    });
  });

  describe('without headerKey', () => {
    test('should not call game.i18n.format when headerKey is null', () => {
      const mockActor = { name: 'Test Character', id: 'actor123' };

      ERPSRollUtilities.getSpeaker(mockActor, null);

      expect(mockI18nFormat).not.toHaveBeenCalled();
    });

    test('should not call game.i18n.format when headerKey is undefined', () => {
      const mockActor = { name: 'Test Character', id: 'actor123' };

      ERPSRollUtilities.getSpeaker(mockActor, undefined);

      expect(mockI18nFormat).not.toHaveBeenCalled();
    });
  });
});

// =================================
// determineCriticalStates() Tests
// =================================
describe('ERPSRollUtilities.determineCriticalStates()', () => {
  // Helper to create mock roll with die results
  const createMockRoll = (dieResults) => ({
    terms: [{ results: dieResults.map((r) => ({ result: r })) }],
  });

  // Standard thresholds for testing
  const standardThresholds = {
    cmin: { total: 20 },
    cmax: { total: 20 },
    fmin: { total: 1 },
    fmax: { total: 1 },
  };

  describe('early return conditions', () => {
    test('should return all false when critAllowed is false', () => {
      const roll = createMockRoll([20]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: standardThresholds,
        formula: '1d20',
        critAllowed: false,
      });

      expect(result).toEqual({
        critHit: false,
        critMiss: false,
        stolenCrit: false,
        savedMiss: false,
      });
    });

    test('should return all false when formula does not include dice', () => {
      const roll = createMockRoll([20]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: standardThresholds,
        formula: '10+5',
        critAllowed: true,
      });

      expect(result).toEqual({
        critHit: false,
        critMiss: false,
        stolenCrit: false,
        savedMiss: false,
      });
    });

    test('should return all false when roll has no terms', () => {
      const result = ERPSRollUtilities.determineCriticalStates({
        roll: { terms: [] },
        thresholds: standardThresholds,
        formula: '1d20',
        critAllowed: true,
      });

      expect(result).toEqual({
        critHit: false,
        critMiss: false,
        stolenCrit: false,
        savedMiss: false,
      });
    });

    test('should return all false when roll terms have no results', () => {
      const result = ERPSRollUtilities.determineCriticalStates({
        roll: { terms: [{ results: null }] },
        thresholds: standardThresholds,
        formula: '1d20',
        critAllowed: true,
      });

      expect(result).toEqual({
        critHit: false,
        critMiss: false,
        stolenCrit: false,
        savedMiss: false,
      });
    });
  });

  describe('missing threshold values', () => {
    test('should return all false when cmin.total is undefined', () => {
      const roll = createMockRoll([20]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: { ...standardThresholds, cmin: { total: undefined } },
        formula: '1d20',
        critAllowed: true,
      });

      expect(result.critHit).toBe(false);
    });

    test('should return all false when cmax.total is undefined', () => {
      const roll = createMockRoll([20]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: { ...standardThresholds, cmax: { total: undefined } },
        formula: '1d20',
        critAllowed: true,
      });

      expect(result.critHit).toBe(false);
    });

    test('should return all false when fmin.total is undefined', () => {
      const roll = createMockRoll([1]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: { ...standardThresholds, fmin: { total: undefined } },
        formula: '1d20',
        critAllowed: true,
      });

      expect(result.critMiss).toBe(false);
    });

    test('should return all false when fmax.total is undefined', () => {
      const roll = createMockRoll([1]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: { ...standardThresholds, fmax: { total: undefined } },
        formula: '1d20',
        critAllowed: true,
      });

      expect(result.critMiss).toBe(false);
    });

    test('should return all false when cmin is undefined', () => {
      const roll = createMockRoll([20]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: { ...standardThresholds, cmin: undefined },
        formula: '1d20',
        critAllowed: true,
      });

      expect(result.critHit).toBe(false);
    });
  });

  describe('basic critical hit detection', () => {
    test('should detect crit hit when die equals cmax', () => {
      const roll = createMockRoll([20]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: standardThresholds,
        formula: '1d20',
        critAllowed: true,
      });

      expect(result.critHit).toBe(true);
      expect(result.critMiss).toBe(false);
    });

    test('should detect crit hit when die is in crit range', () => {
      const roll = createMockRoll([19]);
      const thresholds = {
        cmin: { total: 18 },
        cmax: { total: 20 },
        fmin: { total: 1 },
        fmax: { total: 1 },
      };
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds,
        formula: '1d20',
        critAllowed: true,
      });

      expect(result.critHit).toBe(true);
    });

    test('should not detect crit hit when die is outside crit range', () => {
      const roll = createMockRoll([15]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: standardThresholds,
        formula: '1d20',
        critAllowed: true,
      });

      expect(result.critHit).toBe(false);
    });
  });

  describe('basic critical miss detection', () => {
    test('should detect crit miss when die equals fmin', () => {
      const roll = createMockRoll([1]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: standardThresholds,
        formula: '1d20',
        critAllowed: true,
      });

      expect(result.critMiss).toBe(true);
      expect(result.critHit).toBe(false);
    });

    test('should detect crit miss when die is in miss range', () => {
      const roll = createMockRoll([2]);
      const thresholds = {
        cmin: { total: 20 },
        cmax: { total: 20 },
        fmin: { total: 1 },
        fmax: { total: 3 },
      };
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds,
        formula: '1d20',
        critAllowed: true,
      });

      expect(result.critMiss).toBe(true);
    });

    test('should not detect crit miss when die is outside miss range', () => {
      const roll = createMockRoll([10]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: standardThresholds,
        formula: '1d20',
        critAllowed: true,
      });

      expect(result.critMiss).toBe(false);
    });
  });

  describe('no crit hit or miss', () => {
    test('should return all false for normal roll', () => {
      const roll = createMockRoll([10]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: standardThresholds,
        formula: '1d20',
        critAllowed: true,
      });

      expect(result).toEqual({
        critHit: false,
        critMiss: false,
        stolenCrit: false,
        savedMiss: false,
      });
    });
  });

  describe('keep lowest formula (kl)', () => {
    test('should detect stolenCrit when some dice are crits but not all', () => {
      // 2d20kl1 - keep lowest, one die is a crit (20), the other isn't
      const roll = createMockRoll([20, 15]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: standardThresholds,
        formula: '2d20kl1',
        critAllowed: true,
      });

      expect(result.stolenCrit).toBe(true);
      expect(result.critHit).toBe(false);
    });

    test('should not detect stolenCrit when all dice are crits', () => {
      const roll = createMockRoll([20, 20]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: standardThresholds,
        formula: '2d20kl1',
        critAllowed: true,
      });

      expect(result.stolenCrit).toBe(false);
      expect(result.critHit).toBe(true);
    });

    test('should detect critHit normally when no dice are crits', () => {
      const roll = createMockRoll([10, 15]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: standardThresholds,
        formula: '2d20kl1',
        critAllowed: true,
      });

      expect(result.stolenCrit).toBe(false);
      expect(result.critHit).toBe(false);
    });
  });

  describe('keep highest formula (k)', () => {
    test('should detect savedMiss when some dice are misses but not all', () => {
      // 2d20k1 - keep highest, one die is a miss (1), the other isn't
      const roll = createMockRoll([1, 15]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: standardThresholds,
        formula: '2d20k1',
        critAllowed: true,
      });

      expect(result.savedMiss).toBe(true);
      expect(result.critMiss).toBe(false);
    });

    test('should not detect savedMiss when all dice are misses', () => {
      const roll = createMockRoll([1, 1]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: standardThresholds,
        formula: '2d20k1',
        critAllowed: true,
      });

      expect(result.savedMiss).toBe(false);
      expect(result.critMiss).toBe(true);
    });

    test('should detect critMiss normally when no dice are misses', () => {
      const roll = createMockRoll([10, 15]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: standardThresholds,
        formula: '2d20k1',
        critAllowed: true,
      });

      expect(result.savedMiss).toBe(false);
      expect(result.critMiss).toBe(false);
    });
  });

  describe('state adjustments', () => {
    test('should set savedMiss to false when critHit is true', () => {
      // This tests the "if (critHit) savedMiss = false" logic
      const roll = createMockRoll([20, 1]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: standardThresholds,
        formula: '2d20k1',
        critAllowed: true,
      });

      expect(result.critHit).toBe(true);
      expect(result.savedMiss).toBe(false);
    });

    test('should set stolenCrit to false when critMiss is true', () => {
      // This tests the "if (critMiss) stolenCrit = false" logic
      const roll = createMockRoll([1, 20]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: standardThresholds,
        formula: '2d20kl1',
        critAllowed: true,
      });

      expect(result.critMiss).toBe(true);
      expect(result.stolenCrit).toBe(false);
    });
  });

  describe('case insensitivity', () => {
    test('should handle uppercase KL in formula', () => {
      const roll = createMockRoll([20, 15]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: standardThresholds,
        formula: '2d20KL1',
        critAllowed: true,
      });

      expect(result.stolenCrit).toBe(true);
    });

    test('should handle uppercase K in formula', () => {
      const roll = createMockRoll([1, 15]);
      const result = ERPSRollUtilities.determineCriticalStates({
        roll,
        thresholds: standardThresholds,
        formula: '2d20K1',
        critAllowed: true,
      });

      expect(result.savedMiss).toBe(true);
    });
  });
});
