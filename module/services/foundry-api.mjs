export class FoundryAPI {
  // --------------------------------------------
  // Constants
  // --------------------------------------------

  static BUILT_FOR_FOUNDRY_VERSION = "V13";
  static SYSTEM_ID = "eventide-rp-system";

  // --------------------------------------------
  // General
  // --------------------------------------------

  static getTargetArray = async () => {
    return game.user.targets.size ? game.user.targets.values().toArray() : [];
  };

  static getTargetActors = async () => {
    return game.user.targets.size
      ? await FoundryAPI.getTargetArray().map((t) => t.actor)
      : [];
  };

  static getFirstTarget = async () => {
    return (await FoundryAPI.getTargetArray())[0] || null;
  };

  // static getFirstTargetActor = async () => {
  //   return game.user.targets.values().next().value?.actor || null;
  // };

  static getSelectedArray = async () => {
    return canvas.tokens.controlled;
  };

  // static getSelectedActors = async () => {
  //   return canvas.tokens.controlled.map((t) => t.actor);
  // };

  static getFirstSelected = async () => {
    return (await FoundryAPI.getSelectedArray())[0] || null;
  };

  // static getFirstSelectedActor = async () => {
  //   return (await FoundryAPI.getSelectedArray())[0]?.actor || null;
  // };

  static permissionCheck = async ({ playerMode = false } = {}) => {
    if (game.user.isGM) return "gm";
    if (playerMode) return "player";
    ui.notification.error(
      game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.GMOnly")
    );
    return "forbidden";
  };

  static isGm = () => {
    return game.user.isGM;
  };

  static ifGmRun = (callback) => {
    if (game.user.isGM) callback();
  };

  // --------------------------------------------
  // Document Handling
  // --------------------------------------------

  static createBaseActor = async (actorData) => {
    return await game.actors.createDocument(actorData);
  };

  static updateBaseActor = async (actorId, actorData) => {
    return await game.actors.get(actorId).update(actorData);
  };

  static deleteBaseActor = async (actorId) => {
    return await game.actors.get(actorId).delete();
  };

  static getBaseActor = async (actorId) => {
    return await game.actors.get(actorId);
  };

  static getAllBaseActors = async () => {
    return await game.actors;
  };

  static createBaseItem = async (itemData) => {
    return await game.items.createDocument(itemData);
  };

  static updateTokenItem = async (tokenId, itemData) => {
    return await game.actors
      .get(tokenId)
      .updateEmbeddedDocuments("Item", [itemData]);
  };

  static deleteBaseItem = async (itemId) => {
    return await game.items.get(itemId).delete();
  };

  static getBaseItem = async (itemId) => {
    return await game.items.get(itemId);
  };

  static getAllBaseItems = async () => {
    return await game.items;
  };

  static createBaseActorItems = async (actorId, itemData) => {
    if (!Array.isArray(itemData)) itemData = [itemData];
    return await game.actors
      .get(actorId)
      .createEmbeddedDocuments("Item", itemData);
  };

  static updateBaseActorItems = async (actorId, itemData) => {
    if (!Array.isArray(itemData)) itemData = [itemData];
    return await game.actors
      .get(actorId)
      .updateEmbeddedDocuments("Item", itemData);
  };

  static deleteBaseActorItems = async (actorId, itemId) => {
    if (!Array.isArray(itemId)) itemId = [itemId];
    return await game.actors
      .get(actorId)
      .deleteEmbeddedDocuments("Item", itemId);
  };

  static createTokenItems = async (token, itemData) => {
    if (!Array.isArray(itemData)) itemData = [itemData];
    return await token.actor.createEmbeddedDocuments("Item", itemData);
  };

  static updateTokenItems = async (token, itemData) => {
    if (!Array.isArray(itemData)) itemData = [itemData];
    return await token.actor.updateEmbeddedDocuments("Item", itemData);
  };

  static deleteTokenItems = async (token, itemId) => {
    if (!Array.isArray(itemId)) itemId = [itemId];
    return await token.actor.deleteEmbeddedDocuments("Item", itemId);
  };

  static createActiveEffectOnItem = async (item, itemData) => {
    if (!Array.isArray(itemData)) itemData = [itemData];
    return await item.createEmbeddedDocuments("ActiveEffect", itemData);
  };

  static updateActiveEffectOnItem = async (item, itemData) => {
    if (!Array.isArray(itemData)) itemData = [itemData];
    return await item.updateEmbeddedDocuments("ActiveEffect", itemData);
  };

  static deleteActiveEffectOnItem = async (item, itemId) => {
    if (!Array.isArray(itemId)) itemId = [itemId];
    return await item.deleteEmbeddedDocuments("ActiveEffect", itemId);
  };

  // --------------------------------------------
  // Flags
  // --------------------------------------------

  static storeFlag = async (key, value) => {
    return game.user.setFlag(FoundryAPI.SYSTEM_ID, key, value);
  };

  static retrieveFlag = async (key) => {
    return game.user.getFlag(FoundryAPI.SYSTEM_ID, key);
  };

  static deleteFlag = async (key) => {
    return game.user.unsetFlag(FoundryAPI.SYSTEM_ID, key);
  };

  static storeMultipleFlags = async (flags) => {
    for (const flag in flags) {
      await FoundryAPI.storeFlag(flag, flags[flag]);
    }
  };

  static retrieveMultipleFlags = async (keys) => {
    const returnObject = {};

    for (const key of keys) {
      returnObject[key] = FoundryAPI.retrieveFlag(key);
    }

    return returnObject;
  };

  static deleteMultipleFlags = async (keys) => {
    for (const key of keys) {
      await FoundryAPI.deleteFlag(key);
    }
  };
}
