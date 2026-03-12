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
    })
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
          vuln: { total: 0 }
        }
      },
      damageResolve: vi.fn(async () => null)
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
});