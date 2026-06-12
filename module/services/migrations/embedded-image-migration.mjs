import { Logger } from "../logger.mjs";

export class EmbeddedImageMigration {
  static async run() {
    if (!game.user.isGM) return;

    const migrationVersion = 2;

    let oldTrackingSetting = null;
    try {
      oldTrackingSetting = game.settings.get(
        "eventide-rp-system",
        "embeddedImageMigrationVersion",
      );
    } catch {
      // Old setting doesn't exist, which is fine for new installations
    }

    const lastMigration = game.settings.get(
      "eventide-rp-system",
      "migrationVersion",
    );

    const migrationLevel = Math.floor(Number(lastMigration) || 0);

    if (oldTrackingSetting != null) {
      Logger.info(
        "Cleaning up old embeddedImageMigrationVersion setting",
        { oldValue: oldTrackingSetting },
        "MIGRATION",
      );
      await game.settings.set(
        "eventide-rp-system",
        "embeddedImageMigrationVersion",
        null,
      );
      Logger.info(
        "Embedded image migration already completed (old setting found)",
        null,
        "MIGRATION",
      );

      if (isNaN(migrationLevel) || migrationLevel < migrationVersion) {
        await game.settings.set(
          "eventide-rp-system",
          "migrationVersion",
          migrationVersion,
        );
        Logger.info(
          "Updated migrationVersion to current version due to old tracking setting",
          { migrationVersion },
          "MIGRATION",
        );
      }
      return;
    }

    if (lastMigration == null) {
      Logger.info(
        "Starting embedded image migration (first migration)",
        null,
        "MIGRATION",
      );
    } else if (migrationLevel >= migrationVersion) {
      Logger.debug(
        "Embedded image migration already completed",
        { level: migrationLevel },
        "MIGRATION",
      );
      return;
    } else {
      Logger.info(
        "Starting embedded image migration",
        { level: migrationLevel },
        "MIGRATION",
      );
    }

    const migrationNotification = ui.notifications.warn(
      game.i18n.localize("EVENTIDE_RP_SYSTEM.Migration.InProgress"),
      { permanent: true },
    );

    try {
      let itemsFixed = 0;
      let effectsFixed = 0;
      let statusFieldsMigrated = 0;

      const processItems = async (items) => {
        for (const item of items) {
          const result = await this._processItem(item);
          itemsFixed += result.itemsFixed;
          effectsFixed += result.effectsFixed;
          statusFieldsMigrated += result.statusFieldsMigrated;
        }
      };

      await processItems(game.items);

      for (const actor of game.actors) {
        await processItems(actor.items);
      }

      for (const pack of game.packs) {
        if (
          pack.documentName === "Item" &&
          !pack.locked &&
          pack.metadata.packageType === "world"
        ) {
          const documents = await pack.getDocuments();
          await processItems(documents);
        }
      }

      await game.settings.set(
        "eventide-rp-system",
        "migrationVersion",
        migrationVersion,
      );

      Logger.info(
        "Embedded image migration completed",
        { itemsFixed, effectsFixed, statusFieldsMigrated, level: migrationVersion },
        "MIGRATION",
      );

      migrationNotification.remove();

      const messages = [];
      if (effectsFixed > 0) {
        messages.push(game.i18n.format("EVENTIDE_RP_SYSTEM.Migration.FixedEffectImages", {
          effectsFixed,
          itemsFixed,
        }));
      }
      if (statusFieldsMigrated > 0) {
        messages.push(game.i18n.format("EVENTIDE_RP_SYSTEM.Migration.MigratedStatusFields", {
          count: statusFieldsMigrated,
        }));
      }

      if (messages.length > 0) {
        ui.notifications.info(game.i18n.format("EVENTIDE_RP_SYSTEM.Migration.Complete", {
          message: messages.join(". "),
        }));
      } else {
        ui.notifications.info(game.i18n.localize("EVENTIDE_RP_SYSTEM.Migration.CompleteNoChanges"));
      }
    } catch (error) {
      migrationNotification.remove();
      Logger.error("Embedded image migration failed", error, "MIGRATION");
      ui.notifications.error(game.i18n.localize("EVENTIDE_RP_SYSTEM.Migration.Failed"));
    }
  }

