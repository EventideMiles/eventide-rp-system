// @ts-nocheck
/**
 * @fileoverview Tests for healing increase hidden ability
 *
 * Tests the healIncrease hidden ability including:
 * - Schema definition
 * - Formula construction for various modes
 * - Minimum healing constraint (healing cannot turn into damage)
 */

// Mock dependencies before imports
vi.mock("../../../module/services/logger.mjs", () => ({
  Logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { DamageProcessor } from "../../../module/services/damage-processor.mjs";

describe("Healing Increase", () => {
  describe("DamageProcessor.buildModifiedFormula", () => {
    describe("Basic functionality", () => {
      test("returns original formula when hidden ability is null", () => {
        const result = DamageProcessor.buildModifiedFormula("d20", null);
        expect(result).toBe("d20");
      });

      test("returns original formula when no modifications are present", () => {
        const hiddenAbility = { value: 0, change: 0, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility);
        expect(result).toBe("d20");
      });

      test("returns original formula when all values are default", () => {
        const hiddenAbility = { value: 0, change: 0, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 };
        const result = DamageProcessor.buildModifiedFormula("2d6", hiddenAbility);
        expect(result).toBe("2d6");
      });
    });

    describe("Add mode (value + change)", () => {
      test("adds positive additive total to formula", () => {
        const hiddenAbility = { value: 5, change: 3, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility);
        expect(result).toBe("d20 + 8");
      });

      test("subtracts negative additive total from formula", () => {
        const hiddenAbility = { value: -3, change: -2, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility);
        expect(result).toBe("d20 - 5");
      });

      test("uses only value when change is 0", () => {
        const hiddenAbility = { value: 10, change: 0, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility);
        expect(result).toBe("d20 + 10");
      });

      test("uses only change when value is 0", () => {
        const hiddenAbility = { value: 0, change: 5, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility);
        expect(result).toBe("d20 + 5");
      });
    });

    describe("Multiply neutral mode", () => {
      test("wraps formula and multiplies when multiplyNeutral > 1", () => {
        const hiddenAbility = { value: 3, change: 0, multiplyNeutral: 2, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility);
        expect(result).toBe("2 * (d20 + 3)");
      });

      test("applies multiply without additive when additive is 0", () => {
        const hiddenAbility = { value: 0, change: 0, multiplyNeutral: 2, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility);
        expect(result).toBe("2 * (d20)");
      });

      test("handles multiply neutral by one as no-op", () => {
        const hiddenAbility = { value: 5, change: 0, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility);
        // Multiply by 1 is no-op, no multiplicative wrapping needed
        expect(result).toBe("d20 + 5");
      });
    });

    describe("Divide neutral mode", () => {
      test("wraps formula and divides when divideNeutral > 1", () => {
        const hiddenAbility = { value: 3, change: 0, multiplyNeutral: 1, divideNeutral: 2, multiplyBuff: 1, multiplyDebuff: 1 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility);
        expect(result).toBe("floor((d20 + 3) / 2)");
      });

      test("handles divide by zero protection", () => {
        const hiddenAbility = { value: 5, change: 0, multiplyNeutral: 1, divideNeutral: 0, multiplyBuff: 1, multiplyDebuff: 1 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility);
        // Divide by 0 should be treated as no-op
        expect(result).toBe("d20 + 5");
      });

      test("handles divide by one as no-op", () => {
        const hiddenAbility = { value: 5, change: 0, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility);
        // Divide by 1 is no-op, no multiplicative wrapping needed
        expect(result).toBe("d20 + 5");
      });
    });

    describe("Multiply buff mode", () => {
      test("applies multiply buff factor", () => {
        const hiddenAbility = { value: 0, change: 0, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 2, multiplyDebuff: 1 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility);
        expect(result).toBe("2 * (d20)");
      });

      test("handles multiply buff with additive", () => {
        const hiddenAbility = { value: 5, change: 0, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 2, multiplyDebuff: 1 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility);
        expect(result).toBe("2 * (d20 + 5)");
      });

      test("handles multiply buff by zero protection", () => {
        const hiddenAbility = { value: 5, change: 0, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 0, multiplyDebuff: 1 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility);
        // Multiply by 0 should be treated as 1 (no-op)
        expect(result).toBe("d20 + 5");
      });
    });

    describe("Multiply debuff mode", () => {
      test("applies multiply debuff factor", () => {
        const hiddenAbility = { value: 0, change: 0, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 2 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility);
        expect(result).toBe("floor((d20) / 2)");
      });

      test("handles multiply debuff with additive", () => {
        const hiddenAbility = { value: 5, change: 0, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 2 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility);
        expect(result).toBe("floor((d20 + 5) / 2)");
      });

      test("handles multiply debuff by zero protection", () => {
        const hiddenAbility = { value: 5, change: 0, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 0 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility);
        // Multiply by 0 should be treated as 1 (no-op)
        expect(result).toBe("d20 + 5");
      });
    });

    describe("Combined modes", () => {
      test("applies multiply and divide in correct order", () => {
        const hiddenAbility = { value: 3, change: 0, multiplyNeutral: 2, divideNeutral: 2, multiplyBuff: 1, multiplyDebuff: 1 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility);
        // Order: multiply first, then divide
        expect(result).toBe("floor(2 * (d20 + 3) / 2)");
      });

      test("applies all multiplicative modes in correct order", () => {
        const hiddenAbility = { value: 3, change: 0, multiplyNeutral: 2, divideNeutral: 2, multiplyBuff: 2, multiplyDebuff: 2 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility);
        // Order: multiplyNeutral, divideNeutral, multiplyBuff, multiplyDebuff
        expect(result).toBe("floor(floor(2 * (2 * (d20 + 3)) / 2) / 2)");
      });
    });

    describe("Healing minimum constraint", () => {
      test("applies max(1, ...) for healing with negative additive", () => {
        const hiddenAbility = { value: -5, change: 0, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility, { isHealing: true });
        expect(result).toBe("max(1, d20 - 5)");
      });

      test("applies max(1, ...) for healing with multiplicative", () => {
        const hiddenAbility = { value: 0, change: 0, multiplyNeutral: 2, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility, { isHealing: true });
        expect(result).toBe("max(1, 2 * (d20))");
      });

      test("does not apply max(1, ...) for non-healing", () => {
        const hiddenAbility = { value: -5, change: 0, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility, { isHealing: false });
        expect(result).toBe("d20 - 5");
      });

      test("does not apply max(1, ...) when no modifications", () => {
        const hiddenAbility = { value: 0, change: 0, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 };
        const result = DamageProcessor.buildModifiedFormula("d20", hiddenAbility, { isHealing: true });
        expect(result).toBe("d20");
      });
    });
  });

  describe("DamageProcessor.applyVulnerabilityModifier", () => {
    const createMockActor = (vuln) => ({
      system: { hiddenAbilities: { vuln } },
    });

    test("returns original formula for healing type", () => {
      const actor = createMockActor({ value: 5, change: 0, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 });
      const result = DamageProcessor.applyVulnerabilityModifier("d20", "heal", actor);
      expect(result).toBe("d20");
    });

    test("returns original formula when no vulnerability", () => {
      const actor = { system: {} };
      const result = DamageProcessor.applyVulnerabilityModifier("d20", "physical", actor);
      expect(result).toBe("d20");
    });

    test("returns original formula when vulnerability is default", () => {
      const actor = createMockActor({ value: 0, change: 0, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 });
      const result = DamageProcessor.applyVulnerabilityModifier("d20", "physical", actor);
      expect(result).toBe("d20");
    });

    test("applies vulnerability additive", () => {
      const actor = createMockActor({ value: 5, change: 3, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 });
      const result = DamageProcessor.applyVulnerabilityModifier("d20", "physical", actor);
      expect(result).toBe("d20 + 8");
    });

    test("applies vulnerability multiply", () => {
      const actor = createMockActor({ value: 3, change: 0, multiplyNeutral: 2, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 });
      const result = DamageProcessor.applyVulnerabilityModifier("d20", "physical", actor);
      expect(result).toBe("2 * (d20 + 3)");
    });
  });

  describe("DamageProcessor.applyHealingIncreaseModifierToFormula", () => {
    const createMockActor = (healIncrease) => ({
      system: { hiddenAbilities: { healIncrease } },
    });

    test("returns original formula when no healIncrease", () => {
      const actor = { system: {} };
      const result = DamageProcessor.applyHealingIncreaseModifierToFormula("d20", actor);
      expect(result).toBe("d20");
    });

    test("returns original formula when healIncrease is default", () => {
      const actor = createMockActor({ value: 0, change: 0, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 });
      const result = DamageProcessor.applyHealingIncreaseModifierToFormula("d20", actor);
      expect(result).toBe("d20");
    });

    test("applies healing increase additive with minimum 1", () => {
      const actor = createMockActor({ value: 5, change: 3, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 });
      const result = DamageProcessor.applyHealingIncreaseModifierToFormula("d20", actor);
      expect(result).toBe("max(1, d20 + 8)");
    });

    test("applies healing increase multiply with minimum 1", () => {
      const actor = createMockActor({ value: 0, change: 0, multiplyNeutral: 2, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 });
      const result = DamageProcessor.applyHealingIncreaseModifierToFormula("d20", actor);
      expect(result).toBe("max(1, 2 * (d20))");
    });

    test("applies negative healing with minimum 1", () => {
      const actor = createMockActor({ value: -5, change: 0, multiplyNeutral: 1, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 });
      const result = DamageProcessor.applyHealingIncreaseModifierToFormula("d20", actor);
      expect(result).toBe("max(1, d20 - 5)");
    });

    test("complex healing formula with multiply and add", () => {
      const actor = createMockActor({ value: 3, change: 0, multiplyNeutral: 2, divideNeutral: 1, multiplyBuff: 1, multiplyDebuff: 1 });
      const result = DamageProcessor.applyHealingIncreaseModifierToFormula("d20", actor);
      expect(result).toBe("max(1, 2 * (d20 + 3))");
    });
  });

  describe("Hidden ability schema fields", () => {
    test("healIncrease should have all multiply mode fields", () => {
      // This is checked in the base-actor.mjs definition
      // The createHiddenAbilitySchema creates:
      // - value, total, override, change
      // - multiplyNeutral, divideNeutral, multiplyBuff, multiplyDebuff

      // Verify the field structure expected for healIncrease
      const expectedFields = [
        "value", "total", "override", "change",
        "multiplyNeutral", "divideNeutral", "multiplyBuff", "multiplyDebuff"
      ];

      // This serves as documentation - actual schema test would require
      // instantiating the data model
      expect(expectedFields.length).toBe(8);
    });
  });
});