// @ts-nocheck
/**
 * @fileoverview Tests for DamageProcessor Service
 *
 * Unit tests for the DamageProcessor service which handles damage roll
 * resolution, vulnerability modifier application, and damage condition
 * evaluation for attack chains and saved damage.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Mock dependencies before import
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    methodEntry: vi.fn(),
    methodExit: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../../../module/utils/roll-utilities.mjs', () => ({
  ERPSRollUtilities: {
    applyVulnerabilityModifier: vi.fn((formula, vuln) => {
      if (vuln === 0) return formula;
      if (vuln > 0) return `${formula} * (1 + ${vuln / 100})`;
      return `${formula} * (1 - ${Math.abs(vuln) / 100})`;
    }),
    determineCriticalStates: vi.fn(() => ({
      critHit: false,
      critMiss: false,
      stolenCrit: false,
      savedMiss: false
    }))
  }
}));

// Import the service after setting up mocks
import { DamageProcessor } from '../../../module/services/damage-processor.mjs';

describe('DamageProcessor', () => {
  let mockActor;
  let mockActionCard;
  let mockContext;
  let mockRollResult;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock actor
    mockActor = {
      id: 'actor-123',
      name: 'Test Actor',
      system: {
        abilities: {
          acro: { total: 3 },
          phys: { total: 4 },
          fort: { total: 2 },
          will: { total: 3 },
          wits: { total: 3 },
          vuln: { total: 0 }
        },
        hiddenAbilities: {
          vuln: { value: 0, change: 0, total: 0 }
        }
      },
      damageResolve: vi.fn(async () => null),
      applyDamageBundle: vi.fn(async () => ({ resolveRoll: null, powerRoll: null })),
      getRollData: vi.fn(() => ({
        hiddenAbilities: { acro: 20, miss: 5 }
      }))
    };

    // Create mock action card
    mockActionCard = {
      id: 'action-card-123',
      name: 'Test Action Card',
      img: 'icons/skills.png',
      system: {
        damageFormula: '2d6',
        damageType: 'physical',
        damageCondition: 'always'
      }
    };

    // Create mock context
    mockContext = {
      actionCard: mockActionCard,
      damageFormula: '2d6',
      damageType: 'physical',
      damageCondition: 'always',
      damageThreshold: 15,
      label: 'Test Damage',
      description: 'Damage test',
      img: 'icons/skills.png',
      bgColor: '#ff0000',
      textColor: '#ffffff',
      actor: mockActor,
      formula: '2d6'
    };

    // Create mock roll result
    mockRollResult = {
      total: 18,
      formula: '1d20+5',
      results: [18],
      dice: []
    };
  });

  describe('shouldApplyEffect()', () => {
    test('should delegate to ConditionEvaluator.evaluate', () => {
      const result = DamageProcessor.shouldApplyEffect('always', false, false, 0);
      expect(result).toBe(true);
    });

    test('should pass all parameters through to ConditionEvaluator', () => {
      const result = DamageProcessor.shouldApplyEffect('rollValue', false, false, 18, 10);
      expect(result).toBe(true);
    });
  });

  describe('resolveDamageForTarget()', () => {
    test('should apply vulnerability modifier when vuln is positive', async () => {
      mockActor.system.hiddenAbilities.vuln.value = 25;

      const mockDamageRoll = {
        total: 12,
        formula: '2d6 + 25',
        evaluate: vi.fn(async () => mockDamageRoll),
        toMessage: vi.fn(async () => {})
      };

      mockActor.damageResolve = vi.fn(async (options) => {
        // The implementation adds vuln value directly to formula
        expect(options.formula).toBe('2d6 + 25');
        return mockDamageRoll;
      });

      const result = await DamageProcessor.resolveDamageForTarget(mockActor, mockContext);

      expect(result).toEqual(mockDamageRoll);
      expect(mockActor.damageResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          formula: '2d6 + 25'
        })
      );
    });

    test('should not apply vulnerability modifier when vuln is negative', async () => {
      mockActor.system.hiddenAbilities.vuln.total = -25;

      const mockDamageRoll = {
        total: 12,
        formula: '2d6',
        evaluate: vi.fn(async () => mockDamageRoll),
        toMessage: vi.fn(async () => {})
      };

      mockActor.damageResolve = vi.fn(async (options) => {
        // Negative vuln doesn't modify formula in current implementation
        expect(options.formula).toBe('2d6');
        return mockDamageRoll;
      });

      const result = await DamageProcessor.resolveDamageForTarget(mockActor, mockContext);

      expect(result).toEqual(mockDamageRoll);
    });

    test('should not apply vulnerability modifier when vuln is zero', async () => {
      mockActor.system.hiddenAbilities.vuln.total = 0;

      const mockDamageRoll = {
        total: 12,
        formula: '2d6',
        evaluate: vi.fn(async () => mockDamageRoll),
        toMessage: vi.fn(async () => {})
      };

      mockActor.damageResolve = vi.fn(async (options) => {
        expect(options.formula).toBe('2d6');
        return mockDamageRoll;
      });

      const result = await DamageProcessor.resolveDamageForTarget(mockActor, mockContext);

      expect(result).toEqual(mockDamageRoll);
      expect(mockActor.damageResolve).toHaveBeenCalledWith(
        expect.objectContaining({ formula: '2d6' })
      );
    });

    test('should include roll data from actor', async () => {
      const mockDamageRoll = {
        total: 12,
        formula: '2d6',
        evaluate: vi.fn(async () => mockDamageRoll),
        toMessage: vi.fn(async () => {})
      };

      mockActor.damageResolve = vi.fn(async () => mockDamageRoll);

      const result = await DamageProcessor.resolveDamageForTarget(mockActor, mockContext);

      expect(result).toEqual(mockDamageRoll);
    });

    test('should handle missing hiddenAbilities gracefully', async () => {
      delete mockActor.system.hiddenAbilities;

      const mockDamageRoll = {
        total: 12,
        formula: '2d6',
        evaluate: vi.fn(async () => mockDamageRoll),
        toMessage: vi.fn(async () => {})
      };

      mockActor.damageResolve = vi.fn(async () => mockDamageRoll);

      const result = await DamageProcessor.resolveDamageForTarget(mockActor, mockContext);

      expect(result).toEqual(mockDamageRoll);
    });

    test('should propagate roll creation failure', async () => {
      mockActor.damageResolve = vi.fn(async () => {
        throw new Error('Roll creation failed');
      });

      // The implementation doesn't catch errors - they propagate to the caller
      await expect(DamageProcessor.resolveDamageForTarget(mockActor, mockContext)).rejects.toThrow('Roll creation failed');
    });
  });

  describe('processDamageResults()', () => {
    test('should process damage for all targets', async () => {
      const target1 = { ...mockActor, id: 'target-1' };
      const target2 = { ...mockActor, id: 'target-2' };

      const results = [
        { target: target1, oneHit: true, bothHit: false },
        { target: target2, oneHit: true, bothHit: false }
      ];

      const mockDamageRoll = {
        total: 12,
        formula: '2d6',
        evaluate: vi.fn(async () => mockDamageRoll)
      };

      target1.damageResolve = vi.fn(async () => mockDamageRoll);
      target2.damageResolve = vi.fn(async () => mockDamageRoll);

      const damageResults = await DamageProcessor.processDamageResults(results, mockRollResult, mockContext);

      expect(damageResults).toHaveLength(2);
      expect(damageResults[0].target).toBe(target1);
      expect(damageResults[1].target).toBe(target2);
    });

    test('should skip targets that do not meet damage condition', async () => {
      const target1 = { ...mockActor, id: 'target-1' };
      const target2 = { ...mockActor, id: 'target-2' };

      const results = [
        { target: target1, oneHit: true, bothHit: false },
        { target: target2, oneHit: false, bothHit: false }
      ];

      mockContext.damageCondition = 'oneSuccess';

      const mockDamageRoll = {
        total: 12,
        formula: '2d6',
        evaluate: vi.fn(async () => mockDamageRoll)
      };

      target1.damageResolve = vi.fn(async () => mockDamageRoll);
      target2.damageResolve = vi.fn(async () => mockDamageRoll);

      const damageResults = await DamageProcessor.processDamageResults(results, mockRollResult, mockContext);

      expect(damageResults).toHaveLength(1);
      expect(damageResults[0].target).toBe(target1);
    });

    test('should handle damage roll errors gracefully', async () => {
      const target1 = { ...mockActor, id: 'target-1' };
      const target2 = { ...mockActor, id: 'target-2' };

      const results = [
        { target: target1, oneHit: true, bothHit: false },
        { target: target2, oneHit: true, bothHit: false }
      ];

      const mockDamageRoll = {
        total: 12,
        formula: '2d6',
        evaluate: vi.fn(async () => mockDamageRoll)
      };

      target1.damageResolve = vi.fn(async () => mockDamageRoll);
      target2.damageResolve = vi.fn(async () => {
        throw new Error('Roll failed');
      });

      const { Logger } = await import('../../../module/services/logger.mjs');

      const damageResults = await DamageProcessor.processDamageResults(results, mockRollResult, mockContext);

      expect(damageResults).toHaveLength(1);
      expect(Logger.error).toHaveBeenCalled();
    });

    test('should skip damage when damageFormula is missing', async () => {
      const target1 = { ...mockActor, id: 'target-1' };
      const results = [{ target: target1, oneHit: true, bothHit: false }];

      mockContext.damageFormula = null;

      const damageResults = await DamageProcessor.processDamageResults(results, mockRollResult, mockContext);

      expect(damageResults).toHaveLength(0);
    });

    test('should skip damage when shouldApplyEffect returns false', async () => {
      const target1 = { ...mockActor, id: 'target-1' };
      const results = [{ target: target1, oneHit: false, bothHit: false }];

      mockContext.damageCondition = 'oneSuccess';

      const damageResults = await DamageProcessor.processDamageResults(results, mockRollResult, mockContext);

      expect(damageResults).toHaveLength(0);
    });

    test('should apply power damage independently when resolve condition not met', async () => {
      const target1 = { ...mockActor, id: 'target-1' };
      const results = [{ target: target1, oneHit: false, bothHit: false }];

      target1.damageResolve = vi.fn(async () => ({
        total: 5,
        formula: '1d6',
      }));

      const context = {
        ...mockContext,
        damageCondition: 'twoSuccesses',
        powerDamageFormula: '1d6',
        powerDamageType: 'damage',
        powerDamageCondition: 'zeroSuccesses',
        powerDamageThreshold: 15,
      };

      const damageResults = await DamageProcessor.processDamageResults(results, mockRollResult, context);

      expect(damageResults).toHaveLength(1);
      expect(target1.damageResolve).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'power',
          type: 'damage',
        })
      );
    });

    test('should bundle resolve and power damage when both conditions met', async () => {
      const target1 = { ...mockActor, id: 'target-1' };
      const results = [{ target: target1, oneHit: true, bothHit: false }];

      const mockResolveRoll = { total: 10, formula: '2d6' };
      const mockPowerRoll = { total: 5, formula: '1d6' };

      target1.applyDamageBundle = vi.fn(async () => ({
        resolveRoll: mockResolveRoll,
        powerRoll: mockPowerRoll,
      }));

      const context = {
        ...mockContext,
        damageCondition: 'oneSuccess',
        powerDamageFormula: '1d6',
        powerDamageType: 'damage',
        powerDamageCondition: 'oneSuccess',
        powerDamageThreshold: 15,
      };

      const damageResults = await DamageProcessor.processDamageResults(results, mockRollResult, context);

      expect(damageResults).toHaveLength(1);
      expect(target1.applyDamageBundle).toHaveBeenCalledWith(
        expect.objectContaining({
          resolveDamage: expect.any(Object),
          powerDamage: expect.objectContaining({ formula: '1d6', type: 'damage' }),
        })
      );
    });

    test('should exclude power damage from bundle when powerDamageFormula is zero', async () => {
      const target1 = { ...mockActor, id: 'target-1' };
      const results = [{ target: target1, oneHit: true, bothHit: false }];

      target1.damageResolve = vi.fn(async () => ({ total: 10 }));

      const context = {
        ...mockContext,
        powerDamageFormula: '0',
        powerDamageType: 'damage',
        powerDamageCondition: 'oneSuccess',
        powerDamageThreshold: 15,
      };

      await DamageProcessor.processDamageResults(results, mockRollResult, context);

      // Only resolve applies (power is zero) — should use single-type damageResolve
      expect(target1.damageResolve).toHaveBeenCalled();
      expect(target1.applyDamageBundle).not.toHaveBeenCalled();
    });
  });

  describe('processSavedDamage()', () => {
    test('should process saved damage roll for target', async () => {
      const savedContext = {
        actionCard: mockActionCard,
        formula: '3d6+2',
        type: 'physical',
        label: 'Saved Damage',
        description: 'Damage from saved attack',
        img: 'icons/skills.png',
        bgColor: '#ff0000',
        textColor: '#ffffff'
      };

      const mockDamageRoll = {
        total: 15,
        formula: '3d6+2',
        evaluate: vi.fn(async () => mockDamageRoll)
      };

      mockActor.damageResolve = vi.fn(async () => mockDamageRoll);

      const targetToken = { id: 'token-1', actor: mockActor };
      const result = await DamageProcessor.processSavedDamage([targetToken], savedContext);

      expect(result).toHaveLength(1);
      expect(result[0].target).toBe(mockActor);
      expect(result[0].resolveRoll).toEqual(mockDamageRoll);
    });

    test('should apply vulnerability to saved damage', async () => {
      mockActor.system.hiddenAbilities.vuln.value = 25;

      const savedContext = {
        actionCard: mockActionCard,
        formula: '2d6',
        type: 'physical',
        label: 'Saved Damage',
        description: 'Damage from saved attack',
        img: 'icons/skills.png',
        bgColor: '#ff0000',
        textColor: '#ffffff'
      };

      const mockDamageRoll = {
        total: 12,
        formula: '2d6',
        evaluate: vi.fn(async () => mockDamageRoll)
      };

      mockActor.damageResolve = vi.fn(async (options) => {
        expect(options.formula).toContain('+ 25');
        return mockDamageRoll;
      });

      const targetToken = { id: 'token-1', actor: mockActor };
      const result = await DamageProcessor.processSavedDamage([targetToken], savedContext);

      expect(result).toHaveLength(1);
      expect(result[0].resolveRoll).toEqual(mockDamageRoll);
    });

    test('should handle missing vuln in saved damage', async () => {
      delete mockActor.system.hiddenAbilities;

      const savedContext = {
        actionCard: mockActionCard,
        formula: '2d6',
        type: 'physical',
        label: 'Saved Damage',
        description: 'Damage from saved attack',
        img: 'icons/skills.png',
        bgColor: '#ff0000',
        textColor: '#ffffff'
      };

      const mockDamageRoll = {
        total: 12,
        formula: '2d6',
        evaluate: vi.fn(async () => mockDamageRoll)
      };

      mockActor.damageResolve = vi.fn(async () => mockDamageRoll);

      const targetToken = { id: 'token-1', actor: mockActor };
      const result = await DamageProcessor.processSavedDamage([targetToken], savedContext);

      expect(result).toHaveLength(1);
      expect(result[0].resolveRoll).toEqual(mockDamageRoll);
    });

    test('should handle roll failure in saved damage', async () => {
      const savedContext = {
        actionCard: mockActionCard,
        formula: '2d6',
        type: 'physical',
        label: 'Saved Damage',
        description: 'Damage from saved attack',
        img: 'icons/skills.png',
        bgColor: '#ff0000',
        textColor: '#ffffff'
      };

      mockActor.damageResolve = vi.fn(async () => {
        throw new Error('Roll creation failed');
      });

      const targetToken = { id: 'token-1', actor: mockActor };
      const result = await DamageProcessor.processSavedDamage([targetToken], savedContext);

      expect(result).toHaveLength(0);
    });
  });

  describe('shouldApplyDamage()', () => {
    test('should return false when damageFormula is missing', () => {
      const attackChain = { damageCondition: 'always' };
      const result = DamageProcessor.shouldApplyDamage(attackChain, true, true, 20);
      expect(result).toBe(false);
    });

    test('should return true when condition is always and formula exists', () => {
      const attackChain = { damageFormula: '2d6', damageCondition: 'always' };
      const result = DamageProcessor.shouldApplyDamage(attackChain, false, false, 0);
      expect(result).toBe(true);
    });

    test('should use default threshold when not specified', () => {
      const attackChain = { damageFormula: '2d6', damageCondition: 'rollValue' };
      // Default threshold is 15, roll of 18 should pass
      const result = DamageProcessor.shouldApplyDamage(attackChain, false, false, 18);
      expect(result).toBe(true);
    });

    test('should use custom threshold when specified', () => {
      const attackChain = { damageFormula: '2d6', damageCondition: 'rollValue', damageThreshold: 20 };
      const result = DamageProcessor.shouldApplyDamage(attackChain, false, false, 18);
      expect(result).toBe(false);
    });
  });

  describe('getVulnerabilityTotal()', () => {
    test('should return vulnerability total from target', () => {
      mockActor.system.hiddenAbilities.vuln.total = 15;
      const result = DamageProcessor.getVulnerabilityTotal(mockActor);
      expect(result).toBe(15);
    });

    test('should return 0 when hiddenAbilities is missing', () => {
      delete mockActor.system.hiddenAbilities;
      const result = DamageProcessor.getVulnerabilityTotal(mockActor);
      expect(result).toBe(0);
    });

    test('should return 0 when vuln is missing', () => {
      delete mockActor.system.hiddenAbilities.vuln;
      const result = DamageProcessor.getVulnerabilityTotal(mockActor);
      expect(result).toBe(0);
    });

    test('should return 0 when system is missing', () => {
      delete mockActor.system;
      const result = DamageProcessor.getVulnerabilityTotal(mockActor);
      expect(result).toBe(0);
    });
  });

  describe('hasVulnerability()', () => {
    test('should return true when vulnerability is positive', () => {
      mockActor.system.hiddenAbilities.vuln.total = 10;
      const result = DamageProcessor.hasVulnerability(mockActor);
      expect(result).toBe(true);
    });

    test('should return false when vulnerability is zero', () => {
      mockActor.system.hiddenAbilities.vuln.total = 0;
      const result = DamageProcessor.hasVulnerability(mockActor);
      expect(result).toBe(false);
    });

    test('should return false when vulnerability is negative', () => {
      mockActor.system.hiddenAbilities.vuln.total = -5;
      const result = DamageProcessor.hasVulnerability(mockActor);
      expect(result).toBe(false);
    });
  });

  describe('isHealing()', () => {
    test('should return true for heal damage type', () => {
      const result = DamageProcessor.isHealing('heal');
      expect(result).toBe(true);
    });

    test('should return false for physical damage type', () => {
      const result = DamageProcessor.isHealing('physical');
      expect(result).toBe(false);
    });

    test('should return false for empty string', () => {
      const result = DamageProcessor.isHealing('');
      expect(result).toBe(false);
    });
  });

  describe('isZeroFormula()', () => {
    test('should return true for undefined', () => {
      expect(DamageProcessor.isZeroFormula(undefined)).toBe(true);
    });

    test('should return true for empty string', () => {
      expect(DamageProcessor.isZeroFormula('')).toBe(true);
    });

    test('should return true for whitespace-only string', () => {
      expect(DamageProcessor.isZeroFormula('   ')).toBe(true);
    });

    test('should return true for literal zero', () => {
      expect(DamageProcessor.isZeroFormula('0')).toBe(true);
    });

    test('should return false for a dice formula', () => {
      expect(DamageProcessor.isZeroFormula('1d6')).toBe(false);
    });

    test('should return false for a non-zero flat value', () => {
      expect(DamageProcessor.isZeroFormula('5')).toBe(false);
    });
  });

  describe('isValidFormula()', () => {
    test('should return true for valid formula string', () => {
      const result = DamageProcessor.isValidFormula('2d6+5');
      expect(result).toBe(true);
    });

    test('should return false for empty string', () => {
      const result = DamageProcessor.isValidFormula('');
      expect(result).toBe(false);
    });

    test('should return false for whitespace-only string', () => {
      const result = DamageProcessor.isValidFormula('   ');
      expect(result).toBe(false);
    });

    test('should return false for null', () => {
      const result = DamageProcessor.isValidFormula(null);
      expect(result).toBe(false);
    });

    test('should return false for undefined', () => {
      const result = DamageProcessor.isValidFormula(undefined);
      expect(result).toBe(false);
    });

    test('should return false for number', () => {
      const result = DamageProcessor.isValidFormula(123);
      expect(result).toBe(false);
    });
  });

  describe('applyVulnerabilityModifier()', () => {
    test('should add vulnerability to formula for non-healing damage', () => {
      mockActor.system.hiddenAbilities.vuln.value = 10;
      const result = DamageProcessor.applyVulnerabilityModifier('2d6', 'physical', mockActor);
      expect(result).toBe('2d6 + 10');
    });

    test('should not modify formula for healing damage', () => {
      mockActor.system.hiddenAbilities.vuln.value = 10;
      const result = DamageProcessor.applyVulnerabilityModifier('2d6', 'heal', mockActor);
      expect(result).toBe('2d6');
    });

    test('should not modify formula when vulnerability is zero', () => {
      mockActor.system.hiddenAbilities.vuln.value = 0;
      const result = DamageProcessor.applyVulnerabilityModifier('2d6', 'physical', mockActor);
      expect(result).toBe('2d6');
    });

    test('should handle missing hiddenAbilities', () => {
      delete mockActor.system.hiddenAbilities;
      const result = DamageProcessor.applyVulnerabilityModifier('2d6', 'physical', mockActor);
      expect(result).toBe('2d6');
    });

    test('should handle missing system', () => {
      delete mockActor.system;
      const result = DamageProcessor.applyVulnerabilityModifier('2d6', 'physical', mockActor);
      expect(result).toBe('2d6');
    });
  });
});