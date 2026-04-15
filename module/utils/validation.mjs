/**
 * Validation Utilities
 *
 * Provides shared validation functions for common type checks
 * throughout the Eventide RP System.
 */

/**
 * Check if a value is a non-empty string
 *
 * @param {*} value - The value to check
 * @returns {boolean} True if value is a non-empty string
 */
export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Check if a value is a string (including empty strings)
 *
 * @param {*} value - The value to check
 * @returns {boolean} True if value is a string
 */
export function isString(value) {
  return typeof value === "string";
}

/**
 * Validate that a value is a non-empty string, throw error if not
 *
 * @param {*} value - The value to validate
 * @param {string} paramName - The parameter name for error message
 * @throws {Error} If value is not a non-empty string
 */
export function requireNonEmptyString(value, paramName) {
  if (!isNonEmptyString(value)) {
    throw new Error(`Invalid ${paramName}: must be a non-empty string`);
  }
}

/**
 * Validate that a value is a string, throw error if not
 *
 * @param {*} value - The value to validate
 * @param {string} paramName - The parameter name for error message
 * @throws {Error} If value is not a string
 */
export function requireString(value, paramName) {
  if (!isString(value)) {
    throw new Error(`Invalid ${paramName}: must be a string`);
  }
}
