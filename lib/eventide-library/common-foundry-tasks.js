const getTargetArray = async () => {
  return game.user.targets.size ? Array.from(game.user.targets) : []; //Array.from(game.user.character.getActiveTokens());
};

const getSelectedArray = async () => {
  return canvas.tokens.controlled;
};

const clamp = (num, min, max) => {
  return Math.min(Math.max(num, min), max);
};

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

const retrieveLocal = async (keys) => {
  const returnObject = {};

  for (const key of keys) {
    returnObject[key] = localStorage.getItem(key);
  }

  return returnObject;
};

export { getTargetArray, getSelectedArray, clamp, storeLocal, retrieveLocal };
