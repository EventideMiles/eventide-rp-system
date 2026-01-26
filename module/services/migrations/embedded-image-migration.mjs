import { Logger } from "../logger.mjs";

/**
 * Migration service for embedded item fixes
 * Handles migrations for:
 * - Issue #127: Fix broken image associations in embedded items
 * - Issue #128: Migrate existing action cards to use statusApplicationLimit
 */
export class EmbeddedImageMigration {
  /**
   * Run the migration to fix embedded item images
   * Only runs once per world by tracking the migration version
   *
   * @returns {Promise<void>}
   */
  static async run() {
    // Only GMs should run migrations
    if (!game.user.isGM) {
      return;
    }

    const migrationVersion = "1.2.0";
    const lastMigration = game.settings.get(
      "eventide-rp-system",
      "embeddedImageMigrationVersion"
    );

    if (lastMigration === migrationVersion) {
      Logger.debug(
        "Embedded image migration already completed",
        { version: migrationVersion },
        "MIGRATION"
      );
      return;
    }

    Logger.info(
      "Starting embedded image migration",
      { version: migrationVersion },
      "MIGRATION"
    );

    try {
      let itemsFixed = 0;
      let effectsFixed = 0;

      // Process all items in the world for embedded image fixes
      for (const item of game.items) {
        const result = await this._processItem(item);
        itemsFixed += result.itemsFixed;
        effectsFixed += result.effectsFixed;
      }

      // Process items in all actors
      for (const actor of game.actors) {
        for (const item of actor.items) {
          const result = await this._processItem(item);
          itemsFixed += result.itemsFixed;
          effectsFixed += result.effectsFixed;
        }
      }

      // Process items in unlocked compendiums
      for (const pack of game.packs) {
        if (
          pack.documentName === "Item" &&
          !pack.locked &&
          pack.metadata.packageType === "world"
        ) {
          const documents = await pack.getDocuments();
          for (const item of documents) {
            const result = await this._processItem(item);
            itemsFixed += result.itemsFixed;
            effectsFixed += result.effectsFixed;
          }
        }
      }

      // Save migration version
      await game.settings.set(
        "eventide-rp-system",
        "embeddedImageMigrationVersion",
        migrationVersion
      );

      Logger.info(
        "Embedded image migration completed",
        { itemsFixed, effectsFixed, version: migrationVersion },
        "MIGRATION"
      );

      if (itemsFixed > 0 || effectsFixed > 0) {
        ui.notifications.info(
          `Embedded image migration complete: Fixed ${effectsFixed} effect images across ${itemsFixed} items.`
        );
      }
    } catch (error) {
      Logger.error(
        "Embedded image migration failed",
        error,
        "MIGRATION"
      );
      ui.notifications.error(
        "Embedded image migration failed. Check the console for details."
      );
    }
  }

  /**
   * Process a single item and fix any embedded image issues
   * @param {Item} item - The item to process
   * @returns {Promise<{itemsFixed: number, effectsFixed: number}>}
   */
  static async _processItem(item) {
    let itemsFixed = 0;
    let effectsFixed = 0;

    // Handle action cards with embedded status effects
    if (item.type === "actionCard" && item.system.embeddedStatusEffects?.length > 0) {
      const result = await this._fixActionCardEmbeddedEffects(item);
      if (result.fixed) {
        itemsFixed++;
        effectsFixed += result.effectsFixed;
      }
    }

    // Handle action cards with embedded items (gear, combatPower, feature)
    if (item.type === "actionCard" && item.system.embeddedItem) {
      const result = await this._fixActionCardEmbeddedItem(item);
      if (result.fixed) {
        itemsFixed++;
        effectsFixed += result.effectsFixed;
      }
    }

    // Handle transformations with embedded combat powers
    if (item.type === "transformation" && item.system.embeddedCombatPowers?.length > 0) {
      const result = await this._fixTransformationEmbeddedPowers(item);
      if (result.fixed) {
        itemsFixed++;
        effectsFixed += result.effectsFixed;
      }
    }

    // Handle transformations with embedded action cards
    if (item.type === "transformation" && item.system.embeddedActionCards?.length > 0) {
      const result = await this._fixTransformationEmbeddedActionCards(item);
      if (result.fixed) {
        itemsFixed++;
        effectsFixed += result.effectsFixed;
      }
    }

    return { itemsFixed, effectsFixed };
  }

