// @ts-nocheck
/**
 * @fileoverview ERPSRollHandler Service Tests
 *
 * Unit tests for the roll-dice service which handles dice rolling
 * operations for the Eventide RP System.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

import { erpsRollHandler, handleRoll, rollInitiative } from '../../../../module/services/managers/roll-dice.mjs';

// Mock dependencies
vi.mock('../../../../module/services/_module.mjs', () => ({
  getSetting: vi.fn(),
  Logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../../../../module/utils/_module.mjs', () => ({
  ERPSRollUtilities: {
    determineCriticalStates: vi.fn(() => ({
      critHit: false,
      critMiss: false,
      savedMiss: false,
      stolenCrit: false
    }))
  }
}));

vi.mock('../../../../module/services/chat-message-builder.mjs', () => ({
  ChatMessageBuilder: {
    buildMessageData: vi.fn(() => Promise.resolve({}))
  }
}));

// Import mocked modules
import { getSetting, Logger } from '../../../../module/services/_module.mjs';
import { ERPSRollUtilities } from '../../../../module/utils/_module.mjs';

describe('ERPSRollHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with default templates', () => {
      expect(erpsRollHandler.templates).toBeDefined();
      expect(erpsRollHandler.templates.standard).toBe('systems/eventide-rp-system/templates/chat/roll-message.hbs');
      expect(erpsRollHandler.templates.initiative).toBe('systems/eventide-rp-system/templates/chat/initiative-roll.hbs');
    });

    test('should initialize with default options', () => {
      expect(erpsRollHandler.defaults).toBeDefined();
      expect(erpsRollHandler.defaults.formula).toBe('1');
      expect(erpsRollHandler.defaults.label).toBe('unknown roll');
      expect(erpsRollHandler.defaults.type).toBe('unknown');
      expect(erpsRollHandler.defaults.critAllowed).toBe(true);
      expect(erpsRollHandler.defaults.acCheck).toBe(true);
      expect(erpsRollHandler.defaults.toMessage).toBe(true);
    });

    test('should initialize with roll type styles', () => {
      expect(erpsRollHandler.rollTypeStyles).toBeDefined();
      expect(erpsRollHandler.rollTypeStyles.acro).toEqual(['chat-card__header--acrobatics', 'fa-solid fa-feather-pointed']);
      expect(erpsRollHandler.rollTypeStyles.phys).toEqual(['chat-card__header--physical', 'fa-solid fa-dragon']);
      expect(erpsRollHandler.rollTypeStyles.fort).toEqual(['chat-card__header--fortitude', 'fa-solid fa-shield']);
      expect(erpsRollHandler.rollTypeStyles.will).toEqual(['chat-card__header--will', 'fa-solid fa-fire-flame-curved']);
      expect(erpsRollHandler.rollTypeStyles.wits).toEqual(['chat-card__header--wits', 'fa-solid fa-chess']);
      expect(erpsRollHandler.rollTypeStyles.gear).toEqual(['chat-card__header--gear', 'fa-solid fa-toolbox']);
      expect(erpsRollHandler.rollTypeStyles.damage).toEqual(['chat-card__header--damage', 'fa-sharp-duotone fa-light fa-claw-marks']);
      expect(erpsRollHandler.rollTypeStyles.heal).toEqual(['chat-card__header--heal', 'fa-regular fa-wave-pulse']);
      expect(erpsRollHandler.rollTypeStyles.initiative).toEqual(['chat-card__header--initiative', 'fa-solid fa-hourglass-start']);
      expect(erpsRollHandler.rollTypeStyles.default).toEqual(['chat-card__header--unknown', 'fa-solid fa-question']);
    });
  });

  describe('_getCardStyling', () => {
    test('should return correct styling for acro type', () => {
      const result = erpsRollHandler._getCardStyling('acro');
      expect(result).toEqual(['chat-card__header--acrobatics', 'fa-solid fa-feather-pointed']);
    });

    test('should return correct styling for phys type', () => {
      const result = erpsRollHandler._getCardStyling('phys');
      expect(result).toEqual(['chat-card__header--physical', 'fa-solid fa-dragon']);
    });

    test('should return correct styling for fort type', () => {
      const result = erpsRollHandler._getCardStyling('fort');
      expect(result).toEqual(['chat-card__header--fortitude', 'fa-solid fa-shield']);
    });

    test('should return correct styling for will type', () => {
      const result = erpsRollHandler._getCardStyling('will');
      expect(result).toEqual(['chat-card__header--will', 'fa-solid fa-fire-flame-curved']);
    });

    test('should return correct styling for wits type', () => {
      const result = erpsRollHandler._getCardStyling('wits');
      expect(result).toEqual(['chat-card__header--wits', 'fa-solid fa-chess']);
    });

    test('should return correct styling for gear type', () => {
      const result = erpsRollHandler._getCardStyling('gear');
      expect(result).toEqual(['chat-card__header--gear', 'fa-solid fa-toolbox']);
    });

    test('should return correct styling for damage type', () => {
      const result = erpsRollHandler._getCardStyling('damage');
      expect(result).toEqual(['chat-card__header--damage', 'fa-sharp-duotone fa-light fa-claw-marks']);
    });

    test('should return correct styling for heal type', () => {
      const result = erpsRollHandler._getCardStyling('heal');
      expect(result).toEqual(['chat-card__header--heal', 'fa-regular fa-wave-pulse']);
    });

    test('should return correct styling for initiative type', () => {
      const result = erpsRollHandler._getCardStyling('initiative');
      expect(result).toEqual(['chat-card__header--initiative', 'fa-solid fa-hourglass-start']);
    });

    test('should return default styling for unknown type', () => {
      const result = erpsRollHandler._getCardStyling('unknown');
      expect(result).toEqual(['chat-card__header--unknown', 'fa-solid fa-question']);
    });

    test('should handle case-insensitive type matching', () => {
      const result = erpsRollHandler._getCardStyling('ACRO');
      expect(result).toEqual(['chat-card__header--acrobatics', 'fa-solid fa-feather-pointed']);
    });

    test('should handle mixed case type matching', () => {
      const result = erpsRollHandler._getCardStyling('PhYs');
      expect(result).toEqual(['chat-card__header--physical', 'fa-solid fa-dragon']);
    });
  });

  describe('_getInitiativeSettings', () => {
    test('should return setting value when successful', () => {
      getSetting.mockReturnValue(true);
      const result = erpsRollHandler._getInitiativeSettings();
      expect(getSetting).toHaveBeenCalledWith('hideNpcInitiativeRolls');
      expect(result).toBe(true);
    });

    test('should return false when setting is false', () => {
      getSetting.mockReturnValue(false);
      const result = erpsRollHandler._getInitiativeSettings();
      expect(result).toBe(false);
    });

    test('should return false and log warning on error', () => {
      const error = new Error('Setting not found');
      getSetting.mockImplementation(() => {
        throw error;
      });
      const result = erpsRollHandler._getInitiativeSettings();
      expect(Logger.warn).toHaveBeenCalledWith(
        'Error getting hideNpcInitiativeRolls setting',
        error,
        'ROLL_DICE'
      );
      expect(result).toBe(false);
    });
  });

  describe('_createInitiativeRoll', () => {
    test('should create and evaluate roll with combatant actor data', async () => {
      const mockActor = {
        getRollData: vi.fn(() => ({ abilities: { acro: 3 } }))
      };
      const mockCombatant = {
        actor: mockActor
      };

      // Mock CONFIG.Combat.initiative.formula
      global.CONFIG.Combat = { initiative: { formula: '1d20 + @abilities.acro' } };

      const roll = await erpsRollHandler._createInitiativeRoll(mockCombatant);
      
      expect(roll).toBeDefined();
      expect(mockActor.getRollData).toHaveBeenCalled();
    });

    test('should handle combatant without actor', async () => {
      const mockCombatant = {
        actor: null
      };

      global.CONFIG.Combat = { initiative: { formula: '1d20' } };

      const roll = await erpsRollHandler._createInitiativeRoll(mockCombatant);
      
      expect(roll).toBeDefined();
    });
  });

  describe('_updateCombatantInitiative', () => {
    test('should update combatant initiative value', async () => {
      const mockCombatant = {
        id: 'combatant-1',
        parent: {
          updateEmbeddedDocuments: vi.fn(() => Promise.resolve())
        }
      };
      const mockRoll = { total: 15.5 };

      await erpsRollHandler._updateCombatantInitiative(mockCombatant, mockRoll);

      expect(mockCombatant.parent.updateEmbeddedDocuments).toHaveBeenCalledWith('Combatant', [
        { _id: 'combatant-1', initiative: 15.5 }
      ]);
    });
  });

  describe('_determineCriticalStates', () => {
    test('should call ERPSRollUtilities.determineCriticalStates with correct parameters', () => {
      const mockActor = {
        getRollData: vi.fn(() => ({ hiddenAbilities: { dice: 3 } }))
      };
      const mockResult = { total: 20 };
      const formula = '1d20';

      ERPSRollUtilities.determineCriticalStates.mockReturnValue({
        critHit: true,
        critMiss: false,
        savedMiss: false,
        stolenCrit: false
      });

      const result = erpsRollHandler._determineCriticalStates(mockResult, mockActor, formula, true);

      expect(ERPSRollUtilities.determineCriticalStates).toHaveBeenCalledWith({
        roll: mockResult,
        thresholds: { dice: 3 },
        formula,
        critAllowed: true
      });
      expect(result.critHit).toBe(true);
      expect(result.critMiss).toBe(false);
    });

    test('should handle critAllowed false', () => {
      const mockActor = {
        getRollData: vi.fn(() => ({ hiddenAbilities: {} }))
      };
      const mockResult = { total: 1 };
      const formula = '1d20';

      ERPSRollUtilities.determineCriticalStates.mockReturnValue({
        critHit: false,
        critMiss: false,
        savedMiss: false,
        stolenCrit: false
      });

      erpsRollHandler._determineCriticalStates(mockResult, mockActor, formula, false);

      expect(ERPSRollUtilities.determineCriticalStates).toHaveBeenCalledWith({
        roll: mockResult,
        thresholds: {},
        formula,
        critAllowed: false
      });
    });
  });

  describe('_prepareRollTemplateData', () => {
    test('should prepare template data with all required fields', () => {
      const mockActor = {
        name: 'Test Actor',
        getRollData: vi.fn(() => ({ abilities: { acro: 3 } }))
      };
      const mockRoll = { total: 15 };
      const criticalStates = {
        critHit: false,
        critMiss: false,
        savedMiss: false,
        stolenCrit: false
      };

      const result = erpsRollHandler._prepareRollTemplateData({
        actor: mockActor,
        roll: mockRoll,
        formula: '1d20+3',
        label: 'Acrobatics Check',
        description: 'Jumping over a pit',
        type: 'acro',
        className: 'custom-class',
        critAllowed: true,
        addCheck: false,
        targetArray: [],
        targetRollData: [],
        criticalStates,
        img: null,
        bgColor: null,
        textColor: null
      });

      expect(result.rollData).toEqual({ abilities: { acro: 3 } });
      expect(result.roll).toBe(mockRoll);
      expect(result.result).toBe(mockRoll);
      expect(result.label).toBe('Acrobatics Check');
      expect(result.description).toBe('Jumping over a pit');
      expect(result.pickedCardClass).toBe('chat-card__header--acrobatics');
      expect(result.pickedIcon).toBe('fa-solid fa-feather-pointed');
      expect(result.pickedType).toBe('acro');
      expect(result.className).toBe('custom-class');
      expect(result.critAllowed).toBe(true);
      expect(result.hasRoll).toBe(true);
      expect(result.acCheck).toBe(false);
      expect(result.targetArray).toEqual([]);
      expect(result.targetRollData).toEqual([]);
      expect(result.critHit).toBe(false);
      expect(result.critMiss).toBe(false);
      expect(result.savedMiss).toBe(false);
      expect(result.stolenCrit).toBe(false);
      expect(result.name).toBe('Test Actor');
      expect(result.total).toBe(15);
      expect(result.formula).toBe('1d20+3');
      expect(result.item).toBeNull();
      expect(result.bgColor).toBeNull();
      expect(result.textColor).toBeNull();
    });

    test('should include item data when img is provided', () => {
      const mockActor = {
        name: 'Test Actor',
        getRollData: vi.fn(() => ({}))
      };
      const mockRoll = { total: 10 };
      const criticalStates = {
        critHit: false,
        critMiss: false,
        savedMiss: false,
        stolenCrit: false
      };

      const result = erpsRollHandler._prepareRollTemplateData({
        actor: mockActor,
        roll: mockRoll,
        formula: '1d20',
        label: 'Attack',
        description: '',
        type: 'phys',
        className: '',
        critAllowed: true,
        addCheck: false,
        targetArray: [],
        targetRollData: [],
        criticalStates,
        img: 'path/to/image.png',
        bgColor: '#ff0000',
        textColor: '#ffffff'
      });

      expect(result.item).toEqual({ img: 'path/to/image.png', name: 'Attack' });
      expect(result.bgColor).toBe('#ff0000');
      expect(result.textColor).toBe('#ffffff');
    });

    test('should handle critical states correctly', () => {
      const mockActor = {
        name: 'Test Actor',
        getRollData: vi.fn(() => ({}))
      };
      const mockRoll = { total: 20 };
      const criticalStates = {
        critHit: true,
        critMiss: false,
        savedMiss: false,
        stolenCrit: true
      };

      const result = erpsRollHandler._prepareRollTemplateData({
        actor: mockActor,
        roll: mockRoll,
        formula: '1d20',
        label: 'Critical Test',
        description: '',
        type: 'phys',
        className: '',
        critAllowed: true,
        addCheck: false,
        targetArray: [],
        targetRollData: [],
        criticalStates,
        img: null,
        bgColor: null,
        textColor: null
      });

      expect(result.critHit).toBe(true);
      expect(result.critMiss).toBe(false);
      expect(result.savedMiss).toBe(false);
      expect(result.stolenCrit).toBe(true);
    });
  });

  describe('handleRoll exported function', () => {
    test('should be a function', () => {
      expect(typeof handleRoll).toBe('function');
    });

    test('should call erpsRollHandler.handleRoll', () => {
      const mockHandleRoll = vi.spyOn(erpsRollHandler, 'handleRoll').mockResolvedValue({});
      const options = { formula: '1d20' };
      const actor = global.testUtils.createMockActor();

      handleRoll(options, actor);

      expect(mockHandleRoll).toHaveBeenCalledWith(options, actor);
    });
  });

  describe('rollInitiative exported function', () => {
    test('should be a function', () => {
      expect(typeof rollInitiative).toBe('function');
    });

    test('should call erpsRollHandler.rollInitiative', () => {
      const mockRollInitiative = vi.spyOn(erpsRollHandler, 'rollInitiative').mockResolvedValue({});
      const options = { combatant: { id: 'test' } };

      rollInitiative(options);

      expect(mockRollInitiative).toHaveBeenCalledWith(options);
    });
  });
});
