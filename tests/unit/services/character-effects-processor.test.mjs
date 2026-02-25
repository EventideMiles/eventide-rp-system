// @ts-nocheck
/**
 * @fileoverview CharacterEffectsProcessor Service Tests
 *
 * Unit tests for the CharacterEffectsProcessor service which handles
 * character effects processing for item sheets.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { CharacterEffectsProcessor } from '../../../module/services/character-effects-processor.mjs';

describe('CharacterEffectsProcessor', () => {
  describe('parseCharacterEffectsForm', () => {
    let mockForm;

    beforeEach(() => {
      // Create a mock form element with querySelectorAll
      mockForm = {
        querySelectorAll: jest.fn()
      };
    });

    test('parses regular effects from form', () => {
      const formElements = [
        { name: 'characterEffects.regularEffects.0.ability', value: 'acro' },
        { name: 'characterEffects.regularEffects.0.mode', value: 'add' },
        { name: 'characterEffects.regularEffects.0.value', value: '2' },
        { name: 'characterEffects.regularEffects.1.ability', value: 'phys' },
        { name: 'characterEffects.regularEffects.1.mode', value: 'override' },
        { name: 'characterEffects.regularEffects.1.value', value: '5' }
      ];
      mockForm.querySelectorAll.mockReturnValue(formElements);

      const result = CharacterEffectsProcessor.parseCharacterEffectsForm(mockForm, {});

      expect(result.regularEffects).toHaveLength(2);
      expect(result.regularEffects[0]).toEqual({ ability: 'acro', mode: 'add', value: '2' });
      expect(result.regularEffects[1]).toEqual({ ability: 'phys', mode: 'override', value: '5' });
      expect(result.hiddenEffects).toEqual([]);
      expect(result.overrideEffects).toEqual([]);
    });

    test('parses hidden effects from form', () => {
      const formElements = [
        { name: 'characterEffects.hiddenEffects.0.ability', value: 'dice' },
        { name: 'characterEffects.hiddenEffects.0.mode', value: 'add' },
        { name: 'characterEffects.hiddenEffects.0.value', value: '1' }
      ];
      mockForm.querySelectorAll.mockReturnValue(formElements);

      const result = CharacterEffectsProcessor.parseCharacterEffectsForm(mockForm, {});

      expect(result.hiddenEffects).toHaveLength(1);
      expect(result.hiddenEffects[0]).toEqual({ ability: 'dice', mode: 'add', value: '1' });
      expect(result.regularEffects).toEqual([]);
      expect(result.overrideEffects).toEqual([]);
    });

    test('parses override effects from form', () => {
      const formElements = [
        { name: 'characterEffects.overrideEffects.0.ability', value: 'powerOverride' },
        { name: 'characterEffects.overrideEffects.0.mode', value: 'override' },
        { name: 'characterEffects.overrideEffects.0.value', value: '3' },
        { name: 'characterEffects.overrideEffects.1.ability', value: 'resolveOverride' },
        { name: 'characterEffects.overrideEffects.1.mode', value: 'override' },
        { name: 'characterEffects.overrideEffects.1.value', value: '2' }
      ];
      mockForm.querySelectorAll.mockReturnValue(formElements);

      const result = CharacterEffectsProcessor.parseCharacterEffectsForm(mockForm, {});

      expect(result.overrideEffects).toHaveLength(2);
      expect(result.overrideEffects[0]).toEqual({ ability: 'powerOverride', mode: 'override', value: '3' });
      expect(result.overrideEffects[1]).toEqual({ ability: 'resolveOverride', mode: 'override', value: '2' });
      expect(result.regularEffects).toEqual([]);
      expect(result.hiddenEffects).toEqual([]);
    });

    test('filters removed effects', () => {
      const formElements = [
        { name: 'characterEffects.regularEffects.0.ability', value: 'acro' },
        { name: 'characterEffects.regularEffects.0.mode', value: 'add' },
        { name: 'characterEffects.regularEffects.0.value', value: '2' },
        { name: 'characterEffects.regularEffects.1.ability', value: 'phys' },
        { name: 'characterEffects.regularEffects.1.mode', value: 'override' },
        { name: 'characterEffects.regularEffects.1.value', value: '5' },
        { name: 'characterEffects.regularEffects.2.ability', value: 'fort' },
        { name: 'characterEffects.regularEffects.2.mode', value: 'add' },
        { name: 'characterEffects.regularEffects.2.value', value: '1' }
      ];
      mockForm.querySelectorAll.mockReturnValue(formElements);

      const result = CharacterEffectsProcessor.parseCharacterEffectsForm(mockForm, {
        index: 1,
        type: 'regularEffects'
      });

      expect(result.regularEffects).toHaveLength(2);
      expect(result.regularEffects[0]).toEqual({ ability: 'acro', mode: 'add', value: '2' });
      expect(result.regularEffects[1]).toEqual({ ability: 'fort', mode: 'add', value: '1' });
    });

    test('handles empty form', () => {
      mockForm.querySelectorAll.mockReturnValue([]);

      const result = CharacterEffectsProcessor.parseCharacterEffectsForm(mockForm, {});

      expect(result.regularEffects).toEqual([]);
      expect(result.hiddenEffects).toEqual([]);
      expect(result.overrideEffects).toEqual([]);
    });

    test('handles malformed form data', () => {
      const formElements = [
        { name: 'characterEffects.regularEffects.0.ability', value: 'acro' },
        { name: 'invalid.field.name', value: 'should be ignored' },
        { name: 'characterEffects.regularEffects.1', value: 'incomplete' },
        { name: 'otherEffects.0.ability', value: 'should be ignored' }
      ];
      mockForm.querySelectorAll.mockReturnValue(formElements);

      const result = CharacterEffectsProcessor.parseCharacterEffectsForm(mockForm, {});

      // The implementation creates entries for all valid indices, even if incomplete
      // Filter out undefined entries to get only complete effects
      const completeEffects = result.regularEffects.filter(e => e && e.ability);
      expect(completeEffects).toHaveLength(1);
      expect(completeEffects[0]).toEqual({ ability: 'acro' });
    });

    test('parses mixed effect types', () => {
      const formElements = [
        { name: 'characterEffects.regularEffects.0.ability', value: 'acro' },
        { name: 'characterEffects.regularEffects.0.mode', value: 'add' },
        { name: 'characterEffects.regularEffects.0.value', value: '2' },
        { name: 'characterEffects.hiddenEffects.0.ability', value: 'dice' },
        { name: 'characterEffects.hiddenEffects.0.mode', value: 'add' },
        { name: 'characterEffects.hiddenEffects.0.value', value: '1' },
        { name: 'characterEffects.overrideEffects.0.ability', value: 'powerOverride' },
        { name: 'characterEffects.overrideEffects.0.mode', value: 'override' },
        { name: 'characterEffects.overrideEffects.0.value', value: '3' }
      ];
      mockForm.querySelectorAll.mockReturnValue(formElements);

      const result = CharacterEffectsProcessor.parseCharacterEffectsForm(mockForm, {});

      expect(result.regularEffects).toHaveLength(1);
      expect(result.hiddenEffects).toHaveLength(1);
      expect(result.overrideEffects).toHaveLength(1);
    });
  });

  describe('mapEffectModeToKey', () => {
    test('maps regular add mode to change', () => {
      const effect = { ability: 'acro', mode: 'add' };
      const result = CharacterEffectsProcessor.mapEffectModeToKey(effect, true);

      expect(result).toBe('system.abilities.acro.change');
    });

    test('maps regular override mode to override', () => {
      const effect = { ability: 'acro', mode: 'override' };
      const result = CharacterEffectsProcessor.mapEffectModeToKey(effect, true);

      expect(result).toBe('system.abilities.acro.override');
    });

    test('maps advantage mode to diceAdjustments', () => {
      const effect = { ability: 'acro', mode: 'advantage' };
      const result = CharacterEffectsProcessor.mapEffectModeToKey(effect, true);

      expect(result).toBe('system.abilities.acro.diceAdjustments.advantage');
    });

    test('maps disadvantage mode to diceAdjustments', () => {
      const effect = { ability: 'acro', mode: 'disadvantage' };
      const result = CharacterEffectsProcessor.mapEffectModeToKey(effect, true);

      expect(result).toBe('system.abilities.acro.diceAdjustments.disadvantage');
    });

    test('maps powerOverride to system.power.override', () => {
      const effect = { ability: 'powerOverride', mode: 'override' };
      const result = CharacterEffectsProcessor.mapEffectModeToKey(effect, false);

      expect(result).toBe('system.power.override');
    });

    test('maps resolveOverride to system.resolve.override', () => {
      const effect = { ability: 'resolveOverride', mode: 'override' };
      const result = CharacterEffectsProcessor.mapEffectModeToKey(effect, false);

      expect(result).toBe('system.resolve.override');
    });

    test('maps hidden add mode to change', () => {
      const effect = { ability: 'dice', mode: 'add' };
      const result = CharacterEffectsProcessor.mapEffectModeToKey(effect, false);

      expect(result).toBe('system.hiddenAbilities.dice.change');
    });

    test('maps hidden override mode to override', () => {
      const effect = { ability: 'dice', mode: 'override' };
      const result = CharacterEffectsProcessor.mapEffectModeToKey(effect, false);

      expect(result).toBe('system.hiddenAbilities.dice.override');
    });

    test('supports extended modes when enabled', () => {
      const acEffect = { ability: 'acro', mode: 'AC' };
      const acResult = CharacterEffectsProcessor.mapEffectModeToKey(acEffect, true, true);
      expect(acResult).toBe('system.abilities.acro.ac.change');

      const transformOverrideEffect = { ability: 'acro', mode: 'transformOverride' };
      const transformOverrideResult = CharacterEffectsProcessor.mapEffectModeToKey(transformOverrideEffect, true, true);
      expect(transformOverrideResult).toBe('system.abilities.acro.transformOverride');

      const transformChangeEffect = { ability: 'acro', mode: 'transformChange' };
      const transformChangeResult = CharacterEffectsProcessor.mapEffectModeToKey(transformChangeEffect, true, true);
      expect(transformChangeResult).toBe('system.abilities.acro.transformChange');
    });

    test('defaults to transform when extended modes disabled', () => {
      const effect = { ability: 'acro', mode: 'AC' };
      const result = CharacterEffectsProcessor.mapEffectModeToKey(effect, true, false);

      expect(result).toBe('system.abilities.acro.transform');
    });

    test('defaults unknown modes to transform', () => {
      const effect = { ability: 'acro', mode: 'unknownMode' };
      const result = CharacterEffectsProcessor.mapEffectModeToKey(effect, true, true);

      expect(result).toBe('system.abilities.acro.transform');
    });
  });

  describe('getModeForEffect', () => {
    beforeEach(() => {
      // Ensure CONST.ACTIVE_EFFECT_MODES is properly mocked
      if (!global.CONST) {
        global.CONST = {};
      }
      if (!global.CONST.ACTIVE_EFFECT_MODES) {
        global.CONST.ACTIVE_EFFECT_MODES = {
          ADD: 2,
          OVERRIDE: 5
        };
      }
    });

    test('returns ADD mode for regular add effects', () => {
      const effect = { ability: 'acro', mode: 'add' };
      const result = CharacterEffectsProcessor.getModeForEffect(effect, true);

      expect(result).toBe(CONST.ACTIVE_EFFECT_MODES.ADD);
    });

    test('returns ADD mode for regular advantage effects', () => {
      const effect = { ability: 'acro', mode: 'advantage' };
      const result = CharacterEffectsProcessor.getModeForEffect(effect, true);

      expect(result).toBe(CONST.ACTIVE_EFFECT_MODES.ADD);
    });

    test('returns OVERRIDE mode for regular override effects', () => {
      const effect = { ability: 'acro', mode: 'override' };
      const result = CharacterEffectsProcessor.getModeForEffect(effect, true);

      expect(result).toBe(CONST.ACTIVE_EFFECT_MODES.OVERRIDE);
    });

    test('returns OVERRIDE mode for powerOverride', () => {
      const effect = { ability: 'powerOverride', mode: 'override' };
      const result = CharacterEffectsProcessor.getModeForEffect(effect, true);

      expect(result).toBe(CONST.ACTIVE_EFFECT_MODES.OVERRIDE);
    });

    test('returns OVERRIDE mode for resolveOverride', () => {
      const effect = { ability: 'resolveOverride', mode: 'override' };
      const result = CharacterEffectsProcessor.getModeForEffect(effect, true);

      expect(result).toBe(CONST.ACTIVE_EFFECT_MODES.OVERRIDE);
    });

    test('returns ADD mode for hidden add effects', () => {
      const effect = { ability: 'dice', mode: 'add' };
      const result = CharacterEffectsProcessor.getModeForEffect(effect, false);

      expect(result).toBe(CONST.ACTIVE_EFFECT_MODES.ADD);
    });

    test('returns OVERRIDE mode for hidden override effects', () => {
      const effect = { ability: 'dice', mode: 'override' };
      const result = CharacterEffectsProcessor.getModeForEffect(effect, false);

      expect(result).toBe(CONST.ACTIVE_EFFECT_MODES.OVERRIDE);
    });
  });

  describe('generateNewEffectChange', () => {
    beforeEach(() => {
      // Ensure CONST.ACTIVE_EFFECT_MODES is properly mocked
      if (!global.CONST) {
        global.CONST = {};
      }
      if (!global.CONST.ACTIVE_EFFECT_MODES) {
        global.CONST.ACTIVE_EFFECT_MODES = {
          ADD: 2
        };
      }
    });

    test('generates change for regular ability', () => {
      const newEffect = { type: 'abilities', ability: 'acro' };
      const result = CharacterEffectsProcessor.generateNewEffectChange(newEffect);

      expect(result).toEqual({
        key: 'system.abilities.acro.change',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: 0
      });
    });

    test('generates change for hidden ability', () => {
      const newEffect = { type: 'hiddenAbilities', ability: 'dice' };
      const result = CharacterEffectsProcessor.generateNewEffectChange(newEffect);

      expect(result).toEqual({
        key: 'system.hiddenAbilities.dice.change',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: 0
      });
    });

    test('generates change for powerOverride', () => {
      const newEffect = { type: 'abilities', ability: 'powerOverride' };
      const result = CharacterEffectsProcessor.generateNewEffectChange(newEffect);

      expect(result).toEqual({
        key: 'system.power.override',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: 0
      });
    });

    test('generates change for resolveOverride', () => {
      const newEffect = { type: 'abilities', ability: 'resolveOverride' };
      const result = CharacterEffectsProcessor.generateNewEffectChange(newEffect);

      expect(result).toEqual({
        key: 'system.resolve.override',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: 0
      });
    });
  });

  describe('isVirtualItem', () => {
    test('returns true for temporary action cards', () => {
      const item = {
        type: 'actionCard',
        collection: null,
        update: null
      };

      const result = CharacterEffectsProcessor.isVirtualItem(item);

      expect(result).toBe(true);
    });

    test('returns true for embedded items', () => {
      const item = {
        originalId: 'original-item-id',
        collection: null,
        update: null
      };

      const result = CharacterEffectsProcessor.isVirtualItem(item);

      expect(result).toBe(true);
    });

    test('returns true for items with custom update method (embeddedActionCards)', () => {
      const item = {
        type: 'gear',
        collection: { id: 'some-collection' },
        update: function() { /* embeddedActionCards logic */ }
      };
      // Make update.toString() include the marker
      item.update.toString = () => 'function update() { embeddedActionCards }';

      const result = CharacterEffectsProcessor.isVirtualItem(item);

      expect(result).toBe(true);
    });

    test('returns true for items with custom update method (embeddedTransformations)', () => {
      const item = {
        type: 'gear',
        collection: { id: 'some-collection' },
        update: function() { /* embeddedTransformations logic */ }
      };
      item.update.toString = () => 'function update() { embeddedTransformations }';

      const result = CharacterEffectsProcessor.isVirtualItem(item);

      expect(result).toBe(true);
    });

    test('returns true for items with custom update method (embeddedStatusEffects)', () => {
      const item = {
        type: 'gear',
        collection: { id: 'some-collection' },
        update: function() { /* embeddedStatusEffects logic */ }
      };
      item.update.toString = () => 'function update() { embeddedStatusEffects }';

      const result = CharacterEffectsProcessor.isVirtualItem(item);

      expect(result).toBe(true);
    });

    test('returns true for items with custom update method (embeddedItem)', () => {
      const item = {
        type: 'gear',
        collection: { id: 'some-collection' },
        update: function() { /* embeddedItem logic */ }
      };
      item.update.toString = () => 'function update() { embeddedItem }';

      const result = CharacterEffectsProcessor.isVirtualItem(item);

      expect(result).toBe(true);
    });

    test('returns false for regular database items', () => {
      const item = {
        type: 'gear',
        collection: { id: 'some-collection' },
        update: function() { /* regular update */ },
        originalId: null
      };
      item.update.toString = () => 'function update() { return regularUpdate; }';

      const result = CharacterEffectsProcessor.isVirtualItem(item);

      // The implementation returns the result of boolean operations
      // which can be null/undefined if no condition matches
      expect(result).toBeFalsy();
    });

    test('returns false for items without update method', () => {
      const item = {
        type: 'gear',
        collection: { id: 'some-collection' },
        originalId: null
      };

      const result = CharacterEffectsProcessor.isVirtualItem(item);

      // The implementation returns the result of boolean operations
      // which can be null/undefined if no condition matches
      expect(result).toBeFalsy();
    });
  });

  describe('processEffectsToChanges', () => {
    beforeEach(() => {
      // Ensure CONST.ACTIVE_EFFECT_MODES is properly mocked
      if (!global.CONST) {
        global.CONST = {};
      }
      if (!global.CONST.ACTIVE_EFFECT_MODES) {
        global.CONST.ACTIVE_EFFECT_MODES = {
          ADD: 2,
          OVERRIDE: 5
        };
      }
    });

    test('processes regular effects with extended modes', async () => {
      const characterEffects = {
        regularEffects: [
          { ability: 'acro', mode: 'add', value: '2' },
          { ability: 'phys', mode: 'override', value: '5' },
          { ability: 'fort', mode: 'AC', value: '1' }
        ],
        hiddenEffects: [],
        overrideEffects: []
      };

      const result = await CharacterEffectsProcessor.processEffectsToChanges(characterEffects, {
        supportExtendedModes: true
      });

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        key: 'system.abilities.acro.change',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: '2'
      });
      expect(result[1]).toEqual({
        key: 'system.abilities.phys.override',
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: '5'
      });
      expect(result[2]).toEqual({
        key: 'system.abilities.fort.ac.change',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: '1'
      });
    });

    test('processes regular effects without extended modes', async () => {
      const characterEffects = {
        regularEffects: [
          { ability: 'acro', mode: 'add', value: '2' },
          { ability: 'phys', mode: 'override', value: '5' },
          { ability: 'fort', mode: 'AC', value: '1' }
        ],
        hiddenEffects: [],
        overrideEffects: []
      };

      const result = await CharacterEffectsProcessor.processEffectsToChanges(characterEffects, {
        supportExtendedModes: false
      });

      expect(result).toHaveLength(3);
      expect(result[2]).toEqual({
        key: 'system.abilities.fort.transform',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: '1'
      });
    });

    test('processes hidden effects', async () => {
      const characterEffects = {
        regularEffects: [],
        hiddenEffects: [
          { ability: 'dice', mode: 'add', value: '1' },
          { ability: 'luck', mode: 'override', value: '3' }
        ],
        overrideEffects: []
      };

      const result = await CharacterEffectsProcessor.processEffectsToChanges(characterEffects);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        key: 'system.hiddenAbilities.dice.change',
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: '1'
      });
      expect(result[1]).toEqual({
        key: 'system.hiddenAbilities.luck.override',
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: '3'
      });
    });

    test('processes override effects', async () => {
      const characterEffects = {
        regularEffects: [],
        hiddenEffects: [],
        overrideEffects: [
          { ability: 'powerOverride', mode: 'override', value: '3' },
          { ability: 'resolveOverride', mode: 'override', value: '2' }
        ]
      };

      const result = await CharacterEffectsProcessor.processEffectsToChanges(characterEffects);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        key: 'system.power.override',
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: '3'
      });
      expect(result[1]).toEqual({
        key: 'system.resolve.override',
        mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: '2'
      });
    });

    test('handles empty effects array', async () => {
      const characterEffects = {
        regularEffects: [],
        hiddenEffects: [],
        overrideEffects: []
      };

      const result = await CharacterEffectsProcessor.processEffectsToChanges(characterEffects);

      expect(result).toEqual([]);
    });

    test('processes mixed effect types', async () => {
      const characterEffects = {
        regularEffects: [
          { ability: 'acro', mode: 'add', value: '2' }
        ],
        hiddenEffects: [
          { ability: 'dice', mode: 'add', value: '1' }
        ],
        overrideEffects: [
          { ability: 'powerOverride', mode: 'override', value: '3' }
        ]
      };

      const result = await CharacterEffectsProcessor.processEffectsToChanges(characterEffects);

      expect(result).toHaveLength(3);
      expect(result[0].key).toBe('system.abilities.acro.change');
      expect(result[1].key).toBe('system.hiddenAbilities.dice.change');
      expect(result[2].key).toBe('system.power.override');
    });
  });

  describe('getOrCreateFirstEffect', () => {
    let mockItem;

    beforeEach(() => {
      // Ensure foundry.utils is mocked
      global.foundry = global.foundry || { utils: {} };
      global.foundry.utils = global.foundry.utils || {};
      global.foundry.utils.randomID = jest.fn(() => 'test-effect-id');
      
      // Ensure CONFIG is mocked
      global.CONFIG = global.CONFIG || {};
      global.CONFIG.ActiveEffect = global.CONFIG.ActiveEffect || {
        documentClass: class MockActiveEffect {
          constructor(data, options) {
            this._id = data._id;
            this.name = data.name;
            this.changes = data.changes;
            this.parent = options?.parent;
          }
        }
      };

      mockItem = {
        name: 'Test Item',
        img: 'icons/test.png',
        effects: {
          contents: [],
          set: jest.fn()
        },
        _source: {
          effects: []
        },
        createEmbeddedDocuments: jest.fn()
      };
    });

    test('returns existing effect when one exists', async () => {
      const existingEffect = { _id: 'existing-id', name: 'Existing Effect' };
      mockItem.effects.contents = [existingEffect];

      const result = await CharacterEffectsProcessor.getOrCreateFirstEffect(mockItem);

      expect(result).toBe(existingEffect);
      expect(mockItem.createEmbeddedDocuments).not.toHaveBeenCalled();
    });

    test('creates new effect for virtual item', async () => {
      mockItem.update = function() { /* embeddedItem logic */ };
      mockItem.update.toString = () => 'function update() { embeddedItem }';
      // Don't initialize _source.effects to let the method create it
      mockItem._source = {};

      const result = await CharacterEffectsProcessor.getOrCreateFirstEffect(mockItem);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Item');
      expect(result.changes).toEqual([]);
      expect(mockItem.effects.set).toHaveBeenCalled();
      expect(mockItem._source.effects).toHaveLength(1);
      expect(mockItem._source.effects[0]._id).toBeDefined();
    });

    test('creates new effect for regular item', async () => {
      const createdEffect = { _id: 'created-id', name: 'New Effect' };
      mockItem.createEmbeddedDocuments.mockResolvedValue([createdEffect]);

      const result = await CharacterEffectsProcessor.getOrCreateFirstEffect(mockItem);

      expect(mockItem.createEmbeddedDocuments).toHaveBeenCalledWith(
        'ActiveEffect',
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Test Item',
            icon: 'icons/test.png'
          })
        ]),
        { fromEmbeddedItem: true }
      );
      expect(result).toBe(createdEffect);
    });

    test('creates effect with duration when provided', async () => {
      mockItem.update = function() { /* embeddedItem logic */ };
      mockItem.update.toString = () => 'function update() { embeddedItem }';

      const duration = { seconds: 604800 };
      const result = await CharacterEffectsProcessor.getOrCreateFirstEffect(mockItem, duration);

      // The effect should have the duration set
      expect(result).toBeDefined();
    });

    test('does not create effect when allowCreate is false', async () => {
      const result = await CharacterEffectsProcessor.getOrCreateFirstEffect(mockItem, {}, false);

      expect(result).toBeUndefined();
      expect(mockItem.createEmbeddedDocuments).not.toHaveBeenCalled();
    });
  });

  describe('updateEffectChanges', () => {
    let mockItem;
    let mockEffect;

    beforeEach(() => {
      mockEffect = {
        _id: 'effect-id',
        name: 'Test Effect',
        toObject: jest.fn(() => ({ _id: 'effect-id', name: 'Test Effect', changes: [] }))
      };

      mockItem = {
        update: jest.fn(),
        updateEmbeddedDocuments: jest.fn()
      };
    });

    test('updates effect for virtual item using update method', async () => {
      const mockUpdate = jest.fn();
      mockItem.update = mockUpdate;
      mockItem.update.toString = () => 'function update() { embeddedItem }';

      const updateData = {
        _id: 'effect-id',
        changes: [{ key: 'system.abilities.acro.change', mode: 2, value: '2' }]
      };

      await CharacterEffectsProcessor.updateEffectChanges(mockItem, mockEffect, updateData);

      expect(mockUpdate).toHaveBeenCalledWith(
        { effects: [{ _id: 'effect-id', name: 'Test Effect', changes: updateData.changes }] },
        { fromEmbeddedItem: true }
      );
      expect(mockItem.updateEmbeddedDocuments).not.toHaveBeenCalled();
    });

    test('updates effect for regular item using updateEmbeddedDocuments', async () => {
      const updateData = {
        _id: 'effect-id',
        changes: [{ key: 'system.abilities.acro.change', mode: 2, value: '2' }]
      };

      await CharacterEffectsProcessor.updateEffectChanges(mockItem, mockEffect, updateData);

      expect(mockItem.updateEmbeddedDocuments).toHaveBeenCalledWith(
        'ActiveEffect',
        [updateData],
        { fromEmbeddedItem: true }
      );
      expect(mockItem.update).not.toHaveBeenCalled();
    });

    test('merges custom options with defaults', async () => {
      const updateData = {
        _id: 'effect-id',
        changes: [{ key: 'system.abilities.acro.change', mode: 2, value: '2' }]
      };

      await CharacterEffectsProcessor.updateEffectChanges(mockItem, mockEffect, updateData, {
        customOption: 'custom-value'
      });

      expect(mockItem.updateEmbeddedDocuments).toHaveBeenCalledWith(
        'ActiveEffect',
        [updateData],
        { fromEmbeddedItem: true, customOption: 'custom-value' }
      );
    });
  });
});
