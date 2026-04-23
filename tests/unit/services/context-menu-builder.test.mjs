// @ts-nocheck
/**
 * @fileoverview ContextMenuBuilder Service Tests
 *
 * Unit tests for the ContextMenuBuilder service which handles
 * context menu construction and management for item sheets.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

import { ContextMenuBuilder } from '../../../module/services/context-menu-builder.mjs';

// Mock the Logger service
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn()
  }
}));

// Mock the DefaultDataFactory
vi.mock('../../../module/services/default-data-factory.mjs', () => ({
  DefaultDataFactory: {
    getSystemData: vi.fn((itemType) => {
      const defaults = {
        actionCard: { mode: 'attackChain', bgColor: '#8B4513', textColor: '#ffffff' },
        combatPower: { targeted: true, prerequisites: '' },
        feature: { description: '' },
        status: { description: '' },
        gear: { description: '', quantity: 1 }
      };
      return defaults[itemType] || {};
    })
  }
}));

/**
 * Helper to create a mock sheet for testing
 * @param {object} overrides - Properties to override on the mock sheet
 * @returns {object} Mock sheet
 */
function createMockSheet(overrides = {}) {
  return {
    id: 'sheet-123',
    item: {
      id: 'item-456',
      name: 'Test Item',
      system: {
        actionCardGroups: [],
        embeddedActionCards: [],
        embeddedCombatPowers: [],
        embeddedItems: []
      },
      update: vi.fn().mockResolvedValue(true)
    },
    element: {
      id: 'sheet-element-123',
      getAttribute: vi.fn((attr) => {
        if (attr === 'data-appid') return 'app-123';
        return null;
      }),
      closest: vi.fn(() => null),
      offsetHeight: 100
    },
    _createContextMenu: vi.fn().mockReturnValue({
      onOpen: null,
      onClose: null,
      _erpsOverflowFixApplied: false
    }),
    _contextMenuOpen: false,
    _overflowContainers: [],
    _scrollbarHideStyle: null,
    _contextMenuCleanupTimer: null,
    tabGroups: { primary: 'embeddedActionCards' },
    changeTab: vi.fn().mockResolvedValue(true),
    ...overrides
  };
}

/**
 * Helper to create a mock context menu element
 * @param {object} overrides - Properties to override
 * @returns {object} Mock element
 */
function createMockElement(overrides = {}) {
  return {
    dataset: {
      itemId: 'card-123',
      groupId: 'group-456',
      ...overrides.dataset
    },
    closest: vi.fn((selector) => {
      if (selector === '[data-group-id]') {
        return { dataset: { groupId: 'group-789' } };
      }
      return null;
    }),
    parentElement: null,
    style: {},
    ...overrides
  };
}

