# Eventide RP System - Agent Guidance

## Critical Non-Obvious Information

### Project Structure
- ES module project with specific globals configuration in `eslint.config.js`
- Foundry VTT specific environment with extensive globals (game, ui, canvas, etc.)

### Build/Lint/Test Commands
- `npm run build`: Builds both CSS and language files
- `npm run build:lang`: Custom language system that merges multiple JSON sources from `lang/src/`
- `npm run release`: Cross-platform release scripts with detailed exclusions in `exclude.txt`
- `npm run validate`: Runs linting and formatting (used in pre-commit hooks)
- Tests have limited coverage; run with `npm test`

### Code Style Guidelines
- ESLint restricts `console.log` in modules but allows it in build scripts
- Follow BEM methodology for SCSS with strict adherence to the structure in `src/scss/README.md`
- Use centralized `ErrorHandler` class for consistent error handling

### Project Patterns
- Comprehensive mixin pattern for actor and item functionality (see `module/ui/mixins/`)
- Three-layer theme system to eliminate flashing:
  1. Immediate theme styles injected during setup
  2. Global theme applied on ready
  3. Individual application themes with cleanup
- Handlebars templates organized in logical directories with partials

### Critical Gotchas
- Setting name misspelled: "initativeFormula" instead of "initiativeFormula"
- Memory management requires cleanup via `performSystemCleanup()` and `performPreInitCleanup()`
- Global scope exposed via `globalThis.erps` with extensive API
- Pre-commit hooks enforce validation with NVM loading
- Test infrastructure exists but has limited coverage