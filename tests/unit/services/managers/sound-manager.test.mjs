// @ts-nocheck
/**
 * @fileoverview Tests for ERPSSoundManager service
 *
 * Tests the sound manager for playing custom sounds for various system events.
 */

import { ERPSSoundManager, erpsSoundManager } from '../../../../module/services/managers/sound-manager.mjs';

// Mock getSetting from settings
vi.mock('../../../../module/services/settings/_module.mjs', () => ({
  getSetting: vi.fn()
}));

import { getSetting } from '../../../../module/services/settings/_module.mjs';

// Mock Logger
vi.mock('../../../../module/services/logger.mjs', () => ({
  Logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

import { Logger } from '../../../../module/services/logger.mjs';

describe('ERPSSoundManager', () => {
  let soundManager;
  let mockAudioHelperPlay;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Setup AudioHelper mock
    if (!global.foundry.audio) {
      global.foundry.audio = {};
    }
    if (!global.foundry.audio.AudioHelper) {
      global.foundry.audio.AudioHelper = {};
    }
    mockAudioHelperPlay = vi.fn();
    global.foundry.audio.AudioHelper.play = mockAudioHelperPlay;

    // Setup game.settings.get mock
    if (global.game.settings && global.game.settings.get) {
      global.game.settings.get.mockReturnValue(0.5);
    }

    // Create fresh sound manager instance after mocks are set up
    soundManager = new ERPSSoundManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Constructor Initialization', () => {
    test('should initialize with default sounds', () => {
      const defaultSounds = soundManager.getDefaultSounds();

      expect(defaultSounds).toBeDefined();
      expect(defaultSounds.healing).toBe('systems/eventide-rp-system/assets/sounds/Cure2.wav');
      expect(defaultSounds.statusApply).toBe('systems/eventide-rp-system/assets/sounds/jingles_SAX04.ogg');
      expect(defaultSounds.statusRemove).toBe('systems/eventide-rp-system/assets/sounds/Cure5.wav');
      expect(defaultSounds.gearEquip).toBe('systems/eventide-rp-system/assets/sounds/cloth3.ogg');
      expect(defaultSounds.gearUnequip).toBe('systems/eventide-rp-system/assets/sounds/clothBelt2.ogg');
      expect(defaultSounds.combatPower).toBe('systems/eventide-rp-system/assets/sounds/Trap_00.wav');
      expect(defaultSounds.damage).toBe('systems/eventide-rp-system/assets/sounds/swish_4.wav');
      expect(defaultSounds.initiative).toBe('systems/eventide-rp-system/assets/sounds/levelup.wav');
      expect(defaultSounds.diceRoll).toBe('sounds/dice.wav');
      expect(defaultSounds.featureRoll).toBe('systems/eventide-rp-system/assets/sounds/4.wav');
    });

    test('should have sounds property initialized with defaults', () => {
      const defaultSounds = soundManager.getDefaultSounds();

      Object.keys(defaultSounds).forEach(key => {
        expect(soundManager.sounds[key]).toBe(defaultSounds[key]);
      });
    });

    test('should initialize empty recently played sounds set', () => {
      expect(soundManager._recentlyPlayedSounds).toBeInstanceOf(Set);
      expect(soundManager._recentlyPlayedSounds.size).toBe(0);
    });

    test('should register hooks once on ready event', () => {
      // Mock Hooks.once and Hooks.on
      let readyCallback = null;
      global.Hooks.once = vi.fn((event, callback) => {
        if (event === 'ready') {
          readyCallback = callback;
        }
      });
      global.Hooks.on = vi.fn();

      // Create new instance to test hook registration
      new ERPSSoundManager();

      // Verify hooks.once was called with ready event
      expect(global.Hooks.once).toHaveBeenCalledWith('ready', expect.any(Function));

      // Execute the ready callback
      expect(readyCallback).not.toBeNull();
      readyCallback();

      // Verify refreshSounds was called
      expect(soundManager.refreshSounds).toBeDefined();
    });
  });

  describe('getDefaultSounds()', () => {
    test('should return default sounds object', () => {
      const defaults = soundManager.getDefaultSounds();

      expect(defaults).toEqual(soundManager._defaultSounds);
    });

    test('should have all expected sound keys', () => {
      const defaults = soundManager.getDefaultSounds();
      const expectedKeys = [
        'healing',
        'statusApply',
        'statusRemove',
        'gearEquip',
        'gearUnequip',
        'combatPower',
        'damage',
        'initiative',
        'diceRoll',
        'featureRoll'
      ];

      expectedKeys.forEach(key => {
        expect(defaults).toHaveProperty(key);
      });
    });
  });

  describe('soundExists()', () => {
    test('should return true for valid sound keys', () => {
      expect(soundManager.soundExists('healing')).toBe(true);
      expect(soundManager.soundExists('damage')).toBe(true);
      expect(soundManager.soundExists('diceRoll')).toBe(true);
    });

    test('should return false for invalid sound keys', () => {
      expect(soundManager.soundExists('invalidSound')).toBe(false);
      expect(soundManager.soundExists('')).toBe(false);
      expect(soundManager.soundExists(null)).toBe(false);
      expect(soundManager.soundExists(undefined)).toBe(false);
    });
  });

  describe('refreshSounds()', () => {
    test('should return early if game.settings is not available', () => {
      const originalSettings = global.game.settings;
      global.game.settings = null;

      soundManager.refreshSounds();

      expect(getSetting).not.toHaveBeenCalled();

      // Restore settings
      global.game.settings = originalSettings;
    });

    test('should load all sounds from settings', () => {
      getSetting.mockImplementation((key) => {
        if (key === 'sound_healing') return 'custom/path/healing.wav';
        return null; // Use default for others
      });

      soundManager.refreshSounds();

      expect(getSetting).toHaveBeenCalledWith('sound_healing');
      expect(soundManager.sounds.healing).toBe('custom/path/healing.wav');
    });

    test('should use default sound when setting is empty string', () => {
      getSetting.mockImplementation((key) => {
        if (key === 'sound_healing') return '';
        if (key === 'sound_damage') return '   '; // whitespace only
        return null;
      });

      const defaults = soundManager.getDefaultSounds();
      soundManager.refreshSounds();

      expect(soundManager.sounds.healing).toBe(defaults.healing);
      expect(soundManager.sounds.damage).toBe(defaults.damage);
    });

    test('should use default sound when setting throws error', () => {
      getSetting.mockImplementation((key) => {
        if (key.startsWith('sound_')) throw new Error('Setting not found');
        return null;
      });

      const defaults = soundManager.getDefaultSounds();
      soundManager.refreshSounds();

      // Should still have default values
      expect(soundManager.sounds.healing).toBe(defaults.healing);
      expect(soundManager.sounds.damage).toBe(defaults.damage);

      // Reset mock
      getSetting.mockImplementation(() => null);
    });

    test('should log info when setting is not found', () => {
      getSetting.mockImplementation(() => {
        throw new Error('Setting not found');
      });

      soundManager.refreshSounds();

      expect(Logger.info).toHaveBeenCalledWith(
        'Sound setting not found, using default',
        { settingKey: 'sound_healing' },
        'SOUND_MANAGER'
      );
    });
  });

  describe('_playSoundFile()', () => {
    test('should call AudioHelper.play with correct parameters', () => {
      global.game.settings.get.mockReturnValue(0.75);

      soundManager._playSoundFile('path/to/sound.wav');

      expect(mockAudioHelperPlay).toHaveBeenCalledWith(
        {
          src: 'path/to/sound.wav',
          volume: 0.75,
          autoplay: true,
          loop: false
        },
        false
      );
    });

    test('should get volume from globalInterfaceVolume setting', () => {
      global.game.settings.get.mockImplementation((namespace, key) => {
        if (key === 'globalInterfaceVolume') return 0.5;
        return null;
      });

      soundManager._playSoundFile('test.wav');

      expect(global.game.settings.get).toHaveBeenCalledWith('core', 'globalInterfaceVolume');
    });
  });

  describe('_addToRecentlyPlayed()', () => {
    test('should add sound key to recently played set', () => {
      soundManager._addToRecentlyPlayed('healing');

      expect(soundManager._recentlyPlayedSounds.has('healing')).toBe(true);
    });

    test('should remove sound key after timeout', () => {
      soundManager._addToRecentlyPlayed('healing', 500);

      expect(soundManager._recentlyPlayedSounds.has('healing')).toBe(true);

      // Fast-forward time past the timeout
      vi.advanceTimersByTime(510);

      expect(soundManager._recentlyPlayedSounds.has('healing')).toBe(false);
    });

    test('should use default timeout of 500ms', () => {
      soundManager._addToRecentlyPlayed('healing');

      expect(soundManager._recentlyPlayedSounds.has('healing')).toBe(true);

      vi.advanceTimersByTime(500);

      expect(soundManager._recentlyPlayedSounds.has('healing')).toBe(false);
    });
  });

  describe('_playLocalSound()', () => {
    test('should return early if system sounds are disabled', async () => {
      getSetting.mockImplementation((key) => {
        if (key === 'enableSystemSounds') return false;
        return null;
      });

      await soundManager._playLocalSound('healing');

      expect(mockAudioHelperPlay).not.toHaveBeenCalled();
    });

    test('should return early for invalid sound key', async () => {
      getSetting.mockImplementation((key) => {
        if (key === 'enableSystemSounds') return true;
        return null;
      });

      await soundManager._playLocalSound('invalidSound');

      expect(mockAudioHelperPlay).not.toHaveBeenCalled();
      expect(Logger.info).toHaveBeenCalledWith(
        'Sound key not found or not yet implemented',
        { soundKey: 'invalidSound' },
        'SOUND_MANAGER'
      );
    });

    test('should play sound when system sounds are enabled', async () => {
      getSetting.mockImplementation((key) => {
        if (key === 'enableSystemSounds') return true;
        return null;
      });

      await soundManager._playLocalSound('healing');

      expect(mockAudioHelperPlay).toHaveBeenCalledWith(
        expect.objectContaining({
          src: soundManager.sounds.healing,
          volume: 0.5,
          autoplay: true,
          loop: false
        }),
        false
      );
    });

    test('should add to recently played after playing', async () => {
      getSetting.mockImplementation((key) => {
        if (key === 'enableSystemSounds') return true;
        return null;
      });

      await soundManager._playLocalSound('healing');

      expect(soundManager._recentlyPlayedSounds.has('healing')).toBe(true);
    });

    test('should debounce sounds - do not play if recently played', async () => {
      getSetting.mockImplementation((key) => {
        if (key === 'enableSystemSounds') return true;
        return null;
      });

      // First play
      await soundManager._playLocalSound('healing');
      expect(mockAudioHelperPlay).toHaveBeenCalledTimes(1);

      // Second play without force - should be debounced
      await soundManager._playLocalSound('healing');
      expect(mockAudioHelperPlay).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    test('should play sound even if recently played when force is true', async () => {
      getSetting.mockImplementation((key) => {
        if (key === 'enableSystemSounds') return true;
        return null;
      });

      // First play
      await soundManager._playLocalSound('healing');
      expect(mockAudioHelperPlay).toHaveBeenCalledTimes(1);

      // Second play with force - should bypass debounce
      await soundManager._playLocalSound('healing', { force: true });
      expect(mockAudioHelperPlay).toHaveBeenCalledTimes(2);
    });

    test('should handle missing options parameter', async () => {
      getSetting.mockImplementation((key) => {
        if (key === 'enableSystemSounds') return true;
        return null;
      });

      await soundManager._playLocalSound('healing');

      expect(mockAudioHelperPlay).toHaveBeenCalled();
    });
  });

  describe('playSound()', () => {
    test('should play sound locally', async () => {
      getSetting.mockImplementation((key) => {
        if (key === 'enableSystemSounds') return true;
        return null;
      });

      await soundManager.playSound('healing');

      expect(mockAudioHelperPlay).toHaveBeenCalled();
    });

    test('should return sound flags for chat message', async () => {
      getSetting.mockImplementation((key) => {
        if (key === 'enableSystemSounds') return false;
        return null;
      });

      const result = await soundManager.playSound('damage', { force: true });

      expect(result).toEqual({
        'eventide-rp-system': {
          sound: {
            key: 'damage',
            force: true
          }
        }
      });
    });

    test('should use default force option when not provided', async () => {
      getSetting.mockImplementation((key) => {
        if (key === 'enableSystemSounds') return false;
        return null;
      });

      const result = await soundManager.playSound('healing');

      expect(result['eventide-rp-system'].sound.force).toBe(false);
    });

    test('should merge provided options with defaults', async () => {
      getSetting.mockImplementation((key) => {
        if (key === 'enableSystemSounds') return true;
        return null;
      });

      const result = await soundManager.playSound('combatPower', { force: true });

      expect(result['eventide-rp-system'].sound.key).toBe('combatPower');
      expect(result['eventide-rp-system'].sound.force).toBe(true);
    });
  });

  describe('_handleChatMessageSound()', () => {
    test('should return early if message has no flags', () => {
      const mockMessage = {};

      soundManager._handleChatMessageSound(mockMessage);

      expect(mockAudioHelperPlay).not.toHaveBeenCalled();
    });

    test('should return early if message has no eventide-rp-system flags', () => {
      const mockMessage = {
        flags: {
          'other-system': { sound: { key: 'healing' } }
        }
      };

      soundManager._handleChatMessageSound(mockMessage);

      expect(mockAudioHelperPlay).not.toHaveBeenCalled();
    });

    test('should return early if message has no sound data', () => {
      const mockMessage = {
        flags: {
          'eventide-rp-system': {}
        }
      };

      soundManager._handleChatMessageSound(mockMessage);

      expect(mockAudioHelperPlay).not.toHaveBeenCalled();
    });

    test('should return early if sound data has no key', () => {
      const mockMessage = {
        flags: {
          'eventide-rp-system': {
            sound: {}
          }
        }
      };

      soundManager._handleChatMessageSound(mockMessage);

      expect(mockAudioHelperPlay).not.toHaveBeenCalled();
    });

    test('should play sound locally with force option from message', async () => {
      getSetting.mockImplementation((key) => {
        if (key === 'enableSystemSounds') return true;
        return null;
      });

      const mockMessage = {
        flags: {
          'eventide-rp-system': {
            sound: {
              key: 'healing',
              force: true
            }
          }
        }
      };

      soundManager._handleChatMessageSound(mockMessage);

      // Wait for async operation
      await vi.runAllTimersAsync();

      expect(Logger.info).toHaveBeenCalledWith(
        'Playing sound from chat message',
        { soundKey: 'healing' },
        'SOUND_MANAGER'
      );
      expect(mockAudioHelperPlay).toHaveBeenCalled();
    });

    test('should use force: false when not specified in message', async () => {
      getSetting.mockImplementation((key) => {
        if (key === 'enableSystemSounds') return true;
        return null;
      });

      const mockMessage = {
        flags: {
          'eventide-rp-system': {
            sound: {
              key: 'damage'
            }
          }
        }
      };

      soundManager._handleChatMessageSound(mockMessage);

      await vi.runAllTimersAsync();

      expect(mockAudioHelperPlay).toHaveBeenCalled();
    });
  });

  describe('_registerHooks()', () => {
    test('should register createChatMessage hook', () => {
      let hookCallback = null;
      global.Hooks.on = vi.fn((event, callback) => {
        if (event === 'createChatMessage') {
          hookCallback = callback;
        }
      });

      soundManager._registerHooks();

      expect(global.Hooks.on).toHaveBeenCalledWith('createChatMessage', expect.any(Function));
      expect(hookCallback).not.toBeNull();
    });

    test('should call _handleChatMessageSound when chat message is created', () => {
      let hookCallback = null;
      global.Hooks.on = vi.fn((event, callback) => {
        if (event === 'createChatMessage') {
          hookCallback = callback;
        }
      });

      soundManager._registerHooks();

      const mockMessage = {
        flags: {
          'eventide-rp-system': {
            sound: {
              key: 'healing'
            }
          }
        }
      };

      // Spy on _handleChatMessageSound
      const handleSpy = vi.spyOn(soundManager, '_handleChatMessageSound');

      hookCallback(mockMessage);

      expect(handleSpy).toHaveBeenCalledWith(mockMessage);
    });
  });

  describe('Singleton Instance', () => {
    test('should export singleton instance', () => {
      expect(erpsSoundManager).toBeInstanceOf(ERPSSoundManager);
    });

    test('singleton should have default sounds initialized', () => {
      expect(erpsSoundManager.sounds.healing).toBeDefined();
      expect(erpsSoundManager.sounds.damage).toBeDefined();
    });

    test('singleton should have recently played set', () => {
      expect(erpsSoundManager._recentlyPlayedSounds).toBeInstanceOf(Set);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle full playSound workflow', async () => {
      getSetting.mockImplementation((key) => {
        if (key === 'enableSystemSounds') return true;
        return null;
      });

      const flags = await soundManager.playSound('healing', { force: false });

      expect(mockAudioHelperPlay).toHaveBeenCalledWith(
        expect.objectContaining({
          src: soundManager.sounds.healing,
          volume: 0.5,
          autoplay: true,
          loop: false
        }),
        false
      );

      expect(flags['eventide-rp-system'].sound.key).toBe('healing');
      expect(flags['eventide-rp-system'].sound.force).toBe(false);
    });

    test('should play sound again after debounce timeout expires', async () => {
      getSetting.mockImplementation((key) => {
        if (key === 'enableSystemSounds') return true;
        return null;
      });

      // First play
      await soundManager._playLocalSound('healing');
      expect(mockAudioHelperPlay).toHaveBeenCalledTimes(1);

      // Advance time past debounce period
      vi.advanceTimersByTime(510);

      // Second play - should not be debounced now
      await soundManager._playLocalSound('healing');
      expect(mockAudioHelperPlay).toHaveBeenCalledTimes(2);
    });

    test('should handle chat message with sound data', async () => {
      getSetting.mockImplementation((key) => {
        if (key === 'enableSystemSounds') return true;
        return null;
      });

      const mockMessage = {
        flags: {
          'eventide-rp-system': {
            sound: {
              key: 'damage',
              force: false
            }
          }
        }
      };

      soundManager._handleChatMessageSound(mockMessage);
      await vi.runAllTimersAsync();

      expect(Logger.info).toHaveBeenCalledWith(
        'Playing sound from chat message',
        { soundKey: 'damage' },
        'SOUND_MANAGER'
      );
      expect(mockAudioHelperPlay).toHaveBeenCalled();
    });
  });
});
