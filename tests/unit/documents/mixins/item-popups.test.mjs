// @ts-nocheck
/**
 * @fileoverview Tests for ItemPopupsMixin - Popup and UI interaction functionality
 *
 * Tests popup configuration, validation, and roll-related methods for items.
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

const mockErrorHandler = {
  handleAsync: vi.fn(async (promise, _options) => {
    try {
      const result = await promise;
      return [result, null];
    } catch (error) {
      return [null, error];
    }
  }),
  ERROR_TYPES: {
    UI: 'ui',
    VALIDATION: 'validation',
    DATA: 'data'
  }
};

// Mock the module imports - must match the actual import paths in the source
vi.mock('../../../../module/services/logger.mjs', () => ({
  Logger: mockLogger
}));

vi.mock('../../../../module/utils/error-handler.mjs', () => ({
  ErrorHandler: mockErrorHandler
}));

// Mock foundry.utils
const mockRandomID = vi.fn(() => 'random-id-123');

// Setup global foundry before importing
global.foundry = {
  utils: {
    randomID: mockRandomID
  }
};

// Mock game
global.game = {
  i18n: {
    format: vi.fn((key, data) => `${key} ${JSON.stringify(data || {})}`)
  }
};

// Mock ui
global.ui = {
  notifications: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
};

// Mock erps global
global.erps = {
  messages: {
    createCombatPowerMessage: vi.fn().mockResolvedValue({ success: true }),
    createFeatureMessage: vi.fn().mockResolvedValue({ success: true }),
    createStatusMessage: vi.fn().mockResolvedValue({ success: true })
  }
};

// Import the mixin after mocking dependencies
const { ItemPopupsMixin } = await import('../../../../module/documents/mixins/item-popups.mjs');

// Create a test class that uses the mixin
class TestItemClass {
  constructor(options = {}) {
    // Use 'actionCard' as default only when type is not explicitly provided
    if (Object.prototype.hasOwnProperty.call(options, 'type')) {
      this.type = options.type;
    } else {
      this.type = 'actionCard';
    }
    this.name = Object.prototype.hasOwnProperty.call(options, 'name') ? options.name : 'Test Item';
    this.id = options.id || 'test-id';
    // Only set system if explicitly provided (including null/undefined)
    if (Object.prototype.hasOwnProperty.call(options, 'system')) {
      this.system = options.system;
    } else {
      this.system = {};
    }
    this.actor = options.actor || null;
    this.formula = null;
    this.update = vi.fn().mockResolvedValue(this);
  }

  // Optional methods that may be overridden in tests
  canRoll() {
    return false;
  }

  getCombatRollFormula() {
    return '1d20 + 5';
  }
}

const MixedClass = ItemPopupsMixin(TestItemClass);

describe('ItemPopupsMixin', () => {
  let item;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create fresh item instance
    item = new MixedClass();
  });

  describe('_getPopupConfig()', () => {
    test('should return correct config for actionCard type', () => {
      item = new MixedClass({ type: 'actionCard' });
      const config = item._getPopupConfig();
      
      expect(config).toEqual({
        type: 'actionCard',
        className: 'ActionCardPopup',
        requiresFormula: false
      });
    });

    test('should return correct config for combatPower type', () => {
      item = new MixedClass({ type: 'combatPower' });
      const config = item._getPopupConfig();
      
      expect(config).toEqual({
        type: 'combatPower',
        className: 'CombatPowerPopup',
        requiresFormula: true
      });
    });

    test('should return correct config for gear type', () => {
      item = new MixedClass({ type: 'gear' });
      const config = item._getPopupConfig();
      
      expect(config).toEqual({
        type: 'gear',
        className: 'GearPopup',
        requiresFormula: true
      });
    });

    test('should return correct config for status type', () => {
      item = new MixedClass({ type: 'status' });
      const config = item._getPopupConfig();
      
      expect(config).toEqual({
        type: 'status',
        className: 'StatusPopup',
        requiresFormula: false
      });
    });

    test('should return correct config for feature type', () => {
      item = new MixedClass({ type: 'feature' });
      const config = item._getPopupConfig();
      
      expect(config).toEqual({
        type: 'feature',
        className: 'FeaturePopup',
        requiresFormula: false // canRoll() returns false by default
      });
    });

    test('should return requiresFormula true for feature when canRoll returns true', () => {
      item = new MixedClass({ type: 'feature' });
      item.canRoll = () => true;
      const config = item._getPopupConfig();
      
      expect(config).toEqual({
        type: 'feature',
        className: 'FeaturePopup',
        requiresFormula: true
      });
    });

    test('should return null for unsupported item type', () => {
      item = new MixedClass({ type: 'unsupported' });
      const config = item._getPopupConfig();
      
      expect(config).toBeNull();
    });

    test('should return null for undefined type', () => {
      item = new MixedClass({ type: undefined });
      const config = item._getPopupConfig();
      
      expect(config).toBeNull();
    });
  });

  describe('hasPopupSupport()', () => {
    test('should return true for actionCard type', () => {
      item = new MixedClass({ type: 'actionCard' });
      expect(item.hasPopupSupport()).toBe(true);
    });

    test('should return true for combatPower type', () => {
      item = new MixedClass({ type: 'combatPower' });
      expect(item.hasPopupSupport()).toBe(true);
    });

    test('should return true for gear type', () => {
      item = new MixedClass({ type: 'gear' });
      expect(item.hasPopupSupport()).toBe(true);
    });

    test('should return true for status type', () => {
      item = new MixedClass({ type: 'status' });
      expect(item.hasPopupSupport()).toBe(true);
    });

    test('should return true for feature type', () => {
      item = new MixedClass({ type: 'feature' });
      expect(item.hasPopupSupport()).toBe(true);
    });

    test('should return false for unsupported type', () => {
      item = new MixedClass({ type: 'unknown' });
      expect(item.hasPopupSupport()).toBe(false);
    });

    test('should return false for undefined type', () => {
      item = new MixedClass({ type: undefined });
      expect(item.hasPopupSupport()).toBe(false);
    });
  });

  describe('getPopupType()', () => {
    test('should return popup type for supported item types', () => {
      item = new MixedClass({ type: 'combatPower' });
      expect(item.getPopupType()).toBe('combatPower');
    });

    test('should return popup type for actionCard', () => {
      item = new MixedClass({ type: 'actionCard' });
      expect(item.getPopupType()).toBe('actionCard');
    });

    test('should return popup type for gear', () => {
      item = new MixedClass({ type: 'gear' });
      expect(item.getPopupType()).toBe('gear');
    });

    test('should return popup type for status', () => {
      item = new MixedClass({ type: 'status' });
      expect(item.getPopupType()).toBe('status');
    });

    test('should return popup type for feature', () => {
      item = new MixedClass({ type: 'feature' });
      expect(item.getPopupType()).toBe('feature');
    });

    test('should return null for unsupported type', () => {
      item = new MixedClass({ type: 'unknown' });
      expect(item.getPopupType()).toBeNull();
    });
  });

  describe('validateForPopup()', () => {
    test('should return valid for supported item type with name and system', () => {
      item = new MixedClass({
        type: 'combatPower',
        name: 'Test Power',
        system: { cost: 1 }
      });
      // combatPower requires formula, so canRoll must return true
      item.canRoll = () => true;
      
      const validation = item.validateForPopup();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    test('should return invalid for unsupported item type', () => {
      item = new MixedClass({ 
        type: 'unknown', 
        name: 'Test Item',
        system: {}
      });
      
      const validation = item.validateForPopup();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Unsupported item type: unknown');
    });

    test('should return invalid when item missing name', () => {
      item = new MixedClass({ 
        type: 'combatPower', 
        name: null,
        system: {}
      });
      
      const validation = item.validateForPopup();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Item missing name');
    });

    test('should return invalid when item missing system data', () => {
      item = new MixedClass({ 
        type: 'combatPower', 
        name: 'Test Power'
      });
      // Explicitly set system to null
      item.system = null;
      
      const validation = item.validateForPopup();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Item missing system data');
    });

    test('should add warning when popup requires formula but item cannot roll', () => {
      item = new MixedClass({ 
        type: 'combatPower', 
        name: 'Test Power',
        system: {}
      });
      item.canRoll = () => false;
      item.popupRequiresFormula = () => true;
      
      const validation = item.validateForPopup();
      
      expect(validation.errors).toContain('Item requires roll capability but cannot roll');
    });

    test('should collect multiple errors', () => {
      item = new MixedClass({ 
        type: 'unknown', 
        name: null,
        system: null
      });
      
      const validation = item.validateForPopup();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('_getEligibilityErrorKey()', () => {
    test('should return correct error key for combatPower', () => {
      item = new MixedClass({ type: 'combatPower' });
      expect(item._getEligibilityErrorKey()).toBe('EVENTIDE_RP_SYSTEM.Errors.CombatPowerError');
    });

    test('should return correct error key for gear', () => {
      item = new MixedClass({ type: 'gear' });
      expect(item._getEligibilityErrorKey()).toBe('EVENTIDE_RP_SYSTEM.Errors.GearError');
    });

    test('should return correct error key for feature', () => {
      item = new MixedClass({ type: 'feature' });
      expect(item._getEligibilityErrorKey()).toBe('EVENTIDE_RP_SYSTEM.Errors.FeatureError');
    });

    test('should return correct error key for status', () => {
      item = new MixedClass({ type: 'status' });
      expect(item._getEligibilityErrorKey()).toBe('EVENTIDE_RP_SYSTEM.Errors.StatusError');
    });

    test('should return correct error key for actionCard', () => {
      item = new MixedClass({ type: 'actionCard' });
      expect(item._getEligibilityErrorKey()).toBe('EVENTIDE_RP_SYSTEM.Errors.ActionCardError');
    });

    test('should return default error key for unknown type', () => {
      item = new MixedClass({ type: 'unknown' });
      expect(item._getEligibilityErrorKey()).toBe('EVENTIDE_RP_SYSTEM.Errors.ItemError');
    });
  });

  describe('_prepareItemForPopup()', () => {
    test('should set formula when popup requires formula', async () => {
      item = new MixedClass({ type: 'combatPower' });
      item.getCombatRollFormula = () => '2d6 + 3';
      
      const popupConfig = { requiresFormula: true };
      await item._prepareItemForPopup(popupConfig);
      
      expect(item.formula).toBe('2d6 + 3');
    });

    test('should not set formula when popup does not require formula', async () => {
      item = new MixedClass({ type: 'status' });
      
      const popupConfig = { requiresFormula: false };
      await item._prepareItemForPopup(popupConfig);
      
      expect(item.formula).toBeNull();
    });

    test('should set formula to "0" when getCombatRollFormula throws error', async () => {
      item = new MixedClass({ type: 'combatPower' });
      item.getCombatRollFormula = () => {
        throw new Error('Formula error');
      };
      
      const popupConfig = { requiresFormula: true };
      await item._prepareItemForPopup(popupConfig);
      
      expect(item.formula).toBe('0');
    });

    test('should not set formula when getCombatRollFormula method does not exist', async () => {
      item = new MixedClass({ type: 'combatPower' });
      // Override the method on the instance to return undefined (simulating non-existence)
      Object.defineProperty(item, 'getCombatRollFormula', {
        value: undefined,
        configurable: true
      });
      
      const popupConfig = { requiresFormula: true };
      await item._prepareItemForPopup(popupConfig);
      
      // Formula should remain null since getCombatRollFormula doesn't exist
      expect(item.formula).toBeNull();
    });
  });

  describe('popupRequiresFormula()', () => {
    test('should return true for combatPower', () => {
      item = new MixedClass({ type: 'combatPower' });
      expect(item.popupRequiresFormula()).toBe(true);
    });

    test('should return true for gear', () => {
      item = new MixedClass({ type: 'gear' });
      expect(item.popupRequiresFormula()).toBe(true);
    });

    test('should return false for actionCard', () => {
      item = new MixedClass({ type: 'actionCard' });
      expect(item.popupRequiresFormula()).toBe(false);
    });

    test('should return false for status', () => {
      item = new MixedClass({ type: 'status' });
      expect(item.popupRequiresFormula()).toBe(false);
    });

    test('should return false for feature when cannot roll', () => {
      item = new MixedClass({ type: 'feature' });
      item.canRoll = () => false;
      expect(item.popupRequiresFormula()).toBe(false);
    });

    test('should return true for feature when can roll', () => {
      item = new MixedClass({ type: 'feature' });
      item.canRoll = () => true;
      expect(item.popupRequiresFormula()).toBe(true);
    });

    test('should return false for unsupported type', () => {
      item = new MixedClass({ type: 'unknown' });
      expect(item.popupRequiresFormula()).toBe(false);
    });
  });

  describe('roll()', () => {
    test('should return null when item has no type', async () => {
      item = new MixedClass({ type: undefined });
      const result = await item.roll();
      
      expect(result).toBeNull();
    });

    test('should return null when popup config is not found', async () => {
      item = new MixedClass({ type: 'unknown' });
      const result = await item.roll();
      
      expect(result).toBeNull();
    });

    test('should call handleBypass when bypass is true and handleBypass exists', async () => {
      item = new MixedClass({ type: 'combatPower' });
      item.handleBypass = vi.fn().mockResolvedValue({ success: true });
      
      await item.roll({ bypass: true });
      
      expect(item.handleBypass).toHaveBeenCalled();
    });
  });

  describe('roll() - popup creation flow', () => {
    test('should create and render popup when bypass is false', async () => {
      item = new MixedClass({ type: 'combatPower', name: 'Test Power', system: { cost: 1 } });
      item.canRoll = () => true;
      
      // Mock _createAndRenderPopup to return a mock application
      item._createAndRenderPopup = vi.fn().mockResolvedValue({ id: 'app-123', render: vi.fn() });
      item._prepareItemForPopup = vi.fn().mockResolvedValue(undefined);
      
      const result = await item.roll({});
      
      expect(item._prepareItemForPopup).toHaveBeenCalled();
      expect(item._createAndRenderPopup).toHaveBeenCalled();
      expect(result).toEqual({ id: 'app-123', render: expect.any(Function) });
    });

    test('should handle event parameter correctly', async () => {
      item = new MixedClass({ type: 'combatPower', name: 'Test Power', system: { cost: 1 } });
      item.canRoll = () => true;
      item._createAndRenderPopup = vi.fn().mockResolvedValue({ id: 'app-456' });
      item._prepareItemForPopup = vi.fn().mockResolvedValue(undefined);
      
      // Pass an event-like object
      const mockEvent = { type: 'click', target: {} };
      const result = await item.roll(mockEvent);
      
      expect(item._prepareItemForPopup).toHaveBeenCalled();
      expect(result).toEqual({ id: 'app-456' });
    });

    test('should call _executePopupLogicDirectly when bypass is true and no handleBypass', async () => {
      item = new MixedClass({ type: 'combatPower', name: 'Test Power', system: { cost: 1 } });
      item.actor = { addPower: vi.fn() };
      
      // Mock _executePopupLogicDirectly
      item._executePopupLogicDirectly = vi.fn().mockResolvedValue({ success: true });
      
      const result = await item.roll({ bypass: true });
      
      expect(item._executePopupLogicDirectly).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    test('should handle errors in roll() and return null', async () => {
      item = new MixedClass({ type: 'combatPower', name: 'Test Power', system: { cost: 1 } });
      item._prepareItemForPopup = vi.fn().mockRejectedValue(new Error('Prepare failed'));
      
      const result = await item.roll({});
      
      expect(result).toBeNull();
      expect(mockErrorHandler.handleAsync).toHaveBeenCalled();
    });
  });

  describe('_createAndRenderPopup()', () => {
    test('should create and render popup successfully', async () => {
      item = new MixedClass({ type: 'combatPower', name: 'Test Power', system: { cost: 1 } });
      
      const mockPopupClass = vi.fn().mockImplementation(() => ({
        render: vi.fn().mockResolvedValue({ id: 'popup-123' })
      }));
      
      item._importPopupClass = vi.fn().mockResolvedValue(mockPopupClass);
      
      const popupConfig = { className: 'CombatPowerPopup', type: 'combatPower', requiresFormula: true };
      const result = await item._createAndRenderPopup(popupConfig);
      
      expect(item._importPopupClass).toHaveBeenCalledWith('CombatPowerPopup');
      expect(mockPopupClass).toHaveBeenCalledWith({ item });
      expect(result).toEqual({ id: 'popup-123' });
    });

    test('should throw error when popup class import fails', async () => {
      item = new MixedClass({ type: 'combatPower', name: 'Test Power', system: { cost: 1 } });
      item._importPopupClass = vi.fn().mockResolvedValue(null);
      
      const popupConfig = { className: 'CombatPowerPopup', type: 'combatPower', requiresFormula: true };
      
      await expect(item._createAndRenderPopup(popupConfig)).rejects.toThrow(
        'Failed to import popup class: CombatPowerPopup'
      );
    });
  });

  describe('_importPopupClass() - successful imports', () => {
    test('should import ActionCardPopup class', async () => {
      const mockPopupClass = class ActionCardPopup { };
      vi.mock('../../../../module/ui/_module.mjs', () => ({
        ActionCardPopup: mockPopupClass
      }));
      
      // Clear the module cache and reimport
      const result = await item._importPopupClass('ActionCardPopup');
      expect(result).toBeDefined();
    });

    test('should import CombatPowerPopup class', async () => {
      const result = await item._importPopupClass('CombatPowerPopup');
      expect(result).toBeDefined();
    });

    test('should import GearPopup class', async () => {
      const result = await item._importPopupClass('GearPopup');
      expect(result).toBeDefined();
    });

    test('should import StatusPopup class', async () => {
      const result = await item._importPopupClass('StatusPopup');
      expect(result).toBeDefined();
    });

    test('should import FeaturePopup class', async () => {
      const result = await item._importPopupClass('FeaturePopup');
      expect(result).toBeDefined();
    });

    test('should return null for unknown class name', async () => {
      const result = await item._importPopupClass('UnknownClass');
      expect(result).toBeNull();
    });
  });

  describe('_executePopupLogicDirectly()', () => {
    test('should throw error when popup class import fails', async () => {
      item = new MixedClass({ type: 'combatPower', name: 'Test Power', system: { cost: 1 } });
      item._importPopupClass = vi.fn().mockResolvedValue(null);
      
      const popupConfig = { className: 'CombatPowerPopup', type: 'combatPower' };
      
      await expect(item._executePopupLogicDirectly(popupConfig, {})).rejects.toThrow(
        'Failed to import popup class: CombatPowerPopup'
      );
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should handle eligibility check with validation problems', async () => {
      item = new MixedClass({ type: 'combatPower', name: 'Test Power', system: { cost: 1 } });
      
      const mockPopupInstance = {
        checkEligibility: vi.fn().mockResolvedValue({
          notEnoughPower: true,
          gearValidation: []
        }),
        _hasValidationProblems: vi.fn().mockReturnValue(true)
      };
      
      const mockPopupClass = vi.fn().mockImplementation(() => mockPopupInstance);
      item._importPopupClass = vi.fn().mockResolvedValue(mockPopupClass);
      
      const popupConfig = { className: 'CombatPowerPopup', type: 'combatPower' };
      
      await expect(item._executePopupLogicDirectly(popupConfig, {})).rejects.toThrow(
        'Item failed eligibility check'
      );
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should handle eligibility check with gearValidation problems', async () => {
      item = new MixedClass({ type: 'gear', name: 'Test Gear', system: { quantity: 1 } });
      
      const mockPopupInstance = {
        checkEligibility: vi.fn().mockResolvedValue({
          gearValidation: ['Not enough quantity', 'Invalid target'],
          validTarget: false
        }),
        _hasValidationProblems: null
      };
      
      const mockPopupClass = vi.fn().mockImplementation(() => mockPopupInstance);
      item._importPopupClass = vi.fn().mockResolvedValue(mockPopupClass);
      
      const popupConfig = { className: 'GearPopup', type: 'gear' };
      
      await expect(item._executePopupLogicDirectly(popupConfig, {})).rejects.toThrow();
    });

    test('should use static _hasValidationProblems if instance method not available', async () => {
      item = new MixedClass({ type: 'combatPower', name: 'Test Power', system: { cost: 1 } });
      
      const mockPopupInstance = {
        checkEligibility: vi.fn().mockResolvedValue({ notEnoughPower: true }),
        // No _hasValidationProblems instance method
      };
      
      const mockPopupClass = vi.fn().mockImplementation(() => mockPopupInstance);
      mockPopupClass._hasValidationProblems = vi.fn().mockReturnValue(true);
      
      item._importPopupClass = vi.fn().mockResolvedValue(mockPopupClass);
      
      const popupConfig = { className: 'CombatPowerPopup', type: 'combatPower' };
      
      await expect(item._executePopupLogicDirectly(popupConfig, {})).rejects.toThrow();
    });

    test('should use generic validation check when no _hasValidationProblems method', async () => {
      item = new MixedClass({ type: 'combatPower', name: 'Test Power', system: { cost: 1 } });
      
      const mockPopupInstance = {
        checkEligibility: vi.fn().mockResolvedValue({ notEnoughPower: true }),
        // No _hasValidationProblems method
      };
      
      const mockPopupClass = vi.fn().mockImplementation(() => mockPopupInstance);
      // No static _hasValidationProblems either
      
      item._importPopupClass = vi.fn().mockResolvedValue(mockPopupClass);
      
      const popupConfig = { className: 'CombatPowerPopup', type: 'combatPower' };
      
      await expect(item._executePopupLogicDirectly(popupConfig, {})).rejects.toThrow();
    });

    test('should execute bypass action successfully', async () => {
      item = new MixedClass({ type: 'combatPower', name: 'Test Power', system: { cost: 1 } });
      item.actor = { addPower: vi.fn() };
      
      const mockPopupInstance = {
        checkEligibility: vi.fn().mockResolvedValue({})
      };
      
      const mockPopupClass = vi.fn().mockImplementation(() => mockPopupInstance);
      item._importPopupClass = vi.fn().mockResolvedValue(mockPopupClass);
      item._prepareItemForPopup = vi.fn().mockResolvedValue(undefined);
      
      const popupConfig = { className: 'CombatPowerPopup', type: 'combatPower', requiresFormula: true };
      
      // Mock erps.messages.createCombatPowerMessage to return a result
      global.erps.messages.createCombatPowerMessage.mockResolvedValue({ success: true });
      
      const result = await item._executePopupLogicDirectly(popupConfig, {});
      
      expect(item._prepareItemForPopup).toHaveBeenCalled();
      expect(item.actor.addPower).toHaveBeenCalledWith(-1);
      expect(global.erps.messages.createCombatPowerMessage).toHaveBeenCalled();
      expect(result).toBeTruthy();
    });

    test('should handle bypass action execution error', async () => {
      item = new MixedClass({ type: 'combatPower', name: 'Test Power', system: { cost: 1 } });
      item.actor = {
        addPower: vi.fn().mockImplementation(() => {
          throw new Error('Power cost error');
        })
      };
      
      const mockPopupInstance = {
        checkEligibility: vi.fn().mockResolvedValue({})
      };
      
      const mockPopupClass = vi.fn().mockImplementation(() => mockPopupInstance);
      item._importPopupClass = vi.fn().mockResolvedValue(mockPopupClass);
      
      const popupConfig = { className: 'CombatPowerPopup', type: 'combatPower' };
      
      await expect(item._executePopupLogicDirectly(popupConfig, {})).rejects.toThrow('Power cost error');
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should handle generic error without showing duplicate notification', async () => {
      item = new MixedClass({ type: 'combatPower', name: 'Test Power', system: { cost: 1 } });
      
      const mockPopupInstance = {
        checkEligibility: vi.fn().mockResolvedValue({})
      };
      
      const mockPopupClass = vi.fn().mockImplementation(() => mockPopupInstance);
      item._importPopupClass = vi.fn().mockResolvedValue(mockPopupClass);
      
      // Mock _executeBypassActionForType to throw a generic error
      item._executeBypassActionForType = vi.fn().mockRejectedValue(new Error('Generic error'));
      
      const popupConfig = { className: 'CombatPowerPopup', type: 'combatPower' };
      
      await expect(item._executePopupLogicDirectly(popupConfig, {})).rejects.toThrow('Generic error');
    });

    test('should pass locked targets in options', async () => {
      item = new MixedClass({ type: 'combatPower', name: 'Test Power', system: { cost: 1 } });
      item.actor = { addPower: vi.fn() };
      
      const mockPopupInstance = {
        checkEligibility: vi.fn().mockResolvedValue({})
      };
      
      const mockPopupClass = vi.fn().mockImplementation(() => mockPopupInstance);
      item._importPopupClass = vi.fn().mockResolvedValue(mockPopupClass);
      item._prepareItemForPopup = vi.fn().mockResolvedValue(undefined);
      
      const popupConfig = { className: 'CombatPowerPopup', type: 'combatPower' };
      const lockedTargets = [{ id: 'target1', name: 'Target 1' }];
      
      await item._executePopupLogicDirectly(popupConfig, { lockedTargets });
      
      expect(global.erps.messages.createCombatPowerMessage).toHaveBeenCalledWith(
        item,
        { lockedTargets }
      );
    });
  });

  describe('_executeBypassActionForType()', () => {
    test('should throw error for actionCard type', async () => {
      item = new MixedClass({ type: 'actionCard' });
      
      await expect(item._executeBypassActionForType({})).rejects.toThrow(
        'Action cards cannot be bypassed'
      );
    });

    test('should throw error for unsupported type', async () => {
      item = new MixedClass({ type: 'unknown' });
      
      await expect(item._executeBypassActionForType({})).rejects.toThrow(
        'Unsupported item type for bypass'
      );
    });

    test('should handle combatPower bypass', async () => {
      const mockActor = {
        addPower: vi.fn()
      };
      item = new MixedClass({ type: 'combatPower', system: { cost: 2 } });
      item.actor = mockActor;
      
      await item._executeBypassActionForType({});
      
      expect(mockActor.addPower).toHaveBeenCalledWith(-2);
      expect(global.erps.messages.createCombatPowerMessage).toHaveBeenCalled();
    });

    test('should handle gear bypass', async () => {
      item = new MixedClass({ 
        type: 'gear', 
        system: { quantity: 5, cost: 2 } 
      });
      
      await item._executeBypassActionForType({});
      
      expect(item.update).toHaveBeenCalledWith({
        'system.quantity': 3
      });
      expect(global.erps.messages.createCombatPowerMessage).toHaveBeenCalled();
    });

    test('should handle gear bypass with default cost', async () => {
      item = new MixedClass({ 
        type: 'gear', 
        system: { quantity: 5 } 
      });
      
      await item._executeBypassActionForType({});
      
      expect(item.update).toHaveBeenCalledWith({
        'system.quantity': 4
      });
    });

    test('should handle feature bypass', async () => {
      item = new MixedClass({ type: 'feature' });
      
      await item._executeBypassActionForType({});
      
      expect(global.erps.messages.createFeatureMessage).toHaveBeenCalledWith(item);
    });

    test('should handle status bypass', async () => {
      item = new MixedClass({ type: 'status' });
      
      await item._executeBypassActionForType({});
      
      expect(global.erps.messages.createStatusMessage).toHaveBeenCalledWith(item, null);
    });

    test('should pass locked targets for combatPower', async () => {
      const mockActor = {
        addPower: vi.fn()
      };
      item = new MixedClass({ type: 'combatPower', system: { cost: 1 } });
      item.actor = mockActor;
      
      const lockedTargets = [{ id: 'target1', name: 'Target 1' }];
      await item._executeBypassActionForType({ lockedTargets });
      
      expect(global.erps.messages.createCombatPowerMessage).toHaveBeenCalledWith(
        item,
        { lockedTargets }
      );
    });
  });

  describe('Integration tests', () => {
    test('validateForPopup should work correctly with hasPopupSupport', () => {
      // Test all supported types
      const supportedTypes = ['actionCard', 'combatPower', 'gear', 'status', 'feature'];
      
      supportedTypes.forEach(type => {
        item = new MixedClass({ type, name: `Test ${type}`, system: {} });
        expect(item.hasPopupSupport()).toBe(true);
        
        const validation = item.validateForPopup();
        expect(validation.isValid).toBe(true);
      });
    });

    test('getPopupType should return consistent results with _getPopupConfig', () => {
      const types = ['actionCard', 'combatPower', 'gear', 'status', 'feature'];
      
      types.forEach(type => {
        item = new MixedClass({ type });
        const config = item._getPopupConfig();
        const popupType = item.getPopupType();
        
        expect(popupType).toBe(config?.type);
      });
    });

    test('_getEligibilityErrorKey should return appropriate keys for all types', () => {
      const typeToKey = {
        combatPower: 'EVENTIDE_RP_SYSTEM.Errors.CombatPowerError',
        gear: 'EVENTIDE_RP_SYSTEM.Errors.GearError',
        feature: 'EVENTIDE_RP_SYSTEM.Errors.FeatureError',
        status: 'EVENTIDE_RP_SYSTEM.Errors.StatusError',
        actionCard: 'EVENTIDE_RP_SYSTEM.Errors.ActionCardError'
      };
      
      Object.entries(typeToKey).forEach(([type, expectedKey]) => {
        item = new MixedClass({ type });
        expect(item._getEligibilityErrorKey()).toBe(expectedKey);
      });
    });
  });
});