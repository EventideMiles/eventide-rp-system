/**
 * @fileoverview V14 ActiveEffect Migration
 *
 * Handles migration of ActiveEffect data to Foundry VTT v14 schema:
 * - Converts `icon` field to `img`
 * - Adds `type` field (defaults to "base")
 * - Adds `phase` field to all changes (defaults to "initial")
 * - Migrates `start` from flat fields to nested object
 * - Converts `statuses` from Set to array
 * - Sets all effects to permanent (removes duration tracking)
 * - Adds showIcon field based on previous duration state
 * - Migrates origin field from empty string to null
 * - Migrates embedded item effects (transformations, action cards)
 * - Sets showIcon correctly based on item type
 *
 * @module module/services/migrations/v14-active-effect-migration
 */

import { Logger } from "../logger.mjs";

/**
 * V14 ActiveEffect Migration
 * Migrates ActiveEffect data to Foundry VTT v14 schema
 */
export class V14ActiveEffectMigration {
  static VERSION = "14.0.1";
  static SETTING_KEY = "v14MigrationVersion";

  /**
   * Run the V14 ActiveEffect migration
   * Only runs once per world by tracking the migration version
   * @returns {Promise<void>}
   */
  static async run() {
    // Only GMs should run migrations
    if (!game.user.isGM) {
      return;
    }

    // ========================================
    // ALWAYS run showIcon fix regardless of migration version
    // This ensures already-migrated worlds get the fix
    // ========================================
    await this._fixShowIconOne();

    // Check if already migrated (for the main migration only)
    const currentVersion = game.settings.get(
      "eventide-rp-system",
      this.SETTING_KEY,
    );
    if (currentVersion === this.VERSION) {
      Logger.debug("V14ActiveEffectMigration already completed", null, "MIGRATION");
      return;
    }

    Logger.info("Running V14 ActiveEffect migration...", null, "MIGRATION");
    ui.notifications.info(game.i18n.localize("EVENTIDE_RP_SYSTEM.Migration.V14InProgress"));

    try {
      // Migrate all actors

      for (const actor of game.actors) {
        await this._migrateActor(actor);
      }

      // Migrate all items
      for (const item of game.items) {
        await this._migrateItem(item);
      }

      // Migrate compendiums
      await this._migrateCompendiums();

      // Update version
      await game.settings.set(
        "eventide-rp-system",
        this.SETTING_KEY,
        this.VERSION,
      );

      Logger.info("V14 ActiveEffect migration complete", null, "MIGRATION");
      ui.notifications.info(game.i18n.localize("EVENTIDE_RP_SYSTEM.Migration.V14Complete"));
    } catch (error) {
      Logger.error("V14 ActiveEffect migration failed:", error, "MIGRATION");
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Migration.V14Failed"),
      );
      throw error;
    }
  }

  /**
   * Fix showIcon=1 values that may have been set by previous migration runs
   * This runs regardless of migration version to ensure all effects are fixed
   * Handles both top-level effects and embedded item effects
   *
   * IMPORTANT: This method fixes showIcon=1 (CONDITIONAL) to showIcon=0 (NEVER)
   * For actionCard, combatPower, transformation: ALWAYS set to 0
   * For status, feature, gear: Set to 0 if currently 1, preserve other values
   *
   * @returns {Promise<void>}
   * @private
   */
  static async _fixShowIconOne() {
    Logger.info("Starting showIcon=1 fix migration...", null, "MIGRATION");
    let totalFixed = 0;
    let actorEffectsFixed = 0;
    let actorOwnedItemEffectsFixed = 0;
    let actorOwnedEmbeddedEffectsFixed = 0;
    let worldItemEffectsFixed = 0;
    let embeddedItemEffectsFixed = 0;
    let compendiumEffectsFixed = 0;

    try {
      // ========================================
      // STEP 1: Fix effects on actors and their owned items
      // ========================================
      Logger.debug("Checking actor effects and actor-owned items for showIcon=1...", null, "MIGRATION");
      for (const actor of game.actors) {
        try {
          const result = await this._fixActorEffectsShowIcon(actor);
          if (result.actorEffects > 0 || result.ownedItemEffects > 0 || result.embeddedItemEffects > 0) {
            actorEffectsFixed += result.actorEffects;
            actorOwnedItemEffectsFixed += result.ownedItemEffects;
            actorOwnedEmbeddedEffectsFixed += result.embeddedItemEffects;
            Logger.info(
              `Fixed ${result.actorEffects} actor effects, ${result.ownedItemEffects} owned item effects, and ${result.embeddedItemEffects} embedded effects for actor: ${actor.name}`,
              null,
              "MIGRATION"
            );
          }
        } catch (error) {
          Logger.error(`Failed to fix effects on actor ${actor.name}:`, error, "MIGRATION");
        }
      }

      // ========================================
      // STEP 2: Fix effects on world items
      // ========================================
      Logger.debug("Checking world items for showIcon=1...", null, "MIGRATION");
      for (const item of game.items) {
        try {
          const result = await this._fixWorldItemShowIcon(item);
          if (result.topLevel > 0 || result.embedded > 0) {
            worldItemEffectsFixed += result.topLevel;
            embeddedItemEffectsFixed += result.embedded;
            Logger.info(
              `Fixed ${result.topLevel} top-level and ${result.embedded} embedded effects on item: ${item.name}`,
              null,
              "MIGRATION"
            );
          }
        } catch (error) {
          Logger.error(`Failed to fix effects on item ${item.name}:`, error, "MIGRATION");
        }
      }

      // ========================================
      // STEP 3: Fix effects in compendiums
      // ========================================
      Logger.debug("Checking compendiums for showIcon=1...", null, "MIGRATION");
      for (const pack of game.packs) {
        if (pack.metadata.package !== "eventide-rp-system") {
          continue;
        }

        try {
          Logger.debug(`Processing compendium: ${pack.metadata.label}`, null, "MIGRATION");
          const documents = await pack.getDocuments();

          for (const doc of documents) {
            try {
              const result = await this._fixCompendiumDocumentShowIcon(doc);
              if (result.topLevel > 0 || result.embedded > 0) {
                compendiumEffectsFixed += result.topLevel;
                embeddedItemEffectsFixed += result.embedded;
                Logger.info(
                  `Fixed ${result.topLevel} top-level and ${result.embedded} embedded effects in compendium document: ${doc.name}`,
                  null,
                  "MIGRATION"
                );
              }
            } catch (error) {
              Logger.error(`Failed to fix effects in compendium document ${doc.name}:`, error, "MIGRATION");
            }
          }
        } catch (error) {
          Logger.error(`Failed to process compendium ${pack.metadata.label}:`, error, "MIGRATION");
        }
      }

      // ========================================
      // Summary
      // ========================================
      totalFixed = actorEffectsFixed + actorOwnedItemEffectsFixed + actorOwnedEmbeddedEffectsFixed + worldItemEffectsFixed + embeddedItemEffectsFixed + compendiumEffectsFixed;
      if (totalFixed > 0) {
        Logger.info(
          `showIcon=1 fix complete. Fixed ${totalFixed} total effects: ` +
          `${actorEffectsFixed} actor effects, ` +
          `${actorOwnedItemEffectsFixed} actor-owned item effects, ` +
          `${actorOwnedEmbeddedEffectsFixed} actor-owned embedded item effects, ` +
          `${worldItemEffectsFixed} world item effects, ` +
          `${embeddedItemEffectsFixed} embedded item effects, ` +
          `${compendiumEffectsFixed} compendium effects`,
          null,
          "MIGRATION"
        );
        ui.notifications.info(game.i18n.format("EVENTIDE_RP_SYSTEM.Migration.V14FixedShowIcon", { count: totalFixed }));
      } else {
        Logger.debug("No showIcon=1 effects found that needed fixing", null, "MIGRATION");
      }
    } catch (error) {
      Logger.error("showIcon=1 fix migration failed:", error, "MIGRATION");
      throw error;
    }
  }

  /**
   * Fix showIcon=1 on actor effects and actor-owned items
   * @param {Actor} actor - The actor to fix
   * @returns {Promise<{actorEffects: number, ownedItemEffects: number, embeddedItemEffects: number}>} Counts of fixed effects
   * @private
   */
  static async _fixActorEffectsShowIcon(actor) {
    const result = { actorEffects: 0, ownedItemEffects: 0, embeddedItemEffects: 0 };
    const effectsToUpdate = [];

    // ========================================
    // Fix effects directly on the actor
    // ========================================
    for (const effect of actor.effects) {
      if (effect.showIcon === CONST.ACTIVE_EFFECT_SHOW_ICON.CONDITIONAL || effect.showIcon === undefined || effect.showIcon === null) {
        // Get the full effect data and update showIcon based on duration
        const effectData = effect.toObject();
        const hadDuration = effect.duration && (
          effect.duration.seconds ||
          effect.duration.rounds ||
          effect.duration.turns ||
          effect.duration.startTime ||
          effect.duration.value !== null
        );
        effectData.showIcon = hadDuration
          ? CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS
          : CONST.ACTIVE_EFFECT_SHOW_ICON.NEVER;
        effectsToUpdate.push(effectData);
        result.actorEffects++;
        Logger.debug(
          `Found showIcon=${effect.showIcon} on actor effect: ${effect._id} (${effect.name || 'unnamed'}), setting to ${effectData.showIcon}`,
          null,
          "MIGRATION"
        );
      }
    }

    if (effectsToUpdate.length > 0) {
      // Delete all effects with showIcon=1 (CONDITIONAL) and recreate them with showIcon=0 (NEVER)
      // This is the most reliable way to ensure the update persists
      await actor.deleteEmbeddedDocuments("ActiveEffect", effectsToUpdate.map(e => e._id));
      await actor.createEmbeddedDocuments("ActiveEffect", effectsToUpdate);
      Logger.debug(`Fixed ${result.actorEffects} effects on actor: ${actor.name}`, null, "MIGRATION");
    }

    // ========================================
    // Fix effects on actor-owned items
    // ========================================
    for (const item of actor.items) {
      try {
        const itemResult = await this._fixActorOwnedItemShowIcon(item);
        if (itemResult.topLevel > 0 || itemResult.embedded > 0) {
          result.ownedItemEffects += itemResult.topLevel;
          result.embeddedItemEffects += itemResult.embedded;
          Logger.info(
            `Fixed ${itemResult.topLevel} top-level and ${itemResult.embedded} embedded effects on actor-owned item: ${item.name}`,
            null,
            "MIGRATION"
          );
        }
      } catch (error) {
        Logger.error(`Failed to fix effects on actor-owned item ${item.name}:`, error, "MIGRATION");
      }
    }

    return result;
  }

  /**
   * Fix showIcon=1 on actor-owned items (both top-level and embedded effects)
   * @param {Item} item - The actor-owned item to fix
   * @returns {Promise<{topLevel: number, embedded: number}>} Counts of fixed effects
   * @private
   */
  static async _fixActorOwnedItemShowIcon(item) {
    const result = { topLevel: 0, embedded: 0 };
    const updates = {};

    // ========================================
    // Fix top-level effects on the item
    // ========================================
    const effectsNeedingFix = [];
    for (const effect of item.effects) {
      if (effect.showIcon === 1 || effect.showIcon === undefined || effect.showIcon === null) {
        effectsNeedingFix.push(effect._id);
        result.topLevel++;
        Logger.debug(
          `Found showIcon=${effect.showIcon} on actor-owned item effect: ${effect._id} (${effect.name || 'unnamed'}) on ${item.name}`,
          null,
          "MIGRATION"
        );
      }
    }

    if (effectsNeedingFix.length > 0) {
      // Build the effects update array with full effect data
      updates.effects = item.effects.map(effect => {
        const effectData = effect.toObject();
        if (effect.showIcon === 1 || effect.showIcon === undefined || effect.showIcon === null) {
          const hadDuration = effect.duration && (
            effect.duration.seconds ||
            effect.duration.rounds ||
            effect.duration.turns ||
            effect.duration.startTime ||
            effect.duration.value !== null
          );
          effectData.showIcon = hadDuration
            ? CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS
            : CONST.ACTIVE_EFFECT_SHOW_ICON.NEVER;
        }
        return effectData;
      });
    }

    // ========================================
    // Fix embedded item effects
    // ========================================
    const embeddedUpdates = this._fixEmbeddedItemShowIconData(item);
    if (embeddedUpdates) {
      Object.assign(updates, embeddedUpdates);
      // Count embedded fixes
      result.embedded = this._countEmbeddedFixes(item, embeddedUpdates);
    }

    // Apply all updates in one call
    if (Object.keys(updates).length > 0) {
      Logger.debug(
        `Updating actor-owned item ${item.name} with ${effectsNeedingFix.length} top-level and ${result.embedded} embedded fixes`,
        null,
        "MIGRATION"
      );
      await item.update(updates);
      Logger.debug(`Successfully updated actor-owned item: ${item.name}`, null, "MIGRATION");
    }

    return result;
  }

  /**
   * Fix showIcon=1 on world items (both top-level and embedded effects)
   * @param {Item} item - The item to fix
   * @returns {Promise<{topLevel: number, embedded: number}>} Counts of fixed effects
   * @private
   */
  static async _fixWorldItemShowIcon(item) {
    const result = { topLevel: 0, embedded: 0 };
    const updates = {};

    // ========================================
    // Fix top-level effects on the item
    // ========================================
    const effectsNeedingFix = [];
    for (const effect of item.effects) {
      if (effect.showIcon === 1 || effect.showIcon === undefined || effect.showIcon === null) {
        effectsNeedingFix.push(effect._id);
        result.topLevel++;
        Logger.debug(
          `Found showIcon=${effect.showIcon} on item effect: ${effect._id} (${effect.name || 'unnamed'}) on ${item.name}`,
          null,
          "MIGRATION"
        );
      }
    }

    if (effectsNeedingFix.length > 0) {
      // Build the effects update array with full effect data
      updates.effects = item.effects.map(effect => {
        const effectData = effect.toObject();
        if (effect.showIcon === 1 || effect.showIcon === undefined || effect.showIcon === null) {
          const hadDuration = effect.duration && (
            effect.duration.seconds ||
            effect.duration.rounds ||
            effect.duration.turns ||
            effect.duration.startTime ||
            effect.duration.value !== null
          );
          effectData.showIcon = hadDuration
            ? CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS
            : CONST.ACTIVE_EFFECT_SHOW_ICON.NEVER;
        }
        return effectData;
      });
    }

    // ========================================
    // Fix embedded item effects
    // ========================================
    const embeddedUpdates = this._fixEmbeddedItemShowIconData(item);
    if (embeddedUpdates) {
      Object.assign(updates, embeddedUpdates);
      // Count embedded fixes
      result.embedded = this._countEmbeddedFixes(item, embeddedUpdates);
    }

    // Apply all updates in one call
    if (Object.keys(updates).length > 0) {
      Logger.debug(
        `Updating item ${item.name} with ${effectsNeedingFix.length} top-level and ${result.embedded} embedded fixes`,
        null,
        "MIGRATION"
      );
      await item.update(updates);
      Logger.debug(`Successfully updated item: ${item.name}`, null, "MIGRATION");
    }

    return result;
  }

  /**
   * Fix showIcon=1 on compendium documents
   * @param {Item|Actor} doc - The compendium document
   * @returns {Promise<{topLevel: number, embedded: number}>} Counts of fixed effects
   * @private
   */
  static async _fixCompendiumDocumentShowIcon(doc) {
    const result = { topLevel: 0, embedded: 0 };
    const updates = {};

    // ========================================
    // Fix top-level effects
    // ========================================
    const effectsNeedingFix = [];
    for (const effect of doc.effects) {
      if (effect.showIcon === 1 || effect.showIcon === undefined || effect.showIcon === null) {
        effectsNeedingFix.push(effect._id);
        result.topLevel++;
        Logger.debug(
          `Found showIcon=${effect.showIcon} on compendium effect: ${effect._id} (${effect.name || 'unnamed'}) in ${doc.name}`,
          null,
          "MIGRATION"
        );
      }
    }

    if (effectsNeedingFix.length > 0) {
      // Build the effects update array with full effect data
      updates.effects = doc.effects.map(effect => {
        const effectData = effect.toObject();
        if (effect.showIcon === 1 || effect.showIcon === undefined || effect.showIcon === null) {
          const hadDuration = effect.duration && (
            effect.duration.seconds ||
            effect.duration.rounds ||
            effect.duration.turns ||
            effect.duration.startTime ||
            effect.duration.value !== null
          );
          effectData.showIcon = hadDuration
            ? CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS
            : CONST.ACTIVE_EFFECT_SHOW_ICON.NEVER;
        }
        return effectData;
      });
    }

    // ========================================
    // Fix embedded item effects (for items only)
    // ========================================
    if (doc.documentName === "Item") {
      const embeddedUpdates = this._fixEmbeddedItemShowIconData(doc);
      if (embeddedUpdates) {
        Object.assign(updates, embeddedUpdates);
        result.embedded = this._countEmbeddedFixes(doc, embeddedUpdates);
      }
    }

    // Apply updates to compendium document
    if (Object.keys(updates).length > 0) {
      Logger.debug(
        `Updating compendium document ${doc.name} with ${effectsNeedingFix.length} top-level and ${result.embedded} embedded fixes`,
        null,
        "MIGRATION"
      );

      // For compendium documents, we need to update through the document's update method
      // The document is already loaded from the compendium, so we can call update directly
      await doc.update(updates);
      Logger.debug(`Successfully updated compendium document: ${doc.name}`, null, "MIGRATION");
    }

    return result;
  }

  /**
   * Count embedded fixes from the update data
   * @param {Item} item - The item being updated
   * @param {Object} embeddedUpdates - The embedded updates object
   * @returns {number} Number of embedded fixes
   * @private
   */
  static _countEmbeddedFixes(item, embeddedUpdates) {
    let count = 0;

    // Count fixes in embeddedCombatPowers
    if (embeddedUpdates["system.embeddedCombatPowers"]) {
      const original = item.system.embeddedCombatPowers || [];
      const updated = embeddedUpdates["system.embeddedCombatPowers"];
      count += this._countEffectsFixedInArray(original, updated);
    }

    // Count fixes in embeddedActionCards
    if (embeddedUpdates["system.embeddedActionCards"]) {
      const original = item.system.embeddedActionCards || [];
      const updated = embeddedUpdates["system.embeddedActionCards"];
      count += this._countEffectsFixedInArray(original, updated);
    }

    // Count fixes in system.effects (action cards)
    if (embeddedUpdates["system.effects"]) {
      const original = item.system.effects || [];
      const updated = embeddedUpdates["system.effects"];
      count += this._countEffectsFixedInArray(original, updated);
    }

    // Count fixes in embeddedStatusEffects
    if (embeddedUpdates["system.embeddedStatusEffects"]) {
      const original = item.system.embeddedStatusEffects || [];
      const updated = embeddedUpdates["system.embeddedStatusEffects"];
      count += this._countEffectsFixedInArray(original, updated);
    }

    // Count fixes in embeddedTransformations
    if (embeddedUpdates["system.embeddedTransformations"]) {
      const original = item.system.embeddedTransformations || [];
      const updated = embeddedUpdates["system.embeddedTransformations"];
      count += this._countEffectsFixedInArray(original, updated);
    }

    // Count fixes in embeddedItem
    if (embeddedUpdates["system.embeddedItem"]) {
      const original = item.system.embeddedItem || {};
      const updated = embeddedUpdates["system.embeddedItem"];
      count += this._countEffectsFixedInItem(original, updated);
    }

    return count;
  }

  /**
   * Count effects fixed in an array of embedded items
   * @param {Object[]} original - Original array
   * @param {Object[]} updated - Updated array
   * @returns {number} Number of effects fixed
   * @private
   */
  static _countEffectsFixedInArray(original, updated) {
    let count = 0;
    for (let i = 0; i < original.length && i < updated.length; i++) {
      count += this._countEffectsFixedInItem(original[i], updated[i]);
    }
    return count;
  }

  /**
   * Count effects fixed in a single embedded item
   * @param {Object} original - Original item data
   * @param {Object} updated - Updated item data
   * @returns {number} Number of effects fixed
   * @private
   */
  static _countEffectsFixedInItem(original, updated) {
    let count = 0;

    // Count effects array changes
    if (original.effects && updated.effects) {
      for (let i = 0; i < original.effects.length && i < updated.effects.length; i++) {
        if (original.effects[i].showIcon === 1 && updated.effects[i].showIcon === 0) {
          count++;
        }
      }
    }

    // Recursively count in nested embedded items
    if (original.system?.embeddedCombatPowers && updated.system?.embeddedCombatPowers) {
      count += this._countEffectsFixedInArray(
        original.system.embeddedCombatPowers,
        updated.system.embeddedCombatPowers
      );
    }
    if (original.system?.embeddedActionCards && updated.system?.embeddedActionCards) {
      count += this._countEffectsFixedInArray(
        original.system.embeddedActionCards,
        updated.system.embeddedActionCards
      );
    }
    if (original.system?.embeddedStatusEffects && updated.system?.embeddedStatusEffects) {
      count += this._countEffectsFixedInArray(
        original.system.embeddedStatusEffects,
        updated.system.embeddedStatusEffects
      );
    }
    if (original.system?.embeddedTransformations && updated.system?.embeddedTransformations) {
      count += this._countEffectsFixedInArray(
        original.system.embeddedTransformations,
        updated.system.embeddedTransformations
      );
    }
    if (original.system?.embeddedItem && updated.system?.embeddedItem) {
      count += this._countEffectsFixedInItem(
        original.system.embeddedItem,
        updated.system.embeddedItem
      );
    }

    return count;
  }

  /**
   * Fix showIcon=1 in embedded items (action cards, transformations)
   * This method creates update data for embedded items
   * @param {Item} item - The parent item containing embedded items
   * @returns {Object|null} Updates to apply to the parent item
   * @private
   */
  static _fixEmbeddedItemShowIconData(item) {
    const updates = {};
    let hasChanges = false;

    // Handle transformations with embedded combat powers and action cards
    if (item.type === "transformation") {
      if (item.system.embeddedCombatPowers?.length > 0) {
        const fixedPowers = item.system.embeddedCombatPowers.map((power) =>
          this._fixEmbeddedItemEffectsShowIcon(power)
        );
        updates["system.embeddedCombatPowers"] = fixedPowers;
        hasChanges = true;
      }

      if (item.system.embeddedActionCards?.length > 0) {
        const fixedCards = item.system.embeddedActionCards.map((card) =>
          this._fixEmbeddedItemEffectsShowIcon(card)
        );
        updates["system.embeddedActionCards"] = fixedCards;
        hasChanges = true;
      }
    }

    // Handle action cards with embedded effects
    if (item.type === "actionCard") {
      // Fix effects directly on the action card data
      if (item.system.effects?.length > 0) {
        const fixedEffects = item.system.effects.map((effect) => {
          if (effect.showIcon === 1) {
            return { ...effect, showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.NEVER };
          }
          return effect;
        });
        updates["system.effects"] = fixedEffects;
        hasChanges = true;
      }

      // Fix embedded item (can be transformation)
      if (item.system.embeddedItem && Object.keys(item.system.embeddedItem).length > 0) {
        updates["system.embeddedItem"] = this._fixEmbeddedItemEffectsShowIcon(
          item.system.embeddedItem
        );
        hasChanges = true;
      }

      // Fix embedded status effects
      if (item.system.embeddedStatusEffects?.length > 0) {
        const fixedStatuses = item.system.embeddedStatusEffects.map((status) =>
          this._fixEmbeddedItemEffectsShowIcon(status)
        );
        updates["system.embeddedStatusEffects"] = fixedStatuses;
        hasChanges = true;
      }

      // Fix embedded transformations
      if (item.system.embeddedTransformations?.length > 0) {
        const fixedTransformations = item.system.embeddedTransformations.map((trans) =>
          this._fixEmbeddedItemEffectsShowIcon(trans)
        );
        updates["system.embeddedTransformations"] = fixedTransformations;
        hasChanges = true;
      }
    }

    return hasChanges ? updates : null;
  }

  /**
   * Fix showIcon=1 in a single embedded item's effects
   * Handles recursive migration of nested embedded items
   * @param {Object} embeddedItem - The embedded item data object
   * @returns {Object} The fixed embedded item data
   * @private
   */
  static _fixEmbeddedItemEffectsShowIcon(embeddedItem) {
    if (!embeddedItem || typeof embeddedItem !== "object") {
      return embeddedItem;
    }

    const fixedItem = foundry.utils.deepClone(embeddedItem);


    // Fix effects array if present
    if (Array.isArray(fixedItem.effects)) {
      fixedItem.effects = fixedItem.effects.map((effect) => {
        // V14 requires showIcon. Handle missing values AND showIcon=1
        // - Effects with showIcon === 1 (V13 CONDITIONAL) → migrate based on duration
        // - Effects with showIcon undefined/null (missing) → set default based on duration
        // - Effects with showIcon 0 or 2 → already correct, leave as-is
        if (effect.showIcon === undefined || effect.showIcon === null || effect.showIcon === 1) {
          // In V13, CONDITIONAL (showIcon: 1) meant "show icon if duration is set"
          // For missing showIcon, we apply the same logic to preserve user intent
          // Check if this effect had a duration
          // Handle BOTH V13 format (seconds, rounds, turns, startTime) AND
          // V14 format (value not null) - in case of partial migration
          const hadDuration = effect.duration && (
            // V13 format
            effect.duration.seconds ||
            effect.duration.rounds ||
            effect.duration.turns ||
            effect.duration.startTime ||
            // V14 format - value is set (not null/undefined)
            effect.duration.value !== null
          );

          // If had duration, user intended icon to show → ALWAYS (2)
          // If no duration (permanent), user didn't intend icon to show → NEVER (0)
          const newShowIcon = hadDuration
            ? CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS
            : CONST.ACTIVE_EFFECT_SHOW_ICON.NEVER;

          return { ...effect, showIcon: newShowIcon };
        }
        return effect;
      });
    }

    // Handle nested embedded items in transformations
    if (fixedItem.type === "transformation") {
      if (Array.isArray(fixedItem.system?.embeddedCombatPowers)) {
        fixedItem.system.embeddedCombatPowers = fixedItem.system.embeddedCombatPowers.map(
          (power) => this._fixEmbeddedItemEffectsShowIcon(power)
        );
      }

      if (Array.isArray(fixedItem.system?.embeddedActionCards)) {
        fixedItem.system.embeddedActionCards = fixedItem.system.embeddedActionCards.map(
          (card) => this._fixEmbeddedItemEffectsShowIcon(card)
        );
      }
    }

    // Handle nested embedded items in action cards
    if (fixedItem.type === "actionCard") {
      if (fixedItem.system?.embeddedItem && Object.keys(fixedItem.system.embeddedItem).length > 0) {
        fixedItem.system.embeddedItem = this._fixEmbeddedItemEffectsShowIcon(
          fixedItem.system.embeddedItem
        );
      }

      if (Array.isArray(fixedItem.system?.embeddedStatusEffects)) {
        fixedItem.system.embeddedStatusEffects = fixedItem.system.embeddedStatusEffects.map(
          (status) => this._fixEmbeddedItemEffectsShowIcon(status)
        );
      }

      if (Array.isArray(fixedItem.system?.embeddedTransformations)) {
        fixedItem.system.embeddedTransformations = fixedItem.system.embeddedTransformations.map(
          (trans) => this._fixEmbeddedItemEffectsShowIcon(trans)
        );
      }
    }

    return fixedItem;
  }

  /**
   * Migrate actor data to V14 schema
   * Also migrates all actor-owned items and their embedded items
   * @param {Actor} actor - The actor to migrate
   * @returns {Promise<void>}
   * @private
   */
  static async _migrateActor(actor) {
    const updates = {};

    // Migrate embedded effects on the actor
    for (const effect of actor.effects) {
      const effectUpdates = this._migrateEffectData(effect.toObject());
      if (effectUpdates) {
        if (!updates.effects) updates.effects = [];
        updates.effects.push({ _id: effect._id, ...effectUpdates });
      }
    }

    if (Object.keys(updates).length > 0) {
      await actor.update(updates);
      Logger.debug(`Migrated actor: ${actor.name}`, null, "MIGRATION");
    }

    // Migrate actor-owned items (including their embedded items)
    for (const item of actor.items) {
      await this._migrateItem(item);
    }
  }

  /**
   * Migrate item data to V14 schema
   * @param {Item} item - The item to migrate
   * @returns {Promise<void>}
   * @private
   */
  static async _migrateItem(item) {
    const updates = {};

    // Migrate embedded effects
    for (const effect of item.effects) {
      const effectUpdates = this._migrateEffectData(effect.toObject(), item.type);
      if (effectUpdates) {
        if (!updates.effects) updates.effects = [];
        updates.effects.push({ _id: effect._id, ...effectUpdates });
      }
    }

    // Migrate embedded items based on item type
    const embeddedUpdates = this._migrateEmbeddedItems(item);
    if (embeddedUpdates) {
      Object.assign(updates, embeddedUpdates);
    }

    if (Object.keys(updates).length > 0) {
      await item.update(updates);
      Logger.debug(`Migrated item: ${item.name}`, null, "MIGRATION");
    }
  }

  /**
   * Migrate embedded items within a parent item
   * Handles transformations and action cards with their embedded structures
   * @param {Item} item - The parent item containing embedded items
   * @returns {Object|null} Updates to apply to the parent item
   * @private
   */
  static _migrateEmbeddedItems(item) {
    const updates = {};

    if (item.type === "transformation") {
      // Migrate embedded combat powers
      if (item.system.embeddedCombatPowers?.length > 0) {
        const migratedPowers = item.system.embeddedCombatPowers.map((power) =>
          this._migrateEmbeddedItem(power, "combatPower")
        );
        updates["system.embeddedCombatPowers"] = migratedPowers;
      }

      // Migrate embedded action cards
      if (item.system.embeddedActionCards?.length > 0) {
        const migratedCards = item.system.embeddedActionCards.map((card) =>
          this._migrateEmbeddedItem(card, "actionCard")
        );
        updates["system.embeddedActionCards"] = migratedCards;
      }
    }

    if (item.type === "actionCard") {
      // Migrate single embedded item (can be a transformation)
      if (item.system.embeddedItem && Object.keys(item.system.embeddedItem).length > 0) {
        updates["system.embeddedItem"] = this._migrateEmbeddedItem(
          item.system.embeddedItem,
          item.system.embeddedItem.type || "gear"
        );
      }

      // Migrate embedded status effects
      if (item.system.embeddedStatusEffects?.length > 0) {
        const migratedStatuses = item.system.embeddedStatusEffects.map((status) =>
          this._migrateEmbeddedItem(status, "status")
        );
        updates["system.embeddedStatusEffects"] = migratedStatuses;
      }

      // Migrate embedded transformations
      if (item.system.embeddedTransformations?.length > 0) {
        const migratedTransformations = item.system.embeddedTransformations.map((trans) =>
          this._migrateEmbeddedItem(trans, "transformation")
        );
        updates["system.embeddedTransformations"] = migratedTransformations;
      }
    }

    return Object.keys(updates).length > 0 ? updates : null;
  }

  /**
   * Migrate a single embedded item's effects
   * Handles recursive migration of nested embedded items
   * @param {Object} embeddedItem - The embedded item data object
   * @param {string} itemType - The type of the embedded item
   * @returns {Object} The migrated embedded item data
   * @private
   */
  static _migrateEmbeddedItem(embeddedItem, itemType) {
    if (!embeddedItem || typeof embeddedItem !== "object") {
      return embeddedItem;
    }

    const migratedItem = foundry.utils.deepClone(embeddedItem);

    // Migrate effects array if present
    if (Array.isArray(migratedItem.effects)) {
      migratedItem.effects = migratedItem.effects.map((effect) => {
        const migratedEffect = this._migrateEffectData(effect, itemType);
        return migratedEffect ? { ...effect, ...migratedEffect } : effect;
      });
    }

    // Handle nested embedded items in transformations
    if (itemType === "transformation") {
      // Migrate nested combat powers
      if (Array.isArray(migratedItem.system?.embeddedCombatPowers)) {
        migratedItem.system.embeddedCombatPowers = migratedItem.system.embeddedCombatPowers.map(
          (power) => this._migrateEmbeddedItem(power, "combatPower")
        );
      }

      // Migrate nested action cards
      if (Array.isArray(migratedItem.system?.embeddedActionCards)) {
        migratedItem.system.embeddedActionCards = migratedItem.system.embeddedActionCards.map(
          (card) => this._migrateEmbeddedItem(card, "actionCard")
        );
      }
    }

    // Handle nested embedded items in action cards
    if (itemType === "actionCard") {
      // Migrate nested embedded item (can be a transformation)
      if (migratedItem.system?.embeddedItem && Object.keys(migratedItem.system.embeddedItem).length > 0) {
        migratedItem.system.embeddedItem = this._migrateEmbeddedItem(
          migratedItem.system.embeddedItem,
          migratedItem.system.embeddedItem.type || "gear"
        );
      }

      // Migrate nested status effects
      if (Array.isArray(migratedItem.system?.embeddedStatusEffects)) {
        migratedItem.system.embeddedStatusEffects = migratedItem.system.embeddedStatusEffects.map(
          (status) => this._migrateEmbeddedItem(status, "status")
        );
      }

      // Migrate nested transformations
      if (Array.isArray(migratedItem.system?.embeddedTransformations)) {
        migratedItem.system.embeddedTransformations = migratedItem.system.embeddedTransformations.map(
          (trans) => this._migrateEmbeddedItem(trans, "transformation")
        );
      }
    }

    return migratedItem;
  }

  /**
   * Migrate compendium documents to V14 schema
   * @returns {Promise<void>}
   * @private
   */
  static async _migrateCompendiums() {
    for (const compendium of game.packs) {
      // Only process compendiums that belong to this system
      if (compendium.metadata.package !== "eventide-rp-system") {
        continue;
      }

      Logger.debug(
        `Checking compendium: ${compendium.metadata.label}`,
        null,
        "MIGRATION",
      );

      // Get all documents in the compendium
      const documents = await compendium.getDocuments();

      for (const doc of documents) {
        if (doc.documentName === "Actor") {
          await this._migrateActor(doc);
        } else if (doc.documentName === "Item") {
          await this._migrateItem(doc);
        }
      }
    }
  }

  /**
   * Get the correct showIcon value based on item type
   * @param {string} itemType - The type of the item
   * @returns {number|undefined} The showIcon value (0 = NEVER, 2 = ALWAYS) or undefined for user-controllable types
   * @private
   */
  static _getShowIconForItemType(itemType) {
    // These types should NEVER show icons - not user-controllable
    const neverTypes = ['actionCard', 'combatPower', 'transformation'];
    if (neverTypes.includes(itemType)) {
      return CONST?.ACTIVE_EFFECT_SHOW_ICON?.NEVER ?? 0;
    }
    // Status, feature, gear are user-controllable - return undefined to use duration-based logic
    return undefined;
  }

  /**
   * Migrate effect data to V14 schema
   * @param {Object} effect - The effect data to migrate
   * @param {string} [itemType] - The type of the parent item (for showIcon determination)
   * @returns {Object|null} Migration updates or null if no migration needed
   * @private
   */
  static _migrateEffectData(effect, itemType = null) {
    const updates = {};

    // V14: Migrate `icon` to `img`
    if (effect.icon !== undefined && effect.img === undefined) {
      updates["img"] = effect.icon;
      // Note: We don't delete icon here as that's handled by Foundry's data migration
    }

    // V14: Add `type` field (defaults to "base" for standard ActiveEffects)
    if (effect.type === undefined) {
      updates["type"] = "base";
    }

    // V14: Add `phase` field to all changes
    // Note: In v14, changes moved from top-level to system.changes
    // We read from either location (for backward compatibility) and write to system.changes
    const oldChanges = effect.changes || (effect.system?.changes) || [];
    if (Array.isArray(oldChanges) && oldChanges.length > 0) {
      const migratedChanges = oldChanges.map((change) => {
        // Only add phase if not already present
        if (change.phase === undefined) {
          return { ...change, phase: "initial" };
        }
        return change;
      });
      // Only update if we made changes
      if (JSON.stringify(migratedChanges) !== JSON.stringify(oldChanges)) {
        updates["system"] = { ...(effect.system || {}), changes: migratedChanges };
      }
    }

    // V14: Migrate `start` from flat fields to nested object
    // Old schema: startRound, startTurn, startTime
    // New schema: start: { combat, combatant, initiative, round, time, turn }
    const hasOldStartFields =
      effect.startRound !== undefined ||
      effect.startTurn !== undefined ||
      effect.startTime !== undefined;
    const hasOldStartObject =
      effect.start &&
      typeof effect.start === "object" &&
      (effect.start.round !== undefined ||
        effect.start.turn !== undefined ||
        effect.start.time !== undefined);

    if (hasOldStartFields && !hasOldStartObject) {
      // Migrate flat fields to nested object
      updates["start"] = {
        combat: null,
        combatant: null,
        initiative: null,
        round: effect.startRound ?? null,
        time: effect.startTime ?? 0,
        turn: effect.startTurn ?? null,
      };
    } else if (effect.start === undefined) {
      // Add default start object if missing
      updates["start"] = {
        combat: null,
        combatant: null,
        initiative: null,
        round: null,
        time: 0,
        turn: null,
      };
    }

    // V14: Convert `statuses` from Set to array
    if (effect.statuses instanceof Set) {
      updates["statuses"] = Array.from(effect.statuses);
    } else if (effect.statuses === undefined) {
      updates["statuses"] = [];
    }

    // Set showIcon based on item type
    // V14 showIcon values: 0 = NEVER, 1 = HOVER (transitional from v13), 2 = ALWAYS
    // Value 1 (HOVER) from v13 should always be converted to 0 (NEVER)
    if (itemType) {
      const neverTypes = ['actionCard', 'combatPower', 'transformation'];
      if (neverTypes.includes(itemType)) {
        // Non-user-controllable types always get NEVER (0)
        if (effect.showIcon !== 0) {
          updates["showIcon"] = 0;
        }
      } else {
        // User-controllable types (status, feature, gear)
        // Handle showIcon=1 (CONDITIONAL) and missing values based on duration
        if (effect.showIcon === undefined || effect.showIcon === null || effect.showIcon === 1) {
          const hadDuration = effect.duration && (
            effect.duration.seconds ||
            effect.duration.rounds ||
            effect.duration.turns ||
            effect.duration.startTime ||
            effect.duration.value !== null
          );
          updates["showIcon"] = hadDuration
            ? CONST?.ACTIVE_EFFECT_SHOW_ICON?.ALWAYS ?? 2
            : CONST?.ACTIVE_EFFECT_SHOW_ICON?.NEVER ?? 0;
        }
      }
    } else {
      // Fallback: Convert HOVER (1) to NEVER (0)
      if (effect.showIcon === 1) {
        updates["showIcon"] = 0;
      }
    }

    // Clear duration to make effect permanent
    // V14 uses different duration schema, set to permanent
    // Only update if duration has actual content (not already V14 schema)
    if (
      effect.duration &&
      Object.keys(effect.duration).length > 0 &&
      // Check if not already in V14 permanent format
      (effect.duration.seconds !== undefined ||
        effect.duration.rounds !== undefined ||
        effect.duration.turns !== undefined ||
        effect.duration.startTime !== undefined)
    ) {
      updates["duration"] = {
        expired: false,
        expiry: null,
        units: "seconds",
        value: null,
      };
    }

    // Migrate origin field from empty string to null
    if (effect.origin === "") {
      updates["origin"] = null;
    }

    return Object.keys(updates).length > 0 ? updates : null;
  }
}