  static async _processItem(item) {
    let itemsFixed = 0;
    let effectsFixed = 0;
    let statusFieldsMigrated = 0;

    if (item.type === "actionCard") {
      const result = await this._migrateStatusPerSuccess(item);
      if (result.fixed) {
        itemsFixed++;
        statusFieldsMigrated++;
      }
    }

    if (item.type === "actionCard") {
      const arraysResult = await this._fixActionCardEmbeddedArrays(item);
      itemsFixed += arraysResult.itemsFixed;
      effectsFixed += arraysResult.effectsFixed;
    }

    if (item.type === "actionCard" && item.system.embeddedItem) {
      const itemResult = await this._fixActionCardEmbeddedItem(item);
      itemsFixed += itemResult.itemsFixed;
      effectsFixed += itemResult.effectsFixed;
    }

    if (item.type === "status" && item.effects?.size > 0) {
      const result = await this._fixStatusItemEffects(item);
      if (result.fixed) {
        itemsFixed++;
        effectsFixed += result.effectsFixed;
      }
    }

    if (item.type === "transformation") {
      if (item.system.embeddedCombatPowers?.length > 0) {
        const result = await this._fixTransformationEmbeddedPowers(item);
        if (result.fixed) {
          itemsFixed++;
          effectsFixed += result.effectsFixed;
        }
      }

      if (item.system.embeddedActionCards?.length > 0) {
        const result = await this._fixTransformationEmbeddedActionCards(item);
        if (result.fixed) {
          itemsFixed++;
          effectsFixed += result.effectsFixed;
        }
      }
    }

    return { itemsFixed, effectsFixed, statusFieldsMigrated };
  }

  static async _fixActionCardEmbeddedArrays(item) {
    let effectsFixed = 0;
    const updateData = {};

    const syncArrayEffects = (arrayName) => {
      const items = foundry.utils.getProperty(item.system, arrayName);
      if (!items || !Array.isArray(items) || items.length === 0) return;

      const updated = foundry.utils.deepClone(items);
      let changed = false;

      for (const entry of updated) {
        if (!entry.img || !entry.effects || !Array.isArray(entry.effects)) {
          continue;
        }

        for (const effect of entry.effects) {
          if (effect.img !== entry.img) {
            effect.img = entry.img;
            changed = true;
            effectsFixed++;
          }

          if (effect.icon !== undefined) {
            delete effect.icon;
            changed = true;
          }

          if (effect.name !== entry.name && entry.name) {
            effect.name = entry.name;
            changed = true;
          }
        }
      }

      if (changed) {
        updateData[`system.${arrayName}`] = updated;
      }
    };

    syncArrayEffects("embeddedStatusEffects");
    syncArrayEffects("embeddedTransformations");
    syncArrayEffects("embeddedSelfEffects");

    if (Object.keys(updateData).length > 0) {
      await item.update(updateData, { diff: false });
    }

    return { itemsFixed: Object.keys(updateData).length, effectsFixed };
  }

