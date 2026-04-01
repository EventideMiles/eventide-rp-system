// @ts-nocheck
/**
 * @fileoverview RepetitionHandler Service Tests
 *
 * Unit tests for the RepetitionHandler service which handles
 * repetition count calculation, context management, and result aggregation
 * for action card execution.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Mock dependencies before import
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    methodEntry: vi.fn(),
    methodExit: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Import the service after setting up mocks
import { RepetitionHandler } from '../../../module/services/repetition-handler.mjs';
import { Logger } from '../../../module/services/logger.mjs';

describe('RepetitionHandler', () => {
  let mockActor;
  let mockRoll;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock actor
    mockActor = {
      id: 'actor-123',
      name: 'Test Actor',
      getRollData: vi.fn(() => ({
        abilities: {
          acro: { ac: { total: 14 } },
          phys: { ac: { total: 16 } }
        }
      }))
    };

    // Create mock roll
    mockRoll = {
      formula: '1d4',
      total: 3,
      evaluate: vi.fn(async () => mockRoll)
    };

    // Mock Roll constructor
    global.Roll = vi.fn((_formula, _data) => mockRoll);

    // Mock game settings
    global.game = {
      settings: {
        get: vi.fn((module, key) => {
          if (key === 'actionCardExecutionLimit') return 10;
          if (key === 'actionCardExecutionDelay') return 500;
          return 0;
        })
      },
      user: {
        isGM: true
      },
      i18n: {
        format: vi.fn(() => 'Formatted message')
      }
    };

    // Mock ui.notifications
    global.ui = {
      notifications: {
        warn: vi.fn()
      }
    };
  });

  describe('calculateRepetitionCount()', () => {
    test('should calculate repetition count from formula', async () => {
      // Arrange
      mockRoll.total = 3;

      // Act
      const result = await RepetitionHandler.calculateRepetitionCount('1d4', mockActor);

      // Assert
      expect(global.Roll).toHaveBeenCalledWith('1d4', mockActor.getRollData());
      expect(mockRoll.evaluate).toHaveBeenCalled();
      expect(result.count).toBe(3);
      expect(result.roll).toBe(mockRoll);
    });

    test('should default to 1 when formula is null', async () => {
      // Arrange
      mockRoll.total = 1;

      // Act
      const result = await RepetitionHandler.calculateRepetitionCount(null, mockActor);

      // Assert
      expect(global.Roll).toHaveBeenCalledWith('1', mockActor.getRollData());
      expect(result.count).toBe(1);
    });

    test('should adjust zero count to minimum of 1', async () => {
      // Arrange
      mockRoll.total = 0;

      // Act
      const result = await RepetitionHandler.calculateRepetitionCount('0', mockActor);

      // Assert
      expect(result.count).toBe(1);
      const { Logger } = await import('../../../module/services/logger.mjs');
      expect(Logger.warn).toHaveBeenCalledWith(
        'Repetition formula resulted in 0, adjusting to minimum of 1',
        { formula: '0', originalCount: 0 },
        'ACTION_CARD'
      );
      expect(global.ui.notifications.warn).toHaveBeenCalled();
    });

    test('should adjust negative count to minimum of 1', async () => {
      // Arrange
      mockRoll.total = -2;

      // Act
      const result = await RepetitionHandler.calculateRepetitionCount('-2', mockActor);

      // Assert
      expect(result.count).toBe(1);
      const { Logger } = await import('../../../module/services/logger.mjs');
      expect(Logger.warn).toHaveBeenCalledWith(
        'Repetition formula resulted in -2, adjusting to minimum of 1',
        { formula: '-2', originalCount: -2 },
        'ACTION_CARD'
      );
      expect(global.ui.notifications.warn).toHaveBeenCalled();
    });

    test('should floor decimal results', async () => {
      // Arrange
      mockRoll.total = 3.7;

      // Act
      const result = await RepetitionHandler.calculateRepetitionCount('1d6/2', mockActor);

      // Assert
      expect(result.count).toBe(3);
    });
  });

  describe('applySystemLimit()', () => {
    test('should return original count when no system limit is set', () => {
      // Arrange
      global.game.settings.get.mockReturnValue(0);

      // Act
      const result = RepetitionHandler.applySystemLimit(5, 'Test Card');

      // Assert
      expect(result).toBe(5);
    });

    test('should return original count when below system limit', () => {
      // Arrange
      global.game.settings.get.mockReturnValue(10);

      // Act
      const result = RepetitionHandler.applySystemLimit(5, 'Test Card');

      // Assert
      expect(result).toBe(5);
    });

    test('should cap count at system limit', () => {
      // Arrange
      global.game.settings.get.mockReturnValue(10);

      // Act
      const result = RepetitionHandler.applySystemLimit(15, 'Test Card');

      // Assert
      expect(result).toBe(10);
      expect(Logger.info).toHaveBeenCalledWith(
        'Action card repetitions capped by system limit: 15 -> 10',
        { actionCardName: 'Test Card', originalCount: 15, limit: 10 },
        'ACTION_CARD'
      );
    });

    test('should use default actionCardName when not provided', () => {
      // Arrange
      global.game.settings.get.mockReturnValue(10);

      // Act
      const result = RepetitionHandler.applySystemLimit(15);

      // Assert
      expect(result).toBe(10);
      expect(Logger.info).toHaveBeenCalledWith(
        'Action card repetitions capped by system limit: 15 -> 10',
        { actionCardName: 'Unknown', originalCount: 15, limit: 10 },
        'ACTION_CARD'
      );
    });
  });

  describe('createContext()', () => {
    test('should create context with default values', () => {
      // Arrange
      const system = {
        costOnRepetition: false,
        statusApplicationLimit: 1
      };

      // Act
      const context = RepetitionHandler.createContext(system);

      // Assert
      expect(context.inExecution).toBe(true);
      expect(context.costOnRepetition).toBe(false);
      expect(context.appliedTransformations).toBeInstanceOf(Set);
      expect(context.transformationSelections).toBeInstanceOf(Map);
      expect(context.selectedEffectIds).toBeNull();
      expect(context.appliedStatusEffects).toBeInstanceOf(Set);
      expect(context.statusApplicationCounts).toBeInstanceOf(Map);
      expect(context.statusApplicationLimit).toBe(1);
      expect(context.repetitionIndex).toBe(0);
      expect(context.shouldApplyCost).toBe(true);
    });

    test('should create context with costOnRepetition enabled', () => {
      // Arrange
      const system = {
        costOnRepetition: true,
        statusApplicationLimit: 2
      };

      // Act
      const context = RepetitionHandler.createContext(system);

      // Assert
      expect(context.costOnRepetition).toBe(true);
      expect(context.statusApplicationLimit).toBe(2);
    });

    test('should create context with transformation selections from Map', () => {
      // Arrange
      const system = {};
      const selections = new Map([['power1', 'transformation1']]);

      // Act
      const context = RepetitionHandler.createContext(system, {
        transformationSelections: selections
      });

      // Assert
      expect(context.transformationSelections).toBe(selections);
    });

    test('should convert array transformation selections to Map', () => {
      // Arrange
      const system = {};
      const selections = [['power1', 'transformation1'], ['power2', 'transformation2']];

      // Act
      const context = RepetitionHandler.createContext(system, {
        transformationSelections: selections
      });

      // Assert
      expect(context.transformationSelections).toBeInstanceOf(Map);
      expect(context.transformationSelections.get('power1')).toBe('transformation1');
      expect(context.transformationSelections.get('power2')).toBe('transformation2');
    });

    test('should create context with selected effect IDs', () => {
      // Arrange
      const system = {};
      const effectIds = ['effect1', 'effect2'];

      // Act
      const context = RepetitionHandler.createContext(system, {
        selectedEffectIds: effectIds
      });

      // Assert
      expect(context.selectedEffectIds).toEqual(effectIds);
    });

    test('should handle undefined statusApplicationLimit', () => {
      // Arrange
      const system = {};

      // Act
      const context = RepetitionHandler.createContext(system);

      // Assert
      expect(context.statusApplicationLimit).toBe(1);
    });
  });

  describe('updateContextForIteration()', () => {
    test('should update context with new index', () => {
      // Arrange
      const context = {
        repetitionIndex: 0,
        shouldApplyCost: true
      };

      // Act
      RepetitionHandler.updateContextForIteration(context, 2, false);

      // Assert
      expect(context.repetitionIndex).toBe(2);
      expect(context.shouldApplyCost).toBe(false);
    });

    test('should apply cost on first iteration when costOnRepetition is false', () => {
      // Arrange
      const context = {
        repetitionIndex: 0,
        shouldApplyCost: false
      };

      // Act
      RepetitionHandler.updateContextForIteration(context, 0, false);

      // Assert
      expect(context.repetitionIndex).toBe(0);
      expect(context.shouldApplyCost).toBe(true);
    });

    test('should apply cost when costOnRepetition is true', () => {
      // Arrange
      const context = {
        repetitionIndex: 0,
        shouldApplyCost: false
      };

      // Act
      RepetitionHandler.updateContextForIteration(context, 1, true);

      // Assert
      expect(context.repetitionIndex).toBe(1);
      expect(context.shouldApplyCost).toBe(true);
    });
  });

  describe('aggregateResults()', () => {
    test('should aggregate results for attackChain mode', () => {
      // Arrange
      const results = [
        {
          success: true,
          damageResults: [{ damage: 5 }],
          statusResults: [{ status: 'stunned' }],
          targetResults: [{ id: 'target1' }],
          baseRoll: { total: 15 },
          embeddedItemRollMessage: 'message1'
        },
        {
          success: true,
          damageResults: [{ damage: 3 }],
          statusResults: [],
          targetResults: [{ id: 'target1' }],
          baseRoll: { total: 12 },
          embeddedItemRollMessage: 'message2'
        }
      ];

      // Act
      const aggregated = RepetitionHandler.aggregateResults(results, 2, 'attackChain');

      // Assert
      expect(aggregated.success).toBe(true);
      expect(aggregated.repetitionCount).toBe(2);
      expect(aggregated.results).toBe(results);
      expect(aggregated.mode).toBe('attackChain');
      expect(aggregated.damageResults).toHaveLength(2);
      expect(aggregated.statusResults).toHaveLength(1);
      expect(aggregated.targetResults).toEqual([{ id: 'target1' }]);
      expect(aggregated.baseRoll).toEqual({ total: 15 });
      expect(aggregated.embeddedItemRollMessage).toBe('message1');
      expect(aggregated.successCount).toBe(2);
      expect(aggregated.failureCount).toBe(0);
    });

    test('should aggregate results for savedDamage mode', () => {
      // Arrange
      const results = [
        {
          success: true,
          damageResults: [{ damage: 5 }],
          statusResults: []
        },
        {
          success: false,
          damageResults: [],
          statusResults: []
        }
      ];

      // Act
      const aggregated = RepetitionHandler.aggregateResults(results, 2, 'savedDamage');

      // Assert
      expect(aggregated.success).toBe(false);
      expect(aggregated.repetitionCount).toBe(2);
      expect(aggregated.mode).toBe('savedDamage');
      expect(aggregated.damageResults).toHaveLength(1);
      expect(aggregated.targetResults).toBeUndefined();
      expect(aggregated.baseRoll).toBeUndefined();
      expect(aggregated.successCount).toBe(1);
      expect(aggregated.failureCount).toBe(1);
    });

    test('should handle empty results array', () => {
      // Arrange
      const results = [];

      // Act
      const aggregated = RepetitionHandler.aggregateResults(results, 0, 'attackChain');

      // Assert
      expect(aggregated.success).toBe(true);
      expect(aggregated.repetitionCount).toBe(0);
      expect(aggregated.damageResults).toEqual([]);
      expect(aggregated.statusResults).toEqual([]);
      expect(aggregated.successCount).toBe(0);
      expect(aggregated.failureCount).toBe(0);
    });

    test('should count successes and failures correctly', () => {
      // Arrange
      const results = [
        { success: true, damageResults: [], statusResults: [] },
        { success: false, damageResults: [], statusResults: [] },
        { success: true, damageResults: [], statusResults: [] },
        { success: false, damageResults: [], statusResults: [] },
        { success: true, damageResults: [], statusResults: [] }
      ];

      // Act
      const aggregated = RepetitionHandler.aggregateResults(results, 5, 'savedDamage');

      // Assert
      expect(aggregated.successCount).toBe(3);
      expect(aggregated.failureCount).toBe(2);
    });
  });

  describe('checkIterationSuccess()', () => {
    let mockSystem;
    let mockResult;
    let mockShouldApplyEffect;

    beforeEach(() => {
      mockSystem = {
        embeddedStatusEffects: [],
        embeddedTransformations: [],
        attackChain: {
          damageFormula: '1d6',
          damageCondition: 'oneHit',
          damageThreshold: 15,
          statusCondition: 'never',
          statusThreshold: 15
        },
        transformationConfig: {
          condition: 'never',
          threshold: 15
        }
      };

      mockResult = {
        baseRoll: { total: 16, formula: '1d20+5' },
        targetResults: [
          {
            oneHit: true,
            bothHit: false
          }
        ]
      };

      mockShouldApplyEffect = vi.fn(() => false);
    });

    test('should return false when result is null', () => {
      // Act
      const result = RepetitionHandler.checkIterationSuccess(
        null,
        mockSystem,
        mockShouldApplyEffect,
        mockActor
      );

      // Assert
      expect(result).toBe(false);
    });

    test('should return false when result has no targetResults', () => {
      // Arrange
      mockResult.targetResults = null;

      // Act
      const result = RepetitionHandler.checkIterationSuccess(
        mockResult,
        mockSystem,
        mockShouldApplyEffect,
        mockActor
      );

      // Assert
      expect(result).toBe(false);
    });

    test('should return true when damage condition is met', () => {
      // Arrange
      mockShouldApplyEffect.mockReturnValue(true);

      // Act
      const result = RepetitionHandler.checkIterationSuccess(
        mockResult,
        mockSystem,
        mockShouldApplyEffect,
        mockActor
      );

      // Assert
      expect(result).toBe(true);
      expect(mockShouldApplyEffect).toHaveBeenCalledWith(
        'oneHit',
        true,
        false,
        16,
        15,
        mockResult.baseRoll,
        mockActor,
        '1d20+5'
      );
    });

    test('should return true when status condition is met', () => {
      // Arrange
      mockSystem.embeddedStatusEffects = [{ id: 'status1' }];
      mockSystem.attackChain.statusCondition = 'oneHit';
      mockShouldApplyEffect.mockReturnValue(true);

      // Act
      const result = RepetitionHandler.checkIterationSuccess(
        mockResult,
        mockSystem,
        mockShouldApplyEffect,
        mockActor
      );

      // Assert
      expect(result).toBe(true);
    });

    test('should return true when transformation condition is met', () => {
      // Arrange
      mockSystem.embeddedTransformations = [{ id: 'transformation1' }];
      mockSystem.transformationConfig.condition = 'oneHit';
      mockShouldApplyEffect.mockReturnValue(true);

      // Act
      const result = RepetitionHandler.checkIterationSuccess(
        mockResult,
        mockSystem,
        mockShouldApplyEffect,
        mockActor
      );

      // Assert
      expect(result).toBe(true);
    });

    test('should return false when no conditions are met', () => {
      // Arrange
      mockShouldApplyEffect.mockReturnValue(false);

      // Act
      const result = RepetitionHandler.checkIterationSuccess(
        mockResult,
        mockSystem,
        mockShouldApplyEffect,
        mockActor
      );

      // Assert
      expect(result).toBe(false);
    });

    test('should handle multiple target results', () => {
      // Arrange
      mockResult.targetResults = [
        { oneHit: false, bothHit: false },
        { oneHit: true, bothHit: false }
      ];
      mockShouldApplyEffect.mockImplementation((_condition, oneHit, _bothHit) => oneHit);

      // Act
      const result = RepetitionHandler.checkIterationSuccess(
        mockResult,
        mockSystem,
        mockShouldApplyEffect,
        mockActor
      );

      // Assert
      expect(result).toBe(true);
    });

    test('should not check damage when damageCondition is never', () => {
      // Arrange
      mockSystem.attackChain.damageCondition = 'never';

      // Act
      const result = RepetitionHandler.checkIterationSuccess(
        mockResult,
        mockSystem,
        mockShouldApplyEffect,
        mockActor
      );

      // Assert
      expect(result).toBe(false);
      // Should not have been called for damage
      expect(mockShouldApplyEffect).not.toHaveBeenCalledWith(
        'never',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    test('should handle missing baseRoll', () => {
      // Arrange
      mockResult.baseRoll = null;

      // Act
      const result = RepetitionHandler.checkIterationSuccess(
        mockResult,
        mockSystem,
        mockShouldApplyEffect,
        mockActor
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('waitForDelay()', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('should wait for configured delay when user is GM', async () => {
      // Arrange
      global.game.settings.get.mockReturnValue(500);

      // Act
      const promise = RepetitionHandler.waitForDelay();
      vi.advanceTimersByTime(500);
      await promise;

      // Assert
      expect(global.game.settings.get).toHaveBeenCalledWith(
        'eventide-rp-system',
        'actionCardExecutionDelay'
      );
    });

    test('should use timing override when provided', async () => {
      // Arrange
      const promise = RepetitionHandler.waitForDelay(1);
      vi.advanceTimersByTime(1000);
      await promise;

      // Assert
      // Should not call settings.get when override is provided
      expect(global.game.settings.get).not.toHaveBeenCalledWith(
        'eventide-rp-system',
        'actionCardExecutionDelay'
      );
    });

    test('should not wait when user is not GM', async () => {
      // Arrange
      global.game.user.isGM = false;

      // Act
      await RepetitionHandler.waitForDelay();

      // Assert
      // Should return immediately without waiting
      expect(global.game.settings.get).not.toHaveBeenCalled();
    });

    test('should not wait when delay is zero', async () => {
      // Arrange
      global.game.settings.get.mockReturnValue(0);

      // Act
      await RepetitionHandler.waitForDelay();

      // Assert
      // Should return immediately
    });

    test('should not wait when delay is negative', async () => {
      // Arrange
      global.game.settings.get.mockReturnValue(-100);

      // Act
      await RepetitionHandler.waitForDelay();

      // Assert
      // Should return immediately
    });
  });
});