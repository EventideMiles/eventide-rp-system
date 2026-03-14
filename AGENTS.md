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
- `npm test`: Runs all tests with Vitest
- `npm run test:watch`: Runs tests in watch mode for rapid feedback
- `npm run test:coverage`: Runs tests with coverage report
- `npm run test:ci`: Runs tests once with coverage (for CI pipelines)
- `npm run test:ui`: Runs tests with interactive Vitest UI

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

## Testing Guidelines for AI Agents

### Test Framework

The Eventide RP System uses **Vitest** with **@rayners/foundry-test-utils** for comprehensive testing:

- **Test Runner**: Vitest 3.2.4 - Fast unit testing with ES module support
- **Mocking**: @rayners/foundry-test-utils 1.2.2 - Foundry VTT environment mocking
- **Coverage**: v8 provider with HTML, JSON, and LCOV reports
- **Environment**: jsdom for Foundry VTT compatibility
- **Current Status**: 161 tests passing

### Test Structure

#### Directory Organization

```
tests/
├── setup.mjs                    # Test setup (runs before each test file)
├── global-setup.mjs             # Global setup (runs once before all tests)
├── unit/                        # Unit tests (current focus)
│   ├── data/                    # Data model tests (schemas, derived data)
│   ├── documents/               # Document class tests (actor, item methods)
│   ├── services/                # Service layer tests (form processing, etc.)
│   └── utils/                   # Utility function tests
├── integration/                 # Integration tests (future - Quench)
├── e2e/                         # End-to-end tests (future - Quench)
└── mocks/                       # Custom mock definitions
```

#### Test File Naming Convention

- Use `*.test.mjs` for test files (preferred)
- Use `*.spec.mjs` as alternative
- Test files must be in the `tests/` directory

### Test Writing Guidelines

#### Test File Template

```javascript
// @ts-nocheck
/**
 * @fileoverview Brief description of what this test file covers
 *
 * Additional context about the purpose and scope of these tests.
 */

// Vitest globals are enabled (describe, test, expect, beforeEach, vi, etc.)
// No imports needed for globals

// Import the module under test
import { SomeClass, someFunction } from '../../../module/path/to/module.mjs';

// Mock dependencies if needed
vi.mock('../../../module/dependency.mjs', () => ({
  dependencyFunction: vi.fn()
}));

describe('SomeClass or Function', () => {
  let mockData;

  beforeEach(() => {
    // Set up fresh state before each test
    mockData = { /* test data */ };
    vi.clearAllMocks();
  });

  describe('someFunction()', () => {
    test('should do something expected', () => {
      const result = someFunction(mockData);
      expect(result).toBe('expected value');
    });

    test('should handle edge case', () => {
      const result = someFunction(null);
      expect(result).toBeNull();
    });
  });
});
```

#### Arrange-Act-Assert Pattern

Structure tests clearly using AAA pattern:

```javascript
test('should calculate total ability score', () => {
  // Arrange - Set up test data
  const actor = createMockActor({
    system: {
      abilities: { acro: { base: 3 } },
      equipment: { defense: 2 }
    }
  });

  // Act - Execute the function being tested
  actor.prepareDerivedData();
  const total = actor.system.abilities.acro.total;

  // Assert - Verify the result
  expect(total).toBe(5);
});
```

#### Test Naming Conventions

- Use descriptive test names that explain what is being tested
- Follow pattern: `should [expected behavior] when [condition]`
- Example: `should calculate armor class including equipment bonuses`

```javascript
test('should sum base ability scores with equipment bonuses', () => { /* ... */ });
test('should handle null ability values gracefully', () => { /* ... */ });
test('should throw error when required field is missing', () => { /* ... */ });
```

#### Test Organization

Group related tests using nested `describe` blocks:

```javascript
describe('BaseActor', () => {
  describe('prepareDerivedData()', () => {
    describe('Ability Calculations', () => {
      test('should sum base ability scores with equipment bonuses', () => { /* ... */ });
    });

    describe('Armor Class', () => {
      test('should include equipment defense bonuses', () => { /* ... */ });
      test('should add status effect bonuses', () => { /* ... */ });
    });
  });
});
```

### Test Utilities

