/**
 * Main utilities export module for the Eventide RP System
 *
 * This file exports all utility functions and classes used throughout the system,
 * including common tasks, error handling, and system cleanup functions.
 */
export * from "./common-foundry-tasks.mjs";
export * from "./roll-utilities.mjs";
export * from "./error-handler.mjs";
export * from "./error-patterns.mjs";
export * from "./system-cleanup.mjs";

// Re-export number inputs for global access
export {
  enhanceExistingNumberInputs,
  cleanupNumberInputs,
} from "../helpers/number-inputs.mjs";
