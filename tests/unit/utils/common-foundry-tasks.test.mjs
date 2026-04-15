// @ts-nocheck
/**
 * @fileoverview Tests for CommonFoundryTasks utility class
 * Tests token targeting/selection, user flags, permissions, and logging utilities
 */

import { describe, test, expect, vi } from 'vitest';
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
});

describe('commonTasks utility object', () => {
  test('should have getTargetArray method', () => {
    expect(commonTasks.getTargetArray).toBe(CommonFoundryTasks.getTargetArray);
  });

  test('should have getSelectedArray method', () => {
    expect(commonTasks.getSelectedArray).toBe(CommonFoundryTasks.getSelectedArray);
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

  test('should have storeMultipleUserFlags method', () => {
    expect(commonTasks.storeMultipleUserFlags).toBe(CommonFoundryTasks.storeMultipleUserFlags);
  });

  test('should have retrieveMultipleUserFlags method', () => {
    expect(commonTasks.retrieveMultipleUserFlags).toBe(CommonFoundryTasks.retrieveMultipleUserFlags);
  });

  test('should have isTestingMode getter', () => {
    expect(commonTasks.isTestingMode()).toBe(CommonFoundryTasks.isTestingMode);
  });

  describe('commonTasks functions work correctly', () => {
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
  });
});