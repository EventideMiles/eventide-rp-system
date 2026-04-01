// @ts-nocheck
/**
 * @fileoverview Transformation Applicator Tests
 *
 * Unit tests for the TransformationApplicator service which handles
 * transformation application logic for action card execution.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

import { TransformationApplicator } from '../../../module/services/transformation-applicator.mjs';
import { Logger } from '../../../module/services/logger.mjs';

// Mock Logger
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Set up mocks before any tests
beforeEach(() => {
  vi.clearAllMocks();

  // Mock foundry.utils
  global.foundry = {
    utils: {
      deepClone: vi.fn((obj) => JSON.parse(JSON.stringify(obj))),
      randomID: vi.fn(() => 'mock-id'),
    },
  };

  // Mock game.i18n
  if (global.game) {
    game.i18n = {
      localize: vi.fn((key) => `[${key}]`),
      format: vi.fn((key, data) => `[${key} ${JSON.stringify(data)}]`),
    };
  }

  // Mock CONFIG.Item.documentClass
  global.CONFIG = {
    Item: {
      documentClass: vi.fn(),
    },
  };
});

describe('TransformationApplicator', () => {
  describe('processTransformationResults()', () => {
    test('should return empty array when no embedded transformations', async () => {
      // Arrange
      const context = {
        results: [{ target: { id: 'actor1', name: 'Test Actor' } }],
        rollResult: null,
        embeddedTransformations: [],
        transformationConfig: {},
        repetitionContext: {},
        getEmbeddedTransformations: vi.fn(),
        shouldApplyEffect: vi.fn(),
        waitForDelay: vi.fn(),
        mode: 'attackChain',
        disableDelays: false,
        isFinalRepetition: true,
        sourceActor: null,
      };

      // Act
      const result = await TransformationApplicator.processTransformationResults(context);

      // Assert
      expect(result).toEqual([]);
    });

    test('should skip transformation processing in savedDamage mode', async () => {
      // Arrange
      const context = {
        results: [{ target: { id: 'actor1', name: 'Test Actor' } }],
        rollResult: null,
        embeddedTransformations: [{ name: 'Transform' }],
        transformationConfig: {},
        repetitionContext: {},
        getEmbeddedTransformations: vi.fn(),
        shouldApplyEffect: vi.fn(),
        waitForDelay: vi.fn(),
        mode: 'savedDamage',
        disableDelays: false,
        isFinalRepetition: true,
        sourceActor: null,
      };

      // Act
      const result = await TransformationApplicator.processTransformationResults(context);

      // Assert
      expect(result).toEqual([]);
      expect(Logger.debug).toHaveBeenCalledWith(
        'Skipping transformation processing for savedDamage mode - transformations are not allowed',
        { mode: 'savedDamage' },
        'ACTION_CARD'
      );
    });

    test('should skip invalid results', async () => {
      // Arrange
      const context = {
        results: [null, { target: null }, { target: { id: 'actor1', name: 'Valid Actor' } }],
        rollResult: null,
        embeddedTransformations: [{ name: 'Transform' }],
        transformationConfig: {},
        repetitionContext: {
          transformationSelections: new Map(),
          appliedTransformations: new Set(),
        },
        getEmbeddedTransformations: vi.fn().mockResolvedValue([{ name: 'Transform' }]),
        shouldApplyEffect: vi.fn(),
        waitForDelay: vi.fn(),
        mode: 'attackChain',
        disableDelays: false,
        isFinalRepetition: true,
        sourceActor: null,
      };

      // Act
      const result = await TransformationApplicator.processTransformationResults(context);

      // Assert
      expect(result).toEqual([]);
      expect(Logger.warn).toHaveBeenCalled();
    });

    test('should use pre-selected transformation from repetition context', async () => {
      // Arrange
      const mockTransformation = {
        id: 'transform1',
        originalId: 'transform1',
        name: 'Werewolf',
        type: 'transformation',
        system: { cursed: true },
        effects: [],
        toObject: vi.fn(() => ({ name: 'Werewolf', type: 'transformation', system: { cursed: true }, effects: [] })),
      };
      const mockTarget = { id: 'actor1', name: 'Test Actor' };
      const context = {
        results: [{ target: mockTarget, oneHit: true, bothHit: false }],
        rollResult: { total: 20, formula: '1d20+5' },
        embeddedTransformations: [mockTransformation],
        transformationConfig: { condition: 'onHit', threshold: 15 },
        repetitionContext: {
          transformationSelections: new Map([['actor1', 'transform1']]),
          appliedTransformations: new Set(),
        },
        getEmbeddedTransformations: vi.fn().mockResolvedValue([mockTransformation]),
        shouldApplyEffect: vi.fn().mockReturnValue(true),
        waitForDelay: vi.fn(),
        mode: 'attackChain',
        disableDelays: false,
        isFinalRepetition: true,
        sourceActor: null,
      };
      // Mock the temporary item created by CONFIG.Item.documentClass
      // When the target actor is used as a transformation, it should work
      CONFIG.Item.documentClass.mockImplementation((_data) => {
        // Return an object that can be applied with applyTransformation
        return { applyTransformation: vi.fn().mockResolvedValue() };
      });
      
      // Spy on applyWithValidation to properly mock it
      vi.spyOn(TransformationApplicator, 'applyWithValidation')
        .mockResolvedValue({ applied: true, reason: 'success' });

      // Act
      const result = await TransformationApplicator.processTransformationResults(context);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].target).toBe(mockTarget);
      expect(result[0].transformation).toBe(mockTransformation);
      expect(result[0].applied).toBe(true);
    });

    test('should use single transformation when only one available', async () => {
      // Arrange
      const mockTransformation = {
        id: 'transform1',
        originalId: 'transform1',
        name: 'Werewolf',
        type: 'transformation',
        system: { cursed: true },
        effects: [],
        toObject: vi.fn(() => ({ name: 'Werewolf', type: 'transformation', system: { cursed: true }, effects: [] })),
      };
      const mockTarget = { id: 'actor1', name: 'Test Actor' };
      const context = {
        results: [{ target: mockTarget, oneHit: true, bothHit: false }],
        rollResult: { total: 20, formula: '1d20+5' },
        embeddedTransformations: [mockTransformation],
        transformationConfig: { condition: 'onHit', threshold: 15 },
        repetitionContext: {
          transformationSelections: null,
          appliedTransformations: new Set(),
        },
        getEmbeddedTransformations: vi.fn().mockResolvedValue([mockTransformation]),
        shouldApplyEffect: vi.fn().mockReturnValue(true),
        waitForDelay: vi.fn(),
        mode: 'attackChain',
        disableDelays: false,
        isFinalRepetition: true,
        sourceActor: null,
      };
      // Mock the temporary item created by CONFIG.Item.documentClass
      CONFIG.Item.documentClass.mockImplementation((_data) => {
        return { applyTransformation: vi.fn().mockResolvedValue() };
      });
      
      // Spy on applyWithValidation to properly mock it
      vi.spyOn(TransformationApplicator, 'applyWithValidation')
        .mockResolvedValue({ applied: true, reason: 'success' });

      // Act
      const result = await TransformationApplicator.processTransformationResults(context);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].applied).toBe(true);
    });

    test('should skip when multiple transformations but no pre-selection', async () => {
      // Arrange
      const mockTransformations = [
        { id: 'transform1', name: 'Werewolf' },
        { id: 'transform2', name: 'Vampire' },
      ];
      const mockTarget = { id: 'actor1', name: 'Test Actor' };
      const context = {
        results: [{ target: mockTarget, oneHit: true, bothHit: false }],
        rollResult: { total: 20 },
        embeddedTransformations: mockTransformations,
        transformationConfig: {},
        repetitionContext: {
          transformationSelections: null,
          appliedTransformations: new Set(),
        },
        getEmbeddedTransformations: vi.fn().mockResolvedValue(mockTransformations),
        shouldApplyEffect: vi.fn(),
        waitForDelay: vi.fn(),
        mode: 'attackChain',
        disableDelays: false,
        isFinalRepetition: true,
        sourceActor: null,
      };

      // Act
      const result = await TransformationApplicator.processTransformationResults(context);

      // Assert
      expect(result).toEqual([]);
      expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Multiple transformations available but no pre-selection'),
        expect.any(Object),
        'ACTION_CARD'
      );
    });

    test('should skip when no transformation selected', async () => {
      // Arrange
      const mockTarget = { id: 'actor1', name: 'Test Actor' };
      const context = {
        results: [{ target: mockTarget, oneHit: true, bothHit: false }],
        rollResult: { total: 20 },
        embeddedTransformations: [{ name: 'Transform' }],
        transformationConfig: {},
        repetitionContext: {
          transformationSelections: new Map([['actor1', 'transform1']]),
          appliedTransformations: new Set(),
        },
        getEmbeddedTransformations: vi.fn().mockResolvedValue([]),
        shouldApplyEffect: vi.fn(),
        waitForDelay: vi.fn(),
        mode: 'attackChain',
        disableDelays: false,
        isFinalRepetition: true,
        sourceActor: null,
      };

      // Act
      const result = await TransformationApplicator.processTransformationResults(context);

      // Assert
      expect(result).toEqual([]);
      // The warning happens when no transformation is found in the lookup
    });

    test('should skip already applied transformations in repetition context', async () => {
      // Arrange
      const mockTransformation = {
        id: 'transform1',
        originalId: 'transform1',
        name: 'Werewolf',
        type: 'transformation',
        system: { cursed: true },
        effects: [],
      };
      const mockTarget = { id: 'actor1', name: 'Test Actor' };
      const context = {
        results: [{ target: mockTarget, oneHit: true, bothHit: false }],
        rollResult: { total: 20 },
        embeddedTransformations: [mockTransformation],
        transformationConfig: {},
        repetitionContext: {
          transformationSelections: new Map([['actor1', 'transform1']]),
          appliedTransformations: new Set(['actor1-transform1']),
        },
        getEmbeddedTransformations: vi.fn().mockResolvedValue([mockTransformation]),
        shouldApplyEffect: vi.fn().mockReturnValue(true),
        waitForDelay: vi.fn(),
        mode: 'attackChain',
        disableDelays: false,
        isFinalRepetition: true,
        sourceActor: null,
      };

      // Act
      const result = await TransformationApplicator.processTransformationResults(context);

      // Assert
      expect(result).toEqual([]);
    });

    test('should wait for delay when not final repetition', async () => {
      // Arrange
      const mockTransformation = {
        id: 'transform1',
        originalId: 'transform1',
        name: 'Werewolf',
        type: 'transformation',
        system: { cursed: true },
        effects: [],
      };
      const mockTarget = { id: 'actor1', name: 'Test Actor' };
      const context = {
        results: [{ target: mockTarget, oneHit: true, bothHit: false }],
        rollResult: { total: 20 },
        embeddedTransformations: [mockTransformation],
        transformationConfig: {},
        repetitionContext: {
          transformationSelections: new Map([['actor1', 'transform1']]),
          appliedTransformations: new Set(),
        },
        getEmbeddedTransformations: vi.fn().mockResolvedValue([mockTransformation]),
        shouldApplyEffect: vi.fn().mockReturnValue(true),
        waitForDelay: vi.fn().mockResolvedValue(),
        mode: 'attackChain',
        disableDelays: false,
        isFinalRepetition: false,
        sourceActor: null,
      };
      const mockActor = {
        getFlag: vi.fn().mockReturnValue(null),
        applyTransformation: vi.fn().mockResolvedValue(),
      };
      CONFIG.Item.documentClass.mockReturnValue(mockActor);

      // Act
      await TransformationApplicator.processTransformationResults(context);

      // Assert
      expect(context.waitForDelay).toHaveBeenCalled();
    });

    test('should handle transformation application errors', async () => {
      // Arrange
      const mockTransformation = {
        id: 'transform1',
        originalId: 'transform1',
        name: 'Werewolf',
        type: 'transformation',
        system: { cursed: true },
        effects: [],
        toObject: vi.fn(() => ({ name: 'Werewolf', type: 'transformation', system: { cursed: true }, effects: [] })),
      };
      const mockTarget = { id: 'actor1', name: 'Test Actor' };
      const context = {
        results: [{ target: mockTarget, oneHit: true, bothHit: false }],
        rollResult: { total: 20 },
        embeddedTransformations: [mockTransformation],
        transformationConfig: {},
        repetitionContext: {
          transformationSelections: new Map([['actor1', 'transform1']]),
          appliedTransformations: new Set(),
        },
        getEmbeddedTransformations: vi.fn().mockResolvedValue([mockTransformation]),
        shouldApplyEffect: vi.fn().mockReturnValue(true),
        waitForDelay: vi.fn(),
        mode: 'attackChain',
        disableDelays: false,
        isFinalRepetition: true,
        sourceActor: null,
      };
      
      // Spy on applyWithValidation to throw an error
      vi.spyOn(TransformationApplicator, 'applyWithValidation')
        .mockRejectedValue(new Error('Application failed'));

      // Act
      const result = await TransformationApplicator.processTransformationResults(context);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].applied).toBe(false);
      expect(result[0].error).toBe('Application failed');
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('applyWithValidation()', () => {
    test('should return duplicate_name when transformation already active', async () => {
      // Arrange
      const mockTargetActor = {
        getFlag: vi.fn().mockReturnValue('Werewolf'),
        applyTransformation: vi.fn(),
      };
      const mockTransformation = {
        name: 'Werewolf',
        type: 'transformation',
        system: { cursed: true },
      };

      // Act
      const result = await TransformationApplicator.applyWithValidation(mockTargetActor, mockTransformation);

      // Assert
      expect(result.applied).toBe(false);
      expect(result.reason).toBe('duplicate_name');
      expect(result.warning).toBeDefined();
      expect(mockTargetActor.applyTransformation).not.toHaveBeenCalled();
    });

    test('should deny cursed override when current is cursed and new is not', async () => {
      // Arrange
      const mockTargetActor = {
        getFlag: vi.fn((scope, key) => {
          if (key === 'activeTransformationName') return 'Cursed Form';
          if (key === 'activeTransformationCursed') return true;
          return null;
        }),
        applyTransformation: vi.fn(),
      };
      const mockTransformation = {
        name: 'Normal Form',
        type: 'transformation',
        system: { cursed: false },
      };

      // Act
      const result = await TransformationApplicator.applyWithValidation(mockTargetActor, mockTransformation);

      // Assert
      expect(result.applied).toBe(false);
      expect(result.reason).toBe('cursed_override_denied');
      expect(result.warning).toBeDefined();
      expect(mockTargetActor.applyTransformation).not.toHaveBeenCalled();
    });

    test('should allow transformation when no active transformation', async () => {
      // Arrange
      const mockTargetActor = {
        getFlag: vi.fn().mockReturnValue(null),
        applyTransformation: vi.fn().mockResolvedValue(),
      };
      const mockTransformation = {
        name: 'Werewolf',
        type: 'transformation',
        system: { cursed: true },
        effects: [],
        toObject: vi.fn(() => ({ name: 'Werewolf', type: 'transformation', system: { cursed: true }, effects: [] })),
      };
      const mockTempItem = { name: 'Werewolf' };
      CONFIG.Item.documentClass.mockReturnValue(mockTempItem);

      // Act
      const result = await TransformationApplicator.applyWithValidation(mockTargetActor, mockTransformation);

      // Assert
      expect(result.applied).toBe(true);
      expect(result.reason).toBe('success');
      expect(mockTargetActor.applyTransformation).toHaveBeenCalledWith(mockTempItem);
    });

    test('should allow transformation when new is cursed and current is not', async () => {
      // Arrange
      const mockTargetActor = {
        getFlag: vi.fn((scope, key) => {
          if (key === 'activeTransformationName') return 'Normal Form';
          if (key === 'activeTransformationCursed') return false;
          return null;
        }),
        applyTransformation: vi.fn().mockResolvedValue(),
      };
      const mockTransformation = {
        name: 'Cursed Form',
        type: 'transformation',
        system: { cursed: true },
        effects: [],
        toObject: vi.fn(() => ({ name: 'Cursed Form', type: 'transformation', system: { cursed: true }, effects: [] })),
      };
      const mockTempItem = { name: 'Cursed Form' };
      CONFIG.Item.documentClass.mockReturnValue(mockTempItem);

      // Act
      const result = await TransformationApplicator.applyWithValidation(mockTargetActor, mockTransformation);

      // Assert
      expect(result.applied).toBe(true);
      expect(result.reason).toBe('success');
      expect(mockTargetActor.applyTransformation).toHaveBeenCalledWith(mockTempItem);
    });

    test('should handle transformation with effects', async () => {
      // Arrange
      const mockEffect = { toObject: () => ({ name: 'Effect 1' }) };
      const mockTargetActor = {
        getFlag: vi.fn().mockReturnValue(null),
        applyTransformation: vi.fn().mockResolvedValue(),
      };
      const mockTransformation = {
        name: 'Werewolf',
        type: 'transformation',
        system: { cursed: true },
        effects: [mockEffect],
        toObject: vi.fn(() => ({ name: 'Werewolf', type: 'transformation', system: { cursed: true }, effects: [] })),
      };
      const mockTempItem = { name: 'Werewolf' };
      CONFIG.Item.documentClass.mockReturnValue(mockTempItem);

      // Act
      const result = await TransformationApplicator.applyWithValidation(mockTargetActor, mockTransformation);

      // Assert
      expect(result.applied).toBe(true);
    });

    test('should handle raw transformation data', async () => {
      // Arrange
      const mockTargetActor = {
        getFlag: vi.fn().mockReturnValue(null),
        applyTransformation: vi.fn().mockResolvedValue(),
      };
      const mockTransformation = {
        name: 'Werewolf',
        type: 'transformation',
        system: { cursed: true },
      };
      const mockTempItem = { name: 'Werewolf' };
      CONFIG.Item.documentClass.mockReturnValue(mockTempItem);

      // Act
      const result = await TransformationApplicator.applyWithValidation(mockTargetActor, mockTransformation);

      // Assert
      expect(result.applied).toBe(true);
      expect(foundry.utils.deepClone).toHaveBeenCalledWith(mockTransformation);
    });

    test('should return application_error on failure', async () => {
      // Arrange
      const mockTargetActor = {
        getFlag: vi.fn().mockReturnValue(null),
        applyTransformation: vi.fn().mockRejectedValue(new Error('Failed to apply')),
      };
      const mockTransformation = {
        name: 'Werewolf',
        type: 'transformation',
        system: { cursed: true },
        effects: [],
        toObject: vi.fn(() => ({ name: 'Werewolf', type: 'transformation', system: { cursed: true }, effects: [] })),
      };
      const mockTempItem = { name: 'Werewolf' };
      CONFIG.Item.documentClass.mockReturnValue(mockTempItem);

      // Act
      const result = await TransformationApplicator.applyWithValidation(mockTargetActor, mockTransformation);

      // Assert
      expect(result.applied).toBe(false);
      expect(result.reason).toBe('application_error');
      expect(result.error).toBe('Failed to apply');
    });
  });

  describe('promptForSelection()', () => {
    test('should create dialog with default options', async () => {
      // Arrange
      const transformations = [
        { name: 'Werewolf' },
        { name: 'Vampire' },
      ];
      let dialogResolve;
      const mockDialog = {
        render: vi.fn(() => {
          dialogResolve(null);
        }),
      };
      global.Dialog = vi.fn((config) => {
        dialogResolve = config.buttons.cancel.callback;
        return mockDialog;
      });

      // Act
      const result = await TransformationApplicator.promptForSelection(transformations);

      // Assert
      expect(Dialog).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '[EVENTIDE_RP_SYSTEM.Item.ActionCard.TransformationSelectionTitle]',
          content: expect.stringContaining('Werewolf'),
        })
      );
      expect(result).toBeNull();
    });

    test('should create dialog with custom options', async () => {
      // Arrange
      const transformations = [{ name: 'Werewolf' }];
      let dialogResolve;
      const mockDialog = {
        render: vi.fn(() => {
          dialogResolve(null);
        }),
      };
      global.Dialog = vi.fn((config) => {
        dialogResolve = config.buttons.cancel.callback;
        return mockDialog;
      });

      // Act
      const result = await TransformationApplicator.promptForSelection(transformations, {
        title: 'Custom Title',
        prompt: 'Custom Prompt',
        label: 'Custom Label',
        applyButton: 'Custom Apply',
        cancelButton: 'Custom Cancel',
      });

      // Assert
      expect(Dialog).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '[Custom Title]',
          content: expect.stringContaining('[Custom Prompt]'),
        })
      );
      expect(result).toBeNull();
    });

    test('should resolve with selected transformation on apply', async () => {
      // Arrange
      const transformations = [
        { name: 'Werewolf' },
        { name: 'Vampire' },
      ];
      let applyCallback;
      const mockDialog = {
        render: vi.fn(),
      };
      global.Dialog = vi.fn((config) => {
        applyCallback = config.buttons.apply.callback;
        return mockDialog;
      });

      // Act
      const promise = TransformationApplicator.promptForSelection(transformations);
      applyCallback({ find: vi.fn(() => ({ val: vi.fn(() => '1') })) });
      const result = await promise;

      // Assert
      expect(result).toBe(transformations[1]);
    });

    test('should resolve with null on cancel', async () => {
      // Arrange
      const transformations = [{ name: 'Werewolf' }];
      let cancelCallback;
      const mockDialog = {
        render: vi.fn(),
      };
      global.Dialog = vi.fn((config) => {
        cancelCallback = config.buttons.cancel.callback;
        return mockDialog;
      });

      // Act
      const promise = TransformationApplicator.promptForSelection(transformations);
      cancelCallback();
      const result = await promise;

      // Assert
      expect(result).toBeNull();
    });

    test('should resolve with null on close', async () => {
      // Arrange
      const transformations = [{ name: 'Werewolf' }];
      let closeCallback;
      const mockDialog = {
        render: vi.fn(),
      };
      global.Dialog = vi.fn((config) => {
        closeCallback = config.close;
        return mockDialog;
      });

      // Act
      const promise = TransformationApplicator.promptForSelection(transformations);
      closeCallback();
      const result = await promise;

      // Assert
      expect(result).toBeNull();
    });
  });
});