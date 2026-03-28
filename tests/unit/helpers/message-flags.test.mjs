// @ts-nocheck
/**
 * @fileoverview Tests for MessageFlags Helper
 */

// Mock dependencies before import
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    methodEntry: vi.fn(),
    methodExit: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

vi.mock('foundry', () => ({
  utils: {
    deepClone: vi.fn((obj) => JSON.parse(JSON.stringify(obj)))
  }
}));

import { MessageFlags } from '../../../module/helpers/message-flags.mjs';
import { Logger } from '../../../module/services/logger.mjs';

describe('MessageFlags', () => {
  let mockActor1, mockActor2, mockMessage;

  beforeEach(() => {
    vi.clearAllMocks();

    mockActor1 = { id: 'actor1', name: 'Test Actor 1' };
    mockActor2 = { id: 'actor2', name: 'Test Actor 2' };

    mockMessage = {
      id: 'msg1',
      flags: {
        'eventide-rp-system': {}
      },
      update: vi.fn().mockResolvedValue({ id: 'msg1' }),
      delete: vi.fn().mockResolvedValue(true)
    };

    global.game = {
      ...global.game,
      actors: new Map([
        ['actor1', mockActor1],
        ['actor2', mockActor2]
      ]),
      messages: {
        filter: vi.fn(() => [])
      }
    };

    global.ui = {
      ...global.ui,
      notifications: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      }
    };
  });

  describe('createGMApplyFlag()', () => {
    test('creates flag with damage section only', () => {
      const damage = {
        targetId: 'actor1',
        targetName: 'Test Actor 1',
        formula: '2d6',
        type: 'slashing'
      };

      const result = MessageFlags.createGMApplyFlag({
        damage,
        actionCardId: 'card1',
        actorId: 'actor1'
      });

      expect(result.damage).toBeDefined();
      expect(result.damage.targetId).toBe('actor1');
      expect(result.damage.targetName).toBe('Test Actor 1');
      expect(result.damage.formula).toBe('2d6');
      expect(result.damage.type).toBe('slashing');
      expect(result.status).toBeUndefined();
    });

    test('creates flag with status section only', () => {
      const status = {
        targetId: 'actor1',
        targetName: 'Test Actor 1',
        effects: [{ effectId: 'effect1', name: 'Bleeding' }]
      };

      const result = MessageFlags.createGMApplyFlag({
        status,
        actionCardId: 'card1',
        actorId: 'actor1'
      });

      expect(result.status).toBeDefined();
      expect(result.status.targetId).toBe('actor1');
      expect(result.status.targetName).toBe('Test Actor 1');
      expect(result.status.effects).toEqual([{ effectId: 'effect1', name: 'Bleeding' }]);
      expect(result.damage).toBeUndefined();
    });

    test('creates flag with both damage and status sections', () => {
      const damage = {
        targetId: 'actor1',
        targetName: 'Test Actor 1',
        formula: '2d6',
        type: 'slashing'
      };
      const status = {
        targetId: 'actor2',
        targetName: 'Test Actor 2',
        effects: [{ effectId: 'effect1', name: 'Bleeding' }]
      };

      const result = MessageFlags.createGMApplyFlag({
        damage,
        status,
        actionCardId: 'card1',
        actorId: 'actor1'
      });

      expect(result.damage).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.damage.targetId).toBe('actor1');
      expect(result.status.targetId).toBe('actor2');
    });

    test('validates target exists when actor is found', () => {
      const damage = {
        targetId: 'actor1',
        targetName: 'Test Actor 1',
        formula: '2d6',
        type: 'slashing'
      };

      const result = MessageFlags.createGMApplyFlag({
        damage,
        actionCardId: 'card1',
        actorId: 'actor1'
      });

      expect(result.damage.targetValid).toBe(true);
    });

    test('sets targetValid to false when actor is not found', () => {
      const damage = {
        targetId: 'nonexistent',
        targetName: 'Nonexistent Actor',
        formula: '2d6',
        type: 'slashing'
      };

      const result = MessageFlags.createGMApplyFlag({
        damage,
        actionCardId: 'card1',
        actorId: 'actor1'
      });

      expect(result.damage.targetValid).toBe(false);
    });

    test('includes actionCardId and actorId in flag', () => {
      const result = MessageFlags.createGMApplyFlag({
        actionCardId: 'card123',
        actorId: 'user456'
      });

      expect(result.actionCardId).toBe('card123');
      expect(result.actorId).toBe('user456');
    });

    test('includes timestamp in flag', () => {
      const beforeTime = Date.now();
      const result = MessageFlags.createGMApplyFlag({
        actionCardId: 'card1',
        actorId: 'actor1'
      });
      const afterTime = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(result.timestamp).toBeLessThanOrEqual(afterTime);
    });

    test('sets applied to false initially', () => {
      const damage = {
        targetId: 'actor1',
        targetName: 'Test Actor 1',
        formula: '2d6',
        type: 'slashing'
      };

      const result = MessageFlags.createGMApplyFlag({
        damage,
        actionCardId: 'card1',
        actorId: 'actor1'
      });

      expect(result.damage.applied).toBe(false);
    });

    test('sets status applied to false initially', () => {
      const status = {
        targetId: 'actor1',
        targetName: 'Test Actor 1',
        effects: []
      };

      const result = MessageFlags.createGMApplyFlag({
        status,
        actionCardId: 'card1',
        actorId: 'actor1'
      });

      expect(result.status.applied).toBe(false);
    });

    test('validates status target exists when actor is found', () => {
      const status = {
        targetId: 'actor1',
        targetName: 'Test Actor 1',
        effects: []
      };

      const result = MessageFlags.createGMApplyFlag({
        status,
        actionCardId: 'card1',
        actorId: 'actor1'
      });

      expect(result.status.targetValid).toBe(true);
    });

    test('validates status target does not exist when actor not found', () => {
      const status = {
        targetId: 'nonexistent',
        targetName: 'Nonexistent Actor',
        effects: []
      };

      const result = MessageFlags.createGMApplyFlag({
        status,
        actionCardId: 'card1',
        actorId: 'actor1'
      });

      expect(result.status.targetValid).toBe(false);
    });
  });

  describe('updateGMApplyFlag()', () => {
    test('updates damage section with provided updates', async () => {
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          actionCardId: 'card1',
          actorId: 'actor1',
          timestamp: Date.now(),
          damage: {
            targetId: 'actor1',
            targetName: 'Test Actor 1',
            formula: '2d6',
            type: 'slashing',
            targetValid: true,
            applied: false
          }
        }
      };

      await MessageFlags.updateGMApplyFlag(mockMessage, 'damage', { applied: true });

      expect(mockMessage.update).toHaveBeenCalled();
      const updateCall = mockMessage.update.mock.calls[0][0];
      expect(updateCall.flags['eventide-rp-system'].gmApplySection.damage.applied).toBe(true);
    });

    test('updates status section with provided updates', async () => {
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          actionCardId: 'card1',
          actorId: 'actor1',
          timestamp: Date.now(),
          status: {
            targetId: 'actor1',
            targetName: 'Test Actor 1',
            effects: [],
            targetValid: true,
            applied: false
          }
        }
      };

      await MessageFlags.updateGMApplyFlag(mockMessage, 'status', { applied: true });

      expect(mockMessage.update).toHaveBeenCalled();
      const updateCall = mockMessage.update.mock.calls[0][0];
      expect(updateCall.flags['eventide-rp-system'].gmApplySection.status.applied).toBe(true);
    });

    test('returns updated message', async () => {
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          actionCardId: 'card1',
          actorId: 'actor1',
          timestamp: Date.now(),
          damage: {
            targetId: 'actor1',
            targetName: 'Test Actor 1',
            formula: '2d6',
            type: 'slashing',
            targetValid: true,
            applied: false
          }
        }
      };

      const result = await MessageFlags.updateGMApplyFlag(mockMessage, 'damage', { applied: true });

      expect(result).toBeDefined();
      expect(result.id).toBe('msg1');
    });

    test('does not modify missing section gracefully', async () => {
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          actionCardId: 'card1',
          actorId: 'actor1',
          timestamp: Date.now()
        }
      };

      const result = await MessageFlags.updateGMApplyFlag(mockMessage, 'damage', { applied: true });

      expect(result).toBe(mockMessage);
      expect(mockMessage.update).not.toHaveBeenCalled();
      expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No damage section found'),
        expect.any(Object),
        'MESSAGE_FLAGS'
      );
    });

    test('merges updates with existing section data', async () => {
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          actionCardId: 'card1',
          actorId: 'actor1',
          timestamp: Date.now(),
          damage: {
            targetId: 'actor1',
            targetName: 'Test Actor 1',
            formula: '2d6',
            type: 'slashing',
            targetValid: true,
            applied: false
          }
        }
      };

      await MessageFlags.updateGMApplyFlag(mockMessage, 'damage', { applied: true, targetValid: false });

      const updateCall = mockMessage.update.mock.calls[0][0];
      expect(updateCall.flags['eventide-rp-system'].gmApplySection.damage.targetId).toBe('actor1');
      expect(updateCall.flags['eventide-rp-system'].gmApplySection.damage.applied).toBe(true);
      expect(updateCall.flags['eventide-rp-system'].gmApplySection.damage.targetValid).toBe(false);
    });

    test('handles message update errors gracefully', async () => {
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          actionCardId: 'card1',
          actorId: 'actor1',
          timestamp: Date.now(),
          damage: {
            targetId: 'actor1',
            targetName: 'Test Actor 1',
            formula: '2d6',
            type: 'slashing',
            targetValid: true,
            applied: false
          }
        }
      };

      mockMessage.update.mockRejectedValue(new Error('Update failed'));

      await expect(MessageFlags.updateGMApplyFlag(mockMessage, 'damage', { applied: true }))
        .rejects.toThrow('Update failed');
    });

    test('logs warnings when section not found', async () => {
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          actionCardId: 'card1',
          actorId: 'actor1',
          timestamp: Date.now()
        }
      };

      await MessageFlags.updateGMApplyFlag(mockMessage, 'damage', { applied: true });

      expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No damage section found'),
        expect.any(Object),
        'MESSAGE_FLAGS'
      );
    });

    test('leaves other sections unchanged', async () => {
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          actionCardId: 'card1',
          actorId: 'actor1',
          timestamp: Date.now(),
          damage: {
            targetId: 'actor1',
            targetName: 'Test Actor 1',
            formula: '2d6',
            type: 'slashing',
            targetValid: true,
            applied: false
          },
          status: {
            targetId: 'actor2',
            targetName: 'Test Actor 2',
            effects: [],
            targetValid: true,
            applied: false
          }
        }
      };

      await MessageFlags.updateGMApplyFlag(mockMessage, 'damage', { applied: true });

      const updateCall = mockMessage.update.mock.calls[0][0];
      expect(updateCall.flags['eventide-rp-system'].gmApplySection.damage.applied).toBe(true);
      expect(updateCall.flags['eventide-rp-system'].gmApplySection.status.applied).toBe(false);
    });

    test('handles missing gmApplySection gracefully', async () => {
      mockMessage.flags['eventide-rp-system'] = {};

      const result = await MessageFlags.updateGMApplyFlag(mockMessage, 'damage', { applied: true });

      expect(result).toBe(mockMessage);
      expect(mockMessage.update).not.toHaveBeenCalled();
      expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No damage section found'),
        expect.any(Object),
        'MESSAGE_FLAGS'
      );
    });
  });

  describe('getGMApplyFlag()', () => {
    test('returns flag data when present and valid', () => {
      const validFlag = {
        actionCardId: 'card1',
        actorId: 'actor1',
        timestamp: Date.now(),
        damage: {
          targetId: 'actor1',
          targetName: 'Test Actor 1',
          formula: '2d6',
          targetValid: true,
          applied: false
        }
      };

      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: validFlag
      };

      const result = MessageFlags.getGMApplyFlag(mockMessage);

      expect(result).toEqual(validFlag);
    });

    test('returns null when flags object is invalid', () => {
      mockMessage.flags = null;

      const result = MessageFlags.getGMApplyFlag(mockMessage);

      expect(result).toBeNull();
    });

    test('returns null when flag structure does not match', () => {
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          invalidField: 'value'
        }
      };

      const result = MessageFlags.getGMApplyFlag(mockMessage);

      expect(result).toBeNull();
    });

    test('returns null when required fields missing', () => {
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          actionCardId: 'card1',
          actorId: 'actor1'
        }
      };

      const result = MessageFlags.getGMApplyFlag(mockMessage);

      expect(result).toBeNull();
    });

    test('returns null for undefined message flags', () => {
      mockMessage.flags = undefined;

      const result = MessageFlags.getGMApplyFlag(mockMessage);

      expect(result).toBeNull();
    });
  });

  describe('_validateFlagStructure()', () => {
    test('returns true for valid flag with damage', () => {
      const validFlag = {
        actionCardId: 'card1',
        actorId: 'actor1',
        timestamp: Date.now(),
        damage: {
          targetId: 'actor1',
          targetName: 'Test Actor 1',
          formula: '2d6'
        }
      };

      const result = MessageFlags._validateFlagStructure(validFlag);

      expect(result).toBe(true);
    });

    test('returns true for valid flag with status', () => {
      const validFlag = {
        actionCardId: 'card1',
        actorId: 'actor1',
        timestamp: Date.now(),
        status: {
          targetId: 'actor1',
          targetName: 'Test Actor 1',
          effects: []
        }
      };

      const result = MessageFlags._validateFlagStructure(validFlag);

      expect(result).toBe(true);
    });

    test('returns false for null flag', () => {
      const result = MessageFlags._validateFlagStructure(null);
      expect(result).toBe(false);
    });

    test('returns false for undefined flag', () => {
      const result = MessageFlags._validateFlagStructure(undefined);
      expect(result).toBe(false);
    });

    test('returns false when actionCardId missing', () => {
      const invalidFlag = {
        actorId: 'actor1',
        timestamp: Date.now()
      };

      const result = MessageFlags._validateFlagStructure(invalidFlag);
      expect(result).toBe(false);
    });

    test('returns false when actorId missing', () => {
      const invalidFlag = {
        actionCardId: 'card1',
        timestamp: Date.now()
      };

      const result = MessageFlags._validateFlagStructure(invalidFlag);
      expect(result).toBe(false);
    });

    test('returns false when timestamp missing', () => {
      const invalidFlag = {
        actionCardId: 'card1',
        actorId: 'actor1'
      };

      const result = MessageFlags._validateFlagStructure(invalidFlag);
      expect(result).toBe(false);
    });

    test('returns false when damage section is invalid', () => {
      const invalidFlag = {
        actionCardId: 'card1',
        actorId: 'actor1',
        timestamp: Date.now(),
        damage: {
          targetId: 'actor1',
          targetName: 'Test Actor 1'
        }
      };

      const result = MessageFlags._validateFlagStructure(invalidFlag);
      expect(result).toBe(false);
    });

    test('returns false when status section is invalid', () => {
      const invalidFlag = {
        actionCardId: 'card1',
        actorId: 'actor1',
        timestamp: Date.now(),
        status: {
          targetId: 'actor1',
          targetName: 'Test Actor 1'
        }
      };

      const result = MessageFlags._validateFlagStructure(invalidFlag);
      expect(result).toBe(false);
    });

    test('returns false when status effects is not an array', () => {
      const invalidFlag = {
        actionCardId: 'card1',
        actorId: 'actor1',
        timestamp: Date.now(),
        status: {
          targetId: 'actor1',
          targetName: 'Test Actor 1',
          effects: 'not an array'
        }
      };

      const result = MessageFlags._validateFlagStructure(invalidFlag);
      expect(result).toBe(false);
    });

    test('returns true when optional sections are missing', () => {
      const validFlag = {
        actionCardId: 'card1',
        actorId: 'actor1',
        timestamp: Date.now()
      };

      const result = MessageFlags._validateFlagStructure(validFlag);
      expect(result).toBe(true);
    });

    test('returns false for non-object flag', () => {
      const result = MessageFlags._validateFlagStructure('string');
      expect(result).toBe(false);
    });

    test('returns false for number flag', () => {
      const result = MessageFlags._validateFlagStructure(123);
      expect(result).toBe(false);
    });
  });

  describe('hasPendingApplications()', () => {
    test('returns true when damage is pending', () => {
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          actionCardId: 'card1',
          actorId: 'actor1',
          timestamp: Date.now(),
          damage: {
            targetId: 'actor1',
            targetName: 'Test Actor 1',
            formula: '2d6',
            targetValid: true,
            applied: false
          }
        }
      };

      const result = MessageFlags.hasPendingApplications(mockMessage);
      expect(result).toBe(true);
    });

    test('returns true when status is pending', () => {
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          actionCardId: 'card1',
          actorId: 'actor1',
          timestamp: Date.now(),
          status: {
            targetId: 'actor1',
            targetName: 'Test Actor 1',
            effects: [],
            targetValid: true,
            applied: false
          }
        }
      };

      const result = MessageFlags.hasPendingApplications(mockMessage);
      expect(result).toBe(true);
    });

    test('returns false when all sections applied', () => {
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          actionCardId: 'card1',
          actorId: 'actor1',
          timestamp: Date.now(),
          damage: {
            targetId: 'actor1',
            targetName: 'Test Actor 1',
            formula: '2d6',
            targetValid: true,
            applied: true
          },
          status: {
            targetId: 'actor2',
            targetName: 'Test Actor 2',
            effects: [],
            targetValid: true,
            applied: true
          }
        }
      };

      const result = MessageFlags.hasPendingApplications(mockMessage);
      expect(result).toBe(false);
    });

    test('returns false when flag is null', () => {
      const result = MessageFlags.hasPendingApplications(mockMessage);
      expect(result).toBe(false);
    });

    test('returns true when both sections pending', () => {
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          actionCardId: 'card1',
          actorId: 'actor1',
          timestamp: Date.now(),
          damage: {
            targetId: 'actor1',
            targetName: 'Test Actor 1',
            formula: '2d6',
            targetValid: true,
            applied: false
          },
          status: {
            targetId: 'actor2',
            targetName: 'Test Actor 2',
            effects: [],
            targetValid: true,
            applied: false
          }
        }
      };

      const result = MessageFlags.hasPendingApplications(mockMessage);
      expect(result).toBe(true);
    });
  });

  describe('validateTargets()', () => {
    test('returns false when no flag exists', async () => {
      const result = await MessageFlags.validateTargets(mockMessage);
      expect(result).toBe(false);
    });

    test('returns false when no pending applications', async () => {
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          actionCardId: 'card1',
          actorId: 'actor1',
          timestamp: Date.now(),
          damage: {
            targetId: 'actor1',
            targetName: 'Test Actor 1',
            formula: '2d6',
            targetValid: true,
            applied: true
          }
        }
      };

      const result = await MessageFlags.validateTargets(mockMessage);
      expect(result).toBe(false);
    });

    test('updates damage target validity when changed', async () => {
      global.game.actors.delete('actor1');
      
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          actionCardId: 'card1',
          actorId: 'actor1',
          timestamp: Date.now(),
          damage: {
            targetId: 'actor1',
            targetName: 'Test Actor 1',
            formula: '2d6',
            targetValid: true,
            applied: false
          }
        }
      };

      const result = await MessageFlags.validateTargets(mockMessage);
      expect(result).toBe(true);
      expect(mockMessage.update).toHaveBeenCalled();
    });

    test('updates status target validity when changed', async () => {
      global.game.actors.delete('actor1');
      
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          actionCardId: 'card1',
          actorId: 'actor1',
          timestamp: Date.now(),
          status: {
            targetId: 'actor1',
            targetName: 'Test Actor 1',
            effects: [],
            targetValid: true,
            applied: false
          }
        }
      };

      const result = await MessageFlags.validateTargets(mockMessage);
      expect(result).toBe(true);
      expect(mockMessage.update).toHaveBeenCalled();
    });

    test('updates message flags when validation changes', async () => {
      global.game.actors.delete('actor1');
      
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          actionCardId: 'card1',
          actorId: 'actor1',
          timestamp: Date.now(),
          damage: {
            targetId: 'actor1',
            targetName: 'Test Actor 1',
            formula: '2d6',
            targetValid: true,
            applied: false
          }
        }
      };

      await MessageFlags.validateTargets(mockMessage);
      
      const updateCall = mockMessage.update.mock.calls[0][0];
      expect(updateCall.flags['eventide-rp-system'].gmApplySection.damage.targetValid).toBe(false);
    });

    test('returns false when no validity changes', async () => {
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          actionCardId: 'card1',
          actorId: 'actor1',
          timestamp: Date.now(),
          damage: {
            targetId: 'actor1',
            targetName: 'Test Actor 1',
            formula: '2d6',
            targetValid: true,
            applied: false
          }
        }
      };

      const result = await MessageFlags.validateTargets(mockMessage);
      expect(result).toBe(false);
      expect(mockMessage.update).not.toHaveBeenCalled();
    });

    test('caches actor existence checks for efficiency', async () => {
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          actionCardId: 'card1',
          actorId: 'actor1',
          timestamp: Date.now(),
          damage: {
            targetId: 'actor1',
            targetName: 'Test Actor 1',
            formula: '2d6',
            targetValid: true,
            applied: false
          }
        }
      };

      const getSpy = vi.spyOn(global.game.actors, 'get');
      await MessageFlags.validateTargets(mockMessage);
      expect(getSpy).toHaveBeenCalledTimes(1);
      getSpy.mockRestore();
    });

    test('handles message update errors gracefully', async () => {
      mockMessage.update.mockRejectedValue(new Error('Update failed'));
      
      mockMessage.flags['eventide-rp-system'] = {
        gmApplySection: {
          actionCardId: 'card1',
          actorId: 'actor1',
          timestamp: Date.now(),
          damage: {
            targetId: 'nonexistent',
            targetName: 'Does Not Exist',
            formula: '2d6',
            targetValid: true,
            applied: false
          }
        }
      };

      const result = await MessageFlags.validateTargets(mockMessage);
      expect(result).toBe(false);
      expect(Logger.warn).toHaveBeenCalled();
    });
  });

  describe('validateTargetsBulk()', () => {
    test('returns 0 for empty messages array', async () => {
      const result = await MessageFlags.validateTargetsBulk([]);
      expect(result).toBe(0);
      expect(Logger.methodExit).toHaveBeenCalledWith('MessageFlags', 'validateTargetsBulk', 0);
    });

    test('filters out messages with no pending applications', async () => {
      const mockMessage1 = {
        id: 'msg1',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              actionCardId: 'card1',
              actorId: 'actor1',
              timestamp: Date.now(),
              damage: {
                targetId: 'actor1',
                targetName: 'Test Actor 1',
                formula: '2d6',
                targetValid: true,
                applied: true
              }
            }
          }
        },
        update: vi.fn().mockResolvedValue({ id: 'msg1' })
      };

      const result = await MessageFlags.validateTargetsBulk([mockMessage1]);
      expect(result).toBe(0);
    });

    test('updates multiple messages with changed validity', async () => {
      global.game.actors.delete('actor1');
      global.game.actors.delete('actor2');

      const mockMessage1 = {
        id: 'msg1',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              actionCardId: 'card1',
              actorId: 'actor1',
              timestamp: Date.now(),
              damage: {
                targetId: 'actor1',
                targetName: 'Test Actor 1',
                formula: '2d6',
                targetValid: true,
                applied: false
              }
            }
          }
        },
        update: vi.fn().mockResolvedValue({ id: 'msg1' })
      };

      const mockMessage2 = {
        id: 'msg2',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              actionCardId: 'card2',
              actorId: 'actor1',
              timestamp: Date.now(),
              damage: {
                targetId: 'actor2',
                targetName: 'Test Actor 2',
                formula: '2d6',
                targetValid: true,
                applied: false
              }
            }
          }
        },
        update: vi.fn().mockResolvedValue({ id: 'msg2' })
      };

      const result = await MessageFlags.validateTargetsBulk([mockMessage1, mockMessage2]);
      expect(result).toBe(2);
    });

    test('returns count of updated messages', async () => {
      global.game.actors.delete('actor1');

      const mockMessage1 = {
        id: 'msg1',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              actionCardId: 'card1',
              actorId: 'actor1',
              timestamp: Date.now(),
              damage: {
                targetId: 'actor1',
                targetName: 'Test Actor 1',
                formula: '2d6',
                targetValid: true,
                applied: false
              }
            }
          }
        },
        update: vi.fn().mockResolvedValue({ id: 'msg1' })
      };

      const mockMessage2 = {
        id: 'msg2',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              actionCardId: 'card2',
              actorId: 'actor1',
              timestamp: Date.now(),
              damage: {
                targetId: 'actor2',
                targetName: 'Test Actor 2',
                formula: '2d6',
                targetValid: true,
                applied: false
              }
            }
          }
        },
        update: vi.fn().mockResolvedValue({ id: 'msg2' })
      };

      const result = await MessageFlags.validateTargetsBulk([mockMessage1, mockMessage2]);
      expect(result).toBe(1);
    });

    test('uses shared cache across all messages', async () => {
      const mockMessage1 = {
        id: 'msg1',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              actionCardId: 'card1',
              actorId: 'actor1',
              timestamp: Date.now(),
              damage: {
                targetId: 'actor1',
                targetName: 'Test Actor 1',
                formula: '2d6',
                targetValid: true,
                applied: false
              }
            }
          }
        },
        update: vi.fn().mockResolvedValue({ id: 'msg1' })
      };

      const mockMessage2 = {
        id: 'msg2',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              actionCardId: 'card2',
              actorId: 'actor1',
              timestamp: Date.now(),
              damage: {
                targetId: 'actor1',
                targetName: 'Test Actor 1',
                formula: '3d6',
                targetValid: true,
                applied: false
              }
            }
          }
        },
        update: vi.fn().mockResolvedValue({ id: 'msg2' })
      };

      await MessageFlags.validateTargetsBulk([mockMessage1, mockMessage2]);
      expect(mockMessage1.update).not.toHaveBeenCalled();
      expect(mockMessage2.update).not.toHaveBeenCalled();
    });

    test('handles individual message errors gracefully', async () => {
      const mockMessage1 = {
        id: 'msg1',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              actionCardId: 'card1',
              actorId: 'actor1',
              timestamp: Date.now(),
              damage: {
                targetId: 'actor1',
                targetName: 'Test Actor 1',
                formula: '2d6',
                targetValid: true,
                applied: false
              }
            }
          }
        },
        update: vi.fn().mockRejectedValue(new Error('Failed'))
      };

      const mockMessage2 = {
        id: 'msg2',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              actionCardId: 'card2',
              actorId: 'actor1',
              timestamp: Date.now(),
              damage: {
                targetId: 'nonexistent',
                targetName: 'Does Not Exist',
                formula: '2d6',
                targetValid: true,
                applied: false
              }
            }
          }
        },
        update: vi.fn().mockResolvedValue({ id: 'msg2' })
      };

      const result = await MessageFlags.validateTargetsBulk([mockMessage1, mockMessage2]);
      expect(result).toBe(1);
      expect(mockMessage2.update).toHaveBeenCalled();
    });

    test('logs info message with validation summary', async () => {
      const mockMessage1 = {
        id: 'msg1',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              actionCardId: 'card1',
              actorId: 'actor1',
              timestamp: Date.now(),
              damage: {
                targetId: 'actor1',
                targetName: 'Test Actor 1',
                formula: '2d6',
                targetValid: true,
                applied: false
              }
            }
          }
        },
        update: vi.fn().mockResolvedValue({ id: 'msg1' })
      };

      await MessageFlags.validateTargetsBulk([mockMessage1]);
      expect(Logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Bulk validated'),
        expect.any(Object),
        'MESSAGE_FLAGS'
      );
    });
  });

  describe('repairCorruptedMessages()', () => {
    test('returns 0 when no corrupted messages found', async () => {
      global.game.messages.filter.mockReturnValue([]);

      const result = await MessageFlags.repairCorruptedMessages();
      expect(result).toBe(0);
    });

    test('removes corrupted GM apply flags', async () => {
      const corruptedMessage = {
        id: 'msg1',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              invalidField: 'value'
            }
          }
        },
        update: vi.fn().mockResolvedValue({ id: 'msg1' })
      };

      global.game.messages.filter.mockReturnValue([corruptedMessage]);

      await MessageFlags.repairCorruptedMessages();
      expect(corruptedMessage.update).toHaveBeenCalled();
    });

    test('removes entire system section if empty', async () => {
      const corruptedMessage = {
        id: 'msg1',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              invalidField: 'value'
            }
          }
        },
        update: vi.fn().mockResolvedValue({ id: 'msg1' })
      };

      global.game.messages.filter.mockReturnValue([corruptedMessage]);

      await MessageFlags.repairCorruptedMessages();
      const updateCall = corruptedMessage.update.mock.calls[0][0];
      expect(updateCall.flags['eventide-rp-system']).toBeUndefined();
    });

    test('updates message with cleaned flags', async () => {
      const corruptedMessage = {
        id: 'msg1',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              invalidField: 'value'
            },
            otherFlag: 'value'
          }
        },
        update: vi.fn().mockResolvedValue({ id: 'msg1' })
      };

      global.game.messages.filter.mockReturnValue([corruptedMessage]);

      await MessageFlags.repairCorruptedMessages();
      const updateCall = corruptedMessage.update.mock.calls[0][0];
      expect(updateCall.flags['eventide-rp-system'].gmApplySection).toBeUndefined();
      expect(updateCall.flags['eventide-rp-system'].otherFlag).toBe('value');
    });

    test('shows notification when repairs made', async () => {
      const corruptedMessage = {
        id: 'msg1',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              invalidField: 'value'
            }
          }
        },
        update: vi.fn().mockResolvedValue({ id: 'msg1' })
      };

      global.game.messages.filter.mockReturnValue([corruptedMessage]);

      await MessageFlags.repairCorruptedMessages();
      expect(ui.notifications.info).toHaveBeenCalledWith('Repaired 1 corrupted GM apply message(s)');
    });

    test('logs info for each repaired message', async () => {
      const corruptedMessage = {
        id: 'msg1',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              invalidField: 'value'
            }
          }
        },
        update: vi.fn().mockResolvedValue({ id: 'msg1' })
      };

      global.game.messages.filter.mockReturnValue([corruptedMessage]);

      await MessageFlags.repairCorruptedMessages();
      expect(Logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Repaired corrupted GM apply flag'),
        expect.any(Object),
        'MESSAGE_FLAGS'
      );
    });

    test('handles individual message errors gracefully', async () => {
      const corruptedMessage = {
        id: 'msg1',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              invalidField: 'value'
            }
          }
        },
        update: vi.fn().mockRejectedValue(new Error('Failed'))
      };

      global.game.messages.filter.mockReturnValue([corruptedMessage]);

      const result = await MessageFlags.repairCorruptedMessages();
      expect(result).toBe(0);
      expect(Logger.warn).toHaveBeenCalled();
    });

    test('returns correct count of repaired messages', async () => {
      const corruptedMessages = [
        {
          id: 'msg1',
          flags: {
            'eventide-rp-system': {
              gmApplySection: { invalidField: 'value' }
            }
          },
          update: vi.fn().mockResolvedValue({ id: 'msg1' })
        },
        {
          id: 'msg2',
          flags: {
            'eventide-rp-system': {
              gmApplySection: { missing: 'fields' }
            }
          },
          update: vi.fn().mockResolvedValue({ id: 'msg2' })
        }
      ];

      global.game.messages.filter.mockReturnValue(corruptedMessages);

      const result = await MessageFlags.repairCorruptedMessages();
      expect(result).toBe(2);
    });
  });

  describe('createPlayerActionApprovalFlag()', () => {
    test('creates flag with all required fields', () => {
      const flag = MessageFlags.createPlayerActionApprovalFlag({
        actorId: 'actor1',
        actionCardId: 'card1',
        actionCardData: {},
        playerId: 'user1',
        playerName: 'Test Player',
        targetIds: ['target1'],
        lockedTargets: {},
        rollResult: {},
        transformationSelections: {},
        selectedEffectIds: []
      });

      expect(flag.actorId).toBe('actor1');
      expect(flag.actionCardId).toBe('card1');
      expect(flag.playerId).toBe('user1');
      expect(flag.playerName).toBe('Test Player');
      expect(flag.targetIds).toEqual(['target1']);
    });

    test('includes actionCardData field', () => {
      const actionCardData = { name: 'Test Card' };
      const flag = MessageFlags.createPlayerActionApprovalFlag({
        actorId: 'actor1',
        actionCardId: 'card1',
        actionCardData,
        playerId: 'user1',
        playerName: 'Test Player',
        targetIds: [],
        lockedTargets: {},
        rollResult: {},
        transformationSelections: {},
        selectedEffectIds: []
      });

      expect(flag.actionCardData).toEqual(actionCardData);
    });

    test('sets processed to false initially', () => {
      const flag = MessageFlags.createPlayerActionApprovalFlag({
        actorId: 'actor1',
        actionCardId: 'card1',
        actionCardData: {},
        playerId: 'user1',
        playerName: 'Test Player',
        targetIds: [],
        lockedTargets: {},
        rollResult: {},
        transformationSelections: {},
        selectedEffectIds: []
      });

      expect(flag.processed).toBe(false);
    });

    test('sets approved to false initially', () => {
      const flag = MessageFlags.createPlayerActionApprovalFlag({
        actorId: 'actor1',
        actionCardId: 'card1',
        actionCardData: {},
        playerId: 'user1',
        playerName: 'Test Player',
        targetIds: [],
        lockedTargets: {},
        rollResult: {},
        transformationSelections: {},
        selectedEffectIds: []
      });

      expect(flag.approved).toBe(false);
    });

    test('includes timestamp', () => {
      const beforeTime = Date.now();
      const flag = MessageFlags.createPlayerActionApprovalFlag({
        actorId: 'actor1',
        actionCardId: 'card1',
        actionCardData: {},
        playerId: 'user1',
        playerName: 'Test Player',
        targetIds: [],
        lockedTargets: {},
        rollResult: {},
        transformationSelections: {},
        selectedEffectIds: []
      });
      const afterTime = Date.now();

      expect(flag.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(flag.timestamp).toBeLessThanOrEqual(afterTime);
    });

    test('handles empty targetIds array', () => {
      const flag = MessageFlags.createPlayerActionApprovalFlag({
        actorId: 'actor1',
        actionCardId: 'card1',
        actionCardData: {},
        playerId: 'user1',
        playerName: 'Test Player',
        targetIds: [],
        lockedTargets: {},
        rollResult: {},
        transformationSelections: {},
        selectedEffectIds: []
      });

      expect(flag.targetIds).toEqual([]);
    });

    test('includes transformationSelections', () => {
      const transformationSelections = { target1: 'transform1' };
      const flag = MessageFlags.createPlayerActionApprovalFlag({
        actorId: 'actor1',
        actionCardId: 'card1',
        actionCardData: {},
        playerId: 'user1',
        playerName: 'Test Player',
        targetIds: [],
        lockedTargets: {},
        rollResult: {},
        transformationSelections,
        selectedEffectIds: []
      });

      expect(flag.transformationSelections).toEqual(transformationSelections);
    });

    test('includes selectedEffectIds', () => {
      const selectedEffectIds = ['effect1', 'effect2'];
      const flag = MessageFlags.createPlayerActionApprovalFlag({
        actorId: 'actor1',
        actionCardId: 'card1',
        actionCardData: {},
        playerId: 'user1',
        playerName: 'Test Player',
        targetIds: [],
        lockedTargets: {},
        rollResult: {},
        transformationSelections: {},
        selectedEffectIds
      });

      expect(flag.selectedEffectIds).toEqual(selectedEffectIds);
    });

    test('sets processedBy to null initially', () => {
      const flag = MessageFlags.createPlayerActionApprovalFlag({
        actorId: 'actor1',
        actionCardId: 'card1',
        actionCardData: {},
        playerId: 'user1',
        playerName: 'Test Player',
        targetIds: [],
        lockedTargets: {},
        rollResult: {},
        transformationSelections: {},
        selectedEffectIds: []
      });

      expect(flag.processedBy).toBeNull();
    });

    test('sets processedAt to null initially', () => {
      const flag = MessageFlags.createPlayerActionApprovalFlag({
        actorId: 'actor1',
        actionCardId: 'card1',
        actionCardData: {},
        playerId: 'user1',
        playerName: 'Test Player',
        targetIds: [],
        lockedTargets: {},
        rollResult: {},
        transformationSelections: {},
        selectedEffectIds: []
      });

      expect(flag.processedAt).toBeNull();
    });
  });

  describe('updatePlayerActionApprovalFlag()', () => {
    beforeEach(() => {
      mockMessage.flags['eventide-rp-system'] = {
        playerActionApproval: {
          actorId: 'actor1',
          actionCardId: 'card1',
          actionCardData: {},
          playerId: 'user1',
          playerName: 'Test Player',
          targetIds: [],
          lockedTargets: {},
          rollResult: {},
          transformationSelections: {},
          selectedEffectIds: [],
          timestamp: Date.now(),
          processed: false,
          approved: false,
          processedBy: null,
          processedAt: null
        }
      };
    });

    test('updates approved to true', async () => {
      await MessageFlags.updatePlayerActionApprovalFlag(mockMessage, true, 'GM');

      const updateCall = mockMessage.update.mock.calls[0][0];
      expect(updateCall.flags['eventide-rp-system'].playerActionApproval.approved).toBe(true);
    });

    test('updates approved to false', async () => {
      await MessageFlags.updatePlayerActionApprovalFlag(mockMessage, false, 'GM');

      const updateCall = mockMessage.update.mock.calls[0][0];
      expect(updateCall.flags['eventide-rp-system'].playerActionApproval.approved).toBe(false);
    });

    test('sets processed to true', async () => {
      await MessageFlags.updatePlayerActionApprovalFlag(mockMessage, true, 'GM');

      const updateCall = mockMessage.update.mock.calls[0][0];
      expect(updateCall.flags['eventide-rp-system'].playerActionApproval.processed).toBe(true);
    });

    test('sets processedBy correctly', async () => {
      await MessageFlags.updatePlayerActionApprovalFlag(mockMessage, true, 'GameMaster');

      const updateCall = mockMessage.update.mock.calls[0][0];
      expect(updateCall.flags['eventide-rp-system'].playerActionApproval.processedBy).toBe('GameMaster');
    });

    test('sets processedAt timestamp', async () => {
      const beforeTime = Date.now();
      await MessageFlags.updatePlayerActionApprovalFlag(mockMessage, true, 'GM');
      const afterTime = Date.now();

      const updateCall = mockMessage.update.mock.calls[0][0];
      expect(updateCall.flags['eventide-rp-system'].playerActionApproval.processedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(updateCall.flags['eventide-rp-system'].playerActionApproval.processedAt).toBeLessThanOrEqual(afterTime);
    });

    test('returns updated message', async () => {
      const result = await MessageFlags.updatePlayerActionApprovalFlag(mockMessage, true, 'GM');

      expect(result).toBeDefined();
      expect(result.id).toBe('msg1');
    });

    test('handles missing section gracefully', async () => {
      mockMessage.flags['eventide-rp-system'] = {};

      const result = await MessageFlags.updatePlayerActionApprovalFlag(mockMessage, true, 'GM');

      expect(result).toBe(mockMessage);
      expect(mockMessage.update).not.toHaveBeenCalled();
      expect(Logger.warn).toHaveBeenCalled();
    });

    test('handles update errors gracefully', async () => {
      mockMessage.update.mockRejectedValue(new Error('Update failed'));

      await expect(MessageFlags.updatePlayerActionApprovalFlag(mockMessage, true, 'GM'))
        .rejects.toThrow('Update failed');
    });
  });

  describe('getPlayerActionApprovalFlag()', () => {
    test('returns flag when present and valid', () => {
      const validFlag = {
        actorId: 'actor1',
        actionCardId: 'card1',
        actionCardData: {},
        playerId: 'user1',
        playerName: 'Test Player',
        targetIds: [],
        lockedTargets: {},
        rollResult: {},
        transformationSelections: {},
        selectedEffectIds: [],
        timestamp: Date.now(),
        processed: false,
        approved: false
      };

      mockMessage.flags['eventide-rp-system'] = {
        playerActionApproval: validFlag
      };

      const result = MessageFlags.getPlayerActionApprovalFlag(mockMessage);
      expect(result).toEqual(validFlag);
    });

    test('returns null for invalid structure', () => {
      mockMessage.flags['eventide-rp-system'] = {
        playerActionApproval: {
          invalidField: 'value'
        }
      };

      const result = MessageFlags.getPlayerActionApprovalFlag(mockMessage);
      expect(result).toBeNull();
    });

    test('returns null when required fields missing', () => {
      mockMessage.flags['eventide-rp-system'] = {
        playerActionApproval: {
          actionCardId: 'card1',
          actorId: 'actor1'
        }
      };

      const result = MessageFlags.getPlayerActionApprovalFlag(mockMessage);
      expect(result).toBeNull();
    });

    test('validates processed field type correctly', () => {
      const invalidFlag = {
        actorId: 'actor1',
        actionCardId: 'card1',
        playerId: 'user1',
        playerName: 'Test Player',
        targetIds: [],
        timestamp: Date.now(),
        processed: 'not a boolean'
      };

      mockMessage.flags['eventide-rp-system'] = {
        playerActionApproval: invalidFlag
      };

      const result = MessageFlags.getPlayerActionApprovalFlag(mockMessage);
      expect(result).toBeNull();
    });
  });

  describe('isPlayerActionApprovalPending()', () => {
    test('returns true when not processed', () => {
      const flag = {
        actorId: 'actor1',
        actionCardId: 'card1',
        playerId: 'user1',
        playerName: 'Test Player',
        targetIds: [],
        timestamp: Date.now(),
        processed: false
      };

      mockMessage.flags['eventide-rp-system'] = {
        playerActionApproval: flag
      };

      const result = MessageFlags.isPlayerActionApprovalPending(mockMessage);
      expect(result).toBe(true);
    });

    test('returns false when processed is true', () => {
      const flag = {
        actorId: 'actor1',
        actionCardId: 'card1',
        playerId: 'user1',
        playerName: 'Test Player',
        targetIds: [],
        timestamp: Date.now(),
        processed: true
      };

      mockMessage.flags['eventide-rp-system'] = {
        playerActionApproval: flag
      };

      const result = MessageFlags.isPlayerActionApprovalPending(mockMessage);
      expect(result).toBe(false);
    });

    test('returns falsy when flag is null', () => {
      mockMessage.flags['eventide-rp-system'] = {};
      const result = MessageFlags.isPlayerActionApprovalPending(mockMessage);
      expect(result).toBeFalsy();
    });
  });

  describe('cleanupOldMessages()', () => {
    test('cleanup messages older than maxAge', async () => {
      const oldTimestamp = Date.now() - 100000;
      const oldMessage = {
        id: 'msg1',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              actionCardId: 'card1',
              actorId: 'actor1',
              timestamp: oldTimestamp,
              damage: {
                targetId: 'actor1',
                targetName: 'Test Actor 1',
                formula: '2d6',
                targetValid: true,
                applied: true
              }
            }
          }
        },
        delete: vi.fn().mockResolvedValue(true)
      };

      global.game.messages.filter.mockReturnValueOnce([oldMessage]);

      const result = await MessageFlags.cleanupOldMessages(1000);
      expect(result).toBe(1);
      expect(oldMessage.delete).toHaveBeenCalled();
    });

    test('returns count of cleaned messages', async () => {
      const oldTimestamp = Date.now() - 100000;
      const oldMessages = [
        {
          id: 'msg1',
          flags: {
            'eventide-rp-system': {
              gmApplySection: {
                actionCardId: 'card1',
                actorId: 'actor1',
                timestamp: oldTimestamp,
                damage: { targetId: 'actor1', targetName: 'Test', formula: '2d6', targetValid: true, applied: true }
              }
            }
          },
          delete: vi.fn().mockResolvedValue(true)
        },
        {
          id: 'msg2',
          flags: {
            'eventide-rp-system': {
              playerActionApproval: {
                actorId: 'actor1',
                actionCardId: 'card1',
                playerId: 'user1',
                playerName: 'Test Player',
                targetIds: [],
                timestamp: oldTimestamp,
                processed: true
              }
            }
          },
          delete: vi.fn().mockResolvedValue(true)
        }
      ];

      const gmMessage = oldMessages[0];
      const playerMessage = oldMessages[1];

      global.game.messages.filter.mockReturnValueOnce([gmMessage]);
      global.game.messages.filter.mockReturnValueOnce([playerMessage]);

      const result = await MessageFlags.cleanupOldMessages(1000);
      expect(result).toBe(2);
    });

    test('deletes GM apply messages when fully resolved', async () => {
      const oldTimestamp = Date.now() - 100000;
      const resolvedMessage = {
        id: 'msg1',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              actionCardId: 'card1',
              actorId: 'actor1',
              timestamp: oldTimestamp,
              damage: {
                targetId: 'actor1',
                targetName: 'Test Actor 1',
                formula: '2d6',
                targetValid: true,
                applied: true
              }
            }
          }
        },
        delete: vi.fn().mockResolvedValue(true)
      };

      global.game.messages.filter.mockReturnValueOnce([resolvedMessage]);
      global.game.messages.filter.mockReturnValueOnce([]);

      await MessageFlags.cleanupOldMessages(1000);
      expect(resolvedMessage.delete).toHaveBeenCalled();
    });

    test('deletes processed player approval messages', async () => {
      const oldTimestamp = Date.now() - 100000;
      const processedMessage = {
        id: 'msg1',
        flags: {
          'eventide-rp-system': {
            playerActionApproval: {
              actorId: 'actor1',
              actionCardId: 'card1',
              playerId: 'user1',
              playerName: 'Test Player',
              targetIds: [],
              timestamp: oldTimestamp,
              processed: true
            }
          }
        },
        delete: vi.fn().mockResolvedValue(true)
      };

      global.game.messages.filter.mockReturnValueOnce([]);
      global.game.messages.filter.mockReturnValueOnce([processedMessage]);

      await MessageFlags.cleanupOldMessages(1000);
      expect(processedMessage.delete).toHaveBeenCalled();
    });

    test('keeps unresolved GM apply messages', async () => {
      const oldTimestamp = Date.now() - 100000;
      const unresolvedMessage = {
        id: 'msg1',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              actionCardId: 'card1',
              actorId: 'actor1',
              timestamp: oldTimestamp,
              damage: {
                targetId: 'actor1',
                targetName: 'Test Actor 1',
                formula: '2d6',
                targetValid: true,
                applied: false
              }
            }
          }
        },
        delete: vi.fn().mockResolvedValue(true)
      };

      global.game.messages.filter.mockReturnValueOnce([unresolvedMessage]);
      global.game.messages.filter.mockReturnValueOnce([]);

      await MessageFlags.cleanupOldMessages(1000);
      expect(unresolvedMessage.delete).not.toHaveBeenCalled();
    });

    test('keeps unprocessed player approval messages', async () => {
      const oldTimestamp = Date.now() - 100000;
      const unprocessedMessage = {
        id: 'msg1',
        flags: {
          'eventide-rp-system': {
            playerActionApproval: {
              actorId: 'actor1',
              actionCardId: 'card1',
              playerId: 'user1',
              playerName: 'Test Player',
              targetIds: [],
              timestamp: oldTimestamp,
              processed: false
            }
          }
        },
        delete: vi.fn().mockResolvedValue(true)
      };

      global.game.messages.filter.mockReturnValueOnce([]);
      global.game.messages.filter.mockReturnValueOnce([unprocessedMessage]);

      await MessageFlags.cleanupOldMessages(1000);
      expect(unprocessedMessage.delete).not.toHaveBeenCalled();
    });

    test('handles default maxAge (24 hours)', async () => {
      const oldTimestamp = Date.now() - 86400000 - 1000;
      const oldMessage = {
        id: 'msg1',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              actionCardId: 'card1',
              actorId: 'actor1',
              timestamp: oldTimestamp,
              damage: { targetId: 'actor1', targetName: 'Test', formula: '2d6', targetValid: true, applied: true }
            }
          }
        },
        delete: vi.fn().mockResolvedValue(true)
      };

      global.game.messages.filter.mockReturnValueOnce([oldMessage]);
      global.game.messages.filter.mockReturnValueOnce([]);

      const result = await MessageFlags.cleanupOldMessages();
      expect(result).toBe(1);
    });

    test('handles custom maxAge parameter', async () => {
      const oldTimestamp = Date.now() - 5000;
      const oldMessage = {
        id: 'msg1',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              actionCardId: 'card1',
              actorId: 'actor1',
              timestamp: oldTimestamp,
              damage: { targetId: 'actor1', targetName: 'Test', formula: '2d6', targetValid: true, applied: true }
            }
          }
        },
        delete: vi.fn().mockResolvedValue(true)
      };

      global.game.messages.filter.mockReturnValueOnce([oldMessage]);
      global.game.messages.filter.mockReturnValueOnce([]);

      const result = await MessageFlags.cleanupOldMessages(1000);
      expect(result).toBe(1);
    });

    test('filters out recent messages', async () => {
      const recentTimestamp = Date.now() - 100;
      const recentMessage = {
        id: 'msg1',
        flags: {
          'eventide-rp-system': {
            gmApplySection: {
              actionCardId: 'card1',
              actorId: 'actor1',
              timestamp: recentTimestamp,
              damage: { targetId: 'actor1', targetName: 'Test', formula: '2d6', targetValid: true, applied: true }
            }
          }
        }
      };

      global.game.messages.filter.mockReturnValueOnce([recentMessage]);
      global.game.messages.filter.mockReturnValueOnce([]);

      const result = await MessageFlags.cleanupOldMessages(1000);
      expect(result).toBe(0);
    });
  });
});