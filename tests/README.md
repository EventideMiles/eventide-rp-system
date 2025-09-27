# Testing Infrastructure - Eventide RP System

## Overview
This directory contains comprehensive test infrastructure for the Eventide RP System FoundryVTT module, built with Jest and designed to prevent the accidental removal of critical functions and ensure system stability.

## Current Test Status

### ✅ Working Tests (17 passing)
**test-example.test.mjs** - Infrastructure validation tests
- FoundryVTT globals and mocking verification
- Data field creation and configuration testing
- Game simulation and i18n testing
- Console spying and logging validation

### 🚧 Implemented but Disabled Tests
The following tests are implemented but currently disabled in jest.config.js due to complex mocking requirements:

**base-actor.test.mjs** - Base Actor Data Model tests (Priority 1 Critical)
- Tests `prepareDerivedData()` method - the core calculation engine for all character statistics
- Validates ability total calculations, armor class derivation, dice adjustments
- Tests localization of ability labels and abbreviations
- Edge case handling: negative values, floating points, missing data
- Performance validation and data integrity checks
- **Critical Function**: This method calculates derived stats for all actors and is essential for character sheet accuracy

**item-action-card.test.mjs** - Action Card Schema tests (Priority 1 Critical)
- Tests `defineSchema()` method - defines the complex data structure for action cards
- Validates embedded item configurations, attack chains, transformation systems
- Tests color configuration, mode selection, repetition systems
- Schema validation and data integrity across related fields
- **Critical Function**: This schema powers the most complex item type in the system

**actor-rolls.test.mjs** - Rolling Mechanics tests (Priority 1 Critical)
- Tests `getRollFormula()` method - generates dice formulas for all rolls
- Validates advantage/disadvantage dice calculations, ability modifiers
- Tests unaugmented rolls, error handling, batch formula generation
- **Critical Function**: This method underpins all dice rolling in the game

## Test Infrastructure

### Key Components
- **Jest Configuration**: ES modules support with FoundryVTT-specific setup
- **FoundryVTT Mocking**: Comprehensive mock system for game objects, data fields, UI components
- **Test Utilities**: Helper functions for creating mock actors, items, and rolls
- **Console Spying**: Isolated console output tracking for debugging
- **Coverage Reporting**: HTML and LCOV coverage reports (disabled during setup)

### File Structure
```
tests/
├── jest/
│   ├── setup.mjs              # Test environment setup
│   ├── global-setup.mjs       # Global Jest configuration
│   ├── mocks/
│   │   └── foundry-mocks.mjs  # FoundryVTT API mocking
│   ├── utils/
│   │   └── test-example.test.mjs  # Infrastructure validation
│   └── data/
│       ├── base-actor.test.mjs      # Actor data model tests
│       ├── item-action-card.test.mjs # Action card schema tests
│       └── documents/
│           └── actor-rolls.test.mjs  # Rolling mechanics tests
└── README.md                  # This documentation
```

## Running Tests

### Basic Commands
```bash
# Run all tests (currently only validation tests)
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx jest tests/jest/utils/test-example.test.mjs

# Run in watch mode
npx jest --watch
```

### Validation Commands
```bash
# Run all validation (includes testing)
npm run validate

# Just run linting
npm run lint

# Just run type checking
npm run typecheck
```

## Test Categories and Priority

### Priority 1 - Critical Functions (Implemented, Needs Enabling)
These functions are essential for core game operation and require comprehensive testing:

1. **Data Preparation** (`base-actor.mjs:prepareDerivedData()`)
   - Calculates all derived character statistics
   - Powers character sheet displays and rolling calculations
   - **Risk**: Incorrect calculations break character functionality

2. **Schema Definition** (`item-action-card.mjs:defineSchema()`)
   - Defines data structure for the most complex item type
   - Controls attack chains, transformations, embedded items
   - **Risk**: Schema errors prevent action card creation/editing

3. **Roll Formula Generation** (`actor-rolls.mjs:getRollFormula()`)
   - Generates dice formulas for all ability rolls
   - Handles advantage/disadvantage, modifiers, special cases
   - **Risk**: Incorrect formulas break core rolling mechanics

### Priority 2 - Integration Functions (Planned)
Functions that coordinate between system components:

1. **Embedded Item Bridge Methods** (`base-actor.mjs`)
   - Methods for creating and managing embedded active effects
   - Critical for action card → active effect workflow
   - **Risk**: Function removal breaks effect application

