# Testing Guide - Eventide RP System

## Overview

The Eventide RP System uses a comprehensive testing infrastructure built with **Vitest** and **@rayners/foundry-test-utils** to ensure system stability, prevent regressions, and validate critical game mechanics. All 161 tests are currently passing, providing confidence in the system's core functionality.

This testing infrastructure supports the hybrid approach: **Vitest for unit tests** (current) and **Quench for integration tests** (planned future).

## Testing Strategy

### Hybrid Testing Approach

The Eventide RP System employs a hybrid testing strategy optimized for Foundry VTT module development:

1. **Vitest (Current)**: Unit testing for individual modules, functions, and data structures
   - Fast execution and development feedback
   - Excellent for testing pure functions and data transformations
   - Mocked Foundry VTT environment via `@rayners/foundry-test-utils`
   - ES module support with comprehensive configuration

2. **Quench (Planned)**: Integration testing for full system workflows
   - In-browser testing within Foundry VTT
   - Real DOM manipulation and UI component testing
   - Integration with Foundry's canvas, chat, and other systems
   - Better suited for complex user interactions and game state changes

### Testing Pyramid

```text
        /\
       /  \
      / E2E \           (Future - Quench)
     /--------\
    / Integration \     (Future - Quench)
   /--------------\
  /    Unit Tests  \    (Current - Vitest, 161 passing)
 /------------------\
```

- **Unit Tests (Bottom)**: Test individual functions and classes in isolation
- **Integration Tests (Middle)**: Test how modules work together (planned)
- **E2E Tests (Top)**: Test complete user workflows in the actual Foundry environment (planned)

## Current Test Suite

### Test Statistics

- **Total Tests**: 161
- **Status**: All passing ✅
- **Test Framework**: Vitest 3.2.4
- **Coverage Provider**: v8
- **Test Environment**: jsdom (Foundry VTT compatibility)

### Test Categories

#### 1. Base Actor Data Model Tests ([`tests/unit/data/base-actor.test.mjs`](../../tests/unit/data/base-actor.test.mjs))

**Purpose**: Validate the core data model that powers all actor statistics and derived data.

**Coverage**:

- [`prepareDerivedData()`](../../module/data/base-actor.mjs) method - the core calculation engine
- Ability total calculations for all five core abilities
- Armor class derivation from equipment and status effects
- Dice adjustment calculations (cmin, cmax, fmin, fmax, vuln)
- Localization of ability labels and abbreviations
- Edge case handling: negative values, floating points, missing data
- Performance validation and data integrity checks

**Critical Functions**:

- All character sheet statistics depend on these calculations
- Incorrect data here affects every roll and game mechanic
- Tests ensure no regressions when modifying derived data logic

#### 2. Action Card Schema Tests ([`tests/unit/data/item-action-card.test.mjs`](../../tests/unit/data/item-action-card.test.mjs))

**Purpose**: Validate the most complex item type in the system - Action Cards.

**Coverage**:

- [`defineSchema()`](../../module/data/item-action-card.mjs) method - complex data structure definition
- Embedded item configurations for nested items
- Attack chain system validation
- Saved damage system for damage sequences
- Transformation system integration
- Color configuration (background and text colors)
- Mode selection system
- Repetition system configuration
- Schema validation and data integrity

**Critical Functions**:

- Action cards are the primary combat automation tool
- Schema errors break all action card functionality
- Tests ensure field types, options, and relationships remain correct

#### 3. Actor Rolling Mechanics Tests ([`tests/unit/documents/actor-rolls.test.mjs`](../../tests/unit/documents/actor-rolls.test.mjs))

**Purpose**: Validate the dice rolling system that underpins all gameplay.

**Coverage**:

- [`getRollFormula()`](../../module/documents/mixins/actor-rolls.mjs) method - dice formula generation
- Advantage/disadvantage dice calculations
- Ability modifier application to rolls
- Unaugmented roll handling
- Error handling for invalid roll parameters
- Batch formula generation for multiple rolls
- Critical hit/fumble threshold calculations

**Critical Functions**:

- Every player action involves dice rolls
- Formula errors break the entire game system
- Tests ensure roll mechanics remain consistent and accurate

#### 4. Character Effects Processor Tests ([`tests/unit/services/character-effects-processor.test.mjs`](../../tests/unit/services/character-effects-processor.test.mjs))

**Purpose**: Validate form data parsing for character effects in item sheets.

**Coverage**:

- [`parseCharacterEffectsForm()`](../../module/services/character-effects-processor.mjs) method
- Regular effects parsing from form elements
- Hidden effects parsing (dice size adjustments)
- Override effects parsing (power/resolve overrides)
- Filtering of removed effects
- Empty form handling
- Malformed data handling

**Critical Functions**:

- Powers gear creation and effect application
- Form parsing errors prevent item creation
- Tests ensure data extraction is reliable

