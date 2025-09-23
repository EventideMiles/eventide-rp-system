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
   * Export embedded action item from an action card to the appropriate compendium
   * @param {Item} sourceItem - The action card item containing embedded action item
   * @returns {Promise<{success: number, failed: number, errors: Array}>} Export results
   */
  static async exportEmbeddedActionItem(sourceItem) {
    if (!game.user.isGM) {
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.GMOnlyOperation"),
      );
      return { success: 0, failed: 0, errors: ["User is not GM"] };
    }

    if (sourceItem.type !== "actionCard") {
      const error = "Source item is not an action card";
      Logger.warn(error, { itemType: sourceItem.type }, "EMBEDDED_EXPORTER");
      return { success: 0, failed: 1, errors: [error] };
    }

    const embeddedItem = sourceItem.getEmbeddedItem();
    if (!embeddedItem) {
      ui.notifications.info(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Info.NoEmbeddedItemsToExport"),
      );
      return { success: 0, failed: 0, errors: [] };
    }

    // Determine the appropriate compendium type based on the embedded item type
    let compendiumType;
    switch (embeddedItem.type) {
      case "combatPower":
        compendiumType = "combatPower";
        break;
      case "feature":
        compendiumType = "feature";
        break;
      case "gear":
        compendiumType = "gear";
        break;
      default: {
        const error = `Unsupported embedded item type: ${embeddedItem.type}`;
        Logger.warn(
          error,
          { itemType: embeddedItem.type },
          "EMBEDDED_EXPORTER",
        );
        return { success: 0, failed: 1, errors: [error] };
      }
    }

    return await this._exportItems([embeddedItem], compendiumType);
  }

  /**
   * Export embedded effects from an action card, sorting them by type
   * @param {Item} sourceItem - The action card item containing embedded effects
   * @returns {Promise<{success: number, failed: number, errors: Array}>} Export results
   */
  static async exportEmbeddedEffects(sourceItem) {
    if (!game.user.isGM) {
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.GMOnlyOperation"),
      );
      return { success: 0, failed: 0, errors: ["User is not GM"] };
    }

    if (sourceItem.type !== "actionCard") {
      const error = "Source item is not an action card";
      Logger.warn(error, { itemType: sourceItem.type }, "EMBEDDED_EXPORTER");
      return { success: 0, failed: 1, errors: [error] };
    }

    const embeddedEffects = sourceItem.getEmbeddedEffects();
    if (!embeddedEffects || embeddedEffects.length === 0) {
      ui.notifications.info(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Info.NoEmbeddedItemsToExport"),
      );
      return { success: 0, failed: 0, errors: [] };
    }

    // Sort effects by type and export to appropriate compendiums
    const results = { success: 0, failed: 0, errors: [] };

    for (const effect of embeddedEffects) {
      try {
        let compendiumType;
        switch (effect.type) {
          case "status":
            compendiumType = "status";
            break;
          case "feature":
            compendiumType = "feature";
            break;
          default:
            compendiumType = "status"; // Default to status compendium
            break;
        }

        const exportResult = await this._exportItems([effect], compendiumType);
        results.success += exportResult.success;
        results.failed += exportResult.failed;
        results.errors.push(...exportResult.errors);
      } catch (error) {
        Logger.error(
          "Failed to export effect",
          { effectName: effect.name, error },
          "EMBEDDED_EXPORTER",
        );
        results.failed++;
        results.errors.push(
          `Failed to export ${effect.name}: ${error.message}`,
        );
      }
    }

    return results;
  }

  /**
   * Export embedded transformations from an action card to the custom transformations compendium
   * @param {Item} sourceItem - The action card item containing embedded transformations
   * @returns {Promise<{success: number, failed: number, errors: Array}>} Export results
   */
  static async exportEmbeddedTransformations(sourceItem) {
    if (!game.user.isGM) {
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.GMOnlyOperation"),
      );
      return { success: 0, failed: 0, errors: ["User is not GM"] };
    }

    if (sourceItem.type !== "actionCard") {
      const error = "Source item is not an action card";
      Logger.warn(error, { itemType: sourceItem.type }, "EMBEDDED_EXPORTER");
      return { success: 0, failed: 1, errors: [error] };
    }

    const embeddedTransformations =
      await sourceItem.getEmbeddedTransformations();
    if (!embeddedTransformations || embeddedTransformations.length === 0) {
      ui.notifications.info(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Info.NoEmbeddedItemsToExport"),
      );
      return { success: 0, failed: 0, errors: [] };
    }

    return await this._exportItems(embeddedTransformations, "transformation");
  }

  /**
   * Export all embedded items from a source item, sorting them into appropriate compendiums
   * @param {Item} sourceItem - The source item (transformation or action card)
   * @returns {Promise<{success: number, failed: number, errors: Array}>} Export results
   */
  static async exportAllEmbeddedItems(sourceItem) {
    if (!game.user.isGM) {
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.GMOnlyOperation"),
      );
      return { success: 0, failed: 0, errors: ["User is not GM"] };
    }

    if (!["transformation", "actionCard"].includes(sourceItem.type)) {
      const error = "Source item is not a transformation or action card";
      Logger.warn(error, { itemType: sourceItem.type }, "EMBEDDED_EXPORTER");
      return { success: 0, failed: 1, errors: [error] };
    }

    const results = { success: 0, failed: 0, errors: [] };

    try {
      if (sourceItem.type === "transformation") {
        // Export embedded combat powers
        const combatPowers = sourceItem.system.getEmbeddedCombatPowers();
        if (combatPowers && combatPowers.length > 0) {
          const combatResult = await this._exportItems(
            combatPowers,
            "combatPower",
          );
          results.success += combatResult.success;
          results.failed += combatResult.failed;
          results.errors.push(...combatResult.errors);
        }

        // Export embedded action cards
        const actionCards = sourceItem.system.getEmbeddedActionCards();
        if (actionCards && actionCards.length > 0) {
          const actionResult = await this._exportItems(
            actionCards,
            "actionCard",
          );
          results.success += actionResult.success;
          results.failed += actionResult.failed;
          results.errors.push(...actionResult.errors);
        }
      } else if (sourceItem.type === "actionCard") {
        // Export embedded action item
        const embeddedItem = sourceItem.getEmbeddedItem();
        if (embeddedItem) {
          let compendiumType;
          switch (embeddedItem.type) {
            case "combatPower":
              compendiumType = "combatPower";
              break;
            case "feature":
              compendiumType = "feature";
              break;
            case "gear":
              compendiumType = "gear";
              break;
            default:
              compendiumType = "feature"; // Default fallback
              break;
          }

          const itemResult = await this._exportItems(
            [embeddedItem],
            compendiumType,
          );
          results.success += itemResult.success;
          results.failed += itemResult.failed;
          results.errors.push(...itemResult.errors);
        }

        // Export embedded effects
        const embeddedEffects = sourceItem.getEmbeddedEffects();
        if (embeddedEffects && embeddedEffects.length > 0) {
          for (const effect of embeddedEffects) {
            let compendiumType;
            switch (effect.type) {
              case "status":
                compendiumType = "status";
                break;
              case "feature":
                compendiumType = "feature";
                break;
              default:
                compendiumType = "status"; // Default to status compendium
                break;
            }

            const effectResult = await this._exportItems(
              [effect],
              compendiumType,
            );
            results.success += effectResult.success;
            results.failed += effectResult.failed;
            results.errors.push(...effectResult.errors);
          }
        }

        // Export embedded transformations
        const embeddedTransformations =
          await sourceItem.getEmbeddedTransformations();
        if (embeddedTransformations && embeddedTransformations.length > 0) {
          const transformResult = await this._exportItems(
            embeddedTransformations,
            "transformation",
          );
          results.success += transformResult.success;
          results.failed += transformResult.failed;
          results.errors.push(...transformResult.errors);
        }
      }

      if (results.success === 0 && results.failed === 0) {
        ui.notifications.info(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Info.NoEmbeddedItemsToExport"),
        );
      }
    } catch (error) {
      Logger.error(
        "Failed to export all embedded items",
        error,
        "EMBEDDED_EXPORTER",
      );
      results.errors.push(`Export all operation failed: ${error.message}`);
      results.failed++;
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.ExportOperationFailed"),
      );
    }

    return results;
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
