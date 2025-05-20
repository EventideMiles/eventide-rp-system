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
   * Retrieves the first token which is currently targeted by the user.
   * 
   * @returns {Token|null} The first targeted token or null if none targeted
   * @static
   */
  static getFirstTarget() {
    return CommonFoundryTasks.getTargetArray()?.[0] || null;
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
   * Retrieves the first token which is currently selected by the user.
   * 
   * @returns {Token|null} The first selected token or null if none selected
   * @static
   */
  static getFirstSelected() {
    return CommonFoundryTasks.getSelectedArray()?.[0] || null;
  }

  /**
   * Clamps a number between a minimum and maximum value.
   * 
   * @param {number} num - The number to clamp
   * @param {number} min - The minimum value
   * @param {number} max - The maximum value
   * @returns {number} The clamped value
   * @static
   */
  static clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
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
   * Deletes a flag from the user's flags for the Eventide system.
   * 
   * @param {string} key - The key of the flag to delete
   * @returns {Promise<User>} A Promise which resolves to the updated User
   * @static
   */
  static async deleteUserFlag(key) {
    return game.user.unsetFlag(CommonFoundryTasks.SYSTEM_ID, key);
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
   * Deletes multiple flags from the user's flags for the Eventide system.
   * 
   * @param {string[]} keys - An array of keys to delete
   * @returns {Promise<void>} A Promise which resolves when all flags are deleted
   * @static
   */
  static async deleteMultipleUserFlags(keys) {
    const promises = [];
    for (const key of keys) {
      promises.push(CommonFoundryTasks.deleteUserFlag(key));
    }
    await Promise.all(promises);
  }

  /**
   * Determines the permission level of the current user.
   * 
   * @returns {string} "gm" if the user is a GM, otherwise "player"
   * @static
   */
  static permissionLevel() {
    return game.user.isGM ? "gm" : "player";
  }

  /**
   * Checks if the current user has permission to perform an action.
   * If not permitted and the user is not a GM, displays an error notification.
   * 
   * @param {Object} [options={}] - Options object
   * @param {boolean} [options.playerMode=false] - Whether to allow player access
   * @returns {string} "gm" if GM, "player" if player and playerMode is true, or "forbidden"
   * @static
   */
  static permissionCheck({ playerMode = false } = {}) {
    if (game.user.isGM) return "gm";
    if (playerMode) return "player";
    
    // Show error notification if action is not permitted for players
    ui.notifications.error(
      game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.GMOnly")
    );
    return "forbidden";
  }

  /**
   * Safely checks if testing mode is enabled in the system settings
   * 
   * @returns {boolean} Whether testing mode is enabled
   * @static
   */
  static get isTestingMode() {
    return typeof erps !== "undefined" &&
      erps.settings &&
      typeof erps.settings.getSetting === "function"
      ? erps.settings.getSetting("testingMode")
      : false;
  }
}

/**
 * Utility object that contains all static methods from CommonFoundryTasks
 * for easier spreading into other objects
 * @type {Object}
 */
export const commonTasks = {
  getTargetArray: CommonFoundryTasks.getTargetArray,
  getFirstTarget: CommonFoundryTasks.getFirstTarget,
  getSelectedArray: CommonFoundryTasks.getSelectedArray,
  getFirstSelected: CommonFoundryTasks.getFirstSelected,
  clamp: CommonFoundryTasks.clamp,
  storeUserFlag: CommonFoundryTasks.storeUserFlag,
  retrieveUserFlag: CommonFoundryTasks.retrieveUserFlag,
  deleteUserFlag: CommonFoundryTasks.deleteUserFlag,
  storeMultipleUserFlags: CommonFoundryTasks.storeMultipleUserFlags,
  retrieveMultipleUserFlags: CommonFoundryTasks.retrieveMultipleUserFlags,
  deleteMultipleUserFlags: CommonFoundryTasks.deleteMultipleUserFlags,
  permissionLevel: CommonFoundryTasks.permissionLevel,
  permissionCheck: CommonFoundryTasks.permissionCheck,
  isTestingMode: () => CommonFoundryTasks.isTestingMode,
};