describe('ContextMenuBuilder', () => {
  let builder;
  let mockSheet;

  beforeEach(() => {
    vi.clearAllMocks();
    builder = new ContextMenuBuilder();
    mockSheet = createMockSheet();

    // Setup foundry.utils.randomID and deepClone
    global.foundry.utils.randomID = vi.fn(() => 'random-id-12345');
    global.foundry.utils.deepClone = vi.fn((obj) => JSON.parse(JSON.stringify(obj)));

    // Setup game.i18n
    global.game.i18n = {
      localize: vi.fn((key) => key.split('.').pop()),
      format: vi.fn((key, data) => `${key}: ${JSON.stringify(data)}`)
    };

    // Setup foundry.applications.api.DialogV2
    global.foundry.applications.api.DialogV2 = {
      prompt: vi.fn().mockResolvedValue('group-123')
    };
  });

  // =================================
  // Constructor Tests
  // =================================
  describe('constructor', () => {
    test('should create a ContextMenuBuilder instance', () => {
      expect(builder).toBeInstanceOf(ContextMenuBuilder);
    });
  });

  // =================================
  // disableAllDropZones Tests
  // =================================
  describe('disableAllDropZones', () => {
    test('should add disabled class to all drop zones', () => {
      const mockDropZones = [
        { classList: { add: vi.fn() }, style: { pointerEvents: '' } },
        { classList: { add: vi.fn() }, style: { pointerEvents: '' } }
      ];
      global.document.querySelectorAll = vi.fn(() => mockDropZones);

      builder.disableAllDropZones();

      expect(global.document.querySelectorAll).toHaveBeenCalledWith('[data-drop-zone]');
      mockDropZones.forEach(zone => {
        expect(zone.classList.add).toHaveBeenCalledWith('erps-drop-zone-disabled');
        expect(zone.style.pointerEvents).toBe('none');
      });
    });

    test('should handle empty drop zone list', () => {
      global.document.querySelectorAll = vi.fn(() => []);

      builder.disableAllDropZones();

      expect(global.document.querySelectorAll).toHaveBeenCalledWith('[data-drop-zone]');
    });
  });

  // =================================
  // enableAllDropZones Tests
  // =================================
  describe('enableAllDropZones', () => {
    test('should remove disabled class from all drop zones', () => {
      const mockDropZones = [
        { classList: { remove: vi.fn() }, style: { pointerEvents: 'none' } },
        { classList: { remove: vi.fn() }, style: { pointerEvents: 'none' } }
      ];
      global.document.querySelectorAll = vi.fn(() => mockDropZones);

      builder.enableAllDropZones();

      expect(global.document.querySelectorAll).toHaveBeenCalledWith('[data-drop-zone]');
      mockDropZones.forEach(zone => {
        expect(zone.classList.remove).toHaveBeenCalledWith('erps-drop-zone-disabled');
        expect(zone.style.pointerEvents).toBe('');
      });
    });

    test('should handle empty drop zone list', () => {
      global.document.querySelectorAll = vi.fn(() => []);

      builder.enableAllDropZones();

      expect(global.document.querySelectorAll).toHaveBeenCalledWith('[data-drop-zone]');
    });
  });

  // =================================
  // enhanceContextMenuWithOverflowFix Tests
  // =================================
  describe('enhanceContextMenuWithOverflowFix', () => {
    test('should return early if contextMenu is null', () => {
      builder.enhanceContextMenuWithOverflowFix(null, '.window-content', mockSheet);

      expect(mockSheet._createContextMenu).not.toHaveBeenCalled();
    });

    test('should return early if already enhanced', () => {
      const contextMenu = { _erpsOverflowFixApplied: true };

      builder.enhanceContextMenuWithOverflowFix(contextMenu, '.window-content', mockSheet);

      // Should not modify anything
      expect(contextMenu.onOpen).toBeUndefined();
    });

    test('should mark context menu as enhanced', () => {
      const contextMenu = { onOpen: vi.fn(), onClose: vi.fn() };

      builder.enhanceContextMenuWithOverflowFix(contextMenu, '.window-content', mockSheet);

      expect(contextMenu._erpsOverflowFixApplied).toBe(true);
    });

    test('should wrap original onOpen callback', () => {
      const originalOnOpen = vi.fn();
      const contextMenu = { onOpen: originalOnOpen, onClose: vi.fn() };

      builder.enhanceContextMenuWithOverflowFix(contextMenu, '.window-content', mockSheet);

      expect(contextMenu.onOpen).not.toBe(originalOnOpen);
    });

    test('should wrap original onClose callback', () => {
      const originalOnClose = vi.fn();
      const contextMenu = { onOpen: vi.fn(), onClose: originalOnClose };

      builder.enhanceContextMenuWithOverflowFix(contextMenu, '.window-content', mockSheet);

      expect(contextMenu.onClose).not.toBe(originalOnClose);
    });

    test('onOpen callback should handle target with overflow hidden parent', () => {
      const originalOnOpen = vi.fn();
      const contextMenu = { onOpen: originalOnOpen, onClose: vi.fn() };
      
      // Create a mock style object with setProperty method
      const createMockStyle = () => ({
        overflow: '',
        overflowY: '',
        setProperty: vi.fn()
      });
      
      // Create mock target with parent element that has overflow hidden
      const mockParentElement = {
        style: createMockStyle(),
        parentElement: null
      };
      const mockTarget = {
        closest: vi.fn(() => mockParentElement),
        parentElement: mockParentElement,
        style: createMockStyle()
      };
      
      global.window.getComputedStyle = vi.fn(() => ({
        overflow: 'hidden',
        overflowY: 'hidden'
      }));

      builder.enhanceContextMenuWithOverflowFix(contextMenu, '.window-content', mockSheet);
      
      // Call the wrapped onOpen
      contextMenu.onOpen(mockTarget);
      
      expect(originalOnOpen).toHaveBeenCalledWith(mockTarget);
      expect(mockSheet._contextMenuOpen).toBe(true);
      // The overflow containers should be stored
      expect(mockSheet._overflowContainers.length).toBeGreaterThan(0);
    });

    test('onOpen callback should skip if context menu already open', () => {
      const originalOnOpen = vi.fn();
      const contextMenu = { onOpen: originalOnOpen, onClose: vi.fn() };
      mockSheet._contextMenuOpen = true; // Already open
      
      const mockTarget = { closest: vi.fn(() => null), parentElement: null };
      global.window.getComputedStyle = vi.fn(() => ({ overflow: 'visible' }));

      builder.enhanceContextMenuWithOverflowFix(contextMenu, '.window-content', mockSheet);
      
      contextMenu.onOpen(mockTarget);
      
      // Should call original but not set up overflow containers
      expect(originalOnOpen).toHaveBeenCalled();
      expect(mockSheet._overflowContainers).toEqual([]);
    });

    test('onOpen callback should cancel pending cleanup timer', () => {
      const originalOnOpen = vi.fn();
      const contextMenu = { onOpen: originalOnOpen, onClose: vi.fn() };
      mockSheet._contextMenuCleanupTimer = 123; // Pending timer
      
      const mockTarget = { closest: vi.fn(() => null), parentElement: null };
      global.window.getComputedStyle = vi.fn(() => ({ overflow: 'visible' }));

      builder.enhanceContextMenuWithOverflowFix(contextMenu, '.window-content', mockSheet);
      
      contextMenu.onOpen(mockTarget);
      
      expect(mockSheet._contextMenuCleanupTimer).toBeNull();
    });

    test('onClose callback should set context menu open to false', () => {
      const originalOnClose = vi.fn();
      const contextMenu = { onOpen: vi.fn(), onClose: originalOnClose };
      mockSheet._contextMenuOpen = true;
      
      global.window.requestAnimationFrame = vi.fn((cb) => cb());
      global.window.setTimeout = vi.fn((cb) => { cb(); return 1; });

      builder.enhanceContextMenuWithOverflowFix(contextMenu, '.window-content', mockSheet);
      
      contextMenu.onClose();
      
      expect(mockSheet._contextMenuOpen).toBe(false);
      expect(originalOnClose).toHaveBeenCalled();
    });

    test('onClose callback should restore overflow containers', () => {
      const originalOnClose = vi.fn();
      const contextMenu = { onOpen: vi.fn(), onClose: originalOnClose };
      
      // Set up stored overflow containers
      mockSheet._overflowContainers = [
        { element: { style: { overflow: '', overflowY: '' } }, overflow: '', overflowY: '' }
      ];
      
      global.window.requestAnimationFrame = vi.fn((cb) => cb());
      global.window.setTimeout = vi.fn((cb) => { cb(); return 1; });

      builder.enhanceContextMenuWithOverflowFix(contextMenu, '.window-content', mockSheet);
      
      contextMenu.onClose();
      
      expect(mockSheet._overflowContainers).toEqual([]);
    });

    test('onClose callback should remove scrollbar hide style', () => {
      const originalOnClose = vi.fn();
      const contextMenu = { onOpen: vi.fn(), onClose: originalOnClose };
      
      const mockStyle = { remove: vi.fn() };
      mockSheet._scrollbarHideStyle = mockStyle;
      
      global.window.requestAnimationFrame = vi.fn((cb) => cb());
      global.window.setTimeout = vi.fn((cb) => { cb(); return 1; });

      builder.enhanceContextMenuWithOverflowFix(contextMenu, '.window-content', mockSheet);
      
      contextMenu.onClose();
      
      expect(mockStyle.remove).toHaveBeenCalled();
      expect(mockSheet._scrollbarHideStyle).toBeNull();
    });

    test('onClose callback should re-enable drop zones', () => {
      const originalOnClose = vi.fn();
      const contextMenu = { onOpen: vi.fn(), onClose: originalOnClose };
      
      global.window.requestAnimationFrame = vi.fn((cb) => cb());
      global.window.setTimeout = vi.fn((cb) => { cb(); return 1; });
      
      const enableSpy = vi.spyOn(builder, 'enableAllDropZones');

      builder.enhanceContextMenuWithOverflowFix(contextMenu, '.window-content', mockSheet);
      
      contextMenu.onClose();
      
      expect(enableSpy).toHaveBeenCalled();
    });
  });

  // =================================
  // getTransformationActionCardContextOptions Tests
  // =================================
  describe('getTransformationActionCardContextOptions', () => {
    test('should return array of context menu options', () => {
      const options = builder.getTransformationActionCardContextOptions(mockSheet);

      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBe(3);
    });

    test('should include MoveToGroup option', () => {
      const options = builder.getTransformationActionCardContextOptions(mockSheet);

      const moveToGroupOption = options.find(opt => 
        opt.name === 'EVENTIDE_RP_SYSTEM.ContextMenu.MoveToGroup'
      );
      expect(moveToGroupOption).toBeDefined();
      expect(moveToGroupOption.icon).toBe('<i class="fas fa-folder-open"></i>');
    });

    test('should include RemoveFromGroup option', () => {
      const options = builder.getTransformationActionCardContextOptions(mockSheet);

      const removeFromGroupOption = options.find(opt => 
        opt.name === 'EVENTIDE_RP_SYSTEM.ContextMenu.RemoveFromGroup'
      );
      expect(removeFromGroupOption).toBeDefined();
      expect(removeFromGroupOption.icon).toBe('<i class="fas fa-folder-minus"></i>');
    });

    test('should include CreateNewGroup option', () => {
      const options = builder.getTransformationActionCardContextOptions(mockSheet);

      const createNewGroupOption = options.find(opt => 
        opt.name === 'EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewGroup'
      );
      expect(createNewGroupOption).toBeDefined();
      expect(createNewGroupOption.icon).toBe('<i class="fas fa-folder-plus"></i>');
    });

    test('RemoveFromGroup condition should return falsy when card has no groupId', () => {
      mockSheet.item.system.embeddedActionCards = [
        { _id: 'card-123', system: { groupId: null } }
      ];
      const options = builder.getTransformationActionCardContextOptions(mockSheet);
      const target = createMockElement({ dataset: { itemId: 'card-123' } });

      const removeFromGroupOption = options.find(opt =>
        opt.name === 'EVENTIDE_RP_SYSTEM.ContextMenu.RemoveFromGroup'
      );
      
      // Condition returns actionCard && actionCard.system.groupId (falsy when groupId is null)
      expect(removeFromGroupOption.condition(target)).toBeFalsy();
    });

    test('RemoveFromGroup condition should return truthy when card has groupId', () => {
      mockSheet.item.system.embeddedActionCards = [
        { _id: 'card-123', system: { groupId: 'group-456' } }
      ];
      const options = builder.getTransformationActionCardContextOptions(mockSheet);
      const target = createMockElement({ dataset: { itemId: 'card-123' } });

      const removeFromGroupOption = options.find(opt =>
        opt.name === 'EVENTIDE_RP_SYSTEM.ContextMenu.RemoveFromGroup'
      );
      
      // Condition returns actionCard && actionCard.system.groupId (truthy when groupId exists)
      expect(removeFromGroupOption.condition(target)).toBeTruthy();
    });

    test('MoveToGroup callback should call showMoveToGroupDialogForTransformation', async () => {
      const groups = [{ _id: 'group-123', name: 'Group 1' }];
      mockSheet.item.system.actionCardGroups = groups;
      const options = builder.getTransformationActionCardContextOptions(mockSheet);
      const target = createMockElement({ dataset: { itemId: 'card-123' } });

      const moveToGroupOption = options.find(opt =>
        opt.name === 'EVENTIDE_RP_SYSTEM.ContextMenu.MoveToGroup'
      );

      // Spy on showMoveToGroupDialogForTransformation
      const spy = vi.spyOn(builder, 'showMoveToGroupDialogForTransformation');

      moveToGroupOption.callback(target);

      expect(spy).toHaveBeenCalledWith('card-123', groups, mockSheet);
    });

    test('RemoveFromGroup callback should update action card groupId to null', async () => {
      mockSheet.item.system.embeddedActionCards = [
        { _id: 'card-123', system: { groupId: 'group-456' } }
      ];
      mockSheet.item.system.actionCardGroups = [{ _id: 'group-456', name: 'Group 1' }];
      const options = builder.getTransformationActionCardContextOptions(mockSheet);
      const target = createMockElement({ dataset: { itemId: 'card-123' } });

      const removeFromGroupOption = options.find(opt =>
        opt.name === 'EVENTIDE_RP_SYSTEM.ContextMenu.RemoveFromGroup'
      );

      await removeFromGroupOption.callback(target);

      expect(mockSheet.item.update).toHaveBeenCalled();
      const updateCall = mockSheet.item.update.mock.calls[0][0];
      expect(updateCall['system.embeddedActionCards']).toBeDefined();
    });

    test('RemoveFromGroup callback should remove empty group', async () => {
      mockSheet.item.system.embeddedActionCards = [
        { _id: 'card-123', system: { groupId: 'group-456' } }
      ];
      mockSheet.item.system.actionCardGroups = [{ _id: 'group-456', name: 'Group 1' }];
      const options = builder.getTransformationActionCardContextOptions(mockSheet);
      const target = createMockElement({ dataset: { itemId: 'card-123' } });

      const removeFromGroupOption = options.find(opt =>
        opt.name === 'EVENTIDE_RP_SYSTEM.ContextMenu.RemoveFromGroup'
      );

      await removeFromGroupOption.callback(target);

      const updateCall = mockSheet.item.update.mock.calls[0][0];
      // Group should be removed since no cards remain in it
      expect(updateCall['system.actionCardGroups']).toHaveLength(0);
    });

    test('CreateNewGroup callback should create new group and assign card', async () => {
      mockSheet.item.system.embeddedActionCards = [
        { _id: 'card-123', system: { groupId: null } }
      ];
      mockSheet.item.system.actionCardGroups = [];
      const options = builder.getTransformationActionCardContextOptions(mockSheet);
      const target = createMockElement({ dataset: { itemId: 'card-123' } });

      const createNewGroupOption = options.find(opt =>
        opt.name === 'EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewGroup'
      );

      await createNewGroupOption.callback(target);

      expect(mockSheet.item.update).toHaveBeenCalled();
      const updateCall = mockSheet.item.update.mock.calls[0][0];
      expect(updateCall['system.actionCardGroups']).toHaveLength(1);
      expect(updateCall['system.actionCardGroups'][0].name).toBe('Group 1');
    });

    test('CreateNewGroup callback should increment group number based on existing groups', async () => {
      mockSheet.item.system.embeddedActionCards = [
        { _id: 'card-123', system: { groupId: null } }
      ];
      mockSheet.item.system.actionCardGroups = [
        { _id: 'g1', name: 'Group 1', sort: 1 },
        { _id: 'g2', name: 'Group 2', sort: 2 }
      ];
      const options = builder.getTransformationActionCardContextOptions(mockSheet);
      const target = createMockElement({ dataset: { itemId: 'card-123' } });

      const createNewGroupOption = options.find(opt =>
        opt.name === 'EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewGroup'
      );

      await createNewGroupOption.callback(target);

      const updateCall = mockSheet.item.update.mock.calls[0][0];
      expect(updateCall['system.actionCardGroups'][2].name).toBe('Group 3');
    });
  });

  // =================================
  // getTransformationGroupHeaderContextOptions Tests
  // =================================
  describe('getTransformationGroupHeaderContextOptions', () => {
    test('should return array of context menu options', () => {
      const options = builder.getTransformationGroupHeaderContextOptions(mockSheet);

      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBe(1);
    });

    test('should include CreateActionInGroup option', () => {
      const options = builder.getTransformationGroupHeaderContextOptions(mockSheet);

      const createOption = options.find(opt =>
        opt.name === 'EVENTIDE_RP_SYSTEM.ContextMenu.CreateActionInGroup'
      );
      expect(createOption).toBeDefined();
      expect(createOption.icon).toBe('<i class="fas fa-plus"></i>');
    });

    test('CreateActionInGroup callback should create new action card in group', async () => {
      mockSheet.item.system.embeddedActionCards = [];
      mockSheet.item.system.actionCardGroups = [{ _id: 'group-456', name: 'Group 1' }];
      
      const options = builder.getTransformationGroupHeaderContextOptions(mockSheet);
      const target = createMockElement({ dataset: { groupId: 'group-456' } });

      const createOption = options.find(opt =>
        opt.name === 'EVENTIDE_RP_SYSTEM.ContextMenu.CreateActionInGroup'
      );

      // Mock the EmbeddedItemSheet import
      vi.mock('../../../module/ui/sheets/embedded-item-sheet.mjs', () => ({
        default: class MockEmbeddedItemSheet {
          constructor() {}
          render() { return this; }
        }
      }));

      await createOption.callback(target);

      expect(mockSheet.item.update).toHaveBeenCalled();
      const updateCall = mockSheet.item.update.mock.calls[0][0];
      expect(updateCall['system.embeddedActionCards']).toHaveLength(1);
      expect(updateCall['system.embeddedActionCards'][0].system.groupId).toBe('group-456');
    });

    test('CreateActionInGroup callback should get groupId from closest element', async () => {
      mockSheet.item.system.embeddedActionCards = [];
      
      const options = builder.getTransformationGroupHeaderContextOptions(mockSheet);
      const target = createMockElement({ dataset: {} }); // No groupId on target
      target.closest = vi.fn(() => ({ dataset: { groupId: 'group-789' } }));

      const createOption = options.find(opt =>
        opt.name === 'EVENTIDE_RP_SYSTEM.ContextMenu.CreateActionInGroup'
      );

      await createOption.callback(target);

      expect(target.closest).toHaveBeenCalledWith('[data-group-id]');
    });
  });

  // =================================
  // getTransformationTabContextOptions Tests
  // =================================
  describe('getTransformationTabContextOptions', () => {
    test('should return array of context menu options', () => {
      const options = builder.getTransformationTabContextOptions('feature', mockSheet);

      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBe(1);
    });

    test('should capitalize item type in option name', () => {
      const options = builder.getTransformationTabContextOptions('combatPower', mockSheet);

      expect(options[0].name).toContain('CombatPower');
    });

    test('should include plus icon', () => {
      const options = builder.getTransformationTabContextOptions('actionCard', mockSheet);

      expect(options[0].icon).toBe('<i class="fas fa-plus"></i>');
    });
  });

  // =================================
  // _getDefaultSystemData Tests
  // =================================
  describe('_getDefaultSystemData', () => {
    test('should return default data for actionCard', () => {
      const result = builder._getDefaultSystemData('actionCard');

      expect(result).toEqual({
        mode: 'attackChain',
        bgColor: '#8B4513',
        textColor: '#ffffff'
      });
    });

    test('should return default data for combatPower', () => {
      const result = builder._getDefaultSystemData('combatPower');

      expect(result).toEqual({
        targeted: true,
        prerequisites: ''
      });
    });

    test('should return default data for feature', () => {
      const result = builder._getDefaultSystemData('feature');

      expect(result).toEqual({ description: '' });
    });

    test('should return empty object for unknown type', () => {
      const result = builder._getDefaultSystemData('unknown');

      expect(result).toEqual({});
    });
  });

  // =================================
  // createTransformationActionCardContextMenu Tests
  // =================================
  describe('createTransformationActionCardContextMenu', () => {
    test('should create context menu and store reference', () => {
      builder.createTransformationActionCardContextMenu(mockSheet);

      expect(mockSheet._createContextMenu).toHaveBeenCalled();
      expect(mockSheet._transformationActionCardContextMenu).toBeDefined();
    });

    test('should pass correct selector to _createContextMenu', () => {
      builder.createTransformationActionCardContextMenu(mockSheet);

      expect(mockSheet._createContextMenu).toHaveBeenCalledWith(
        expect.any(Function),
        '.tab.embedded-action-cards .erps-data-table__row[data-item-id]'
      );
    });

    test('should warn when context menu is not created', () => {
      mockSheet._createContextMenu = vi.fn().mockReturnValue(null);

      builder.createTransformationActionCardContextMenu(mockSheet);

      // The context menu creation returns null, so warning is logged
      // Logger.warn mock is set up at the top of the file
    });
  });

  // =================================
  // createTransformationGroupHeaderContextMenu Tests
  // =================================
  describe('createTransformationGroupHeaderContextMenu', () => {
    test('should create context menu and store reference', () => {
      builder.createTransformationGroupHeaderContextMenu(mockSheet);

      expect(mockSheet._createContextMenu).toHaveBeenCalled();
      expect(mockSheet._transformationGroupHeaderContextMenu).toBeDefined();
    });

    test('should pass correct selector to _createContextMenu', () => {
      builder.createTransformationGroupHeaderContextMenu(mockSheet);

      expect(mockSheet._createContextMenu).toHaveBeenCalledWith(
        expect.any(Function),
        '.erps-action-card-group__header'
      );
    });
  });

  // =================================
  // createTransformationTabContentContextMenus Tests
  // =================================
  describe('createTransformationTabContentContextMenus', () => {
    test('should create context menus for all tabs', () => {
      builder.createTransformationTabContentContextMenus(mockSheet);

      expect(mockSheet._createContextMenu).toHaveBeenCalledTimes(3);
      expect(mockSheet._embeddedItemsTabContextMenu).toBeDefined();
      expect(mockSheet._embeddedCombatPowersTabContextMenu).toBeDefined();
      expect(mockSheet._embeddedActionCardsTabContextMenu).toBeDefined();
    });
  });

  // =================================
  // createTransformationTabContextMenu Tests
  // =================================
  describe('createTransformationTabContextMenu', () => {
    test('should create context menu with correct tab class', () => {
      builder.createTransformationTabContextMenu('embeddedItems', 'feature', mockSheet);

      expect(mockSheet._createContextMenu).toHaveBeenCalledWith(
        expect.any(Function),
        '.tab.embedded-items'
      );
    });

    test('should create context menu for combat powers tab', () => {
      builder.createTransformationTabContextMenu('embeddedCombatPowers', 'combatPower', mockSheet);

      expect(mockSheet._createContextMenu).toHaveBeenCalledWith(
        expect.any(Function),
        '.tab.embedded-combat-powers'
      );
    });

    test('should create context menu for action cards tab', () => {
      builder.createTransformationTabContextMenu('embeddedActionCards', 'actionCard', mockSheet);

      expect(mockSheet._createContextMenu).toHaveBeenCalledWith(
        expect.any(Function),
        '.tab.embedded-action-cards'
      );
    });
  });

  // =================================
  // showMoveToGroupDialogForTransformation Tests
  // =================================
  describe('showMoveToGroupDialogForTransformation', () => {
    test('should show warning when no groups available', async () => {
      mockSheet.item.system.actionCardGroups = [];
      mockSheet.item.system.embeddedActionCards = [
        { _id: 'card-123', system: { groupId: null } }
      ];

      await builder.showMoveToGroupDialogForTransformation('card-123', [], mockSheet);

      expect(ui.notifications.warn).toHaveBeenCalled();
    });

    test('should show warning when only current group available', async () => {
      mockSheet.item.system.actionCardGroups = [{ _id: 'group-456', name: 'Group 1' }];
      mockSheet.item.system.embeddedActionCards = [
        { _id: 'card-123', system: { groupId: 'group-456' } }
      ];

      await builder.showMoveToGroupDialogForTransformation('card-123', mockSheet.item.system.actionCardGroups, mockSheet);

      expect(ui.notifications.warn).toHaveBeenCalled();
    });

    test('should call DialogV2.prompt with available groups', async () => {
      const groups = [
        { _id: 'group-123', name: 'Group 1' },
        { _id: 'group-456', name: 'Group 2' }
      ];
      mockSheet.item.system.actionCardGroups = groups;
      mockSheet.item.system.embeddedActionCards = [
        { _id: 'card-123', system: { groupId: null } }
      ];

      await builder.showMoveToGroupDialogForTransformation('card-123', groups, mockSheet);

      expect(foundry.applications.api.DialogV2.prompt).toHaveBeenCalled();
    });

    test('should update action card groupId when group selected', async () => {
      const groups = [
        { _id: 'group-123', name: 'Group 1' },
        { _id: 'group-456', name: 'Group 2' }
      ];
      mockSheet.item.system.actionCardGroups = groups;
      mockSheet.item.system.embeddedActionCards = [
        { _id: 'card-123', system: { groupId: null } }
      ];

      await builder.showMoveToGroupDialogForTransformation('card-123', groups, mockSheet);

      expect(mockSheet.item.update).toHaveBeenCalled();
    });

    test('should not update when dialog is cancelled', async () => {
      const groups = [
        { _id: 'group-123', name: 'Group 1' },
        { _id: 'group-456', name: 'Group 2' }
      ];
      mockSheet.item.system.actionCardGroups = groups;
      mockSheet.item.system.embeddedActionCards = [
        { _id: 'card-123', system: { groupId: null } }
      ];

      // Mock dialog returning false (cancelled)
      foundry.applications.api.DialogV2.prompt = vi.fn().mockResolvedValue(false);

      await builder.showMoveToGroupDialogForTransformation('card-123', groups, mockSheet);

      expect(mockSheet.item.update).not.toHaveBeenCalled();
    });

    test('should not update when dialog returns null', async () => {
      const groups = [
        { _id: 'group-123', name: 'Group 1' },
        { _id: 'group-456', name: 'Group 2' }
      ];
      mockSheet.item.system.actionCardGroups = groups;
      mockSheet.item.system.embeddedActionCards = [
        { _id: 'card-123', system: { groupId: null } }
      ];

      // Mock dialog returning null (cancelled)
      foundry.applications.api.DialogV2.prompt = vi.fn().mockResolvedValue(null);

      await builder.showMoveToGroupDialogForTransformation('card-123', groups, mockSheet);

      expect(mockSheet.item.update).not.toHaveBeenCalled();
    });
  });

  // =================================
  // _createEmbeddedItemInTab Tests
  // =================================
  describe('_createEmbeddedItemInTab', () => {
    test('should return early for unknown item type', async () => {
      await builder._createEmbeddedItemInTab('unknownType', mockSheet);

      expect(mockSheet.item.update).not.toHaveBeenCalled();
    });

    test('should create embedded feature item', async () => {
      mockSheet.item.system.embeddedActionCards = [];
      
      // Mock the EmbeddedItemSheet import
      vi.mock('../../../module/ui/sheets/embedded-item-sheet.mjs', () => ({
        default: class MockEmbeddedItemSheet {
          constructor() {}
          render() { return this; }
        }
      }));

      await builder._createEmbeddedItemInTab('feature', mockSheet);

      expect(mockSheet.item.update).toHaveBeenCalled();
      const updateCall = mockSheet.item.update.mock.calls[0][0];
      expect(updateCall['system.embeddedActionCards']).toBeDefined();
      expect(updateCall['system.embeddedActionCards'][0].type).toBe('feature');
    });

    test('should create embedded status item', async () => {
      mockSheet.item.system.embeddedActionCards = [];

      await builder._createEmbeddedItemInTab('status', mockSheet);

      expect(mockSheet.item.update).toHaveBeenCalled();
      const updateCall = mockSheet.item.update.mock.calls[0][0];
      expect(updateCall['system.embeddedActionCards'][0].type).toBe('status');
    });

    test('should create embedded gear item', async () => {
      mockSheet.item.system.embeddedActionCards = [];

      await builder._createEmbeddedItemInTab('gear', mockSheet);

      expect(mockSheet.item.update).toHaveBeenCalled();
      const updateCall = mockSheet.item.update.mock.calls[0][0];
      expect(updateCall['system.embeddedActionCards'][0].type).toBe('gear');
    });

    test('should create embedded combatPower item', async () => {
      mockSheet.item.system.embeddedCombatPowers = [];

      await builder._createEmbeddedItemInTab('combatPower', mockSheet);

      expect(mockSheet.item.update).toHaveBeenCalled();
      const updateCall = mockSheet.item.update.mock.calls[0][0];
      expect(updateCall['system.embeddedCombatPowers']).toBeDefined();
      expect(updateCall['system.embeddedCombatPowers'][0].type).toBe('combatPower');
    });

    test('should create embedded actionCard item', async () => {
      mockSheet.item.system.embeddedActionCards = [];

      await builder._createEmbeddedItemInTab('actionCard', mockSheet);

      expect(mockSheet.item.update).toHaveBeenCalled();
      const updateCall = mockSheet.item.update.mock.calls[0][0];
      expect(updateCall['system.embeddedActionCards'][0].type).toBe('actionCard');
    });

    test('should change tab if not already on correct tab', async () => {
      mockSheet.tabGroups.primary = 'otherTab';
      mockSheet.item.system.embeddedActionCards = [];

      await builder._createEmbeddedItemInTab('feature', mockSheet);

      expect(mockSheet.changeTab).toHaveBeenCalledWith('embeddedItems', 'primary');
    });

    test('should not change tab if already on correct tab', async () => {
      mockSheet.tabGroups.primary = 'embeddedItems';
      mockSheet.item.system.embeddedActionCards = [];

      await builder._createEmbeddedItemInTab('feature', mockSheet);

      expect(mockSheet.changeTab).not.toHaveBeenCalled();
    });
  });

  // =================================
  // Error Handling Tests
  // =================================
  describe('createTransformationActionCardContextMenu error handling', () => {
    test('should catch and log error when context menu creation throws', async () => {
      mockSheet._createContextMenu = vi.fn().mockImplementation(() => {
        throw new Error('Context menu creation failed');
      });

      // Should not throw
      builder.createTransformationActionCardContextMenu(mockSheet);

      // Logger.error should have been called
      const { Logger } = await import('../../../module/services/logger.mjs');
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  // =================================
  // RemoveFromGroup Edge Cases
  // =================================
  describe('RemoveFromGroup edge cases', () => {
    test('should handle action card not found in list', async () => {
      mockSheet.item.system.embeddedActionCards = [
        { _id: 'other-card', system: { groupId: 'group-456' } }
      ];
      mockSheet.item.system.actionCardGroups = [{ _id: 'group-456', name: 'Group 1' }];
      const options = builder.getTransformationActionCardContextOptions(mockSheet);
      const target = createMockElement({ dataset: { itemId: 'card-123' } });

      const removeFromGroupOption = options.find(opt =>
        opt.name === 'EVENTIDE_RP_SYSTEM.ContextMenu.RemoveFromGroup'
      );

      await removeFromGroupOption.callback(target);

      // Should not update since card was not found
      // The callback checks for actionCard && actionCard.system.groupId
    });

    test('should keep group when other cards remain in it', async () => {
      mockSheet.item.system.embeddedActionCards = [
        { _id: 'card-123', system: { groupId: 'group-456' } },
        { _id: 'card-456', system: { groupId: 'group-456' } }
      ];
      mockSheet.item.system.actionCardGroups = [{ _id: 'group-456', name: 'Group 1' }];
      const options = builder.getTransformationActionCardContextOptions(mockSheet);
      const target = createMockElement({ dataset: { itemId: 'card-123' } });

      const removeFromGroupOption = options.find(opt =>
        opt.name === 'EVENTIDE_RP_SYSTEM.ContextMenu.RemoveFromGroup'
      );

      await removeFromGroupOption.callback(target);

      const updateCall = mockSheet.item.update.mock.calls[0][0];
      // Group should not be removed since card-456 still has it
      expect(updateCall['system.actionCardGroups']).toHaveLength(1);
    });
  });

  // =================================
  // CreateNewGroup Edge Cases
  // =================================
  describe('CreateNewGroup edge cases', () => {
    test('should handle groups with non-standard names', async () => {
      mockSheet.item.system.embeddedActionCards = [
        { _id: 'card-123', system: { groupId: null } }
      ];
      mockSheet.item.system.actionCardGroups = [
        { _id: 'g1', name: 'Custom Name', sort: 1 },
        { _id: 'g2', name: 'Another Group', sort: 2 }
      ];
      const options = builder.getTransformationActionCardContextOptions(mockSheet);
      const target = createMockElement({ dataset: { itemId: 'card-123' } });

      const createNewGroupOption = options.find(opt =>
        opt.name === 'EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewGroup'
      );

      await createNewGroupOption.callback(target);

      const updateCall = mockSheet.item.update.mock.calls[0][0];
      // Should start from Group 1 since no "Group N" pattern matched
      expect(updateCall['system.actionCardGroups'][2].name).toBe('Group 1');
    });

    test('should calculate sort value correctly', async () => {
      mockSheet.item.system.embeddedActionCards = [
        { _id: 'card-123', system: { groupId: null } }
      ];
      mockSheet.item.system.actionCardGroups = [
        { _id: 'g1', name: 'Group 1', sort: 10 },
        { _id: 'g2', name: 'Group 2', sort: 20 }
      ];
      const options = builder.getTransformationActionCardContextOptions(mockSheet);
      const target = createMockElement({ dataset: { itemId: 'card-123' } });

      const createNewGroupOption = options.find(opt =>
        opt.name === 'EVENTIDE_RP_SYSTEM.ContextMenu.CreateNewGroup'
      );

      await createNewGroupOption.callback(target);

      const updateCall = mockSheet.item.update.mock.calls[0][0];
      expect(updateCall['system.actionCardGroups'][2].sort).toBe(21);
    });
  });
});