#### IMPORTANT: Use @rayners/foundry-test-utils - Do Not Reinvent Mocks

**CRITICAL**: Always use `@rayners/foundry-test-utils` for mocking Foundry VTT functions. This library is already configured in [`tests/setup.mjs`](tests/setup.mjs) and provides comprehensive, battle-tested mocks for the Foundry VTT environment.

```javascript
// ✅ CORRECT: Use global.testUtils from @rayners/foundry-test-utils
const mockActor = global.testUtils.createMockActor({ ... });
const mockItem = global.testUtils.createMockItem({ ... });
const mockRoll = global.testUtils.createMockRoll(...);

// ❌ WRONG: Do not create custom mocks for Foundry globals
vi.mock('foundry', () => ({ ... }));  // Don't do this!
```

The library provides mocks for:
- `game`, `ui`, `canvas`, `CONFIG` globals
- `foundry.data.fields.*` data field classes
- `Roll`, `Actor`, `Item`, `ChatMessage` document classes
- `Hooks`, `Dialog`, `ContextMenu` UI classes
- And much more - always check `global.testUtils` before creating custom mocks

When you need something not provided by `global.testUtils`, extend the existing mocks rather than replacing them entirely.

#### Available Test Utilities

The test setup provides comprehensive Foundry VTT mocking via [`tests/setup.mjs`](tests/setup.mjs):

```javascript
// Foundry globals are available
global.foundry  // Main foundry object
global.game     // Game instance
global.ui       // UI instance
global.CONFIG  // Configuration object

// Data fields are available
new global.foundry.data.fields.StringField({ required: true })
new global.foundry.data.fields.NumberField({ initial: 10 })
new global.foundry.data.fields.SchemaField(schema)
```

#### Creating Mock Actors

```javascript
const mockActor = global.testUtils.createMockActor({
  name: 'Test Character',
  system: {
    abilities: {
      acro: { base: 3, total: 5 },
      phys: { base: 4, total: 6 }
    }
  }
});
```

#### Creating Mock Items

```javascript
const mockItem = global.testUtils.createMockItem({
  name: 'Test Power',
  type: 'combatPower',
  system: {
    effects: [
      { ability: 'acro', mode: 'add', value: 2 }
    ]
  }
});
```

#### Creating Mock Rolls

```javascript
const mockRoll = global.testUtils.createMockRoll(
  15,    // total result
  [15],  // individual die results
  '1d20+5' // formula
);
```

### Running Tests

#### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with Vitest UI (interactive test runner)
npm run test:ui

# Run tests once (for CI)
npm run test:ci
```

#### Running Specific Tests

```bash
# Run specific test file
npx vitest tests/unit/data/base-actor.test.mjs

# Run tests matching a pattern
npx vitest --grep "prepareDerivedData"

