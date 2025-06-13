import { ErrorHandler } from "./error-handler.mjs";
import { Logger } from "../services/_module.mjs";

/**
 * Standardized error handling patterns and decorators
 *
 * This module provides common error handling patterns that can be used
 * throughout the codebase to ensure consistent error handling behavior.
 */

/**
 * Decorator function to wrap methods with error handling
 * @param {Object} options - Error handling options
 * @param {string} [options.context] - Context for error logging
 * @param {string} [options.userMessage] - Custom user message
 * @param {boolean} [options.showToUser=true] - Whether to show notification
 * @param {string} [options.errorType] - Type of error
 * @param {*} [options.fallbackReturn] - Value to return on error
 * @returns {Function} Decorator function
 */
export function withErrorHandling(options = {}) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    const {
      context = `${target.constructor.name}.${propertyKey}`,
      userMessage = null,
      showToUser = true,
      errorType = ErrorHandler.ERROR_TYPES.UNKNOWN,
      fallbackReturn = null,
    } = options;

    descriptor.value = async function (...args) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        Logger.error(`Error in ${context}`, error, errorType.toUpperCase());

        const displayMessage =
          userMessage || ErrorHandler.createUserMessage(error, context);

        if (showToUser && typeof ui !== "undefined" && ui.notifications) {
          ui.notifications.error(displayMessage);
        }

        return fallbackReturn;
      }
    };

    return descriptor;
  };
}

/**
 * Wrapper for async operations with standardized error handling
 * @param {Function} asyncFn - Async function to wrap
 * @param {Object} options - Error handling options
 * @returns {Function} Wrapped function
 */
export function wrapAsync(asyncFn, options = {}) {
  const {
    context = asyncFn.name || "Anonymous Function",
    userMessage = null,
    showToUser = true,
    errorType = ErrorHandler.ERROR_TYPES.UNKNOWN,
    fallbackReturn = null,
  } = options;

  return async function (...args) {
    try {
      return await asyncFn.apply(this, args);
    } catch (error) {
      Logger.error(`Error in ${context}`, error, errorType.toUpperCase());

      const displayMessage =
        userMessage || `Error in ${context}: ${error.message}`;

      if (showToUser && typeof ui !== "undefined" && ui.notifications) {
        ui.notifications.error(displayMessage);
      }

      return fallbackReturn;
    }
  };
}

/**
 * Common error handling patterns for different operation types
 */
export const ErrorPatterns = {
  /**
   * Handle document operations (create, update, delete)
   * @param {Promise} promise - Document operation promise
   * @param {string} operation - Operation description
   * @param {string} documentType - Type of document
   * @returns {Promise<[any, Error|null]>} Result tuple
   */
  async documentOperation(promise, operation, documentType = "document") {
    return ErrorHandler.handleDocumentOperation(
      promise,
      operation,
      documentType,
    );
  },

  /**
   * Handle sheet rendering operations
   * @param {Promise} promise - Render operation promise
   * @param {string} sheetName - Name of the sheet
   * @returns {Promise<[any, Error|null]>} Result tuple
   */
  async sheetRender(promise, sheetName) {
    return ErrorHandler.handleSheetRender(promise, sheetName);
  },

  /**
   * Handle roll operations
   * @param {Promise} promise - Roll operation promise
   * @param {string} rollType - Type of roll
   * @returns {Promise<[any, Error|null]>} Result tuple
   */
  async rollOperation(promise, rollType) {
    return ErrorHandler.handleAsync(promise, {
      context: `Roll Operation: ${rollType}`,
      userMessage: game.i18n?.format("EVENTIDE_RP_SYSTEM.Errors.RollFailed", {
        type: rollType,
      }),
      errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
    });
  },

  /**
   * Handle item operations (equip, use, etc.)
   * @param {Promise} promise - Item operation promise
   * @param {string} operation - Operation description
   * @param {string} itemName - Name of the item
   * @returns {Promise<[any, Error|null]>} Result tuple
   */
  async itemOperation(promise, operation, itemName) {
    return ErrorHandler.handleAsync(promise, {
      context: `Item Operation: ${operation}`,
      userMessage: game.i18n?.format(
        "EVENTIDE_RP_SYSTEM.Errors.ItemOperation",
        {
          operation,
          item: itemName,
        },
      ),
      errorType: ErrorHandler.ERROR_TYPES.DATA,
    });
  },

  /**
   * Handle theme operations
   * @param {Promise} promise - Theme operation promise
   * @param {string} operation - Operation description
   * @returns {Promise<[any, Error|null]>} Result tuple
   */
  async themeOperation(promise, operation) {
    return ErrorHandler.handleAsync(promise, {
      context: `Theme Operation: ${operation}`,
      userMessage: game.i18n?.format(
        "EVENTIDE_RP_SYSTEM.Errors.ThemeOperation",
        {
          operation,
        },
      ),
      errorType: ErrorHandler.ERROR_TYPES.UI,
      showToUser: false, // Theme errors are usually not critical for users
    });
  },

  /**
   * Handle settings operations
   * @param {Promise} promise - Settings operation promise
   * @param {string} setting - Setting name
   * @returns {Promise<[any, Error|null]>} Result tuple
   */
  async settingsOperation(promise, setting) {
    return ErrorHandler.handleAsync(promise, {
      context: `Settings Operation: ${setting}`,
      userMessage: game.i18n?.format(
        "EVENTIDE_RP_SYSTEM.Errors.SettingsOperation",
        {
          setting,
        },
      ),
      errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
    });
  },

  /**
   * Handle sound operations
   * @param {Promise} promise - Sound operation promise
   * @param {string} operation - Operation description
   * @returns {Promise<[any, Error|null]>} Result tuple
   */
  async soundOperation(promise, operation) {
    return ErrorHandler.handleAsync(promise, {
      context: `Sound Operation: ${operation}`,
      userMessage: null, // Don't show sound errors to users
      errorType: ErrorHandler.ERROR_TYPES.UI,
      showToUser: false,
    });
  },
};

