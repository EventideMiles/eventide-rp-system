// @ts-nocheck
/**
 * @fileoverview Tests for GMControlManager service
 *
 * Tests the GM control manager for handling action card effects including
 * damage application, status effects, player approval, and bulk operations.
 */

import { gmControlManager } from '../../../../module/services/managers/gm-control.mjs';

// Mock Logger
vi.mock('../../../../module/services/logger.mjs', () => ({
  Logger: {
    methodEntry: vi.fn(),
    methodExit: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock MessageFlags
vi.mock('../../../../module/helpers/message-flags.mjs', () => ({
  MessageFlags: {
    getGMApplyFlag: vi.fn(),
    updateGMApplyFlag: vi.fn(),
    getPlayerActionApprovalFlag: vi.fn(),
    updatePlayerActionApprovalFlag: vi.fn(),
    hasPendingApplications: vi.fn(),
    validateTargets: vi.fn(),
  },
}));

// Mock StatusIntensification
vi.mock('../../../../module/helpers/status-intensification.mjs', () => ({
  StatusIntensification: {
    applyOrIntensifyStatus: vi.fn(),
  },
}));

// Mock DamageProcessor
vi.mock('../../../../module/services/damage-processor.mjs', () => ({
  DamageProcessor: {
    applyVulnerabilityModifier: vi.fn(),
  },
}));

// Mock system-messages
vi.mock('../../../../module/services/managers/system-messages.mjs', () => ({
  notifyPlayerActionResult: vi.fn(),
}));

// Import mocked modules
import { MessageFlags } from '../../../../module/helpers/message-flags.mjs';
import { DamageProcessor } from '../../../../module/services/damage-processor.mjs';

describe('GMControlManager', () => {
  let mockMessage;
  let mockTargetActor;
  let mockSourceActor;
  let mockActionCard;
  let mockDamageRoll;
  let mockUser;
  let mockGame;
  let mockUi;
  let mockCanvas;
  let mockConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock user
    mockUser = {
      id: 'user1',
      name: 'TestGM',
      isGM: true,
    };

    // Setup mock canvas
    mockCanvas = {
      tokens: {
        placeables: [],
        setTargets: vi.fn(),
      },
    };

    // Setup mock UI
    mockUi = {
      notifications: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
      },
    };

    // Setup mock game
    mockGame = {
      user: mockUser,
      actors: new Map(),
      messages: [],
      settings: {
        get: vi.fn(() => 2000),
      },
      i18n: {
        localize: vi.fn((key) => key),
      },
    };

    // Setup mock CONFIG
    mockConfig = {
      Item: {
        documentClass: vi.fn((data) => ({
          ...data,
          name: data.name || 'Mock Action Card',
          system: data.system || {},
          img: data.img || null,
        })),
      },
    };

    // Assign to globals
    global.game = mockGame;
    global.ui = mockUi;
    global.canvas = mockCanvas;
    global.CONFIG = mockConfig;

    // Setup mock target actor
    mockTargetActor = {
      id: 'target1',
      name: 'Target Actor',
      damageResolve: vi.fn(() => Promise.resolve(mockDamageRoll)),
    };

    // Setup mock source actor
    mockSourceActor = {
      id: 'source1',
      name: 'Source Actor',
      items: new Map(),
    };

    // Setup mock action card
    mockActionCard = {
      id: 'action1',
      name: 'Test Action Card',
      system: {
        description: 'Test action card description',
        _getEffectiveImage: vi.fn(() => 'action-card.png'),
        bgColor: '#ff0000',
        textColor: '#ffffff',
      },
      img: 'default-action.png',
      executeWithRollResult: vi.fn(() => Promise.resolve({ success: true })),
    };

    // Setup mock damage roll
    mockDamageRoll = {
      total: 10,
      formula: '2d6',
    };

    // Setup mock message
    mockMessage = {
      id: 'msg1',
      flags: {},
      delete: vi.fn(() => Promise.resolve()),
    };

    // Add actors to game
    mockGame.actors.set('target1', mockTargetActor);
    mockGame.actors.set('source1', mockSourceActor);

    // Add action card to source actor
    mockSourceActor.items.set('action1', mockActionCard);

    // Default mock implementations
    MessageFlags.getGMApplyFlag.mockReturnValue({
      actionCardId: 'action1',
      actorId: 'source1',
      damage: {
        targetId: 'target1',
        formula: '2d6',
        type: 'physical',
        applied: false,
      },
      status: {
        targetId: 'target1',
        effects: [],
        applied: false,
      },
    });

    MessageFlags.updateGMApplyFlag.mockResolvedValue(mockMessage);
    DamageProcessor.applyVulnerabilityModifier.mockReturnValue('2d6');
  });

  describe('constructor', () => {
    test('should initialize with pending applications map', () => {
      expect(gmControlManager.pendingApplications).toBeInstanceOf(Map);
    });
  });

  describe('hasGMPermission()', () => {
    test('should return true for GM user', () => {
      const result = gmControlManager.hasGMPermission(mockUser);
      expect(result).toBe(true);
    });

    test('should return true for GM when using default game.user', () => {
      const result = gmControlManager.hasGMPermission();
      expect(result).toBe(true);
    });

    test('should return false for non-GM user', () => {
      mockUser.isGM = false;
      const result = gmControlManager.hasGMPermission(mockUser);
      expect(result).toBe(false);
    });
  });

  describe('cleanup()', () => {
    test('should call cleanup method without errors', () => {
      expect(() => gmControlManager.cleanup()).not.toThrow();
    });
  });

  describe('getPendingStats()', () => {
    test('should return statistics with zero values when no pending messages', () => {
      MessageFlags.hasPendingApplications.mockReturnValue(false);
      mockGame.messages = [];

      const stats = gmControlManager.getPendingStats();

      expect(stats).toEqual({
        totalMessages: 0,
        pendingDamage: 0,
        pendingStatus: 0,
      });
    });

    test('should count pending damage applications', () => {
      const mockMessage1 = { id: 'msg1', flags: {} };
      const mockMessage2 = { id: 'msg2', flags: {} };
      mockGame.messages = [mockMessage1, mockMessage2];

      MessageFlags.hasPendingApplications.mockImplementation((msg) => {
        return msg.id === 'msg1' || msg.id === 'msg2';
      });

      MessageFlags.getGMApplyFlag.mockImplementation((msg) => {
        if (msg.id === 'msg1') {
          return {
            damage: { applied: false },
            status: null,
          };
        } else if (msg.id === 'msg2') {
          return {
            damage: { applied: false },
            status: { applied: false },
          };
        }
        return null;
      });

      const stats = gmControlManager.getPendingStats();

      expect(stats.totalMessages).toBe(2);
      expect(stats.pendingDamage).toBe(2);
      expect(stats.pendingStatus).toBe(1);
    });

    test('should count pending status applications', () => {
      const mockMessage = { id: 'msg1', flags: {} };
      mockGame.messages = [mockMessage];

      MessageFlags.hasPendingApplications.mockReturnValue(true);
      MessageFlags.getGMApplyFlag.mockReturnValue({
        damage: null,
        status: { applied: false },
      });

      const stats = gmControlManager.getPendingStats();

      expect(stats.totalMessages).toBe(1);
      expect(stats.pendingDamage).toBe(0);
      expect(stats.pendingStatus).toBe(1);
    });
  });

  describe('applyDamage()', () => {
    beforeEach(() => {
      MessageFlags.getGMApplyFlag.mockReturnValue({
        actionCardId: 'action1',
        actorId: 'source1',
        damage: {
          targetId: 'target1',
          formula: '2d6',
          type: 'physical',
          applied: false,
        },
      });
    });

    test('should apply damage successfully to target actor', async () => {
      const result = await gmControlManager.applyDamage(
        mockMessage,
        'target1',
        '2d6',
        'physical',
      );

      expect(result).toBe(true);
      expect(mockTargetActor.damageResolve).toHaveBeenCalledWith({
        formula: '2d6',
        label: 'Test Action Card',
        description: 'Test action card description',
        type: 'physical',
        img: 'action-card.png',
        bgColor: '#ff0000',
        textColor: '#ffffff',
      });
      expect(MessageFlags.updateGMApplyFlag).toHaveBeenCalledWith(
        mockMessage,
        'damage',
        { applied: true, targetValid: true },
      );
      expect(ui.notifications.info).toHaveBeenCalledWith(
        'Applied 10 physical damage to Target Actor',
      );
    });

    test('should return false and warn when target actor is missing', async () => {
      const result = await gmControlManager.applyDamage(
        mockMessage,
        'nonexistent',
        '2d6',
        'physical',
      );

      expect(result).toBe(false);
      expect(ui.notifications.warn).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Errors.TargetActorMissing',
      );
      expect(MessageFlags.updateGMApplyFlag).toHaveBeenCalledWith(
        mockMessage,
        'damage',
        { applied: false, targetValid: false },
      );
      expect(mockTargetActor.damageResolve).not.toHaveBeenCalled();
    });

    test('should apply vulnerability modifier to damage formula', async () => {
      DamageProcessor.applyVulnerabilityModifier.mockReturnValue('4d6');

      await gmControlManager.applyDamage(
        mockMessage,
        'target1',
        '2d6',
        'physical',
      );

      expect(DamageProcessor.applyVulnerabilityModifier).toHaveBeenCalledWith(
        '2d6',
        'physical',
        mockTargetActor,
      );
      expect(mockTargetActor.damageResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          formula: '4d6',
        }),
      );
    });

    test('should handle damage resolution error gracefully', async () => {
      const damageError = new Error('Roll failed');
      mockTargetActor.damageResolve.mockRejectedValue(damageError);

      const result = await gmControlManager.applyDamage(
        mockMessage,
        'target1',
        '2d6',
        'physical',
      );

      expect(result).toBe(false);
      expect(ui.notifications.error).toHaveBeenCalledWith(
        'Failed to apply damage: Roll failed',
      );
      expect(MessageFlags.updateGMApplyFlag).toHaveBeenCalledWith(
        mockMessage,
        'damage',
        { applied: true, failed: true, error: 'Roll failed' },
      );
    });

    test('should use default values when action card is not found', async () => {
      MessageFlags.getGMApplyFlag.mockReturnValue({
        actionCardId: 'nonexistent',
        actorId: 'source1',
        damage: {
          targetId: 'target1',
          formula: '2d6',
          type: 'physical',
          applied: false,
        },
      });

      await gmControlManager.applyDamage(
        mockMessage,
        'target1',
        '2d6',
        'physical',
      );

      expect(mockTargetActor.damageResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'Action Card',
          description: 'Damage from action card attack chain',
        }),
      );
    });

    test('should use stored action card data when item not found', async () => {
      const storedActionCardData = {
        id: 'action2',
        name: 'Stored Action Card',
        img: 'stored.png',
        system: {
          description: 'Stored description',
          bgColor: '#00ff00',
          textColor: '#000000',
          _getEffectiveImage: vi.fn(() => 'stored.png'),
        },
      };

      MessageFlags.getGMApplyFlag.mockReturnValue({
        actionCardId: 'action2',
        actorId: 'source1',
        actionCardData: storedActionCardData,
        damage: {
          targetId: 'target1',
          formula: '2d6',
          type: 'physical',
          applied: false,
        },
      });

      await gmControlManager.applyDamage(
        mockMessage,
        'target1',
        '2d6',
        'physical',
      );

      expect(mockTargetActor.damageResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'Stored Action Card',
          description: 'Stored description',
          img: 'stored.png',
        }),
      );
    });

    test('should wait for execution delay before checking auto cleanup', async () => {
      vi.useFakeTimers();
      mockGame.settings.get.mockReturnValue(1000);

      const promise = gmControlManager.applyDamage(
        mockMessage,
        'target1',
        '2d6',
        'physical',
      );

      await vi.advanceTimersByTimeAsync(1000);
      await promise;

      vi.useRealTimers();
    });
  });

  describe('applyStatusEffects()', () => {
    beforeEach(() => {
      MessageFlags.getGMApplyFlag.mockReturnValue({
        status: {
          targetId: 'target1',
          effects: [
            {
              type: 'status',
              name: 'Burning',
              system: {},
            },
          ],
          applied: false,
        },
      });
    });

    test('should apply status effects successfully to target actor', async () => {
      const { StatusIntensification } = await import(
        '../../../../module/helpers/status-intensification.mjs'
      );
      StatusIntensification.applyOrIntensifyStatus.mockResolvedValue({
        applied: true,
      });

      const result = await gmControlManager.applyStatusEffects(
        mockMessage,
        'target1',
      );

      expect(result).toBe(true);
      expect(StatusIntensification.applyOrIntensifyStatus).toHaveBeenCalledWith(
        mockTargetActor,
        expect.objectContaining({
          type: 'status',
          name: 'Burning',
          flags: {
            'eventide-rp-system': {
              isEffect: true,
            },
          },
        }),
      );
      expect(MessageFlags.updateGMApplyFlag).toHaveBeenCalledWith(
        mockMessage,
        'status',
        { applied: true, targetValid: true, appliedCount: 1 },
      );
      expect(ui.notifications.info).toHaveBeenCalledWith(
        'Applied 1 status effect(s) to Target Actor',
      );
    });

    test('should return false and warn when target actor is missing', async () => {
      const result = await gmControlManager.applyStatusEffects(
        mockMessage,
        'nonexistent',
      );

      expect(result).toBe(false);
      expect(ui.notifications.warn).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Errors.TargetActorMissing',
      );
      expect(MessageFlags.updateGMApplyFlag).toHaveBeenCalledWith(
        mockMessage,
        'status',
        { applied: false, targetValid: false },
      );
    });

    test('should return false when no status effects in message flag', async () => {
      MessageFlags.getGMApplyFlag.mockReturnValue({
        status: null,
      });

      const result = await gmControlManager.applyStatusEffects(
        mockMessage,
        'target1',
      );

      expect(result).toBe(false);
      expect(ui.notifications.error).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Errors.NoStatusEffectsInMessage',
      );
    });

    test('should prepare gear effects with equipped and quantity', async () => {
      const { StatusIntensification } = await import(
        '../../../../module/helpers/status-intensification.mjs'
      );
      StatusIntensification.applyOrIntensifyStatus.mockResolvedValue({
        applied: true,
      });

      MessageFlags.getGMApplyFlag.mockReturnValue({
        status: {
          targetId: 'target1',
          effects: [
            {
              type: 'gear',
              name: 'Shield',
              system: {},
            },
          ],
          applied: false,
        },
      });

      await gmControlManager.applyStatusEffects(mockMessage, 'target1');

      expect(StatusIntensification.applyOrIntensifyStatus).toHaveBeenCalledWith(
        mockTargetActor,
        expect.objectContaining({
          type: 'gear',
          name: 'Shield',
          system: {
            equipped: true,
            quantity: 1,
          },
          flags: {
            'eventide-rp-system': {
              isEffect: true,
            },
          },
        }),
      );
    });

    test('should handle status effect application errors gracefully', async () => {
      const { StatusIntensification } = await import(
        '../../../../module/helpers/status-intensification.mjs'
      );
      StatusIntensification.applyOrIntensifyStatus.mockRejectedValue(
        new Error('Effect failed'),
      );

      const result = await gmControlManager.applyStatusEffects(
        mockMessage,
        'target1',
      );

      expect(result).toBe(true);
      expect(ui.notifications.warn).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Errors.NoStatusApplied',
      );
    });

    test('should warn when no status effects were successfully applied', async () => {
      const { StatusIntensification } = await import(
        '../../../../module/helpers/status-intensification.mjs'
      );
      StatusIntensification.applyOrIntensifyStatus.mockResolvedValue({
        applied: false,
      });

      await gmControlManager.applyStatusEffects(mockMessage, 'target1');

      expect(ui.notifications.warn).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Errors.NoStatusApplied',
      );
    });

    test('should count multiple applied status effects', async () => {
      const { StatusIntensification } = await import(
        '../../../../module/helpers/status-intensification.mjs'
      );
      StatusIntensification.applyOrIntensifyStatus.mockResolvedValue({
        applied: true,
      });

      MessageFlags.getGMApplyFlag.mockReturnValue({
        status: {
          targetId: 'target1',
          effects: [
            { type: 'status', name: 'Burning', system: {} },
            { type: 'status', name: 'Frozen', system: {} },
            { type: 'status', name: 'Poisoned', system: {} },
          ],
          applied: false,
        },
      });

      await gmControlManager.applyStatusEffects(mockMessage, 'target1');

      expect(MessageFlags.updateGMApplyFlag).toHaveBeenCalledWith(
        mockMessage,
        'status',
        { applied: true, targetValid: true, appliedCount: 3 },
      );
    });
  });

  describe('discardDamage()', () => {
    test('should mark damage as discarded and update flag', async () => {
      const result = await gmControlManager.discardDamage(mockMessage);

      expect(result).toBe(true);
      expect(MessageFlags.updateGMApplyFlag).toHaveBeenCalledWith(
        mockMessage,
        'damage',
        { applied: true, discarded: true },
      );
      expect(ui.notifications.info).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Info.DamageDiscarded',
      );
    });
  });

  describe('discardStatusEffects()', () => {
    test('should mark status effects as discarded and update flag', async () => {
      const result = await gmControlManager.discardStatusEffects(mockMessage);

      expect(result).toBe(true);
      expect(MessageFlags.updateGMApplyFlag).toHaveBeenCalledWith(
        mockMessage,
        'status',
        { applied: true, discarded: true },
      );
      expect(ui.notifications.info).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Info.StatusEffectsDiscarded',
      );
    });
  });

  describe('applyAllEffects()', () => {
    beforeEach(() => {
      MessageFlags.getGMApplyFlag.mockReturnValue({
        actionCardId: 'action1',
        actorId: 'source1',
        damage: {
          targetId: 'target1',
          formula: '2d6',
          type: 'physical',
          applied: false,
        },
        status: {
          targetId: 'target1',
          effects: [{ type: 'status', name: 'Burning', system: {} }],
          applied: false,
        },
      });
    });

    test('should apply both damage and status effects successfully', async () => {
      const { StatusIntensification } = await import(
        '../../../../module/helpers/status-intensification.mjs'
      );
      StatusIntensification.applyOrIntensifyStatus.mockResolvedValue({
        applied: true,
      });

      const result = await gmControlManager.applyAllEffects(mockMessage);

      expect(result).toBe(true);
      expect(mockTargetActor.damageResolve).toHaveBeenCalled();
      expect(MessageFlags.updateGMApplyFlag).toHaveBeenCalledWith(
        mockMessage,
        'damage',
        { applied: true, targetValid: true },
      );
      expect(MessageFlags.updateGMApplyFlag).toHaveBeenCalledWith(
        mockMessage,
        'status',
        { applied: true, targetValid: true, appliedCount: 1 },
      );
      expect(ui.notifications.info).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Info.AllEffectsApplied',
      );
    });

    test('should apply only damage when status is already applied', async () => {
      MessageFlags.getGMApplyFlag.mockReturnValue({
        actionCardId: 'action1',
        actorId: 'source1',
        damage: {
          targetId: 'target1',
          formula: '2d6',
          type: 'physical',
          applied: false,
        },
        status: {
          targetId: 'target1',
          effects: [{ type: 'status', name: 'Burning', system: {} }],
          applied: true,
        },
      });

      const result = await gmControlManager.applyAllEffects(mockMessage);

      expect(result).toBe(true);
      expect(mockTargetActor.damageResolve).toHaveBeenCalled();
      expect(ui.notifications.info).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Info.AllEffectsApplied',
      );
    });

    test('should apply only status effects when damage is already applied', async () => {
      MessageFlags.getGMApplyFlag.mockReturnValue({
        actionCardId: 'action1',
        actorId: 'source1',
        damage: {
          targetId: 'target1',
          formula: '2d6',
          type: 'physical',
          applied: true,
        },
        status: {
          targetId: 'target1',
          effects: [{ type: 'status', name: 'Burning', system: {} }],
          applied: false,
        },
      });

      const result = await gmControlManager.applyAllEffects(mockMessage);

      expect(result).toBe(true);
      expect(mockTargetActor.damageResolve).not.toHaveBeenCalled();
      expect(ui.notifications.info).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Info.AllEffectsApplied',
      );
    });

    test('should return false and warn when flag is missing', async () => {
      MessageFlags.getGMApplyFlag.mockReturnValue(null);

      const result = await gmControlManager.applyAllEffects(mockMessage);

      expect(result).toBe(false);
      expect(ui.notifications.warn).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Errors.NoGMApplyData',
      );
    });

    test('should handle partial failure and warn', async () => {
      mockTargetActor.damageResolve.mockRejectedValue(new Error('Damage failed'));

      const result = await gmControlManager.applyAllEffects(mockMessage);

      expect(result).toBe(false);
      expect(ui.notifications.warn).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Errors.SomeEffectsFailed',
      );
    });

    test('should handle case where only damage exists', async () => {
      MessageFlags.getGMApplyFlag.mockReturnValue({
        actionCardId: 'action1',
        actorId: 'source1',
        damage: {
          targetId: 'target1',
          formula: '2d6',
          type: 'physical',
          applied: false,
        },
      });

      const result = await gmControlManager.applyAllEffects(mockMessage);

      expect(result).toBe(true);
      expect(ui.notifications.info).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Info.AllEffectsApplied',
      );
    });

    test('should handle case where only status exists', async () => {
      MessageFlags.getGMApplyFlag.mockReturnValue({
        actionCardId: 'action1',
        actorId: 'source1',
        status: {
          targetId: 'target1',
          effects: [{ type: 'status', name: 'Burning', system: {} }],
          applied: false,
        },
      });

      const result = await gmControlManager.applyAllEffects(mockMessage);

      expect(result).toBe(true);
      expect(ui.notifications.info).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Info.AllEffectsApplied',
      );
    });
  });

  describe('discardAllEffects()', () => {
    beforeEach(() => {
      MessageFlags.getGMApplyFlag.mockReturnValue({
        damage: {
          targetId: 'target1',
          formula: '2d6',
          type: 'physical',
          applied: false,
        },
        status: {
          targetId: 'target1',
          effects: [{ type: 'status', name: 'Burning', system: {} }],
          applied: false,
        },
      });
    });

    test('should discard both damage and status effects successfully', async () => {
      const result = await gmControlManager.discardAllEffects(mockMessage);

      expect(result).toBe(true);
      expect(MessageFlags.updateGMApplyFlag).toHaveBeenCalledWith(
        mockMessage,
        'damage',
        { applied: true, discarded: true },
      );
      expect(MessageFlags.updateGMApplyFlag).toHaveBeenCalledWith(
        mockMessage,
        'status',
        { applied: true, discarded: true },
      );
      expect(ui.notifications.info).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Info.AllEffectsDiscarded',
      );
    });

    test('should discard only damage when status is already applied', async () => {
      MessageFlags.getGMApplyFlag.mockReturnValue({
        damage: {
          targetId: 'target1',
          formula: '2d6',
          type: 'physical',
          applied: false,
        },
        status: {
          targetId: 'target1',
          effects: [{ type: 'status', name: 'Burning', system: {} }],
          applied: true,
        },
      });

      const result = await gmControlManager.discardAllEffects(mockMessage);

      expect(result).toBe(true);
      expect(ui.notifications.info).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Info.AllEffectsDiscarded',
      );
    });

    test('should discard only status when damage is already applied', async () => {
      MessageFlags.getGMApplyFlag.mockReturnValue({
        damage: {
          targetId: 'target1',
          formula: '2d6',
          type: 'physical',
          applied: true,
        },
        status: {
          targetId: 'target1',
          effects: [{ type: 'status', name: 'Burning', system: {} }],
          applied: false,
        },
      });

      const result = await gmControlManager.discardAllEffects(mockMessage);

      expect(result).toBe(true);
      expect(ui.notifications.info).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Info.AllEffectsDiscarded',
      );
    });

    test('should return false and warn when flag is missing', async () => {
      MessageFlags.getGMApplyFlag.mockReturnValue(null);

      const result = await gmControlManager.discardAllEffects(mockMessage);

      expect(result).toBe(false);
      expect(ui.notifications.warn).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Errors.NoGMApplyData',
      );
    });

    test('should handle partial failure and warn', async () => {
      MessageFlags.updateGMApplyFlag.mockRejectedValueOnce(
        new Error('Update failed'),
      );

      const result = await gmControlManager.discardAllEffects(mockMessage);

      expect(result).toBe(false);
      expect(ui.notifications.warn).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Errors.SomeDiscardFailed',
      );
    });

    test('should handle case where only damage exists', async () => {
      MessageFlags.getGMApplyFlag.mockReturnValue({
        damage: {
          targetId: 'target1',
          formula: '2d6',
          type: 'physical',
          applied: false,
        },
      });

      const result = await gmControlManager.discardAllEffects(mockMessage);

      expect(result).toBe(true);
      expect(ui.notifications.info).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Info.AllEffectsDiscarded',
      );
    });

    test('should handle case where only status exists', async () => {
      MessageFlags.getGMApplyFlag.mockReturnValue({
        status: {
          targetId: 'target1',
          effects: [{ type: 'status', name: 'Burning', system: {} }],
          applied: false,
        },
      });

      const result = await gmControlManager.discardAllEffects(mockMessage);

      expect(result).toBe(true);
      expect(ui.notifications.info).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Info.AllEffectsDiscarded',
      );
    });
  });

  describe('approvePlayerAction()', () => {
    let mockPlayerApprovalMessage;

    beforeEach(() => {
      mockPlayerApprovalMessage = {
        id: 'playerMsg1',
        flags: {},
        delete: vi.fn(() => Promise.resolve()),
      };

      MessageFlags.getPlayerActionApprovalFlag.mockReturnValue({
        playerId: 'player1',
        playerName: 'Test Player',
        actorId: 'source1',
        actionCardId: 'action1',
        targetIds: ['target1'],
        rollResult: 15,
        lockedTargets: { target1: 'hit' },
        transformationSelections: {},
        selectedEffectIds: [],
        timestamp: Date.now(),
        processed: false,
      });

      MessageFlags.updatePlayerActionApprovalFlag.mockResolvedValue(
        mockPlayerApprovalMessage,
      );
    });

    test('should return false when approval flag is missing', async () => {
      MessageFlags.getPlayerActionApprovalFlag.mockReturnValue(null);

      const result = await gmControlManager.approvePlayerAction(
        mockPlayerApprovalMessage,
        true,
      );

      expect(result).toBe(false);
      expect(ui.notifications.warn).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Errors.NoPlayerActionApproval',
      );
    });

    test('should return false when action is already processed', async () => {
      MessageFlags.getPlayerActionApprovalFlag.mockReturnValue({
        playerId: 'player1',
        playerName: 'Test Player',
        actorId: 'source1',
        actionCardId: 'action1',
        targetIds: ['target1'],
        rollResult: 15,
        processed: true,
        timestamp: Date.now(),
      });

      const result = await gmControlManager.approvePlayerAction(
        mockPlayerApprovalMessage,
        true,
      );

      expect(result).toBe(false);
      expect(ui.notifications.warn).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Errors.ActionAlreadyProcessed',
      );
      expect(mockPlayerApprovalMessage.delete).not.toHaveBeenCalled();
    });

    test('should update flag and delete message when approving', async () => {
      await gmControlManager.approvePlayerAction(
        mockPlayerApprovalMessage,
        true,
      );

      expect(MessageFlags.updatePlayerActionApprovalFlag).toHaveBeenCalledWith(
        mockPlayerApprovalMessage,
        true,
        'TestGM',
      );
      expect(mockPlayerApprovalMessage.delete).toHaveBeenCalled();
    });

    test('should notify player of approval result', async () => {
      const { notifyPlayerActionResult } = await import(
        '../../../../module/services/managers/system-messages.mjs'
      );

      await gmControlManager.approvePlayerAction(
        mockPlayerApprovalMessage,
        true,
      );

      expect(notifyPlayerActionResult).toHaveBeenCalledWith(
        'player1',
        'Test Player',
        'action1',
        true,
        'TestGM',
      );
    });

    test('should handle message deletion failure gracefully', async () => {
      const deleteError = new Error('Delete failed');
      mockPlayerApprovalMessage.delete.mockRejectedValue(deleteError);

      const result = await gmControlManager.approvePlayerAction(
        mockPlayerApprovalMessage,
        true,
      );

      expect(result).toBe(true);
      expect(mockPlayerApprovalMessage.delete).toHaveBeenCalled();
    });

    test('should return error when actor not found for approved action', async () => {
      mockGame.actors.delete('source1');

      const result = await gmControlManager.approvePlayerAction(
        mockPlayerApprovalMessage,
        true,
      );

      expect(result).toBe(false);
      expect(ui.notifications.error).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Errors.UnableToFindActor',
      );
    });

    test('should execute action card when approved', async () => {
      await gmControlManager.approvePlayerAction(
        mockPlayerApprovalMessage,
        true,
      );

      expect(mockActionCard.executeWithRollResult).toHaveBeenCalledWith(
        mockSourceActor,
        15,
        {
          lockedTargets: { target1: 'hit' },
          transformationSelections: {},
          selectedEffectIds: [],
        },
      );
    });

    test('should set and clear canvas targets when tokens exist', async () => {
      const mockToken = {
        id: 'token1',
        actor: { id: 'target1' },
      };
      mockCanvas.tokens.placeables = [mockToken];

      await gmControlManager.approvePlayerAction(
        mockPlayerApprovalMessage,
        true,
      );

      expect(canvas.tokens.setTargets).toHaveBeenCalledWith(['token1']);
      expect(canvas.tokens.setTargets).toHaveBeenLastCalledWith([]);
    });

    test('should use stored action card data when item not found', async () => {
      const storedActionCardData = {
        id: 'action2',
        name: 'Stored Action Card',
        system: {
          description: 'Stored description',
        },
      };

      MessageFlags.getPlayerActionApprovalFlag.mockReturnValue({
        playerId: 'player1',
        playerName: 'Test Player',
        actorId: 'source1',
        actionCardId: 'action2',
        targetIds: ['target1'],
        rollResult: 15,
        actionCardData: storedActionCardData,
        timestamp: Date.now(),
        processed: false,
      });

      await gmControlManager.approvePlayerAction(
        mockPlayerApprovalMessage,
        true,
      );

      expect(CONFIG.Item.documentClass).toHaveBeenCalledWith(
        storedActionCardData,
        { parent: mockSourceActor },
      );
    });

    test('should return error when action card not found', async () => {
      mockSourceActor.items.delete('action1');
      MessageFlags.getPlayerActionApprovalFlag.mockReturnValue({
        playerId: 'player1',
        playerName: 'Test Player',
        actorId: 'source1',
        actionCardId: 'nonexistent',
        targetIds: ['target1'],
        rollResult: 15,
        timestamp: Date.now(),
        processed: false,
      });

      const result = await gmControlManager.approvePlayerAction(
        mockPlayerApprovalMessage,
        true,
      );

      expect(result).toBe(false);
      expect(ui.notifications.error).toHaveBeenCalledWith(
        'Unable to find action card for execution',
      );
    });

    test('should handle execution failure gracefully', async () => {
      mockActionCard.executeWithRollResult.mockResolvedValue({
        success: false,
        reason: 'Execution failed',
      });

      await gmControlManager.approvePlayerAction(
        mockPlayerApprovalMessage,
        true,
      );

      expect(ui.notifications.warn).toHaveBeenCalledWith(
        'Action execution failed: Execution failed',
      );
    });

    test('should notify when action is denied', async () => {
      const { notifyPlayerActionResult } = await import(
        '../../../../module/services/managers/system-messages.mjs'
      );

      await gmControlManager.approvePlayerAction(
        mockPlayerApprovalMessage,
        false,
      );

      expect(notifyPlayerActionResult).toHaveBeenCalledWith(
        'player1',
        'Test Player',
        'action1',
        false,
        'TestGM',
      );
      expect(ui.notifications.info).toHaveBeenCalledWith(
        'Action request from Test Player has been denied',
      );
      expect(mockActionCard.executeWithRollResult).not.toHaveBeenCalled();
    });

    test('should return error on overall processing failure', async () => {
      MessageFlags.updatePlayerActionApprovalFlag.mockRejectedValue(
        new Error('Update failed'),
      );

      const result = await gmControlManager.approvePlayerAction(
        mockPlayerApprovalMessage,
        true,
      );

      expect(result).toBe(false);
      expect(ui.notifications.error).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Errors.FailedToProcessApproval',
      );
    });
  });

  describe('validateAllPendingMessages()', () => {
    test('should validate and return updated count', async () => {
      const mockMessage1 = { id: 'msg1', flags: {} };
      const mockMessage2 = { id: 'msg2', flags: {} };
      mockGame.messages = [mockMessage1, mockMessage2];

      MessageFlags.hasPendingApplications.mockReturnValue(true);
      MessageFlags.validateTargets.mockResolvedValueOnce(true);
      MessageFlags.validateTargets.mockResolvedValueOnce(false);

      const result =
        await gmControlManager.validateAllPendingMessages();

      expect(result).toBe(1);
      expect(MessageFlags.validateTargets).toHaveBeenCalledWith(mockMessage1);
      expect(MessageFlags.validateTargets).toHaveBeenCalledWith(mockMessage2);
    });

    test('should return 0 when no pending messages', async () => {
      mockGame.messages = [];
      MessageFlags.hasPendingApplications.mockReturnValue(false);

      const result =
        await gmControlManager.validateAllPendingMessages();

      expect(result).toBe(0);
      expect(MessageFlags.validateTargets).not.toHaveBeenCalled();
    });

    test('should handle individual message validation errors gracefully', async () => {
      const mockMessage1 = { id: 'msg1', flags: {} };
      const mockMessage2 = { id: 'msg2', flags: {} };
      mockGame.messages = [mockMessage1, mockMessage2];

      MessageFlags.hasPendingApplications.mockReturnValue(true);
      MessageFlags.validateTargets.mockRejectedValueOnce(
        new Error('Validation failed'),
      );
      MessageFlags.validateTargets.mockResolvedValueOnce(true);

      const result =
        await gmControlManager.validateAllPendingMessages();

      expect(result).toBe(1);
    });

    test('should return 0 on overall validation failure', async () => {
      mockGame.messages = [{ id: 'msg1', flags: {} }];
      MessageFlags.hasPendingApplications.mockImplementation(() => {
        throw new Error('Filter failed');
      });

      const result =
        await gmControlManager.validateAllPendingMessages();

      expect(result).toBe(0);
    });
  });

  describe('bulkCleanupResolvedMessages()', () => {
    beforeEach(() => {
      vi.useRealTimers();
    });

    test('should delete old resolved messages', async () => {
      const oldTimestamp = Date.now() - 3700000; // Over 1 hour old
      const mockResolvedMessage = {
        id: 'resolved1',
        flags: {},
        delete: vi.fn(() => Promise.resolve()),
      };

      mockGame.messages = [mockResolvedMessage];

      MessageFlags.getPlayerActionApprovalFlag.mockReturnValue({
        timestamp: oldTimestamp,
        processed: true,
      });

      const result =
        await gmControlManager.bulkCleanupResolvedMessages();

      expect(result).toBe(1);
      expect(mockResolvedMessage.delete).toHaveBeenCalled();
      expect(ui.notifications.info).toHaveBeenCalledWith(
        'Cleaned up 1 resolved GM apply message(s)',
      );
    });

    test('should not delete recent messages', async () => {
      const recentTimestamp = Date.now() - 1800000; // 30 minutes old
      const mockRecentMessage = {
        id: 'recent1',
        flags: {},
        delete: vi.fn(() => Promise.resolve()),
      };

      mockGame.messages = [mockRecentMessage];

      MessageFlags.getPlayerActionApprovalFlag.mockReturnValue({
        timestamp: recentTimestamp,
        processed: true,
      });

      const result =
        await gmControlManager.bulkCleanupResolvedMessages();

      expect(result).toBe(0);
      expect(mockRecentMessage.delete).not.toHaveBeenCalled();
    });

    test('should not delete unprocessed messages', async () => {
      const oldTimestamp = Date.now() - 3700000;
      const mockUnprocessedMessage = {
        id: 'unprocessed1',
        flags: {},
        delete: vi.fn(() => Promise.resolve()),
      };

      mockGame.messages = [mockUnprocessedMessage];

      MessageFlags.getPlayerActionApprovalFlag.mockReturnValue({
        timestamp: oldTimestamp,
        processed: false,
      });

      const result =
        await gmControlManager.bulkCleanupResolvedMessages();

      expect(result).toBe(0);
      expect(mockUnprocessedMessage.delete).not.toHaveBeenCalled();
    });

    test('should handle messages without approval flags', async () => {
      const mockMessage = {
        id: 'msg1',
        flags: {},
        delete: vi.fn(() => Promise.resolve()),
      };

      mockGame.messages = [mockMessage];
      MessageFlags.getPlayerActionApprovalFlag.mockReturnValue(null);

      const result =
        await gmControlManager.bulkCleanupResolvedMessages();

      expect(result).toBe(0);
      expect(mockMessage.delete).not.toHaveBeenCalled();
    });

    test('should handle individual deletion failures gracefully', async () => {
      const oldTimestamp = Date.now() - 3700000;
      const mockMessage1 = {
        id: 'msg1',
        flags: {},
        delete: vi.fn(() => Promise.resolve()),
      };
      const mockMessage2 = {
        id: 'msg2',
        flags: {},
        delete: vi.fn(() => Promise.reject(new Error('Delete failed'))),
      };

      mockGame.messages = [mockMessage1, mockMessage2];

      MessageFlags.getPlayerActionApprovalFlag.mockReturnValue({
        timestamp: oldTimestamp,
        processed: true,
      });

      const result =
        await gmControlManager.bulkCleanupResolvedMessages();

      expect(result).toBe(1);
      expect(ui.notifications.info).toHaveBeenCalledWith(
        'Cleaned up 1 resolved GM apply message(s)',
      );
    });

    test('should return 0 on overall cleanup failure', async () => {
      mockGame.messages = [{ id: 'msg1', flags: {} }];
      MessageFlags.getPlayerActionApprovalFlag.mockImplementation(() => {
        throw new Error('Filter failed');
      });

      const result =
        await gmControlManager.bulkCleanupResolvedMessages();

      expect(result).toBe(0);
    });

    test('should use custom maxAge parameter', async () => {
      const oldTimestamp = Date.now() - 3700000;
      const mockMessage = {
        id: 'msg1',
        flags: {},
        delete: vi.fn(() => Promise.resolve()),
      };

      mockGame.messages = [mockMessage];

      MessageFlags.getPlayerActionApprovalFlag.mockReturnValue({
        timestamp: oldTimestamp,
        processed: true,
      });

      const result =
        await gmControlManager.bulkCleanupResolvedMessages(4000000);

      expect(result).toBe(0);
      expect(mockMessage.delete).not.toHaveBeenCalled();
    });
  });
});