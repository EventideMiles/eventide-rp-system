// @ts-nocheck
/**
 * @fileoverview EffectManager Service Tests
 *
 * Unit tests for the effect-manager service which provides
 * centralized ActiveEffect management operations for item sheets.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

import { EffectManager } from '../../../module/services/effect-manager.mjs';

// Mock dependencies
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn()
  }
}));

/**
 * Helper to create a mock DOM element with dataset
 * @param {object} options - Configuration options
 * @param {string} [options.effectId] - The effect ID for data-effect-id
 * @param {string} [options.type] - The type for dataset.type
 * @param {object} [options.dataset] - Additional dataset properties
 * @returns {object} Mock DOM element
 */
function createMockTarget(options = {}) {
  const { effectId, type, dataset = {} } = options;
  
  const mockElement = {
    closest: vi.fn(),
    dataset: {
      ...dataset
    }
  };
  
  // If effectId is provided, set up closest to return an element with effectId
  if (effectId !== undefined) {
    mockElement.closest.mockReturnValue({
      dataset: {
        effectId,
        ...dataset
      }
    });
  } else {
    mockElement.closest.mockReturnValue(null);
  }
  
  // Add type to dataset if provided
  if (type !== undefined) {
    mockElement.dataset.type = type;
  }
  
  return mockElement;
}

/**
 * Helper to create a mock ActiveEffect
 * @param {object} options - Configuration options
 * @param {string} [options.id] - Effect ID
 * @param {string} [options.name] - Effect name
 * @param {boolean} [options.disabled] - Disabled state
 * @returns {object} Mock ActiveEffect
 */
function createMockEffect(options = {}) {
  const { id = 'effect-123', name = 'Test Effect', disabled = false } = options;
  
  return {
    id,
    _id: id,
    name,
    disabled,
    delete: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined)
  };
}

/**
 * Helper to create a mock Item with effects collection
 * @param {object} options - Configuration options
 * @param {string} [options.name] - Item name
 * @param {Map} [options.effects] - Effects collection
 * @returns {object} Mock Item
 */
function createMockItem(options = {}) {
  const { name = 'Test Item', effects } = options;
  
  const effectsMap = effects || new Map();
  
  return {
    name,
    effects: {
      get: vi.fn((id) => effectsMap.get(id))
    }
  };
}

