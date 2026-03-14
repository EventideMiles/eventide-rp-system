// @ts-nocheck
/**
 * @fileoverview Tests for CommonFoundryTasks utility class
 * Tests token targeting/selection, user flags, permissions, and logging utilities
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { CommonFoundryTasks, commonTasks } from '../../../module/utils/common-foundry-tasks.mjs';

describe('CommonFoundryTasks', () => {
  describe('SYSTEM_ID', () => {
    test('should have correct system identifier', () => {
      expect(CommonFoundryTasks.SYSTEM_ID).toBe('eventide-rp-system');
    });
  });

  describe('getTargetArray()', () => {
    test('should return array of targeted tokens when targets exist', () => {
      const mockToken1 = { id: 'token1', name: 'Token 1' };
      const mockToken2 = { id: 'token2', name: 'Token 2' };
      
      global.game = {
        user: {
          targets: {
            size: 2,
            [Symbol.iterator]: function* () {
              yield mockToken1;
              yield mockToken2;
            }
          }
        }
      };

      const result = CommonFoundryTasks.getTargetArray();
      
      expect(result).toEqual([mockToken1, mockToken2]);
    });

    test('should return empty array when no targets', () => {
      global.game = {
        user: {
          targets: {
            size: 0
          }
        }
      };

      const result = CommonFoundryTasks.getTargetArray();
      
      expect(result).toEqual([]);
    });

    test('should handle targets with size but empty iterator', () => {
      global.game = {
        user: {
          targets: {
            size: 0,
            [Symbol.iterator]: function* () {}
          }
        }
      };

      const result = CommonFoundryTasks.getTargetArray();
      
      expect(result).toEqual([]);
    });
  });

  describe('getFirstTarget()', () => {
    test('should return first targeted token', () => {
      const mockToken1 = { id: 'token1', name: 'Token 1' };
      const mockToken2 = { id: 'token2', name: 'Token 2' };
      
      global.game = {
        user: {
          targets: {
            size: 2,
            [Symbol.iterator]: function* () {
              yield mockToken1;
              yield mockToken2;
            }
          }
        }
      };

      const result = CommonFoundryTasks.getFirstTarget();
      
      expect(result).toBe(mockToken1);
    });

    test('should return null when no targets', () => {
      global.game = {
        user: {
          targets: {
            size: 0
          }
        }
      };

      const result = CommonFoundryTasks.getFirstTarget();
      
      expect(result).toBeNull();
    });
  });

  describe('getSelectedArray()', () => {
    test('should return controlled tokens from canvas', () => {
      const mockTokens = [
        { id: 'token1', name: 'Token 1' },
        { id: 'token2', name: 'Token 2' }
      ];
      
      global.canvas = {
        tokens: {
          controlled: mockTokens
        }
      };

      const result = CommonFoundryTasks.getSelectedArray();
      
      expect(result).toBe(mockTokens);
    });

    test('should return empty array when no tokens controlled', () => {
      global.canvas = {
        tokens: {
          controlled: []
        }
      };

      const result = CommonFoundryTasks.getSelectedArray();
      
      expect(result).toEqual([]);
    });
  });

  describe('getFirstSelected()', () => {
    test('should return first selected token', () => {
      const mockTokens = [
        { id: 'token1', name: 'Token 1' },
        { id: 'token2', name: 'Token 2' }
      ];
      
      global.canvas = {
        tokens: {
          controlled: mockTokens
        }
      };

      const result = CommonFoundryTasks.getFirstSelected();
      
      expect(result).toBe(mockTokens[0]);
    });

    test('should return null when no tokens selected', () => {
      global.canvas = {
        tokens: {
          controlled: []
        }
      };

      const result = CommonFoundryTasks.getFirstSelected();
      
      expect(result).toBeNull();
    });

    test('should return null when controlled is undefined', () => {
      global.canvas = {
        tokens: {
          controlled: undefined
        }
      };

      const result = CommonFoundryTasks.getFirstSelected();
      
      expect(result).toBeNull();
    });
  });

  describe('clamp()', () => {
    test('should return number within range unchanged', () => {
      expect(CommonFoundryTasks.clamp(5, 0, 10)).toBe(5);
    });

    test('should clamp to minimum when below range', () => {
      expect(CommonFoundryTasks.clamp(-5, 0, 10)).toBe(0);
    });

    test('should clamp to maximum when above range', () => {
      expect(CommonFoundryTasks.clamp(15, 0, 10)).toBe(10);
    });

    test('should handle equal min and max', () => {
      expect(CommonFoundryTasks.clamp(5, 10, 10)).toBe(10);
    });

    test('should handle negative ranges', () => {
      expect(CommonFoundryTasks.clamp(-15, -10, -5)).toBe(-10);
    });

    test('should handle decimal numbers', () => {
      expect(CommonFoundryTasks.clamp(2.5, 0, 5)).toBe(2.5);
      expect(CommonFoundryTasks.clamp(-0.5, 0, 5)).toBe(0);
      expect(CommonFoundryTasks.clamp(5.5, 0, 5)).toBe(5);
    });
  });

  describe('storeUserFlag()', () => {
    test('should call setFlag with correct parameters', async () => {
      const setFlagMock = vi.fn().mockResolvedValue({ id: 'user1' });
      
      global.game = {
        user: {
          setFlag: setFlagMock
        }
      };

      await CommonFoundryTasks.storeUserFlag('testKey', 'testValue');
      
      expect(setFlagMock).toHaveBeenCalledWith('eventide-rp-system', 'testKey', 'testValue');
    });

    test('should return the result from setFlag', async () => {
      const mockResult = { id: 'user1', flags: { testKey: 'testValue' } };
      const setFlagMock = vi.fn().mockResolvedValue(mockResult);
      
      global.game = {
        user: {
          setFlag: setFlagMock
        }
      };

      const result = await CommonFoundryTasks.storeUserFlag('testKey', 'testValue');
      
      expect(result).toBe(mockResult);
    });

    test('should handle complex value types', async () => {
      const complexValue = { nested: { data: true }, array: [1, 2, 3] };
      const setFlagMock = vi.fn().mockResolvedValue({ id: 'user1' });
      
      global.game = {
        user: {
          setFlag: setFlagMock
        }
      };

      await CommonFoundryTasks.storeUserFlag('complexKey', complexValue);
      
      expect(setFlagMock).toHaveBeenCalledWith('eventide-rp-system', 'complexKey', complexValue);
    });
  });

  describe('retrieveUserFlag()', () => {
    test('should call getFlag with correct parameters', () => {
      const getFlagMock = vi.fn().mockReturnValue('storedValue');
      
      global.game = {
        user: {
          getFlag: getFlagMock
        }
      };

      const result = CommonFoundryTasks.retrieveUserFlag('testKey');
      
      expect(getFlagMock).toHaveBeenCalledWith('eventide-rp-system', 'testKey');
      expect(result).toBe('storedValue');
    });

    test('should return undefined for non-existent flag', () => {
      const getFlagMock = vi.fn().mockReturnValue(undefined);
      
      global.game = {
        user: {
          getFlag: getFlagMock
        }
      };

      const result = CommonFoundryTasks.retrieveUserFlag('nonExistent');
      
      expect(result).toBeUndefined();
    });
  });

  describe('retrieveSheetTheme()', () => {
    test('should return user flag theme when available', () => {
      const getFlagMock = vi.fn().mockReturnValue('dark');
      
      global.game = {
        user: {
          getFlag: getFlagMock
        }
      };

      const result = CommonFoundryTasks.retrieveSheetTheme();
      
      expect(result).toBe('dark');
      expect(getFlagMock).toHaveBeenCalledWith('eventide-rp-system', 'sheetTheme');
    });

    test('should fallback to setting when flag not available', () => {
      const getFlagMock = vi.fn().mockReturnValue(undefined);
      const settingsGetMock = vi.fn().mockReturnValue('light');
      
      global.game = {
        user: {
          getFlag: getFlagMock
        },
        settings: {
          get: settingsGetMock
        }
      };

      const result = CommonFoundryTasks.retrieveSheetTheme();
      
      expect(result).toBe('light');
      expect(settingsGetMock).toHaveBeenCalledWith('eventide-rp-system', 'sheetTheme');
    });

    test('should return default "blue" when neither flag nor setting available', () => {
      const getFlagMock = vi.fn().mockReturnValue(undefined);
      const settingsGetMock = vi.fn().mockReturnValue(null);
      
      global.game = {
        user: {
          getFlag: getFlagMock
        },
        settings: {
          get: settingsGetMock
        }
      };

      const result = CommonFoundryTasks.retrieveSheetTheme();
      
      expect(result).toBe('blue');
    });

    test('should handle missing game.user gracefully', () => {
      const settingsGetMock = vi.fn().mockReturnValue('green');
      
      global.game = {
        user: null,
        settings: {
          get: settingsGetMock
        }
      };

      const result = CommonFoundryTasks.retrieveSheetTheme();
      
      expect(result).toBe('green');
    });

    test('should return default when game.user is missing and settings throw', () => {
      global.game = {
        user: null,
        settings: {
          get: vi.fn().mockImplementation(() => {
            throw new Error('Settings not available');
          })
        }
      };

      const result = CommonFoundryTasks.retrieveSheetTheme();
      
      expect(result).toBe('blue');
    });

    test('should handle settings.get throwing error', () => {
      const getFlagMock = vi.fn().mockReturnValue(undefined);
      const settingsGetMock = vi.fn().mockImplementation(() => {
        throw new Error('Settings error');
      });
      
      global.game = {
        user: {
          getFlag: getFlagMock
        },
        settings: {
          get: settingsGetMock
        }
      };

      const result = CommonFoundryTasks.retrieveSheetTheme();
      
      expect(result).toBe('blue');
    });
  });

  describe('deleteUserFlag()', () => {
    test('should call unsetFlag with correct parameters', async () => {
      const unsetFlagMock = vi.fn().mockResolvedValue({ id: 'user1' });
      
      global.game = {
        user: {
          unsetFlag: unsetFlagMock
        }
      };

      await CommonFoundryTasks.deleteUserFlag('testKey');
      
      expect(unsetFlagMock).toHaveBeenCalledWith('eventide-rp-system', 'testKey');
    });

    test('should return the result from unsetFlag', async () => {
      const mockResult = { id: 'user1' };
      const unsetFlagMock = vi.fn().mockResolvedValue(mockResult);
      
      global.game = {
        user: {
          unsetFlag: unsetFlagMock
        }
      };

      const result = await CommonFoundryTasks.deleteUserFlag('testKey');
      
      expect(result).toBe(mockResult);
    });
  });

  describe('storeMultipleUserFlags()', () => {
    test('should store multiple flags', async () => {
      const setFlagMock = vi.fn().mockResolvedValue({ id: 'user1' });
      
      global.game = {
        user: {
          setFlag: setFlagMock
        }
      };

      await CommonFoundryTasks.storeMultipleUserFlags({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3'
      });
      
      expect(setFlagMock).toHaveBeenCalledTimes(3);
      expect(setFlagMock).toHaveBeenCalledWith('eventide-rp-system', 'key1', 'value1');
      expect(setFlagMock).toHaveBeenCalledWith('eventide-rp-system', 'key2', 'value2');
      expect(setFlagMock).toHaveBeenCalledWith('eventide-rp-system', 'key3', 'value3');
    });

    test('should handle empty object', async () => {
      const setFlagMock = vi.fn();
      
      global.game = {
        user: {
          setFlag: setFlagMock
        }
      };

      await CommonFoundryTasks.storeMultipleUserFlags({});
      
      expect(setFlagMock).not.toHaveBeenCalled();
    });
  });

  describe('retrieveMultipleUserFlags()', () => {
    test('should retrieve multiple flags', () => {
      const getFlagMock = vi.fn()
        .mockReturnValueOnce('value1')
        .mockReturnValueOnce('value2')
        .mockReturnValueOnce('value3');
      
      global.game = {
        user: {
          getFlag: getFlagMock
        }
      };

      const result = CommonFoundryTasks.retrieveMultipleUserFlags(['key1', 'key2', 'key3']);
      
      expect(result).toEqual({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3'
      });
    });

    test('should handle empty array', () => {
      const getFlagMock = vi.fn();
      
      global.game = {
        user: {
          getFlag: getFlagMock
        }
      };

      const result = CommonFoundryTasks.retrieveMultipleUserFlags([]);
      
      expect(result).toEqual({});
      expect(getFlagMock).not.toHaveBeenCalled();
    });

    test('should handle undefined values', () => {
      const getFlagMock = vi.fn()
        .mockReturnValueOnce('value1')
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce('value3');
      
      global.game = {
        user: {
          getFlag: getFlagMock
        }
      };

      const result = CommonFoundryTasks.retrieveMultipleUserFlags(['key1', 'key2', 'key3']);
      
      expect(result).toEqual({
        key1: 'value1',
        key2: undefined,
        key3: 'value3'
      });
    });
  });

  describe('deleteMultipleUserFlags()', () => {
    test('should delete multiple flags', async () => {
      const unsetFlagMock = vi.fn().mockResolvedValue({ id: 'user1' });
      
      global.game = {
        user: {
          unsetFlag: unsetFlagMock
        }
      };

      await CommonFoundryTasks.deleteMultipleUserFlags(['key1', 'key2', 'key3']);
      
      expect(unsetFlagMock).toHaveBeenCalledTimes(3);
      expect(unsetFlagMock).toHaveBeenCalledWith('eventide-rp-system', 'key1');
      expect(unsetFlagMock).toHaveBeenCalledWith('eventide-rp-system', 'key2');
      expect(unsetFlagMock).toHaveBeenCalledWith('eventide-rp-system', 'key3');
    });

    test('should handle empty array', async () => {
      const unsetFlagMock = vi.fn();
      
      global.game = {
        user: {
          unsetFlag: unsetFlagMock
        }
      };

      await CommonFoundryTasks.deleteMultipleUserFlags([]);
      
      expect(unsetFlagMock).not.toHaveBeenCalled();
    });
  });

  describe('permissionLevel()', () => {
    test('should return "gm" for GM user', () => {
      global.game = {
        user: {
          isGM: true
        }
      };

      const result = CommonFoundryTasks.permissionLevel();
      
      expect(result).toBe('gm');
    });

    test('should return "player" for non-GM user', () => {
      global.game = {
        user: {
          isGM: false
        }
      };

      const result = CommonFoundryTasks.permissionLevel();
      
      expect(result).toBe('player');
    });
  });

  describe('permissionCheck()', () => {
    test('should return "gm" for GM user', () => {
      global.game = {
        user: {
          isGM: true
        }
      };

      const result = CommonFoundryTasks.permissionCheck();
      
      expect(result).toBe('gm');
    });

    test('should return "player" when playerMode is true and user is not GM', () => {
      global.game = {
        user: {
          isGM: false
        }
      };

      const result = CommonFoundryTasks.permissionCheck({ playerMode: true });
      
      expect(result).toBe('player');
    });

    test('should return "forbidden" and show error when not GM and playerMode is false', () => {
      const errorMock = vi.fn();
      
      global.game = {
        user: {
          isGM: false
        },
        i18n: {
          localize: vi.fn().mockReturnValue('GM Only Action')
        }
      };
      
      global.ui = {
        notifications: {
          error: errorMock
        }
      };

      const result = CommonFoundryTasks.permissionCheck({ playerMode: false });
      
      expect(result).toBe('forbidden');
      expect(errorMock).toHaveBeenCalledWith('GM Only Action');
    });

    test('should return "forbidden" with default options', () => {
      const errorMock = vi.fn();
      
      global.game = {
        user: {
          isGM: false
        },
        i18n: {
          localize: vi.fn().mockReturnValue('GM Only Action')
        }
      };
      
      global.ui = {
        notifications: {
          error: errorMock
        }
      };

      const result = CommonFoundryTasks.permissionCheck();
      
      expect(result).toBe('forbidden');
      expect(errorMock).toHaveBeenCalled();
    });

    test('should return "gm" for GM even when playerMode is false', () => {
      global.game = {
        user: {
          isGM: true
        }
      };

      const result = CommonFoundryTasks.permissionCheck({ playerMode: false });
      
      expect(result).toBe('gm');
    });
  });

  describe('isTestingMode', () => {
    test('should return false when erps is not defined', () => {
      global.erps = undefined;

      const result = CommonFoundryTasks.isTestingMode;
      
      expect(result).toBe(false);
    });

    test('should return false when erps.settings is not defined', () => {
      global.erps = {};

      const result = CommonFoundryTasks.isTestingMode;
      
      expect(result).toBe(false);
    });

    test('should return false when getSetting is not a function', () => {
      global.erps = {
        settings: {}
      };

      const result = CommonFoundryTasks.isTestingMode;
      
      expect(result).toBe(false);
    });

    test('should return value from erps.settings.getSetting', () => {
      global.erps = {
        settings: {
          getSetting: vi.fn().mockReturnValue(true)
        }
      };

      const result = CommonFoundryTasks.isTestingMode;
      
      expect(result).toBe(true);
      expect(global.erps.settings.getSetting).toHaveBeenCalledWith('testingMode');
    });

    test('should return false when getSetting returns false', () => {
      global.erps = {
        settings: {
          getSetting: vi.fn().mockReturnValue(false)
        }
      };

      const result = CommonFoundryTasks.isTestingMode;
      
      expect(result).toBe(false);
    });

    test('should handle errors gracefully', () => {
      global.erps = {
        settings: {
          getSetting: vi.fn().mockImplementation(() => {
            throw new Error('Settings error');
          })
        }
      };

      const result = CommonFoundryTasks.isTestingMode;
      
      expect(result).toBe(false);
    });
  });

  describe('logIfTesting()', () => {
    beforeEach(() => {
      vi.spyOn(console, 'info').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    test('should log message when not in testing mode', () => {
      global.erps = {
        settings: {
          getSetting: vi.fn().mockReturnValue(false)
        }
      };

      CommonFoundryTasks.logIfTesting('Test message');
      
      expect(console.info).toHaveBeenCalledWith('Test message');
    });

    test('should log message with data when not in testing mode', () => {
      global.erps = {
        settings: {
          getSetting: vi.fn().mockReturnValue(false)
        }
      };

      const testData = { key: 'value' };
      CommonFoundryTasks.logIfTesting('Test message', testData);
      
      expect(console.info).toHaveBeenCalledWith('Test message', testData);
    });

    test('should not log when in testing mode', () => {
      global.erps = {
        settings: {
          getSetting: vi.fn().mockReturnValue(true)
        }
      };

      CommonFoundryTasks.logIfTesting('Test message');
      
      expect(console.info).not.toHaveBeenCalled();
    });

    test('should not log with data when in testing mode', () => {
      global.erps = {
        settings: {
          getSetting: vi.fn().mockReturnValue(true)
        }
      };

      CommonFoundryTasks.logIfTesting('Test message', { data: 'test' });
      
      expect(console.info).not.toHaveBeenCalled();
    });

    test('should handle undefined data parameter', () => {
      global.erps = {
        settings: {
          getSetting: vi.fn().mockReturnValue(false)
        }
      };

      CommonFoundryTasks.logIfTesting('Test message', undefined);
      
      expect(console.info).toHaveBeenCalledWith('Test message');
    });
  });
});

describe('commonTasks utility object', () => {
  test('should have getTargetArray method', () => {
    expect(commonTasks.getTargetArray).toBe(CommonFoundryTasks.getTargetArray);
  });

  test('should have getFirstTarget method', () => {
    expect(commonTasks.getFirstTarget).toBe(CommonFoundryTasks.getFirstTarget);
  });

  test('should have getSelectedArray method', () => {
    expect(commonTasks.getSelectedArray).toBe(CommonFoundryTasks.getSelectedArray);
  });

  test('should have getFirstSelected method', () => {
    expect(commonTasks.getFirstSelected).toBe(CommonFoundryTasks.getFirstSelected);
  });

  test('should have clamp method', () => {
    expect(commonTasks.clamp).toBe(CommonFoundryTasks.clamp);
  });

  test('should have storeUserFlag method', () => {
    expect(commonTasks.storeUserFlag).toBe(CommonFoundryTasks.storeUserFlag);
  });

  test('should have retrieveUserFlag method', () => {
    expect(commonTasks.retrieveUserFlag).toBe(CommonFoundryTasks.retrieveUserFlag);
  });

  test('should have retrieveSheetTheme method', () => {
    expect(commonTasks.retrieveSheetTheme).toBe(CommonFoundryTasks.retrieveSheetTheme);
  });

  test('should have deleteUserFlag method', () => {
    expect(commonTasks.deleteUserFlag).toBe(CommonFoundryTasks.deleteUserFlag);
  });

  test('should have storeMultipleUserFlags method', () => {
    expect(commonTasks.storeMultipleUserFlags).toBe(CommonFoundryTasks.storeMultipleUserFlags);
  });

  test('should have retrieveMultipleUserFlags method', () => {
    expect(commonTasks.retrieveMultipleUserFlags).toBe(CommonFoundryTasks.retrieveMultipleUserFlags);
  });

  test('should have deleteMultipleUserFlags method', () => {
    expect(commonTasks.deleteMultipleUserFlags).toBe(CommonFoundryTasks.deleteMultipleUserFlags);
  });

  test('should have permissionLevel method', () => {
    expect(commonTasks.permissionLevel).toBe(CommonFoundryTasks.permissionLevel);
  });

  test('should have permissionCheck method', () => {
    expect(commonTasks.permissionCheck).toBe(CommonFoundryTasks.permissionCheck);
  });

  test('should have isTestingMode getter', () => {
    expect(commonTasks.isTestingMode()).toBe(CommonFoundryTasks.isTestingMode);
  });

  test('should have logIfTesting method', () => {
    expect(commonTasks.logIfTesting).toBe(CommonFoundryTasks.logIfTesting);
  });

  describe('commonTasks functions work correctly', () => {
    test('clamp should work through commonTasks object', () => {
      expect(commonTasks.clamp(5, 0, 10)).toBe(5);
      expect(commonTasks.clamp(-5, 0, 10)).toBe(0);
      expect(commonTasks.clamp(15, 0, 10)).toBe(10);
    });

    test('getTargetArray should work through commonTasks object', () => {
      const mockToken = { id: 'token1' };
      
      global.game = {
        user: {
          targets: {
            size: 1,
            [Symbol.iterator]: function* () { yield mockToken; }
          }
        }
      };

      const result = commonTasks.getTargetArray();
      
      expect(result).toEqual([mockToken]);
    });

    test('permissionLevel should work through commonTasks object', () => {
      global.game = {
        user: {
          isGM: true
        }
      };

      expect(commonTasks.permissionLevel()).toBe('gm');
    });
  });
});