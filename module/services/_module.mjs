/**
 * Main services export module for the Eventide RP System
 *
 * This file exports all service-related modules, including hooks, managers, and settings.
 * Services handle core system functionality such as dice rolling, sound effects,
 * chat messages, combat hooks, and system configuration.
 */
export * from "./hooks/_module.mjs";
export * from "./managers/_module.mjs";
export * from "./settings/_module.mjs";
export * from "./migrations/_module.mjs";
export * from "./logger.mjs";
export * from "./image-zoom.mjs";
export * from "./transformation-converter.mjs";

// Phase 1 Refactoring - New Services
export * from "./effect-manager.mjs";
export * from "./document-action-handler.mjs";
export * from "./context-menu-builder.mjs";

// Phase 2 Refactoring - New Services
export * from "./permission-validator.mjs";
export * from "./embedded-item-manager.mjs";

// Phase 3 Refactoring - New Services
export * from "./resource-validator.mjs";
export * from "./transformation-applicator.mjs";
export * from "./repetition-handler.mjs";

// Phase 4 Refactoring - New Services
export * from "./status-effect-applicator.mjs";
export * from "./attack-chain-executor.mjs";
export * from "./target-resolver.mjs";
export * from "./chat-message-builder.mjs";
export * from "./default-data-factory.mjs";
export * from "./damage-processor.mjs";

// Phase 5.1 Refactoring - New Services
export * from "./item-selector-manager.mjs";
export * from "./export-action-handler.mjs";
export * from "./form-field-helper.mjs";

// Phase 5.2 Refactoring - New Services
export * from "./context-preparation-helper.mjs";