  /**
   * Fix embedded status effects in an action card
   * @param {Item} item - The action card item
   * @returns {Promise<{fixed: boolean, effectsFixed: number}>}
   */
  static async _fixActionCardEmbeddedEffects(item) {
    let effectsFixed = 0;
    let needsUpdate = false;

    const statusEffects = foundry.utils.deepClone(item.system.embeddedStatusEffects);

    for (const embeddedItem of statusEffects) {
      if (!embeddedItem.effects || !Array.isArray(embeddedItem.effects)) {
        continue;
      }

      for (const effect of embeddedItem.effects) {
        // Sync effect icon/img with item image
        if (effect.icon !== embeddedItem.img && embeddedItem.img) {
          effect.icon = embeddedItem.img;
          effect.img = embeddedItem.img;
          needsUpdate = true;
          effectsFixed++;
        }

        // Sync effect name with item name (optional - for completeness)
        if (effect.name !== embeddedItem.name && embeddedItem.name) {
          effect.name = embeddedItem.name;
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      await item.update({ "system.embeddedStatusEffects": statusEffects });
      Logger.debug(
        "Fixed embedded status effect images in action card",
        { itemName: item.name, effectsFixed },
        "MIGRATION"
      );
    }

    return { fixed: needsUpdate, effectsFixed };
  }

  /**
   * Fix embedded item's effects in an action card
   * @param {Item} item - The action card item
   * @returns {Promise<{fixed: boolean, effectsFixed: number}>}
   */
  static async _fixActionCardEmbeddedItem(item) {
    let effectsFixed = 0;
    let needsUpdate = false;

    const embeddedItem = foundry.utils.deepClone(item.system.embeddedItem);

    if (embeddedItem.effects && Array.isArray(embeddedItem.effects)) {
      for (const effect of embeddedItem.effects) {
        // Sync effect icon/img with item image
        if (effect.icon !== embeddedItem.img && embeddedItem.img) {
          effect.icon = embeddedItem.img;
          effect.img = embeddedItem.img;
          needsUpdate = true;
          effectsFixed++;
        }

        // Sync effect name with item name
        if (effect.name !== embeddedItem.name && embeddedItem.name) {
          effect.name = embeddedItem.name;
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      await item.update({ "system.embeddedItem": embeddedItem });
      Logger.debug(
        "Fixed embedded item effect images in action card",
        { itemName: item.name, effectsFixed },
        "MIGRATION"
      );
    }

    return { fixed: needsUpdate, effectsFixed };
  }

  /**
   * Fix embedded combat powers in a transformation
   * @param {Item} item - The transformation item
   * @returns {Promise<{fixed: boolean, effectsFixed: number}>}
   */
  static async _fixTransformationEmbeddedPowers(item) {
    let effectsFixed = 0;
    let needsUpdate = false;

    const embeddedPowers = foundry.utils.deepClone(item.system.embeddedCombatPowers);

    for (const power of embeddedPowers) {
      if (!power.effects || !Array.isArray(power.effects)) {
        continue;
      }

      for (const effect of power.effects) {
        // Sync effect icon/img with item image
        if (effect.icon !== power.img && power.img) {
          effect.icon = power.img;
          effect.img = power.img;
          needsUpdate = true;
          effectsFixed++;
        }

        // Sync effect name with item name
        if (effect.name !== power.name && power.name) {
          effect.name = power.name;
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      await item.update({ "system.embeddedCombatPowers": embeddedPowers });
      Logger.debug(
        "Fixed embedded combat power effect images in transformation",
        { itemName: item.name, effectsFixed },
        "MIGRATION"
      );
    }

    return { fixed: needsUpdate, effectsFixed };
  }

  /**
   * Fix embedded action cards in a transformation
   * @param {Item} item - The transformation item
   * @returns {Promise<{fixed: boolean, effectsFixed: number}>}
   */
  static async _fixTransformationEmbeddedActionCards(item) {
    let effectsFixed = 0;
    let needsUpdate = false;

    const embeddedActionCards = foundry.utils.deepClone(item.system.embeddedActionCards);

    for (const actionCard of embeddedActionCards) {
      // Fix embedded item in the action card
      if (actionCard.system?.embeddedItem?.effects) {
        const embeddedItem = actionCard.system.embeddedItem;
        for (const effect of embeddedItem.effects) {
          if (effect.icon !== embeddedItem.img && embeddedItem.img) {
            effect.icon = embeddedItem.img;
            effect.img = embeddedItem.img;
            needsUpdate = true;
            effectsFixed++;
          }
          if (effect.name !== embeddedItem.name && embeddedItem.name) {
            effect.name = embeddedItem.name;
            needsUpdate = true;
          }
        }
      }

      // Fix embedded status effects in the action card
      if (actionCard.system?.embeddedStatusEffects) {
        for (const statusEffect of actionCard.system.embeddedStatusEffects) {
          if (statusEffect.effects && Array.isArray(statusEffect.effects)) {
            for (const effect of statusEffect.effects) {
              if (effect.icon !== statusEffect.img && statusEffect.img) {
                effect.icon = statusEffect.img;
                effect.img = statusEffect.img;
                needsUpdate = true;
                effectsFixed++;
              }
              if (effect.name !== statusEffect.name && statusEffect.name) {
                effect.name = statusEffect.name;
                needsUpdate = true;
              }
            }
          }
        }
      }
    }

    if (needsUpdate) {
      await item.update({ "system.embeddedActionCards": embeddedActionCards });
      Logger.debug(
        "Fixed embedded action card effect images in transformation",
        { itemName: item.name, effectsFixed },
        "MIGRATION"
      );
    }

    return { fixed: needsUpdate, effectsFixed };
  }
}