describe('EffectManager', () => {
  let mockItem;
  let mockEffect;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default mocks
    mockEffect = createMockEffect();
    mockItem = createMockItem({
      effects: new Map([['effect-123', mockEffect]])
    });
    
    // Ensure foundry.utils exists
    if (!global.foundry) {
      global.foundry = { utils: {} };
    }
    if (!global.foundry.utils) {
      global.foundry.utils = {};
    }
    
    // Mock getDocumentClass
    global.foundry.utils.getDocumentClass = vi.fn();
    
    // Mock setProperty
    global.foundry.utils.setProperty = vi.fn((obj, key, value) => {
      obj[key] = value;
    });
    
    // Ensure game and ui globals exist
    if (!global.game) {
      global.game = { i18n: { format: vi.fn((key, data) => `${key} ${JSON.stringify(data)}`) } };
    } else {
      global.game.i18n = { format: vi.fn((key, data) => `${key} ${JSON.stringify(data)}`) };
    }
    
    if (!global.ui) {
      global.ui = { notifications: { error: vi.fn() } };
    } else {
      global.ui.notifications = { error: vi.fn() };
    }
  });

  // =================================
  // getEffect Tests
  // =================================
  describe('getEffect', () => {
    test('should return effect when found', () => {
      const mockTarget = createMockTarget({ effectId: 'effect-123' });
      
      const result = EffectManager.getEffect(mockItem, mockTarget);
      
      expect(result).toBe(mockEffect);
      expect(mockItem.effects.get).toHaveBeenCalledWith('effect-123');
      expect(mockTarget.closest).toHaveBeenCalledWith('.effect');
    });

    test('should return undefined when effect not found', () => {
      const mockTarget = createMockTarget({ effectId: 'non-existent' });
      
      const result = EffectManager.getEffect(mockItem, mockTarget);
      
      expect(result).toBeUndefined();
      expect(mockItem.effects.get).toHaveBeenCalledWith('non-existent');
    });

    test('should return undefined when target.closest returns null', () => {
      const mockTarget = createMockTarget({ effectId: undefined });
      
      const result = EffectManager.getEffect(mockItem, mockTarget);
      
      expect(result).toBeUndefined();
    });

    test('should return undefined when dataset.effectId is undefined', () => {
      const mockTarget = {
        closest: vi.fn().mockReturnValue({
          dataset: {}
        })
      };
      
      const result = EffectManager.getEffect(mockItem, mockTarget);
      
      expect(result).toBeUndefined();
      expect(mockItem.effects.get).toHaveBeenCalledWith(undefined);
    });

    test('should handle null item gracefully', () => {
      const mockTarget = createMockTarget({ effectId: 'effect-123' });
      
      // This will throw because null.effects doesn't exist
      expect(() => EffectManager.getEffect(null, mockTarget)).toThrow();
    });
  });

  // =================================
  // deleteEffect Tests
  // =================================
  describe('deleteEffect', () => {
    test('should delete effect successfully', async () => {
      const mockTarget = createMockTarget({ effectId: 'effect-123' });
      
      await EffectManager.deleteEffect(mockItem, mockTarget);
      
      expect(mockEffect.delete).toHaveBeenCalled();
    });

    test('should return early when effect not found', async () => {
      const mockTarget = createMockTarget({ effectId: 'non-existent' });
      const { Logger } = await import('../../../module/services/logger.mjs');
      
      await EffectManager.deleteEffect(mockItem, mockTarget);
      
      expect(Logger.warn).toHaveBeenCalledWith('No effect found for deletion', {}, 'ITEM_ACTIONS');
    });

    test('should return early when target.closest returns null', async () => {
      const mockTarget = createMockTarget({ effectId: undefined });
      const { Logger } = await import('../../../module/services/logger.mjs');
      
      await EffectManager.deleteEffect(mockItem, mockTarget);
      
      expect(Logger.warn).toHaveBeenCalledWith('No effect found for deletion', {}, 'ITEM_ACTIONS');
    });

    test('should handle error during deletion', async () => {
      const errorEffect = createMockEffect({ id: 'error-effect' });
      errorEffect.delete.mockRejectedValue(new Error('Delete failed'));
      
      const errorItem = createMockItem({
        effects: new Map([['error-effect', errorEffect]])
      });
      const mockTarget = createMockTarget({ effectId: 'error-effect' });
      const { Logger } = await import('../../../module/services/logger.mjs');
      
      await EffectManager.deleteEffect(errorItem, mockTarget);
      
      expect(Logger.error).toHaveBeenCalledWith('Failed to delete effect', expect.any(Error), 'ITEM_ACTIONS');
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should use item name in error notification', async () => {
      const errorEffect = createMockEffect({ id: 'error-effect' });
      errorEffect.delete.mockRejectedValue(new Error('Delete failed'));
      
      const errorItem = createMockItem({
        name: 'Named Item',
        effects: new Map([['error-effect', errorEffect]])
      });
      const mockTarget = createMockTarget({ effectId: 'error-effect' });
      await EffectManager.deleteEffect(errorItem, mockTarget);
      
      expect(global.game.i18n.format).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Errors.EffectDeletionFailed',
        { itemName: 'Named Item' }
      );
    });

    test('should use "Unknown" for null item name in error', async () => {
      const errorEffect = createMockEffect({ id: 'error-effect' });
      errorEffect.delete.mockRejectedValue(new Error('Delete failed'));
      
      const errorItem = {
        name: null,
        effects: {
          get: vi.fn(() => errorEffect)
        }
      };
      const mockTarget = createMockTarget({ effectId: 'error-effect' });
      
      await EffectManager.deleteEffect(errorItem, mockTarget);
      
      expect(global.game.i18n.format).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Errors.EffectDeletionFailed',
        { itemName: 'Unknown' }
      );
    });
  });

  // =================================
  // createEffect Tests
  // =================================
  describe('createEffect', () => {
    test('should create effect with default name', async () => {
      const mockTarget = createMockTarget({
        type: 'status',
        dataset: {}
      });
      
      const mockActiveEffectClass = vi.fn().mockImplementation((data) => ({
        ...data,
        id: 'new-effect-123'
      }));
      mockActiveEffectClass.defaultName = vi.fn(() => 'New Active Effect');
      mockActiveEffectClass.create = vi.fn().mockResolvedValue({ id: 'new-effect-123' });
      
      global.foundry.utils.getDocumentClass.mockReturnValue(mockActiveEffectClass);
      
      await EffectManager.createEffect(mockItem, mockTarget);
      
      expect(global.foundry.utils.getDocumentClass).toHaveBeenCalledWith('ActiveEffect');
      expect(mockActiveEffectClass.defaultName).toHaveBeenCalledWith({
        type: 'status',
        parent: mockItem
      });
      expect(mockActiveEffectClass.create).toHaveBeenCalled();
    });

    test('should include dataset properties in effect data', async () => {
      const mockTarget = createMockTarget({
        type: 'status',
        dataset: {
          systemDescription: 'Test description',
          systemEnabled: 'true'
        }
      });
      
      const mockActiveEffectClass = vi.fn();
      mockActiveEffectClass.defaultName = vi.fn(() => 'New Active Effect');
      mockActiveEffectClass.create = vi.fn().mockResolvedValue({ id: 'new-effect-123' });
      
      global.foundry.utils.getDocumentClass.mockReturnValue(mockActiveEffectClass);
      
      await EffectManager.createEffect(mockItem, mockTarget);
      
      expect(global.foundry.utils.setProperty).toHaveBeenCalled();
      expect(mockActiveEffectClass.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Active Effect'
        }),
        { parent: mockItem }
      );
    });

    test('should exclude reserved dataset properties (action, documentClass)', async () => {
      const mockTarget = createMockTarget({
        type: 'status',
        dataset: {
          action: 'create',
          documentClass: 'ActiveEffect',
          systemValue: 'valid'
        }
      });
      
      const mockActiveEffectClass = vi.fn();
      mockActiveEffectClass.defaultName = vi.fn(() => 'New Active Effect');
      mockActiveEffectClass.create = vi.fn().mockResolvedValue({ id: 'new-effect-123' });
      
      global.foundry.utils.getDocumentClass.mockReturnValue(mockActiveEffectClass);
      
      await EffectManager.createEffect(mockItem, mockTarget);
      
      // Verify setProperty was called for systemValue but not for action or documentClass
      const setPropertyCalls = global.foundry.utils.setProperty.mock.calls;
      const calledKeys = setPropertyCalls.map(call => call[1]);
      
      expect(calledKeys).not.toContain('action');
      expect(calledKeys).not.toContain('documentClass');
      expect(calledKeys).toContain('systemValue');
    });

    test('should handle undefined type gracefully', async () => {
      const mockTarget = createMockTarget({
        dataset: {}
      });
      
      const mockActiveEffectClass = vi.fn();
      mockActiveEffectClass.defaultName = vi.fn(() => 'New Active Effect');
      mockActiveEffectClass.create = vi.fn().mockResolvedValue({ id: 'new-effect-123' });
      
      global.foundry.utils.getDocumentClass.mockReturnValue(mockActiveEffectClass);
      
      await EffectManager.createEffect(mockItem, mockTarget);
      
      expect(mockActiveEffectClass.defaultName).toHaveBeenCalledWith({
        type: undefined,
        parent: mockItem
      });
    });

    test('should handle error during creation', async () => {
      const mockTarget = createMockTarget({ type: 'status' });
      
      const mockActiveEffectClass = vi.fn();
      mockActiveEffectClass.defaultName = vi.fn(() => 'New Active Effect');
      mockActiveEffectClass.create = vi.fn().mockRejectedValue(new Error('Creation failed'));
      
      global.foundry.utils.getDocumentClass.mockReturnValue(mockActiveEffectClass);
      const { Logger } = await import('../../../module/services/logger.mjs');
      
      await EffectManager.createEffect(mockItem, mockTarget);
      
      expect(Logger.error).toHaveBeenCalledWith('Failed to create effect', expect.any(Error), 'ITEM_ACTIONS');
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should use item name in error notification', async () => {
      const mockTarget = createMockTarget({ type: 'status' });
      
      const mockActiveEffectClass = vi.fn();
      mockActiveEffectClass.defaultName = vi.fn(() => 'New Active Effect');
      mockActiveEffectClass.create = vi.fn().mockRejectedValue(new Error('Creation failed'));
      
      global.foundry.utils.getDocumentClass.mockReturnValue(mockActiveEffectClass);
      
      const namedItem = createMockItem({ name: 'My Item' });
      
      await EffectManager.createEffect(namedItem, mockTarget);
      
      expect(global.game.i18n.format).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Errors.EffectCreationFailed',
        { itemName: 'My Item' }
      );
    });

    test('should use "Unknown" for null item name in creation error', async () => {
      const mockTarget = createMockTarget({ type: 'status' });
      
      const mockActiveEffectClass = vi.fn();
      mockActiveEffectClass.defaultName = vi.fn(() => 'New Active Effect');
      mockActiveEffectClass.create = vi.fn().mockRejectedValue(new Error('Creation failed'));
      
      global.foundry.utils.getDocumentClass.mockReturnValue(mockActiveEffectClass);
      
      const nullNameItem = {
        name: null,
        effects: { get: vi.fn() }
      };
      
      await EffectManager.createEffect(nullNameItem, mockTarget);
      
      expect(global.game.i18n.format).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Errors.EffectCreationFailed',
        { itemName: 'Unknown' }
      );
    });
  });

  // =================================
  // toggleEffect Tests
  // =================================
  describe('toggleEffect', () => {
    test('should toggle effect from enabled to disabled', async () => {
      const enabledEffect = createMockEffect({ id: 'toggle-effect', disabled: false });
      const toggleItem = createMockItem({
        effects: new Map([['toggle-effect', enabledEffect]])
      });
      const mockTarget = createMockTarget({ effectId: 'toggle-effect' });
      
      await EffectManager.toggleEffect(toggleItem, mockTarget);
      
      expect(enabledEffect.update).toHaveBeenCalledWith({ disabled: true });
    });

    test('should toggle effect from disabled to enabled', async () => {
      const disabledEffect = createMockEffect({ id: 'toggle-effect', disabled: true });
      const toggleItem = createMockItem({
        effects: new Map([['toggle-effect', disabledEffect]])
      });
      const mockTarget = createMockTarget({ effectId: 'toggle-effect' });
      
      await EffectManager.toggleEffect(toggleItem, mockTarget);
      
      expect(disabledEffect.update).toHaveBeenCalledWith({ disabled: false });
    });

    test('should return early when effect not found', async () => {
      const mockTarget = createMockTarget({ effectId: 'non-existent' });
      const { Logger } = await import('../../../module/services/logger.mjs');
      
      await EffectManager.toggleEffect(mockItem, mockTarget);
      
      expect(Logger.warn).toHaveBeenCalledWith('No effect found for toggling', {}, 'ITEM_ACTIONS');
    });

    test('should return early when target.closest returns null', async () => {
      const mockTarget = createMockTarget({ effectId: undefined });
      const { Logger } = await import('../../../module/services/logger.mjs');
      
      await EffectManager.toggleEffect(mockItem, mockTarget);
      
      expect(Logger.warn).toHaveBeenCalledWith('No effect found for toggling', {}, 'ITEM_ACTIONS');
    });

    test('should handle error during toggle', async () => {
      const errorEffect = createMockEffect({ id: 'error-effect' });
      errorEffect.update.mockRejectedValue(new Error('Update failed'));
      
      const errorItem = createMockItem({
        effects: new Map([['error-effect', errorEffect]])
      });
      const mockTarget = createMockTarget({ effectId: 'error-effect' });
      const { Logger } = await import('../../../module/services/logger.mjs');
      
      await EffectManager.toggleEffect(errorItem, mockTarget);
      
      expect(Logger.error).toHaveBeenCalledWith('Failed to toggle effect', expect.any(Error), 'ITEM_ACTIONS');
      expect(global.ui.notifications.error).toHaveBeenCalled();
    });

    test('should use item name in error notification for toggle', async () => {
      const errorEffect = createMockEffect({ id: 'error-effect' });
      errorEffect.update.mockRejectedValue(new Error('Update failed'));
      
      const errorItem = createMockItem({
        name: 'Toggle Item',
        effects: new Map([['error-effect', errorEffect]])
      });
      const mockTarget = createMockTarget({ effectId: 'error-effect' });
      
      await EffectManager.toggleEffect(errorItem, mockTarget);
      
      expect(global.game.i18n.format).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Errors.EffectToggleFailed',
        { itemName: 'Toggle Item' }
      );
    });

    test('should use "Unknown" for null item name in toggle error', async () => {
      const errorEffect = createMockEffect({ id: 'error-effect' });
      errorEffect.update.mockRejectedValue(new Error('Update failed'));
      
      const errorItem = {
        name: null,
        effects: {
          get: vi.fn(() => errorEffect)
        }
      };
      const mockTarget = createMockTarget({ effectId: 'error-effect' });
      
      await EffectManager.toggleEffect(errorItem, mockTarget);
      
      expect(global.game.i18n.format).toHaveBeenCalledWith(
        'EVENTIDE_RP_SYSTEM.Errors.EffectToggleFailed',
        { itemName: 'Unknown' }
      );
    });
  });
});