  static async _fixActionCardEmbeddedItem(item) {
    let effectsFixed = 0;
    let needsUpdate = false;

    const embeddedItem = foundry.utils.deepClone(item.system.embeddedItem);

    if (embeddedItem.effects && Array.isArray(embeddedItem.effects)) {
      for (const effect of embeddedItem.effects) {
        if (effect.img !== embeddedItem.img && embeddedItem.img) {
          effect.img = embeddedItem.img;
          needsUpdate = true;
          effectsFixed++;
        }

        if (effect.icon !== undefined) {
          delete effect.icon;
          needsUpdate = true;
        }

        if (effect.name !== embeddedItem.name && embeddedItem.name) {
          effect.name = embeddedItem.name;
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      await item.update({ "system.embeddedItem": embeddedItem }, { diff: false });
      Logger.debug(
        "Fixed embedded item effect images in action card",
        { itemName: item.name, effectsFixed },
        "MIGRATION",
      );
    }

    return { itemsFixed: needsUpdate ? 1 : 0, effectsFixed };
  }

  static async _migrateStatusPerSuccess(item) {
    const statusPerSuccess = item.system.statusPerSuccess;

    if (typeof statusPerSuccess !== "boolean") {
      return { fixed: false };
    }

    const statusApplicationLimit = statusPerSuccess === true ? 0 : 1;

    await item.update(
      {
        "system.statusApplicationLimit": statusApplicationLimit,
        "system.statusPerSuccess": null,
      },
      { diff: false },
    );

    Logger.debug(
      "Migrated statusPerSuccess to statusApplicationLimit",
      { itemName: item.name, oldValue: statusPerSuccess, newValue: statusApplicationLimit },
      "MIGRATION",
    );

    return { fixed: true };
  }

  static async _fixStatusItemEffects(item) {
    let effectsFixed = 0;
    const updateData = {};

    for (const effect of item.effects) {
      const updates = { _id: effect.id };
      let effectNeedsUpdate = false;

      if (effect.img !== item.img && item.img) {
        updates.img = item.img;
        effectNeedsUpdate = true;
        effectsFixed++;
      }

      if (effect.icon !== undefined) {
        updates["-=icon"] = null;
        effectNeedsUpdate = true;
      }

      if (effectNeedsUpdate) {
        if (!updateData.effects) updateData.effects = [];
        updateData.effects.push(updates);
      }
    }

    if (Object.keys(updateData).length > 0) {
      await item.update(updateData, { diff: false });
      Logger.debug(
        "Fixed status item effect images",
        { itemName: item.name, effectsFixed },
        "MIGRATION",
      );
    }

    return { fixed: Object.keys(updateData).length > 0, effectsFixed };
  }

  static async _fixTransformationEmbeddedPowers(item) {
    let effectsFixed = 0;
    let needsUpdate = false;

    const embeddedPowers = foundry.utils.deepClone(item.system.embeddedCombatPowers);

    for (const power of embeddedPowers) {
      if (!power.effects || !Array.isArray(power.effects)) continue;

      for (const effect of power.effects) {
        if (effect.img !== power.img && power.img) {
          effect.img = power.img;
          needsUpdate = true;
          effectsFixed++;
        }

        if (effect.icon !== undefined) {
          delete effect.icon;
          needsUpdate = true;
        }

        if (effect.name !== power.name && power.name) {
          effect.name = power.name;
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      await item.update({ "system.embeddedCombatPowers": embeddedPowers }, { diff: false });
      Logger.debug(
        "Fixed embedded combat power effect images in transformation",
        { itemName: item.name, effectsFixed },
        "MIGRATION",
      );
    }

    return { fixed: needsUpdate, effectsFixed };
  }

  static async _fixTransformationEmbeddedActionCards(item) {
    let effectsFixed = 0;
    let needsUpdate = false;

    const embeddedActionCards = foundry.utils.deepClone(item.system.embeddedActionCards);

    for (const actionCard of embeddedActionCards) {
      if (typeof actionCard.system?.statusPerSuccess === "boolean") {
        actionCard.system.statusApplicationLimit =
          actionCard.system.statusPerSuccess === true ? 0 : 1;
        actionCard.system.statusPerSuccess = null;
        needsUpdate = true;
      }

      if (actionCard.system?.embeddedItem?.effects) {
        const eItem = actionCard.system.embeddedItem;
        for (const effect of eItem.effects) {
          if (effect.img !== eItem.img && eItem.img) {
            effect.img = eItem.img;
            needsUpdate = true;
            effectsFixed++;
          }
          if (effect.icon !== undefined) {
            delete effect.icon;
            needsUpdate = true;
          }
          if (effect.name !== eItem.name && eItem.name) {
            effect.name = eItem.name;
            needsUpdate = true;
          }
        }
      }

      if (actionCard.system?.embeddedStatusEffects) {
        for (const statusEffect of actionCard.system.embeddedStatusEffects) {
          if (statusEffect.effects && Array.isArray(statusEffect.effects)) {
            for (const effect of statusEffect.effects) {
              if (effect.img !== statusEffect.img && statusEffect.img) {
                effect.img = statusEffect.img;
                needsUpdate = true;
                effectsFixed++;
              }
              if (effect.icon !== undefined) {
                delete effect.icon;
                needsUpdate = true;
              }
              if (effect.name !== statusEffect.name && statusEffect.name) {
                effect.name = statusEffect.name;
                needsUpdate = true;
              }
            }
          }
        }
      }

      if (actionCard.system?.embeddedSelfEffects) {
        for (const selfEffect of actionCard.system.embeddedSelfEffects) {
          if (selfEffect.effects && Array.isArray(selfEffect.effects)) {
            for (const effect of selfEffect.effects) {
              if (effect.img !== selfEffect.img && selfEffect.img) {
                effect.img = selfEffect.img;
                needsUpdate = true;
                effectsFixed++;
              }
              if (effect.icon !== undefined) {
                delete effect.icon;
                needsUpdate = true;
              }
              if (effect.name !== selfEffect.name && selfEffect.name) {
                effect.name = selfEffect.name;
                needsUpdate = true;
              }
            }
          }
        }
      }

      if (actionCard.system?.embeddedTransformations) {
        for (const transformation of actionCard.system.embeddedTransformations) {
          if (transformation.effects && Array.isArray(transformation.effects)) {
            for (const effect of transformation.effects) {
              if (effect.img !== transformation.img && transformation.img) {
                effect.img = transformation.img;
                needsUpdate = true;
                effectsFixed++;
              }
              if (effect.icon !== undefined) {
                delete effect.icon;
                needsUpdate = true;
              }
              if (effect.name !== transformation.name && transformation.name) {
                effect.name = transformation.name;
                needsUpdate = true;
              }
            }
          }
        }
      }
    }

    if (needsUpdate) {
      await item.update({ "system.embeddedActionCards": embeddedActionCards }, { diff: false });
      Logger.debug(
        "Fixed embedded action card effect images in transformation",
        { itemName: item.name, effectsFixed },
        "MIGRATION",
      );
    }

    return { fixed: needsUpdate, effectsFixed };
  }
}