#### 5. Test Infrastructure Validation ([`tests/unit/utils/test-example.test.mjs`](../../tests/unit/utils/test-example.test.mjs))

**Purpose**: Verify that the testing infrastructure and Foundry VTT mocks are working correctly.

**Coverage**:

- Foundry VTT globals availability (game, ui, CONFIG, etc.)
- Foundry data field mocking (StringField, NumberField, etc.)
- Game object simulation
- i18n localization testing
- Console spying and logging validation
- Test utilities functionality

**Critical Functions**:

- Validates the foundation for all other tests
- Ensures mock system is comprehensive enough
- Tests fail first if infrastructure has issues

## Test Coverage

### Current Coverage Configuration

From [`vitest.config.js`](../../vitest.config.js:44):

```javascript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov'],
  reportsDirectory: './coverage',
  include: ['module/**/*.mjs'],
  exclude: [
    'module/**/*.test.mjs',
    'module/**/*.spec.mjs',
    'node_modules/**'
  ],
  thresholds: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    },
    'module/documents/mixins/actor-rolls.mjs': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    'module/data/base-actor.mjs': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
}
```

### Coverage Goals

- **Global Thresholds**: 50% for all metrics (reasonable initial target)
- **Critical Files**: 70% for core game mechanics
- **Report Types**: Text (terminal), JSON (CI integration), HTML (detailed browsing), LCOV (coverage tracking)

### Viewing Coverage Reports

Generate and view coverage reports:

```bash
# Generate coverage report
npm run test:coverage

# View HTML report in browser
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

## Running Tests

### Basic Commands

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

### Running Specific Tests

```bash
# Run specific test file
npx vitest tests/unit/data/base-actor.test.mjs

# Run tests matching a pattern
npx vitest --grep "prepareDerivedData"

# Run tests in a specific directory
npx vitest tests/unit/data/
```

### Test Output Modes

```bash
# Run with verbose output (see all test names)
VITEST_VERBOSE=1 npm test

# Run with silent output (only failures)
VITEST_VERBOSE=0 npm test
```

### Integration with Validation

Tests are included in the validation workflow:

```bash
# Run full validation (lint + format + test)
npm run validate

# Pre-commit hook runs validation automatically
git commit
```

## Writing Tests

### Test File Structure

Test files follow this naming convention:

- Unit tests: `tests/unit/**/*.test.mjs` or `tests/unit/**/*.spec.mjs`
- Integration tests: `tests/integration/**/*.test.mjs` (future)
- E2E tests: `tests/e2e/**/*.test.mjs` (future)

### Test File Template

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

### Mocking Foundry VTT

The test setup provides comprehensive Foundry VTT mocking:

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

// Test utilities are available
const mockActor = global.testUtils.createMockActor({ name: 'Test Actor' });
const mockItem = global.testUtils.createMockItem({ type: 'combatPower' });
const mockRoll = global.testUtils.createMockRoll(15, [15], '1d20+5');
```

### Testing Best Practices

#### 1. Test Naming

Use descriptive test names that explain what is being tested:

```javascript
test('should calculate armor class including equipment bonuses', () => { /* ... */ });
test('should handle null ability values gracefully', () => { /* ... */ });
test('should throw error when required field is missing', () => { /* ... */ });
```

#### 2. Test Organization

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

#### 3. Arrange-Act-Assert Pattern

Structure tests clearly:

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

#### 4. Test Isolation

Ensure tests don't depend on each other:

```javascript
beforeEach(() => {
  // Clear mocks between tests
  vi.clearAllMocks();
  // Reset shared state
  mockData = createFreshMockData();
});

afterEach(() => {
  // Cleanup if needed
  cleanupResources();
});
```

#### 5. Testing Edge Cases

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

#### 6. Mocking External Dependencies

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

### Test Utilities

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

## Test Structure

### Directory Organization

```text
tests/
├── setup.mjs                    # Test setup (runs before each test file)
├── global-setup.mjs             # Global setup (runs once before all tests)
├── unit/                        # Unit tests (current focus)
│   ├── data/                    # Data model tests
│   │   ├── base-actor.test.mjs
│   │   └── item-action-card.test.mjs
│   ├── documents/               # Document class tests
│   │   └── actor-rolls.test.mjs
│   ├── services/                # Service layer tests
│   │   └── character-effects-processor.test.mjs
│   └── utils/                   # Utility function tests
│       └── test-example.test.mjs
├── integration/                 # Integration tests (future - Quench)
│   └── (planned tests)
├── e2e/                         # End-to-end tests (future - Quench)
│   └── (planned tests)
└── mocks/                       # Custom mock definitions (if needed)
```

### Test Setup Files

#### [`tests/setup.mjs`](../../tests/setup.mjs)

Runs before **each** test file. Configures:

- Foundry VTT mocks from `@rayners/foundry-test-utils`
- Additional mock fields and applications
- Test utilities and helpers

