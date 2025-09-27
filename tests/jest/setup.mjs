// @ts-nocheck
/**
 * Jest setup - runs before each test file
 */
import { jest } from '@jest/globals';

// Import FoundryVTT mocks
import './mocks/foundry-mocks.mjs';

// Set up global test utilities
global.testUtils = {
  /**
   * Create a mock actor with default data
   */
  createMockActor: (overrides = {}) => ({
    id: 'test-actor-id',
    name: 'Test Actor',
    type: 'character',
    system: {
      abilities: {
        acro: { value: 0, override: false, transform: 0, change: 0 },
        phys: { value: 0, override: false, transform: 0, change: 0 },
        fort: { value: 0, override: false, transform: 0, change: 0 },
        will: { value: 0, override: false, transform: 0, change: 0 },
        wits: { value: 0, override: false, transform: 0, change: 0 }
      },
      resources: {
        resolve: { value: 10, max: 10 },
        power: { value: 5, max: 5 }
      },
      level: { value: 1 }
    },
    ...overrides
  }),

  /**
   * Create a mock item with default data
   */
  createMockItem: (overrides = {}) => ({
    id: 'test-item-id',
    name: 'Test Item',
    type: 'gear',
    system: {
      description: 'A test item',
      roll: {
        formula: '1d20',
        type: 'roll'
      }
    },
    ...overrides
  }),

  /**
   * Mock a dice roll result
   */
  createMockRoll: (total = 10, dice = [10], formula = '1d20') => ({
    total,
    dice: [{ results: dice.map(r => ({ result: r, active: true })) }],
    formula,
    terms: [
      {
        number: 1,
        faces: 20,
        results: dice.map(r => ({ result: r, active: true }))
      }
    ]
  }),

  /**
   * Wait for next tick (useful for async testing)
   */
  nextTick: () => new Promise(resolve => setTimeout(resolve, 0))
};

// Set up console spies for testing
global.consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(() => {}),
  warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
  error: jest.spyOn(console, 'error').mockImplementation(() => {})
};

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();

  // Reset console spies
  global.consoleSpy.log.mockClear();
  global.consoleSpy.warn.mockClear();
  global.consoleSpy.error.mockClear();
});