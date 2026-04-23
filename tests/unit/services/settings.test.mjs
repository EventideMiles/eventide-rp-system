// @ts-nocheck
/**
 * @fileoverview Tests for module/services/settings.mjs
 *
 * Tests the SoundSettingsApplication class, registerSettings function,
 * and getSetting/setSetting helper functions.
 */

import {
  SoundSettingsApplication,
  registerSettings,
  getSetting,
  setSetting,
} from '../../../module/services/settings/settings.mjs';

// Mock dependencies
vi.mock('../../../module/services/managers/sound-manager.mjs', () => ({
  erpsSoundManager: {
    getDefaultSounds: vi.fn(() => ({
      testSound: 'sounds/test.mp3',
      anotherSound: 'sounds/another.mp3',
    })),
    playSound: vi.fn(),
  },
}));

vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../module/services/formula-validator.mjs', () => ({
  FormulaValidator: class {
    static sanitizeFormula(formula) {
      return formula;
    }

    validateSettingFormula(_formula, _type, _options) {
      return { isValid: true, warnings: [] };
    }
  },
}));

vi.mock('../../../module/ui/components/eventide-sheet-helpers.mjs', () => ({
  EventideSheetHelpers: class {
    constructor(options = {}) {
      this.options = options;
    }

    async _prepareContext() {
      return {};
    }
  },
}));

