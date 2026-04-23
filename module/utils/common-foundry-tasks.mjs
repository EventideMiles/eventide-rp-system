/**
 * A utility class that provides common Foundry VTT operations related to tokens,
 * user flags, permissions, and more.
 *
 * This class is designed to consolidate frequently used operations and abstractions
 * to make development easier and more consistent throughout the system.
 *
 * @class
 */
export class CommonFoundryTasks {
  /**
   * System identifier for flags and settings
   * @type {string}
   * @static
   */
  static SYSTEM_ID = "eventide-rp-system";

  /**
   * Retrieves an array of tokens which are currently targeted by the user.
   *
   * @returns {Token[]} Array of targeted tokens
   * @static
   */
  static getTargetArray() {
    return game.user.targets.size ? Array.from(game.user.targets) : [];
  }

  /**
   * Retrieves an array of tokens which are currently selected by the user.
   *
   * @returns {Token[]} Array of selected tokens
   * @static
   */
  static getSelectedArray() {
    return canvas.tokens.controlled;
  }

  /**
   * Stores a value in the user's flags for the Eventide system.
   *
   * @param {string} key - The key to store the value under
   * @param {*} value - The value to store
   * @returns {Promise<User>} A Promise which resolves to the updated User
   * @static
   */
  static async storeUserFlag(key, value) {
    return game.user.setFlag(CommonFoundryTasks.SYSTEM_ID, key, value);
  }

  /**
   * Retrieves a value from the user's flags for the Eventide system.
   *
   * @param {string} key - The key of the flag to retrieve
   * @returns {*} The value stored under the given key, or undefined if not found
   * @static
   */
  static retrieveUserFlag(key) {
    return game.user.getFlag(CommonFoundryTasks.SYSTEM_ID, key);
  }

  /**
   * Retrieves the user's sheet theme preference, checking both user flag and setting.
   * This method provides backward compatibility and ensures theme consistency.
   *
   * @returns {string} The user's preferred theme (defaults to "blue")
   * @static
   */
  static retrieveSheetTheme() {
    // Handle case where game.user is not available yet (during early initialization)
    if (!game.user) {
      // Try to get from settings if available, otherwise default to blue
      try {
        const settingTheme = game.settings.get(
          "eventide-rp-system",
          "sheetTheme",
        );
        return settingTheme || "blue";
      } catch {
        return "blue";
      }
    }

    // First check user flag (for backward compatibility and immediate updates)
    const flagTheme = game.user.getFlag(
      CommonFoundryTasks.SYSTEM_ID,
      "sheetTheme",
    );
    if (flagTheme) {
      return flagTheme;
    }

    // Fallback to setting if flag doesn't exist
    try {
      const settingTheme = game.settings.get(
        "eventide-rp-system",
        "sheetTheme",
      );
      if (settingTheme) {
        return settingTheme;
      }
    } catch {
      // Settings might not be available yet
    }

    // Final fallback to default
    return "blue";
  }

  /**
   * Stores multiple values in the user's flags for the Eventide system.
   *
   * @param {Object} flags - An object containing key-value pairs to store
   * @returns {Promise<void>} A Promise which resolves when all flags are stored
   * @static
   */
  static async storeMultipleUserFlags(flags) {
    const promises = [];
    for (const flag in flags) {
      promises.push(CommonFoundryTasks.storeUserFlag(flag, flags[flag]));
    }
    await Promise.all(promises);
  }

  /**
   * Retrieves multiple values from the user's flags for the Eventide system.
   *
   * @param {string[]} keys - An array of keys to retrieve
   * @returns {Object} An object containing the key-value pairs
   * @static
   */
  static retrieveMultipleUserFlags(keys) {
    const returnObject = {};

    for (const key of keys) {
      returnObject[key] = CommonFoundryTasks.retrieveUserFlag(key);
    }

    return returnObject;
  }

  /**
   * Safely checks if testing mode is enabled in the system settings
   *
   * @returns {boolean} Whether testing mode is enabled
   * @static
   */
  static get isTestingMode() {
    try {
      return typeof erps !== "undefined" &&
        erps.settings &&
        typeof erps.settings.getSetting === "function"
        ? erps.settings.getSetting("testingMode")
        : false;
    } catch {
      // Settings not available yet or testingMode not registered
      return false;
    }
  }
}

/**
 * Utility object that contains all static methods from CommonFoundryTasks
 * for easier spreading into other objects
 * @type {Object}
 */
export const commonTasks = {
  getTargetArray: CommonFoundryTasks.getTargetArray,
  getSelectedArray: CommonFoundryTasks.getSelectedArray,
  storeUserFlag: CommonFoundryTasks.storeUserFlag,
  retrieveUserFlag: CommonFoundryTasks.retrieveUserFlag,
  retrieveSheetTheme: CommonFoundryTasks.retrieveSheetTheme,
  storeMultipleUserFlags: CommonFoundryTasks.storeMultipleUserFlags,
  retrieveMultipleUserFlags: CommonFoundryTasks.retrieveMultipleUserFlags,
  isTestingMode: () => CommonFoundryTasks.isTestingMode,
};
