# Agent Rules Standard (AGENTS.md):
# Eventide RP System - Architectural Guidance

## Critical Non-Obvious Architecture

### Three-Layer Theme System
1. Immediate theme styles injected during setup
2. Global theme applied on ready
3. Individual application themes with cleanup

### Mixin Composition Patterns
- Actor/item functionality composed through comprehensive mixins
- UI components use embedded-item-all-mixins for shared behavior
- Sheet mixins provide consistent styling and behavior

### Document Lifecycle Management
- Memory management requires cleanup via `performSystemCleanup()` and `performPreInitCleanup()`
- Embedded documents have specialized export/import flows
- Transformation documents require bidirectional conversion services

### Global Scope Exposure
- System API exposed via `globalThis.erps`
- Extensive Foundry VTT globals available (game, ui, canvas, etc.)
- Centralized ErrorHandler for consistent error handling

### Hidden Coupling Points
- Theme manager tightly coupled with application lifecycle
- Action card execution depends on chat message flags
- Item popups require specific effect attachment mechanisms