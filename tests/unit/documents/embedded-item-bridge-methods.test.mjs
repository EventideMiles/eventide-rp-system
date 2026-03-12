// @ts-nocheck
/**
 * @fileoverview Tests for Embedded Item Bridge Methods
 *
 * Tests the critical bridge methods that were accidentally removed in PR #113
 * and restored in PR #114. These methods provide compatibility between
 * embedded items and regular item sheets.
 *
 * Bridge Methods Tested:
 * - _updateCharacterEffects(options = {})
 * - _newCharacterEffect(event, target)
 * - _deleteCharacterEffect(event, target)
 * - _toggleEffectDisplay(event, target)
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Mock the CharacterEffectsProcessor before import
vi.mock('../../../module/services/character-effects-processor.mjs', () => ({
  CharacterEffectsProcessor: {
    parseCharacterEffectsForm: vi.fn(() => ({
      regularEffects: [],
      hiddenEffects: [],
      overrideEffects: []
    })),
    processEffectsToChanges: vi.fn(async () => []),
    generateNewEffectChange: vi.fn(() => ({
      key: 'system.abilities.acro.modifier',
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: 2
    })),
    getOrCreateFirstEffect: vi.fn(async () => ({
      id: 'effect-123',
      _id: 'effect-123',
      changes: [],
      toObject: vi.fn(() => ({ id: 'effect-123' }))
    }))
  }
}));

// Mock Logger before import
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    methodEntry: vi.fn(),
    methodExit: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Import the mixin after setting up mocks
import { EmbeddedItemCharacterEffectsMixin } from '../../../module/ui/mixins/embedded-item-character-effects.mjs';

describe('Embedded Item Bridge Methods', () => {
  let mockBaseClass;
  let MockSheet;
  let mockDocument;
  let mockParentItem;
  let mockForm;
  let mockEvent;
  let mockTarget;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock parent item
    mockParentItem = {
      type: 'actionCard',
      update: vi.fn(async () => {}),
      system: {
        embeddedItem: {
          _id: 'embedded-item-123',
          name: 'Test Embedded Item',
          effects: []
        },
        embeddedStatusEffects: [],
        embeddedCombatPowers: []
      }
    };

    // Create a mock document (the embedded item)
    mockDocument = {
      id: 'embedded-item-123',
      _id: 'embedded-item-123',
      type: 'feature',
      effects: {
        contents: []
      },
      updateSource: vi.fn(),
      toObject: vi.fn(() => ({ id: 'embedded-item-123' }))
    };

    // Create a mock form
    mockForm = {
      querySelectorAll: vi.fn(() => [])
    };

    // Create mock event and target
    mockEvent = {
      target: {
        focus: vi.fn()
      },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    };

    mockTarget = {
      dataset: {},
      focus: vi.fn()
    };

    // Create a mock base class
    mockBaseClass = class {
      constructor(document, options = {}) {
        this.document = document;
        this.options = options;
        this.form = mockForm;
      }

      render() {
        return this;
      }
    };

    // Apply the mixin to create the MockSheet class
    MockSheet = EmbeddedItemCharacterEffectsMixin(mockBaseClass);
  });

  describe('_updateCharacterEffects() - Bridge Method', () => {
    test('should forward to _updateEmbeddedCharacterEffects', async () => {
      const sheet = new MockSheet(mockDocument);
      sheet.parentItem = mockParentItem;
      sheet.originalItemId = 'embedded-item-123';
      sheet.isEffect = false;

      // Spy on the embedded version
      const embeddedSpy = vi.spyOn(sheet, '_updateEmbeddedCharacterEffects');
      embeddedSpy.mockResolvedValue();

      await sheet._updateCharacterEffects({ newEffect: { type: 'regularEffects', ability: 'acro' } });

      expect(embeddedSpy).toHaveBeenCalledWith({ newEffect: { type: 'regularEffects', ability: 'acro' } });
      expect(embeddedSpy).toHaveBeenCalledTimes(1);
    });

    test('should handle empty options', async () => {
      const sheet = new MockSheet(mockDocument);
      sheet.parentItem = mockParentItem;
      sheet.originalItemId = 'embedded-item-123';
      sheet.isEffect = false;

      const embeddedSpy = vi.spyOn(sheet, '_updateEmbeddedCharacterEffects');
      embeddedSpy.mockResolvedValue();

      await sheet._updateCharacterEffects();

      expect(embeddedSpy).toHaveBeenCalledWith({});
    });

    test('should pass through remove options', async () => {
      const sheet = new MockSheet(mockDocument);
      sheet.parentItem = mockParentItem;
      sheet.originalItemId = 'embedded-item-123';
      sheet.isEffect = false;

      const embeddedSpy = vi.spyOn(sheet, '_updateEmbeddedCharacterEffects');
      embeddedSpy.mockResolvedValue();

      await sheet._updateCharacterEffects({ remove: { index: 0, type: 'regularEffects' } });

      expect(embeddedSpy).toHaveBeenCalledWith({ remove: { index: 0, type: 'regularEffects' } });
    });
  });

  describe('_newCharacterEffect() - Bridge Method', () => {
    test('should forward to _newEmbeddedCharacterEffect as static method', async () => {
      const embeddedSpy = vi.spyOn(MockSheet, '_newEmbeddedCharacterEffect');
      embeddedSpy.mockResolvedValue();

      await MockSheet._newCharacterEffect(mockEvent, mockTarget);

      expect(embeddedSpy).toHaveBeenCalledWith(mockEvent, mockTarget);
      expect(embeddedSpy).toHaveBeenCalledTimes(1);
    });

    test('should extract type and ability from target dataset', async () => {
      mockTarget.dataset = { type: 'regularEffects', ability: 'acro' };

      const embeddedSpy = vi.spyOn(MockSheet, '_newEmbeddedCharacterEffect');
      embeddedSpy.mockResolvedValue();

      await MockSheet._newCharacterEffect(mockEvent, mockTarget);

      expect(embeddedSpy).toHaveBeenCalledWith(mockEvent, mockTarget);
      expect(embeddedSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('_deleteCharacterEffect() - Bridge Method', () => {
    test('should forward to _deleteEmbeddedCharacterEffect as static method', async () => {
      const embeddedSpy = vi.spyOn(MockSheet, '_deleteEmbeddedCharacterEffect');
      embeddedSpy.mockResolvedValue();

      await MockSheet._deleteCharacterEffect(mockEvent, mockTarget);

      expect(embeddedSpy).toHaveBeenCalledWith(mockEvent, mockTarget);
      expect(embeddedSpy).toHaveBeenCalledTimes(1);
    });

    test('should extract index and type from target dataset', async () => {
      mockTarget.dataset = { index: '0', type: 'regularEffects' };

      const embeddedSpy = vi.spyOn(MockSheet, '_deleteEmbeddedCharacterEffect');
      embeddedSpy.mockResolvedValue();

      await MockSheet._deleteCharacterEffect(mockEvent, mockTarget);

      expect(embeddedSpy).toHaveBeenCalledWith(mockEvent, mockTarget);
    });
  });

  describe('_toggleEffectDisplay() - Bridge Method', () => {
    test('should forward to _toggleEmbeddedEffectDisplay as static method', async () => {
      const embeddedSpy = vi.spyOn(MockSheet, '_toggleEmbeddedEffectDisplay');
      embeddedSpy.mockResolvedValue();

      await MockSheet._toggleEffectDisplay(mockEvent, mockTarget);

      expect(embeddedSpy).toHaveBeenCalledWith(mockEvent, mockTarget);
      expect(embeddedSpy).toHaveBeenCalledTimes(1);
    });

    test('should handle checked state', async () => {
      mockTarget.checked = true;

      const embeddedSpy = vi.spyOn(MockSheet, '_toggleEmbeddedEffectDisplay');
      embeddedSpy.mockResolvedValue();

      await MockSheet._toggleEffectDisplay(mockEvent, mockTarget);

      expect(embeddedSpy).toHaveBeenCalledWith(mockEvent, mockTarget);
    });

    test('should handle unchecked state', async () => {
      mockTarget.checked = false;

      const embeddedSpy = vi.spyOn(MockSheet, '_toggleEmbeddedEffectDisplay');
      embeddedSpy.mockResolvedValue();

      await MockSheet._toggleEffectDisplay(mockEvent, mockTarget);

      expect(embeddedSpy).toHaveBeenCalledWith(mockEvent, mockTarget);
    });
  });
});