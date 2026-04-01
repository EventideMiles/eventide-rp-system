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
import { ERPSRollUtilities } from '../../../module/utils/roll-utilities.mjs';

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
          vuln: { total: 0 }
        }
      },
      damageResolve: vi.fn(async () => null),
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
    test('should return true for always condition', () => {
      const result = DamageProcessor.shouldApplyEffect('always', false, false, 0);
      expect(result).toBe(true);
    });

    test('should return true for oneSuccess condition when one hit', () => {
      const result = DamageProcessor.shouldApplyEffect('oneSuccess', true, false, 0);
      expect(result).toBe(true);
    });

    test('should return false for oneSuccess condition when no hit', () => {
      const result = DamageProcessor.shouldApplyEffect('oneSuccess', false, false, 0);
      expect(result).toBe(false);
    });

    test('should return true for twoSuccesses condition when both hit', () => {
      const result = DamageProcessor.shouldApplyEffect('twoSuccesses', true, true, 0);
      expect(result).toBe(true);
    });

    test('should return false for twoSuccesses condition when only one hit', () => {
      const result = DamageProcessor.shouldApplyEffect('twoSuccesses', true, false, 0);
      expect(result).toBe(false);
    });

    test('should return true for rollValue condition when roll meets threshold', () => {
      const result = DamageProcessor.shouldApplyEffect(
        'rollValue',
        false,
        false,
        18,
        15
      );
      expect(result).toBe(true);
    });

    test('should return false for rollValue condition when roll below threshold', () => {
      const result = DamageProcessor.shouldApplyEffect(
        'rollValue',
        false,
        false,
        12,
        15
      );
      expect(result).toBe(false);
    });

    test('should return true for rollValue condition when roll equals threshold', () => {
      const result = DamageProcessor.shouldApplyEffect(
        'rollValue',
        false,
        false,
        15,
        15
      );
      expect(result).toBe(true);
    });

    test('should handle negative vulnerability correctly', () => {
      const result = DamageProcessor.shouldApplyEffect(
        'vuln',
        false,
        false,
        0,
        0,
        mockRollResult,
        mockActor,
        '2d6'
      );
      // This test verifies the method handles the vuln condition without crashing
      expect(typeof result).toBe('boolean');
    });

    test('should return false for unknown condition', () => {
      const result = DamageProcessor.shouldApplyEffect('unknown', false, false, 0);
      expect(result).toBe(false);
    });

    test('should handle null roll result gracefully', () => {
      const result = DamageProcessor.shouldApplyEffect(
        'rollValue',
        false,
        false,
        0,
        15
      );
      expect(result).toBe(false);
    });

    test('should handle missing damage threshold', () => {
      const result = DamageProcessor.shouldApplyEffect(
        'rollValue',
        false,
        false,
        18
      );
      // Should use default threshold of 15
      expect(result).toBe(true);
    });

    // New tests for uncovered conditions
    test('should return false for never condition', () => {
      const result = DamageProcessor.shouldApplyEffect('never', true, true, 20);
      expect(result).toBe(false);
    });

    test('should return true for rollUnderValue when roll below threshold', () => {
      const result = DamageProcessor.shouldApplyEffect(
        'rollUnderValue',
        false,
        false,
        10,
        15
      );
      expect(result).toBe(true);
    });

    test('should return false for rollUnderValue when roll equals threshold', () => {
      const result = DamageProcessor.shouldApplyEffect(
        'rollUnderValue',
        false,
        false,
        15,
        15
      );
      expect(result).toBe(false);
    });

    test('should return false for rollUnderValue when roll above threshold', () => {
      const result = DamageProcessor.shouldApplyEffect(
        'rollUnderValue',
        false,
        false,
        20,
        15
      );
      expect(result).toBe(false);
    });

    test('should return true for rollEven when roll is even', () => {
      const result = DamageProcessor.shouldApplyEffect('rollEven', false, false, 16);
      expect(result).toBe(true);
    });

    test('should return false for rollEven when roll is odd', () => {
      const result = DamageProcessor.shouldApplyEffect('rollEven', false, false, 15);
      expect(result).toBe(false);
    });

    test('should return true for rollOdd when roll is odd', () => {
      const result = DamageProcessor.shouldApplyEffect('rollOdd', false, false, 15);
      expect(result).toBe(true);
    });

    test('should return false for rollOdd when roll is even', () => {
      const result = DamageProcessor.shouldApplyEffect('rollOdd', false, false, 16);
      expect(result).toBe(false);
    });

    test('should return true for rollOnValue when roll equals threshold', () => {
      const result = DamageProcessor.shouldApplyEffect(
        'rollOnValue',
        false,
        false,
        15,
        15
      );
      expect(result).toBe(true);
    });

    test('should return false for rollOnValue when roll does not equal threshold', () => {
      const result = DamageProcessor.shouldApplyEffect(
        'rollOnValue',
        false,
        false,
        14,
        15
      );
      expect(result).toBe(false);
    });

    test('should return true for zeroSuccesses when no hits', () => {
      const result = DamageProcessor.shouldApplyEffect('zeroSuccesses', false, false, 0);
      expect(result).toBe(true);
    });

    test('should return false for zeroSuccesses when one hit', () => {
      const result = DamageProcessor.shouldApplyEffect('zeroSuccesses', true, false, 0);
      expect(result).toBe(false);
    });

    test('should return false for criticalSuccess when roll is null', () => {
      const result = DamageProcessor.shouldApplyEffect(
        'criticalSuccess',
        false,
        false,
        0,
        15,
        null,
        mockActor,
        '2d6'
      );
      expect(result).toBe(false);
    });

    test('should return false for criticalSuccess when actor is null', () => {
      const result = DamageProcessor.shouldApplyEffect(
        'criticalSuccess',
        false,
        false,
        0,
        15,
        mockRollResult,
        null,
        '2d6'
      );
      expect(result).toBe(false);
    });

    test('should return false for criticalSuccess when formula is null', () => {
      const result = DamageProcessor.shouldApplyEffect(
        'criticalSuccess',
        false,
        false,
        0,
        15,
        mockRollResult,
        mockActor,
        null
      );
      expect(result).toBe(false);
    });

    test('should return false for criticalFailure when roll is null', () => {
      const result = DamageProcessor.shouldApplyEffect(
        'criticalFailure',
        false,
        false,
        0,
        15,
        null,
        mockActor,
        '2d6'
      );
      expect(result).toBe(false);
    });

    test('should return false for criticalFailure when actor is null', () => {
      const result = DamageProcessor.shouldApplyEffect(
        'criticalFailure',
        false,
        false,
        0,
        15,
        mockRollResult,
        null,
        '2d6'
      );
      expect(result).toBe(false);
    });

    test('should return false for criticalFailure when formula is null', () => {
      const result = DamageProcessor.shouldApplyEffect(
        'criticalFailure',
        false,
        false,
        0,
        15,
        mockRollResult,
        mockActor,
        null
      );
      expect(result).toBe(false);
    });

    test('should evaluate criticalSuccess with valid parameters', () => {
      ERPSRollUtilities.determineCriticalStates = vi.fn(() => ({
        critHit: true,
        critMiss: false,
        stolenCrit: false,
        savedMiss: false
      }));

      const result = DamageProcessor.shouldApplyEffect(
        'criticalSuccess',
        false,
        false,
        0,
        15,
        mockRollResult,
        mockActor,
        '2d6'
      );

      expect(result).toBe(true);
      expect(ERPSRollUtilities.determineCriticalStates).toHaveBeenCalled();
    });

    test('should return false for criticalSuccess when stolenCrit is true', () => {
      ERPSRollUtilities.determineCriticalStates = vi.fn(() => ({
        critHit: true,
        critMiss: false,
        stolenCrit: true,
        savedMiss: false
      }));

      const result = DamageProcessor.shouldApplyEffect(
        'criticalSuccess',
        false,
        false,
        0,
        15,
        mockRollResult,
        mockActor,
        '2d6'
      );

      expect(result).toBe(false);
    });

    test('should evaluate criticalFailure with valid parameters', () => {
      ERPSRollUtilities.determineCriticalStates = vi.fn(() => ({
        critHit: false,
        critMiss: true,
        stolenCrit: false,
        savedMiss: false
      }));

      const result = DamageProcessor.shouldApplyEffect(
        'criticalFailure',
        false,
        false,
        0,
        15,
        mockRollResult,
        mockActor,
        '2d6'
      );

      expect(result).toBe(true);
    });

    test('should return false for criticalFailure when savedMiss is true', () => {
      ERPSRollUtilities.determineCriticalStates = vi.fn(() => ({
        critHit: false,
        critMiss: true,
        stolenCrit: false,
        savedMiss: true
      }));

      const result = DamageProcessor.shouldApplyEffect(
        'criticalFailure',
        false,
        false,
        0,
        15,
        mockRollResult,
        mockActor,
        '2d6'
      );

      expect(result).toBe(false);
    });
  });

  describe('resolveDamageForTarget()', () => {
    test('should apply vulnerability modifier when vuln is positive', async () => {
      mockActor.system.hiddenAbilities.vuln.total = 25;

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
      expect(result[0].roll).toEqual(mockDamageRoll);
    });

    test('should apply vulnerability to saved damage', async () => {
      mockActor.system.hiddenAbilities.vuln.total = 25;

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
      expect(result[0].roll).toEqual(mockDamageRoll);
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
      expect(result[0].roll).toEqual(mockDamageRoll);
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
      mockActor.system.hiddenAbilities.vuln.total = 10;
      const result = DamageProcessor.applyVulnerabilityModifier('2d6', 'physical', mockActor);
      expect(result).toBe('2d6 + 10');
    });

    test('should not modify formula for healing damage', () => {
      mockActor.system.hiddenAbilities.vuln.total = 10;
      const result = DamageProcessor.applyVulnerabilityModifier('2d6', 'heal', mockActor);
      expect(result).toBe('2d6');
    });

    test('should not modify formula when vulnerability is zero', () => {
      mockActor.system.hiddenAbilities.vuln.total = 0;
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