2. **UI Component Integration**
   - Form applications and sheet interactions
   - Dialog systems and user input validation
   - **Risk**: UI breaks prevent user interaction

3. **Data Migration and Compatibility**
   - Version upgrade handlers
   - Data structure migrations
   - **Risk**: Updates break existing characters/items

### Priority 3 - Utility Functions (Planned)
Helper functions that support core operations:

1. **Validation Functions**
   - Input sanitization and validation
   - Data format checking
   - **Risk**: Invalid data causes system errors

2. **Localization Functions**
   - Text translation and formatting
   - Dynamic content generation
   - **Risk**: Missing translations break UI

3. **Performance Optimization**
   - Caching mechanisms
   - Resource management
   - **Risk**: Performance issues affect user experience

## Future Test Implementation Plan

### Phase 1: Enable Current Tests
1. Resolve complex mocking requirements for FoundryVTT modules
2. Update jest.config.js to include all test files
3. Achieve 100% pass rate on Priority 1 tests

### Phase 2: Expand Core Coverage
1. Add tests for all @critical tagged functions
2. Implement integration tests for cross-module functionality
3. Add performance benchmarks for calculation-heavy methods

### Phase 3: Complete System Coverage
1. Test all public API methods
2. Add end-to-end workflow tests
3. Implement regression test suite for common issues

### Phase 4: Automation and CI
1. Pre-commit hook integration (already implemented via Husky)
2. Automated testing on pull requests
3. Coverage threshold enforcement

## Test Development Guidelines

### Writing New Tests
1. **Follow the Priority System**: Focus on @critical functions first
2. **Comprehensive Edge Cases**: Test null/undefined, extreme values, error conditions
3. **Performance Validation**: Include timing checks for calculation methods
4. **Data Integrity**: Ensure functions don't modify input data unexpectedly
5. **Clear Documentation**: Include @fileoverview describing test purpose and priority

### Mocking Strategy
1. **Minimal Mocking**: Only mock external dependencies, not the code under test
2. **Realistic Data**: Use representative test data that matches real usage
3. **Isolation**: Each test should be independent and not affect others
4. **Comprehensive Coverage**: Mock all FoundryVTT APIs used by the code

### Test Organization
- Group related tests in describe blocks
- Use descriptive test names that explain the expected behavior
- Include both positive and negative test cases
- Test error handling and edge cases thoroughly

## Integration with Development Workflow

### Pre-commit Validation
The testing infrastructure is integrated with:
- **ESLint**: Code quality and style enforcement
- **Prettier**: Code formatting consistency
- **Husky**: Pre-commit hook execution
- **Git**: Automated validation before commits

### Release Process
Tests are excluded from releases via:
- `exclude.txt` - Build script exclusion list
- `release_script.sh` - Explicit rsync exclusions
- `.gitignore` - Prevents tracking of generated test files

### Coverage Tracking
Coverage reports are generated in the `coverage/` directory:
- HTML reports for detailed analysis
- LCOV format for CI integration
- Text summaries for quick overview

## Known Issues and Limitations

### Current Limitations
1. **Complex Module Imports**: FoundryVTT module system makes mocking challenging
2. **Dynamic Dependencies**: Some functions require runtime-specific FoundryVTT state
3. **Performance Testing**: Limited to basic timing checks without full game simulation

### Workarounds
1. **Selective Test Execution**: Currently only running validation tests
2. **Comprehensive Mocking**: Full FoundryVTT API simulation in test environment
3. **Isolation Strategy**: Tests focus on pure logic without UI dependencies

## Contributing to Tests

### Adding New Tests
1. Identify critical functions using the Priority classification system
2. Create test files following the naming convention: `{module-name}.test.mjs`
3. Include comprehensive documentation and edge case coverage
4. Update this README with new test descriptions

### Enabling Disabled Tests
1. Resolve import and mocking issues for specific modules
2. Update jest.config.js testMatch pattern to include new files
3. Verify all tests pass before including in CI pipeline

### Reporting Issues
When tests fail or reveal bugs:
1. Document the failure scenario and expected vs actual behavior
2. Check if the issue indicates a critical function was accidentally modified
3. Cross-reference with the Function Removal Prevention Action Plan
4. Report findings to maintain system stability

This testing infrastructure represents a comprehensive approach to preventing accidental function removal and ensuring the continued stability of the Eventide RP System.