/**
 * Validation helpers with consistent error handling
 */
export const ValidationPatterns = {
  /**
   * Validate required fields
   * @param {Object} data - Data to validate
   * @param {string[]} requiredFields - Required field names
   * @param {string} [context="Data"] - Context for validation
   * @returns {Object} Validation result
   */
  validateRequired(data, requiredFields, _context = "Data") {
    const errors = [];

    requiredFields.forEach((field) => {
      if (
        !(field in data) ||
        data[field] === null ||
        data[field] === undefined
      ) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    if (errors.length > 0) {
      return ErrorHandler.createValidationError(errors);
    }

    return ErrorHandler.createValidationSuccess();
  },

  /**
   * Validate field types
   * @param {Object} data - Data to validate
   * @param {Object} typeMap - Map of field names to expected types
   * @param {string} [context="Data"] - Context for validation
   * @returns {Object} Validation result
   */
  validateTypes(data, typeMap, _context = "Data") {
    const errors = [];

    Object.entries(typeMap).forEach(([field, expectedType]) => {
      if (field in data && typeof data[field] !== expectedType) {
        errors.push(
          `Field ${field} must be of type ${expectedType}, got ${typeof data[field]}`,
        );
      }
    });

    if (errors.length > 0) {
      return ErrorHandler.createValidationError(errors);
    }

    return ErrorHandler.createValidationSuccess();
  },

  /**
   * Validate numeric ranges
   * @param {Object} data - Data to validate
   * @param {Object} rangeMap - Map of field names to {min, max} objects
   * @param {string} [context="Data"] - Context for validation
   * @returns {Object} Validation result
   */
  validateRanges(data, rangeMap, _context = "Data") {
    const errors = [];

    Object.entries(rangeMap).forEach(([field, range]) => {
      if (field in data) {
        const value = data[field];
        if (typeof value === "number") {
          if (range.min !== undefined && value < range.min) {
            errors.push(
              `Field ${field} must be at least ${range.min}, got ${value}`,
            );
          }
          if (range.max !== undefined && value > range.max) {
            errors.push(
              `Field ${field} must be at most ${range.max}, got ${value}`,
            );
          }
        }
      }
    });

    if (errors.length > 0) {
      return ErrorHandler.createValidationError(errors);
    }

    return ErrorHandler.createValidationSuccess();
  },

  /**
   * Combine multiple validation results
   * @param {...Object} validationResults - Validation results to combine
   * @returns {Object} Combined validation result
   */
  combineValidations(...validationResults) {
    const allErrors = [];

    validationResults.forEach((result) => {
      if (!result.isValid) {
        allErrors.push(...result.errors);
      }
    });

    if (allErrors.length > 0) {
      return ErrorHandler.createValidationError(allErrors);
    }

    return ErrorHandler.createValidationSuccess();
  },
};

/**
 * Retry patterns for operations that might fail temporarily
 */
export const RetryPatterns = {
  /**
   * Retry an async operation with exponential backoff
   * @param {Function} operation - Async operation to retry
   * @param {Object} options - Retry options
   * @param {number} [options.maxRetries=3] - Maximum number of retries
   * @param {number} [options.baseDelay=1000] - Base delay in milliseconds
   * @param {number} [options.maxDelay=10000] - Maximum delay in milliseconds
   * @param {Function} [options.shouldRetry] - Function to determine if error should trigger retry
   * @returns {Promise<any>} Result of the operation
   */
  async withExponentialBackoff(operation, options = {}) {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      shouldRetry = () => true,
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries || !shouldRetry(error)) {
          throw error;
        }

        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        Logger.debug(
          `Retrying operation after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
          {
            error: error.message,
            delay,
            attempt: attempt + 1,
          },
          "RETRY",
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  },

  /**
   * Retry an operation with fixed delay
   * @param {Function} operation - Async operation to retry
   * @param {Object} options - Retry options
   * @param {number} [options.maxRetries=3] - Maximum number of retries
   * @param {number} [options.delay=1000] - Delay between retries in milliseconds
   * @param {Function} [options.shouldRetry] - Function to determine if error should trigger retry
   * @returns {Promise<any>} Result of the operation
   */
  async withFixedDelay(operation, options = {}) {
    const { maxRetries = 3, delay = 1000, shouldRetry = () => true } = options;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries || !shouldRetry(error)) {
          throw error;
        }

        Logger.debug(
          `Retrying operation after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
          {
            error: error.message,
            delay,
            attempt: attempt + 1,
          },
          "RETRY",
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  },
};
