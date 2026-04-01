// @ts-nocheck
/**
 * @fileoverview Tests for ContextPreparationHelper service
 *
 * Tests the context preparation methods for item sheet templates.
 */

import { ContextPreparationHelper } from '../../../module/services/context-preparation-helper.mjs';

// Mock dependencies
vi.mock('../../../module/ui/components/_module.mjs', () => ({
  EventideSheetHelpers: {
    rollTypeObject: {
      attack: 'Attack',
      defense: 'Defense',
      check: 'Check',
    },
    abilityObject: {
      acro: 'Acrobatics',
      phys: 'Physique',
      soc: 'Social',
      ment: 'Mental',
      tech: 'Technology',
      surv: 'Survival',
    },
  },
}));

vi.mock('../../../module/helpers/_module.mjs', () => ({
  prepareActiveEffectCategories: vi.fn(),
  prepareCharacterEffects: vi.fn(),
}));

describe('ContextPreparationHelper', () => {
  let mockEventideSheetHelpers;
  let mockPrepareActiveEffectCategories;
  let mockPrepareCharacterEffects;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup mock foundry
    global.foundry = {
      applications: {
        ux: {
          TextEditor: {
            implementation: {
              enrichHTML: vi.fn(),
            },
          },
        },
      },
    };

    // Get mocked modules
    const { EventideSheetHelpers } = await import(
      '../../../module/ui/components/_module.mjs'
    );
    mockEventideSheetHelpers = EventideSheetHelpers;

    const { prepareActiveEffectCategories, prepareCharacterEffects } = await import(
      '../../../module/helpers/_module.mjs'
    );
    mockPrepareActiveEffectCategories = prepareActiveEffectCategories;
    mockPrepareCharacterEffects = prepareCharacterEffects;
  });

  describe('ROLL_TYPE_ITEM_TYPES', () => {
    test('should include attributesCombatPower', () => {
      expect(ContextPreparationHelper.ROLL_TYPE_ITEM_TYPES.has('attributesCombatPower')).toBe(
        true,
      );
    });

    test('should include attributesGear', () => {
      expect(ContextPreparationHelper.ROLL_TYPE_ITEM_TYPES.has('attributesGear')).toBe(true);
    });

    test('should include attributesFeature', () => {
      expect(ContextPreparationHelper.ROLL_TYPE_ITEM_TYPES.has('attributesFeature')).toBe(
        true,
      );
    });

    test('should include attributesActionCard', () => {
      expect(ContextPreparationHelper.ROLL_TYPE_ITEM_TYPES.has('attributesActionCard')).toBe(
        true,
      );
    });

    test('should include attributesActionCardConfig', () => {
      expect(
        ContextPreparationHelper.ROLL_TYPE_ITEM_TYPES.has('attributesActionCardConfig'),
      ).toBe(true);
    });

    test('should not include non-roll type item types', () => {
      expect(ContextPreparationHelper.ROLL_TYPE_ITEM_TYPES.has('description')).toBe(false);
      expect(ContextPreparationHelper.ROLL_TYPE_ITEM_TYPES.has('effects')).toBe(false);
    });
  });

  describe('SIZE_OPTIONS', () => {
    test('should contain standard size values', () => {
      expect(ContextPreparationHelper.SIZE_OPTIONS).toEqual([
        0, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5,
      ]);
    });
  });

  describe('prepareAttributesContext()', () => {
    test('should set tab from context tabs', () => {
      // Arrange
      const context = {
        tabs: {
          attributesFeature: { active: true },
        },
      };

      // Act
      const result = ContextPreparationHelper.prepareAttributesContext(
        'attributesFeature',
        context,
      );

      // Assert
      expect(result.tab).toEqual({ active: true });
    });

    test('should add rollTypes for roll type item types', () => {
      // Arrange
      const context = {
        tabs: {
          attributesFeature: { active: true },
        },
      };

      // Act
      const result = ContextPreparationHelper.prepareAttributesContext(
        'attributesFeature',
        context,
      );

      // Assert
      expect(result.rollTypes).toEqual(mockEventideSheetHelpers.rollTypeObject);
    });

    test('should add abilities for roll type item types', () => {
      // Arrange
      const context = {
        tabs: {
          attributesFeature: { active: true },
        },
      };

      // Act
      const result = ContextPreparationHelper.prepareAttributesContext(
        'attributesFeature',
        context,
      );

      // Assert
      expect(result.abilities).toEqual({
        ...mockEventideSheetHelpers.abilityObject,
        unaugmented: 'unaugmented',
      });
    });

    test('should include unaugmented in abilities', () => {
      // Arrange
      const context = {
        tabs: {
          attributesFeature: { active: true },
        },
      };

      // Act
      const result = ContextPreparationHelper.prepareAttributesContext(
        'attributesFeature',
        context,
      );

      // Assert
      expect(result.abilities.unaugmented).toBe('unaugmented');
    });

    test('should not add rollTypes for non-roll type item types', () => {
      // Arrange
      const context = {
        tabs: {
          description: { active: true },
        },
      };

      // Act
      const result = ContextPreparationHelper.prepareAttributesContext('description', context);

      // Assert
      expect(result.rollTypes).toBeUndefined();
    });

    test('should not add abilities for non-roll type item types', () => {
      // Arrange
      const context = {
        tabs: {
          description: { active: true },
        },
      };

      // Act
      const result = ContextPreparationHelper.prepareAttributesContext('description', context);

      // Assert
      expect(result.abilities).toBeUndefined();
    });

    test('should add sizeOptions to context', () => {
      // Arrange
      const context = {
        tabs: {
          attributesFeature: { active: true },
        },
      };

      // Act
      const result = ContextPreparationHelper.prepareAttributesContext(
        'attributesFeature',
        context,
      );

      // Assert
      expect(result.sizeOptions).toEqual(ContextPreparationHelper.SIZE_OPTIONS);
    });

    test('should return updated context object', () => {
      // Arrange
      const context = {
        tabs: {
          attributesFeature: { active: true },
        },
        existingProperty: 'value',
      };

      // Act
      const result = ContextPreparationHelper.prepareAttributesContext(
        'attributesFeature',
        context,
      );

      // Assert
      expect(result.existingProperty).toBe('value');
      expect(result).toBe(context); // Should return the same object
    });
  });

  describe('prepareActionCardGroups()', () => {
    test('should group action cards by groupId', () => {
      // Arrange
      const actionCards = [
        { id: 'card1', system: { groupId: 'group1' } },
        { id: 'card2', system: { groupId: 'group1' } },
        { id: 'card3', system: { groupId: 'group2' } },
      ];
      const groups = [
        { _id: 'group1', sort: 0, name: 'Group 1' },
        { _id: 'group2', sort: 1, name: 'Group 2' },
      ];

      // Act
      const result = ContextPreparationHelper.prepareActionCardGroups(actionCards, groups);

      // Assert
      expect(result.groupedActionCards).toHaveLength(2);
      expect(result.groupedActionCards[0].cards).toHaveLength(2);
      expect(result.groupedActionCards[1].cards).toHaveLength(1);
    });

    test('should sort groups by sort order', () => {
      // Arrange
      const actionCards = [
        { id: 'card1', system: { groupId: 'group2' } },
        { id: 'card2', system: { groupId: 'group1' } },
      ];
      const groups = [
        { _id: 'group2', sort: 1, name: 'Group 2' },
        { _id: 'group1', sort: 0, name: 'Group 1' },
      ];

      // Act
      const result = ContextPreparationHelper.prepareActionCardGroups(actionCards, groups);

      // Assert
      expect(result.groupedActionCards[0].id).toBe('group1');
      expect(result.groupedActionCards[1].id).toBe('group2');
    });

    test('should handle groups without sort property', () => {
      // Arrange
      const actionCards = [
        { id: 'card1', system: { groupId: 'group1' } },
        { id: 'card2', system: { groupId: 'group2' } },
      ];
      const groups = [
        { _id: 'group2', name: 'Group 2' },
        { _id: 'group1', name: 'Group 1' },
      ];

      // Act
      const result = ContextPreparationHelper.prepareActionCardGroups(actionCards, groups);

      // Assert
      expect(result.groupedActionCards).toHaveLength(2);
    });

    test('should add id field to groups for Handlebars compatibility', () => {
      // Arrange
      const actionCards = [{ id: 'card1', system: { groupId: 'group1' } }];
      const groups = [{ _id: 'group1', sort: 0, name: 'Group 1' }];

      // Act
      const result = ContextPreparationHelper.prepareActionCardGroups(actionCards, groups);

      // Assert
      expect(result.groupedActionCards[0].id).toBe('group1');
    });

    test('should set collapsed to false for groups', () => {
      // Arrange
      const actionCards = [{ id: 'card1', system: { groupId: 'group1' } }];
      const groups = [{ _id: 'group1', sort: 0, name: 'Group 1' }];

      // Act
      const result = ContextPreparationHelper.prepareActionCardGroups(actionCards, groups);

      // Assert
      expect(result.groupedActionCards[0].collapsed).toBe(false);
    });

    test('should add id field to cards for Handlebars compatibility', () => {
      // Arrange
      const actionCards = [{ _id: 'card1', system: { groupId: 'group1' } }];
      const groups = [{ _id: 'group1', sort: 0, name: 'Group 1' }];

      // Act
      const result = ContextPreparationHelper.prepareActionCardGroups(actionCards, groups);

      // Assert
      expect(result.groupedActionCards[0].cards[0].id).toBe('card1');
    });

    test('should use card.id if available, otherwise card._id', () => {
      // Arrange
      const actionCards = [
        { id: 'card1', _id: 'card1_alt', system: { groupId: 'group1' } },
      ];
      const groups = [{ _id: 'group1', sort: 0, name: 'Group 1' }];

      // Act
      const result = ContextPreparationHelper.prepareActionCardGroups(actionCards, groups);

      // Assert
      expect(result.groupedActionCards[0].cards[0].id).toBe('card1');
    });

    test('should filter out groups with no cards', () => {
      // Arrange
      const actionCards = [{ id: 'card1', system: { groupId: 'group1' } }];
      const groups = [
        { _id: 'group1', sort: 0, name: 'Group 1' },
        { _id: 'group2', sort: 1, name: 'Group 2' },
      ];

      // Act
      const result = ContextPreparationHelper.prepareActionCardGroups(actionCards, groups);

      // Assert
      expect(result.groupedActionCards).toHaveLength(1);
      expect(result.groupedActionCards[0].id).toBe('group1');
    });

    test('should return ungrouped action cards', () => {
      // Arrange
      const actionCards = [
        { id: 'card1', system: { groupId: 'group1' } },
        { id: 'card2', system: {} },
        { id: 'card3', system: { groupId: null } },
      ];
      const groups = [{ _id: 'group1', sort: 0, name: 'Group 1' }];

      // Act
      const result = ContextPreparationHelper.prepareActionCardGroups(actionCards, groups);

      // Assert
      expect(result.ungroupedActionCards).toHaveLength(2);
    });

    test('should add id field to ungrouped cards', () => {
      // Arrange
      const actionCards = [{ _id: 'card1', system: {} }];
      const groups = [];

      // Act
      const result = ContextPreparationHelper.prepareActionCardGroups(actionCards, groups);

      // Assert
      expect(result.ungroupedActionCards[0].id).toBe('card1');
    });

    test('should handle empty action cards array', () => {
      // Arrange
      const actionCards = [];
      const groups = [{ _id: 'group1', sort: 0, name: 'Group 1' }];

      // Act
      const result = ContextPreparationHelper.prepareActionCardGroups(actionCards, groups);

      // Assert
      expect(result.groupedActionCards).toHaveLength(0);
      expect(result.ungroupedActionCards).toHaveLength(0);
    });

    test('should handle empty groups array', () => {
      // Arrange
      const actionCards = [
        { id: 'card1', system: {} },
        { id: 'card2', system: { groupId: null } },
      ];
      const groups = [];

      // Act
      const result = ContextPreparationHelper.prepareActionCardGroups(actionCards, groups);

      // Assert
      expect(result.groupedActionCards).toHaveLength(0);
      expect(result.ungroupedActionCards).toHaveLength(2);
    });
  });

  describe('getSizeOptions()', () => {
    test('should return SIZE_OPTIONS array', () => {
      // Act
      const result = ContextPreparationHelper.getSizeOptions();

      // Assert
      expect(result).toEqual(ContextPreparationHelper.SIZE_OPTIONS);
    });
  });

  describe('prepareDescriptionContext()', () => {
    test('should enrich description HTML', async () => {
      // Arrange
      const description = 'Test description with [[/roll 1d20]]';
      const document = {
        getRollData: vi.fn(() => ({ ability: 5 })),
      };
      global.foundry.applications.ux.TextEditor.implementation.enrichHTML.mockResolvedValue(
        '<p>Enriched HTML</p>',
      );

      // Act
      const result = await ContextPreparationHelper.prepareDescriptionContext(
        description,
        document,
        true,
      );

      // Assert
      expect(
        global.foundry.applications.ux.TextEditor.implementation.enrichHTML,
      ).toHaveBeenCalledWith(description, {
        secrets: true,
        rollData: { ability: 5 },
        relativeTo: document,
      });
      expect(result).toBe('<p>Enriched HTML</p>');
    });

    test('should pass isOwner to secrets option', async () => {
      // Arrange
      const description = 'Test description';
      const document = {
        getRollData: vi.fn(() => ({})),
      };
      global.foundry.applications.ux.TextEditor.implementation.enrichHTML.mockResolvedValue(
        '<p>Enriched</p>',
      );

      // Act
      await ContextPreparationHelper.prepareDescriptionContext(description, document, false);

      // Assert
      expect(
        global.foundry.applications.ux.TextEditor.implementation.enrichHTML,
      ).toHaveBeenCalledWith(description, {
        secrets: false,
        rollData: {},
        relativeTo: document,
      });
    });

    test('should call getRollData on document', async () => {
      // Arrange
      const description = 'Test description';
      const document = {
        getRollData: vi.fn(() => ({ test: 'data' })),
      };
      global.foundry.applications.ux.TextEditor.implementation.enrichHTML.mockResolvedValue(
        '<p>Enriched</p>',
      );

      // Act
      await ContextPreparationHelper.prepareDescriptionContext(description, document, true);

      // Assert
      expect(document.getRollData).toHaveBeenCalled();
    });
  });

  describe('prepareEmbeddedItemsContext()', () => {
    test('should get embedded item from item', async () => {
      // Arrange
      const item = {
        getEmbeddedItem: vi.fn(() => ({ id: 'embedded-1' })),
        getEmbeddedEffects: vi.fn(() => []),
        getEmbeddedTransformations: vi.fn(async () => []),
      };

      // Act
      const result = await ContextPreparationHelper.prepareEmbeddedItemsContext(item);

      // Assert
      expect(item.getEmbeddedItem).toHaveBeenCalled();
      expect(result.embeddedItem).toEqual({ id: 'embedded-1' });
    });

    test('should get embedded effects from item', async () => {
      // Arrange
      const item = {
        getEmbeddedItem: vi.fn(() => null),
        getEmbeddedEffects: vi.fn(() => [{ id: 'effect-1' }]),
        getEmbeddedTransformations: vi.fn(async () => []),
      };

      // Act
      const result = await ContextPreparationHelper.prepareEmbeddedItemsContext(item);

      // Assert
      expect(item.getEmbeddedEffects).toHaveBeenCalled();
      expect(result.embeddedEffects).toEqual([{ id: 'effect-1' }]);
    });

    test('should get embedded transformations from item', async () => {
      // Arrange
      const item = {
        getEmbeddedItem: vi.fn(() => null),
        getEmbeddedEffects: vi.fn(() => []),
        getEmbeddedTransformations: vi.fn(async () => [{ id: 'trans-1' }]),
      };

      // Act
      const result = await ContextPreparationHelper.prepareEmbeddedItemsContext(item);

      // Assert
      expect(item.getEmbeddedTransformations).toHaveBeenCalled();
      expect(result.embeddedTransformations).toEqual([{ id: 'trans-1' }]);
    });

    test('should handle missing getEmbeddedTransformations method', async () => {
      // Arrange
      const item = {
        getEmbeddedItem: vi.fn(() => null),
        getEmbeddedEffects: vi.fn(() => []),
      };

      // Act
      const result = await ContextPreparationHelper.prepareEmbeddedItemsContext(item);

      // Assert
      expect(result.embeddedTransformations).toEqual([]);
    });
  });

  describe('prepareEmbeddedCombatPowersContext()', () => {
    test('should get embedded combat powers from item', () => {
      // Arrange
      const item = {
        system: {
          getEmbeddedCombatPowers: vi.fn(() => [{ id: 'power-1' }]),
        },
      };

      // Act
      const result = ContextPreparationHelper.prepareEmbeddedCombatPowersContext(item);

      // Assert
      expect(item.system.getEmbeddedCombatPowers).toHaveBeenCalled();
      expect(result.embeddedCombatPowers).toEqual([{ id: 'power-1' }]);
    });
  });

  describe('prepareEmbeddedActionCardsContext()', () => {
    test('should get embedded action cards from item', () => {
      // Arrange
      const item = {
        system: {
          getEmbeddedActionCards: vi.fn(() => [{ id: 'card-1', system: {} }]),
          actionCardGroups: [],
        },
      };

      // Act
      const result = ContextPreparationHelper.prepareEmbeddedActionCardsContext(item);

      // Assert
      expect(item.system.getEmbeddedActionCards).toHaveBeenCalled();
      expect(result.embeddedActionCards).toEqual([{ id: 'card-1', system: {} }]);
    });

    test('should prepare grouped and ungrouped action cards', () => {
      // Arrange
      const item = {
        system: {
          getEmbeddedActionCards: vi.fn(() => [
            { id: 'card1', system: { groupId: 'group1' } },
            { id: 'card2', system: {} },
          ]),
          actionCardGroups: [{ _id: 'group1', sort: 0, name: 'Group 1' }],
        },
      };

      // Act
      const result = ContextPreparationHelper.prepareEmbeddedActionCardsContext(item);

      // Assert
      expect(result.groupedActionCards).toHaveLength(1);
      expect(result.ungroupedActionCards).toHaveLength(1);
    });

    test('should use actionCardGroups from item system', () => {
      // Arrange
      const item = {
        system: {
          getEmbeddedActionCards: vi.fn(() => []),
          actionCardGroups: [{ _id: 'group1', sort: 0 }],
        },
      };

      // Act
      const result = ContextPreparationHelper.prepareEmbeddedActionCardsContext(item);

      // Assert
      expect(result.groupedActionCards).toHaveLength(0);
    });

    test('should handle missing actionCardGroups', () => {
      // Arrange
      const item = {
        system: {
          getEmbeddedActionCards: vi.fn(() => [{ id: 'card1', system: {} }]),
        },
      };

      // Act
      const result = ContextPreparationHelper.prepareEmbeddedActionCardsContext(item);

      // Assert
      expect(result.groupedActionCards).toHaveLength(0);
      expect(result.ungroupedActionCards).toHaveLength(1);
    });
  });

  describe('preparePrerequisitesContext()', () => {
    test('should set prerequisites from item system', () => {
      // Arrange
      const item = {
        system: {
          prerequisites: [{ type: 'ability', value: 'acro', min: 3 }],
        },
      };
      const context = {
        tabs: {
          prerequisites: { active: true },
        },
      };

      // Act
      const result = ContextPreparationHelper.preparePrerequisitesContext(item, context);

      // Assert
      expect(result.prerequisites).toEqual([{ type: 'ability', value: 'acro', min: 3 }]);
    });

    test('should set tab from context tabs', () => {
      // Arrange
      const item = {
        system: {
          prerequisites: [],
        },
      };
      const context = {
        tabs: {
          prerequisites: { active: true },
        },
      };

      // Act
      const result = ContextPreparationHelper.preparePrerequisitesContext(item, context);

      // Assert
      expect(result.tab).toEqual({ active: true });
    });

    test('should return updated context object', () => {
      // Arrange
      const item = {
        system: {
          prerequisites: [],
        },
      };
      const context = {
        tabs: {
          prerequisites: { active: true },
        },
        existingProperty: 'value',
      };

      // Act
      const result = ContextPreparationHelper.preparePrerequisitesContext(item, context);

      // Assert
      expect(result.existingProperty).toBe('value');
      expect(result).toBe(context);
    });
  });

  describe('prepareEffectsContext()', () => {
    test('should set tab from context tabs', async () => {
      // Arrange
      const effectsCollection = { contents: [] };
      const context = {
        tabs: {
          effects: { active: true },
        },
      };
      mockPrepareActiveEffectCategories.mockResolvedValue({ passive: [], active: [] });

      // Act
      const result = await ContextPreparationHelper.prepareEffectsContext(
        effectsCollection,
        context,
      );

      // Assert
      expect(result.tab).toEqual({ active: true });
    });

    test('should prepare active effect categories', async () => {
      // Arrange
      const effectsCollection = { contents: [{ id: 'effect-1' }] };
      const context = {
        tabs: {
          effects: { active: true },
        },
      };
      mockPrepareActiveEffectCategories.mockResolvedValue({ passive: [], active: [] });

      // Act
      const result = await ContextPreparationHelper.prepareEffectsContext(
        effectsCollection,
        context,
      );

      // Assert
      expect(mockPrepareActiveEffectCategories).toHaveBeenCalledWith(effectsCollection);
      expect(result.effects).toEqual({ passive: [], active: [] });
    });

    test('should return updated context object', async () => {
      // Arrange
      const effectsCollection = { contents: [] };
      const context = {
        tabs: {
          effects: { active: true },
        },
        existingProperty: 'value',
      };
      mockPrepareActiveEffectCategories.mockResolvedValue({ passive: [], active: [] });

      // Act
      const result = await ContextPreparationHelper.prepareEffectsContext(
        effectsCollection,
        context,
      );

      // Assert
      expect(result.existingProperty).toBe('value');
      expect(result).toBe(context);
    });
  });

  describe('prepareCharacterEffectsContext()', () => {
    test('should set tab from context tabs', async () => {
      // Arrange
      const effectsCollection = { contents: [] };
      const context = {
        tabs: {
          characterEffects: { active: true },
        },
      };

      // Act
      const result = await ContextPreparationHelper.prepareCharacterEffectsContext(
        effectsCollection,
        context,
      );

      // Assert
      expect(result.tab).toEqual({ active: true });
    });

    test('should prepare character effects when effects exist', async () => {
      // Arrange
      const effectsCollection = {
        contents: [{ id: 'effect-1', system: { regularEffects: [] } }],
      };
      const context = {
        tabs: {
          characterEffects: { active: true },
        },
      };
      mockPrepareCharacterEffects.mockResolvedValue({
        fullEffects: [],
        regularEffects: [],
        hiddenEffects: [],
      });

      // Act
      const result = await ContextPreparationHelper.prepareCharacterEffectsContext(
        effectsCollection,
        context,
      );

      // Assert
      expect(mockPrepareCharacterEffects).toHaveBeenCalledWith(
        effectsCollection.contents[0],
      );
      expect(result.characterEffects).toEqual({
        fullEffects: [],
        regularEffects: [],
        hiddenEffects: [],
      });
    });

    test('should return empty character effects structure when no effects exist', async () => {
      // Arrange
      const effectsCollection = { contents: [] };
      const context = {
        tabs: {
          characterEffects: { active: true },
        },
      };

      // Act
      const result = await ContextPreparationHelper.prepareCharacterEffectsContext(
        effectsCollection,
        context,
      );

      // Assert
      expect(mockPrepareCharacterEffects).not.toHaveBeenCalled();
      expect(result.characterEffects).toEqual({
        fullEffects: [],
        regularEffects: [],
        hiddenEffects: [],
      });
    });

    test('should return updated context object', async () => {
      // Arrange
      const effectsCollection = { contents: [] };
      const context = {
        tabs: {
          characterEffects: { active: true },
        },
        existingProperty: 'value',
      };

      // Act
      const result = await ContextPreparationHelper.prepareCharacterEffectsContext(
        effectsCollection,
        context,
      );

      // Assert
      expect(result.existingProperty).toBe('value');
      expect(result).toBe(context);
    });
  });
});
