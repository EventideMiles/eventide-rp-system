# Agent Rules Debug (AGENTS.md):
# Eventide RP System - Debugging Guidance

## Critical Debugging Information

### Memory Management
- Always call `performSystemCleanup()` before system reloads to prevent memory leaks
- Use `performPreInitCleanup()` during initialization for stale data cleanup
- Event listeners on sheets must be manually removed in `close()` handlers

### Error Handling
- Use `ErrorHandler` class from `module/utils/error-handler.mjs` - never throw raw errors
- Check `globalThis.erps` for runtime API inspection in browser console
- Silent failures often occur in mixins - check `module/ui/mixins/` for error boundaries

### Theme System Debugging
- Three-layer theme system can cause visual flashing if layers conflict
- Check `module/ui/mixins/actor-sheet-theme.mjs` for theme cleanup on sheet close
- Theme styles are injected immediately during setup - verify CSS specificity

### Testing Limitations
- Test coverage is minimal; `npm test` only covers utility functions
- UI components and mixins have no automated tests - manual testing required
- Mock Foundry VTT globals (`game`, `ui`, `canvas`) for any new tests

### Silent Failure Gotchas
- ESLint blocks `console.log` in modules but allows in build scripts
- Handlebars partials fail silently if not pre-registered in `handlebars-partials.mjs`

### ⚠️ Broken Tests
- **DO NOT RUN `npm test` or `npm run test:*`** — automatic testing is currently broken because `@rayners/foundry-test-utils` is not yet compatible with Foundry VTT v14. Tests will fail. Do not attempt to run the test suite until this library is updated.
