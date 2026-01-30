# Agent Rules Ask (AGENTS.md):
# Eventide RP System - Documentation & Query Guidance

## Critical Documentation Context

### Language File System
- Source files in `lang/src/en/` are merged by `npm run build:lang` into `lang/en.json`
- Never edit `lang/en.json` directly - it is auto-generated from source files
- Translation keys follow pattern: `ERPS.Category.Subcategory.Key`

### Template Organization
- Handlebars partials must be registered in `module/services/settings/handlebars-partials.mjs`
- Partials live in `templates/*/partials/` or `templates/*/parts/` subdirectories
- Template paths use dot notation: `actor.partials.action-card-row`

### Mixin Composition Patterns
- Actor sheets use mixins from `module/ui/mixins/actor-sheet-all-mixins.mjs`
- Item sheets use mixins from `module/ui/mixins/item-sheet-all-mixins.mjs`
- Embedded items use `module/ui/mixins/embedded-item-all-mixins.mjs`
- Mixins are composed via `Object.assign()` or class extension chains

### Global API Access
- `globalThis.erps` exposes the complete system API for debugging
- Access via browser console: `erps.documents`, `erps.services`, `erps.utils`
- Runtime inspection available for all registered classes and helpers

### Hidden Documentation
- SCSS architecture documented in `src/scss/README.md` (BEM methodology)
- No JSDoc coverage; rely on file naming and mixin patterns for context
- Setting "initativeFormula" is intentionally misspelled - use exact key
