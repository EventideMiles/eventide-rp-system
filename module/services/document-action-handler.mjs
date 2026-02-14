/**
 * DocumentActionHandler Service
 *
 * Provides document action handling for item sheets including
 * viewing, creating, and deleting various document types.
 *
 * @module DocumentActionHandler
 * @see module:item-sheet-actions
 */

import { Logger } from "./logger.mjs";
import { EffectManager } from "./effect-manager.mjs";

/**
 * DocumentActionHandler class for handling document actions on items
 *
 * @class DocumentActionHandler
 */
export class DocumentActionHandler {
  /**
   * View a document - effect or embedded item
   *
   * @static
   * @param {Item} item - The parent item
   * @param {HTMLElement} target - The target element with document data
   * @returns {Promise<void>}
   */
  static async viewDoc(item, target) {
    try {
      const docRow = target.closest("li");

      // Handle viewing embedded combat powers
      if (item.type === "transformation" && docRow.dataset.itemId) {
        const powerId = docRow.dataset.itemId;
        const embeddedPowers = item.system.getEmbeddedCombatPowers();
        const power = embeddedPowers.find((p) => p.id === powerId);

        if (power) {
          // Open the sheet in read-only mode since these are temporary items
          // that can't be properly saved due to their parent relationship
          return power.sheet.render(true, { readOnly: true });
        }
      }

      // Handle viewing effects
      if (docRow.dataset.effectId) {
        const effect = item.effects.get(docRow.dataset.effectId);
        if (effect) {
          effect.sheet.render(true);
        }
      }
    } catch (error) {
      Logger.error("Failed to view document", error, "ITEM_ACTIONS");
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.DocumentViewFailed", {
          itemName: item?.name || "Unknown",
        }),
      );
    }
  }

  /**
   * Create a new document on an item
   *
   * @static
   * @param {Item} item - The parent item
   * @param {HTMLElement} target - The target element with dataset configuration
   * @returns {Promise<void>}
   */
  static async createDoc(item, target) {
    try {
      const { documentClass } = target.dataset;

      if (!documentClass) {
        throw new Error("Document class not specified");
      }

      // Get the document class
      const docCls = foundry.utils.getDocumentClass(documentClass);

      if (!docCls) {
        throw new Error(`Document class ${documentClass} not found`);
      }

      // Prepare the document creation data
      const createData = {
        name: docCls.defaultName({
          type: target.dataset.type,
          parent: item,
        }),
      };

      // Loop through the dataset and add it to our createData
      for (const [dataKey, value] of Object.entries(target.dataset)) {
        // These data attributes are reserved for the action handling
        if (["action", "documentClass"].includes(dataKey)) continue;
        // Nested properties require dot notation in the HTML
        foundry.utils.setProperty(createData, dataKey, value);
      }

      // Create the embedded document
      await docCls.create(createData, {
        parent: item,
      });
    } catch (error) {
      Logger.error("Failed to create document", error, "ITEM_ACTIONS");
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.DocumentCreationFailed", {
          itemName: item?.name || "Unknown",
          documentClass: target.dataset.documentClass || "Unknown",
        }),
      );
    }
  }

  /**
   * Delete a document from an item
   * Routes to the appropriate specific delete method based on document type
   *
   * @static
   * @param {Item} item - The parent item
   * @param {HTMLElement} target - The target element with document data
   * @param {EffectManager|null} effectManager - Optional EffectManager for dependency injection
   * @returns {Promise<void>}
   */
  static async deleteDoc(item, target, effectManager = null) {
    try {
      const { documentClass } = target.dataset;

      if (!documentClass) {
        throw new Error("Document class not specified");
      }

      // Route to the appropriate specific delete method
      if (documentClass === "ActiveEffect") {
        // Use injected effectManager or default to EffectManager
        const manager = effectManager || EffectManager;
        await manager.deleteEffect(item, target);
      } else {
        // Handle other document types if needed in the future
        throw new Error(`Deletion of ${documentClass} not yet implemented`);
      }
    } catch (error) {
      Logger.error("Failed to delete document", error, "ITEM_ACTIONS");
      ui.notifications.error(
        game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.DocumentDeletionFailed", {
          itemName: item?.name || "Unknown",
          documentClass: target.dataset.documentClass || "Unknown",
        }),
      );
    }
  }
}

export default DocumentActionHandler;
