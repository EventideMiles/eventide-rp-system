/**
 * Centralized logging service for the Eventide RP System
 *
 * Provides consistent logging with different levels and testing mode support.
 * Integrates with the existing testing mode system while adding structured logging.
 *
 * @class Logger
 */
export class Logger {
  /**
   * System identifier for consistent log prefixes
   * @type {string}
   * @static
   * @private
   */
  static #SYSTEM_PREFIX = "ERPS";

  /**
   * Log levels for filtering and categorization
   * @type {Object}
   * @static
   * @readonly
   */
  static LOG_LEVELS = Object.freeze({
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  });

  /**
   * Get the current log level based on system settings
   * @returns {number} Current log level
   * @static
   * @private
   */
  static #getCurrentLogLevel() {
    // In testing mode, show all logs
    if (Logger.#isTestingMode()) {
      return Logger.LOG_LEVELS.DEBUG;
    }

    // In development, show info and above
    if (typeof game !== "undefined" && game.settings) {
      try {
        const debugMode =
          game.settings.get("core", "noCanvas") || game.data?.options?.debug;
        return debugMode ? Logger.LOG_LEVELS.DEBUG : Logger.LOG_LEVELS.INFO;
      } catch {
        // Fallback to INFO if settings not available
        return Logger.LOG_LEVELS.INFO;
      }
    }

    return Logger.LOG_LEVELS.INFO;
  }

  /**
   * Check if testing mode is enabled
   * @returns {boolean} Whether testing mode is active
   * @static
   * @private
   */
  static #isTestingMode() {
    return (
      typeof erps !== "undefined" &&
      erps.settings &&
      typeof erps.settings.getSetting === "function" &&
      erps.settings.getSetting("testingMode")
    );
  }

  /**
   * Format a log message with consistent structure
   * @param {string} level - Log level
   * @param {string} message - Primary message
   * @param {string} [context] - Optional context/category
   * @returns {string} Formatted message
   * @static
   * @private
   */
  static #formatMessage(level, message, context = null) {
    const prefix = `${Logger.#SYSTEM_PREFIX} | ${level}`;
    return context
      ? `${prefix} [${context}] ${message}`
      : `${prefix} ${message}`;
  }

  /**
   * Log a debug message (lowest priority)
   * Only shows in testing mode or when debug is explicitly enabled
   *
   * @param {string} message - The debug message
   * @param {*} [data] - Optional data to log
   * @param {string} [context] - Optional context for categorization
   * @static
   */
  static debug(message, data = null, context = null) {
    if (Logger.#getCurrentLogLevel() <= Logger.LOG_LEVELS.DEBUG) {
      const formattedMessage = Logger.#formatMessage("DEBUG", message, context);

      if (data !== null && data !== undefined) {
        console.info(formattedMessage, data);
      } else {
        console.info(formattedMessage);
      }
    }
  }

  /**
   * Log an informational message
   * General system information and flow tracking
   *
   * @param {string} message - The info message
   * @param {*} [data] - Optional data to log
   * @param {string} [context] - Optional context for categorization
   * @static
   */
  static info(message, data = null, context = null) {
    if (Logger.#getCurrentLogLevel() <= Logger.LOG_LEVELS.INFO) {
      const formattedMessage = Logger.#formatMessage("INFO", message, context);

      if (data !== null && data !== undefined) {
        console.info(formattedMessage, data);
      } else {
        console.info(formattedMessage);
      }
    }
  }

  /**
   * Log a warning message
   * Non-critical issues that should be addressed
   *
   * @param {string} message - The warning message
   * @param {*} [data] - Optional data to log
   * @param {string} [context] - Optional context for categorization
   * @static
   */
  static warn(message, data = null, context = null) {
    if (Logger.#getCurrentLogLevel() <= Logger.LOG_LEVELS.WARN) {
      const formattedMessage = Logger.#formatMessage("WARN", message, context);

      if (data !== null && data !== undefined) {
        console.warn(formattedMessage, data);
      } else {
        console.warn(formattedMessage);
      }
    }
  }

  /**
   * Log an error message
   * Critical issues that need immediate attention
   *
   * @param {string} message - The error message
   * @param {Error|*} [error] - Optional error object or additional data
   * @param {string} [context] - Optional context for categorization
   * @static
   */
  static error(message, error = null, context = null) {
    const formattedMessage = Logger.#formatMessage("ERROR", message, context);

    if (error !== null && error !== undefined) {
      // If it's an Error object, log it properly
      if (error instanceof Error) {
        console.error(formattedMessage, error);
      } else {
        console.error(formattedMessage, error);
      }
    } else {
      console.error(formattedMessage);
    }
  }

  /**
   * Log method entry for debugging complex flows
   * Only shows in debug mode
   *
   * @param {string} className - Name of the class
   * @param {string} methodName - Name of the method
   * @param {*} [params] - Optional parameters passed to method
   * @static
   */
  static methodEntry(className, methodName, params = null) {
    if (Logger.#getCurrentLogLevel() <= Logger.LOG_LEVELS.DEBUG) {
      const message = `Entering ${className}.${methodName}()`;
      Logger.debug(message, params, "METHOD_ENTRY");
    }
  }

  /**
   * Log method exit for debugging complex flows
   * Only shows in debug mode
   *
   * @param {string} className - Name of the class
   * @param {string} methodName - Name of the method
   * @param {*} [result] - Optional return value
   * @static
   */
  static methodExit(className, methodName, result = null) {
    if (Logger.#getCurrentLogLevel() <= Logger.LOG_LEVELS.DEBUG) {
      const message = `Exiting ${className}.${methodName}()`;
      Logger.debug(message, result, "METHOD_EXIT");
    }
  }

  /**
   * Legacy compatibility method for existing logIfTesting calls
   * Maps to debug method to maintain existing behavior
   *
   * @param {string} message - The message to log
   * @param {*} [data] - Optional data to log
   * @static
   * @deprecated Use Logger.debug() instead
   */
  static logIfTesting(message, data = null) {
    Logger.debug(message, data, "LEGACY");
  }
}
