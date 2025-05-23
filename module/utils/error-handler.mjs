import { Logger } from "../services/logger.mjs";

/**
 * Centralized error handling utilities for the Eventide RP System
 *
 * Provides consistent error handling patterns, user notifications,
 * and structured error logging throughout the system.
 *
 * @class ErrorHandler
 */
export class ErrorHandler {
  /**
   * System identifier for error messages
   * @type {string}
   * @static
   * @private
   */
  static #SYSTEM_ID = "eventide-rp-system";

  /**
   * Error types for categorization and handling
   * @type {Object}
   * @static
   * @readonly
   */
  static ERROR_TYPES = Object.freeze({
    VALIDATION: "validation",
    NETWORK: "network",
    PERMISSION: "permission",
    DATA: "data",
    UI: "ui",
    FOUNDRY_API: "foundry_api",
    UNKNOWN: "unknown",
  });

  /**
   * Wrap an async function with error handling
   * Catches errors and handles them appropriately with user feedback
   *
   * @param {Promise} promise - The promise to wrap
   * @param {Object} [options={}] - Error handling options
   * @param {string} [options.context] - Context for error logging
   * @param {string} [options.userMessage] - Custom user-facing error message
   * @param {boolean} [options.showToUser=true] - Whether to show notification to user
   * @param {string} [options.errorType] - Type of error for categorization
   * @returns {Promise<[any, Error|null]>} Tuple of [result, error]
   * @static
   */
  static async handleAsync(promise, options = {}) {
    const {
      context = "Unknown Operation",
      userMessage = null,
      showToUser = true,
      errorType = ErrorHandler.ERROR_TYPES.UNKNOWN,
    } = options;

    try {
      const result = await promise;
      return [result, null];
    } catch (error) {
      // Log the error with context
      Logger.error(`Error in ${context}`, error, errorType.toUpperCase());

      // Create user-friendly error message
      const displayMessage =
        userMessage || ErrorHandler.#createUserMessage(error, context);

      // Show notification to user if requested
      if (showToUser && typeof ui !== "undefined" && ui.notifications) {
        ui.notifications.error(displayMessage);
      }

      return [null, error];
    }
  }

  /**
   * Handle errors specifically for Foundry document operations
   *
   * @param {Promise} promise - The document operation promise
   * @param {string} operation - Description of the operation (e.g., "create actor")
   * @param {string} [documentType="document"] - Type of document being operated on
   * @returns {Promise<[any, Error|null]>} Tuple of [result, error]
   * @static
   */
  static async handleDocumentOperation(
    promise,
    operation,
    documentType = "document",
  ) {
    return ErrorHandler.handleAsync(promise, {
      context: `Document Operation: ${operation}`,
      userMessage: game.i18n.format(
        "EVENTIDE_RP_SYSTEM.Errors.DocumentOperation",
        {
          operation,
          type: documentType,
        },
      ),
      errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
    });
  }

