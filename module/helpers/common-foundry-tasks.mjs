/**
 * Retrieves an array of tokens which are currently targeted by the user.
 *
 * @returns {Array<Token>} Returns an array of tokens which are currently targeted.
 */
const getTargetArray = () => {
  return game.user.targets.size ? Array.from(game.user.targets) : []; //Array.from(game.user.character.getActiveTokens());
};

/**
 * Retrieves an array of tokens which are currently selected by the user.
 *
 * @returns {Array<Token>} Returns an array of tokens which are currently selected.
 */
const getSelectedArray = () => {
  return canvas.tokens.controlled;
};

/**
 * Clamps a number between a minimum and maximum value.
 * @param {number} num - The number to clamp
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {number} The clamped value
 */
const clamp = (num, min, max) => {
  return Math.min(Math.max(num, min), max);
};

/**
 * Stores key-value pairs from a given object into local storage.
 *
 * @param {Object} storageObject - An object containing key-value pairs to be stored in local storage.
 * @returns {boolean} Returns true if storage was successful, otherwise false if an error occurred.
 */

const storeLocal = (storageObject) => {
  try {
    for (const item in storageObject) {
      localStorage.setItem(item, storageObject[item]);
    }
  } catch (error) {
    ui.notifications.error(
      `There was some sort of error storing values locally.`
    );
    return false;
  }
  return true;
};

/**
 * Retrieves values from local storage for the given keys.
 *
 * @param {Array} keys - An array of keys whose values need to be retrieved from local storage.
 * @returns {Object} An object containing key-value pairs retrieved from local storage.
 */

const retrieveLocal = (keys) => {
  const returnObject = {};

  for (const key of keys) {
    returnObject[key] = localStorage.getItem(key);
  }

  return returnObject;
};

export { getTargetArray, getSelectedArray, clamp, storeLocal, retrieveLocal };