# Run tests in a specific directory
npx vitest tests/unit/data/
```

### Coverage Goals

#### Coverage Thresholds

From [`vitest.config.js`](vitest.config.js):

- **Global Thresholds**: 50% for all metrics (branches, functions, lines, statements)
- **Critical Files**: 70% for core game mechanics:
  - `module/documents/mixins/actor-rolls.mjs` - Dice rolling mechanics
  - `module/data/base-actor.mjs` - Core data model and derived calculations

#### Viewing Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML report in browser
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

### Test Scenarios

#### Testing Data Models and Schemas

Focus on schema validation, default values, and data integrity:

```javascript
describe('BaseActor Schema', () => {
  test('should define all required ability fields', () => {
    const schema = EventideRpSystemBaseActor.defineSchema();
    expect(schema.abilities).toBeDefined();
    expect(schema.equipment).toBeDefined();
  });

  test('should apply default values for missing fields', () => {
    const actor = new EventideRpSystemBaseActor({});
    expect(actor.system.abilities.acro.base).toBe(0);
  });
});
```

#### Testing Service Layer Functions

Test form parsing, data transformation, and business logic:

```javascript
describe('CharacterEffectsProcessor', () => {
  describe('parseCharacterEffectsForm', () => {
    test('parses regular effects from form', () => {
      const formElements = [
        { name: 'characterEffects.regularEffects.0.ability', value: 'acro' },
        { name: 'characterEffects.regularEffects.0.mode', value: 'add' },
        { name: 'characterEffects.regularEffects.0.value', value: '2' }
      ];
      mockForm.querySelectorAll.mockReturnValue(formElements);

      const result = CharacterEffectsProcessor.parseCharacterEffectsForm(mockForm, {});

      expect(result.regularEffects).toHaveLength(1);
      expect(result.regularEffects[0]).toEqual({ ability: 'acro', mode: 'add', value: '2' });
    });
  });
});
```

#### Testing UI Components (When Appropriate)

For pure logic in UI components (e.g., form handlers, data binding):

```javascript
describe('ActorSheetFormHandler', () => {
  test('validates ability values within acceptable range', () => {
    const result = formHandler.validateAbility(-5);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Ability cannot be negative');
  });
});
```

#### Testing Foundry VTT Hooks

Mock hook callbacks and verify proper registration:

```javascript
describe('Hook Registration', () => {
  test('should register update actor hook on init', () => {
    const mockHook = vi.fn();
    Hooks.on = vi.fn((event, callback) => {
      if (event === 'updateActor') mockHook(callback);
    });

    registerHooks();

    expect(Hooks.on).toHaveBeenCalledWith('updateActor', expect.any(Function));
  });
});
```

#### Testing Form Data Processing

Test form element extraction, validation, and transformation:

```javascript
describe('FormDataParser', () => {
  test('extracts nested object data from form', () => {
    const formData = new FormData();
    formData.append('character.abilities.acro', '5');
    formData.append('character.abilities.phys', '3');

    const result = parser.extractObject(formData, 'character.abilities');

    expect(result).toEqual({ acro: '5', phys: '3' });
  });

  test('handles missing form elements gracefully', () => {
    const formData = new FormData();
    const result = parser.extractObject(formData, 'character.abilities');
    expect(result).toEqual({});
  });
});
```

### Common Patterns

#### Testing Edge Cases

Always test edge cases and error conditions:

```javascript
test('should handle missing data gracefully', () => {
  const result = someFunction(null);
  expect(result).toBe(defaultValue);
});

test('should throw error for invalid input', () => {
  expect(() => someFunction('invalid')).toThrow();
});

test('should handle empty arrays', () => {
  const result = someFunction([]);
  expect(result).toEqual([]);
});
```

#### Testing Asynchronous Code

Use async/await for asynchronous tests:

```javascript
test('should fetch actor data asynchronously', async () => {
  const actor = await fetchActor('abc123');
  expect(actor.name).toBe('Test Actor');
});
```

#### Mocking External Dependencies

Mock external dependencies to isolate the code under test:

```javascript
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    debug: vi.fn(),
    error: vi.fn()
  }
}));

// In tests
expect(Logger.debug).toHaveBeenCalledWith('expected message');
```

### Testing Best Practices

1. **Test Isolation**: Ensure tests don't depend on each other; use `beforeEach` to reset state
2. **Descriptive Names**: Test names should explain what behavior is being tested
3. **One Assertion Per Test**: Keep tests focused; use multiple tests for multiple assertions
4. **Test Fast**: Unit tests should run in milliseconds; slow tests should be integration tests
5. **Mock Strategically**: Only mock what you need; over-mocking creates fragile tests
6. **Test Happy Path**: Ensure the primary use case works correctly
7. **Test Edge Cases**: Handle nulls, undefined, empty arrays, and boundary conditions
8. **Test Error Conditions**: Verify proper error handling and error messages

### Testing Documentation

For comprehensive testing documentation, see:
- [`docs/testing/testing-guide.md`](docs/testing/testing-guide.md) - Detailed testing guide with examples
- [`vitest.config.js`](vitest.config.js) - Test configuration and coverage settings
- [`tests/setup.mjs`](tests/setup.mjs) - Test setup and mock configuration

### Common Gotchas

- **Global Test Utils**: Foundry VTT globals and test utilities are available via `global.testUtils`
- **Mock Order**: Mock dependencies before importing the module under test
- **Console Logging**: Use `vi.spyOn(console, 'log')` to verify logging if needed
- **Cleanup**: Use `afterEach` for resource cleanup if tests modify shared state
- **Timeouts**: Tests timeout at 10 seconds by default; increase only when necessary