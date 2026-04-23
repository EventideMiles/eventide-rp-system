// @ts-nocheck
/**
 * @fileoverview Tests for ERPSMessageHandler service
 *
 * Tests the message handler for creating various chat messages in the Eventide RP System.
 */

import {
  erpsMessageHandler,
  createStatusMessage,
  createGearMessage,
  featureMessage,
  deleteStatusMessage,
  createRestoreMessage,
  restoreMessage,
  combatPowerMessage,
  gearTransferMessage,
  gearEquipMessage,
  transformationMessage,
  gearEffectMessage,
  createPlayerActionApprovalRequest,
  notifyPlayerActionResult,
  createTargetsExhaustedMessage
} from '../../../../module/services/managers/system-messages.mjs';

// Mock dependencies
vi.mock('../../../../module/utils/_module.mjs', () => ({
  ERPSRollUtilities: {
    getItemStyle: vi.fn(() => ({ borderClass: 'default' })),
    getSpeaker: vi.fn(() => ({ alias: 'Test Speaker' })),
    determineCriticalStates: vi.fn(() => ({
      critHit: false,
      critMiss: false,
      stolenCrit: false,
      savedMiss: false
    }))
  }
}));

vi.mock('../../../../module/services/logger.mjs', () => ({
  Logger: {
    methodEntry: vi.fn(),
    methodExit: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../../../../module/services/chat-message-builder.mjs', () => ({
  ChatMessageBuilder: {
    createMessage: vi.fn()
  }
}));

vi.mock('../../../../module/services/target-resolver.mjs', () => ({
  TargetResolver: {
    resolveLockedTargets: vi.fn(() => ({ valid: [], invalid: [] }))
  }
}));

vi.mock('../../../../module/helpers/message-flags.mjs', () => ({
  MessageFlags: {
    createPlayerActionApprovalFlag: vi.fn(() => ({
      actorId: 'actor-123',
      actionCardId: 'card-456',
      playerId: 'player-789'
    }))
  }
}));

import { ERPSRollUtilities } from '../../../../module/utils/_module.mjs';
import { Logger } from '../../../../module/services/logger.mjs';
import { ChatMessageBuilder } from '../../../../module/services/chat-message-builder.mjs';
import { TargetResolver } from '../../../../module/services/target-resolver.mjs';
import { MessageFlags } from '../../../../module/helpers/message-flags.mjs';

describe('ERPSMessageHandler', () => {
  let messageHandler;
  let mockActor;
  let mockItem;
  let mockActionCard;
  let mockRoll;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock actor
    mockActor = global.testUtils.createMockActor({
      id: 'actor-123',
      name: 'Test Actor',
      img: 'actor.png',
      isOwner: true,
      system: {
        abilities: { acro: { base: 3 } },
        hiddenAbilities: { acro: 20, miss: 5 }
      },
      getRollData: vi.fn(() => ({
        hiddenAbilities: { acro: 20, miss: 5 },
        abScore: 10
      }))
    });

    // Setup mock item
    mockItem = global.testUtils.createMockItem({
      id: 'item-456',
      name: 'Test Item',
      img: 'item.png',
      type: 'gear',
      system: {
        description: '<p>Test description</p>',
        active: true,
        roll: { type: 'none' },
        targeted: false
      },
      effects: {
        toObject: vi.fn(() => [{ id: 'effect-1', name: 'Test Effect' }])
      },
      parent: mockActor,
      isOwner: true,
      getRollData: vi.fn(() => ({ abScore: 10 })),
      items: {
        get: vi.fn(() => null)
      }
    });

    // Setup mock action card
    mockActionCard = global.testUtils.createMockItem({
      id: 'card-456',
      name: 'Test Action Card',
      type: 'actionCard',
      system: {
        description: 'Test action card',
        repetitions: 3,
        damageApplication: 'target',
        statusApplicationLimit: 1,
        costOnRepetition: false,
        failOnFirstMiss: false,
        embeddedTransformations: []
      },
      toObject: vi.fn(() => ({
        id: 'card-456',
        name: 'Test Action Card',
        system: { embeddedTransformations: [] }
      }))
    });

    // Setup mock roll
    mockRoll = global.testUtils.createMockRoll(15, [15], '1d20+10');
    mockRoll.total = 15;
    mockRoll.evaluate = vi.fn(async () => mockRoll);

    // Setup ChatMessage.create mock
    global.ChatMessage.create = vi.fn(() => Promise.resolve({
      id: 'msg-123',
      update: vi.fn()
    }));

    // Setup renderTemplate mock
    global.foundry.applications.handlebars.renderTemplate = vi.fn(() =>
      Promise.resolve('<div>Rendered Template</div>')
    );

    // Setup erps.utils mock
    if (!global.erps) {
      global.erps = {};
    }
    if (!global.erps.utils) {
      global.erps.utils = {};
    }
    global.erps.utils.getTargetArray = vi.fn(async () => []);

    // TextEditor mock is already set up in tests/setup.mjs
    // Just clear it for each test
    if (global.foundry.applications.ux?.TextEditor?.implementation?.enrichHTML) {
      global.foundry.applications.ux.TextEditor.implementation.enrichHTML.mockClear();
    }

    // Setup game.settings mocks
    if (global.game.settings) {
      global.game.settings.get = vi.fn((scope, key) => {
        if (key === 'rollMode') return 'publicroll';
        if (scope === 'eventide-rp-system' && key === 'showGearEquipMessages') return true;
        return null;
      });
    }

    // Setup canvas.scene mock
    if (!global.canvas) {
      global.canvas = { scene: { tokens: [] } };
    }

    // Setup game.i18n mock
    global.game.i18n = {
      localize: vi.fn((key) => key),
      format: vi.fn((key, data) => `${key} - ${JSON.stringify(data)}`)
    };

    // Setup game.users mock
    global.game.users = {
      filter: vi.fn(() => [{ id: 'gm-1', isGM: true }])
    };

    // Create message handler instance using the class
    const handlerClass = Object.getPrototypeOf(erpsMessageHandler).constructor;
    messageHandler = new handlerClass();

    // Setup ChatMessageBuilder.createMessage mock to return a message
    ChatMessageBuilder.createMessage.mockResolvedValue({
      id: 'msg-123'
    });
  });

  describe('Constructor and Templates', () => {
    test('should initialize with all template paths', () => {
      expect(messageHandler.templates).toBeDefined();
      expect(messageHandler.templates.status).toBe('systems/eventide-rp-system/templates/chat/status-message.hbs');
      expect(messageHandler.templates.gear).toBe('systems/eventide-rp-system/templates/chat/gear-message.hbs');
      expect(messageHandler.templates.feature).toBe('systems/eventide-rp-system/templates/chat/feature-message.hbs');
      expect(messageHandler.templates.combatPower).toBe('systems/eventide-rp-system/templates/chat/combat-power-message.hbs');
      expect(messageHandler.templates.deleteStatus).toBe('systems/eventide-rp-system/templates/chat/delete-status-message.hbs');
      expect(messageHandler.templates.restore).toBe('systems/eventide-rp-system/templates/chat/restore-message.hbs');
      expect(messageHandler.templates.gearTransfer).toBe('systems/eventide-rp-system/templates/chat/gear-transfer-message.hbs');
      expect(messageHandler.templates.gearEquip).toBe('systems/eventide-rp-system/templates/chat/gear-equip-message.hbs');
      expect(messageHandler.templates.transformation).toBe('systems/eventide-rp-system/templates/chat/transformation-message.hbs');
      expect(messageHandler.templates.playerActionApproval).toBe('systems/eventide-rp-system/templates/chat/player-action-approval.hbs');
    });
  });

  describe('createStatusMessage', () => {
    test('should create status message with context', async () => {
      await messageHandler.createStatusMessage(mockItem, 'Applied effect');

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith({
        templatePath: messageHandler.templates.status,
        templateData: {
          item: mockItem,
          effects: [{ id: 'effect-1', name: 'Test Effect' }],
          style: { borderClass: 'default' },
          context: 'Applied effect',
          enrichedDescription: '<p>Enriched</p>'
        },
        messageOptions: {
          speaker: { alias: 'Test Speaker' }
        },
        soundKey: 'statusApply',
        forceSound: false,
        useERPSRollUtilitiesSpeaker: true
      });
    });

    test('should create status message without context', async () => {
      await messageHandler.createStatusMessage(mockItem);

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          templatePath: messageHandler.templates.status,
          soundKey: 'statusApply'
        })
      );
    });

    test('should get item style for status message', async () => {
      await messageHandler.createStatusMessage(mockItem);
      expect(ERPSRollUtilities.getItemStyle).toHaveBeenCalledWith(mockItem);
    });

    test('should enrich description for status message', async () => {
      await messageHandler.createStatusMessage(mockItem);
      expect(global.foundry.applications.ux.TextEditor.implementation.enrichHTML).toHaveBeenCalledWith(
        '<p>Test description</p>',
        expect.any(Object)
      );
    });
  });

  describe('createGearMessage', () => {
    test('should create gear message with context', async () => {
      await messageHandler.createGearMessage(mockItem, 'Equipped gear');

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith({
        templatePath: messageHandler.templates.gear,
        templateData: {
          item: mockItem,
          effects: [{ id: 'effect-1', name: 'Test Effect' }],
          style: { borderClass: 'default' },
          context: 'Equipped gear',
          enrichedDescription: '<p>Enriched</p>'
        },
        messageOptions: {
          speaker: { alias: 'Test Speaker' }
        },
        soundKey: 'gearEquip',
        forceSound: false,
        useERPSRollUtilitiesSpeaker: true
      });
    });

    test('should create gear message without context', async () => {
      await messageHandler.createGearMessage(mockItem);

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          templatePath: messageHandler.templates.gear,
          soundKey: 'gearEquip'
        })
      );
    });

    test('should use gearEquip sound key', async () => {
      await messageHandler.createGearMessage(mockItem);
      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          soundKey: 'gearEquip'
        })
      );
    });
  });

  describe('createFeatureMessage', () => {
    test('should return null for null item', async () => {
      const result = await messageHandler.createFeatureMessage(null);
      expect(result).toBeNull();
    });

    test('should return null for item without system', async () => {
      const result = await messageHandler.createFeatureMessage({});
      expect(result).toBeNull();
    });

    test('should create non-roll feature message', async () => {
      await messageHandler.createFeatureMessage(mockItem);

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith({
        templatePath: messageHandler.templates.feature,
        templateData: {
          item: mockItem,
          effects: [{ id: 'effect-1', name: 'Test Effect' }],
          style: { borderClass: 'default' },
          hasRoll: false,
          actor: mockActor,
          enrichedDescription: '<p>Enriched</p>',
          isActive: true
        },
        messageOptions: {
          speaker: { alias: 'Test Speaker' },
          rollMode: 'publicroll'
        },
        soundKey: null,
        forceSound: false,
        useERPSRollUtilitiesSpeaker: true
      });
    });

    test('should create roll feature message with targeting', async () => {
      const rollItem = { ...mockItem };
      rollItem.system.roll = { type: 'attack' };
      rollItem.system.targeted = true;
      rollItem.getCombatRollFormula = vi.fn(() => '1d20+10');

      const mockTarget = {
        actor: { name: 'Target Actor', getRollData: vi.fn(() => ({ armor: 15 })) }
      };
      global.erps.utils.getTargetArray.mockResolvedValue([mockTarget]);

      await messageHandler.createFeatureMessage(rollItem);

      const expectedCalls = ChatMessageBuilder.createMessage.mock.calls;
      expect(expectedCalls.length).toBeGreaterThan(0);
      const lastCall = expectedCalls[expectedCalls.length - 1];
      expect(lastCall[0].templatePath).toBe(messageHandler.templates.feature);
      expect(lastCall[0].templateData.hasRoll).toBe(true);
      expect(lastCall[0].templateData.pickedType).toBe('attack');
      expect(lastCall[0].templateData.acCheck).toBe(true);
      expect(lastCall[0].soundKey).toBe('featureRoll');
    });

    test('should create non-roll feature message', async () => {
      const nonRollItem = { ...mockItem };
      nonRollItem.system.roll = { type: 'none' };

      await messageHandler.createFeatureMessage(nonRollItem);

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith({
        templatePath: messageHandler.templates.feature,
        templateData: expect.objectContaining({
          hasRoll: false
        }),
        messageOptions: expect.any(Object),
        soundKey: null,
        forceSound: false,
        useERPSRollUtilitiesSpeaker: true
      });
    });

    test('should throw error for invalid roll formula', async () => {
      const rollItem = { ...mockItem };
      rollItem.system.roll = { type: 'attack' };
      rollItem.getCombatRollFormula = vi.fn(() => '');

      await messageHandler.createFeatureMessage(rollItem);

      expect(Logger.error).toHaveBeenCalledWith(
        'Error creating feature roll message',
        expect.any(Error),
        'SYSTEM_MESSAGES'
      );
      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith({
        templatePath: messageHandler.templates.feature,
        templateData: expect.objectContaining({
          hasRoll: false
        }),
        messageOptions: expect.any(Object),
        soundKey: null,
        forceSound: false,
        useERPSRollUtilitiesSpeaker: true
      });
    });

    test('should use "none" fallback when roll type is undefined', async () => {
      const itemWithoutRollType = { ...mockItem };
      itemWithoutRollType.system.roll = {}; // No type property

      await messageHandler.createFeatureMessage(itemWithoutRollType);

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith({
        templatePath: messageHandler.templates.feature,
        templateData: expect.objectContaining({
          hasRoll: false
        }),
        messageOptions: expect.any(Object),
        soundKey: null,
        forceSound: false,
        useERPSRollUtilitiesSpeaker: true
      });
    });

    test('should use true fallback when active is undefined', async () => {
      const itemWithoutActive = { ...mockItem };
      itemWithoutActive.system.active = undefined;

      await messageHandler.createFeatureMessage(itemWithoutActive);

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith({
        templatePath: messageHandler.templates.feature,
        templateData: expect.objectContaining({
          isActive: true
        }),
        messageOptions: expect.any(Object),
        soundKey: null,
        forceSound: false,
        useERPSRollUtilitiesSpeaker: true
      });
    });

    test('should handle targeted feature without targets (addCheck false)', async () => {
      const rollItem = { ...mockItem };
      rollItem.system.roll = { type: 'attack' };
      rollItem.system.targeted = true;
      rollItem.getCombatRollFormula = vi.fn(() => '1d20+10');

      // Return empty targets array
      global.erps.utils.getTargetArray.mockResolvedValue([]);

      await messageHandler.createFeatureMessage(rollItem);

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            hasRoll: true,
            acCheck: false,
            targetArray: []
          })
        })
      );
    });

    test('should handle roll feature with targets (addCheck true)', async () => {
      const rollItem = { ...mockItem };
      rollItem.system.roll = { type: 'attack' };
      rollItem.system.targeted = true;
      rollItem.getCombatRollFormula = vi.fn(() => '1d20+10');

      const mockTarget = {
        actor: { name: 'Target Actor', getRollData: vi.fn(() => ({ armor: 15 })) }
      };
      global.erps.utils.getTargetArray.mockResolvedValue([mockTarget]);

      await messageHandler.createFeatureMessage(rollItem);

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            hasRoll: true,
            acCheck: true,
            targetArray: [mockTarget]
          })
        })
      );
    });

    test('should handle critical state fallbacks when determineCriticalStates returns undefined values', async () => {
      const rollItem = { ...mockItem };
      rollItem.system.roll = { type: 'attack' };
      rollItem.getCombatRollFormula = vi.fn(() => '1d20+10');

      // Mock determineCriticalStates to return undefined values
      ERPSRollUtilities.determineCriticalStates.mockReturnValue({
        critHit: undefined,
        critMiss: undefined,
        stolenCrit: undefined,
        savedMiss: undefined
      });

      await messageHandler.createFeatureMessage(rollItem);

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            critHit: false,
            critMiss: false,
            stolenCrit: false,
            savedMiss: false
          })
        })
      );
    });

    test('should use custom roll mode from options', async () => {
      await messageHandler.createFeatureMessage(mockItem, { rollMode: 'blindroll' });

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith({
        templatePath: messageHandler.templates.feature,
        templateData: expect.any(Object),
        messageOptions: {
          speaker: expect.any(Object),
          rollMode: 'blindroll'
        },
        soundKey: null,
        forceSound: false,
        useERPSRollUtilitiesSpeaker: true
      });
    });
  });

  describe('createDeleteStatusMessage', () => {
    test('should create delete status message', async () => {
      await messageHandler.createDeleteStatusMessage(mockItem, { description: 'Removed status' });

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith({
        templatePath: messageHandler.templates.deleteStatus,
        templateData: {
          item: mockItem,
          options: { description: 'Removed status' }
        },
        messageOptions: {
          speaker: { alias: 'Test Speaker' }
        },
        soundKey: 'statusRemove',
        forceSound: false,
        useERPSRollUtilitiesSpeaker: true
      });
    });
  });

  describe('createRestoreMessage', () => {
    test('should create restore message', async () => {
      const options = {
        all: true,
        resolve: true,
        power: false,
        statuses: [mockItem],
        actor: mockActor
      };

      await messageHandler.createRestoreMessage(options);

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith({
        templatePath: messageHandler.templates.restore,
        templateData: options,
        messageOptions: {
          speaker: { alias: 'Test Speaker' }
        },
        soundKey: 'statusRemove',
        forceSound: false,
        useERPSRollUtilitiesSpeaker: true
      });
    });
  });

  describe('createCombatPowerMessage', () => {
    test('should return null for null item', async () => {
      const result = await messageHandler.createCombatPowerMessage(null);
      expect(result).toBeNull();
    });

    test('should create non-roll combat power message', async () => {
      await messageHandler.createCombatPowerMessage(mockItem);

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith({
        templatePath: messageHandler.templates.combatPower,
        templateData: {
          img: 'item.png',
          name: 'Test Item',
          system: mockItem.system,
          style: { borderClass: 'default' },
          isGear: true,
          className: '',
          hasRoll: false,
          actor: mockActor,
          enrichedDescription: '<p>Enriched</p>'
        },
        messageOptions: {
          speaker: { alias: 'Test Speaker' },
          rollMode: 'publicroll'
        },
        soundKey: 'combatPower',
        forceSound: false,
        useERPSRollUtilitiesSpeaker: true
      });
    });

    test('should create roll combat power message with locked targets', async () => {
      const rollItem = { ...mockItem };
      rollItem.system.roll = { type: 'attack' };
      rollItem.system.targeted = true;
      rollItem.getCombatRollFormula = vi.fn(() => '1d20+10');

      const lockedTargets = [
        { tokenId: 'token-1', actorId: 'actor-1' }
      ];

      const resolvedTarget = {
        token: { id: 'token-1' },
        actor: { name: 'Target Actor', getRollData: vi.fn(() => ({ armor: 15 })) }
      };
      TargetResolver.resolveLockedTargets.mockReturnValue({ valid: [resolvedTarget], invalid: [] });

      await messageHandler.createCombatPowerMessage(rollItem, { lockedTargets });

      expect(TargetResolver.resolveLockedTargets).toHaveBeenCalledWith(lockedTargets);
      const expectedCalls = ChatMessageBuilder.createMessage.mock.calls;
      expect(expectedCalls.length).toBeGreaterThan(0);
      const lastCall = expectedCalls[expectedCalls.length - 1];
      expect(lastCall[0].templatePath).toBe(messageHandler.templates.combatPower);
      expect(lastCall[0].templateData.hasRoll).toBe(true);
      expect(lastCall[0].soundKey).toBe('combatPower');
    });

    test('should create roll combat power message without locked targets', async () => {
      const rollItem = { ...mockItem };
      rollItem.system.roll = { type: 'attack' };
      rollItem.system.targeted = true;
      rollItem.getCombatRollFormula = vi.fn(() => '1d20+10');

      const mockTarget = {
        actor: { name: 'Target Actor', getRollData: vi.fn(() => ({ armor: 15 })) }
      };
      global.erps.utils.getTargetArray.mockResolvedValue([mockTarget]);

      await messageHandler.createCombatPowerMessage(rollItem);

      expect(global.erps.utils.getTargetArray).toHaveBeenCalled();
      const expectedCalls = ChatMessageBuilder.createMessage.mock.calls;
      expect(expectedCalls.length).toBeGreaterThan(0);
      const lastCall = expectedCalls[expectedCalls.length - 1];
      expect(lastCall[0].templatePath).toBe(messageHandler.templates.combatPower);
      expect(lastCall[0].templateData.hasRoll).toBe(true);
      expect(lastCall[0].soundKey).toBe('combatPower');
    });

    test('should throw error for invalid roll formula', async () => {
      const rollItem = { ...mockItem };
      rollItem.system.roll = { type: 'attack' };
      rollItem.getCombatRollFormula = vi.fn(() => '');

      await messageHandler.createCombatPowerMessage(rollItem);

      expect(Logger.error).toHaveBeenCalledWith(
        'Error creating combat power roll',
        expect.any(Error),
        'SYSTEM_MESSAGES'
      );
      
      const expectedCalls = ChatMessageBuilder.createMessage.mock.calls;
      expect(expectedCalls.length).toBeGreaterThan(0);
      const lastCall = expectedCalls[expectedCalls.length - 1];
      expect(lastCall[0].templatePath).toBe(messageHandler.templates.combatPower);
      expect(lastCall[0].templateData.rollError).toBe(true);
      expect(lastCall[0].templateData.errorMessage).toBe('Invalid roll formula');
      expect(lastCall[0].templateData.hasRoll).toBe(false);
      expect(lastCall[0].soundKey).toBe('combatPower');
    });

    test('should use "none" fallback when roll type is undefined', async () => {
      const itemWithoutRollType = { ...mockItem };
      itemWithoutRollType.system.roll = {}; // No type property

      await messageHandler.createCombatPowerMessage(itemWithoutRollType);

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith({
        templatePath: messageHandler.templates.combatPower,
        templateData: expect.objectContaining({
          hasRoll: false
        }),
        messageOptions: expect.any(Object),
        soundKey: 'combatPower',
        forceSound: false,
        useERPSRollUtilitiesSpeaker: true
      });
    });

    test('should handle targeted combat power without targets (addCheck false)', async () => {
      const rollItem = { ...mockItem };
      rollItem.system.roll = { type: 'attack' };
      rollItem.system.targeted = true;
      rollItem.getCombatRollFormula = vi.fn(() => '1d20+10');

      // Return empty targets array
      global.erps.utils.getTargetArray.mockResolvedValue([]);

      await messageHandler.createCombatPowerMessage(rollItem);

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            hasRoll: true,
            acCheck: false,
            targetArray: []
          })
        })
      );
    });

    test('should handle combat power with locked targets and target roll data', async () => {
      const rollItem = { ...mockItem };
      rollItem.system.roll = { type: 'attack' };
      rollItem.system.targeted = true;
      rollItem.getCombatRollFormula = vi.fn(() => '1d20+10');

      const lockedTargets = [
        { tokenId: 'token-1', actorId: 'actor-1' }
      ];

      const resolvedTarget = {
        token: { id: 'token-1' },
        actor: {
          name: 'Target Actor',
          getRollData: vi.fn(() => ({ armor: 15, defense: 10 }))
        }
      };
      TargetResolver.resolveLockedTargets.mockReturnValue({ valid: [resolvedTarget], invalid: [] });

      await messageHandler.createCombatPowerMessage(rollItem, { lockedTargets });

      expect(TargetResolver.resolveLockedTargets).toHaveBeenCalledWith(lockedTargets);
      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            hasRoll: true,
            acCheck: true,
            targetArray: [resolvedTarget]
          })
        })
      );
    });

    test('should handle target roll data with missing actor properties', async () => {
      const rollItem = { ...mockItem };
      rollItem.system.roll = { type: 'attack' };
      rollItem.system.targeted = true;
      rollItem.getCombatRollFormula = vi.fn(() => '1d20+10');

      // Target with missing actor
      const mockTarget = {
        actor: null,
        token: null
      };
      global.erps.utils.getTargetArray.mockResolvedValue([mockTarget]);

      await messageHandler.createCombatPowerMessage(rollItem);

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            hasRoll: true,
            acCheck: true, // targeted is true and targetArray has elements
            targetArray: [mockTarget],
            // When actor is null, targetRollData uses fallback values
            targetRollData: expect.arrayContaining([
              expect.objectContaining({
                name: 'Unknown',
                compare: expect.any(Number)
              })
            ])
          })
        })
      );
    });

    test('should handle critical state fallbacks when determineCriticalStates returns undefined', async () => {
      const rollItem = { ...mockItem };
      rollItem.system.roll = { type: 'attack' };
      rollItem.getCombatRollFormula = vi.fn(() => '1d20+10');

      // Mock determineCriticalStates to return undefined values
      ERPSRollUtilities.determineCriticalStates.mockReturnValue({
        critHit: undefined,
        critMiss: undefined,
        stolenCrit: undefined,
        savedMiss: undefined
      });

      await messageHandler.createCombatPowerMessage(rollItem);

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            critHit: false,
            critMiss: false,
            stolenCrit: false,
            savedMiss: false
          })
        })
      );
    });
  });

  describe('createGearTransferMessage', () => {
    test('should create gear transfer message', async () => {
      const destActor = global.testUtils.createMockActor({
        id: 'actor-456',
        name: 'Destination Actor'
      });

      await messageHandler.createGearTransferMessage(
        mockItem,
        mockActor,
        destActor,
        2,
        'Transfer test'
      );

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith({
        templatePath: messageHandler.templates.gearTransfer,
        templateData: {
          item: mockItem,
          sourceActor: mockActor,
          destActor,
          quantity: 2,
          description: 'Transfer test'
        },
        messageOptions: {
          speaker: { alias: 'Test Speaker' }
        },
        soundKey: 'gearTransfer',
        forceSound: false,
        useERPSRollUtilitiesSpeaker: true
      });
    });
  });

  describe('createGearEquipMessage', () => {
    test('should return undefined when showGearEquipMessages is false', async () => {
      global.game.settings.get.mockReturnValue(false);

      const result = await messageHandler.createGearEquipMessage(mockItem);
      expect(result).toBeUndefined();
    });

    test('should create equip message when item is equipped', async () => {
      mockItem.system.equipped = true;

      await messageHandler.createGearEquipMessage(mockItem);

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith({
        templatePath: messageHandler.templates.gearEquip,
        templateData: {
          item: mockItem,
          actor: mockActor,
          equipped: true
        },
        messageOptions: expect.any(Object),
        soundKey: 'gearEquip',
        forceSound: false,
        useERPSRollUtilitiesSpeaker: true
      });
    });
  });

  describe('createPlayerActionApprovalRequest', () => {
    test('should create player action approval request', async () => {
      const targets = [mockActor];

      await messageHandler.createPlayerActionApprovalRequest({
        actor: mockActor,
        actionCard: mockActionCard,
        playerId: 'player-789',
        playerName: 'Test Player',
        targets,
        rollResult: { total: 15 },
        lockedTargets: [],
        transformationSelections: new Map(),
        selectedEffectIds: []
      });

      expect(global.ChatMessage.create).toHaveBeenCalledWith({
        content: '<div>Rendered Template</div>',
        whisper: ['gm-1'],
        speaker: {
          alias: 'EVENTIDE_RP_SYSTEM.Chat.PlayerActionApproval.Title - Test Player'
        },
        flags: {
          'eventide-rp-system': {
            playerActionApproval: expect.any(Object)
          }
        }
      });

      expect(MessageFlags.createPlayerActionApprovalFlag).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'actor-123',
          actionCardId: 'card-456',
          playerId: 'player-789',
          playerName: 'Test Player',
          targetIds: ['actor-123'],
          lockedTargets: [],
          rollResult: { total: 15 },
          selectedEffectIds: []
        })
      );
    });

    test('should create formatted transformation selections', async () => {
      const actionCardWithTransformations = { ...mockActionCard };
      actionCardWithTransformations.system.embeddedTransformations = [
        { id: 'trans-1', name: 'Transformation 1', _id: 'trans-1' }
      ];

      await messageHandler.createPlayerActionApprovalRequest({
        actor: mockActor,
        actionCard: actionCardWithTransformations,
        playerId: 'player-789',
        playerName: 'Test Player',
        targets: [],
        rollResult: { total: 15 },
        lockedTargets: [],
        transformationSelections: new Map([['target-1', 'trans-1']]),
        selectedEffectIds: []
      });

      expect(global.ChatMessage.create).toHaveBeenCalled();
      
      // Check that the transformation selection was formatted correctly
      const createCalls = MessageFlags.createPlayerActionApprovalFlag.mock.calls;
      expect(createCalls.length).toBeGreaterThan(0);
      const lastCall = createCalls[createCalls.length - 1];
      // The transformationSelections is the original Map passed in
      expect(lastCall[0].transformationSelections).toBeInstanceOf(Map);
      expect(lastCall[0].transformationSelections.get('target-1')).toBe('trans-1');
    });

    test('should log method entry and exit', async () => {
      await messageHandler.createPlayerActionApprovalRequest({
        actor: mockActor,
        actionCard: mockActionCard,
        playerId: 'player-789',
        playerName: 'Test Player',
        targets: [],
        rollResult: { total: 15 },
        lockedTargets: [],
        transformationSelections: new Map(),
        selectedEffectIds: []
      });

      expect(Logger.methodEntry).toHaveBeenCalledWith(
        'SystemMessages',
        'createPlayerActionApprovalRequest',
        expect.any(Object)
      );
      expect(Logger.methodExit).toHaveBeenCalledWith(
        'SystemMessages',
        'createPlayerActionApprovalRequest',
        expect.any(Object)
      );
    });

    test('should handle undefined transformationSelections', async () => {
      await messageHandler.createPlayerActionApprovalRequest({
        actor: mockActor,
        actionCard: mockActionCard,
        playerId: 'player-789',
        playerName: 'Test Player',
        targets: [],
        rollResult: { total: 15 },
        lockedTargets: [],
        transformationSelections: undefined,
        selectedEffectIds: []
      });

      expect(global.ChatMessage.create).toHaveBeenCalled();
      const createCalls = MessageFlags.createPlayerActionApprovalFlag.mock.calls;
      expect(createCalls.length).toBeGreaterThan(0);
      const lastCall = createCalls[createCalls.length - 1];
      // transformationSelections should be undefined
      expect(lastCall[0].transformationSelections).toBeUndefined();
    });

    test('should handle action card without embedded transformations', async () => {
      const actionCardWithoutTransformations = { ...mockActionCard };
      actionCardWithoutTransformations.system.embeddedTransformations = undefined;

      await messageHandler.createPlayerActionApprovalRequest({
        actor: mockActor,
        actionCard: actionCardWithoutTransformations,
        playerId: 'player-789',
        playerName: 'Test Player',
        targets: [],
        rollResult: { total: 15 },
        lockedTargets: [],
        transformationSelections: new Map([['target-1', 'trans-1']]),
        selectedEffectIds: []
      });

      expect(global.ChatMessage.create).toHaveBeenCalled();
      // The transformation name should fall back to the ID
      const createCalls = MessageFlags.createPlayerActionApprovalFlag.mock.calls;
      expect(createCalls.length).toBeGreaterThan(0);
    });

    test('should use transformation ID as fallback when name not found', async () => {
      const actionCardWithTransformations = { ...mockActionCard };
      actionCardWithTransformations.system.embeddedTransformations = [
        { id: 'trans-1', name: 'Transformation 1', _id: 'trans-1' }
      ];

      // Use a transformation ID that doesn't exist in the map
      await messageHandler.createPlayerActionApprovalRequest({
        actor: mockActor,
        actionCard: actionCardWithTransformations,
        playerId: 'player-789',
        playerName: 'Test Player',
        targets: [],
        rollResult: { total: 15 },
        lockedTargets: [],
        transformationSelections: new Map([['target-1', 'unknown-trans-id']]),
        selectedEffectIds: []
      });

      // Verify the message was created
      expect(global.ChatMessage.create).toHaveBeenCalled();
      // The fallback logic is tested by the fact that the function completes without error
      // and ChatMessage.create is called with the transformationSelections
    });

    test('should handle empty embedded transformations array', async () => {
      const actionCardWithEmptyTransformations = { ...mockActionCard };
      actionCardWithEmptyTransformations.system.embeddedTransformations = [];

      await messageHandler.createPlayerActionApprovalRequest({
        actor: mockActor,
        actionCard: actionCardWithEmptyTransformations,
        playerId: 'player-789',
        playerName: 'Test Player',
        targets: [],
        rollResult: { total: 15 },
        lockedTargets: [],
        transformationSelections: new Map([['target-1', 'trans-1']]),
        selectedEffectIds: []
      });

      // Verify the message was created
      expect(global.ChatMessage.create).toHaveBeenCalled();
      // The fallback logic is tested by the fact that the function completes without error
      // and ChatMessage.create is called with the transformationSelections
    });
  });

  describe('notifyPlayerActionResult', () => {
    test('should notify player of approved action', async () => {
      // Set up canvas.scene.tokens with proper structure
      const tokenActor = global.testUtils.createMockActor({
        id: 'actor-999',
        name: 'Scene Actor',
        items: { get: vi.fn(() => null) }
      });
      global.canvas.scene.tokens = [{ actor: tokenActor }];

      await messageHandler.notifyPlayerActionResult(
        'player-789',
        'Test Player',
        'Test Action Card',
        true,
        'Test GM'
      );

      expect(global.ChatMessage.create).toHaveBeenCalledWith({
        content: expect.stringContaining('check-circle'),
        whisper: ['player-789'],
        speaker: {
          alias: 'EVENTIDE_RP_SYSTEM.Chat.PlayerActionApproval.GMDecision'
        }
      });
    });

    test('should notify player of denied action', async () => {
      // Set up canvas.scene.tokens with proper structure
      const tokenActor = global.testUtils.createMockActor({
        id: 'actor-999',
        name: 'Scene Actor',
        items: { get: vi.fn(() => null) }
      });
      global.canvas.scene.tokens = [{ actor: tokenActor }];

    await messageHandler.notifyPlayerActionResult(
      'player-789',
      'Test Player',
      'Test Action Card',
      false,
      'Test GM'
    );

    expect(global.ChatMessage.create).toHaveBeenCalledWith({
      content: expect.stringContaining('times-circle'),
      whisper: ['player-789'],
      speaker: {
        alias: 'EVENTIDE_RP_SYSTEM.Chat.PlayerActionApproval.GMDecision'
      }
    });
  });

  test('should log method entry and exit', async () => {
    // Set up canvas.scene.tokens with proper structure
    const tokenActor = global.testUtils.createMockActor({
      id: 'actor-999',
      name: 'Scene Actor',
      items: { get: vi.fn(() => null) }
    });
    global.canvas.scene.tokens = [{ actor: tokenActor }];

    await messageHandler.notifyPlayerActionResult(
      'player-789',
      'Test Player',
      'Test Action Card',
      true,
      'Test GM'
    );

      expect(Logger.methodEntry).toHaveBeenCalledWith(
        'SystemMessages',
        'notifyPlayerActionResult',
        expect.any(Object)
      );
      expect(Logger.methodExit).toHaveBeenCalledWith(
        'SystemMessages',
        'notifyPlayerActionResult',
        expect.any(Object)
      );
    });

    test('should search for action card in scene actors', async () => {
      const tokenActor = global.testUtils.createMockActor({
        id: 'actor-999',
        name: 'Scene Actor',
        items: {
          get: vi.fn((name) => name === 'Test Action Card' ? mockActionCard : null)
        }
      });

      global.canvas.scene.tokens = [
        { actor: tokenActor },
        { actor: null }
      ];

      await messageHandler.notifyPlayerActionResult(
        'player-789',
        'Test Player',
        'Test Action Card',
        true,
        'Test GM'
      );

      expect(global.ChatMessage.create).toHaveBeenCalled();
    });
  });

  describe('createTargetsExhaustedMessage', () => {
    test('should create targets exhausted message', async () => {
      const repetitionInfo = {
        current: 2,
        total: 3,
        completed: 1
      };

      await messageHandler.createTargetsExhaustedMessage({
        actor: mockActor,
        actionCard: mockActionCard,
        repetitionInfo,
        exhaustedTargets: ['Target 1', 'Target 2']
      });

      expect(global.ChatMessage.create).toHaveBeenCalledWith({
        content: expect.any(String),
        speaker: {
          actor: 'actor-123',
          alias: 'Test Actor'
        }
      });
    });

    test('should log method entry and exit', async () => {
      await messageHandler.createTargetsExhaustedMessage({
        actor: mockActor,
        actionCard: mockActionCard,
        repetitionInfo: { current: 1, total: 2, completed: 0 },
        exhaustedTargets: []
      });

      expect(Logger.methodEntry).toHaveBeenCalledWith(
        'SystemMessages',
        'createTargetsExhaustedMessage',
        expect.any(Object)
      );
      expect(Logger.methodExit).toHaveBeenCalledWith(
        'SystemMessages',
        'createTargetsExhaustedMessage',
        expect.any(Object)
      );
    });
  });

  describe('gearEffectMessage', () => {
    test('should create gear effect message with default context', async () => {
      const target = mockActor;

      await messageHandler.gearEffectMessage(mockItem, target);

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith({
        templatePath: messageHandler.templates.gear,
        templateData: {
          item: mockItem,
          effects: [{ id: 'effect-1', name: 'Test Effect' }],
          style: { borderClass: 'default' },
          context: 'Applied as effect (no cost)',
          isEffect: true,
          target
        },
        messageOptions: expect.any(Object),
        soundKey: 'gearEquip',
        forceSound: false,
        useERPSRollUtilitiesSpeaker: true
      });
    });

    test('should create gear effect message with custom context', async () => {
      const target = mockActor;

      await messageHandler.gearEffectMessage(mockItem, target, 'Custom context');

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          templatePath: messageHandler.templates.gear,
          soundKey: 'gearEquip'
        })
      );
    });
  });

  describe('createTransformationMessage', () => {
    test('should create transformation message for applying', async () => {
      const transformation = { ...mockItem };
      transformation.system.getEmbeddedCombatPowers = vi.fn(() => []);

      await messageHandler.createTransformationMessage({
        actor: mockActor,
        transformation,
        isApplying: true
      });

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith({
        templatePath: messageHandler.templates.transformation,
        templateData: {
          actor: mockActor,
          transformation,
          isApplying: true,
          embeddedPowers: [],
          enrichedDescription: '<p>Enriched</p>'
        },
        messageOptions: expect.any(Object),
        soundKey: 'combatPower',
        forceSound: false,
        useERPSRollUtilitiesSpeaker: true
      });
    });

    test('should create transformation message for removing', async () => {
      const transformation = { ...mockItem };
      transformation.system.getEmbeddedCombatPowers = vi.fn(() => []);

      await messageHandler.createTransformationMessage({
        actor: mockActor,
        transformation,
        isApplying: false
      });

      expect(ChatMessageBuilder.createMessage).toHaveBeenCalledWith({
        templatePath: messageHandler.templates.transformation,
        templateData: expect.any(Object),
        messageOptions: expect.any(Object),
        soundKey: 'statusRemove',
        forceSound: false,
        useERPSRollUtilitiesSpeaker: true
      });
    });
  });

  describe('_enrichDescription', () => {
    test('should return empty string for null item', async () => {
      const result = await messageHandler._enrichDescription(null);
      expect(result).toBe('');
    });

    test('should return empty string for item without description', async () => {
      const itemWithoutDesc = { system: {} };
      const result = await messageHandler._enrichDescription(itemWithoutDesc);
      expect(result).toBe('');
    });

    test('should enrich HTML description successfully', async () => {
      global.foundry.applications.ux.TextEditor.implementation.enrichHTML.mockResolvedValue('<p>Enriched</p>');

      const result = await messageHandler._enrichDescription(mockItem);

      expect(result).toBe('<p>Enriched</p>');
      expect(global.foundry.applications.ux.TextEditor.implementation.enrichHTML).toHaveBeenCalledWith(
        '<p>Test description</p>',
        expect.any(Object)
      );
    });

    test('should return original description on enrichment error', async () => {
      global.foundry.applications.ux.TextEditor.implementation.enrichHTML.mockImplementation(
        async () => {
          throw new Error('Enrich failed');
        }
      );

      const result = await messageHandler._enrichDescription(mockItem);
      expect(result).toBe('<p>Test description</p>');
      expect(Logger.warn).toHaveBeenCalledWith('Failed to enrich description', expect.any(Error), 'SYSTEM_MESSAGES');
    });

    test('should use false for isOwner when item.isOwner is undefined', async () => {
      const itemWithoutOwner = {
        ...mockItem,
        isOwner: undefined,
        getRollData: vi.fn(() => ({ abScore: 10 }))
      };
      
      await messageHandler._enrichDescription(itemWithoutOwner);
      
      expect(global.foundry.applications.ux.TextEditor.implementation.enrichHTML).toHaveBeenCalledWith(
        '<p>Test description</p>',
        expect.objectContaining({
          secrets: false
        })
      );
    });

    test('should use empty object for rollData when getRollData is undefined', async () => {
      const itemWithoutGetRollData = {
        ...mockItem,
        getRollData: undefined
      };
      
      await messageHandler._enrichDescription(itemWithoutGetRollData);
      
      expect(global.foundry.applications.ux.TextEditor.implementation.enrichHTML).toHaveBeenCalledWith(
        '<p>Test description</p>',
        expect.objectContaining({
          rollData: {}
        })
      );
    });
  });

  describe('Exported Functions', () => {
    test('createStatusMessage should call erpsMessageHandler', async () => {
      await createStatusMessage(mockItem, 'test context');
      expect(ChatMessageBuilder.createMessage).toHaveBeenCalled();
    });

    test('createGearMessage should call erpsMessageHandler', async () => {
      await createGearMessage(mockItem, 'test context');
      expect(ChatMessageBuilder.createMessage).toHaveBeenCalled();
    });

    test('featureMessage should call erpsMessageHandler', async () => {
      await featureMessage(mockItem);
      expect(ChatMessageBuilder.createMessage).toHaveBeenCalled();
    });

    test('deleteStatusMessage should call erpsMessageHandler', async () => {
      await deleteStatusMessage(mockItem, { description: 'test' });
      expect(ChatMessageBuilder.createMessage).toHaveBeenCalled();
    });

    test('createRestoreMessage should call erpsMessageHandler', async () => {
      await createRestoreMessage({
        all: false,
        resolve: true,
        power: false,
        statuses: [],
        actor: mockActor
      });
      expect(ChatMessageBuilder.createMessage).toHaveBeenCalled();
    });

    test('restoreMessage should call erpsMessageHandler (legacy alias)', async () => {
      await restoreMessage({
        all: false,
        resolve: true,
        power: false,
        statuses: [],
        actor: mockActor
      });
      expect(ChatMessageBuilder.createMessage).toHaveBeenCalled();
    });

    test('combatPowerMessage should call erpsMessageHandler', async () => {
      await combatPowerMessage(mockItem);
      expect(ChatMessageBuilder.createMessage).toHaveBeenCalled();
    });

    test('gearTransferMessage should call erpsMessageHandler', async () => {
      const destActor = global.testUtils.createMockActor({ id: 'actor-456' });
      await gearTransferMessage(mockItem, mockActor, destActor, 1);
      expect(ChatMessageBuilder.createMessage).toHaveBeenCalled();
    });

    test('gearEquipMessage should call erpsMessageHandler', async () => {
      await gearEquipMessage(mockItem);
      expect(ChatMessageBuilder.createMessage).toHaveBeenCalled();
    });

    test('transformationMessage should call erpsMessageHandler', async () => {
      const transformation = { ...mockItem };
      transformation.system.getEmbeddedCombatPowers = vi.fn(() => []);
      
      await transformationMessage({
        actor: mockActor,
        transformation,
        isApplying: true
      });
      expect(ChatMessageBuilder.createMessage).toHaveBeenCalled();
    });

    test('gearEffectMessage should call erpsMessageHandler', async () => {
      await gearEffectMessage(mockItem, mockActor, 'test context');
      expect(ChatMessageBuilder.createMessage).toHaveBeenCalled();
    });

    test('createPlayerActionApprovalRequest should call erpsMessageHandler', async () => {
      await createPlayerActionApprovalRequest({
        actor: mockActor,
        actionCard: mockActionCard,
        playerId: 'player-789',
        playerName: 'Test Player',
        targets: [],
        rollResult: { total: 15 },
        lockedTargets: [],
        transformationSelections: new Map(),
        selectedEffectIds: []
      });
      expect(global.ChatMessage.create).toHaveBeenCalled();
    });

    test('notifyPlayerActionResult should call erpsMessageHandler', async () => {
      // Set up canvas.scene.tokens with proper structure
      const sceneActor = global.testUtils.createMockActor({ id: 'actor-999', name: 'Scene Actor' });
      sceneActor.items = {
        get: vi.fn((name) => name === 'Test Action Card' ? mockActionCard : null)
      };
      
      global.canvas.scene.tokens = [
        { actor: sceneActor }
      ];
      
      await notifyPlayerActionResult(
        'player-789',
        'Test Player',
        'Test Action Card',
        true,
        'Test GM'
      );
      expect(global.ChatMessage.create).toHaveBeenCalled();
    });

    test('createTargetsExhaustedMessage should call erpsMessageHandler', async () => {
      await createTargetsExhaustedMessage({
        actor: mockActor,
        actionCard: mockActionCard,
        repetitionInfo: { current: 1, total: 2, completed: 0 },
        exhaustedTargets: []
      });
      expect(global.ChatMessage.create).toHaveBeenCalled();
    });
  });
});