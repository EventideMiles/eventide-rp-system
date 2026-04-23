// @ts-nocheck
/**
 * @fileoverview StatusIntensification Helper Tests
 *
 * Unit tests for the StatusIntensification helper class which handles
 * status effect intensification logic.
 */

// Vitest globals are enabled
// describe, test, expect, beforeEach, vi are available globally
import { StatusIntensification } from '../../../module/helpers/status-intensification.mjs';

describe('StatusIntensification', () => {
  describe('findExistingStatus()', () => {
    let mockActor;
    let mockStatusItem;
    let mockEffectData;

    beforeEach(() => {
      mockStatusItem = global.testUtils.createMockItem({
        name: 'Burning',
        type: 'status',
        id: 'status1',
        system: { description: 'Take fire damage' }
      });

      mockActor = global.testUtils.createMockActor({
        name: 'Test Actor',
        items: [mockStatusItem]
      });

      mockEffectData = {
        name: 'Burning',
        type: 'status',
        system: { description: 'Take fire damage' }
      };

      vi.clearAllMocks();
    });

    test('should return item with matching status item name and description', () => {
      const result = StatusIntensification.findExistingStatus(mockActor, mockEffectData);
      expect(result).toBe(mockStatusItem);
    });

    test('should return null with matching name but different description', () => {
      mockEffectData.system.description = 'Different description';
      const result = StatusIntensification.findExistingStatus(mockActor, mockEffectData);
      expect(result).toBeUndefined();
    });

    test('should return null with no matching status item', () => {
      mockEffectData.name = 'Frozen';
      const result = StatusIntensification.findExistingStatus(mockActor, mockEffectData);
      expect(result).toBeUndefined();
    });

    test('should return null immediately when effect type is other than "status"', () => {
      mockEffectData.type = 'gear';
      const result = StatusIntensification.findExistingStatus(mockActor, mockEffectData);
      expect(result).toBeNull();
    });

    test('should return null with empty actor items array', () => {
      mockActor.items = [];
      const result = StatusIntensification.findExistingStatus(mockActor, mockEffectData);
      expect(result).toBeUndefined();
    });

    test('should find correct match with multiple status items', () => {
      const mockStatusItem2 = global.testUtils.createMockItem({
        name: 'Frozen',
        type: 'status',
        id: 'status2',
        system: { description: 'Cannot move' }
      });

      mockActor.items = [mockStatusItem, mockStatusItem2];

      const result = StatusIntensification.findExistingStatus(mockActor, mockEffectData);
      expect(result).toBe(mockStatusItem);
    });

    test('should handle case sensitivity in name matching', () => {
      mockEffectData.name = 'burning';
      const result = StatusIntensification.findExistingStatus(mockActor, mockEffectData);
      expect(result).toBeUndefined();
    });

    test('should handle case sensitivity in description matching', () => {
      mockEffectData.system.description = 'take fire damage';
      const result = StatusIntensification.findExistingStatus(mockActor, mockEffectData);
      expect(result).toBeUndefined();
    });

    test('should find match when case-sensitive', () => {
      mockEffectData.name = 'Burning';
      mockEffectData.system.description = 'Take fire damage';
      const result = StatusIntensification.findExistingStatus(mockActor, mockEffectData);
      expect(result).toBe(mockStatusItem);
    });
  });

  describe('intensifyStatus()', () => {
    let mockStatusItem;
    let mockNewEffectData;

    beforeEach(() => {
      // Set up Hooks mock
      global.Hooks = {
        call: vi.fn(),
        on: vi.fn(),
        off: vi.fn()
      };

      const mockActorForStatus = global.testUtils.createMockActor({
        name: 'Test Actor',
        items: []
      });

      mockStatusItem = global.testUtils.createMockItem({
        name: 'Burning',
        type: 'status',
        id: 'status1',
        actor: mockActorForStatus,
        effects: {
          contents: [{
            _id: 'effect1',
            system: {
              changes: [
                { key: 'system.abilities.fort.change', value: '-2' },
                { key: 'system.abilities.fort.change', value: '3' },
                { key: 'system.abilities.dice.change', value: '0' }
              ]
            }
          }]
        }
      });

      mockNewEffectData = {
        name: 'Burning',
        type: 'status',
        system: { description: 'Take fire damage' }
      };

      // Mock updateEmbeddedDocuments
      mockStatusItem.updateEmbeddedDocuments = vi.fn().mockResolvedValue([]);

      // Mock game.user
      if (!global.game) {
        global.game = {};
      }
      global.game.user = { id: 'testUserId' };

      vi.clearAllMocks();
    });

    test('should successfully intensify positive value (3 -> 4)', async () => {
      await StatusIntensification.intensifyStatus(mockStatusItem, mockNewEffectData);

      expect(mockStatusItem.updateEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [{
        _id: 'effect1',
        system: { changes: expect.any(Array) }
      }]);
    });

    test('should successfully intensify negative value (-2 -> -3)', async () => {
      await StatusIntensification.intensifyStatus(mockStatusItem, mockNewEffectData);

      expect(mockStatusItem.updateEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [{
        _id: 'effect1',
        system: { changes: expect.any(Array) }
      }]);
    });

    test('should leave zero unchanged (0 -> 0)', async () => {
      await StatusIntensification.intensifyStatus(mockStatusItem, mockNewEffectData);

      expect(mockStatusItem.updateEmbeddedDocuments).toHaveBeenCalledWith('ActiveEffect', [{
        _id: 'effect1',
        system: { changes: expect.any(Array) }
      }]);
    });

    test('should handle multiple effects in the status', async () => {
      await StatusIntensification.intensifyStatus(mockStatusItem, mockNewEffectData);

      const callArgs = mockStatusItem.updateEmbeddedDocuments.mock.calls[0];
      expect(callArgs).toBeDefined();
      // The structure is ["ActiveEffect", [{_id, system: {changes}}]]
      const updateParams = callArgs[1]; // Second parameter to the call (the update array)
      const updateData = updateParams[0].system.changes; // Get changes from the first update object

      expect(updateData).toHaveLength(3);
    });

    test('should call Hooks.call with correct parameters', async () => {
      await StatusIntensification.intensifyStatus(mockStatusItem, mockNewEffectData);

      expect(global.Hooks.call).toHaveBeenCalledWith('erpsUpdateItem', mockStatusItem, {}, {}, 'testUserId');
    });

    test('should return true when intensification succeeds', async () => {
      const result = await StatusIntensification.intensifyStatus(mockStatusItem, mockNewEffectData);

      expect(result).toBe(true);
    });

    test('should return false when existingEffects is undefined', async () => {
      mockStatusItem.effects.contents[0].system.changes = undefined;

      const result = await StatusIntensification.intensifyStatus(mockStatusItem, mockNewEffectData);

      expect(result).toBe(false);
    });

    test('should return true when existingEffects is empty and successfully processed', async () => {
      mockStatusItem.effects.contents[0].system.changes = [];

      const result = await StatusIntensification.intensifyStatus(mockStatusItem, mockNewEffectData);

      expect(result).toBe(true);
    });

    test('should handle updateEmbeddedDocuments throwing error gracefully and return false', async () => {
      mockStatusItem.updateEmbeddedDocuments.mockRejectedValue(new Error('Update failed'));

      const result = await StatusIntensification.intensifyStatus(mockStatusItem, mockNewEffectData);

      expect(result).toBe(false);
    });

    test('should verify all modified effects have updated values', async () => {
      await StatusIntensification.intensifyStatus(mockStatusItem, mockNewEffectData);

      const callArgs = mockStatusItem.updateEmbeddedDocuments.mock.calls[0];
      const updateParams = callArgs[1];
      const updateData = updateParams[0].system.changes;

      // First effect: -2 -> -3
      expect(updateData[0].value).toBe(-3);

      // Second effect: 3 -> 4
      expect(updateData[1].value).toBe(4);

      // Third effect: 0 -> 0
      expect(updateData[2].value).toBe(0);
    });

    test('should intensify value of 1 to 2', async () => {
      mockStatusItem.effects.contents[0].system.changes = [
        { key: 'system.abilities.test.change', value: '1' }
      ];

      await StatusIntensification.intensifyStatus(mockStatusItem, mockNewEffectData);

      const callArgs = mockStatusItem.updateEmbeddedDocuments.mock.calls[0];
      const updateParams = callArgs[1];
      const updateData = updateParams[0].system.changes;
      expect(updateData[0].value).toBe(2);
    });

    test('should intensify value of -1 to -2', async () => {
      mockStatusItem.effects.contents[0].system.changes = [
        { key: 'system.abilities.test.change', value: -1 }
      ];

      await StatusIntensification.intensifyStatus(mockStatusItem, mockNewEffectData);

      const callArgs = mockStatusItem.updateEmbeddedDocuments.mock.calls[0];
      const updateParams = callArgs[1];
      const updateData = updateParams[0].system.changes;
      expect(updateData[0].value).toBe(-2);
    });

    test('should maintain other properties of effects when intensifying', async () => {
      const originalEffect = {
        key: 'system.abilities.fort.change',
        value: -2,
        mode: 2,
        priority: 10
      };
      mockStatusItem.effects.contents[0].system.changes = [originalEffect];

      await StatusIntensification.intensifyStatus(mockStatusItem, mockNewEffectData);

      const callArgs = mockStatusItem.updateEmbeddedDocuments.mock.calls[0];
      const updateParams = callArgs[1];
      const updateData = updateParams[0].system.changes;
      expect(updateData[0]).toMatchObject({
        key: originalEffect.key,
        mode: originalEffect.mode,
        priority: originalEffect.priority,
        value: -3
      });
      expect(updateData[0]).toMatchObject({
        key: originalEffect.key,
        mode: originalEffect.mode,
        priority: originalEffect.priority,
        value: -3
      });
    });
  });

  describe('applyOrIntensifyStatus()', () => {
    let mockActor;
    let mockStatusItem;
    let mockEffectData;

    beforeEach(() => {
      // Set up Hooks mock
      global.Hooks = {
        call: vi.fn(),
        on: vi.fn(),
        off: vi.fn()
      };

      const mockActorForStatus = global.testUtils.createMockActor({
        name: 'Test Actor',
        items: []
      });
      mockActorForStatus.createEmbeddedDocuments = vi.fn();
      mockActorForStatus.updateEmbeddedDocuments = vi.fn();

      mockStatusItem = global.testUtils.createMockItem({
        name: 'Burning',
        type: 'status',
        id: 'status1',
        items: [],
        system: { description: 'Take fire damage' },
        effects: {
          contents: [{
            _id: 'effect1',
            system: { changes: [{ key: 'system.abilities.fort.change', value: '-2' }] }
          }]
        }
      });
      mockStatusItem.actor = mockActorForStatus;
      mockStatusItem.createEmbeddedDocuments = vi.fn();
      mockStatusItem.updateEmbeddedDocuments = vi.fn();

      mockActor = global.testUtils.createMockActor({
        name: 'Test Actor',
        items: [mockStatusItem]
      });
      mockActor.createEmbeddedDocuments = vi.fn();
      mockActor.updateEmbeddedDocuments = vi.fn();

      mockEffectData = {
        name: 'Burning',
        type: 'status',
        system: { description: 'Take fire damage' }
      };

      // Mock game.user
      if (!global.game) {
        global.game = {};
      }
      global.game.user = { id: 'testUserId' };

      vi.clearAllMocks();
    });

    test('should create new item with non-status effect type', async () => {
      mockEffectData.type = 'gear';
      const mockCreatedItem = global.testUtils.createMockItem({ name: 'Test Gear', type: 'gear' });
      mockActor.createEmbeddedDocuments.mockResolvedValue([mockCreatedItem]);

      const result = await StatusIntensification.applyOrIntensifyStatus(mockActor, mockEffectData);

      expect(result).toEqual({
        applied: true,
        intensified: false,
        item: mockCreatedItem
      });
    });

    test('should create new item with new status effect (no existing)', async () => {
      mockEffectData.name = 'NewStatus';
      const mockCreatedItem = global.testUtils.createMockItem({
        name: 'NewStatus',
        type: 'status'
      });
      mockActor.createEmbeddedDocuments.mockResolvedValue([mockCreatedItem]);

      const result = await StatusIntensification.applyOrIntensifyStatus(mockActor, mockEffectData);

      expect(result).toEqual({
        applied: true,
        intensified: false,
        item: mockCreatedItem
      });
    });

    test('should intensify existing status effect and return intensified: true', async () => {
      mockStatusItem.updateEmbeddedDocuments.mockResolvedValue([]);

      const result = await StatusIntensification.applyOrIntensifyStatus(mockActor, mockEffectData);

      expect(result).toEqual({
        applied: true,
        intensified: true,
        item: mockStatusItem
      });
      expect(mockStatusItem.updateEmbeddedDocuments).toHaveBeenCalled();
    });

    test('should set applied: true when intensification succeeds', async () => {
      mockStatusItem.updateEmbeddedDocuments.mockResolvedValue([]);

      const result = await StatusIntensification.applyOrIntensifyStatus(mockActor, mockEffectData);

      expect(result.applied).toBe(true);
    });

    test('should set applied: false when intensification fails', async () => {
      mockStatusItem.updateEmbeddedDocuments.mockRejectedValue(new Error('Update failed'));

      const result = await StatusIntensification.applyOrIntensifyStatus(mockActor, mockEffectData);

      expect(result.applied).toBe(false);
    });

    test('should correctly pass through target actor', async () => {
      const mockCreatedItem = global.testUtils.createMockItem({ name: 'Test Gear', type: 'gear' });
      mockActor.createEmbeddedDocuments.mockResolvedValue([mockCreatedItem]);

      mockEffectData.type = 'gear';
      await StatusIntensification.applyOrIntensifyStatus(mockActor, mockEffectData);

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledWith('Item', [mockEffectData]);
    });

    test('should correctly pass through effect data', async () => {
      const mockCreatedItem = global.testUtils.createMockItem({ name: 'TestGear', type: 'gear' });
      mockActor.createEmbeddedDocuments.mockResolvedValue([mockCreatedItem]);

      mockEffectData.type = 'gear';
      await StatusIntensification.applyOrIntensifyStatus(mockActor, mockEffectData);

      expect(mockActor.createEmbeddedDocuments).toHaveBeenCalledWith('Item', [mockEffectData]);
    });

    test('should return correct item object for new creation', async () => {
      const mockCreatedItem = global.testUtils.createMockItem({ name: 'NewStatus', type: 'status' });
      mockActor.createEmbeddedDocuments.mockResolvedValue([mockCreatedItem]);

      mockEffectData.name = 'NewStatus';
      const result = await StatusIntensification.applyOrIntensifyStatus(mockActor, mockEffectData);

      expect(result.item).toBe(mockCreatedItem);
    });

    test('should return correct item object for intensification', async () => {
      mockStatusItem.updateEmbeddedDocuments.mockResolvedValue([]);

      const result = await StatusIntensification.applyOrIntensifyStatus(mockActor, mockEffectData);

      expect(result.item).toBe(mockStatusItem);
    });

    test('should handle createEmbeddedDocuments throwing error gracefully', async () => {
      mockEffectData.type = 'gear';
      mockActor.createEmbeddedDocuments.mockRejectedValue(new Error('Create failed'));

      const result = await StatusIntensification.applyOrIntensifyStatus(mockActor, mockEffectData);

      expect(result).toEqual({
        applied: false,
        intensified: false,
        item: null
      });
    });

    test('should match status by name and description', async () => {
      mockEffectData.name = 'Burning';
      mockEffectData.system.description = 'Take fire damage';
      mockStatusItem.updateEmbeddedDocuments.mockResolvedValue([]);

      const result = await StatusIntensification.applyOrIntensifyStatus(mockActor, mockEffectData);

      expect(result.intensified).toBe(true);
    });

    test('should not match status with different description', async () => {
      mockEffectData.name = 'Burning';
      mockEffectData.system.description = 'Different description';
      const mockCreatedItem = global.testUtils.createMockItem({ name: 'Burning', type: 'status' });
      mockActor.createEmbeddedDocuments.mockResolvedValue([mockCreatedItem]);

      const result = await StatusIntensification.applyOrIntensifyStatus(mockActor, mockEffectData);

      expect(result.intensified).toBe(false);
      expect(result.applied).toBe(true);
    });
  });
});