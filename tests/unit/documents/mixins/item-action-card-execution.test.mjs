// @ts-nocheck
/**
 * @fileoverview Tests for ItemActionCardExecutionMixin - Action card execution functionality
 *
 * Tests effect conditions, image/label resolution, timing delays, resource validation,
 * and result aggregation for action card execution.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Mock the dependencies first
const mockLogger = {
  methodEntry: vi.fn(),
  methodExit: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn()
};

const mockResourceValidator = {
  checkEmbeddedItemResources: vi.fn(),
  sendResourceFailureMessage: vi.fn()
};

const mockRepetitionHandler = {
  calculateRepetitionCount: vi.fn(),
  applySystemLimit: vi.fn(),
  createContext: vi.fn(),
  updateContextForIteration: vi.fn(),
  checkIterationSuccess: vi.fn(),
  aggregateResults: vi.fn(),
  waitForDelay: vi.fn()
};

const mockTransformationApplicator = {
  processTransformationResults: vi.fn(),
  applyWithValidation: vi.fn(),
  promptForSelection: vi.fn()
};

const mockErpsRollUtilities = {
  determineCriticalStates: vi.fn()
};

const mockTargetResolver = {
  resolveTargets: vi.fn(),
  resolveLockedTargets: vi.fn(),
  getSelfTargetToken: vi.fn()
};

const mockStatusEffectApplicator = {
  processStatusResults: vi.fn()
};

const mockChatMessageBuilder = {
  sendRepetitionFailureMessage: vi.fn()
};

const mockDamageProcessor = {
  processDamageResults: vi.fn()
};

const mockAttackChainExecutor = {
  executeWithRollResult: vi.fn()
};

// Mock the module imports
vi.mock('../../../../module/services/logger.mjs', () => ({
  Logger: mockLogger
}));

vi.mock('../../../../module/services/resource-validator.mjs', () => ({
  ResourceValidator: mockResourceValidator
}));

vi.mock('../../../../module/services/repetition-handler.mjs', () => ({
  RepetitionHandler: mockRepetitionHandler
}));

vi.mock('../../../../module/services/transformation-applicator.mjs', () => ({
  TransformationApplicator: mockTransformationApplicator
}));

vi.mock('../../../../module/utils/roll-utilities.mjs', () => ({
  ERPSRollUtilities: mockErpsRollUtilities
}));

vi.mock('../../../../module/services/_module.mjs', () => ({
  TargetResolver: mockTargetResolver,
  StatusEffectApplicator: mockStatusEffectApplicator,
  ChatMessageBuilder: mockChatMessageBuilder,
  DamageProcessor: mockDamageProcessor,
  AttackChainExecutor: mockAttackChainExecutor
}));

// Import the mixin after mocking dependencies
const { ItemActionCardExecutionMixin } = await import('../../../../module/documents/mixins/item-action-card-execution.mjs');

// Create a test class that uses the mixin
class TestItemClass {
  constructor(options = {}) {
    this.type = options.type || 'actionCard';
    this.name = options.name || 'Test Action Card';
    this.img = options.img || 'icons/svg/item-bag.svg';
    this.system = options.system || {
      mode: 'attackChain',
      rollActorName: true,
      timingOverride: null,
      attackChain: {},
      embeddedStatusEffects: [],
      embeddedTransformations: [],
      savedDamage: { formula: '1d6', type: 'damage' }
    };
    this.actor = options.actor || null;
    this._lockedTargets = options._lockedTargets || [];
    this._currentRepetitionContext = options._currentRepetitionContext || null;
    this.getEmbeddedItem = vi.fn(() => options.embeddedItem || null);
    this.getEmbeddedTransformations = vi.fn(() => []);
  }
}

const MixedClass = ItemActionCardExecutionMixin(TestItemClass);

describe('ItemActionCardExecutionMixin', () => {
  let item;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Setup global game object
    global.game = {
      user: { isGM: false },
      settings: {
        get: vi.fn((system, key) => {
          if (key === 'actionCardExecutionDelay') return 0;
          return null;
        })
      },
      combat: null,
      i18n: {
        format: vi.fn((key) => key),
        localize: vi.fn((key) => key)
      }
    };

    global.ui = {
      notifications: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn()
      }
    };

    global.Hooks = {
      on: vi.fn(),
      off: vi.fn()
    };

    global.erps = {
      messages: {
        createTargetsExhaustedMessage: vi.fn()
      }
    };

    item = new MixedClass();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('_shouldApplyEffect()', () => {
    describe('never condition', () => {
      test('should return false for never condition', () => {
        const result = item._shouldApplyEffect('never', true, true, 20, 15);
        expect(result).toBe(false);
      });
    });

    describe('oneSuccess condition', () => {
      test('should return true when oneHit is true', () => {
        const result = item._shouldApplyEffect('oneSuccess', true, false, 10, 15);
        expect(result).toBe(true);
      });

      test('should return false when oneHit is false', () => {
        const result = item._shouldApplyEffect('oneSuccess', false, false, 10, 15);
        expect(result).toBe(false);
      });
    });

    describe('twoSuccesses condition', () => {
      test('should return true when bothHit is true', () => {
        const result = item._shouldApplyEffect('twoSuccesses', true, true, 10, 15);
        expect(result).toBe(true);
      });

      test('should return false when bothHit is false', () => {
        const result = item._shouldApplyEffect('twoSuccesses', true, false, 10, 15);
        expect(result).toBe(false);
      });
    });

    describe('rollValue condition', () => {
      test('should return true when rollTotal >= threshold', () => {
        const result = item._shouldApplyEffect('rollValue', false, false, 20, 15);
        expect(result).toBe(true);
      });

      test('should return false when rollTotal < threshold', () => {
        const result = item._shouldApplyEffect('rollValue', false, false, 10, 15);
        expect(result).toBe(false);
      });

      test('should return true when rollTotal equals threshold', () => {
        const result = item._shouldApplyEffect('rollValue', false, false, 15, 15);
        expect(result).toBe(true);
      });

      test('should use default threshold of 15 when not provided', () => {
        const result = item._shouldApplyEffect('rollValue', false, false, 15);
        expect(result).toBe(true);
      });
    });

    describe('rollUnderValue condition', () => {
      test('should return true when rollTotal < threshold', () => {
        const result = item._shouldApplyEffect('rollUnderValue', false, false, 10, 15);
        expect(result).toBe(true);
      });

      test('should return false when rollTotal >= threshold', () => {
        const result = item._shouldApplyEffect('rollUnderValue', false, false, 20, 15);
        expect(result).toBe(false);
      });
    });

    describe('rollEven condition', () => {
      test('should return true when rollTotal is even', () => {
        const result = item._shouldApplyEffect('rollEven', false, false, 10, 15);
        expect(result).toBe(true);
      });

      test('should return false when rollTotal is odd', () => {
        const result = item._shouldApplyEffect('rollEven', false, false, 11, 15);
        expect(result).toBe(false);
      });

      test('should return true for zero (even)', () => {
        const result = item._shouldApplyEffect('rollEven', false, false, 0, 15);
        expect(result).toBe(true);
      });
    });

    describe('rollOdd condition', () => {
      test('should return true when rollTotal is odd', () => {
        const result = item._shouldApplyEffect('rollOdd', false, false, 11, 15);
        expect(result).toBe(true);
      });

      test('should return false when rollTotal is even', () => {
        const result = item._shouldApplyEffect('rollOdd', false, false, 10, 15);
        expect(result).toBe(false);
      });
    });

    describe('rollOnValue condition', () => {
      test('should return true when rollTotal equals threshold', () => {
        const result = item._shouldApplyEffect('rollOnValue', false, false, 15, 15);
        expect(result).toBe(true);
      });

      test('should return false when rollTotal does not equal threshold', () => {
        const result = item._shouldApplyEffect('rollOnValue', false, false, 14, 15);
        expect(result).toBe(false);
      });
    });

    describe('zeroSuccesses condition', () => {
      test('should return true when oneHit is false (zero successes)', () => {
        const result = item._shouldApplyEffect('zeroSuccesses', false, false, 10, 15);
        expect(result).toBe(true);
      });

      test('should return false when oneHit is true', () => {
        const result = item._shouldApplyEffect('zeroSuccesses', true, false, 10, 15);
        expect(result).toBe(false);
      });
    });

    describe('always condition', () => {
      test('should return true regardless of other parameters', () => {
        const result = item._shouldApplyEffect('always', false, false, 0, 0);
        expect(result).toBe(true);
      });
    });

    describe('criticalSuccess condition', () => {
      test('should return true when critHit is true and stolenCrit is false', () => {
        const mockRoll = { total: 20 };
        const mockActor = {
          getRollData: vi.fn(() => ({ hiddenAbilities: {} }))
        };
        mockErpsRollUtilities.determineCriticalStates.mockReturnValue({
          critHit: true,
          stolenCrit: false,
          critMiss: false,
          savedMiss: false
        });

        const result = item._shouldApplyEffect('criticalSuccess', false, false, 20, 15, mockRoll, mockActor, '1d20');
        expect(result).toBe(true);
        expect(mockErpsRollUtilities.determineCriticalStates).toHaveBeenCalledWith({
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
        mockErpsRollUtilities.determineCriticalStates.mockReturnValue({
          critHit: false,
          stolenCrit: false,
          critMiss: false,
          savedMiss: false
        });

        const result = item._shouldApplyEffect('criticalSuccess', false, false, 10, 15, mockRoll, mockActor, '1d20');
        expect(result).toBe(false);
      });

      test('should return false when critHit is true but stolenCrit is true', () => {
        const mockRoll = { total: 20 };
        const mockActor = {
          getRollData: vi.fn(() => ({ hiddenAbilities: {} }))
        };
        mockErpsRollUtilities.determineCriticalStates.mockReturnValue({
          critHit: true,
          stolenCrit: true,
          critMiss: false,
          savedMiss: false
        });

        const result = item._shouldApplyEffect('criticalSuccess', false, false, 20, 15, mockRoll, mockActor, '1d20');
        expect(result).toBe(false);
      });

      test('should return false when roll is null', () => {
        const result = item._shouldApplyEffect('criticalSuccess', false, false, 20, 15, null, {}, '1d20');
        expect(result).toBe(false);
      });

      test('should return false when actor is null', () => {
        const result = item._shouldApplyEffect('criticalSuccess', false, false, 20, 15, {}, null, '1d20');
        expect(result).toBe(false);
      });

      test('should return false when formula is null', () => {
        const result = item._shouldApplyEffect('criticalSuccess', false, false, 20, 15, {}, {}, null);
        expect(result).toBe(false);
      });
    });

    describe('criticalFailure condition', () => {
      test('should return true when critMiss is true and savedMiss is false', () => {
        const mockRoll = { total: 1 };
        const mockActor = {
          getRollData: vi.fn(() => ({ hiddenAbilities: {} }))
        };
        mockErpsRollUtilities.determineCriticalStates.mockReturnValue({
          critHit: false,
          stolenCrit: false,
          critMiss: true,
          savedMiss: false
        });

        const result = item._shouldApplyEffect('criticalFailure', false, false, 1, 15, mockRoll, mockActor, '1d20');
        expect(result).toBe(true);
      });

      test('should return false when critMiss is false', () => {
        const mockRoll = { total: 10 };
        const mockActor = {
          getRollData: vi.fn(() => ({ hiddenAbilities: {} }))
        };
        mockErpsRollUtilities.determineCriticalStates.mockReturnValue({
          critHit: false,
          stolenCrit: false,
          critMiss: false,
          savedMiss: false
        });

        const result = item._shouldApplyEffect('criticalFailure', false, false, 10, 15, mockRoll, mockActor, '1d20');
        expect(result).toBe(false);
      });

      test('should return false when critMiss is true but savedMiss is true', () => {
        const mockRoll = { total: 1 };
        const mockActor = {
          getRollData: vi.fn(() => ({ hiddenAbilities: {} }))
        };
        mockErpsRollUtilities.determineCriticalStates.mockReturnValue({
          critHit: false,
          stolenCrit: false,
          critMiss: true,
          savedMiss: true
        });

        const result = item._shouldApplyEffect('criticalFailure', false, false, 1, 15, mockRoll, mockActor, '1d20');
        expect(result).toBe(false);
      });
    });

    describe('unknown condition', () => {
      test('should return false for unknown condition types', () => {
        const result = item._shouldApplyEffect('unknownCondition', true, true, 20, 15);
        expect(result).toBe(false);
      });
    });
  });

  describe('_getEffectiveImage()', () => {
    test('should return action card image when not a default image', () => {
      item.img = 'modules/my-module/images/custom-action.webp';
      const result = item._getEffectiveImage();
      expect(result).toBe('modules/my-module/images/custom-action.webp');
    });

    test('should return embedded item image when action card has default image', () => {
      item.img = 'icons/svg/item-bag.svg';
      item.getEmbeddedItem = vi.fn(() => ({
        img: 'modules/my-module/images/embedded.webp'
      }));
      const result = item._getEffectiveImage();
      expect(result).toBe('modules/my-module/images/embedded.webp');
    });

    test('should return action card image when embedded item also has default image', () => {
      item.img = 'icons/svg/item-bag.svg';
      item.getEmbeddedItem = vi.fn(() => ({
        img: 'icons/svg/mystery-man.svg'
      }));
      const result = item._getEffectiveImage();
      expect(result).toBe('icons/svg/item-bag.svg');
    });

    test('should return action card image when no embedded item exists', () => {
      item.img = 'icons/svg/item-bag.svg';
      item.getEmbeddedItem = vi.fn(() => null);
      const result = item._getEffectiveImage();
      expect(result).toBe('icons/svg/item-bag.svg');
    });

    test('should handle empty string as default image', () => {
      item.img = '';
      item.getEmbeddedItem = vi.fn(() => ({
        img: 'modules/my-module/images/embedded.webp'
      }));
      const result = item._getEffectiveImage();
      expect(result).toBe('modules/my-module/images/embedded.webp');
    });

    test('should handle null as default image', () => {
      item.img = null;
      item.getEmbeddedItem = vi.fn(() => ({
        img: 'modules/my-module/images/embedded.webp'
      }));
      const result = item._getEffectiveImage();
      expect(result).toBe('modules/my-module/images/embedded.webp');
    });

    test('should handle undefined as default image', () => {
      item.img = undefined;
      item.getEmbeddedItem = vi.fn(() => ({
        img: 'modules/my-module/images/embedded.webp'
      }));
      const result = item._getEffectiveImage();
      expect(result).toBe('modules/my-module/images/embedded.webp');
    });
  });

  describe('_getEffectiveLabel()', () => {
    test('should return embedded item name when available and rollActorName is true', () => {
      item.system.rollActorName = true;
      const embeddedItem = { name: 'Embedded Power', system: { rollActorName: true } };
      const result = item._getEffectiveLabel(embeddedItem);
      expect(result).toBe('Embedded Power');
    });

    test('should return action card name when no embedded item and rollActorName is true', () => {
      item.system.rollActorName = true;
      item.name = 'Test Action Card';
      const result = item._getEffectiveLabel(null);
      expect(result).toBe('Test Action Card');
    });

    test('should return empty string when rollActorName is false on action card', () => {
      item.system.rollActorName = false;
      const result = item._getEffectiveLabel(null);
      expect(result).toBe('');
    });

    test('should return empty string when embedded item has rollActorName false', () => {
      item.system.rollActorName = true;
      const embeddedItem = { name: 'Embedded Power', system: { rollActorName: false } };
      const result = item._getEffectiveLabel(embeddedItem);
      expect(result).toBe('');
    });

    test('should return empty string when both have rollActorName false', () => {
      item.system.rollActorName = false;
      const embeddedItem = { name: 'Embedded Power', system: { rollActorName: false } };
      const result = item._getEffectiveLabel(embeddedItem);
      expect(result).toBe('');
    });

    test('should prioritize embedded item rollActorName over action card', () => {
      item.system.rollActorName = true;
      const embeddedItem = { name: 'Embedded Power', system: { rollActorName: false } };
      const result = item._getEffectiveLabel(embeddedItem);
      expect(result).toBe('');
    });

    test('should use action card name when embedded item has no name', () => {
      item.system.rollActorName = true;
      item.name = 'Test Action Card';
      const embeddedItem = { system: { rollActorName: true } };
      const result = item._getEffectiveLabel(embeddedItem);
      expect(result).toBe('Test Action Card');
    });
  });

  describe('_waitForExecutionDelay()', () => {
    test('should not delay when delay is 0', async () => {
      global.game.settings.get = vi.fn(() => 0);
      
      const promise = item._waitForExecutionDelay();
      await vi.runAllTimersAsync();
      await promise;
      
      expect(global.game.settings.get).toHaveBeenCalledWith('eventide-rp-system', 'actionCardExecutionDelay');
    });

    test('should delay for timingOverride seconds when set', async () => {
      item.system.timingOverride = 2; // 2 seconds
      
      global.game.settings.get = vi.fn(() => 0);
      
      const promise = item._waitForExecutionDelay();
      
      // Fast-forward time by 1.9 seconds - should not resolve yet
      await vi.advanceTimersByTimeAsync(1900);
      
      // Fast-forward remaining time
      await vi.advanceTimersByTimeAsync(100);
      await vi.runAllTimersAsync();
      await promise;
      
      // Should not call settings.get when timingOverride is set
      expect(global.game.settings.get).not.toHaveBeenCalled();
    });

    test('should use settings delay when timingOverride is 0', async () => {
      item.system.timingOverride = 0;
      global.game.settings.get = vi.fn(() => 500); // 500ms
      
      const promise = item._waitForExecutionDelay();
      await vi.runAllTimersAsync();
      await promise;
      
      expect(global.game.settings.get).toHaveBeenCalledWith('eventide-rp-system', 'actionCardExecutionDelay');
    });

    test('should use settings delay when timingOverride is null', async () => {
      item.system.timingOverride = null;
      global.game.settings.get = vi.fn(() => 300);
      
      const promise = item._waitForExecutionDelay();
      await vi.runAllTimersAsync();
      await promise;
      
      expect(global.game.settings.get).toHaveBeenCalledWith('eventide-rp-system', 'actionCardExecutionDelay');
    });

    test('should use settings delay when timingOverride is undefined', async () => {
      item.system.timingOverride = undefined;
      global.game.settings.get = vi.fn(() => 200);
      
      const promise = item._waitForExecutionDelay();
      await vi.runAllTimersAsync();
      await promise;
      
      expect(global.game.settings.get).toHaveBeenCalledWith('eventide-rp-system', 'actionCardExecutionDelay');
    });
  });

  describe('checkEmbeddedItemResources()', () => {
    test('should delegate to ResourceValidator.checkEmbeddedItemResources', () => {
      const mockEmbeddedItem = { id: 'item1', name: 'Test Item' };
      const mockActor = { id: 'actor1', name: 'Test Actor' };
      const expectedResult = { canExecute: true, reason: null };
      
      mockResourceValidator.checkEmbeddedItemResources.mockReturnValue(expectedResult);
      
      const result = item.checkEmbeddedItemResources(mockEmbeddedItem, mockActor, true);
      
      expect(mockResourceValidator.checkEmbeddedItemResources).toHaveBeenCalledWith(
        mockEmbeddedItem,
        mockActor,
        true
      );
      expect(result).toBe(expectedResult);
    });

    test('should pass shouldConsumeCost parameter correctly', () => {
      const mockEmbeddedItem = { id: 'item1' };
      const mockActor = { id: 'actor1' };
      
      item.checkEmbeddedItemResources(mockEmbeddedItem, mockActor, false);
      
      expect(mockResourceValidator.checkEmbeddedItemResources).toHaveBeenCalledWith(
        mockEmbeddedItem,
        mockActor,
        false
      );
    });

    test('should default shouldConsumeCost to true', () => {
      const mockEmbeddedItem = { id: 'item1' };
      const mockActor = { id: 'actor1' };
      
      item.checkEmbeddedItemResources(mockEmbeddedItem, mockActor);
      
      expect(mockResourceValidator.checkEmbeddedItemResources).toHaveBeenCalledWith(
        mockEmbeddedItem,
        mockActor,
        true
      );
    });
  });

  describe('aggregateRepetitionResults()', () => {
    test('should delegate to RepetitionHandler.aggregateResults', () => {
      const mockResults = [
        { success: true, damageResults: [{ total: 5 }] },
        { success: true, damageResults: [{ total: 3 }] }
      ];
      const expectedResult = { success: true, totalDamage: 8 };
      
      mockRepetitionHandler.aggregateResults.mockReturnValue(expectedResult);
      
      const result = item.aggregateRepetitionResults(mockResults, 2);
      
      expect(mockRepetitionHandler.aggregateResults).toHaveBeenCalledWith(
        mockResults,
        2,
        'attackChain'
      );
      expect(result).toBe(expectedResult);
    });

    test('should use savedDamage mode when system.mode is savedDamage', () => {
      item.system.mode = 'savedDamage';
      const mockResults = [
        { success: true, damageResults: [{ total: 5 }] }
      ];
      const expectedResult = { success: true };
      
      mockRepetitionHandler.aggregateResults.mockReturnValue(expectedResult);
      
      item.aggregateRepetitionResults(mockResults, 1);
      
      expect(mockRepetitionHandler.aggregateResults).toHaveBeenCalledWith(
        mockResults,
        1,
        'savedDamage'
      );
    });
  });

  describe('_checkIterationSuccess()', () => {
    test('should delegate to RepetitionHandler.checkIterationSuccess', () => {
      const mockResult = { success: true, damageResults: [] };
      const expectedResult = true;
      
      mockRepetitionHandler.checkIterationSuccess.mockReturnValue(expectedResult);
      
      item._checkIterationSuccess(mockResult);
      
      expect(mockRepetitionHandler.checkIterationSuccess).toHaveBeenCalledWith(
        mockResult,
        item.system,
        expect.any(Function),
        item.actor
      );
    });

    test('should pass _shouldApplyEffect callback to checkIterationSuccess', () => {
      const mockResult = { success: true };
      
      item._checkIterationSuccess(mockResult);
      
      const callback = mockRepetitionHandler.checkIterationSuccess.mock.calls[0][2];
      expect(typeof callback).toBe('function');
      
      // Test that the callback works
      const callbackResult = callback('always', false, false, 10, 15, null, null, null);
      expect(callbackResult).toBe(true);
    });
  });

  describe('sendFailureMessage()', () => {
    test('should delegate to ChatMessageBuilder.sendRepetitionFailureMessage', async () => {
      const mockActor = { id: 'actor1', name: 'Test Actor' };
      const mockRoll = { total: 0 };
      
      await item.sendFailureMessage(mockActor, 0, mockRoll);
      
      expect(mockChatMessageBuilder.sendRepetitionFailureMessage).toHaveBeenCalledWith({
        actor: mockActor,
        cardName: item.name,
        repetitionCount: 0,
        repetitionsRoll: mockRoll,
        rollActorName: item.system.rollActorName
      });
    });
  });

  describe('sendResourceFailureMessage()', () => {
    test('should delegate to ResourceValidator.sendResourceFailureMessage', async () => {
      const mockActor = { id: 'actor1', name: 'Test Actor' };
      const mockResourceCheck = { canExecute: false, reason: 'insufficientPower' };
      const mockEmbeddedItem = { id: 'item1', name: 'Test Item' };
      
      await item.sendResourceFailureMessage(mockActor, mockResourceCheck, mockEmbeddedItem, 0, 3);
      
      expect(mockResourceValidator.sendResourceFailureMessage).toHaveBeenCalledWith({
        actor: mockActor,
        resourceCheck: mockResourceCheck,
        embeddedItem: mockEmbeddedItem,
        repetitionIndex: 0,
        repetitionCount: 3,
        cardData: {
          name: item.name,
          img: expect.any(String),
          textColor: item.system.textColor,
          bgColor: item.system.bgColor,
          rollActorName: item.system.rollActorName
        }
      });
    });
  });

  describe('waitForRepetitionDelay()', () => {
    test('should delegate to RepetitionHandler.waitForDelay', async () => {
      item.system.timingOverride = 3;
      
      await item.waitForRepetitionDelay();
      
      expect(mockRepetitionHandler.waitForDelay).toHaveBeenCalledWith(3);
    });

    test('should pass timingOverride even when null', async () => {
      item.system.timingOverride = null;
      
      await item.waitForRepetitionDelay();
      
      expect(mockRepetitionHandler.waitForDelay).toHaveBeenCalledWith(null);
    });
  });

  describe('_getSelfTargetToken()', () => {
    test('should delegate to TargetResolver.getSelfTargetToken', () => {
      const mockActor = { id: 'actor1' };
      const mockToken = { id: 'token1' };
      
      mockTargetResolver.getSelfTargetToken.mockReturnValue(mockToken);
      
      const result = item._getSelfTargetToken(mockActor);
      
      expect(mockTargetResolver.getSelfTargetToken).toHaveBeenCalledWith(mockActor);
      expect(result).toBe(mockToken);
    });
  });

  describe('execute()', () => {
    test('should throw error when called on non-actionCard type', async () => {
      const nonActionItem = new MixedClass({ type: 'feature' });
      await expect(nonActionItem.execute({})).rejects.toThrow('execute can only be called on action card items');
    });

    test('should throw error for GM-only action card when user is not GM', async () => {
      item.system.gmOnly = true;
      global.game.user.isGM = false;
      
      await expect(item.execute({})).rejects.toThrow('Insufficient permissions to execute GM-only action card');
      expect(global.ui.notifications.error).toHaveBeenCalledWith('Only GMs can execute GM-only action cards.');
    });

    test('should allow GM to execute GM-only action card', async () => {
      item.system.gmOnly = true;
      global.game.user.isGM = true;
      item.system.mode = 'attackChain';
      
      const mockEmbeddedItem = { roll: vi.fn().mockResolvedValue({}) };
      item.getEmbeddedItem = vi.fn(() => mockEmbeddedItem);
      
      mockTargetResolver.resolveTargets.mockResolvedValue({
        success: true,
        targets: []
      });
      
      global.game.settings.get = vi.fn((system, key) => {
        if (key === 'enableActionCardChains') return true;
        return null;
      });
      
      // This should not throw - just verify it gets past the GM check
      await item.execute({});
      // If we get here without throwing, the GM check passed
    });

    test('should call executeAttackChain when mode is attackChain', async () => {
      item.system.mode = 'attackChain';
      item.system.advanceInitiative = false;
      
      const mockEmbeddedItem = { roll: vi.fn().mockResolvedValue({}) };
      item.getEmbeddedItem = vi.fn(() => mockEmbeddedItem);
      
      mockTargetResolver.resolveTargets.mockResolvedValue({
        success: true,
        targets: []
      });
      
      global.game.settings.get = vi.fn((system, key) => {
        if (key === 'enableActionCardChains') return true;
        return null;
      });
      
      await item.execute({});
      
      expect(item.getEmbeddedItem).toHaveBeenCalledWith({ executionContext: true });
    });

    test('should call executeSavedDamage when mode is savedDamage', async () => {
      item.system.mode = 'savedDamage';
      item.system.advanceInitiative = false;
      
      mockTargetResolver.resolveTargets.mockResolvedValue({
        success: true,
        targets: []
      });
      
      await item.execute({});
      
      expect(mockTargetResolver.resolveTargets).toHaveBeenCalled();
    });

    test('should throw error for unknown mode', async () => {
      item.system.mode = 'unknownMode';
      
      await expect(item.execute({})).rejects.toThrow('Unknown action card mode: unknownMode');
    });

    test('should advance initiative when advanceInitiative is true and combat exists', async () => {
      item.system.mode = 'savedDamage';
      item.system.advanceInitiative = true;
      
      const mockCombat = { nextTurn: vi.fn().mockResolvedValue(undefined) };
      global.game.combat = mockCombat;
      
      mockTargetResolver.resolveTargets.mockResolvedValue({
        success: true,
        targets: []
      });
      
      await item.execute({});
      
      expect(mockCombat.nextTurn).toHaveBeenCalled();
    });

    test('should not advance initiative when advanceInitiative is false', async () => {
      item.system.mode = 'savedDamage';
      item.system.advanceInitiative = false;
      
      const mockCombat = { nextTurn: vi.fn() };
      global.game.combat = mockCombat;
      
      mockTargetResolver.resolveTargets.mockResolvedValue({
        success: true,
        targets: []
      });
      
      await item.execute({});
      
      expect(mockCombat.nextTurn).not.toHaveBeenCalled();
    });
  });

  describe('executeWithRollResult()', () => {
    test('should throw error when called on non-actionCard type', async () => {
      const nonActionItem = new MixedClass({ type: 'feature' });
      await expect(nonActionItem.executeWithRollResult({}, {})).rejects.toThrow('executeWithRollResult can only be called on action card items');
    });

    test('should throw error for GM-only action card when user is not GM', async () => {
      item.system.gmOnly = true;
      global.game.user.isGM = false;
      
      await expect(item.executeWithRollResult({}, {})).rejects.toThrow('Insufficient permissions to execute GM-only action card');
      expect(global.ui.notifications.error).toHaveBeenCalledWith('Only GMs can execute GM-only action cards.');
    });

    test('should return failure result when repetitionCount is 0 or less', async () => {
      item.system.mode = 'attackChain';
      item.system.repetitions = '0';
      
      mockRepetitionHandler.calculateRepetitionCount.mockResolvedValue({ count: 0, roll: { total: 0 } });
      
      const result = await item.executeWithRollResult({}, {});
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('insufficientRepetitions');
      expect(mockChatMessageBuilder.sendRepetitionFailureMessage).toHaveBeenCalled();
    });

    test('should return failure result when repetitionCount is negative', async () => {
      item.system.mode = 'attackChain';
      item.system.repetitions = '-1';
      
      mockRepetitionHandler.calculateRepetitionCount.mockResolvedValue({ count: -1, roll: { total: -1 } });
      
      const result = await item.executeWithRollResult({}, {});
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('insufficientRepetitions');
    });

    test('should apply system limit to repetition count', async () => {
      item.system.mode = 'attackChain';
      item.system.repetitions = '10';
      
      mockRepetitionHandler.calculateRepetitionCount.mockResolvedValue({ count: 10, roll: { total: 10 } });
      mockRepetitionHandler.applySystemLimit.mockReturnValue(5);
      mockRepetitionHandler.createContext.mockReturnValue({});
      mockRepetitionHandler.aggregateResults.mockReturnValue({ success: true });
      
      // Mock executeSingleIteration to return success
      item.executeSingleIteration = vi.fn().mockResolvedValue({ success: true });
      
      await item.executeWithRollResult({}, { total: 15 });
      
      expect(mockRepetitionHandler.applySystemLimit).toHaveBeenCalledWith(10, item.name);
    });

    test('should create repetition context', async () => {
      item.system.mode = 'attackChain';
      item.system.repetitions = '1';
      
      const mockContext = { iteration: 0 };
      mockRepetitionHandler.calculateRepetitionCount.mockResolvedValue({ count: 1, roll: { total: 1 } });
      mockRepetitionHandler.applySystemLimit.mockReturnValue(1);
      mockRepetitionHandler.createContext.mockReturnValue(mockContext);
      mockRepetitionHandler.aggregateResults.mockReturnValue({ success: true });
      
      item.executeSingleIteration = vi.fn().mockResolvedValue({ success: true });
      
      await item.executeWithRollResult({}, { total: 15 });
      
      expect(mockRepetitionHandler.createContext).toHaveBeenCalledWith(item.system, {});
    });

    test('should halt execution when resource depleted in previous iteration', async () => {
      item.system.mode = 'attackChain';
      item.system.repetitions = '3';
      
      mockRepetitionHandler.calculateRepetitionCount.mockResolvedValue({ count: 3, roll: { total: 3 } });
      mockRepetitionHandler.applySystemLimit.mockReturnValue(3);
      mockRepetitionHandler.createContext.mockReturnValue({});
      
      const options = {
        actionCardContext: {
          resourceDepleted: true,
          depletedResourceType: 'quantity',
          depletedRequired: 5,
          depletedAvailable: 2,
          depletedItemName: 'Test Item'
        }
      };
      
      // First iteration succeeds
      item.executeSingleIteration = vi.fn().mockResolvedValue({ success: true });
      
      mockRepetitionHandler.aggregateResults.mockReturnValue({ success: true });
      
      await item.executeWithRollResult({}, { total: 15 }, options);
      
      // Should stop after first iteration due to resource depletion
      expect(item.executeSingleIteration).toHaveBeenCalledTimes(1);
    });

    test('should clean up repetition context after execution', async () => {
      item.system.mode = 'attackChain';
      item.system.repetitions = '1';
      
      mockRepetitionHandler.calculateRepetitionCount.mockResolvedValue({ count: 1, roll: { total: 1 } });
      mockRepetitionHandler.applySystemLimit.mockReturnValue(1);
      mockRepetitionHandler.createContext.mockReturnValue({ iteration: 0 });
      mockRepetitionHandler.aggregateResults.mockReturnValue({ success: true });
      
      item.executeSingleIteration = vi.fn().mockResolvedValue({ success: true });
      
      await item.executeWithRollResult({}, { total: 15 });
      
      expect(item._currentRepetitionContext).toBeUndefined();
    });
  });

  describe('executeAttackChain()', () => {
    test('should throw error when attack chains are disabled', async () => {
      global.game.settings.get = vi.fn(() => false);
      
      await expect(item.executeAttackChain({})).rejects.toThrow('Attack chains are disabled by GM settings');
    });

    test('should throw error when no embedded item found', async () => {
      global.game.settings.get = vi.fn(() => true);
      item.getEmbeddedItem = vi.fn(() => null);
      
      await expect(item.executeAttackChain({})).rejects.toThrow('No embedded item found for attack chain');
    });

    test('should return failure when target resolution fails', async () => {
      global.game.settings.get = vi.fn(() => true);
      
      const mockEmbeddedItem = { roll: vi.fn().mockResolvedValue({}) };
      item.getEmbeddedItem = vi.fn(() => mockEmbeddedItem);
      
      mockTargetResolver.resolveTargets.mockResolvedValue({
        success: false,
        reason: 'No targets available'
      });
      
      const result = await item.executeAttackChain({});
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('No targets available');
    });

    test('should throw error when popup fails to open', async () => {
      global.game.settings.get = vi.fn(() => true);
      
      const mockEmbeddedItem = { roll: vi.fn().mockResolvedValue(null) };
      item.getEmbeddedItem = vi.fn(() => mockEmbeddedItem);
      
      mockTargetResolver.resolveTargets.mockResolvedValue({
        success: true,
        targets: [{ actor: { id: 'actor1', name: 'Test Actor' } }]
      });
      
      await expect(item.executeAttackChain({})).rejects.toThrow('Failed to open embedded item popup');
    });

    test('should return success result with target results', async () => {
      global.game.settings.get = vi.fn(() => true);
      
      const mockEmbeddedItem = { roll: vi.fn().mockResolvedValue({}) };
      item.getEmbeddedItem = vi.fn(() => mockEmbeddedItem);
      
      const mockTarget = {
        actor: { id: 'actor1', name: 'Test Actor' }
      };
      
      mockTargetResolver.resolveTargets.mockResolvedValue({
        success: true,
        targets: [mockTarget]
      });
      
      const result = await item.executeAttackChain({});
      
      expect(result.success).toBe(true);
      expect(result.mode).toBe('attackChain');
      expect(result.targetResults).toHaveLength(1);
    });
  });

  describe('executeSavedDamage()', () => {
    test('should return failure when target resolution fails', async () => {
      mockTargetResolver.resolveTargets.mockResolvedValue({
        success: false,
        reason: 'No valid targets'
      });
      
      const result = await item.executeSavedDamage({});
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('No valid targets');
    });

    test('should apply damage to each target', async () => {
      const mockActor = {
        id: 'actor1',
        name: 'Test Actor',
        damageResolve: vi.fn().mockResolvedValue({ total: 10 }),
        system: {
          hiddenAbilities: {
            vuln: { total: 0 }
          }
        }
      };
      
      mockTargetResolver.resolveTargets.mockResolvedValue({
        success: true,
        targets: [{ actor: mockActor }]
      });
      
      item.system.savedDamage = {
        formula: '2d6',
        type: 'damage',
        description: 'Test damage'
      };
      
      const result = await item.executeSavedDamage({});
      
      expect(result.success).toBe(true);
      expect(result.mode).toBe('savedDamage');
      expect(result.damageResults).toHaveLength(1);
      expect(mockActor.damageResolve).toHaveBeenCalled();
    });

    test('should apply vulnerability modifier when target has vulnerability', async () => {
      const mockActor = {
        id: 'actor1',
        name: 'Test Actor',
        damageResolve: vi.fn().mockResolvedValue({ total: 12 }),
        system: {
          hiddenAbilities: {
            vuln: { total: 2 }
          }
        }
      };
      
      mockTargetResolver.resolveTargets.mockResolvedValue({
        success: true,
        targets: [{ actor: mockActor }]
      });
      
      item.system.savedDamage = {
        formula: '2d6',
        type: 'damage'
      };
      
      await item.executeSavedDamage({});
      
      // Should add vulnerability to formula
      expect(mockActor.damageResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          formula: '2d6 + 2'
        })
      );
    });

    test('should not apply vulnerability modifier for heal type', async () => {
      const mockActor = {
        id: 'actor1',
        name: 'Test Actor',
        damageResolve: vi.fn().mockResolvedValue({ total: 10 }),
        system: {
          hiddenAbilities: {
            vuln: { total: 2 }
          }
        }
      };
      
      mockTargetResolver.resolveTargets.mockResolvedValue({
        success: true,
        targets: [{ actor: mockActor }]
      });
      
      item.system.savedDamage = {
        formula: '2d6',
        type: 'heal'
      };
      
      await item.executeSavedDamage({});
      
      // Should NOT add vulnerability for heal
      expect(mockActor.damageResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          formula: '2d6'
        })
      );
    });

    test('should process transformations when embedded transformations exist', async () => {
      const mockActor = {
        id: 'actor1',
        name: 'Test Actor',
        damageResolve: vi.fn().mockResolvedValue({ total: 10 }),
        system: { hiddenAbilities: { vuln: { total: 0 } } }
      };
      
      mockTargetResolver.resolveTargets.mockResolvedValue({
        success: true,
        targets: [{ actor: mockActor }]
      });
      
      item.system.savedDamage = { formula: '2d6', type: 'damage' };
      item.system.embeddedTransformations = [{ id: 'trans1' }];
      
      mockTransformationApplicator.processTransformationResults.mockResolvedValue([{ success: true }]);
      
      const result = await item.executeSavedDamage({});
      
      expect(mockTransformationApplicator.processTransformationResults).toHaveBeenCalled();
      expect(result.transformationResults).toHaveLength(1);
    });

    test('should handle damage errors gracefully', async () => {
      const mockActor = {
        id: 'actor1',
        name: 'Test Actor',
        damageResolve: vi.fn().mockRejectedValue(new Error('Damage failed')),
        system: { hiddenAbilities: { vuln: { total: 0 } } }
      };
      
      mockTargetResolver.resolveTargets.mockResolvedValue({
        success: true,
        targets: [{ actor: mockActor }]
      });
      
      item.system.savedDamage = { formula: '2d6', type: 'damage' };
      
      // Should not throw, just log error and continue
      const result = await item.executeSavedDamage({});
      
      expect(result.success).toBe(true);
      expect(result.damageResults).toHaveLength(0);
    });
  });

  describe('executeAttackChainWithRollResult()', () => {
    test('should throw error when no embedded item found', async () => {
      item.getEmbeddedItem = vi.fn(() => null);
      
      await expect(item.executeAttackChainWithRollResult({}, { total: 15 })).rejects.toThrow('No embedded item found for attack chain');
    });

    test('should call AttackChainExecutor.executeWithRollResult with correct parameters', async () => {
      const mockEmbeddedItem = { id: 'embedded1' };
      item.getEmbeddedItem = vi.fn(() => mockEmbeddedItem);
      item._lockedTargets = [{ actorId: 'actor1' }];
      
      const mockRollResult = { total: 15 };
      mockAttackChainExecutor.executeWithRollResult.mockResolvedValue({ success: true });
      
      await item.executeAttackChainWithRollResult({}, mockRollResult);
      
      expect(mockAttackChainExecutor.executeWithRollResult).toHaveBeenCalledWith(
        expect.objectContaining({
          actionCard: item,
          rollResult: mockRollResult,
          embeddedItem: mockEmbeddedItem,
          lockedTargets: item._lockedTargets
        })
      );
    });

    test('should pass disableDelays parameter correctly', async () => {
      const mockEmbeddedItem = { id: 'embedded1' };
      item.getEmbeddedItem = vi.fn(() => mockEmbeddedItem);
      
      mockAttackChainExecutor.executeWithRollResult.mockResolvedValue({ success: true });
      
      await item.executeAttackChainWithRollResult({}, { total: 15 }, true);
      
      expect(mockAttackChainExecutor.executeWithRollResult).toHaveBeenCalledWith(
        expect.objectContaining({
          disableDelays: true
        })
      );
    });

    test('should pass shouldApplyDamage and shouldApplyStatus parameters', async () => {
      const mockEmbeddedItem = { id: 'embedded1' };
      item.getEmbeddedItem = vi.fn(() => mockEmbeddedItem);
      
      mockAttackChainExecutor.executeWithRollResult.mockResolvedValue({ success: true });
      
      await item.executeAttackChainWithRollResult({}, { total: 15 }, false, false, true);
      
      expect(mockAttackChainExecutor.executeWithRollResult).toHaveBeenCalledWith(
        expect.objectContaining({
          shouldApplyDamage: false,
          shouldApplyStatus: true
        })
      );
    });
  });

  describe('executeSingleIteration()', () => {
    test('should call executeAttackChainIteration when mode is attackChain', async () => {
      item.system.mode = 'attackChain';
      item.executeAttackChainIteration = vi.fn().mockResolvedValue({ success: true });
      
      const mockRollResult = { total: 15 };
      await item.executeSingleIteration({}, mockRollResult, 0, 1);
      
      expect(item.executeAttackChainIteration).toHaveBeenCalledWith({}, mockRollResult, 0, 1);
    });

    test('should call executeSavedDamageIteration when mode is savedDamage', async () => {
      item.system.mode = 'savedDamage';
      item.executeSavedDamageIteration = vi.fn().mockResolvedValue({ success: true });
      
      await item.executeSingleIteration({}, null, 0, 1);
      
      expect(item.executeSavedDamageIteration).toHaveBeenCalledWith({}, 0, 1);
    });

    test('should throw error for unknown mode', async () => {
      item.system.mode = 'unknownMode';
      
      await expect(item.executeSingleIteration({}, null, 0, 1)).rejects.toThrow('Unknown action card mode: unknownMode');
    });
  });

  describe('executeAttackChainIteration()', () => {
    test('should call executeAttackChainWithRollResult with correct parameters', async () => {
      item.system.damageApplication = false;
      
      const mockRollResult = { total: 15 };
      mockAttackChainExecutor.executeWithRollResult.mockResolvedValue({ success: true });
      item.getEmbeddedItem = vi.fn(() => ({ id: 'embedded1' }));
      
      // Second iteration (index 1) should have shouldApplyDamage: false when damageApplication is false
      await item.executeAttackChainIteration({}, mockRollResult, 1, 2);
      
      expect(mockAttackChainExecutor.executeWithRollResult).toHaveBeenCalledWith(
        expect.objectContaining({
          shouldApplyDamage: false,
          shouldApplyStatus: true,
          isFinalRepetition: true
        })
      );
    });

    test('should set isFinalRepetition to true for last iteration', async () => {
      item.system.damageApplication = true;
      
      const mockRollResult = { total: 15 };
      mockAttackChainExecutor.executeWithRollResult.mockResolvedValue({ success: true });
      item.getEmbeddedItem = vi.fn(() => ({ id: 'embedded1' }));
      
      await item.executeAttackChainIteration({}, mockRollResult, 1, 2);
      
      expect(mockAttackChainExecutor.executeWithRollResult).toHaveBeenCalledWith(
        expect.objectContaining({
          isFinalRepetition: true
        })
      );
    });

    test('should apply damage on first iteration regardless of damageApplication', async () => {
      item.system.damageApplication = false;
      
      const mockRollResult = { total: 15 };
      mockAttackChainExecutor.executeWithRollResult.mockResolvedValue({ success: true });
      item.getEmbeddedItem = vi.fn(() => ({ id: 'embedded1' }));
      
      await item.executeAttackChainIteration({}, mockRollResult, 0, 2);
      
      // First iteration should apply damage even when damageApplication is false
      expect(mockAttackChainExecutor.executeWithRollResult).toHaveBeenCalledWith(
        expect.objectContaining({
          shouldApplyDamage: true
        })
      );
    });
  });

  describe('executeSavedDamageIteration()', () => {
    test('should skip execution when repetitionIndex > 0 and damageApplication is false', async () => {
      item.system.damageApplication = false;
      item.system.savedDamage = { formula: '2d6', type: 'damage' };
      
      mockTargetResolver.resolveTargets.mockResolvedValue({
        success: true,
        targets: []
      });
      
      const result = await item.executeSavedDamageIteration({}, 1, 2);
      
      expect(result.skipped).toBe(true);
      expect(result.damageResults).toEqual([]);
    });

    test('should execute saved damage on first iteration', async () => {
      item.system.damageApplication = false;
      item.system.savedDamage = { formula: '2d6', type: 'damage' };
      
      const mockActor = {
        id: 'actor1',
        name: 'Test Actor',
        damageResolve: vi.fn().mockResolvedValue({ total: 10 }),
        system: { hiddenAbilities: { vuln: { total: 0 } } }
      };
      
      mockTargetResolver.resolveTargets.mockResolvedValue({
        success: true,
        targets: [{ actor: mockActor }]
      });
      
      const result = await item.executeSavedDamageIteration({}, 0, 2);
      
      expect(result.success).toBe(true);
      expect(result.repetitionIndex).toBe(0);
      expect(result.totalRepetitions).toBe(2);
    });

    test('should execute saved damage when damageApplication is true', async () => {
      item.system.damageApplication = true;
      item.system.savedDamage = { formula: '2d6', type: 'damage' };
      
      const mockActor = {
        id: 'actor1',
        name: 'Test Actor',
        damageResolve: vi.fn().mockResolvedValue({ total: 10 }),
        system: { hiddenAbilities: { vuln: { total: 0 } } }
      };
      
      mockTargetResolver.resolveTargets.mockResolvedValue({
        success: true,
        targets: [{ actor: mockActor }]
      });
      
      const result = await item.executeSavedDamageIteration({}, 1, 2);
      
      expect(result.success).toBe(true);
      expect(result.repetitionIndex).toBe(1);
    });
  });

  describe('_processTransformationResults()', () => {
    test('should delegate to TransformationApplicator.processTransformationResults', async () => {
      const mockResults = [{ target: { id: 'actor1' } }];
      const mockRollResult = { total: 15 };
      
      mockTransformationApplicator.processTransformationResults.mockResolvedValue([{ success: true }]);
      
      const result = await item._processTransformationResults(mockResults, mockRollResult, false, true);
      
      expect(mockTransformationApplicator.processTransformationResults).toHaveBeenCalledWith(
        expect.objectContaining({
          results: mockResults,
          rollResult: mockRollResult,
          disableDelays: false,
          isFinalRepetition: true
        })
      );
      expect(result).toEqual([{ success: true }]);
    });

    test('should pass embeddedTransformations from system', async () => {
      item.system.embeddedTransformations = [{ id: 'trans1' }];
      item.system.transformationConfig = { mode: 'select' };
      
      mockTransformationApplicator.processTransformationResults.mockResolvedValue([]);
      
      await item._processTransformationResults([], null);
      
      expect(mockTransformationApplicator.processTransformationResults).toHaveBeenCalledWith(
        expect.objectContaining({
          embeddedTransformations: [{ id: 'trans1' }],
          transformationConfig: { mode: 'select' }
        })
      );
    });

    test('should pass repetitionContext when available', async () => {
      item._currentRepetitionContext = { iteration: 1 };
      
      mockTransformationApplicator.processTransformationResults.mockResolvedValue([]);
      
      await item._processTransformationResults([], null);
      
      expect(mockTransformationApplicator.processTransformationResults).toHaveBeenCalledWith(
        expect.objectContaining({
          repetitionContext: { iteration: 1 }
        })
      );
    });
  });

  describe('_processDamageResults()', () => {
    test('should delegate to DamageProcessor.processDamageResults', async () => {
      const mockResults = [{ target: { id: 'actor1' } }];
      const mockRollResult = { total: 15 };
      
      mockDamageProcessor.processDamageResults.mockResolvedValue([{ total: 10 }]);
      
      await item._processDamageResults(mockResults, mockRollResult);
      
      expect(mockDamageProcessor.processDamageResults).toHaveBeenCalledWith(
        mockResults,
        mockRollResult,
        expect.objectContaining({
          damageFormula: item.system.attackChain.damageFormula,
          damageType: item.system.attackChain.damageType
        })
      );
    });
  });

  describe('_processStatusResults()', () => {
    test('should delegate to StatusEffectApplicator.processStatusResults', async () => {
      const mockResults = [{ target: { id: 'actor1' } }];
      const mockRollResult = { total: 15 };
      
      mockStatusEffectApplicator.processStatusResults.mockResolvedValue([]);
      
      await item._processStatusResults(mockResults, mockRollResult, false, true);
      
      expect(mockStatusEffectApplicator.processStatusResults).toHaveBeenCalledWith(
        expect.objectContaining({
          results: mockResults,
          rollResult: mockRollResult,
          disableDelays: false,
          isFinalRepetition: true
        })
      );
    });
  });
});