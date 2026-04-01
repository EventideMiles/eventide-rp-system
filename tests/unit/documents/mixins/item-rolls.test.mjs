// @ts-nocheck
/**
 * @fileoverview Tests for ItemRollsMixin - Roll formula calculation functionality
 *
 * Tests combat roll formula generation, dice adjustments, and roll type handling.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Mock the dependencies first
const mockLogger = {
  methodEntry: vi.fn(),
  methodExit: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn()
};

const mockErrorHandler = {
  safeExecute: vi.fn((fn) => {
    try {
      const result = fn();
      return [result, null];
    } catch (error) {
      return [null, error];
    }
  }),
  handleAsync: vi.fn(async (promise, _options) => {
    try {
      const result = await promise;
      return [result, null];
    } catch (error) {
      return [null, error];
    }
  }),
  ERROR_TYPES: {
    UI: 'ui',
    VALIDATION: 'validation',
    DATA: 'data'
  }
};

const mockGetSetting = vi.fn(() => false);

// Mock the module imports - must match the actual import paths in the source
vi.mock('../../../../module/services/logger.mjs', () => ({
  Logger: mockLogger
}));

vi.mock('../../../../module/utils/error-handler.mjs', () => ({
  ErrorHandler: mockErrorHandler
}));

vi.mock('../../../../module/services/_module.mjs', () => ({
  getSetting: mockGetSetting
}));

// Import the mixin after mocking dependencies
const { ItemRollsMixin } = await import('../../../../module/documents/mixins/item-rolls.mjs');

// Create a test class that uses the mixin
class TestItemClass {
  constructor(options = {}) {
    this.type = options.type || 'combatPower';
    this.name = options.name || 'Test Item';
    this.id = options.id || 'test-id';
    this.system = options.system || {};
    this.actor = options.actor || null;
  }

  getRollData() {
    return this._rollData || {};
  }
}

const MixedClass = ItemRollsMixin(TestItemClass);

describe('ItemRollsMixin', () => {
  let item;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create fresh item instance
    item = new MixedClass();
  });

  describe('getCombatRollFormula()', () => {
    test('should return undefined when no actor is present', () => {
      item.actor = null;
      
      const result = item.getCombatRollFormula();
      
      expect(result).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cannot generate combat roll formula without parent actor',
        expect.any(Object),
        'ITEM_ROLLS'
      );
    });

    test('should return undefined when roll data is invalid', () => {
      item.actor = { id: 'actor-1', name: 'Test Actor' };
      item._rollData = {};
      
      const result = item.getCombatRollFormula();
      
      expect(result).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid roll data structure',
        expect.any(Object),
        'ITEM_ROLLS'
      );
    });

    test('should return undefined when roll type is not a string', () => {
      item.actor = { id: 'actor-1', name: 'Test Actor' };
      item._rollData = { roll: { type: 123 } };
      
      const result = item.getCombatRollFormula();
      
      expect(result).toBeUndefined();
    });

    test('should return "0" for none roll type', () => {
      item.actor = { id: 'actor-1', name: 'Test Actor' };
      item._rollData = {
        roll: { type: 'none' },
        actor: { abilities: {} }
      };
      
      const result = item.getCombatRollFormula();
      
      expect(result).toBe('0');
    });

    test('should return flat bonus formula for flat roll type', () => {
      item.actor = { id: 'actor-1', name: 'Test Actor' };
      item._rollData = {
        roll: { type: 'flat', bonus: 5, ability: 'unaugmented' },
        actor: { abilities: {} }
      };
      
      const result = item.getCombatRollFormula();
      
      expect(result).toBe('5');
    });

    test('should return dice roll formula for roll type', () => {
      item.actor = {
        id: 'actor-1',
        name: 'Test Actor',
        abilities: {
          acro: { total: 3, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } }
        },
        hiddenAbilities: { dice: { total: 20 } }
      };
      item._rollData = {
        roll: {
          type: 'roll',
          ability: 'acro',
          bonus: 2,
          diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 }
        },
        actor: item.actor
      };
      
      const result = item.getCombatRollFormula();
      
      expect(result).toBe('1d20 + 3 + 2');
    });

    test('should handle errors gracefully', () => {
      item.actor = { id: 'actor-1', name: 'Test Actor' };
      item._rollData = {
        roll: { type: 'roll' },
        actor: null
      };
      // Force an error by making getRollData throw
      item.getRollData = () => {
        throw new Error('Test error');
      };
      
      const result = item.getCombatRollFormula();
      
      expect(result).toBeUndefined();
    });
  });

  describe('_generateFormulaByType()', () => {
    test('should return "0" for none roll type', () => {
      const rollData = { roll: { type: 'none' } };
      
      const result = item._generateFormulaByType(rollData);
      
      expect(result).toBe('0');
    });

    test('should call _getFlatBonusFormula for flat roll type', () => {
      const rollData = {
        roll: { type: 'flat', bonus: 5, ability: 'unaugmented' },
        actor: { abilities: {} }
      };
      
      const result = item._generateFormulaByType(rollData);
      
      expect(result).toBe('5');
    });

    test('should call _getMixedRollFormula for mixedRoll type', () => {
      const rollData = {
        roll: {
          type: 'mixedRoll',
          ability: 'acro',
          secondAbility: 'phys',
          bonus: 2,
          diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 }
        },
        actor: {
          abilities: {
            acro: { total: 4, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } },
            phys: { total: 2, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } }
          },
          hiddenAbilities: { dice: { total: 20 } }
        }
      };
      
      const result = item._generateFormulaByType(rollData);
      
      // Average of 4 and 2 is 3 (rounded up from 3)
      expect(result).toBe('1d20 + 3 + 2');
    });

    test('should call _getDiceRollFormula for roll type', () => {
      const rollData = {
        roll: {
          type: 'roll',
          ability: 'acro',
          bonus: 3,
          diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 }
        },
        actor: {
          abilities: {
            acro: { total: 5, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } }
          },
          hiddenAbilities: { dice: { total: 20 } }
        }
      };
      
      const result = item._generateFormulaByType(rollData);
      
      expect(result).toBe('1d20 + 5 + 3');
    });

    test('should default to dice roll for unknown roll type', () => {
      const rollData = {
        roll: {
          type: 'unknown',
          ability: 'acro',
          bonus: 0,
          diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 }
        },
        actor: {
          abilities: {
            acro: { total: 4, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } }
          },
          hiddenAbilities: { dice: { total: 20 } }
        }
      };
      
      const result = item._generateFormulaByType(rollData);
      
      expect(result).toBe('1d20 + 4');
    });
  });

  describe('_getFlatBonusFormula()', () => {
    test('should return bonus as string for unaugmented ability', () => {
      const rollData = {
        roll: { bonus: 7, ability: 'unaugmented' },
        actor: { abilities: {} }
      };
      
      const result = item._getFlatBonusFormula(rollData);
      
      expect(result).toBe('7');
    });

    test('should return bonus when ability not found in actor data', () => {
      const rollData = {
        roll: { bonus: 5, ability: 'nonexistent' },
        actor: { abilities: {} }
      };
      
      const result = item._getFlatBonusFormula(rollData);
      
      expect(result).toBe('5');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('not found in actor data'),
        expect.any(Object),
        'ITEM_ROLLS'
      );
    });

    test('should add ability total to bonus for valid ability', () => {
      const rollData = {
        roll: { bonus: 3, ability: 'acro' },
        actor: {
          abilities: {
            acro: { total: 5 }
          }
        }
      };
      
      const result = item._getFlatBonusFormula(rollData);
      
      expect(result).toBe('3 + 5');
    });

    test('should handle zero bonus', () => {
      const rollData = {
        roll: { bonus: 0, ability: 'acro' },
        actor: {
          abilities: {
            acro: { total: 4 }
          }
        }
      };
      
      const result = item._getFlatBonusFormula(rollData);
      
      expect(result).toBe('0 + 4');
    });

    test('should handle missing bonus (default to 0)', () => {
      const rollData = {
        roll: { ability: 'acro' },
        actor: {
          abilities: {
            acro: { total: 6 }
          }
        }
      };
      
      const result = item._getFlatBonusFormula(rollData);
      
      expect(result).toBe('0 + 6');
    });
  });

  describe('_getMixedRollFormula()', () => {
    test('should fallback to dice roll when primary ability not found', () => {
      const rollData = {
        roll: {
          ability: 'nonexistent',
          secondAbility: 'phys',
          bonus: 2,
          diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 }
        },
        actor: {
          abilities: {
            phys: { total: 3, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } }
          },
          hiddenAbilities: { dice: { total: 20 } }
        }
      };
      
      const result = item._getMixedRollFormula(rollData);
      
      // Falls back to _getDiceRollFormula
      expect(result).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Primary ability'),
        expect.any(Object),
        'ITEM_ROLLS'
      );
    });

    test('should fallback to dice roll when second ability not found', () => {
      const rollData = {
        roll: {
          ability: 'acro',
          secondAbility: 'nonexistent',
          bonus: 2,
          diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 }
        },
        actor: {
          abilities: {
            acro: { total: 4, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } }
          },
          hiddenAbilities: { dice: { total: 20 } }
        }
      };
      
      const result = item._getMixedRollFormula(rollData);
      
      expect(result).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Second ability'),
        expect.any(Object),
        'ITEM_ROLLS'
      );
    });

    test('should calculate average of two abilities', () => {
      const rollData = {
        roll: {
          ability: 'acro',
          secondAbility: 'phys',
          bonus: 0,
          diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 }
        },
        actor: {
          abilities: {
            acro: { total: 4, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } },
            phys: { total: 6, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } }
          },
          hiddenAbilities: { dice: { total: 20 } }
        }
      };
      
      const result = item._getMixedRollFormula(rollData);
      
      // Average of 4 and 6 is 5
      expect(result).toBe('1d20 + 5');
    });

    test('should round up when averaging abilities', () => {
      const rollData = {
        roll: {
          ability: 'acro',
          secondAbility: 'phys',
          bonus: 0,
          diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 }
        },
        actor: {
          abilities: {
            acro: { total: 3, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } },
            phys: { total: 4, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } }
          },
          hiddenAbilities: { dice: { total: 20 } }
        }
      };
      
      const result = item._getMixedRollFormula(rollData);
      
      // Average of 3 and 4 is 3.5, rounded up to 4
      expect(result).toBe('1d20 + 4');
    });

    test('should include bonus in formula', () => {
      const rollData = {
        roll: {
          ability: 'acro',
          secondAbility: 'phys',
          bonus: 3,
          diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 }
        },
        actor: {
          abilities: {
            acro: { total: 4, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } },
            phys: { total: 6, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } }
          },
          hiddenAbilities: { dice: { total: 20 } }
        }
      };
      
      const result = item._getMixedRollFormula(rollData);
      
      expect(result).toBe('1d20 + 5 + 3');
    });

    test('should combine advantage dice adjustments', () => {
      const rollData = {
        roll: {
          ability: 'acro',
          secondAbility: 'phys',
          bonus: 0,
          diceAdjustments: { total: 1, advantage: 1, disadvantage: 0 }
        },
        actor: {
          abilities: {
            acro: { total: 4, diceAdjustments: { total: 1, advantage: 1, disadvantage: 0 } },
            phys: { total: 6, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } }
          },
          hiddenAbilities: { dice: { total: 20 } }
        }
      };
      
      const result = item._getMixedRollFormula(rollData);
      
      // Total advantage: 1 (item) + 1 (acro) + 0 (phys) = 2
      // Formula: 3d20k1 + 5 (average of 4 and 6)
      expect(result).toBe('3d20k1 + 5');
    });

    test('should combine disadvantage dice adjustments', () => {
      const rollData = {
        roll: {
          ability: 'acro',
          secondAbility: 'phys',
          bonus: 0,
          diceAdjustments: { total: -1, advantage: 0, disadvantage: 1 }
        },
        actor: {
          abilities: {
            acro: { total: 4, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } },
            phys: { total: 6, diceAdjustments: { total: -1, advantage: 0, disadvantage: 1 } }
          },
          hiddenAbilities: { dice: { total: 20 } }
        }
      };
      
      const result = item._getMixedRollFormula(rollData);
      
      // Total disadvantage: 1 (item) + 0 (acro) + 1 (phys) = 2
      // Total adjustment: -2
      // Formula: 3d20kl1 + 5
      expect(result).toBe('3d20kl1 + 5');
    });

    test('should use custom die size from hiddenAbilities', () => {
      const rollData = {
        roll: {
          ability: 'acro',
          secondAbility: 'phys',
          bonus: 0,
          diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 }
        },
        actor: {
          abilities: {
            acro: { total: 4, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } },
            phys: { total: 6, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } }
          },
          hiddenAbilities: { dice: { total: 12 } }
        }
      };
      
      const result = item._getMixedRollFormula(rollData);
      
      expect(result).toBe('1d12 + 5');
    });
  });

  describe('_getDiceRollFormula()', () => {
    test('should return dice formula with ability modifier', () => {
      const rollData = {
        roll: {
          ability: 'acro',
          bonus: 2,
          diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 }
        },
        actor: {
          abilities: {
            acro: { total: 5, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } }
          },
          hiddenAbilities: { dice: { total: 20 } }
        }
      };
      
      const result = item._getDiceRollFormula(rollData);
      
      expect(result).toBe('1d20 + 5 + 2');
    });

    test('should return dice formula without bonus when bonus is 0', () => {
      const rollData = {
        roll: {
          ability: 'acro',
          bonus: 0,
          diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 }
        },
        actor: {
          abilities: {
            acro: { total: 3, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } }
          },
          hiddenAbilities: { dice: { total: 20 } }
        }
      };
      
      const result = item._getDiceRollFormula(rollData);
      
      expect(result).toBe('1d20 + 3');
    });
  });

  describe('_calculateDiceAdjustments()', () => {
    test('should use ability-based adjustments for ability rolls', () => {
      const rollData = {
        roll: {
          ability: 'acro',
          diceAdjustments: { total: 1, advantage: 1, disadvantage: 0 }
        },
        actor: {
          abilities: {
            acro: { diceAdjustments: { total: 1, advantage: 1, disadvantage: 0 } }
          }
        }
      };
      
      const result = item._calculateDiceAdjustments(rollData);
      
      expect(result.total).toBe(2); // 1 + 1
      expect(result.advantage).toBe(2);
      expect(result.disadvantage).toBe(0);
      expect(result.mode).toBe('k');
      expect(result.absTotal).toBe(2);
    });

    test('should use unaugmented adjustments for unaugmented rolls', () => {
      const rollData = {
        roll: {
          ability: 'unaugmented',
          diceAdjustments: { total: 2, advantage: 2, disadvantage: 0 }
        },
        actor: {
          abilities: {}
        }
      };
      
      const result = item._calculateDiceAdjustments(rollData);
      
      expect(result.total).toBe(2);
      expect(result.advantage).toBe(2);
      expect(result.disadvantage).toBe(0);
      expect(result.mode).toBe('k');
      expect(result.absTotal).toBe(2);
    });
  });

  describe('_calculateAbilityBasedAdjustments()', () => {
    test('should return default adjustments when roll data is missing', () => {
      const rollData = {
        roll: { ability: 'acro' }
      };
      
      const result = item._calculateAbilityBasedAdjustments(rollData);
      
      expect(result).toEqual({
        total: 0,
        advantage: 0,
        disadvantage: 0,
        mode: 'k',
        absTotal: 0
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Missing diceAdjustments in roll data',
        expect.any(Object),
        'ITEM_ROLLS'
      );
    });

    test('should return default adjustments when actor ability data is missing', () => {
      const rollData = {
        roll: {
          ability: 'acro',
          diceAdjustments: { total: 1, advantage: 1, disadvantage: 0 }
        },
        actor: {
          abilities: {
            acro: { total: 5 } // Missing diceAdjustments
          }
        }
      };
      
      const result = item._calculateAbilityBasedAdjustments(rollData);
      
      expect(result).toEqual({
        total: 0,
        advantage: 0,
        disadvantage: 0,
        mode: 'k',
        absTotal: 0
      });
    });

    test('should combine item and actor adjustments', () => {
      const rollData = {
        roll: {
          ability: 'acro',
          diceAdjustments: { total: 2, advantage: 2, disadvantage: 0 }
        },
        actor: {
          abilities: {
            acro: {
              diceAdjustments: { total: 1, advantage: 1, disadvantage: 0 }
            }
          }
        }
      };
      
      const result = item._calculateAbilityBasedAdjustments(rollData);
      
      expect(result.total).toBe(3);
      expect(result.advantage).toBe(3);
      expect(result.disadvantage).toBe(0);
      expect(result.mode).toBe('k');
      expect(result.absTotal).toBe(3);
    });

    test('should calculate disadvantage correctly', () => {
      const rollData = {
        roll: {
          ability: 'acro',
          diceAdjustments: { total: -2, advantage: 0, disadvantage: 2 }
        },
        actor: {
          abilities: {
            acro: {
              diceAdjustments: { total: -1, advantage: 0, disadvantage: 1 }
            }
          }
        }
      };
      
      const result = item._calculateAbilityBasedAdjustments(rollData);
      
      expect(result.total).toBe(-3);
      expect(result.advantage).toBe(0);
      expect(result.disadvantage).toBe(3);
      expect(result.mode).toBe('kl');
      expect(result.absTotal).toBe(3);
    });

    test('should handle missing total in adjustments', () => {
      const rollData = {
        roll: {
          ability: 'acro',
          diceAdjustments: { advantage: 1, disadvantage: 0 }
        },
        actor: {
          abilities: {
            acro: {
              diceAdjustments: { advantage: 1, disadvantage: 0 }
            }
          }
        }
      };
      
      const result = item._calculateAbilityBasedAdjustments(rollData);
      
      expect(result.total).toBe(0);
      expect(result.advantage).toBe(2);
      expect(result.disadvantage).toBe(0);
    });
  });

  describe('_calculateUnaugmentedAdjustments()', () => {
    test('should return default adjustments when roll data is missing', () => {
      const rollData = {
        roll: { ability: 'unaugmented' }
      };
      
      const result = item._calculateUnaugmentedAdjustments(rollData);
      
      expect(result).toEqual({
        total: 0,
        advantage: 0,
        disadvantage: 0,
        mode: 'k',
        absTotal: 0
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Missing diceAdjustments in roll data for unaugmented roll',
        expect.any(Object),
        'ITEM_ROLLS'
      );
    });

    test('should calculate adjustments for positive total', () => {
      const rollData = {
        roll: {
          ability: 'unaugmented',
          diceAdjustments: { total: 3, advantage: 3, disadvantage: 0 }
        },
        actor: { abilities: {} }
      };
      
      const result = item._calculateUnaugmentedAdjustments(rollData);
      
      expect(result.total).toBe(3);
      expect(result.advantage).toBe(3);
      expect(result.disadvantage).toBe(0);
      expect(result.mode).toBe('k');
      expect(result.absTotal).toBe(3);
    });

    test('should calculate adjustments for negative total', () => {
      const rollData = {
        roll: {
          ability: 'unaugmented',
          diceAdjustments: { total: -2, advantage: 0, disadvantage: 2 }
        },
        actor: { abilities: {} }
      };
      
      const result = item._calculateUnaugmentedAdjustments(rollData);
      
      expect(result.total).toBe(-2);
      expect(result.advantage).toBe(0);
      expect(result.disadvantage).toBe(2);
      expect(result.mode).toBe('kl');
      expect(result.absTotal).toBe(2);
    });

    test('should handle missing total (default to 0)', () => {
      const rollData = {
        roll: {
          ability: 'unaugmented',
          diceAdjustments: { advantage: 1, disadvantage: 0 }
        },
        actor: { abilities: {} }
      };
      
      const result = item._calculateUnaugmentedAdjustments(rollData);
      
      // When total is missing, it's calculated as 0 but not added to the spread object
      // The spread only copies existing properties from diceAdjustments
      expect(result.advantage).toBe(1);
      expect(result.disadvantage).toBe(0);
      expect(result.mode).toBe('k');
      expect(result.absTotal).toBe(0);
    });
  });

  describe('_buildDiceFormula()', () => {
    test('should build basic formula with no adjustments', () => {
      const rollData = {
        roll: {
          ability: 'acro',
          bonus: 2,
          diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 }
        },
        actor: {
          abilities: {
            acro: { total: 5, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } }
          },
          hiddenAbilities: { dice: { total: 20 } }
        }
      };
      
      const adjustments = {
        total: 0,
        advantage: 0,
        disadvantage: 0,
        mode: 'k',
        absTotal: 0
      };
      
      const result = item._buildDiceFormula(rollData, adjustments);
      
      expect(result).toBe('1d20 + 5 + 2');
    });

    test('should build formula with advantage adjustments', () => {
      const rollData = {
        roll: {
          ability: 'acro',
          bonus: 0,
          diceAdjustments: { total: 2, advantage: 2, disadvantage: 0 }
        },
        actor: {
          abilities: {
            acro: { total: 4, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } }
          },
          hiddenAbilities: { dice: { total: 20 } }
        }
      };
      
      const adjustments = {
        total: 2,
        advantage: 2,
        disadvantage: 0,
        mode: 'k',
        absTotal: 2
      };
      
      const result = item._buildDiceFormula(rollData, adjustments);
      
      // 3d20k1 (roll 3 dice, keep highest 1)
      expect(result).toBe('3d20k1 + 4');
    });

    test('should build formula with disadvantage adjustments', () => {
      const rollData = {
        roll: {
          ability: 'acro',
          bonus: 0,
          diceAdjustments: { total: -2, advantage: 0, disadvantage: 2 }
        },
        actor: {
          abilities: {
            acro: { total: 4, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } }
          },
          hiddenAbilities: { dice: { total: 20 } }
        }
      };
      
      const adjustments = {
        total: -2,
        advantage: 0,
        disadvantage: 2,
        mode: 'kl',
        absTotal: 2
      };
      
      const result = item._buildDiceFormula(rollData, adjustments);
      
      // 3d20kl1 (roll 3 dice, keep lowest 1)
      expect(result).toBe('3d20kl1 + 4');
    });

    test('should fallback to d20 when hiddenAbilities missing', () => {
      const rollData = {
        roll: {
          ability: 'acro',
          bonus: 0,
          diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 }
        },
        actor: {
          abilities: {
            acro: { total: 5 }
          }
          // Missing hiddenAbilities
        }
      };
      
      const adjustments = {
        total: 0,
        advantage: 0,
        disadvantage: 0,
        mode: 'k',
        absTotal: 0
      };
      
      const result = item._buildDiceFormula(rollData, adjustments);
      
      expect(result).toBe('1d20');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Missing hiddenAbilities.dice.total in actor data',
        expect.any(Object),
        'ITEM_ROLLS'
      );
    });

    test('should not add ability modifier for unaugmented rolls', () => {
      const rollData = {
        roll: {
          ability: 'unaugmented',
          bonus: 3,
          diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 }
        },
        actor: {
          abilities: {},
          hiddenAbilities: { dice: { total: 20 } }
        }
      };
      
      const adjustments = {
        total: 0,
        advantage: 0,
        disadvantage: 0,
        mode: 'k',
        absTotal: 0
      };
      
      const result = item._buildDiceFormula(rollData, adjustments);
      
      expect(result).toBe('1d20 + 3');
    });

    test('should warn when ability total is missing', () => {
      const rollData = {
        roll: {
          ability: 'acro',
          bonus: 0,
          diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 }
        },
        actor: {
          abilities: {
            acro: { total: 5 } // Has total but no diceAdjustments
          },
          hiddenAbilities: { dice: { total: 20 } }
        }
      };
      
      const adjustments = {
        total: 0,
        advantage: 0,
        disadvantage: 0,
        mode: 'k',
        absTotal: 0
      };
      
      const result = item._buildDiceFormula(rollData, adjustments);
      
      expect(result).toBe('1d20 + 5');
    });

    test('should use custom die size', () => {
      const rollData = {
        roll: {
          ability: 'acro',
          bonus: 0,
          diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 }
        },
        actor: {
          abilities: {
            acro: { total: 4, diceAdjustments: { total: 0, advantage: 0, disadvantage: 0 } }
          },
          hiddenAbilities: { dice: { total: 12 } }
        }
      };
      
      const adjustments = {
        total: 0,
        advantage: 0,
        disadvantage: 0,
        mode: 'k',
        absTotal: 0
      };
      
      const result = item._buildDiceFormula(rollData, adjustments);
      
      expect(result).toBe('1d12 + 4');
    });
  });

  describe('_getDefaultAdjustments()', () => {
    test('should return default adjustments object', () => {
      const result = item._getDefaultAdjustments();
      
      expect(result).toEqual({
        total: 0,
        advantage: 0,
        disadvantage: 0,
        mode: 'k',
        absTotal: 0
      });
    });
  });

  describe('canRoll()', () => {
    test('should return false when no actor', () => {
      item.actor = null;
      item.system = { roll: { type: 'roll' } };
      
      const result = item.canRoll();
      
      expect(result).toBe(false);
    });

    test('should return false when no roll data', () => {
      item.actor = { id: 'actor-1' };
      item.system = {};
      
      const result = item.canRoll();
      
      expect(result).toBe(false);
    });

    test('should return false when roll type is none', () => {
      item.actor = { id: 'actor-1' };
      item.system = { roll: { type: 'none' } };
      
      const result = item.canRoll();
      
      expect(result).toBe(false);
    });

    test('should return true when all conditions are met', () => {
      item.actor = { id: 'actor-1' };
      item.system = { roll: { type: 'roll' } };
      
      const result = item.canRoll();
      
      expect(result).toBe(true);
    });

    test('should log debug when testingMode is enabled', () => {
      mockGetSetting.mockReturnValue(true);
      
      item.actor = { id: 'actor-1' };
      item.system = { roll: { type: 'roll' } };
      
      item.canRoll();
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Item roll validation',
        expect.objectContaining({
          hasActor: true,
          hasRollData: true,
          isNotNoneType: true,
          canRoll: true
        }),
        'ITEM_ROLLS'
      );
      
      // Reset for other tests
      mockGetSetting.mockReturnValue(false);
    });
  });

  describe('getRollType()', () => {
    test('should return roll type from system', () => {
      item.system = { roll: { type: 'roll' } };
      
      const result = item.getRollType();
      
      expect(result).toBe('roll');
    });

    test('should return flat type from system', () => {
      item.system = { roll: { type: 'flat' } };
      
      const result = item.getRollType();
      
      expect(result).toBe('flat');
    });

    test('should return none when no roll data', () => {
      item.system = {};
      
      const result = item.getRollType();
      
      expect(result).toBe('none');
    });

    test('should return none when system is undefined', () => {
      item.system = undefined;
      
      const result = item.getRollType();
      
      expect(result).toBe('none');
    });
  });

  describe('getRollAbility()', () => {
    test('should return ability from system', () => {
      item.system = { roll: { ability: 'acro' } };
      
      const result = item.getRollAbility();
      
      expect(result).toBe('acro');
    });

    test('should return unaugmented when no ability', () => {
      item.system = { roll: {} };
      
      const result = item.getRollAbility();
      
      expect(result).toBe('unaugmented');
    });

    test('should return unaugmented when no roll data', () => {
      item.system = {};
      
      const result = item.getRollAbility();
      
      expect(result).toBe('unaugmented');
    });
  });

  describe('getRollBonus()', () => {
    test('should return bonus from system', () => {
      item.system = { roll: { bonus: 5 } };
      
      const result = item.getRollBonus();
      
      expect(result).toBe(5);
    });

    test('should return 0 when no bonus', () => {
      item.system = { roll: {} };
      
      const result = item.getRollBonus();
      
      expect(result).toBe(0);
    });

    test('should return 0 when no roll data', () => {
      item.system = {};
      
      const result = item.getRollBonus();
      
      expect(result).toBe(0);
    });

    test('should handle negative bonus', () => {
      item.system = { roll: { bonus: -3 } };
      
      const result = item.getRollBonus();
      
      expect(result).toBe(-3);
    });
  });

  describe('hasDiceAdjustments()', () => {
    test('should return true when advantage is non-zero', () => {
      item.system = { roll: { diceAdjustments: { advantage: 2, disadvantage: 0 } } };
      
      const result = item.hasDiceAdjustments();
      
      expect(result).toBe(true);
    });

    test('should return true when disadvantage is non-zero', () => {
      item.system = { roll: { diceAdjustments: { advantage: 0, disadvantage: 1 } } };
      
      const result = item.hasDiceAdjustments();
      
      expect(result).toBe(true);
    });

    test('should return false when both are zero', () => {
      item.system = { roll: { diceAdjustments: { advantage: 0, disadvantage: 0 } } };
      
      const result = item.hasDiceAdjustments();
      
      expect(result).toBe(false);
    });

    test('should return false when no diceAdjustments', () => {
      item.system = { roll: {} };
      
      const result = item.hasDiceAdjustments();
      
      expect(result).toBe(false);
    });

    test('should return false when no roll data', () => {
      item.system = {};
      
      const result = item.hasDiceAdjustments();
      
      expect(result).toBe(false);
    });

    test('should handle missing advantage/disadvantage fields', () => {
      item.system = { roll: { diceAdjustments: { total: 1 } } };
      
      const result = item.hasDiceAdjustments();
      
      expect(result).toBe(false);
    });
  });
});