  /**
   * Handle errors for sheet rendering operations
   *
   * @param {Promise} promise - The render operation promise
   * @param {string} sheetName - Name of the sheet being rendered
   * @returns {Promise<[any, Error|null]>} Tuple of [result, error]
   * @static
   */
  static async handleSheetRender(promise, sheetName) {
    return ErrorHandler.handleAsync(promise, {
      context: `Sheet Render: ${sheetName}`,
      userMessage: game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.SheetRender", {
        sheet: sheetName,
      }),
      errorType: ErrorHandler.ERROR_TYPES.UI,
    });
  }

  /**
   * Handle validation errors with specific messaging
   *
   * @param {Object} validationResult - Result from validation function
   * @param {boolean} validationResult.isValid - Whether validation passed
   * @param {string[]} validationResult.errors - Array of error messages
   * @param {string} [context="Validation"] - Context for error logging
   * @returns {boolean} Whether validation passed
   * @static
   */
  static handleValidation(validationResult, context = "Validation") {
    if (!validationResult.isValid) {
      const errorMessage = validationResult.errors.join("; ");

      Logger.warn(
        `${context} failed: ${errorMessage}`,
        validationResult,
        "VALIDATION",
      );

      if (typeof ui !== "undefined" && ui.notifications) {
        ui.notifications.warn(
          game.i18n.format("EVENTIDE_RP_SYSTEM.Errors.Validation", {
            errors: errorMessage,
          }),
        );
      }

      return false;
    }

    return true;
  }

  /**
   * Create a user-friendly error message from an Error object
   *
   * @param {Error} error - The error object
   * @param {string} context - Context where the error occurred
   * @returns {string} User-friendly error message
   * @static
   * @private
   */
  static #createUserMessage(error, context) {
    // Use localized error messages when available
    if (typeof game !== "undefined" && game.i18n) {
      // Check for specific error patterns and provide appropriate messages
      if (error.message.includes("permission")) {
        return game.i18n.localize(
          `${ErrorHandler.#SYSTEM_ID.toUpperCase().replace("-", "_")}.Errors.Permission`,
        );
      }

      if (
        error.message.includes("network") ||
        error.message.includes("fetch")
      ) {
        return game.i18n.localize(
          `${ErrorHandler.#SYSTEM_ID.toUpperCase().replace("-", "_")}.Errors.Network`,
        );
      }

      if (error.name === "ValidationError") {
        return game.i18n.format(
          `${ErrorHandler.#SYSTEM_ID.toUpperCase().replace("-", "_")}.Errors.Validation`,
          {
            errors: error.message,
          },
        );
      }

      // Generic error message with context
      return game.i18n.format(
        `${ErrorHandler.#SYSTEM_ID.toUpperCase().replace("-", "_")}.Errors.Generic`,
        {
          context,
          message: error.message,
        },
      );
    }

    // Fallback when localization is not available
    return `[${ErrorHandler.#SYSTEM_ID}] Error in ${context}: ${error.message}`;
  }

  /**
   * Create a validation error object
   *
   * @param {string[]} errors - Array of validation error messages
   * @returns {Object} Validation result object
   * @static
   */
  static createValidationError(errors) {
    return {
      isValid: false,
      errors: Array.isArray(errors) ? errors : [errors],
    };
  }

  /**
   * Create a successful validation result
   *
   * @returns {Object} Validation result object
   * @static
   */
  static createValidationSuccess() {
    return {
      isValid: true,
      errors: [],
    };
  }

  /**
   * Safely execute a function with error boundary
   * Useful for event handlers and UI callbacks
   *
   * @param {Function} fn - Function to execute
   * @param {*} thisArg - Context to bind to the function
   * @param {...*} args - Arguments to pass to the function
   * @returns {*} Result of function execution or null if error
   * @static
   */
  static safeExecute(fn, thisArg = null, ...args) {
    try {
      return fn.apply(thisArg, args);
    } catch (error) {
      Logger.error("Error in safe execution", error, "SAFE_EXECUTE");

      if (typeof ui !== "undefined" && ui.notifications) {
        ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.UnexpectedError"),
        );
      }

      return null;
    }
  }

  /**
   * Assert that a condition is true, throw error if not
   * Useful for precondition checking
   *
   * @param {boolean} condition - Condition to check
   * @param {string} message - Error message if condition fails
   * @param {string} [errorType] - Type of error for categorization
   * @throws {Error} If condition is false
   * @static
   */
  static assert(
    condition,
    message,
    errorType = ErrorHandler.ERROR_TYPES.VALIDATION,
  ) {
    if (!condition) {
      const error = new Error(message);
      error.type = errorType;
      throw error;
    }
  }

  /**
   * Check if an error is of a specific type
   *
   * @param {Error} error - Error to check
   * @param {string} errorType - Type to check against
   * @returns {boolean} Whether error matches the type
   * @static
   */
  static isErrorType(error, errorType) {
    return error && error.type === errorType;
  }
}
