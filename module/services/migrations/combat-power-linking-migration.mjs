/**
 * Combat Power Linking Migration
 *
 * Migrates existing action cards from embedded combat power snapshots to
 * linked references. For each action card on an actor that has an embedded
 * combat power but no embeddedItemRef:
 *
 * 1. Check if a matching combat power already exists on the actor (deduplication
 *    by name + img + system data comparison).
 * 2. If found, link to the existing item.
 * 3. If not found, create the combat power on the actor and link to it.
 * 4. Set embeddedItemRef and refresh the embeddedItem snapshot.
 *
 * This migration runs once and is tracked via the migrationVersion setting.
 *
 * @module CombatPowerLinkingMigration
 */

import { Logger } from "../logger.mjs";

const MIGRATION_VERSION = 3;

export class CombatPowerLinkingMigration {
  /**
   * Run the combat power linking migration.
   *
   * @static
   * @returns {Promise<number>} Number of action cards migrated
   */
  static async run() {
    if (!game.user.isGM) return 0;

    const lastMigration = game.settings.get(
      "eventide-rp-system",
      "migrationVersion",
    );
    const migrationLevel = Math.floor(Number(lastMigration) || 0);

    if (migrationLevel >= MIGRATION_VERSION) {
      Logger.debug(
        "Combat power linking migration already completed",
        { level: migrationLevel },
        "MIGRATION",
      );
      return 0;
    }

    Logger.info(
      "Starting combat power linking migration...",
      null,
      "MIGRATION",
    );

    const migrationNotification = ui.notifications?.info(
      game.i18n.localize("EVENTIDE_RP_SYSTEM.Migration.InProgress"),
      { permanent: true },
    );

    let migratedCount = 0;
    let failureCount = 0;

    try {
      // Process actors and their owned action cards
      const actorsToProcess = [
        ...game.actors.values(),
      ].filter((actor) => actor.isOwner);

      for (const actor of actorsToProcess) {
        const result = await CombatPowerLinkingMigration._processActor(
          actor,
        );
        migratedCount += result.migrated;
        failureCount += result.failed;
      }

      if (failureCount > 0) {
        Logger.warn(
          `Combat power linking migration completed with ${failureCount} failure(s). Migration version NOT updated — will retry on next load.`,
          { migratedCount, failureCount },
          "MIGRATION",
        );
      } else {
        // All cards succeeded — update migration version
        await game.settings.set(
          "eventide-rp-system",
          "migrationVersion",
          MIGRATION_VERSION,
        );

        Logger.info(
          `Combat power linking migration complete. Migrated ${migratedCount} action card(s).`,
          { migratedCount, migrationVersion: MIGRATION_VERSION },
          "MIGRATION",
        );
      }
    } catch (error) {
      Logger.error(
        "Combat power linking migration failed",
        error,
        "MIGRATION",
      );
    } finally {
      migrationNotification?.remove?.();
    }

    return migratedCount;
  }

  /**
   * Process a single actor's action cards.
   *
   * @param {Actor} actor - The actor to process
   * @returns {Promise<{migrated: number, failed: number}>} Counts for this actor
   * @private
   * @static
   */
  static async _processActor(actor) {
    const actionCards = actor.items.filter(
      (item) =>
        item.type === "actionCard" &&
        item.system.mode === "attackChain" &&
        item.system.embeddedItemRef === null &&
        item.system.embeddedItem &&
        item.system.embeddedItem.type === "combatPower" &&
        Object.keys(item.system.embeddedItem).length > 0,
    );

    let count = 0;
    let failed = 0;

    for (const card of actionCards) {
      try {
        const embeddedData = card.system.embeddedItem;

        // Check if a matching combat power already exists on the actor
        const existingItem = CombatPowerLinkingMigration._findMatchingItem(
          actor,
          embeddedData,
        );

        let itemId;

        if (existingItem) {
          // Link to existing item
          itemId = existingItem.id;
          Logger.debug(
            `Linked action card "${card.name}" to existing combat power "${existingItem.name}"`,
            { cardId: card.id, itemId },
            "MIGRATION",
          );
        } else {
          // Create a new combat power on the actor from the embedded snapshot
          const cleanData = foundry.utils.deepClone(embeddedData);
          delete cleanData._id;
          // Remove flags that reference the action card
          if (cleanData.flags) {
            delete cleanData.flags["eventide-rp-system"];
          }

          const createdItems = await actor.createEmbeddedDocuments("Item", [
            cleanData,
          ]);
          if (createdItems && createdItems.length > 0) {
            itemId = createdItems[0].id;
            Logger.debug(
              `Created combat power "${cleanData.name}" on actor "${actor.name}" and linked action card "${card.name}"`,
              { cardId: card.id, itemId },
              "MIGRATION",
            );
          }
        }

        if (itemId) {
          await card.linkEmbeddedItem(itemId);
          count++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        Logger.warn(
          `Failed to migrate action card "${card.name}" on actor "${actor.name}"`,
          error,
          "MIGRATION",
        );
      }
    }

    return { migrated: count, failed };
  }

  /**
   * Find a combat power on the actor that matches the embedded snapshot.
   *
   * Deduplication is based on type, name, img, and key system fields.
   * Two embedded items that are identical will link to the same source.
   *
   * @param {Actor} actor - The actor to search
   * @param {Object} embeddedData - The embedded item snapshot
   * @returns {Item|null} The matching item or null
   * @private
   * @static
   */
  static _findMatchingItem(actor, embeddedData) {
    const combatPowers = actor.items.filter(
      (item) => item.type === "combatPower",
    );

    for (const item of combatPowers) {
      if (
        item.name === embeddedData.name &&
        item.img === embeddedData.img &&
        CombatPowerLinkingMigration._systemDataMatches(
          item.system,
          embeddedData.system,
        )
      ) {
        return item;
      }
    }

    return null;
  }

  /**
   * Compare two system data objects for deduplication.
   *
   * Checks the fields that define a combat power's identity: cost, roll
   * formula, description, and active flag. Ignores internal IDs.
   *
   * @param {Object} sysA - First system data
   * @param {Object} sysB - Second system data
   * @returns {boolean} True if they match
   * @private
   * @static
   */
  static _systemDataMatches(sysA, sysB) {
    if (!sysA || !sysB) return false;

    const compareFields = [
      "cost",
      "active",
      "targeted",
      "description",
      "prerequisites",
      "usageInfo",
    ];

    for (const field of compareFields) {
      if ((sysA[field] ?? null) !== (sysB[field] ?? null)) return false;
    }

    // Deep-compare roll sub-object
    const rollA = sysA.roll;
    const rollB = sysB.roll;
    if (rollA || rollB) {
      if (!rollA || !rollB) return false;
      if (rollA.type !== rollB.type) return false;
      if (rollA.ability !== rollB.ability) return false;
      if (rollA.secondAbility !== rollB.secondAbility) return false;
      if ((rollA.bonus ?? 0) !== (rollB.bonus ?? 0)) return false;
    }

    return true;
  }
}
