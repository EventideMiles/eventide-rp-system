/**
 * A utility class that provides common Foundry VTT operations related to tokens,
 * user flags, permissions, and more.
 * @class
 */
export class CommonFoundryTasks {
  static SYSTEM_ID = "eventide-rp-system";

  /**
   * Retrieves an array of tokens which are currently targeted by the user.
   * @returns {Array<Token>} Returns an array of tokens which are currently targeted.
   * @static
   */
  static getTargetArray() {
    return game.user.targets.size ? Array.from(game.user.targets) : [];
  }

  /**
   * Retrieves the first token which is currently targeted by the user.
   * @returns {Token|null} Returns the first targeted token or null if no tokens are targeted.
   * @static
   */
  static getFirstTarget() {
    return CommonFoundryTasks.getTargetArray()?.[0] || null;
  }

  /**
   * Retrieves an array of tokens which are currently selected by the user.
   * @returns {Array<Token>} Returns an array of tokens which are currently selected.
   * @static
   */
  static getSelectedArray() {
    return canvas.tokens.controlled;
  }

  /**
   * Retrieves the first token which is currently selected by the user.
   * @returns {Token|null} Returns the first selected token or null if no tokens are selected.
   * @static
   */
  static getFirstSelected() {
    return CommonFoundryTasks.getSelectedArray()?.[0] || null;
  }

  /**
   * Clamps a number between a minimum and maximum value.
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
   * @param {string} key - The key to store the value under
   * @param {*} value - The value to store
   * @returns {Promise<User>} A Promise which resolves to the updated User
   * @static
   */
  static storeUserFlag(key, value) {
    return game.user.setFlag(CommonFoundryTasks.SYSTEM_ID, key, value);
  }

  /**
   * Retrieves a value from the user's flags for the Eventide system.
   * @param {string} key - The key of the flag to retrieve
   * @returns {*} The value stored under the given key
   * @static
   */
  static retrieveUserFlag(key) {
    return game.user.getFlag(CommonFoundryTasks.SYSTEM_ID, key);
  }

  /**
   * Deletes a flag from the user's flags for the Eventide system.
   * @param {string} key - The key of the flag to delete
   * @returns {Promise<User>} A Promise which resolves to the updated User
   * @static
   */
  static deleteUserFlag(key) {
    return game.user.unsetFlag(CommonFoundryTasks.SYSTEM_ID, key);
  }

  /**
   * Stores multiple values in the user's flags for the Eventide system.
   * @param {Object} flags - An object containing key-value pairs to be stored in user flags
   * @static
   */
  static storeMultipleUserFlags(flags) {
    for (const flag in flags) {
      CommonFoundryTasks.storeUserFlag(flag, flags[flag]);
    }
  }

  /**
   * Retrieves multiple values from the user's flags for the Eventide system.
   * @param {Array<string>} keys - An array of keys whose values need to be retrieved from user flags
   * @returns {Object} An object containing key-value pairs retrieved from user flags
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
   * @param {Array<string>} keys - An array of keys of flags to delete
   * @static
   */
  static deleteMultipleUserFlags(keys) {
    for (const key of keys) {
      CommonFoundryTasks.deleteUserFlag(key);
    }
  }

  /**
   * Determines the permission level of the current user.
   * @returns {string} Returns "gm" if the user is a GM, otherwise "player"
   * @static
   */
  static permissionLevel() {
    if (game.user.isGM) return "gm";
    return "player";
  }

  /**
   * Checks if the current user has permission to perform an action.
   * @param {Object} options - The options object
   * @param {boolean} [options.playerMode=false] - Whether to allow player access
   * @returns {string} Returns "gm" if the user is a GM, "player" if the user is a player and playerMode is true,
   *                   or "forbidden" if the user is a player and playerMode is false
   * @static
   */
  static permissionCheck({ playerMode = false } = {}) {
    if (game.user.isGM) return "gm";
    if (playerMode) return "player";
    ui.notification.error(
      game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.GMOnly")
    );
    return "forbidden";
  }
}

/**
 * Utility object that contains all static methods from CommonFoundryTasks for easier spreading
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
};