describe('SoundSettingsApplication', () => {
  let mockApp;
  let mockElement;

  beforeEach(() => {
    vi.clearAllMocks();
    mockElement = {
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(),
    };
    mockApp = new SoundSettingsApplication();
    mockApp.element = mockElement;
    mockApp.object = {};
    mockApp.close = vi.fn();
    global.game.user = {
      isGM: true,
      getFlag: vi.fn(),
    };
    global.game.i18n = {
      localize: vi.fn((key) => key),
      format: vi.fn((key, data) => `${key} ${JSON.stringify(data)}`),
    };
  });

  describe('_prepareContext()', () => {
    test('should prepare context with sound settings', async () => {
      // Arrange
      const mockSounds = {
        testSound: 'sounds/test.mp3',
        anotherSound: 'sounds/another.mp3',
      };
      const { erpsSoundManager } = await import(
        '../../../module/services/managers/sound-manager.mjs'
      );
      erpsSoundManager.getDefaultSounds.mockReturnValue(mockSounds);
      global.game.settings.get.mockImplementation((scope, key) => {
        if (key.startsWith('sound_')) {
          const soundKey = key.replace('sound_', '');
          return mockSounds[soundKey];
        }
        return null;
      });

      // Act
      const context = await mockApp._prepareContext();

      // Assert
      expect(context).toBeDefined();
      expect(context.sounds).toBeDefined();
    });

    test('should close app if user is not GM', async () => {
      // Arrange
      global.game.user.isGM = false;

      // Act
      const result = await mockApp._prepareContext();

      // Assert
      expect(mockApp.close).toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    test('should handle missing sound settings gracefully', async () => {
      // Arrange
      const { erpsSoundManager } = await import(
        '../../../module/services/managers/sound-manager.mjs'
      );
      erpsSoundManager.getDefaultSounds.mockReturnValue({});
      global.game.settings.get.mockReturnValue(null);

      // Act
      const context = await mockApp._prepareContext();

      // Assert
      expect(context).toBeDefined();
    });
  });

});

describe('registerSettings()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.game.settings.register = vi.fn();
    global.game.settings.registerMenu = vi.fn();
    global.game.settings.get = vi.fn();
    global.game.settings.set = vi.fn();
    global.game.user = {
      isGM: true,
      getFlag: vi.fn(),
    };
    global.ui.notifications = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    };
    global.game.i18n = {
      localize: vi.fn((key) => key),
      format: vi.fn((key, data) => `${key} ${JSON.stringify(data)}`),
    };
    global.CONFIG = {
      Combat: {
        initiative: {
          formula: '',
        },
      },
      Actor: {
        sheetClass: class {},
      },
    };
    global.foundry = {
      applications: {
        settings: {
          SettingsConfig: {
            reloadConfirm: vi.fn(),
          },
        },
      },
    };
    global.ui = {
      windows: {},
    };
    global.Hooks = {
      once: vi.fn((event, callback) => callback()),
    };
  });

  test('should register enableSystemSounds setting', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'enableSystemSounds',
      expect.objectContaining({
        name: 'SETTINGS.EnableSystemSoundsName',
        type: Boolean,
        default: true,
      })
    );
  });

  test('should register sheetTheme setting with onChange handler', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'sheetTheme',
      expect.objectContaining({
        name: 'SETTINGS.SheetThemeName',
        type: String,
        default: 'blue',
        onChange: expect.any(Function),
      })
    );
  });

  test('should migrate theme from flag to setting when flag exists', async () => {
    // Arrange
    global.game.user.getFlag.mockReturnValue('dark');
    global.game.settings.get.mockReturnValue('blue');
    global.game.settings.set.mockResolvedValue(undefined);
    // Ensure ui.notifications is defined
    global.ui.notifications = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    };
    const { Logger } = await import('../../../module/services/logger.mjs');

    // Act
    registerSettings();

    // Get the onChange callback
    const sheetThemeCall = global.game.settings.register.mock.calls.find(
      (call) => call[1] === 'sheetTheme'
    );
    const onChange = sheetThemeCall[2].onChange;

    // Simulate the onChange being called
    onChange('blue');

    // Assert
    expect(global.game.settings.set).toHaveBeenCalledWith(
      'eventide-rp-system',
      'sheetTheme',
      'dark'
    );
    expect(Logger.info).toHaveBeenCalled();
  });

  test('should not migrate theme when flag does not exist', () => {
    // Arrange
    global.game.user.getFlag.mockReturnValue(null);
    global.game.settings.get.mockReturnValue('blue');
    // Ensure ui.notifications is defined
    global.ui.notifications = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    };

    // Act
    registerSettings();

    // Get the onChange callback
    const sheetThemeCall = global.game.settings.register.mock.calls.find(
      (call) => call[1] === 'sheetTheme'
    );
    const onChange = sheetThemeCall[2].onChange;

    // Simulate the onChange being called
    onChange('blue');

    // Assert
    expect(global.game.settings.set).not.toHaveBeenCalledWith(
      'eventide-rp-system',
      'sheetTheme',
      expect.any(String)
    );
  });

  test('should register defaultCharacterTab setting', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'defaultCharacterTab',
      expect.objectContaining({
        name: 'SETTINGS.DefaultCharacterTabName',
        type: String,
        default: 'features',
        choices: expect.any(Object),
      })
    );
  });

  test('should register initativeFormula setting with validation', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'initativeFormula',
      expect.objectContaining({
        name: 'SETTINGS.InitativeFormulaName',
        type: String,
        default: '1d@hiddenAbilities.dice.total + @statTotal.mainInit + @statTotal.subInit',
        onChange: expect.any(Function),
      })
    );
  });


  test('should update CONFIG.Combat.initiative.formula on valid change', () => {
    // Act
    registerSettings();

    // Get the onChange callback
    const formulaCall = global.game.settings.register.mock.calls.find(
      (call) => call[1] === 'initativeFormula'
    );
    
    if (!formulaCall) {
      throw new Error('initativeFormula setting not found');
    }
    
    const onChange = formulaCall[2].onChange;

    // Simulate the onChange being called
    onChange('1d20+5');

    // Assert
    expect(global.CONFIG.Combat.initiative.formula).toBe('1d20+5');
    expect(
      global.foundry.applications.settings.SettingsConfig.reloadConfirm
    ).toHaveBeenCalled();
  });

  test('should register initiativeDecimals setting', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'initiativeDecimals',
      expect.objectContaining({
        name: 'SETTINGS.InitiativeDecimalsName',
        type: Number,
        default: 2,
        range: { min: 0, max: 4, step: 1 },
      })
    );
  });

  test('should register autoRollNpcInitiative setting', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'autoRollNpcInitiative',
      expect.objectContaining({
        name: 'SETTINGS.AutoRollNpcInitiativeName',
        type: Boolean,
        default: true,
      })
    );
  });

  test('should register hideNpcInitiativeRolls setting', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'hideNpcInitiativeRolls',
      expect.objectContaining({
        name: 'SETTINGS.HideNpcInitiativeRollsName',
        type: Boolean,
        default: false,
      })
    );
  });

  test('should register autoRollPlayerInitiative setting', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'autoRollPlayerInitiative',
      expect.objectContaining({
        name: 'SETTINGS.AutoRollPlayerInitiativeName',
        type: Boolean,
        default: false,
      })
    );
  });

  test('should register defaultCombatRoundDuration setting', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'defaultCombatRoundDuration',
      expect.objectContaining({
        name: 'SETTINGS.DefaultCombatRoundDurationName',
        type: Number,
        default: 6,
        range: { min: 1, max: 60, step: 1 },
      })
    );
  });

  test('should register showGearEquipMessages setting', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'showGearEquipMessages',
      expect.objectContaining({
        name: 'SETTINGS.ShowGearEquipMessagesName',
        type: Boolean,
        default: true,
      })
    );
  });

  test('should register gearEquippedDefault setting', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'gearEquippedDefault',
      expect.objectContaining({
        name: 'SETTINGS.GearEquippedDefaultName',
        type: Boolean,
        default: true,
      })
    );
  });

  test('should register enableActionCardChains setting', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'enableActionCardChains',
      expect.objectContaining({
        name: 'SETTINGS.EnableActionCardChainsName',
        type: Boolean,
        default: true,
      })
    );
  });

  test('should register actionCardExecutionDelay setting', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'actionCardExecutionDelay',
      expect.objectContaining({
        name: 'SETTINGS.ActionCardExecutionDelayName',
        type: Number,
        default: 2000,
        range: { min: 0, max: 10000, step: 100 },
      })
    );
  });

  test('should register crToXpFormula setting with validation', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'crToXpFormula',
      expect.objectContaining({
        name: 'SETTINGS.CrToXpFormulaName',
        type: String,
        default: '@cr * 200 + @cr * @cr * 50',
        onChange: expect.any(Function),
      })
    );
  });

  test('should register defaultTokenVisionRange setting', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'defaultTokenVisionRange',
      expect.objectContaining({
        name: 'SETTINGS.DefaultTokenVisionRangeName',
        type: Number,
        default: 50,
        range: { min: 0, max: 1000, step: 5 },
      })
    );
  });

  test('should register minimumDiceValue setting', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'minimumDiceValue',
      expect.objectContaining({
        name: 'SETTINGS.MinimumDiceValueName',
        type: Number,
        default: 1,
        range: { min: 1, max: 20, step: 1 },
      })
    );
  });

  test('should register maxPowerFormula setting with validation', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'maxPowerFormula',
      expect.objectContaining({
        name: 'SETTINGS.MaxPowerFormulaName',
        type: String,
        default: '5 + @will.total + @fort.total',
        onChange: expect.any(Function),
      })
    );
  });

  test('should register maxResolveFormula setting with validation', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'maxResolveFormula',
      expect.objectContaining({
        name: 'SETTINGS.MaxResolveFormulaName',
        type: String,
        default: '100 + (10 * @fort.total)',
        onChange: expect.any(Function),
      })
    );
  });

  test('should register statPointsFormula setting with validation', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'statPointsFormula',
      expect.objectContaining({
        name: 'SETTINGS.StatPointsFormulaName',
        type: String,
        default: '14 + (2 * @lvl.value)',
        onChange: expect.any(Function),
      })
    );
  });

  test('should register minimumPowerValue setting with validation', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'minimumPowerValue',
      expect.objectContaining({
        name: 'SETTINGS.MinimumPowerValueName',
        type: Number,
        default: 1,
        onChange: expect.any(Function),
      })
    );
  });

  test('should validate minimumPowerValue and reset to default on invalid', () => {
    // Arrange
    global.game.settings.set.mockResolvedValue(undefined);
    // Ensure ui.notifications is defined
    global.ui.notifications = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    };

    // Act
    registerSettings();

    // Get the onChange callback
    const powerCall = global.game.settings.register.mock.calls.find(
      (call) => call[1] === 'minimumPowerValue'
    );
    
    if (!powerCall) {
      throw new Error('minimumPowerValue setting not found');
    }
    
    const onChange = powerCall[2].onChange;

    // Simulate the onChange being called with invalid value
    onChange(-5);

    // Assert
    expect(global.game.settings.set).toHaveBeenCalledWith(
      'eventide-rp-system',
      'minimumPowerValue',
      1
    );
    expect(global.ui.notifications.warn).toHaveBeenCalled();
  });

  test('should register minimumResolveValue setting with validation', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'minimumResolveValue',
      expect.objectContaining({
        name: 'SETTINGS.MinimumResolveValueName',
        type: Number,
        default: 10,
        onChange: expect.any(Function),
      })
    );
  });

  test('should validate minimumResolveValue and reset to default on invalid', () => {
    // Arrange
    global.game.settings.set.mockResolvedValue(undefined);
    // Ensure ui.notifications is defined
    global.ui.notifications = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    };

    // Act
    registerSettings();

    // Get the onChange callback
    const resolveCall = global.game.settings.register.mock.calls.find(
      (call) => call[1] === 'minimumResolveValue'
    );
    
    if (!resolveCall) {
      throw new Error('minimumResolveValue setting not found');
    }
    
    const onChange = resolveCall[2].onChange;

    // Simulate the onChange being called with invalid value
    onChange(0);

    // Assert
    expect(global.game.settings.set).toHaveBeenCalledWith(
      'eventide-rp-system',
      'minimumResolveValue',
      10
    );
    expect(global.ui.notifications.warn).toHaveBeenCalled();
  });

  test('should register actionCardExecutionLimit setting', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'actionCardExecutionLimit',
      expect.objectContaining({
        name: 'SETTINGS.ActionCardExecutionLimitName',
        type: Number,
        default: 30,
        range: { min: 0, max: 100, step: 1 },
      })
    );
  });

  test('should register testingMode setting', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'testingMode',
      expect.objectContaining({
        name: 'SETTINGS.TestingModeName',
        type: Boolean,
        default: false,
        onChange: expect.any(Function),
      })
    );
  });

  test('should log info when testingMode changes', async () => {
    // Arrange
    const { Logger } = await import('../../../module/services/logger.mjs');

    // Act
    registerSettings();

    // Get the onChange callback
    const testingCall = global.game.settings.register.mock.calls.find(
      (call) => call[1] === 'testingMode'
    );
    
    if (!testingCall) {
      throw new Error('testingMode setting not found');
    }
    
    const onChange = testingCall[2].onChange;

    // Simulate the onChange being called
    onChange(true);

    // Assert
    expect(Logger.info).toHaveBeenCalledWith(
      'Testing mode setting changed',
      { value: true },
      'SETTINGS'
    );
  });

  test('should register embeddedImageMigrationVersion setting', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'embeddedImageMigrationVersion',
      expect.objectContaining({
        name: 'Embedded Image Migration Version',
        type: String,
        default: '',
        config: false,
      })
    );
  });

  test('should register sound settings for each default sound', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'sound_testSound',
      expect.objectContaining({
        type: String,
        default: 'sounds/test.mp3',
        config: false,
      })
    );
    expect(global.game.settings.register).toHaveBeenCalledWith(
      'eventide-rp-system',
      'sound_anotherSound',
      expect.objectContaining({
        type: String,
        default: 'sounds/another.mp3',
        config: false,
      })
    );
  });

  test('should register sound settings menu on ready hook', () => {
    // Act
    registerSettings();

    // Assert
    expect(global.Hooks.once).toHaveBeenCalledWith(
      'ready',
      expect.any(Function)
    );
    expect(global.game.settings.registerMenu).toHaveBeenCalledWith(
      'eventide-rp-system',
      'soundSettings',
      expect.objectContaining({
        name: 'SETTINGS.SoundSettingsName',
        type: SoundSettingsApplication,
        restricted: true,
      })
    );
  });

  test('should reset empty sound values to default', () => {
    // Arrange
    global.game.settings.set.mockResolvedValue(undefined);
    // Ensure ui.notifications is defined
    global.ui.notifications = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    };

    // Act
    registerSettings();

    // Get the onChange callback for sound setting
    const soundCall = global.game.settings.register.mock.calls.find(
      (call) => call[1] === 'sound_testSound'
    );
    
    if (!soundCall) {
      throw new Error('sound_testSound setting not found');
    }
    
    const onChange = soundCall[2].onChange;

    // Simulate the onChange being called with empty value
    onChange('');

    // Assert
    expect(global.game.settings.set).toHaveBeenCalledWith(
      'eventide-rp-system',
      'sound_testSound',
      'sounds/test.mp3'
    );
    expect(global.ui.notifications.info).toHaveBeenCalled();
  });
});

