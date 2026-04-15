/**
 * @fileoverview Mathematical utility functions for the Eventide RP System
 *
 * Provides common mathematical operations used throughout the system.
 */

/**
 * Clamps a value between a minimum and maximum value
 *
 * @param {number} value - The value to clamp
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {number} The clamped value
 */
export function clampValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
