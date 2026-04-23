// @ts-nocheck
/**
 * @fileoverview StatusEffectApplicator Service Tests
 *
 * Unit tests for the StatusEffectApplicator service which provides
 * centralized status effect application for action card execution.
 * Handles effect filtering, gear inventory reduction, status intensification,
 * and error handling per effect.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

import { StatusEffectApplicator } from '../../../module/services/status-effect-applicator.mjs';
import { InventoryUtils } from '../../../module/helpers/_module.mjs';
import * as statusIntensificationModule from '../../../module/helpers/status-intensification.mjs';

// Mock dependencies
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../../../module/helpers/_module.mjs', () => ({
  InventoryUtils: {
    findGearByName: vi.fn()
  }
}));

vi.mock('../../../module/helpers/status-intensification.mjs', () => ({
  StatusIntensification: {
    applyOrIntensifyStatus: vi.fn()
  }
}));

/**
 * Helper to create a mock result object
 * @param {object} options - Configuration options
 * @param {object} [options.target] - Mock target actor
 * @param {boolean} [options.oneHit] - Whether one die hit
 * @param {boolean} [options.bothHit] - Whether both dice hit
 * @returns {object} Mock result
 */
function createMockResult(options = {}) {
  const { target, oneHit = false, bothHit = false } = options;
  return {
    target,
    oneHit,
    bothHit
  };
}

/**
 * Helper to create a mock roll
 * @param {object} options - Configuration options
 * @param {number} [options.total] - Roll total
 * @param {number[]} [options.dice] - Individual die results
 * @param {string} [options.formula] - Roll formula
 * @returns {object} Mock roll
 */
function createMockRoll(options = {}) {
  const { total = 15, dice = [8, 7], formula = '2d8' } = options;
  return {
    total,
    dice,
    formula,
    evaluate: vi.fn()
  };
}

/**
 * Helper to create a mock actor
 * @param {object} options - Configuration options
 * @param {string} [options.id] - Actor ID
 * @param {string} [options.name] - Actor name
 * @returns {object} Mock actor
 */
function createMockActor(options = {}) {
  const { id = 'actor-123', name = 'Test Actor' } = options;
  return {
    id,
    _id: id,
    name,
    createEmbeddedDocuments: vi.fn().mockResolvedValue([]),
    items: {
      find: vi.fn()
    }
  };
}

/**
 * Helper to create a mock status effect
 * @param {object} options - Configuration options
 * @param {string} [options._id] - Effect ID
 * @param {string} [options.name] - Effect name
 * @param {string} [options.type] - Effect type (status, gear, etc.)
 * @param {object} [options.system] - Effect system data
 * @returns {object} Mock status effect
 */
function createMockEffect(options = {}) {
  const {
    _id = 'effect-123',
    name = 'Paralyzed',
    type = 'status',
    system = {}
  } = options;
  return {
    _id,
    id: _id,
    name,
    type,
    system
  };
}

/**
 * Helper to create a mock gear item
 * @param {object} options - Configuration options
 * @param {string} [options.id] - Item ID
 * @param {string} [options.name] - Item name
 * @param {number} [options.quantity] - Item quantity
 * @returns {object} Mock gear item
 */
function createMockGearItem(options = {}) {
  const { id = 'gear-123', name = 'Potion of Healing', quantity = 3 } = options;
  return {
    id,
    _id: id,
    name,
    type: 'gear',
    system: { quantity },
    update: vi.fn().mockResolvedValue(undefined)
  };
}

