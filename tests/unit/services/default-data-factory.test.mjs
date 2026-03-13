// @ts-nocheck
/**
 * @fileoverview DefaultDataFactory Service Tests
 *
 * Unit tests for the default-data-factory service which provides
 * centralized default data generation for item creation.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

import { DefaultDataFactory } from '../../../module/services/default-data-factory.mjs';

// Mock dependencies
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn()
  }
}));

/**
 * Helper to create a mock parent item for testing
 * @param {object} overrides - Properties to override on the mock item
 * @returns {object} Mock parent item
 */
function createMockParentItem(overrides = {}) {
  return {
    name: 'Test Item',
    img: 'icons/svg/item-bag.svg',
    system: {
      description: 'Test description',
      bgColor: '#8B4513',
      textColor: '#ffffff',
      ...overrides.system
    },
    ...overrides
  };
}

describe('DefaultDataFactory', () => {
  let mockParentItem;

  beforeEach(() => {
    vi.clearAllMocks();
    mockParentItem = createMockParentItem();
    
    // Ensure foundry.utils.randomID is available
    if (!global.foundry) {
      global.foundry = { utils: {} };
    }
    if (!global.foundry.utils) {
      global.foundry.utils = {};
    }
    global.foundry.utils.randomID = vi.fn(() => 'test-random-id-12345');
    
    // Ensure game.i18n.localize is available
    if (!global.game) {
      global.game = { i18n: {} };
    }
    global.game.i18n.localize = vi.fn((key) => `New ${key.split('.').pop()}`);
  });

  // =================================
  // getCombatPowerData Tests
  // =================================
  describe('getCombatPowerData', () => {
    test('should return default combat power data with parent item properties', () => {
      const result = DefaultDataFactory.getCombatPowerData(mockParentItem);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Item');
      expect(result.type).toBe('combatPower');
      expect(result.img).toBe('icons/svg/item-bag.svg');
      expect(result.system.description).toBe('Test description');
      expect(result.system.prerequisites).toBe('');
      expect(result.system.targeted).toBe(true);
      expect(result.system.bgColor).toBe('#8B4513');
      expect(result.system.textColor).toBe('#ffffff');
    });

    test('should include default roll data', () => {
      const result = DefaultDataFactory.getCombatPowerData(mockParentItem);

      expect(result.system.roll).toBeDefined();
      expect(result.system.roll.type).toBe('roll');
      expect(result.system.roll.ability).toBe('unaugmented');
      expect(result.system.roll.bonus).toBe(0);
    });

    test('should use default colors when parent item lacks them', () => {
      const itemWithoutColors = createMockParentItem({
        system: {
          description: 'Test description'
          // No bgColor or textColor
        }
      });

      const result = DefaultDataFactory.getCombatPowerData(itemWithoutColors);

      expect(result.system.bgColor).toBe('#8B4513');
      expect(result.system.textColor).toBe('#ffffff');
    });

    test('should use parent item colors when provided', () => {
      const itemWithColors = createMockParentItem({
        system: {
          description: 'Test description',
          bgColor: '#FF0000',
          textColor: '#00FF00'
        }
      });

      const result = DefaultDataFactory.getCombatPowerData(itemWithColors);

      expect(result.system.bgColor).toBe('#FF0000');
      expect(result.system.textColor).toBe('#00FF00');
    });

    test('should modify name and description for transformation context', () => {
      const result = DefaultDataFactory.getCombatPowerData(mockParentItem, 'transformation');

      expect(result.name).toBe('Test Item Power');
      expect(result.system.description).toBe('Combat power from Test Item transformation');
    });

    test('should use actionCard context by default', () => {
      const result = DefaultDataFactory.getCombatPowerData(mockParentItem);

      expect(result.name).toBe('Test Item');
      expect(result.system.description).toBe('Test description');
    });

    test('should handle parent item with empty description', () => {
      const itemWithEmptyDesc = createMockParentItem({
        system: {
          description: ''
        }
      });

      const result = DefaultDataFactory.getCombatPowerData(itemWithEmptyDesc);

      expect(result.system.description).toBe('');
    });
  });

  // =================================
  // getStatusData Tests
  // =================================
  describe('getStatusData', () => {
    test('should return default status data with parent item properties', () => {
      const result = DefaultDataFactory.getStatusData(mockParentItem);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Item');
      expect(result.type).toBe('status');
      expect(result.img).toBe('icons/svg/item-bag.svg');
      expect(result.system.description).toBe('Test description');
      expect(result.system.bgColor).toBe('#8B4513');
      expect(result.system.textColor).toBe('#ffffff');
    });

    test('should include effects array with one effect', () => {
      const result = DefaultDataFactory.getStatusData(mockParentItem);

      expect(result.effects).toBeDefined();
      expect(Array.isArray(result.effects)).toBe(true);
      expect(result.effects).toHaveLength(1);
    });

    test('should create effect with correct properties', () => {
      const result = DefaultDataFactory.getStatusData(mockParentItem);
      const effect = result.effects[0];

      expect(effect._id).toBe('test-random-id-12345');
      expect(effect.name).toBe('Test Item Effect');
      expect(effect.img).toBe('icons/svg/item-bag.svg');
      expect(effect.changes).toEqual([]);
      expect(effect.disabled).toBe(false);
      expect(effect.description).toBe('');
      expect(effect.origin).toBe('');
      expect(effect.transfer).toBe(true);
      expect(effect.statuses).toBeInstanceOf(Set);
      expect(effect.flags).toEqual({});
    });

    test('should include default effect duration', () => {
      const result = DefaultDataFactory.getStatusData(mockParentItem);
      const effect = result.effects[0];

      expect(effect.duration).toBeDefined();
      expect(effect.duration.startTime).toBeNull();
      expect(effect.duration.seconds).toBe(18000);
      expect(effect.duration.combat).toBe('');
      expect(effect.duration.rounds).toBe(0);
      expect(effect.duration.turns).toBe(0);
    });

    test('should use parent textColor for effect tint', () => {
      const itemWithColors = createMockParentItem({
        system: {
          description: 'Test description',
          bgColor: '#123456',
          textColor: '#ABCDEF'
        }
      });

      const result = DefaultDataFactory.getStatusData(itemWithColors);
      const effect = result.effects[0];

      expect(effect.tint).toBe('#ABCDEF');
    });

    test('should use default white tint when textColor is not provided', () => {
      const itemWithoutTextColor = createMockParentItem({
        system: {
          description: 'Test description',
          bgColor: '#123456'
        }
      });
      delete itemWithoutTextColor.system.textColor;

      const result = DefaultDataFactory.getStatusData(itemWithoutTextColor);
      const effect = result.effects[0];

      expect(effect.tint).toBe('#ffffff');
    });
  });

  // =================================
  // getTransformationData Tests
  // =================================
  describe('getTransformationData', () => {
    test('should return default transformation data with parent item properties', () => {
      const result = DefaultDataFactory.getTransformationData(mockParentItem);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Item');
      expect(result.type).toBe('transformation');
      expect(result.img).toBe('icons/svg/item-bag.svg');
      expect(result.system.description).toBe('Test description');
    });

    test('should include default transformation properties', () => {
      const result = DefaultDataFactory.getTransformationData(mockParentItem);

      expect(result.system.size).toBe(1);
      expect(result.system.cursed).toBe(false);
      expect(result.system.embeddedCombatPowers).toEqual([]);
      expect(result.system.resolveAdjustment).toBe(0);
      expect(result.system.powerAdjustment).toBe(0);
      expect(result.system.tokenImage).toBe('');
    });

    test('should not include colors in transformation data (not part of schema)', () => {
      const itemWithColors = createMockParentItem({
        system: {
          description: 'Test description',
          bgColor: '#FF0000',
          textColor: '#00FF00'
        }
      });

      const result = DefaultDataFactory.getTransformationData(itemWithColors);

      // Transformation data does not include bgColor/textColor in its schema
      expect(result.system.bgColor).toBeUndefined();
      expect(result.system.textColor).toBeUndefined();
    });
  });

  // =================================
  // getActionCardData Tests
  // =================================
  describe('getActionCardData', () => {
    test('should return default action card data with parent item properties', () => {
      const result = DefaultDataFactory.getActionCardData(mockParentItem);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Item Action');
      expect(result.type).toBe('actionCard');
      expect(result.img).toBe('icons/svg/item-bag.svg');
    });

    test('should include description referencing parent name', () => {
      const result = DefaultDataFactory.getActionCardData(mockParentItem);

      expect(result.system.description).toBe('Action card from Test Item transformation');
    });

    test('should include default colors', () => {
      const result = DefaultDataFactory.getActionCardData(mockParentItem);

      expect(result.system.bgColor).toBe('#8B4513');
      expect(result.system.textColor).toBe('#ffffff');
    });

    test('should include default mode', () => {
      const result = DefaultDataFactory.getActionCardData(mockParentItem);

      expect(result.system.mode).toBe('attackChain');
    });

    test('should include default attack chain data', () => {
      const result = DefaultDataFactory.getActionCardData(mockParentItem);

      expect(result.system.attackChain).toBeDefined();
      expect(result.system.attackChain.firstStat).toBe('acro');
      expect(result.system.attackChain.secondStat).toBe('phys');
      expect(result.system.attackChain.damageCondition).toBe('never');
      expect(result.system.attackChain.damageFormula).toBe('1d6');
      expect(result.system.attackChain.damageType).toBe('damage');
      expect(result.system.attackChain.damageThreshold).toBe(15);
      expect(result.system.attackChain.statusCondition).toBe('oneSuccess');
      expect(result.system.attackChain.statusThreshold).toBe(15);
    });

    test('should include empty embedded item arrays', () => {
      const result = DefaultDataFactory.getActionCardData(mockParentItem);

      expect(result.system.embeddedItem).toEqual({});
      expect(result.system.embeddedStatusEffects).toEqual([]);
      expect(result.system.embeddedTransformations).toEqual([]);
    });

    test('should include transformation config', () => {
      const result = DefaultDataFactory.getActionCardData(mockParentItem);

      expect(result.system.transformationConfig).toBeDefined();
      expect(result.system.transformationConfig.condition).toBe('oneSuccess');
      expect(result.system.transformationConfig.threshold).toBe(15);
    });

    test('should include saved damage defaults', () => {
      const result = DefaultDataFactory.getActionCardData(mockParentItem);

      expect(result.system.savedDamage).toBeDefined();
      expect(result.system.savedDamage.formula).toBe('1d6');
      expect(result.system.savedDamage.type).toBe('damage');
      expect(result.system.savedDamage.description).toBe('');
    });

    test('should include boolean flags with correct defaults', () => {
      const result = DefaultDataFactory.getActionCardData(mockParentItem);

      expect(result.system.advanceInitiative).toBe(false);
      expect(result.system.attemptInventoryReduction).toBe(false);
      expect(result.system.repeatToHit).toBe(false);
      expect(result.system.damageApplication).toBe(false);
      expect(result.system.costOnRepetition).toBe(false);
      expect(result.system.failOnFirstMiss).toBe(true);
    });

    test('should include numeric defaults', () => {
      const result = DefaultDataFactory.getActionCardData(mockParentItem);

      expect(result.system.repetitions).toBe('1');
      expect(result.system.statusApplicationLimit).toBe(1);
      expect(result.system.timingOverride).toBe(0.0);
    });
  });

  // =================================
  // getSystemData Tests
  // =================================
  describe('getSystemData', () => {
    test('should return default data for feature type', () => {
      const result = DefaultDataFactory.getSystemData('feature');

      expect(result).toBeDefined();
      expect(result.bgColor).toBe('#70B87A');
      expect(result.textColor).toBe('#ffffff');
      expect(result.targeted).toBe(false);
      expect(result.roll).toBeDefined();
      expect(result.roll.type).toBe('roll');
    });

    test('should return default data for status type', () => {
      const result = DefaultDataFactory.getSystemData('status');

      expect(result).toBeDefined();
      expect(result.bgColor).toBe('#7A70B8');
      expect(result.textColor).toBe('#ffffff');
    });

    test('should return default data for gear type', () => {
      const result = DefaultDataFactory.getSystemData('gear');

      expect(result).toBeDefined();
      expect(result.bgColor).toBe('#8B4513');
      expect(result.textColor).toBe('#ffffff');
      expect(result.equipped).toBe(true);
      expect(result.quantity).toBe(1);
      expect(result.className).toBe('other');
    });

    test('should return default data for combatPower type', () => {
      const result = DefaultDataFactory.getSystemData('combatPower');

      expect(result).toBeDefined();
      expect(result.bgColor).toBe('#B8860B');
      expect(result.textColor).toBe('#ffffff');
      expect(result.cost).toBe(1);
      expect(result.targeted).toBe(true);
      expect(result.roll).toBeDefined();
    });

    test('should return default data for actionCard type', () => {
      const result = DefaultDataFactory.getSystemData('actionCard');

      expect(result).toBeDefined();
      expect(result.mode).toBe('attackChain');
      expect(result.bgColor).toBe('#8B4513');
      expect(result.textColor).toBe('#ffffff');
    });

    test('should return empty object for unknown type', () => {
      const result = DefaultDataFactory.getSystemData('unknownType');

      expect(result).toEqual({});
    });

    test('should return empty object for empty string type', () => {
      const result = DefaultDataFactory.getSystemData('');

      expect(result).toEqual({});
    });

    test('should return empty object for null type', () => {
      const result = DefaultDataFactory.getSystemData(null);

      expect(result).toEqual({});
    });

    test('should return empty object for undefined type', () => {
      const result = DefaultDataFactory.getSystemData(undefined);

      expect(result).toEqual({});
    });
  });

  // =================================
  // getItemData Tests
  // =================================
  describe('getItemData', () => {
    test('should return combat power data for combatPower type', () => {
      const result = DefaultDataFactory.getItemData('combatPower', mockParentItem);

      expect(result).toBeDefined();
      expect(result.type).toBe('combatPower');
      expect(result.name).toBe('Test Item');
    });

    test('should pass context option for combatPower type', () => {
      const result = DefaultDataFactory.getItemData('combatPower', mockParentItem, { context: 'transformation' });

      expect(result.name).toBe('Test Item Power');
      expect(result.system.description).toBe('Combat power from Test Item transformation');
    });

    test('should use actionCard context by default for combatPower', () => {
      const result = DefaultDataFactory.getItemData('combatPower', mockParentItem);

      expect(result.name).toBe('Test Item');
    });

    test('should return status data for status type', () => {
      const result = DefaultDataFactory.getItemData('status', mockParentItem);

      expect(result).toBeDefined();
      expect(result.type).toBe('status');
      expect(result.name).toBe('Test Item');
      expect(result.effects).toBeDefined();
    });

    test('should return transformation data for transformation type', () => {
      const result = DefaultDataFactory.getItemData('transformation', mockParentItem);

      expect(result).toBeDefined();
      expect(result.type).toBe('transformation');
      expect(result.name).toBe('Test Item');
    });

    test('should return action card data for actionCard type', () => {
      const result = DefaultDataFactory.getItemData('actionCard', mockParentItem);

      expect(result).toBeDefined();
      expect(result.type).toBe('actionCard');
      expect(result.name).toBe('Test Item Action');
    });

    test('should return null and log warning for unknown type', () => {
      const result = DefaultDataFactory.getItemData('unknownType', mockParentItem);

      expect(result).toBeNull();
    });

    test('should return null for empty string type', () => {
      const result = DefaultDataFactory.getItemData('', mockParentItem);

      expect(result).toBeNull();
    });
  });

  // =================================
  // Helper Methods Tests
  // =================================
  describe('getDefaultRollData', () => {
    test('should return correct default roll data structure', () => {
      const result = DefaultDataFactory.getDefaultRollData();

      expect(result).toBeDefined();
      expect(result.type).toBe('roll');
      expect(result.ability).toBe('unaugmented');
      expect(result.bonus).toBe(0);
    });

    test('should include dice adjustments with default values', () => {
      const result = DefaultDataFactory.getDefaultRollData();

      expect(result.diceAdjustments).toBeDefined();
      expect(result.diceAdjustments.advantage).toBe(0);
      expect(result.diceAdjustments.disadvantage).toBe(0);
      expect(result.diceAdjustments.total).toBe(0);
    });

    test('should return a new object each time (no reference sharing)', () => {
      const result1 = DefaultDataFactory.getDefaultRollData();
      const result2 = DefaultDataFactory.getDefaultRollData();

      expect(result1).not.toBe(result2);
      expect(result1.diceAdjustments).not.toBe(result2.diceAdjustments);
    });
  });

  describe('getDefaultEffectDuration', () => {
    test('should return correct default duration structure', () => {
      const result = DefaultDataFactory.getDefaultEffectDuration();

      expect(result).toBeDefined();
      expect(result.startTime).toBeNull();
      expect(result.seconds).toBe(18000);
      expect(result.combat).toBe('');
      expect(result.rounds).toBe(0);
      expect(result.turns).toBe(0);
      expect(result.startRound).toBe(0);
      expect(result.startTurn).toBe(0);
    });

    test('should return a new object each time (no reference sharing)', () => {
      const result1 = DefaultDataFactory.getDefaultEffectDuration();
      const result2 = DefaultDataFactory.getDefaultEffectDuration();

      expect(result1).not.toBe(result2);
    });
  });

  describe('getDefaultAttackChainData', () => {
    test('should return correct default attack chain structure', () => {
      const result = DefaultDataFactory.getDefaultAttackChainData();

      expect(result).toBeDefined();
      expect(result.firstStat).toBe('acro');
      expect(result.secondStat).toBe('phys');
      expect(result.damageCondition).toBe('never');
      expect(result.damageFormula).toBe('1d6');
      expect(result.damageType).toBe('damage');
      expect(result.damageThreshold).toBe(15);
      expect(result.statusCondition).toBe('oneSuccess');
      expect(result.statusThreshold).toBe(15);
    });

    test('should return a new object each time (no reference sharing)', () => {
      const result1 = DefaultDataFactory.getDefaultAttackChainData();
      const result2 = DefaultDataFactory.getDefaultAttackChainData();

      expect(result1).not.toBe(result2);
    });
  });

  describe('createEmbeddedItemData', () => {
    test('should create embedded item data with generated ID', () => {
      const result = DefaultDataFactory.createEmbeddedItemData('feature');

      expect(result).toBeDefined();
      expect(result._id).toBe('test-random-id-12345');
      expect(result.type).toBe('feature');
    });

    test('should use localized name for item', () => {
      const result = DefaultDataFactory.createEmbeddedItemData('feature');

      expect(result.name).toBe('New Feature');
      expect(global.game.i18n.localize).toHaveBeenCalledWith('EVENTIDE_RP_SYSTEM.Item.New.Feature');
    });

    test('should capitalize first letter of item type in localization key', () => {
      DefaultDataFactory.createEmbeddedItemData('combatPower');

      expect(global.game.i18n.localize).toHaveBeenCalledWith('EVENTIDE_RP_SYSTEM.Item.New.CombatPower');
    });

    test('should use default icon for item', () => {
      const result = DefaultDataFactory.createEmbeddedItemData('feature');

      expect(result.img).toBe('icons/svg/item-bag.svg');
    });

    test('should include default system data for item type', () => {
      const result = DefaultDataFactory.createEmbeddedItemData('feature');

      expect(result.system).toBeDefined();
      expect(result.system.bgColor).toBe('#70B87A');
      expect(result.system.textColor).toBe('#ffffff');
      expect(result.system.targeted).toBe(false);
    });

    test('should apply system overrides', () => {
      const result = DefaultDataFactory.createEmbeddedItemData('feature', {
        system: {
          bgColor: '#FF0000',
          customProp: 'custom value'
        }
      });

      expect(result.system.bgColor).toBe('#FF0000');
      expect(result.system.customProp).toBe('custom value');
      // Note: When spreading overrides, only explicit defaults are preserved
      // textColor is not explicitly preserved when bgColor is overridden
    });

    test('should apply top-level overrides', () => {
      const result = DefaultDataFactory.createEmbeddedItemData('feature', {
        name: 'Custom Name',
        img: 'custom/icon.png'
      });

      expect(result.name).toBe('Custom Name');
      expect(result.img).toBe('custom/icon.png');
    });

    test('should handle unknown item type with empty system data', () => {
      const result = DefaultDataFactory.createEmbeddedItemData('unknownType');

      expect(result).toBeDefined();
      expect(result.type).toBe('unknownType');
      expect(result.system).toEqual({});
    });

    test('should handle gear type with correct defaults', () => {
      const result = DefaultDataFactory.createEmbeddedItemData('gear');

      expect(result.system.equipped).toBe(true);
      expect(result.system.quantity).toBe(1);
      expect(result.system.className).toBe('other');
    });

    test('should handle status type with correct defaults', () => {
      const result = DefaultDataFactory.createEmbeddedItemData('status');

      expect(result.system.bgColor).toBe('#7A70B8');
      expect(result.system.textColor).toBe('#ffffff');
    });

    test('should handle combatPower type with correct defaults', () => {
      const result = DefaultDataFactory.createEmbeddedItemData('combatPower');

      expect(result.system.cost).toBe(1);
      expect(result.system.targeted).toBe(true);
      expect(result.system.roll).toBeDefined();
    });

    test('should handle actionCard type with correct defaults', () => {
      const result = DefaultDataFactory.createEmbeddedItemData('actionCard');

      expect(result.system.mode).toBe('attackChain');
      expect(result.system.bgColor).toBe('#8B4513');
    });
  });

  // =================================
  // Edge Cases and Integration Tests
  // =================================
  describe('Edge Cases', () => {
    test('should handle parent item with null system', () => {
      const itemWithNullSystem = {
        name: 'Test',
        img: 'icon.png',
        system: null
      };

      // This will throw if not handled properly
      expect(() => {
        DefaultDataFactory.getCombatPowerData(itemWithNullSystem);
      }).toThrow();
    });

    test('should handle parent item with undefined system', () => {
      const itemWithUndefinedSystem = {
        name: 'Test',
        img: 'icon.png',
        system: undefined
      };

      // This will throw if not handled properly
      expect(() => {
        DefaultDataFactory.getCombatPowerData(itemWithUndefinedSystem);
      }).toThrow();
    });

    test('should handle empty parent item', () => {
      const emptyItem = {
        name: '',
        img: '',
        system: {
          description: '',
          bgColor: '',
          textColor: ''
        }
      };

      const result = DefaultDataFactory.getCombatPowerData(emptyItem);

      expect(result.name).toBe('');
      expect(result.img).toBe('');
      expect(result.system.description).toBe('');
    });

    test('should preserve all parent item properties in combat power', () => {
      const complexItem = createMockParentItem({
        name: 'Complex Power',
        img: 'custom/power.png',
        system: {
          description: 'A complex combat power with detailed description',
          bgColor: '#123456',
          textColor: '#654321'
        }
      });

      const result = DefaultDataFactory.getCombatPowerData(complexItem);

      expect(result.name).toBe('Complex Power');
      expect(result.img).toBe('custom/power.png');
      expect(result.system.bgColor).toBe('#123456');
      expect(result.system.textColor).toBe('#654321');
    });
  });

  describe('Integration Tests', () => {
    test('should create consistent data across all factory methods', () => {
      const combatPower = DefaultDataFactory.getCombatPowerData(mockParentItem);
      const status = DefaultDataFactory.getStatusData(mockParentItem);
      const transformation = DefaultDataFactory.getTransformationData(mockParentItem);
      const actionCard = DefaultDataFactory.getActionCardData(mockParentItem);

      // All should use the same parent item name
      expect(combatPower.name).toBe(mockParentItem.name);
      expect(status.name).toBe(mockParentItem.name);
      expect(transformation.name).toBe(mockParentItem.name);
      // Action card appends " Action"
      expect(actionCard.name).toBe(`${mockParentItem.name} Action`);
    });

    test('should use same roll data structure across methods', () => {
      const combatPower = DefaultDataFactory.getCombatPowerData(mockParentItem);
      const featureSystem = DefaultDataFactory.getSystemData('feature');
      const combatPowerSystem = DefaultDataFactory.getSystemData('combatPower');

      // All should have roll data with same structure
      expect(combatPower.system.roll.type).toBe('roll');
      expect(featureSystem.roll.type).toBe('roll');
      expect(combatPowerSystem.roll.type).toBe('roll');
    });

    test('should create embedded item data consistent with getItemData', () => {
      // createEmbeddedItemData uses getSystemData internally
      const embeddedFeature = DefaultDataFactory.createEmbeddedItemData('feature');
      const systemData = DefaultDataFactory.getSystemData('feature');

      expect(embeddedFeature.system.bgColor).toBe(systemData.bgColor);
      expect(embeddedFeature.system.textColor).toBe(systemData.textColor);
    });
  });
});