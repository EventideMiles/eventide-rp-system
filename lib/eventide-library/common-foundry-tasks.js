const getTargetArray = async () => {
  return game.user.targets.size ? Array.from(game.user.targets) : []; //Array.from(game.user.character.getActiveTokens());
};

export { getTargetArray };