describe('getSetting()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.game.settings.get = vi.fn();
  });

  test('should return setting value when available', () => {
    // Arrange
    global.game.settings.get.mockReturnValue('testValue');

    // Act
    const result = getSetting('testKey');

    // Assert
    expect(result).toBe('testValue');
    expect(global.game.settings.get).toHaveBeenCalledWith(
      'eventide-rp-system',
      'testKey'
    );
  });

  test('should return null when setting is not available', () => {
    // Arrange
    global.game.settings.get.mockImplementation(() => {
      throw new Error('Setting not found');
    });

    // Act
    const result = getSetting('nonExistentKey');

    // Assert
    expect(result).toBeNull();
  });

  test('should handle game not ready scenario', () => {
    // Arrange
    global.game.settings.get.mockImplementation(() => {
      throw new Error('Game not ready');
    });

    // Act
    const result = getSetting('anyKey');

    // Assert
    expect(result).toBeNull();
  });
});

describe('setSetting()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.game.settings.set = vi.fn();
  });

  test('should set setting value and return promise', async () => {
    // Arrange
    const mockPromise = Promise.resolve();
    global.game.settings.set.mockReturnValue(mockPromise);

    // Act
    const result = setSetting('testKey', 'testValue');

    // Assert
    expect(result).toBe(mockPromise);
    expect(global.game.settings.set).toHaveBeenCalledWith(
      'eventide-rp-system',
      'testKey',
      'testValue'
    );
  });

  test('should handle setting with complex value', async () => {
    // Arrange
    const complexValue = { nested: { data: 'value' } };
    const mockPromise = Promise.resolve();
    global.game.settings.set.mockReturnValue(mockPromise);

    // Act
    const result = setSetting('complexKey', complexValue);

    // Assert
    expect(result).toBe(mockPromise);
    expect(global.game.settings.set).toHaveBeenCalledWith(
      'eventide-rp-system',
      'complexKey',
      complexValue
    );
  });
});
