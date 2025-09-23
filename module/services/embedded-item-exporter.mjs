import { Logger } from "./logger.mjs";

/**
 * Service for exporting embedded items from transformations, action cards, etc. to compendiums
 */
export class EmbeddedItemExporter {
  /**
   * Compendium mappings for different item types
   * @type {Object}
   */
  static COMPENDIUM_MAPPINGS = {
    combatPower: {
      name: "customcombatpowers",
      label: "Custom Combat Powers",
    },
    actionCard: {
      name: "customactioncards",
      label: "Custom Action Cards",
    },
    feature: {
      name: "customfeatures",
      label: "Custom Features",
    },
    gear: {
      name: "customgear",
      label: "Custom Gear",
    },
    status: {
      name: "customstatuses",
      label: "Custom Status Effects",
    },
    transformation: {
      name: "customtransformations",
      label: "Custom Transformations",
    },
  };

  /**
   * Export embedded combat powers from a transformation to the custom combat powers compendium
   * @param {Item} sourceItem - The transformation item containing embedded combat powers
   * @returns {Promise<{success: number, failed: number, errors: Array}>} Export results
   */
  static async exportEmbeddedCombatPowers(sourceItem) {
    if (!game.user.isGM) {
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.GMOnlyOperation"),
      );
      return { success: 0, failed: 0, errors: ["User is not GM"] };
    }

    if (sourceItem.type !== "transformation") {
      const error = "Source item is not a transformation";
      Logger.warn(error, { itemType: sourceItem.type }, "EMBEDDED_EXPORTER");
      return { success: 0, failed: 1, errors: [error] };
    }

    const embeddedPowers = sourceItem.system.getEmbeddedCombatPowers();
    if (!embeddedPowers || embeddedPowers.length === 0) {
      ui.notifications.info(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Info.NoEmbeddedItemsToExport"),
      );
      return { success: 0, failed: 0, errors: [] };
    }

    return await this._exportItems(embeddedPowers, "combatPower");
  }

  /**
   * Export embedded action cards from a transformation to the custom action cards compendium
   * @param {Item} sourceItem - The transformation item containing embedded action cards
   * @returns {Promise<{success: number, failed: number, errors: Array}>} Export results
   */
  static async exportEmbeddedActionCards(sourceItem) {
    if (!game.user.isGM) {
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.GMOnlyOperation"),
      );
      return { success: 0, failed: 0, errors: ["User is not GM"] };
    }

    if (sourceItem.type !== "transformation") {
      const error = "Source item is not a transformation";
      Logger.warn(error, { itemType: sourceItem.type }, "EMBEDDED_EXPORTER");
      return { success: 0, failed: 1, errors: [error] };
    }

    const embeddedActionCards = sourceItem.system.getEmbeddedActionCards();
    if (!embeddedActionCards || embeddedActionCards.length === 0) {
      ui.notifications.info(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Info.NoEmbeddedItemsToExport"),
      );
      return { success: 0, failed: 0, errors: [] };
    }

    return await this._exportItems(embeddedActionCards, "actionCard");
  }

  /**
   * Generic method to export items to their appropriate compendium
   * @param {Array} items - Array of items to export
   * @param {string} itemType - Type of items being exported
   * @returns {Promise<{success: number, failed: number, errors: Array}>} Export results
   * @private
   */
  static async _exportItems(items, itemType) {
    const results = { success: 0, failed: 0, errors: [] };

    try {
      // Ensure the target compendium exists
      const compendium = await this._ensureCompendium(itemType);
      if (!compendium) {
        const error = `Failed to create or find compendium for ${itemType}`;
        results.errors.push(error);
        results.failed = items.length;
        return results;
      }

      // Export each item
      for (const item of items) {
        try {
          // Create a clean data object for the new item
          const itemData = {
            name: item.name,
            type: item.type,
            img: item.img,
            system: foundry.utils.duplicate(item.system),
            effects: item.effects?.map((effect) => effect.toObject()) || [],
          };

          // Create the item in the compendium
          await Item.create(itemData, { pack: compendium.collection });
          results.success++;

          Logger.debug(
            `Exported ${itemType} to compendium`,
            { itemName: item.name, compendium: compendium.title },
            "EMBEDDED_EXPORTER",
          );
        } catch (error) {
          Logger.error(
            `Failed to export ${itemType}`,
            { itemName: item.name, error },
            "EMBEDDED_EXPORTER",
          );
          results.errors.push(
            `Failed to export ${item.name}: ${error.message}`,
          );
          results.failed++;
        }
      }

      // Show summary notification
      if (results.success > 0) {
        ui.notifications.info(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Info.ItemsExportedToCompendium",
            {
              count: results.success,
              itemType: this.COMPENDIUM_MAPPINGS[itemType].label,
              compendiumLabel: compendium.title,
            },
          ),
        );
      }

      if (results.failed > 0) {
        ui.notifications.warn(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Warnings.SomeItemsFailedToExport",
            {
              failed: results.failed,
              total: items.length,
            },
          ),
        );
      }
    } catch (error) {
      Logger.error("Failed to export items", error, "EMBEDDED_EXPORTER");
      results.errors.push(`Export operation failed: ${error.message}`);
      results.failed = items.length;
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.ExportOperationFailed"),
      );
    }

    return results;
  }

  /**
   * Ensure a compendium exists for the given item type, create it if it doesn't
   * @param {string} itemType - The type of items for the compendium
   * @returns {Promise<CompendiumCollection|null>} The compendium or null if creation failed
   * @private
   */
  static async _ensureCompendium(itemType) {
    const mapping = this.COMPENDIUM_MAPPINGS[itemType];
    if (!mapping) {
      Logger.error(
        `No compendium mapping found for item type: ${itemType}`,
        {},
        "EMBEDDED_EXPORTER",
      );
      return null;
    }

    const packId = `world.${mapping.name}`;
    let pack = game.packs.get(packId);

    if (!pack) {
      try {
        const packData = {
          name: mapping.name,
          label: mapping.label,
          type: "Item",
        };

        pack =
          await foundry.documents.collections.CompendiumCollection.createCompendium(
            packData,
          );

        ui.notifications.info(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Info.CompendiumCreated", {
            label: mapping.label,
          }),
        );

        Logger.info(
          `Created compendium: ${mapping.label}`,
          { packId },
          "EMBEDDED_EXPORTER",
        );
      } catch (error) {
        Logger.error(
          `Failed to create compendium: ${mapping.label}`,
          error,
          "EMBEDDED_EXPORTER",
        );
        ui.notifications.error(
          game.i18n.format(
            "EVENTIDE_RP_SYSTEM.Errors.CompendiumCreationFailed",
            {
              label: mapping.label,
            },
          ),
        );
        return null;
      }
    }

    return pack;
  }
}
