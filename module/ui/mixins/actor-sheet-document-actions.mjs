import { Logger } from "../../services/logger.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";

/**
 * Actor Sheet Document Actions Mixin
 *
 * Provides document management functionality for actor sheets, including
 * viewing, creating, and deleting embedded documents.
 *
 * @param {class} BaseClass - The base actor sheet class to extend
 * @returns {class} Extended class with document management functionality
 */
export const ActorSheetDocumentActionsMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * View an embedded document
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     * @static
     */
    static async _viewDoc(_event, target) {
      Logger.methodEntry("ActorSheetDocumentActionsMixin", "_viewDoc", {
        actorName: this.actor?.name,
        targetDataset: target.dataset,
      });

      try {
        const doc = this._getEmbeddedDocument(target);

        if (!doc) {
          throw new Error("Document not found");
        }

        const result = doc.sheet.render(true);

        Logger.debug(
          `Opened sheet for document: ${doc.name}`,
          {
            documentId: doc.id,
            documentName: doc.name,
            documentType: doc.type,
          },
          "DOCUMENT_ACTIONS",
        );

        Logger.methodExit("ActorSheetDocumentActionsMixin", "_viewDoc", result);
        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `View document for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.DocumentViewError",
          ),
        });

        Logger.methodExit("ActorSheetDocumentActionsMixin", "_viewDoc", null);
      }
    }

    /**
     * Delete an embedded document
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     * @static
     */
    static async _deleteDoc(_event, target) {
      Logger.methodEntry("ActorSheetDocumentActionsMixin", "_deleteDoc", {
        actorName: this.actor?.name,
        targetDataset: target.dataset,
      });

      try {
        const doc = this._getEmbeddedDocument(target);

        if (!doc) {
          throw new Error("Document not found");
        }

        // Store groupId if this is an action card
        const wasActionCard = doc.type === "actionCard";

        // Delete directly without confirmation
        const result = await doc.delete();

        Logger.info(
          `Deleted document: ${doc.name}`,
          {
            documentId: doc.id,
            documentName: doc.name,
            documentType: doc.type,
          },
          "DOCUMENT_ACTIONS",
        );

        // Clean up empty groups if we deleted an action card
        if (wasActionCard && this._cleanupEmptyGroups) {
          await this._cleanupEmptyGroups();
        }

        Logger.methodExit(
          "ActorSheetDocumentActionsMixin",
          "_deleteDoc",
          result,
        );
        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Delete document for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.DocumentDeleteError",
          ),
        });

        Logger.methodExit("ActorSheetDocumentActionsMixin", "_deleteDoc", null);
      }
    }

    /**
     * Create a new embedded document
     * @param {PointerEvent} _event - The originating click event
     * @param {HTMLElement} target - The capturing HTML element which defined a [data-action]
     * @protected
     * @static
     */
    static async _createDoc(_event, target) {
      Logger.methodEntry("ActorSheetDocumentActionsMixin", "_createDoc", {
        actorName: this.actor?.name,
        targetDataset: target.dataset,
      });

      try {
        const { type } = target.dataset;

        if (!type) {
          throw new Error("Document type not specified");
        }

        // Get the document class - for items, use CONFIG.Item.documentClass
        const documentClass = CONFIG.Item.documentClass;

        if (!documentClass) {
          throw new Error(`Item document class not found`);
        }

        // Create default data for the new document
        const createData = {
          name: game.i18n.format("DOCUMENT.New", {
            type: game.i18n.localize(`TYPES.Item.${type}`),
          }),
          type,
        };

        // Create the document
        const result = await documentClass.create(createData, {
          parent: this.actor,
        });

        Logger.info(
          `Created new document: ${result.name}`,
          {
            documentId: result.id,
            documentName: result.name,
            documentType: result.type,
          },
          "DOCUMENT_ACTIONS",
        );

        // Automatically open the sheet for the new document
        result.sheet.render(true);

        Logger.methodExit(
          "ActorSheetDocumentActionsMixin",
          "_createDoc",
          result,
        );
        return result;
      } catch (error) {
        await ErrorHandler.handleAsync(Promise.reject(error), {
          context: `Create document for ${this.actor?.name}`,
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
          userMessage: game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.Errors.DocumentCreateError",
          ),
        });

        Logger.methodExit("ActorSheetDocumentActionsMixin", "_createDoc", null);
      }
    }
  };
