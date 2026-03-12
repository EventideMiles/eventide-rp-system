// @ts-nocheck
/**
 * @fileoverview Tests for AttackChainExecutor Service
 *
 * Unit tests for the AttackChainExecutor service which handles attack chain
 * execution, target AC calculation, hit determination, and damage/status/
 * transformation orchestration.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Mock dependencies before import
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    methodEntry: vi.fn(),
    methodExit: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../../../module/services/target-resolver.mjs', () => ({
  TargetResolver: {
    resolveLockedTargets: vi.fn(() => ({ valid: [], invalid: [] }))
  }
}));

// Import the service after setting up mocks
import { AttackChainExecutor } from '../../../module/services/attack-chain-executor.mjs';

describe('AttackChainExecutor', () => {
  let mockActor;
  let mockActionCard;
  let mockEmbeddedItem;
  let mockRollResult;
  let mockAttackChain;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock actor
    mockActor = {
      id: 'actor-123',
      name: 'Test Actor',
      getRollData: vi.fn(() => ({
        abilities: {
          acro: { ac: { total: 14 } },
          phys: { ac: { total: 16 } },
          fort: { ac: { total: 13 } },
          will: { ac: { total: 15 } },
          wits: { ac: { total: 12 } }
        }
      }))
    };

    // Create mock token
    const mockToken = {
      id: 'token-123',
      actor: mockActor,
      document: { id: 'token-123' }
    };

    // Create mock action card
    mockActionCard = {
      id: 'action-card-123',
      name: 'Test Action Card',
      system: {}
    };

    // Create mock embedded item
    mockEmbeddedItem = {
      id: 'embedded-123',
      name: 'Test Embedded Item',
      system: {
        roll: { type: 'attack' }
      }
    };

    // Create mock roll result
    mockRollResult = {
      total: 15,
      formula: '1d20+5',
      messageId: 'roll-message-123'
    };

    // Create mock attack chain
    mockAttackChain = {
      firstStat: 'acro',
      secondStat: 'phys',
      damageCondition: 'oneSuccess',
      damageThreshold: 15,
      statusCondition: 'twoSuccesses',
      statusThreshold: 15,
      damageFormula: '2d6',
      damageType: 'physical'
    };

    // Mock global utilities
    global.erps = {
      utils: {
        // getTargetArray must return array of objects with .token property
        // because implementation extracts tokens via .map((r) => r.token)
        getTargetArray: vi.fn(async () => [{ token: mockToken }])
      },
      targetUtils: {
        resolveLockedTargets: vi.fn(() => ({ valid: [], invalid: [] }))
      }
    };

    global.game = {
      user: {
        isGM: false
      },
      i18n: {
        localize: vi.fn((key) => key)
      }
    };

    global.ui = {
      notifications: {
        warn: vi.fn()
      }
    };
  });

  const createMockContext = (overrides = {}) => ({
    actionCard: mockActionCard,
    actor: mockActor,
    rollResult: mockRollResult,
    embeddedItem: mockEmbeddedItem,
    attackChain: mockAttackChain,
    embeddedTransformations: [],
    lockedTargets: null,
    processDamage: vi.fn(async () => []),
    processStatus: vi.fn(async () => []),
    processTransformation: vi.fn(async () => []),
    waitForDelay: vi.fn(async () => {}),
    disableDelays: true,
    shouldApplyDamage: true,
    shouldApplyStatus: true,
    isFinalRepetition: true,
    ...overrides
  });

  describe('calculateTargetHits()', () => {
    test('should calculate hits for all targets', () => {
      const target1 = {
        id: 'token-1',
        actor: {
          id: 'actor-1',
          getRollData: vi.fn(() => ({
            abilities: {
              acro: { ac: { total: 14 } },
              phys: { ac: { total: 16 } }
            }
          }))
        }
      };

      const target2 = {
        id: 'token-2',
        actor: {
          id: 'actor-2',
          getRollData: vi.fn(() => ({
            abilities: {
              acro: { ac: { total: 18 } },
              phys: { ac: { total: 20 } }
            }
          }))
        }
      };

      const results = AttackChainExecutor.calculateTargetHits(
        [target1, target2],
        mockRollResult,
        mockEmbeddedItem,
        mockAttackChain
      );

      expect(results).toHaveLength(2);

      // Target 1: roll 15 >= 14 (first hit), 15 < 16 (second miss)
      expect(results[0].target).toBe(target1.actor);
      expect(results[0].firstHit).toBe(true);
      expect(results[0].secondHit).toBe(false);
      expect(results[0].bothHit).toBe(false);
      expect(results[0].oneHit).toBe(true);

      // Target 2: roll 15 < 18 (first miss), 15 < 20 (second miss)
      expect(results[1].target).toBe(target2.actor);
      expect(results[1].firstHit).toBe(false);
      expect(results[1].secondHit).toBe(false);
      expect(results[1].bothHit).toBe(false);
      expect(results[1].oneHit).toBe(false);
    });

    test('should handle both hits', () => {
      const target = {
        id: 'token-1',
        actor: {
          id: 'actor-1',
          getRollData: vi.fn(() => ({
            abilities: {
              acro: { ac: { total: 12 } },
              phys: { ac: { total: 13 } }
            }
          }))
        }
      };

      const results = AttackChainExecutor.calculateTargetHits(
        [target],
        mockRollResult,
        mockEmbeddedItem,
        mockAttackChain
      );

      expect(results[0].firstHit).toBe(true);
      expect(results[0].secondHit).toBe(true);
      expect(results[0].bothHit).toBe(true);
      expect(results[0].oneHit).toBe(true);
    });

    test('should handle "none" roll type as automatic hits', () => {
      const noneEmbeddedItem = {
        system: {
          roll: { type: 'none' }
        }
      };

      const target = {
        id: 'token-1',
        actor: {
          id: 'actor-1',
          getRollData: vi.fn(() => ({
            abilities: {
              acro: { ac: { total: 20 } },
              phys: { ac: { total: 25 } }
            }
          }))
        }
      };

      const results = AttackChainExecutor.calculateTargetHits(
        [target],
        null,
        noneEmbeddedItem,
        mockAttackChain
      );

      expect(results[0].firstHit).toBe(true);
      expect(results[0].secondHit).toBe(true);
      expect(results[0].bothHit).toBe(true);
      expect(results[0].oneHit).toBe(true);
    });

    test('should use default AC of 11 when ability not found', () => {
      const target = {
        id: 'token-1',
        actor: {
          id: 'actor-1',
          getRollData: vi.fn(() => ({
            abilities: {
              // Missing abilities
            }
          }))
        }
      };

      const results = AttackChainExecutor.calculateTargetHits(
        [target],
        mockRollResult,
        mockEmbeddedItem,
        mockAttackChain
      );

      // Should use default AC of 11, so 15 >= 11 for both
      expect(results[0].firstHit).toBe(true);
      expect(results[0].secondHit).toBe(true);
    });

    test('should handle null roll result', () => {
      const target = {
        id: 'token-1',
        actor: {
          id: 'actor-1',
          getRollData: vi.fn(() => ({
            abilities: {
              acro: { ac: { total: 10 } },
              phys: { ac: { total: 12 } }
            }
          }))
        }
      };

      const results = AttackChainExecutor.calculateTargetHits(
        [target],
        null,
        mockEmbeddedItem,
        mockAttackChain
      );

      expect(results[0].firstHit).toBe(false);
      expect(results[0].secondHit).toBe(false);
      expect(results[0].bothHit).toBe(false);
      expect(results[0].oneHit).toBe(false);
    });

    test('should handle missing roll total', () => {
      const target = {
        id: 'token-1',
        actor: {
          id: 'actor-1',
          getRollData: vi.fn(() => ({
            abilities: {
              acro: { ac: { total: 10 } },
              phys: { ac: { total: 12 } }
            }
          }))
        }
      };

      const results = AttackChainExecutor.calculateTargetHits(
        [target],
        {},
        mockEmbeddedItem,
        mockAttackChain
      );

      expect(results[0].firstHit).toBe(false);
      expect(results[0].secondHit).toBe(false);
    });
  });

  describe('executeWithRollResult()', () => {
    test('should execute attack chain successfully', async () => {
      const context = createMockContext();
      const result = await AttackChainExecutor.executeWithRollResult(context);

      expect(result.success).toBe(true);
      expect(result.mode).toBe('attackChain');
      expect(result.baseRoll).toBe(mockRollResult);
      expect(result.embeddedItemRollMessage).toBe('roll-message-123');
      expect(result.targetResults).toBeDefined();
      expect(result.damageResults).toBeDefined();
      expect(result.statusResults).toBeDefined();
      expect(result.transformationResults).toBeDefined();
    });

    test('should return failure when no targets found', async () => {
      global.erps.utils.getTargetArray.mockResolvedValueOnce([]);

      const context = createMockContext();
      const result = await AttackChainExecutor.executeWithRollResult(context);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('noTargets');
      expect(global.ui.notifications.warn).toHaveBeenCalled();
    });

    test('should not call processDamage when shouldApplyDamage is false', async () => {
      const context = createMockContext({ shouldApplyDamage: false });
      await AttackChainExecutor.executeWithRollResult(context);

      expect(context.processDamage).not.toHaveBeenCalled();
    });

    test('should not call processStatus when shouldApplyStatus is false', async () => {
      const context = createMockContext({ shouldApplyStatus: false });
      await AttackChainExecutor.executeWithRollResult(context);

      expect(context.processStatus).not.toHaveBeenCalled();
    });

    test('should not call processTransformation when no transformations', async () => {
      const context = createMockContext({ embeddedTransformations: [] });
      await AttackChainExecutor.executeWithRollResult(context);

      expect(context.processTransformation).not.toHaveBeenCalled();
    });

    test('should call processTransformation when transformations exist', async () => {
      const context = createMockContext({ embeddedTransformations: [{ id: 'trans-1' }] });
      await AttackChainExecutor.executeWithRollResult(context);

      expect(context.processTransformation).toHaveBeenCalled();
    });

    test('should use locked targets when provided', async () => {
      const { TargetResolver } = await import('../../../module/services/target-resolver.mjs');

      const lockedTarget = {
        token: { id: 'token-1', actor: mockActor },
        valid: true
      };

      TargetResolver.resolveLockedTargets.mockReturnValue({
        valid: [lockedTarget],
        invalid: []
      });

      const context = createMockContext({ lockedTargets: [lockedTarget] });
      await AttackChainExecutor.executeWithRollResult(context);

      expect(TargetResolver.resolveLockedTargets).toHaveBeenCalledWith([lockedTarget]);
    });

    test('should not wait for initial delay when not GM', async () => {
      const context = createMockContext({ disableDelays: false });
      await AttackChainExecutor.executeWithRollResult(context);

      // Should call waitForDelay for damage/status delays, but NOT the initial GM-only delay
      // When not GM: initial delay is skipped, but damage delay is still called (1 time)
      expect(context.waitForDelay).toHaveBeenCalledTimes(1);
    });

    test('should wait for delay when GM and delays enabled', async () => {
      global.game.user.isGM = true;
      const context = createMockContext({ disableDelays: false });
      await AttackChainExecutor.executeWithRollResult(context);

      expect(context.waitForDelay).toHaveBeenCalled();
    });
  });
});