#### [`tests/global-setup.mjs`](../../tests/global-setup.mjs)

Runs **once** before all tests. Configures:

- Test environment flags (`NODE_ENV=test`, `ERPS_TESTING_MODE=true`)
- Console output suppression (unless verbose mode enabled)

### Test Configuration

#### [`vitest.config.js`](../../vitest.config.js)

Main Vitest configuration file:

- Test environment: `jsdom` (Foundry VTT compatibility)
- Globals enabled (describe, test, expect, etc.)
- Setup files configuration
- Test file patterns
- Coverage configuration
- Pooling options for performance

## Future Testing Plans

### Short-Term Goals

1. **Increase Coverage**: Expand test coverage to 70%+ for critical modules
2. **Integration Tests**: Implement Quench-based integration tests for:
   - Actor sheet form submission
   - Item sheet workflows
   - Roll execution and chat message creation
3. **Performance Tests**: Add performance benchmarks for:
   - `prepareDerivedData()` execution time
   - Large actor dataset handling
   - Action card processing with complex attack chains

### Medium-Term Goals

1. **UI Component Testing**: Test Application V2 components:
   - Window sizing and positioning
   - Form rendering and interaction
   - Data binding and validation
2. **Foundry Integration Tests**: Test real Foundry VTT interactions:
   - Canvas scene rendering
   - Token movement and automation
   - Chat message display and interaction
3. **Error Handling Tests**: Comprehensive error scenario testing:
   - Network failures
   - Corrupted data recovery
   - Migration scenarios

### Long-Term Goals

1. **E2E Testing**: Complete workflow testing with Quench:
   - Character creation from start to finish
   - Combat sequences with multiple actors
   - Item creation and application workflows
2. **Visual Regression Testing**: Screenshot-based UI testing
3. **Stress Testing**: Test performance with:
   - Large numbers of actors and items
   - Complex status effect interactions
   - Long combat scenarios

### Planned Test Areas

#### Actor Sheet Testing

- Form data submission and validation
- Effect application and removal
- Derived data updates
- Sheet rendering and interaction

#### Item Sheet Testing

- Item creation workflows
- Embedded item configuration
- Action card setup
- Gear effect configuration

#### Combat System Testing

- Roll execution and chat messages
- Damage calculation and application
- Status effect application
- Initiative tracking

#### Transformation Testing

- Transformation application
- Character data modification
- Size and ability changes
- Power assignment

## Troubleshooting

### Common Issues

#### Tests Failing with "global not defined"

**Problem**: Tests can't access Foundry VTT globals.

**Solution**: Ensure [`tests/setup.mjs`](../../tests/setup.mjs) is imported correctly and `@rayners/foundry-test-utils` is installed.

```bash
npm install --save-dev @rayners/foundry-test-utils
```

#### Mocked Functions Not Being Called

**Problem**: Expected mock calls aren't being recorded.

**Solution**: Use `vi.mock()` before importing the module:

```javascript
vi.mock('../../../module/service.mjs', () => ({
  serviceFunction: vi.fn()
}));

import { someFunction } from '../../../module/module.mjs';
```

#### Tests Timing Out

**Problem**: Tests exceed the 10-second timeout.

**Solution**: Increase timeout in [`vitest.config.js`](../../vitest.config.js:80):

```javascript
testTimeout: 30000, // 30 seconds
```

Or for specific tests:

```javascript
test('slow test', async () => {
  // ... test code
}, { timeout: 30000 });
```

#### Coverage Not Generating

**Problem**: Coverage reports don't appear.

**Solution**: Ensure coverage is enabled and dependencies are installed:

```bash
npm install --save-dev @vitest/coverage-v8
npm run test:coverage
```

### Getting Help

If you encounter issues:

1. Check the [Vitest documentation](https://vitest.dev/)
2. Review [@rayners/foundry-test-utils documentation](https://github.com/rayners/foundry-test-utils)
3. Look at existing test files for examples
4. Check the [Developer Guide](../advanced-usage/developer-guide.md) for system architecture context

## Related Documentation

- [Developer Guide](../advanced-usage/developer-guide.md) - System architecture and design patterns
- [JSDoc Standards](../developer-jsdoc-standards.md) - Code documentation standards
- [Testing Infrastructure Plan](../../plans/testing-infrastructure-implementation-plan.md) - Implementation details

## Summary

The Eventide RP System's testing infrastructure provides:

- ✅ **161 passing tests** covering critical game mechanics
- ✅ **Vitest + @rayners/foundry-test-utils** for reliable Foundry VTT testing
- ✅ **Comprehensive mocking** of Foundry VTT environment
- ✅ **Coverage reporting** with HTML, JSON, and LCOV formats
- ✅ **Watch mode** for rapid development feedback
- ✅ **CI integration** ready (test:ci command)

This infrastructure ensures system stability, prevents regressions, and provides confidence when making changes to core game mechanics.
