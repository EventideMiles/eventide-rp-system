// @ts-nocheck
/**
 * @fileoverview Tests for ConditionEvaluator shared utility
 *
 * Unit tests for the ConditionEvaluator class which provides shared
 * condition evaluation logic for effect application thresholds.
 */

// Vitest globals are enabled (describe, test, expect, beforeEach, vi)

vi.mock('../../../module/utils/roll-utilities.mjs', () => ({
  ERPSRollUtilities: {
    determineCriticalStates: vi.fn(() => ({
      critHit: false,
      critMiss: false,
      stolenCrit: false,
      savedMiss: false
    }))
  }
}));

import { ConditionEvaluator } from '../../../module/helpers/condition-evaluator.mjs';
import { ERPSRollUtilities } from '../../../module/utils/roll-utilities.mjs';

describe('ConditionEvaluator', () => {
  describe('evaluate()', () => {
    describe('never condition', () => {
      test('should return false for never condition', () => {
        const result = ConditionEvaluator.evaluate('never', true, true, 20, 15);
        expect(result).toBe(false);
      });
    });

    describe('oneSuccess condition', () => {
      test('should return true when oneHit is true', () => {
        const result = ConditionEvaluator.evaluate('oneSuccess', true, false, 10, 15);
        expect(result).toBe(true);
      });

      test('should return false when oneHit is false', () => {
        const result = ConditionEvaluator.evaluate('oneSuccess', false, false, 10, 15);
        expect(result).toBe(false);
      });
    });

    describe('twoSuccesses condition', () => {
      test('should return true when bothHit is true', () => {
        const result = ConditionEvaluator.evaluate('twoSuccesses', true, true, 10, 15);
        expect(result).toBe(true);
      });

      test('should return false when bothHit is false', () => {
        const result = ConditionEvaluator.evaluate('twoSuccesses', true, false, 10, 15);
        expect(result).toBe(false);
      });
    });

    describe('rollValue condition', () => {
      test('should return true when rollTotal >= threshold', () => {
        const result = ConditionEvaluator.evaluate('rollValue', false, false, 20, 15);
        expect(result).toBe(true);
      });

      test('should return false when rollTotal < threshold', () => {
        const result = ConditionEvaluator.evaluate('rollValue', false, false, 10, 15);
        expect(result).toBe(false);
      });

      test('should return true when rollTotal equals threshold', () => {
        const result = ConditionEvaluator.evaluate('rollValue', false, false, 15, 15);
        expect(result).toBe(true);
      });

      test('should use default threshold of 15 when not provided', () => {
        const result = ConditionEvaluator.evaluate('rollValue', false, false, 15);
        expect(result).toBe(true);
      });
    });

    describe('rollUnderValue condition', () => {
      test('should return true when rollTotal < threshold', () => {
        const result = ConditionEvaluator.evaluate('rollUnderValue', false, false, 10, 15);
        expect(result).toBe(true);
      });

      test('should return false when rollTotal >= threshold', () => {
        const result = ConditionEvaluator.evaluate('rollUnderValue', false, false, 20, 15);
        expect(result).toBe(false);
      });
    });

    describe('rollEven condition', () => {
      test('should return true when rollTotal is even', () => {
        const result = ConditionEvaluator.evaluate('rollEven', false, false, 10, 15);
        expect(result).toBe(true);
      });

      test('should return false when rollTotal is odd', () => {
        const result = ConditionEvaluator.evaluate('rollEven', false, false, 11, 15);
        expect(result).toBe(false);
      });

      test('should return true for zero (even)', () => {
        const result = ConditionEvaluator.evaluate('rollEven', false, false, 0, 15);
        expect(result).toBe(true);
      });
    });

    describe('rollOdd condition', () => {
      test('should return true when rollTotal is odd', () => {
        const result = ConditionEvaluator.evaluate('rollOdd', false, false, 11, 15);
        expect(result).toBe(true);
      });

      test('should return false when rollTotal is even', () => {
        const result = ConditionEvaluator.evaluate('rollOdd', false, false, 10, 15);
        expect(result).toBe(false);
      });
    });

    describe('rollOnValue condition', () => {
      test('should return true when rollTotal equals threshold', () => {
        const result = ConditionEvaluator.evaluate('rollOnValue', false, false, 15, 15);
        expect(result).toBe(true);
      });

      test('should return false when rollTotal does not equal threshold', () => {
        const result = ConditionEvaluator.evaluate('rollOnValue', false, false, 14, 15);
        expect(result).toBe(false);
      });
    });

    describe('zeroSuccesses condition', () => {
      test('should return true when oneHit is false (zero successes)', () => {
        const result = ConditionEvaluator.evaluate('zeroSuccesses', false, false, 10, 15);
        expect(result).toBe(true);
      });

      test('should return false when oneHit is true', () => {
        const result = ConditionEvaluator.evaluate('zeroSuccesses', true, false, 10, 15);
        expect(result).toBe(false);
      });
    });

    describe('always condition', () => {
      test('should return true regardless of other parameters', () => {
        const result = ConditionEvaluator.evaluate('always', false, false, 0, 0);
        expect(result).toBe(true);
      });
    });

    describe('criticalSuccess condition', () => {
      test('should return true when critHit is true and stolenCrit is false', () => {
        const mockRoll = { total: 20 };
        const mockActor = {
          getRollData: vi.fn(() => ({ hiddenAbilities: {} }))
        };
        ERPSRollUtilities.determineCriticalStates.mockReturnValue({
          critHit: true,
          stolenCrit: false,
          critMiss: false,
          savedMiss: false
        });

        const result = ConditionEvaluator.evaluate('criticalSuccess', false, false, 20, 15, mockRoll, mockActor, '1d20');
        expect(result).toBe(true);
        expect(ERPSRollUtilities.determineCriticalStates).toHaveBeenCalledWith({
          roll: mockRoll,
          thresholds: {},
          formula: '1d20',
          critAllowed: true
        });
      });

      test('should return false when critHit is false', () => {
        const mockRoll = { total: 10 };
        const mockActor = {
          getRollData: vi.fn(() => ({ hiddenAbilities: {} }))
        };
        ERPSRollUtilities.determineCriticalStates.mockReturnValue({
          critHit: false,
          stolenCrit: false,
          critMiss: false,
          savedMiss: false
        });

        const result = ConditionEvaluator.evaluate('criticalSuccess', false, false, 10, 15, mockRoll, mockActor, '1d20');
        expect(result).toBe(false);
      });

      test('should return false when critHit is true but stolenCrit is true', () => {
        const mockRoll = { total: 20 };
        const mockActor = {
          getRollData: vi.fn(() => ({ hiddenAbilities: {} }))
        };
        ERPSRollUtilities.determineCriticalStates.mockReturnValue({
          critHit: true,
          stolenCrit: true,
          critMiss: false,
          savedMiss: false
        });

        const result = ConditionEvaluator.evaluate('criticalSuccess', false, false, 20, 15, mockRoll, mockActor, '1d20');
        expect(result).toBe(false);
      });

      test('should return false when roll is null', () => {
        const result = ConditionEvaluator.evaluate('criticalSuccess', false, false, 20, 15, null, {}, '1d20');
        expect(result).toBe(false);
      });

      test('should return false when actor is null', () => {
        const result = ConditionEvaluator.evaluate('criticalSuccess', false, false, 20, 15, {}, null, '1d20');
        expect(result).toBe(false);
      });

      test('should return false when formula is null', () => {
        const result = ConditionEvaluator.evaluate('criticalSuccess', false, false, 20, 15, {}, {}, null);
        expect(result).toBe(false);
      });
    });

    describe('criticalFailure condition', () => {
      test('should return true when critMiss is true and savedMiss is false', () => {
        const mockRoll = { total: 1 };
        const mockActor = {
          getRollData: vi.fn(() => ({ hiddenAbilities: {} }))
        };
        ERPSRollUtilities.determineCriticalStates.mockReturnValue({
          critHit: false,
          stolenCrit: false,
          critMiss: true,
          savedMiss: false
        });

        const result = ConditionEvaluator.evaluate('criticalFailure', false, false, 1, 15, mockRoll, mockActor, '1d20');
        expect(result).toBe(true);
      });

      test('should return false when critMiss is false', () => {
        const mockRoll = { total: 10 };
        const mockActor = {
          getRollData: vi.fn(() => ({ hiddenAbilities: {} }))
        };
        ERPSRollUtilities.determineCriticalStates.mockReturnValue({
          critHit: false,
          stolenCrit: false,
          critMiss: false,
          savedMiss: false
        });

        const result = ConditionEvaluator.evaluate('criticalFailure', false, false, 10, 15, mockRoll, mockActor, '1d20');
        expect(result).toBe(false);
      });

      test('should return false when critMiss is true but savedMiss is true', () => {
        const mockRoll = { total: 1 };
        const mockActor = {
          getRollData: vi.fn(() => ({ hiddenAbilities: {} }))
        };
        ERPSRollUtilities.determineCriticalStates.mockReturnValue({
          critHit: false,
          stolenCrit: false,
          critMiss: true,
          savedMiss: true
        });

        const result = ConditionEvaluator.evaluate('criticalFailure', false, false, 1, 15, mockRoll, mockActor, '1d20');
        expect(result).toBe(false);
      });
    });

    describe('unknown condition', () => {
      test('should return false for unknown condition types', () => {
        const result = ConditionEvaluator.evaluate('unknownCondition', true, true, 20, 15);
        expect(result).toBe(false);
      });
    });
  });
});
