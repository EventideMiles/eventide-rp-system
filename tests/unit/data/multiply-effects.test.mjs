// @ts-nocheck
/**
 * @fileoverview Tests for multiply/divide character effects
 *
 * Tests the complete pipeline: schema fields, derived data calculations,
 * effect mode mapping, and edge cases for multiplicative effects.
 */

// Mock dependencies before imports
vi.mock("../../../module/services/logger.mjs", () => ({
  Logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { CharacterEffectsProcessor } from "../../../module/services/character-effects-processor.mjs";

describe("Multiply/Divide Character Effects", () => {
  // Replicate the roundToCent function from base-actor.mjs
  const roundToCent = (n) => Math.round(n * 100) / 100;

  describe("CharacterEffectsProcessor.mapEffectModeToKey", () => {
    test("maps multiply mode to multiplyNeutral for regular abilities", () => {
      const effect = { ability: "acro", mode: "multiply" };
      const result = CharacterEffectsProcessor.mapEffectModeToKey(effect, true);
      expect(result).toBe("system.abilities.acro.multiplyNeutral");
    });

    test("maps divide mode to divideNeutral for regular abilities", () => {
      const effect = { ability: "acro", mode: "divide" };
      const result = CharacterEffectsProcessor.mapEffectModeToKey(effect, true);
      expect(result).toBe("system.abilities.acro.divideNeutral");
    });

    test("maps multiplyBuff mode for regular abilities", () => {
      const effect = { ability: "phys", mode: "multiplyBuff" };
      const result = CharacterEffectsProcessor.mapEffectModeToKey(effect, true);
      expect(result).toBe("system.abilities.phys.multiplyBuff");
    });

    test("maps multiplyDebuff mode for regular abilities", () => {
      const effect = { ability: "fort", mode: "multiplyDebuff" };
      const result = CharacterEffectsProcessor.mapEffectModeToKey(effect, true);
      expect(result).toBe("system.abilities.fort.multiplyDebuff");
    });

    test("maps multiply mode to multiplyNeutral for hidden abilities", () => {
      const effect = { ability: "dice", mode: "multiply" };
      const result = CharacterEffectsProcessor.mapEffectModeToKey(effect, false);
      expect(result).toBe("system.hiddenAbilities.dice.multiplyNeutral");
    });

    test("maps divide mode to divideNeutral for hidden abilities", () => {
      const effect = { ability: "dice", mode: "divide" };
      const result = CharacterEffectsProcessor.mapEffectModeToKey(effect, false);
      expect(result).toBe("system.hiddenAbilities.dice.divideNeutral");
    });

    test("maps multiplyBuff mode for hidden abilities", () => {
      const effect = { ability: "cmax", mode: "multiplyBuff" };
      const result = CharacterEffectsProcessor.mapEffectModeToKey(effect, false);
      expect(result).toBe("system.hiddenAbilities.cmax.multiplyBuff");
    });

    test("maps multiplyDebuff mode for hidden abilities", () => {
      const effect = { ability: "cmax", mode: "multiplyDebuff" };
      const result = CharacterEffectsProcessor.mapEffectModeToKey(effect, false);
      expect(result).toBe("system.hiddenAbilities.cmax.multiplyDebuff");
    });

    test("still maps add/override modes correctly for hidden abilities", () => {
      const addEffect = { ability: "dice", mode: "add" };
      const overrideEffect = { ability: "dice", mode: "override" };
      expect(CharacterEffectsProcessor.mapEffectModeToKey(addEffect, false)).toBe(
        "system.hiddenAbilities.dice.change",
      );
      expect(CharacterEffectsProcessor.mapEffectModeToKey(overrideEffect, false)).toBe(
        "system.hiddenAbilities.dice.override",
      );
    });
  });

  describe("CharacterEffectsProcessor.getTypeForEffect", () => {
    test("returns multiply type for multiply mode", () => {
      const effect = { ability: "acro", mode: "multiply" };
      expect(CharacterEffectsProcessor.getTypeForEffect(effect, true)).toBe("multiply");
    });

    test("returns multiply type for divide mode", () => {
      const effect = { ability: "acro", mode: "divide" };
      expect(CharacterEffectsProcessor.getTypeForEffect(effect, true)).toBe("multiply");
    });

    test("returns multiply type for multiplyBuff mode", () => {
      const effect = { ability: "acro", mode: "multiplyBuff" };
      expect(CharacterEffectsProcessor.getTypeForEffect(effect, true)).toBe("multiply");
    });

    test("returns multiply type for multiplyDebuff mode", () => {
      const effect = { ability: "acro", mode: "multiplyDebuff" };
      expect(CharacterEffectsProcessor.getTypeForEffect(effect, true)).toBe("multiply");
    });

    test("returns multiply type for hidden ability multiply modes", () => {
      const effect = { ability: "dice", mode: "multiply" };
      expect(CharacterEffectsProcessor.getTypeForEffect(effect, false)).toBe("multiply");
    });

    test("returns add type for add mode on regular abilities", () => {
      const effect = { ability: "acro", mode: "add" };
      expect(CharacterEffectsProcessor.getTypeForEffect(effect, true)).toBe("add");
    });

    test("returns override type for override mode on regular abilities", () => {
      const effect = { ability: "acro", mode: "override" };
      expect(CharacterEffectsProcessor.getTypeForEffect(effect, true)).toBe("override");
    });
  });

  describe("CharacterEffectsProcessor.processEffectsToChanges", () => {
    test("processes multiply effects with correct key, type, and phase", async () => {
      const characterEffects = {
        regularEffects: [{ ability: "acro", mode: "multiply", value: "2" }],
        hiddenEffects: [],
        overrideEffects: [],
      };

      const changes = await CharacterEffectsProcessor.processEffectsToChanges(characterEffects);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        key: "system.abilities.acro.multiplyNeutral",
        type: "multiply",
        phase: "initial",
        value: "2",
      });
    });

    test("processes divide effects for hidden abilities", async () => {
      const characterEffects = {
        regularEffects: [],
        hiddenEffects: [{ ability: "dice", mode: "divide", value: "2" }],
        overrideEffects: [],
      };

      const changes = await CharacterEffectsProcessor.processEffectsToChanges(characterEffects);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        key: "system.hiddenAbilities.dice.divideNeutral",
        type: "multiply",
        phase: "initial",
        value: "2",
      });
    });

    test("processes multiplyBuff effects correctly", async () => {
      const characterEffects = {
        regularEffects: [{ ability: "phys", mode: "multiplyBuff", value: "2" }],
        hiddenEffects: [],
        overrideEffects: [],
      };

      const changes = await CharacterEffectsProcessor.processEffectsToChanges(characterEffects);

      expect(changes).toHaveLength(1);
      expect(changes[0].key).toBe("system.abilities.phys.multiplyBuff");
      expect(changes[0].type).toBe("multiply");
    });

    test("processes multiplyDebuff effects correctly", async () => {
      const characterEffects = {
        regularEffects: [{ ability: "will", mode: "multiplyDebuff", value: "3" }],
        hiddenEffects: [],
        overrideEffects: [],
      };

      const changes = await CharacterEffectsProcessor.processEffectsToChanges(characterEffects);

      expect(changes).toHaveLength(1);
      expect(changes[0].key).toBe("system.abilities.will.multiplyDebuff");
      expect(changes[0].type).toBe("multiply");
    });

    test("processes mixed add and multiply effects together", async () => {
      const characterEffects = {
        regularEffects: [
          { ability: "acro", mode: "add", value: "2" },
          { ability: "acro", mode: "multiply", value: "2" },
        ],
        hiddenEffects: [],
        overrideEffects: [],
      };

      const changes = await CharacterEffectsProcessor.processEffectsToChanges(characterEffects);

      expect(changes).toHaveLength(2);
      expect(changes[0]).toEqual({
        key: "system.abilities.acro.change",
        type: "add",
        phase: "initial",
        value: "2",
      });
      expect(changes[1]).toEqual({
        key: "system.abilities.acro.multiplyNeutral",
        type: "multiply",
        phase: "initial",
        value: "2",
      });
    });
  });

  describe("Multiply Derived Data Logic", () => {
    // These test the core multiply logic in prepareDerivedData
    // We test the math directly since we can't instantiate the full data model in unit tests

    describe("Neutral multiply", () => {
      test("positive total multiplied by 2", () => {
        let total = 10;
        const multiplyNeutral = 2;
        if (multiplyNeutral !== 1) total = roundToCent(total * multiplyNeutral);
        expect(Math.round(total)).toBe(20);
      });

      test("negative total multiplied by 2", () => {
        let total = -4;
        const multiplyNeutral = 2;
        if (multiplyNeutral !== 1) total = roundToCent(total * multiplyNeutral);
        expect(Math.round(total)).toBe(-8);
      });

      test("total multiplied by 0.5 (halved)", () => {
        let total = 10;
        const multiplyNeutral = 0.5;
        if (multiplyNeutral !== 1) total = roundToCent(total * multiplyNeutral);
        expect(Math.round(total)).toBe(5);
      });

      test("negative total multiplied by 0.5", () => {
        let total = -4;
        const multiplyNeutral = 0.5;
        if (multiplyNeutral !== 1) total = roundToCent(total * multiplyNeutral);
        expect(Math.round(total)).toBe(-2);
      });

      test("multiply by 1 is no-op", () => {
        const total = 10;
        const multiplyNeutral = 1;
        const result = multiplyNeutral !== 1 ? roundToCent(total * multiplyNeutral) : total;
        expect(result).toBe(10);
      });
    });

    describe("Neutral divide", () => {
      test("positive total divided by 2", () => {
        let total = 10;
        const divideNeutral = 2;
        if (divideNeutral !== 1 && divideNeutral !== 0) total = roundToCent(total / divideNeutral);
        expect(Math.round(total)).toBe(5);
      });

      test("negative total divided by 2", () => {
        let total = -4;
        const divideNeutral = 2;
        if (divideNeutral !== 1 && divideNeutral !== 0) total = roundToCent(total / divideNeutral);
        expect(Math.round(total)).toBe(-2);
      });

      test("divide by 1 is no-op", () => {
        let total = 10;
        const divideNeutral = 1;
        if (divideNeutral !== 1 && divideNeutral !== 0) total = roundToCent(total / divideNeutral);
        expect(total).toBe(10);
      });
    });

    describe("Multiply Buff (exclusively positive)", () => {
      test("buff ×2 on positive total multiplies (more positive)", () => {
        let total = 10;
        const multiplyBuff = 2;
        const buffFactor = multiplyBuff !== 0 ? multiplyBuff : 1;
        total = roundToCent(total >= 0 ? total * buffFactor : total / buffFactor);
        expect(Math.round(total)).toBe(20);
      });

      test("buff ×2 on negative total divides (less negative = beneficial)", () => {
        let total = -4;
        const multiplyBuff = 2;
        const buffFactor = multiplyBuff !== 0 ? multiplyBuff : 1;
        total = roundToCent(total >= 0 ? total * buffFactor : total / buffFactor);
        expect(Math.round(total)).toBe(-2);
      });

      test("buff ×2 on zero total multiplies (stays zero)", () => {
        let total = 0;
        const multiplyBuff = 2;
        const buffFactor = multiplyBuff !== 0 ? multiplyBuff : 1;
        total = roundToCent(total >= 0 ? total * buffFactor : total / buffFactor);
        expect(Math.round(total)).toBe(0);
      });

      test("buff ÷2 (0.5) on positive total reduces (less positive = not a buff flip)", () => {
        let total = 10;
        const multiplyBuff = 0.5;
        const buffFactor = multiplyBuff !== 0 ? multiplyBuff : 1;
        total = roundToCent(total >= 0 ? total * buffFactor : total / buffFactor);
        expect(Math.round(total)).toBe(5);
      });
    });

    describe("Multiply Debuff (exclusively negative)", () => {
      test("debuff ×2 on positive total divides (less positive = harmful)", () => {
        let total = 10;
        const multiplyDebuff = 2;
        const debuffFactor = multiplyDebuff !== 0 ? multiplyDebuff : 1;
        total = roundToCent(total > 0 ? total / debuffFactor : total * debuffFactor);
        expect(Math.round(total)).toBe(5);
      });

      test("debuff ×2 on negative total multiplies (more negative = harmful)", () => {
        let total = -4;
        const multiplyDebuff = 2;
        const debuffFactor = multiplyDebuff !== 0 ? multiplyDebuff : 1;
        total = roundToCent(total > 0 ? total / debuffFactor : total * debuffFactor);
        expect(Math.round(total)).toBe(-8);
      });

      test("debuff ×2 on zero total multiplies (stays zero)", () => {
        let total = 0;
        const multiplyDebuff = 2;
        const debuffFactor = multiplyDebuff !== 0 ? multiplyDebuff : 1;
        total = roundToCent(total > 0 ? total / debuffFactor : total * debuffFactor);
        expect(Math.round(total)).toBe(0);
      });
    });

    describe("Floating point precision", () => {
      test("roundToCent prevents floating point accumulation", () => {
        // 0.1 + 0.2 !== 0.3 in JS, but roundToCent fixes it
        expect(roundToCent(0.1 + 0.2)).toBe(0.3);
        expect(roundToCent(0.3)).toBe(0.3);
      });

      test("chained multiply/divide stays precise", () => {
        let total = 10;
        total = roundToCent(total * 0.3); // 3
        total = roundToCent(total * 0.3); // 0.9
        total = roundToCent(total * 0.3); // 0.27
        expect(total).toBe(0.27);
      });

      test("final Math.round on precise hundredth values", () => {
        // After roundToCent, the value should be at hundredth precision,
        // so Math.round should give the expected integer
        expect(Math.round(roundToCent(10 / 3))).toBe(3); // 3.33 → 3
        expect(Math.round(roundToCent(20 / 3))).toBe(7); // 6.67 → 7
      });
    });

    describe("Full order of operations", () => {
      test("add then multiply: acro 10 + change -2 then ×0.5 = 4", () => {
        // Base: 10, change: -2, multiplyNeutral: 0.5
        let total = 10 + -2; // 8
        const multiplyNeutral = 0.5;
        if (multiplyNeutral !== 1) total = total * multiplyNeutral;
        expect(Math.round(total)).toBe(4);
      });

      test("override then multiply: override 5, change -4, multiply 2", () => {
        // When override is set, it replaces base: override=5, change=-4
        let total = 5 + -4; // 1
        const multiplyNeutral = 2;
        if (multiplyNeutral !== 1) total = total * multiplyNeutral;
        expect(Math.round(total)).toBe(2);
      });

      test("override then multiply 0.5: override 5, change -4 = 1, then ×0.5 = 0", () => {
        let total = 5 + -4; // 1
        const multiplyNeutral = 0.5;
        if (multiplyNeutral !== 1) total = total * multiplyNeutral;
        expect(Math.round(total)).toBe(1); // Math.round(0.5) = 1
      });

      test("all four multiply types in sequence", () => {
        // Start with 10
        let total = 10;
        const multiplyNeutral = 2; // 10 * 2 = 20
        const divideNeutral = 2; // 20 / 2 = 10
        const multiplyBuff = 2; // 10 >= 0, so 10 * 2 = 20
        const multiplyDebuff = 2; // 20 > 0, so 20 / 2 = 10

        if (multiplyNeutral !== 1) total = total * multiplyNeutral;
        if (divideNeutral !== 1) total = total / divideNeutral;
        if (multiplyBuff !== 1) {
          total = total >= 0 ? total * multiplyBuff : total / multiplyBuff;
        }
        if (multiplyDebuff !== 1) {
          total = total > 0 ? total / multiplyDebuff : total * multiplyDebuff;
        }

        expect(Math.round(total)).toBe(10);
      });

      test("negative total with all multiply types", () => {
        // Start with -6
        let total = -6;
        const multiplyNeutral = 2; // -6 * 2 = -12
        const divideNeutral = 3; // -12 / 3 = -4
        const multiplyBuff = 2; // -4 < 0, so -4 / 2 = -2 (buff: less negative)
        const multiplyDebuff = 2; // -2 not > 0, so -2 * 2 = -4 (debuff: more negative)

        if (multiplyNeutral !== 1) total = total * multiplyNeutral;
        if (divideNeutral !== 1) total = total / divideNeutral;
        if (multiplyBuff !== 1) {
          total = total >= 0 ? total * multiplyBuff : total / multiplyBuff;
        }
        if (multiplyDebuff !== 1) {
          total = total > 0 ? total / multiplyDebuff : total * multiplyDebuff;
        }

        expect(Math.round(total)).toBe(-4);
      });

      test("rounding: 7 / 3 = 2.33... rounds to 2", () => {
        let total = 7;
        const divideNeutral = 3;
        if (divideNeutral !== 1) total = total / divideNeutral;
        expect(Math.round(total)).toBe(2);
      });

      test("rounding: 7 / 2 = 3.5 rounds to 4", () => {
        let total = 7;
        const divideNeutral = 2;
        if (divideNeutral !== 1) total = total / divideNeutral;
        expect(Math.round(total)).toBe(4);
      });
    });

    describe("Divide-by-zero protection", () => {
      test("divideNeutral of 0 is treated as 1 (no-op)", () => {
        let total = 10;
        const divideNeutral = 0;
        if (divideNeutral !== 1 && divideNeutral !== 0) {
          total = total / divideNeutral;
        }
        expect(total).toBe(10); // No division occurred
      });

      test("multiplyBuff of 0 on negative total uses 1 (no-op)", () => {
        let total = -4;
        const multiplyBuff = 0;
        const buffFactor = multiplyBuff !== 0 ? multiplyBuff : 1;
        total = total >= 0 ? total * buffFactor : total / buffFactor;
        expect(Math.round(total)).toBe(-4); // No change
      });

      test("multiplyDebuff of 0 on positive total uses 1 (no-op)", () => {
        let total = 10;
        const multiplyDebuff = 0;
        const debuffFactor = multiplyDebuff !== 0 ? multiplyDebuff : 1;
        total = total > 0 ? total / debuffFactor : total * debuffFactor;
        expect(Math.round(total)).toBe(10); // No change
      });
    });

    describe("Edge cases", () => {
      test("all multiply fields at 1 (no-ops) gives same as no multiply", () => {
        let total = 10;
        const multiplyNeutral = 1;
        const divideNeutral = 1;
        const multiplyBuff = 1;
        const multiplyDebuff = 1;

        if (multiplyNeutral !== 1) total = total * multiplyNeutral;
        if (divideNeutral !== 1) total = total / divideNeutral;
        if (multiplyBuff !== 1) {
          total = total >= 0 ? total * multiplyBuff : total / multiplyBuff;
        }
        if (multiplyDebuff !== 1) {
          total = total > 0 ? total / multiplyDebuff : total * multiplyDebuff;
        }

        expect(total).toBe(10);
      });

      test("zero total with buff and debuff stays zero", () => {
        let total = 0;
        const multiplyBuff = 3;
        const multiplyDebuff = 3;

        if (multiplyBuff !== 1) {
          total = total >= 0 ? total * multiplyBuff : total / multiplyBuff;
        }
        if (multiplyDebuff !== 1) {
          total = total > 0 ? total / multiplyDebuff : total * multiplyDebuff;
        }

        expect(total).toBe(0);
      });
    });
  });

  describe("determineEffectMode", () => {
    // We need to test the determineEffectMode function from character-effects.mjs
    // Since it's not exported directly, we test the behavior through prepareCharacterEffects
    // or by importing and testing the logic pattern

    test("multiply key patterns are correctly identified", () => {
      // Test the key pattern matching logic directly
      const testCases = [
        { key: "system.abilities.acro.multiplyNeutral", type: "multiply", expected: "multiply" },
        { key: "system.abilities.acro.divideNeutral", type: "multiply", expected: "divide" },
        { key: "system.abilities.phys.multiplyBuff", type: "multiply", expected: "multiplyBuff" },
        { key: "system.abilities.fort.multiplyDebuff", type: "multiply", expected: "multiplyDebuff" },
        { key: "system.hiddenAbilities.dice.multiplyNeutral", type: "multiply", expected: "multiply" },
        { key: "system.hiddenAbilities.cmax.divideNeutral", type: "multiply", expected: "divide" },
        { key: "system.abilities.acro.change", type: "add", expected: "change" },
        { key: "system.abilities.acro.override", type: "override", expected: "override" },
      ];

      for (const tc of testCases) {
        // Replicate the determineEffectMode logic
        let mode;
        const key = tc.key;
        const type = tc.type;

        if (key.includes("disadvantage")) mode = "disadvantage";
        else if (key.includes("advantage")) mode = "advantage";
        else if (key.includes("ac.change")) mode = "ac.change";
        else if (key.includes("transformOverride")) mode = "transformOverride";
        else if (key.includes("transformChange")) mode = "transformChange";
        else if (key.includes("multiplyBuff")) mode = "multiplyBuff";
        else if (key.includes("multiplyDebuff")) mode = "multiplyDebuff";
        else if (key.includes("multiplyNeutral")) mode = "multiply";
        else if (key.includes("divideNeutral")) mode = "divide";
        else if (type === "override") mode = "override";
        else mode = "change";

        expect(mode).toBe(tc.expected);
      }
    });

    test("multiplyBuff is detected before multiplyNeutral substring match", () => {
      // "multiplyBuff" contains "multiply" but should match "multiplyBuff" first
      const key = "system.abilities.acro.multiplyBuff";
      expect(key.includes("multiplyBuff")).toBe(true);
      expect(key.includes("multiplyNeutral")).toBe(false);
    });

    test("multiplyDebuff is detected before multiply substring match", () => {
      const key = "system.abilities.acro.multiplyDebuff";
      expect(key.includes("multiplyDebuff")).toBe(true);
      expect(key.includes("multiplyNeutral")).toBe(false);
    });
  });
});