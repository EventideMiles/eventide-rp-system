import { Logger } from "../logger.mjs";

/**
 * Migration service for setting name corrections
 * Handles migrations for:
 * - Issue: Fix typo in initiativeFormula setting name (was "initativeFormula")
 */
export class SettingNameMigration {
  /**
   * Run the migration to fix setting name typos
   * Only runs once per world by tracking the migration version
   *
   * @returns {Promise<void>}
   */
  static async run() {
    // Only GMs should run migrations
    if (!game.user.isGM) {
      return;
    }

    const migrationLevel = 2;

    let oldTrackingSetting = null;
    try {
      oldTrackingSetting = game.settings.get(
        "eventide-rp-system",
        "settingNameMigrationVersion"
      );
    } catch {
      // Old setting doesn't exist, which is fine for new installations
    }

    const lastMigration = game.settings.get(
      "eventide-rp-system",
      "migrationVersion"
    );

    const currentLevel = Math.floor(Number(lastMigration) || 0);

    if (oldTrackingSetting != null) {
      Logger.info(
        "Cleaning up old settingNameMigrationVersion setting",
        { oldValue: oldTrackingSetting },
        "MIGRATION"
      );
      await game.settings.set(
        "eventide-rp-system",
        "settingNameMigrationVersion",
        null
      );
      Logger.info(
        "Setting name migration already completed (old setting found)",
        null,
        "MIGRATION"
      );

      // if currentLevel is not a number or is less than migrationLevel we should set the setting to the migrationLevel
      if (isNaN(currentLevel) || currentLevel < migrationLevel) {
        await game.settings.set(
          "eventide-rp-system",
          "migrationVersion",
          migrationLevel
        );
        Logger.info(
          "Updated migrationVersion to current version due to old tracking setting",
          { migrationLevel },
          "MIGRATION"
        );
      }
      return;
    }

    if (lastMigration == null) {
      Logger.info(
        "Waiting for embedded image migration to complete first",
        null,
        "MIGRATION"
      );
    }

    // already at or past migration level
    else if (currentLevel >= migrationLevel) {
      Logger.debug(
        "Setting name migration already completed",
        { level: currentLevel },
        "MIGRATION"
      );
      return;
    }
    // Need to run this migration (level is between 1 and 2)
    else if (currentLevel < migrationLevel && currentLevel >= 1) {
      Logger.info(
        "Starting setting name migration",
        { currentLevel },
        "MIGRATION"
      );
    }
    // Unknown state - skip
    else {
      Logger.debug(
        "Unknown migration state, skipping",
        { lastMigration },
        "MIGRATION"
      );
      return;
    }

    try {
      let settingsMigrated = 0;

      // Migrate initativeFormula -> initiativeFormula
      try {
        const oldValue = game.settings.get(
          "eventide-rp-system",
          "initativeFormula"
        );
        
        // Set the new setting with the old value
        await game.settings.set(
          "eventide-rp-system",
          "initiativeFormula",
          oldValue
        );
        
        // Clear the old setting
        await game.settings.set(
          "eventide-rp-system",
          "initativeFormula",
          null
        );
        
        settingsMigrated++;
        Logger.info(
          "Migrated initiativeFormula setting",
          { oldValue },
          "MIGRATION"
        );
      } catch {
        // Old setting doesn't exist, which is fine for new installations
        Logger.debug(
          "Old initativeFormula setting not found (new installation)",
          null,
          "MIGRATION"
        );
      }

      // Save migration version as numeric
      await game.settings.set(
        "eventide-rp-system",
        "migrationVersion",
        migrationLevel
      );

      Logger.info(
        "Setting name migration completed",
        { settingsMigrated, level: migrationLevel },
        "MIGRATION"
      );

      ui.notifications.info(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Migration.Completed", {
          count: settingsMigrated,
        })
      );
    } catch (error) {
      Logger.error(
        "Setting name migration failed",
        error,
        "MIGRATION"
      );

      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Migration.Failed")
      );
    }
  }
}