// @ts-nocheck
/**
 * @fileoverview Tests for combat-related hooks
 *
 * Tests the initialization of combat hooks, initiative rolling, and combatant management.
 */

import { initializeCombatHooks } from '../../../../module/services/hooks/combat.mjs';

// Mock dependencies
vi.mock('../../../../module/services/managers/_module.mjs', () => ({
  erpsRollHandler: {
    rollInitiative: vi.fn(),
  },
}));

vi.mock('../../../../module/services/logger.mjs', () => ({
  Logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Combat Hooks', () => {
  let mockGame;
  let mockHooks;
  let mockCombat;
  let mockCombatant;
  let mockErpsRollHandler;
  let mockLogger;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup mock game
    mockGame = {
      user: {
        id: 'user-123',
      },
      settings: {
        get: vi.fn(),
      },
    };
    global.game = mockGame;

    // Setup mock Hooks
    mockHooks = {
      on: vi.fn(),
    };
    global.Hooks = mockHooks;

    // Setup mock Combat and Combatant classes
    mockCombatant = {
      id: 'combatant-1',
      name: 'Test Combatant',
      actor: {
        hasPlayerOwner: false,
        name: 'Test Actor',
      },
      parent: {
        rollInitiative: vi.fn(),
      },
    };

    mockCombat = {
      id: 'combat-1',
      combatants: {
        get: vi.fn(),
      },
      update: vi.fn(),
    };

    global.Combat = class {
      constructor() {
        this.combatants = mockCombat.combatants;
      }
    };

    global.Combatant = class {
      constructor() {
        this.id = mockCombatant.id;
        this.name = mockCombatant.name;
        this.actor = mockCombatant.actor;
        this.parent = mockCombatant.parent;
        this.isOwner = true;
      }
    };

    // Get mocked modules
    const { erpsRollHandler } = await import(
      '../../../../module/services/managers/_module.mjs'
    );
    mockErpsRollHandler = erpsRollHandler;

    const { Logger } = await import('../../../../module/services/logger.mjs');
    mockLogger = Logger;
  });

  describe('initializeCombatHooks()', () => {
    test('should register createCombatant hook', async () => {
      // Act
      await initializeCombatHooks();

      // Assert
      expect(mockHooks.on).toHaveBeenCalledWith(
        'createCombatant',
        expect.any(Function),
      );
    });

    test('should register createCombat hook', async () => {
      // Act
      await initializeCombatHooks();

      // Assert
      expect(mockHooks.on).toHaveBeenCalledWith('createCombat', expect.any(Function));
    });

    test('should override Combat.rollInitiative method', async () => {
      // Act
      await initializeCombatHooks();

      // Assert
      expect(typeof Combat.prototype.rollInitiative).toBe('function');
    });

    test('should override Combatant.rollInitiative method', async () => {
      // Act
      await initializeCombatHooks();

      // Assert
      expect(typeof Combatant.prototype.rollInitiative).toBe('function');
    });

    describe('createCombatant hook', () => {
      let createCombatantCallback;

      beforeEach(async () => {
        await initializeCombatHooks();
        const hookCall = mockHooks.on.mock.calls.find(
          (call) => call[0] === 'createCombatant',
        );
        createCombatantCallback = hookCall[1];
      });

      test('should roll initiative for NPC when autoRollNpcInitiative is enabled', async () => {
        // Arrange
        mockGame.settings.get.mockImplementation((system, key) => {
          if (key === 'autoRollNpcInitiative') return true;
          if (key === 'hideNpcInitiativeRolls') return false;
          return false;
        });

        // Act
        await createCombatantCallback(mockCombatant, {}, 'user-123');

        // Assert
        expect(mockErpsRollHandler.rollInitiative).toHaveBeenCalledWith({
          combatant: mockCombatant,
          npc: true,
          whisperMode: false,
          customFlavor: 'Test Combatant rolls for Initiative!',
        });
      });

      test('should hide NPC initiative rolls when hideNpcInitiativeRolls is enabled', async () => {
        // Arrange
        mockGame.settings.get.mockImplementation((system, key) => {
          if (key === 'autoRollNpcInitiative') return true;
          if (key === 'hideNpcInitiativeRolls') return true;
          return false;
        });

        // Act
        await createCombatantCallback(mockCombatant, {}, 'user-123');

        // Assert
        expect(mockErpsRollHandler.rollInitiative).toHaveBeenCalledWith({
          combatant: mockCombatant,
          npc: true,
          whisperMode: true,
          customFlavor: 'Test Combatant rolls for Initiative!',
        });
      });

      test('should roll initiative for player when autoRollPlayerInitiative is enabled', async () => {
        // Arrange
        const playerCombatant = {
          ...mockCombatant,
          actor: {
            hasPlayerOwner: true,
            name: 'Player Actor',
          },
        };

        mockGame.settings.get.mockImplementation((system, key) => {
          if (key === 'autoRollPlayerInitiative') return true;
          return false;
        });

        // Act
        await createCombatantCallback(playerCombatant, {}, 'user-123');

        // Assert
        expect(mockErpsRollHandler.rollInitiative).toHaveBeenCalledWith({
          combatant: playerCombatant,
          npc: false,
          whisperMode: false,
          customFlavor: 'Test Combatant rolls for Initiative!',
        });
      });

      test('should not roll initiative for NPC when autoRollNpcInitiative is disabled', async () => {
        // Arrange
        mockGame.settings.get.mockImplementation((system, key) => {
          if (key === 'autoRollNpcInitiative') return false;
          return false;
        });

        // Act
        await createCombatantCallback(mockCombatant, {}, 'user-123');

        // Assert
        expect(mockErpsRollHandler.rollInitiative).not.toHaveBeenCalled();
      });

      test('should not roll initiative for player when autoRollPlayerInitiative is disabled', async () => {
        // Arrange
        const playerCombatant = {
          ...mockCombatant,
          actor: {
            hasPlayerOwner: true,
            name: 'Player Actor',
          },
        };

        mockGame.settings.get.mockImplementation((system, key) => {
          if (key === 'autoRollPlayerInitiative') return false;
          return false;
        });

        // Act
        await createCombatantCallback(playerCombatant, {}, 'user-123');

        // Assert
        expect(mockErpsRollHandler.rollInitiative).not.toHaveBeenCalled();
      });

      test('should not process combatant created by different user', async () => {
        // Arrange
        mockGame.settings.get.mockImplementation((system, key) => {
          if (key === 'autoRollNpcInitiative') return true;
          return false;
        });

        // Act
        await createCombatantCallback(mockCombatant, {}, 'other-user-456');

        // Assert
        expect(mockErpsRollHandler.rollInitiative).not.toHaveBeenCalled();
      });

      test('should log error when initiative roll fails', async () => {
        // Arrange
        mockGame.settings.get.mockImplementation((system, key) => {
          if (key === 'autoRollNpcInitiative') return true;
          return false;
        });

        mockErpsRollHandler.rollInitiative.mockRejectedValue(
          new Error('Roll failed'),
        );

        // Act
        await createCombatantCallback(mockCombatant, {}, 'user-123');

        // Assert
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error rolling initiative for NPC',
          expect.any(Error),
          'COMBAT_HOOKS',
        );
        expect(mockCombatant.parent.rollInitiative).toHaveBeenCalledWith(
          mockCombatant.id,
        );
      });

      test('should use combatant name when available', async () => {
        // Arrange
        const namedCombatant = {
          ...mockCombatant,
          name: 'Goblin Warrior',
          actor: {
            hasPlayerOwner: false,
            name: 'Goblin',
          },
        };

        mockGame.settings.get.mockImplementation((system, key) => {
          if (key === 'autoRollNpcInitiative') return true;
          return false;
        });

        // Act
        await createCombatantCallback(namedCombatant, {}, 'user-123');

        // Assert
        expect(mockErpsRollHandler.rollInitiative).toHaveBeenCalledWith({
          combatant: namedCombatant,
          npc: true,
          whisperMode: false,
          customFlavor: 'Goblin Warrior rolls for Initiative!',
        });
      });

      test('should use actor name when combatant name is not available', async () => {
        // Arrange
        const unnamedCombatant = {
          ...mockCombatant,
          name: null,
          actor: {
            hasPlayerOwner: false,
            name: 'Goblin',
          },
        };

        mockGame.settings.get.mockImplementation((system, key) => {
          if (key === 'autoRollNpcInitiative') return true;
          return false;
        });

        // Act
        await createCombatantCallback(unnamedCombatant, {}, 'user-123');

        // Assert
        expect(mockErpsRollHandler.rollInitiative).toHaveBeenCalledWith({
          combatant: unnamedCombatant,
          npc: true,
          whisperMode: false,
          customFlavor: 'Goblin rolls for Initiative!',
        });
      });
    });

    describe('createCombat hook', () => {
      let createCombatCallback;

      beforeEach(async () => {
        await initializeCombatHooks();
        const hookCall = mockHooks.on.mock.calls.find(
          (call) => call[0] === 'createCombat',
        );
        createCombatCallback = hookCall[1];
      });

      test('should set round duration from settings', async () => {
        // Arrange
        mockGame.settings.get.mockReturnValue(60);

        // Act
        createCombatCallback(mockCombat);

        // Assert
        expect(mockCombat.update).toHaveBeenCalledWith({ roundTime: 60 });
      });

      test('should not set round duration when game.settings is not available', async () => {
        // Arrange
        mockGame.settings = null;

        // Act
        createCombatCallback(mockCombat);

        // Assert
        expect(mockCombat.update).not.toHaveBeenCalled();
      });

      test('should not set round duration when game.settings.get is not available', async () => {
        // Arrange
        mockGame.settings = {};

        // Act
        createCombatCallback(mockCombat);

        // Assert
        expect(mockCombat.update).not.toHaveBeenCalled();
      });

      test('should log warning when getting round duration fails', async () => {
        // Arrange
        mockGame.settings.get.mockImplementation(() => {
          throw new Error('Settings error');
        });

        // Act
        createCombatCallback(mockCombat);

        // Assert
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Could not get combat round duration setting, using default',
          expect.any(Error),
          'COMBAT_HOOKS',
        );
      });

      test('should not update combat when round duration is null', async () => {
        // Arrange
        mockGame.settings.get.mockReturnValue(null);

        // Act
        createCombatCallback(mockCombat);

        // Assert
        expect(mockCombat.update).not.toHaveBeenCalled();
      });
    });

    describe('Combat.rollInitiative override', () => {
      beforeEach(async () => {
        await initializeCombatHooks();
      });

      test('should roll initiative for single combatant', async () => {
        // Arrange
        const combat = new Combat();
        const combatant = new Combatant();
        mockCombat.combatants.get.mockReturnValue(combatant);

        mockGame.settings.get.mockReturnValue(false);

        // Act
        await combat.rollInitiative('combatant-1');

        // Assert
        expect(mockErpsRollHandler.rollInitiative).toHaveBeenCalledWith({
          combatant,
          npc: true,
          whisperMode: false,
          customFlavor: 'Test Combatant rolls for Initiative!',
        });
      });

      test('should roll initiative for multiple combatants', async () => {
        // Arrange
        const combat = new Combat();
        const combatant1 = new Combatant();
        const combatant2 = {
          ...combatant1,
          id: 'combatant-2',
          name: 'Combatant 2',
        };

        mockCombat.combatants.get.mockImplementation((id) => {
          if (id === 'combatant-1') return combatant1;
          if (id === 'combatant-2') return combatant2;
          return null;
        });

        mockGame.settings.get.mockReturnValue(false);

        // Act
        await combat.rollInitiative(['combatant-1', 'combatant-2']);

        // Assert
        expect(mockErpsRollHandler.rollInitiative).toHaveBeenCalledTimes(2);
      });

      test('should whisper NPC initiative when hideNpcInitiativeRolls is enabled', async () => {
        // Arrange
        const combat = new Combat();
        const combatant = new Combatant();
        mockCombat.combatants.get.mockReturnValue(combatant);

        mockGame.settings.get.mockReturnValue(true);

        // Act
        await combat.rollInitiative('combatant-1');

        // Assert
        expect(mockErpsRollHandler.rollInitiative).toHaveBeenCalledWith({
          combatant,
          npc: true,
          whisperMode: true,
          customFlavor: 'Test Combatant rolls for Initiative!',
        });
      });

      test('should respect rollMode gmroll option', async () => {
        // Arrange
        const combat = new Combat();
        const combatant = new Combatant();
        mockCombat.combatants.get.mockReturnValue(combatant);

        mockGame.settings.get.mockReturnValue(false);

        // Act
        await combat.rollInitiative('combatant-1', {
          messageOptions: { rollMode: 'gmroll' },
        });

        // Assert
        expect(mockErpsRollHandler.rollInitiative).toHaveBeenCalledWith({
          combatant,
          npc: true,
          whisperMode: true,
          customFlavor: 'Test Combatant rolls for Initiative!',
        });
      });

      test('should respect rollMode blindroll option', async () => {
        // Arrange
        const combat = new Combat();
        const combatant = new Combatant();
        mockCombat.combatants.get.mockReturnValue(combatant);

        mockGame.settings.get.mockReturnValue(false);

        // Act
        await combat.rollInitiative('combatant-1', {
          messageOptions: { rollMode: 'blindroll' },
        });

        // Assert
        expect(mockErpsRollHandler.rollInitiative).toHaveBeenCalledWith({
          combatant,
          npc: true,
          whisperMode: true,
          customFlavor: 'Test Combatant rolls for Initiative!',
        });
      });

      test('should use custom flavor from messageOptions', async () => {
        // Arrange
        const combat = new Combat();
        const combatant = new Combatant();
        mockCombat.combatants.get.mockReturnValue(combatant);

        mockGame.settings.get.mockReturnValue(false);

        // Act
        await combat.rollInitiative('combatant-1', {
          messageOptions: { flavor: 'Custom initiative flavor' },
        });

        // Assert
        expect(mockErpsRollHandler.rollInitiative).toHaveBeenCalledWith({
          combatant,
          npc: true,
          whisperMode: false,
          customFlavor: 'Custom initiative flavor',
        });
      });

      test('should skip combatants without owner permission', async () => {
        // Arrange
        const combat = new Combat();
        const combatant = new Combatant();
        combatant.isOwner = false;
        mockCombat.combatants.get.mockReturnValue(combatant);

        mockGame.settings.get.mockReturnValue(false);

        // Act
        await combat.rollInitiative('combatant-1');

        // Assert
        expect(mockErpsRollHandler.rollInitiative).not.toHaveBeenCalled();
      });

      test('should skip non-existent combatants', async () => {
        // Arrange
        const combat = new Combat();
        mockCombat.combatants.get.mockReturnValue(null);

        mockGame.settings.get.mockReturnValue(false);

        // Act
        await combat.rollInitiative('non-existent');

        // Assert
        expect(mockErpsRollHandler.rollInitiative).not.toHaveBeenCalled();
      });

      test('should return combat instance', async () => {
        // Arrange
        const combat = new Combat();
        const combatant = new Combatant();
        mockCombat.combatants.get.mockReturnValue(combatant);

        mockGame.settings.get.mockReturnValue(false);

        // Act
        const result = await combat.rollInitiative('combatant-1');

        // Assert
        expect(result).toBe(combat);
      });

      test('should handle empty ids array', async () => {
        // Arrange
        const combat = new Combat();

        // Act
        const result = await combat.rollInitiative([]);

        // Assert
        expect(result).toBe(combat);
        expect(mockErpsRollHandler.rollInitiative).not.toHaveBeenCalled();
      });

      test('should convert string id to array', async () => {
        // Arrange
        const combat = new Combat();
        const combatant = new Combatant();
        mockCombat.combatants.get.mockReturnValue(combatant);

        mockGame.settings.get.mockReturnValue(false);

        // Act
        await combat.rollInitiative('combatant-1');

        // Assert
        expect(mockErpsRollHandler.rollInitiative).toHaveBeenCalled();
      });

      test('should log warning when getting hideNpcInitiativeRolls fails', async () => {
        // Arrange
        const combat = new Combat();
        const combatant = new Combatant();
        mockCombat.combatants.get.mockReturnValue(combatant);

        mockGame.settings.get.mockImplementation(() => {
          throw new Error('Settings error');
        });

        // Act
        await combat.rollInitiative('combatant-1');

        // Assert
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Could not get hideNpcInitiativeRolls setting, using default',
          expect.any(Error),
          'COMBAT_HOOKS',
        );
      });
    });

    describe('Combatant.rollInitiative override', () => {
      beforeEach(async () => {
        await initializeCombatHooks();
      });

      test('should roll initiative for combatant', async () => {
        // Arrange
        const combatant = new Combatant();
        mockGame.settings.get.mockReturnValue(false);

        // Act
        await combatant.rollInitiative();

        // Assert
        expect(mockErpsRollHandler.rollInitiative).toHaveBeenCalledWith({
          combatant,
          npc: true,
          whisperMode: false,
          customFlavor: 'Test Combatant rolls for Initiative!',
        });
      });

      test('should whisper NPC initiative when hideNpcInitiativeRolls is enabled', async () => {
        // Arrange
        const combatant = new Combatant();
        mockGame.settings.get.mockReturnValue(true);

        // Act
        await combatant.rollInitiative();

        // Assert
        expect(mockErpsRollHandler.rollInitiative).toHaveBeenCalledWith({
          combatant,
          npc: true,
          whisperMode: true,
          customFlavor: 'Test Combatant rolls for Initiative!',
        });
      });

      test('should respect rollMode gmroll option', async () => {
        // Arrange
        const combatant = new Combatant();
        mockGame.settings.get.mockReturnValue(false);

        // Act
        await combatant.rollInitiative({ messageOptions: { rollMode: 'gmroll' } });

        // Assert
        expect(mockErpsRollHandler.rollInitiative).toHaveBeenCalledWith({
          combatant,
          npc: true,
          whisperMode: true,
          customFlavor: 'Test Combatant rolls for Initiative!',
        });
      });

      test('should use custom flavor from messageOptions', async () => {
        // Arrange
        const combatant = new Combatant();
        mockGame.settings.get.mockReturnValue(false);

        // Act
        await combatant.rollInitiative({
          messageOptions: { flavor: 'Custom flavor' },
        });

        // Assert
        expect(mockErpsRollHandler.rollInitiative).toHaveBeenCalledWith({
          combatant,
          npc: true,
          whisperMode: false,
          customFlavor: 'Custom flavor',
        });
      });

      test('should log warning when getting hideNpcInitiativeRolls fails', async () => {
        // Arrange
        const combatant = new Combatant();
        mockGame.settings.get.mockImplementation(() => {
          throw new Error('Settings error');
        });

        // Act
        await combatant.rollInitiative();

        // Assert
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Could not get hideNpcInitiativeRolls setting, using default',
          expect.any(Error),
          'COMBAT_HOOKS',
        );
      });
    });
  });
});
