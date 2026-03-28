// @ts-nocheck
/**
 * @fileoverview EffectAttachment Helper Tests
 *
 * Unit tests for the EffectAttachment helper class which handles
 * attaching effects to targets based on threshold conditions.
 */

// Vitest globals are enabled
// describe, test, expect, beforeEach, vi are available globally
import { EffectAttachment } from '../../../module/helpers/effect-attachment.mjs';

describe('EffectAttachment', () => {
  describe('applyThresholdEffects()', () => {
    let mockActor;
    let mockEffectEntry;
    let mockTargetResult;

    beforeEach(() => {
      // Create a mock actor
      mockActor = global.testUtils.createMockActor({
        name: 'Test Actor',
        items: []
      });
      mockActor.createEmbeddedDocuments = vi.fn();

      // Create a mock effect entry
      mockEffectEntry = {
        threshold: { type: 'oneSuccess' },
        itemData: global.testUtils.createMockItem({
          name: 'Test Effect',
          type: 'gear'
        })
      };

      // Create a mock target result
      mockTargetResult = {
        target: mockActor,
        oneHit: true,
        bothHit: false
      };

      vi.clearAllMocks();
    });

    test('should return empty array when no effects provided', async () => {
      const result = await EffectAttachment.applyThresholdEffects(
        [],
        [mockTargetResult],
        15,
        true
      );

      expect(result).toEqual([]);
    });

    test('should return empty array when thresholds are not met', async () => {
      mockTargetResult.oneHit = false;
      mockTargetResult.bothHit = false;

      const result = await EffectAttachment.applyThresholdEffects(
        [mockEffectEntry],
        [mockTargetResult],
        15,
        true
      );

      expect(result).toEqual([]);
    });

    test('should apply effect when threshold met (oneSuccess) with GM', async () => {
      mockActor.createEmbeddedDocuments.mockResolvedValue([mockEffectEntry.itemData]);

      const result = await EffectAttachment.applyThresholdEffects(
        [mockEffectEntry],
        [mockTargetResult],
        15,
        true
      );

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledWith('Item', [mockEffectEntry.itemData]);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        target: mockActor,
        effect: mockEffectEntry.itemData,
        threshold: mockEffectEntry.threshold,
        applied: true
      });
    });

    test('should create needsGMApplication flag when threshold met (oneSuccess) without GM', async () => {
      const result = await EffectAttachment.applyThresholdEffects(
        [mockEffectEntry],
        [mockTargetResult],
        15,
        false
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        target: mockActor,
        effect: mockEffectEntry.itemData,
        threshold: mockEffectEntry.threshold,
        needsGMApplication: true
      });
    });

    test('should respect bothHit threshold (twoSuccesses)', async () => {
      mockEffectEntry.threshold = { type: 'twoSuccesses' };
      mockTargetResult.oneHit = true;
      mockTargetResult.bothHit = true;

      mockActor.createEmbeddedDocuments.mockResolvedValue([mockEffectEntry.itemData]);

      const result = await EffectAttachment.applyThresholdEffects(
        [mockEffectEntry],
        [mockTargetResult],
        15,
        true
      );

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledWith('Item', [mockEffectEntry.itemData]);
      expect(result).toHaveLength(1);
    });

    test('should not apply when bothHit threshold not met', async () => {
      mockEffectEntry.threshold = { type: 'twoSuccesses' };
      mockTargetResult.oneHit = true;
      mockTargetResult.bothHit = false;

      const result = await EffectAttachment.applyThresholdEffects(
        [mockEffectEntry],
        [mockTargetResult],
        15,
        true
      );

      expect(result).toEqual([]);
    });

    test('should respect rollTotal threshold', async () => {
      mockEffectEntry.threshold = { type: 'rollValue', value: 18 };

      mockActor.createEmbeddedDocuments.mockResolvedValue([mockEffectEntry.itemData]);

      const result = await EffectAttachment.applyThresholdEffects(
        [mockEffectEntry],
        [mockTargetResult],
        20,
        true
      );

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledWith('Item', [mockEffectEntry.itemData]);
      expect(result).toHaveLength(1);
    });

    test('should not apply when rollTotal below threshold', async () => {
      mockEffectEntry.threshold = { type: 'rollValue', value: 18 };

      const result = await EffectAttachment.applyThresholdEffects(
        [mockEffectEntry],
        [mockTargetResult],
        15,
        true
      );

      expect(result).toEqual([]);
    });

    test('should never apply with "never" threshold type', async () => {
      mockEffectEntry.threshold = { type: 'never' };
      mockTargetResult.oneHit = true;

      const result = await EffectAttachment.applyThresholdEffects(
        [mockEffectEntry],
        [mockTargetResult],
        15,
        true
      );

      expect(result).toEqual([]);
    });

    test('should process multiple targets', async () => {
      const mockActor2 = global.testUtils.createMockActor({
        name: 'Test Actor 2',
        items: []
      });
      mockActor2.createEmbeddedDocuments = vi.fn().mockResolvedValue([mockEffectEntry.itemData]);

      const mockTargetResult2 = {
        target: mockActor2,
        oneHit: true,
        bothHit: false
      };

      mockActor.createEmbeddedDocuments.mockResolvedValue([mockEffectEntry.itemData]);

      const result = await EffectAttachment.applyThresholdEffects(
        [mockEffectEntry],
        [mockTargetResult, mockTargetResult2],
        15,
        true
      );

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalled();
      expect(mockActor2.createEmbeddedDocuments).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    test('should process multiple effects per target', async () => {
      const mockEffectEntry2 = {
        threshold: { type: 'oneSuccess' },
        itemData: global.testUtils.createMockItem({
          name: 'Test Effect 2',
          type: 'gear'
        })
      };

      mockActor.createEmbeddedDocuments.mockResolvedValue([mockEffectEntry.itemData, mockEffectEntry2.itemData]);

      const result = await EffectAttachment.applyThresholdEffects(
        [mockEffectEntry, mockEffectEntry2],
        [mockTargetResult],
        15,
        true
      );

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    test('should catch and return error result when effect application throws error', async () => {
      mockActor.createEmbeddedDocuments.mockRejectedValue(new Error('Test error'));

      const result = await EffectAttachment.applyThresholdEffects(
        [mockEffectEntry],
        [mockTargetResult],
        15,
        true
      );

      expect(result).toHaveLength(1);
      expect(result[0].applied).toBe(false);
      expect(result[0].error).toBe('Test error');
      expect(result[0].target).toBe(mockActor);
      expect(result[0].effect).toBe(mockEffectEntry.itemData);
      expect(result[0].threshold).toBe(mockEffectEntry.threshold);
    });

    test('should populate all result fields correctly when applied', async () => {
      mockActor.createEmbeddedDocuments.mockResolvedValue([mockEffectEntry.itemData]);

      const result = await EffectAttachment.applyThresholdEffects(
        [mockEffectEntry],
        [mockTargetResult],
        15,
        true
      );

      expect(result[0]).toHaveProperty('target', mockActor);
      expect(result[0]).toHaveProperty('effect', mockEffectEntry.itemData);
      expect(result[0]).toHaveProperty('threshold', mockEffectEntry.threshold);
      expect(result[0]).toHaveProperty('applied', true);
    });

    test('should populate all result fields correctly when needs GM application', async () => {
      const result = await EffectAttachment.applyThresholdEffects(
        [mockEffectEntry],
        [mockTargetResult],
        15,
        false
      );

      expect(result[0]).toHaveProperty('target', mockActor);
      expect(result[0]).toHaveProperty('effect', mockEffectEntry.itemData);
      expect(result[0]).toHaveProperty('threshold', mockEffectEntry.threshold);
      expect(result[0]).toHaveProperty('needsGMApplication', true);
    });
  });

  describe('checkThreshold()', () => {
    test('should return oneHit (default) when threshold is undefined', () => {
      const result = EffectAttachment.checkThreshold(undefined, true, false, 15);
      expect(result).toBe(true);
    });

    test('should return oneHit (default) when threshold is null', () => {
      const result = EffectAttachment.checkThreshold(null, true, false, 15);
      expect(result).toBe(true);
    });

    test('should return false when threshold type is "never"', () => {
      const threshold = { type: 'never' };
      const result = EffectAttachment.checkThreshold(threshold, true, false, 15);
      expect(result).toBe(false);
    });

    test('should return oneHit when type is "oneSuccess" and oneHit is true', () => {
      const threshold = { type: 'oneSuccess' };
      const result = EffectAttachment.checkThreshold(threshold, true, false, 15);
      expect(result).toBe(true);
    });

    test('should return oneHit when type is "oneSuccess" and oneHit is false', () => {
      const threshold = { type: 'oneSuccess' };
      const result = EffectAttachment.checkThreshold(threshold, false, false, 15);
      expect(result).toBe(false);
    });

    test('should return bothHit when type is "twoSuccesses" and bothHit is true', () => {
      const threshold = { type: 'twoSuccesses' };
      const result = EffectAttachment.checkThreshold(threshold, true, true, 15);
      expect(result).toBe(true);
    });

    test('should return bothHit when type is "twoSuccesses" and bothHit is false', () => {
      const threshold = { type: 'twoSuccesses' };
      const result = EffectAttachment.checkThreshold(threshold, true, false, 15);
      expect(result).toBe(false);
    });

    test('should return true when type is "rollValue" and rollTotal meets threshold', () => {
      const threshold = { type: 'rollValue', value: 15 };
      const result = EffectAttachment.checkThreshold(threshold, false, false, 18);
      expect(result).toBe(true);
    });

    test('should return false when type is "rollValue" and rollTotal below threshold', () => {
      const threshold = { type: 'rollValue', value: 15 };
      const result = EffectAttachment.checkThreshold(threshold, false, false, 12);
      expect(result).toBe(false);
    });

    test('should return true when type is "rollValue" and rollTotal equals threshold', () => {
      const threshold = { type: 'rollValue', value: 15 };
      const result = EffectAttachment.checkThreshold(threshold, false, false, 15);
      expect(result).toBe(true);
    });

    test('should return oneHit (default) when threshold type is unknown', () => {
      const threshold = { type: 'unknownType' };
      const result = EffectAttachment.checkThreshold(threshold, true, false, 15);
      expect(result).toBe(true);
    });

    test('should use 15 as default when rollValue threshold has no value property', () => {
      const threshold = { type: 'rollValue' };
      const result = EffectAttachment.checkThreshold(threshold, false, false, 15);
      expect(result).toBe(true);
    });

    test('should return false when rollValue threshold has no value property and roll is 14', () => {
      const threshold = { type: 'rollValue' };
      const result = EffectAttachment.checkThreshold(threshold, false, false, 14);
      expect(result).toBe(false);
    });
  });

  describe('validateThreshold()', () => {
    test('should return true with valid threshold type', () => {
      const threshold = { type: 'oneSuccess' };
      const result = EffectAttachment.validateThreshold(threshold);
      expect(result).toBe(true);
    });

    test('should return false when threshold is undefined', () => {
      const result = EffectAttachment.validateThreshold(undefined);
      expect(result).toBe(false);
    });

    test('should return false when threshold is null', () => {
      const result = EffectAttachment.validateThreshold(null);
      expect(result).toBe(false);
    });

    test('should return false with invalid threshold type', () => {
      const threshold = { type: 'invalidType' };
      const result = EffectAttachment.validateThreshold(threshold);
      expect(result).toBe(false);
    });

    test('should return true with rollValue type and valid value (1-30)', () => {
      const threshold = { type: 'rollValue', value: 15 };
      const result = EffectAttachment.validateThreshold(threshold);
      expect(result).toBe(true);
    });

    test('should return true with rollValue type and value = 1 (boundary)', () => {
      const threshold = { type: 'rollValue', value: 1 };
      const result = EffectAttachment.validateThreshold(threshold);
      expect(result).toBe(true);
    });

    test('should return true with rollValue type and value = 30 (boundary)', () => {
      const threshold = { type: 'rollValue', value: 30 };
      const result = EffectAttachment.validateThreshold(threshold);
      expect(result).toBe(true);
    });

    test('should return false with rollValue type and value = 0 (below boundary)', () => {
      const threshold = { type: 'rollValue', value: 0 };
      const result = EffectAttachment.validateThreshold(threshold);
      expect(result).toBe(false);
    });

    test('should return false with rollValue type and value = 31 (above boundary)', () => {
      const threshold = { type: 'rollValue', value: 31 };
      const result = EffectAttachment.validateThreshold(threshold);
      expect(result).toBe(false);
    });

    test('should return false with rollValue type and non-number value', () => {
      const threshold = { type: 'rollValue', value: '15' };
      const result = EffectAttachment.validateThreshold(threshold);
      expect(result).toBe(false);
    });

    test('should return false with rollValue type and missing value property', () => {
      const threshold = { type: 'rollValue' };
      const result = EffectAttachment.validateThreshold(threshold);
      expect(result).toBe(false);
    });

    test('should return true with "twoSuccesses" type', () => {
      const threshold = { type: 'twoSuccesses' };
      const result = EffectAttachment.validateThreshold(threshold);
      expect(result).toBe(true);
    });

    test('should return true with "never" type', () => {
      const threshold = { type: 'never' };
      const result = EffectAttachment.validateThreshold(threshold);
      expect(result).toBe(true);
    });
  });

  describe('createDefaultThreshold()', () => {
    test('should create oneSuccess threshold with no parameters', () => {
      const result = EffectAttachment.createDefaultThreshold();
      expect(result).toEqual({
        type: 'oneSuccess',
        value: undefined
      });
    });

    test('should create correct threshold with type "oneSuccess"', () => {
      const result = EffectAttachment.createDefaultThreshold('oneSuccess');
      expect(result).toEqual({
        type: 'oneSuccess',
        value: undefined
      });
    });

    test('should create correct threshold with type "twoSuccesses"', () => {
      const result = EffectAttachment.createDefaultThreshold('twoSuccesses');
      expect(result).toEqual({
        type: 'twoSuccesses',
        value: undefined
      });
    });

    test('should create correct threshold with type "never"', () => {
      const result = EffectAttachment.createDefaultThreshold('never');
      expect(result).toEqual({
        type: 'never',
        value: undefined
      });
    });

    test('should add value: 15 (default) with type "rollValue" only', () => {
      const result = EffectAttachment.createDefaultThreshold('rollValue');
      expect(result).toEqual({
        type: 'rollValue',
        value: 15
      });
    });

    test('should create correct threshold with type "rollValue" and value 20', () => {
      const result = EffectAttachment.createDefaultThreshold('rollValue', 20);
      expect(result).toEqual({
        type: 'rollValue',
        value: 20
      });
    });

    test('should use custom default value parameter', () => {
      const result = EffectAttachment.createDefaultThreshold('rollValue', 18);
      expect(result).toEqual({
        type: 'rollValue',
        value: 18
      });
    });

    test('should not include value for non-rollValue types even if provided', () => {
      const result = EffectAttachment.createDefaultThreshold('oneSuccess', 15);
      expect(result).toEqual({
        type: 'oneSuccess',
        value: undefined
      });
    });
  });

  describe('getThresholdDescription()', () => {
    test('should return default description when threshold is undefined', () => {
      const result = EffectAttachment.getThresholdDescription(undefined);
      expect(result).toBe('On one success');
    });

    test('should return default description when threshold is null', () => {
      const result = EffectAttachment.getThresholdDescription(null);
      expect(result).toBe('On one success');
    });

    test('should return "Never" when type is "never"', () => {
      const threshold = { type: 'never' };
      const result = EffectAttachment.getThresholdDescription(threshold);
      expect(result).toBe('Never');
    });

    test('should return "On one success" when type is "oneSuccess"', () => {
      const threshold = { type: 'oneSuccess' };
      const result = EffectAttachment.getThresholdDescription(threshold);
      expect(result).toBe('On one success');
    });

    test('should return "On two successes" when type is "twoSuccesses"', () => {
      const threshold = { type: 'twoSuccesses' };
      const result = EffectAttachment.getThresholdDescription(threshold);
      expect(result).toBe('On two successes');
    });

    test('should return "On roll 15+" when type is "rollValue" and value is 15', () => {
      const threshold = { type: 'rollValue', value: 15 };
      const result = EffectAttachment.getThresholdDescription(threshold);
      expect(result).toBe('On roll 15+');
    });

    test('should return "On roll 18+" when type is "rollValue" and value is 18', () => {
      const threshold = { type: 'rollValue', value: 18 };
      const result = EffectAttachment.getThresholdDescription(threshold);
      expect(result).toBe('On roll 18+');
    });

    test('should return "On roll 15+" when type is "rollValue" and no value', () => {
      const threshold = { type: 'rollValue' };
      const result = EffectAttachment.getThresholdDescription(threshold);
      expect(result).toBe('On roll 15+');
    });

    test('should return "Unknown condition" when threshold type is unknown', () => {
      const threshold = { type: 'unknownType' };
      const result = EffectAttachment.getThresholdDescription(threshold);
      expect(result).toBe('Unknown condition');
    });
  });
});