describe('StatusEffectApplicator', () => {
  describe('processStatusResults', () => {
    let sourceActor;
    let targetActor;
    let rollResult;
    let embeddedStatusEffects;
    let attackChain;
    let repetitionContext;
    let shouldApplyEffect;
    let waitForDelay;

    beforeEach(() => {
      vi.clearAllMocks();

      sourceActor = createMockActor({ id: 'source-actor', name: 'Source Actor' });
      targetActor = createMockActor({ id: 'target-actor', name: 'Target Actor' });
      rollResult = createMockRoll({ total: 18 });
      embeddedStatusEffects = [createMockEffect({ name: 'Paralyzed' })];
      attackChain = {
        statusCondition: 'always',
        statusThreshold: 15
      };
      repetitionContext = {
        statusApplicationLimit: 1,
        statusApplicationCounts: new Map(),
        appliedStatusEffects: new Set()
      };
      shouldApplyEffect = vi.fn().mockReturnValue(true);
      waitForDelay = vi.fn().mockResolvedValue(undefined);

      // Mock StatusIntensification
      statusIntensificationModule.StatusIntensification.applyOrIntensifyStatus =
        vi.fn().mockResolvedValue({ applied: true, intensified: false });
    });

    test('should return empty array when no embedded status effects provided', async () => {
      const context = {
        results: [createMockResult({ target: targetActor })],
        embeddedStatusEffects: [],
        attackChain,
        repetitionContext,
        sourceActor,
        shouldApplyEffect,
        waitForDelay,
        disableDelays: false,
        isFinalRepetition: true,
        attemptInventoryReduction: false
      };

      const result = await StatusEffectApplicator.processStatusResults(context);

      expect(result).toEqual([]);
      expect(shouldApplyEffect).not.toHaveBeenCalled();
    });

    test('should skip invalid result structures without target', async () => {
      const context = {
        results: [createMockResult({ target: null }), { target: targetActor }],
        rollResult,
        embeddedStatusEffects,
        attackChain,
        repetitionContext,
        sourceActor,
        shouldApplyEffect,
        waitForDelay,
        disableDelays: false,
        isFinalRepetition: true,
        attemptInventoryReduction: false
      };

      const result = await StatusEffectApplicator.processStatusResults(context);

      // Should skip the invalid result and process the valid one
      expect(shouldApplyEffect).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });

    test('should apply effect when shouldApplyEffect returns true', async () => {
      const context = {
        results: [createMockResult({ target: targetActor })],
        rollResult,
        embeddedStatusEffects,
        attackChain,
        repetitionContext,
        sourceActor,
        shouldApplyEffect,
        waitForDelay,
        disableDelays: false,
        isFinalRepetition: true,
        attemptInventoryReduction: false
      };

      const result = await StatusEffectApplicator.processStatusResults(context);

      expect(shouldApplyEffect).toHaveBeenCalledWith(
        'always',
        false,
        false,
        18,
        15,
        rollResult,
        sourceActor,
        '2d8'
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        target: targetActor,
        effect: expect.any(Object),
        applied: true
      });
    });

    test('should not apply effect when shouldApplyEffect returns false', async () => {
      shouldApplyEffect.mockReturnValue(false);

      const context = {
        results: [createMockResult({ target: targetActor })],
        rollResult,
        embeddedStatusEffects,
        attackChain,
        repetitionContext,
        sourceActor,
        shouldApplyEffect,
        waitForDelay,
        disableDelays: false,
        isFinalRepetition: true,
        attemptInventoryReduction: false
      };

      const result = await StatusEffectApplicator.processStatusResults(context);

      expect(result).toHaveLength(0);
    });

    test('should handle errors and rethrow', async () => {
      // Mock the processGearEffect to throw an error (gear effects path)
      const originalProcessGear = StatusEffectApplicator.processGearEffect;
      StatusEffectApplicator.processGearEffect = vi.fn().mockRejectedValue(
        new Error('Gear processing error')
      );

      const gearEffect = createMockEffect({ name: 'Potion', type: 'gear' });
      embeddedStatusEffects = [gearEffect];

      const context = {
        results: [createMockResult({ target: targetActor })],
        rollResult,
        embeddedStatusEffects,
        attackChain,
        repetitionContext,
        sourceActor,
        shouldApplyEffect,
        waitForDelay,
        disableDelays: false,
        isFinalRepetition: true,
        attemptInventoryReduction: true
      };

      await expect(StatusEffectApplicator.processStatusResults(context)).rejects.toThrow(
        'Gear processing error'
      );

      // Restore original method
      StatusEffectApplicator.processGearEffect = originalProcessGear;
    });

    test('should respect selectedEffectIds when provided', async () => {
      const effect1 = createMockEffect({ _id: 'effect-1', name: 'Paralyzed' });
      const effect2 = createMockEffect({ _id: 'effect-2', name: 'Stunned' });
      embeddedStatusEffects = [effect1, effect2];
      repetitionContext.selectedEffectIds = ['effect-1'];

      const context = {
        results: [createMockResult({ target: targetActor })],
        rollResult,
        embeddedStatusEffects,
        attackChain,
        repetitionContext,
        sourceActor,
        shouldApplyEffect,
        waitForDelay,
        disableDelays: false,
        isFinalRepetition: true,
        attemptInventoryReduction: false
      };

      const result = await StatusEffectApplicator.processStatusResults(context);

      // Only effect-1 should be applied
      expect(result).toHaveLength(1);
      expect(result[0].effect._id).toBe('effect-1');
    });

    test('should process multiple targets correctly', async () => {
      const target2 = createMockActor({ id: 'target-2', name: 'Target 2' });
      const target3 = createMockActor({ id: 'target-3', name: 'Target 3' });

      const context = {
        results: [
          createMockResult({ target: targetActor }),
          createMockResult({ target: target2 }),
          createMockResult({ target: target3 })
        ],
        rollResult,
        embeddedStatusEffects,
        attackChain,
        repetitionContext,
        sourceActor,
        shouldApplyEffect,
        waitForDelay,
        disableDelays: false,
        isFinalRepetition: true,
        attemptInventoryReduction: false
      };

      const result = await StatusEffectApplicator.processStatusResults(context);

      expect(result).toHaveLength(3);
      expect(result[0].target).toBe(targetActor);
      expect(result[1].target).toBe(target2);
      expect(result[2].target).toBe(target3);
    });
  });

  describe('filterEffectsBySelection', () => {
    let embeddedStatusEffects;

    beforeEach(() => {
      embeddedStatusEffects = [
        createMockEffect({ _id: 'effect-1', name: 'Paralyzed' }),
        createMockEffect({ _id: 'effect-2', name: 'Stunned' }),
        createMockEffect({ _id: 'effect-3', name: 'Blinded' })
      ];
    });

    test('should return all effects when selectedEffectIds is null', () => {
      const result = StatusEffectApplicator.filterEffectsBySelection(embeddedStatusEffects, null);

      expect(result).toHaveLength(3);
      expect(result).toEqual(embeddedStatusEffects);
    });

    test('should return all effects when selectedEffectIds is undefined', () => {
      const result = StatusEffectApplicator.filterEffectsBySelection(
        embeddedStatusEffects,
        undefined
      );

      expect(result).toHaveLength(3);
      expect(result).toEqual(embeddedStatusEffects);
    });

    test('should filter effects when selectedEffectIds is provided', () => {
      const selectedEffectIds = ['effect-1', 'effect-3'];
      const result = StatusEffectApplicator.filterEffectsBySelection(
        embeddedStatusEffects,
        selectedEffectIds
      );

      expect(result).toHaveLength(2);
      expect(result[0]._id).toBe('effect-1');
      expect(result[1]._id).toBe('effect-3');
    });

    test('should handle effects with generated index-based IDs', () => {
      const effectsWithoutId = [
        { name: 'Effect A' },      // Generates effect-0
        { name: 'Effect B', _id: 'effect-2' },
        { name: 'Effect C' }       // Generates effect-2 (collision!)
      ];

      // Both effect-2 (explicit ID of Effect B) and effect-2 (generated ID for Effect C index 2)
      // should match, so we get 2 results
      const selected = ['effect-2'];
      const result = StatusEffectApplicator.filterEffectsBySelection(effectsWithoutId, selected);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Effect B');
      expect(result[1].name).toBe('Effect C');
    });

    test('should return empty array when no selectedEffectIds match', () => {
      const selectedEffectIds = ['effect-999', 'effect-888'];
      const result = StatusEffectApplicator.filterEffectsBySelection(
        embeddedStatusEffects,
        selectedEffectIds
      );

      expect(result).toHaveLength(0);
    });

    test('should return empty array when selectedEffectIds is empty array', () => {
      const selectedEffectIds = [];
      const result = StatusEffectApplicator.filterEffectsBySelection(
        embeddedStatusEffects,
        selectedEffectIds
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('applyEffectsToTarget', () => {
    let sourceActor;
    let targetActor;
    let effectsToApply;
    let repetitionContext;
    let waitForDelay;

    beforeEach(() => {
      vi.clearAllMocks();

      sourceActor = createMockActor({ id: 'source-actor', name: 'Source Actor' });
      targetActor = createMockActor({ id: 'target-actor', name: 'Target Actor' });
      effectsToApply = [createMockEffect({ name: 'Paralyzed' })];
      repetitionContext = {
        statusApplicationLimit: 1,
        statusApplicationCounts: new Map(),
        appliedStatusEffects: new Set()
      };
      waitForDelay = vi.fn().mockResolvedValue(undefined);

      // Mock StatusIntensification
      statusIntensificationModule.StatusIntensification.applyOrIntensifyStatus =
        vi.fn().mockResolvedValue({ applied: true, intensified: false });
    });

    test('should skip target when status application limit is reached', async () => {
      repetitionContext.statusApplicationCounts.set('target-actor', 1);

      const params = {
        target: targetActor,
        effectsToApply,
        sourceActor,
        attemptInventoryReduction: false,
        repetitionContext,
        disableDelays: false,
        isFinalRepetition: true,
        waitForDelay
      };

      const result = await StatusEffectApplicator.applyEffectsToTarget(params);

      expect(result).toHaveLength(0);
      expect(
        statusIntensificationModule.StatusIntensification.applyOrIntensifyStatus
      ).not.toHaveBeenCalled();
    });

    test('should apply effects when limit is not reached', async () => {
      const params = {
        target: targetActor,
        effectsToApply,
        sourceActor,
        attemptInventoryReduction: false,
        repetitionContext,
        disableDelays: false,
        isFinalRepetition: true,
        waitForDelay
      };

      const result = await StatusEffectApplicator.applyEffectsToTarget(params);

      expect(result).toHaveLength(1);
      expect(result[0].applied).toBe(true);
      expect(repetitionContext.statusApplicationCounts.get('target-actor')).toBe(1);
    });

    test('should skip effects without proper structure', async () => {
      effectsToApply = [
        createMockEffect({ name: 'Valid Effect' }),
        null, // Invalid
        { _id: 'invalid', system: {} } // Effect with _id but no name (will still be processed)
      ];

      const params = {
        target: targetActor,
        effectsToApply,
        sourceActor,
        attemptInventoryReduction: false,
        repetitionContext,
        disableDelays: false,
        isFinalRepetition: true,
        waitForDelay
      };

      const result = await StatusEffectApplicator.applyEffectsToTarget(params);

      // null is skipped, but the third effect is processed (has _id)
      expect(result).toHaveLength(2);
      expect(result[0].effect.name).toBe('Valid Effect');
    });

    test('should apply multiple effects to target', async () => {
      effectsToApply = [
        createMockEffect({ _id: 'effect-1', name: 'Paralyzed' }),
        createMockEffect({ _id: 'effect-2', name: 'Stunned' }),
        createMockEffect({ _id: 'effect-3', name: 'Blinded' })
      ];

      const params = {
        target: targetActor,
        effectsToApply,
        sourceActor,
        attemptInventoryReduction: false,
        repetitionContext,
        disableDelays: false,
        isFinalRepetition: true,
        waitForDelay
      };

      const result = await StatusEffectApplicator.applyEffectsToTarget(params);

      expect(result).toHaveLength(3);
      expect(result.every((r) => r.applied)).toBe(true);
      expect(repetitionContext.statusApplicationCounts.get('target-actor')).toBe(1);
    });

    test('should increment status application count after applying effects', async () => {
      // Set count to 2 and increase limit to allow more applications
      repetitionContext.statusApplicationCounts.set('target-actor', 2);
      repetitionContext.statusApplicationLimit = 5;

      const params = {
        target: targetActor,
        effectsToApply,
        sourceActor,
        attemptInventoryReduction: false,
        repetitionContext,
        disableDelays: false,
        isFinalRepetition: true,
        waitForDelay
      };

      await StatusEffectApplicator.applyEffectsToTarget(params);

      // The count is set to currentCount + 1, where currentCount is 2
      // So the new value should be 3
      expect(repetitionContext.statusApplicationCounts.get('target-actor')).toBe(3);
    });

    test('should not increment count when repetitionContext has no counts', async () => {
      const params = {
        target: targetActor,
        effectsToApply,
        sourceActor,
        attemptInventoryReduction: false,
        repetitionContext: {
          statusApplicationLimit: 1,
          statusApplicationCounts: null
        },
        disableDelays: false,
        isFinalRepetition: true,
        waitForDelay
      };

      const result = await StatusEffectApplicator.applyEffectsToTarget(params);

      expect(result).toHaveLength(1);
      // Should not throw when counts is null
    });
  });

  describe('processGearEffect', () => {
    let sourceActor;
    let gearEffectData;

    beforeEach(() => {
      vi.clearAllMocks();

      sourceActor = createMockActor({ id: 'source-actor', name: 'Source Actor' });
      gearEffectData = createMockEffect({
        type: 'gear',
        name: 'Potion of Healing',
        system: { cost: 1 }
      });
    });

    test('should return invalid when gear not found in inventory', async () => {
      const testTarget = createMockActor({ id: 'target-actor', name: 'Target Actor' });
      vi.mocked(InventoryUtils.findGearByName).mockReturnValue(null);

      const params = { effectData: gearEffectData, sourceActor, target: testTarget };

      const result = await StatusEffectApplicator.processGearEffect(params);

      expect(result.valid).toBe(false);
      expect(result.gearItem).toBeNull();
      expect(result.result).toBeDefined();
      expect(result.result).toHaveProperty('target');
      expect(result.result).toHaveProperty('effect');
      expect(result.result).toHaveProperty('applied', false);
      expect(result.result).toHaveProperty('warning');
    });

    test('should return invalid when insufficient quantity', async () => {
      const testTarget = createMockActor({ id: 'target-actor', name: 'Target Actor' });
      const gearItem = createMockGearItem({ name: 'Potion of Healing', quantity: 0 });
      vi.mocked(InventoryUtils.findGearByName).mockReturnValue(gearItem);

      const params = { effectData: gearEffectData, sourceActor, target: testTarget };

      const result = await StatusEffectApplicator.processGearEffect(params);

      expect(result.valid).toBe(false);
      expect(result.gearItem).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.result).toHaveProperty('target');
      expect(result.result).toHaveProperty('effect');
      expect(result.result).toHaveProperty('applied', false);
      expect(result.result).toHaveProperty('warning');
    });

    test('should reduce inventory and return valid when found with sufficient quantity', async () => {
      const testTarget = createMockActor({ id: 'target-actor', name: 'Target Actor' });
      const gearItem = createMockGearItem({ name: 'Potion of Healing', quantity: 5 });
      vi.mocked(InventoryUtils.findGearByName).mockReturnValue(gearItem);

      const params = { effectData: gearEffectData, sourceActor, target: testTarget };

      const result = await StatusEffectApplicator.processGearEffect(params);

      expect(result.valid).toBe(true);
      expect(result.gearItem).toBe(gearItem);
      expect(result.result).toBeNull();
      expect(gearItem.update).toHaveBeenCalledWith({ 'system.quantity': 4 });
    });

    test('should reduce quantity to zero when matching required quantity', async () => {
      const testTarget = createMockActor({ id: 'target-actor', name: 'Target Actor' });
      const gearItem = createMockGearItem({ name: 'Potion of Healing', quantity: 1 });
      vi.mocked(InventoryUtils.findGearByName).mockReturnValue(gearItem);

      const params = { effectData: gearEffectData, sourceActor, target: testTarget };

      const result = await StatusEffectApplicator.processGearEffect(params);

      expect(result.valid).toBe(true);
      expect(gearItem.update).toHaveBeenCalledWith({ 'system.quantity': 0 });
    });

    test('should handle zero cost gear', async () => {
      const testTarget = createMockActor({ id: 'target-actor', name: 'Target Actor' });
      gearEffectData.system = { cost: 0 };
      const gearItem = createMockGearItem({ name: 'Free Potion', quantity: 5 });
      vi.mocked(InventoryUtils.findGearByName).mockReturnValue(gearItem);

      const params = { effectData: gearEffectData, sourceActor, target: testTarget };

      const result = await StatusEffectApplicator.processGearEffect(params);

      expect(result.valid).toBe(true);
      expect(gearItem.update).toHaveBeenCalledWith({ 'system.quantity': 5 });
    });

    test('should handle errors and return invalid with error message', async () => {
      const testTarget = createMockActor({ id: 'target-actor', name: 'Target Actor' });
      const gearItem = createMockGearItem({ name: 'Potion of Healing', quantity: 5 });
      gearItem.update.mockRejectedValue(new Error('Update failed'));
      vi.mocked(InventoryUtils.findGearByName).mockReturnValue(gearItem);

      const params = { effectData: gearEffectData, sourceActor, target: testTarget };

      const result = await StatusEffectApplicator.processGearEffect(params);

      expect(result.valid).toBe(false);
      expect(result.result.error).toBeTruthy();
      expect(result.result.applied).toBe(false);
    });

    test('should handle missing cost in effect system', async () => {
      const testTarget = createMockActor({ id: 'target-actor', name: 'Target Actor' });
      gearEffectData.system = {}; // No cost property
      const gearItem = createMockGearItem({ name: 'Potion', quantity: 5 });
      vi.mocked(InventoryUtils.findGearByName).mockReturnValue(gearItem);

      const params = { effectData: gearEffectData, sourceActor, target: testTarget };

      const result = await StatusEffectApplicator.processGearEffect(params);

      expect(result.valid).toBe(true);
      expect(gearItem.update).toHaveBeenCalledWith({ 'system.quantity': 5 });
    });
  });

  describe('applySingleEffect', () => {
    let targetActor;
    let effectData;
    let repetitionContext;
    let waitForDelay;

    beforeEach(() => {
      vi.clearAllMocks();

      targetActor = createMockActor({ id: 'target-actor', name: 'Target Actor' });
      effectData = createMockEffect({ name: 'Paralyzed', type: 'status' });
      repetitionContext = {
        appliedStatusEffects: new Set()
      };
      waitForDelay = vi.fn().mockResolvedValue(undefined);

      // Mock StatusIntensification
      statusIntensificationModule.StatusIntensification.applyOrIntensifyStatus =
        vi.fn().mockResolvedValue({ applied: true, intensified: false });
    });

    test('should apply status effect with proper flags', async () => {
      const params = {
        effectData,
        target: targetActor,
        effectKey: 'target-actor-Paralyzed',
        repetitionContext,
        disableDelays: true,
        isFinalRepetition: true,
        waitForDelay
      };

      const result = await StatusEffectApplicator.applySingleEffect(params);

      expect(result).toMatchObject({
        target: targetActor,
        effect: effectData,
        applied: true,
        intensified: false
      });

      // Check that effectFlags are set correctly
      expect(effectData.flags).toBeDefined();
      expect(effectData.flags['eventide-rp-system']).toBeDefined();
      expect(effectData.flags['eventide-rp-system'].isEffect).toBe(true);
    });

    test('should mark gear effects as equipped and set quantity to 1', async () => {
      effectData = createMockEffect({ name: 'Potion', type: 'gear' });

      const params = {
        effectData,
        target: targetActor,
        effectKey: 'target-actor-Potion',
        repetitionContext,
        disableDelays: true,
        isFinalRepetition: true,
        waitForDelay
      };

      const result = await StatusEffectApplicator.applySingleEffect(params);

      expect(result.applied).toBe(true);
      expect(effectData.system.equipped).toBe(true);
      expect(effectData.system.quantity).toBe(1);
    });

    test('should wait for delay when applicable', async () => {
      const params = {
        effectData,
        target: targetActor,
        effectKey: 'target-actor-Paralyzed',
        repetitionContext,
        disableDelays: false,
        isFinalRepetition: false,
        waitForDelay
      };

      await StatusEffectApplicator.applySingleEffect(params);

      expect(waitForDelay).toHaveBeenCalledTimes(1);
    });

    test('should not wait for delay on final repetition', async () => {
      const params = {
        effectData,
        target: targetActor,
        effectKey: 'target-actor-Paralyzed',
        repetitionContext,
        disableDelays: false,
        isFinalRepetition: true,
        waitForDelay
      };

      await StatusEffectApplicator.applySingleEffect(params);

      expect(waitForDelay).not.toHaveBeenCalled();
    });

    test('should not wait for delay when delays are disabled', async () => {
      const params = {
        effectData,
        target: targetActor,
        effectKey: 'target-actor-Paralyzed',
        repetitionContext,
        disableDelays: true,
        isFinalRepetition: false,
        waitForDelay
      };

      await StatusEffectApplicator.applySingleEffect(params);

      expect(waitForDelay).not.toHaveBeenCalled();
    });

    test('should track applied effect in repetition context', async () => {
      const params = {
        effectData,
        target: targetActor,
        effectKey: 'target-actor-Paralyzed',
        repetitionContext,
        disableDelays: true,
        isFinalRepetition: true,
        waitForDelay
      };

      await StatusEffectApplicator.applySingleEffect(params);

      expect(repetitionContext.appliedStatusEffects.has('target-actor-Paralyzed')).toBe(
        true
      );
    });

    test('should not track applied effect when not applied', async () => {
      statusIntensificationModule.StatusIntensification.applyOrIntensifyStatus.mockResolvedValue(
        { applied: false, intensified: false }
      );

      const params = {
        effectData,
        target: targetActor,
        effectKey: 'target-actor-Paralyzed',
        repetitionContext,
        disableDelays: true,
        isFinalRepetition: true,
        waitForDelay
      };

      await StatusEffectApplicator.applySingleEffect(params);

      expect(repetitionContext.appliedStatusEffects.has('target-actor-Paralyzed')).toBe(
        false
      );
    });

    test('should handle errors and return result with error', async () => {
      statusIntensificationModule.StatusIntensification.applyOrIntensifyStatus.mockRejectedValue(
        new Error('Application failed')
      );

      const params = {
        effectData,
        target: targetActor,
        effectKey: 'target-actor-Paralyzed',
        repetitionContext,
        disableDelays: true,
        isFinalRepetition: true,
        waitForDelay
      };

      const result = await StatusEffectApplicator.applySingleEffect(params);

      expect(result).toMatchObject({
        target: targetActor,
        effect: effectData,
        applied: false,
        error: 'Application failed'
      });
    });

    test('should report intensified status when effect is intensified', async () => {
      statusIntensificationModule.StatusIntensification.applyOrIntensifyStatus.mockResolvedValue(
        { applied: true, intensified: true }
      );

      const params = {
        effectData,
        target: targetActor,
        effectKey: 'target-actor-Paralyzed',
        repetitionContext,
        disableDelays: true,
        isFinalRepetition: true,
        waitForDelay
      };

      const result = await StatusEffectApplicator.applySingleEffect(params);

      expect(result.intensified).toBe(true);
    });

    test('should handle effects without flags property', async () => {
      const effectWithoutFlags = createMockEffect({ name: 'Test', type: 'status' });
      delete effectWithoutFlags.flags;

      const params = {
        effectData: effectWithoutFlags,
        target: targetActor,
        effectKey: 'target-actor-Test',
        repetitionContext,
        disableDelays: true,
        isFinalRepetition: true,
        waitForDelay
      };

      const result = await StatusEffectApplicator.applySingleEffect(params);

      expect(result.applied).toBe(true);
      expect(effectWithoutFlags.flags).toBeDefined();
      expect(effectWithoutFlags.flags['eventide-rp-system'].isEffect).toBe(true);
    });
  });
});