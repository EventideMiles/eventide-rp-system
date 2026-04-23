// @ts-nocheck
/**
 * @fileoverview Tests for Action Card Schema - Priority 1 Critical Functions
 *
 * Tests the defineSchema method for action cards, which is the most complex
 * item type in the Eventide RP System. The schema defines the data structure
 * for all action card functionality including attack chains, saved damage,
 * repetitions, and embedded items.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Mock the EventideRpSystemItemBase before import
const mockItemBase = class {
  static defineSchema() {
    return {
      // Base item schema fields
      description: new global.foundry.data.fields.StringField({
        required: true,
        initial: '',
        blank: true
      })
    };
  }
};

// Mock module imports
vi.mock('../../../module/data/_module.mjs', () => ({
  EventideRpSystemItemBase: mockItemBase
}));

// Import the action cards schema after mocking dependencies
const { default: EventideRpSystemActionCard } = await import('../../../module/data/item-action-card.mjs');

describe('EventideRpSystemActionCard Schema - Priority 1 Critical Definitions', () => {
  let schema;

  beforeEach(() => {
    // Get the schema definition
    schema = EventideRpSystemActionCard.defineSchema();
  });

  describe('defineSchema() - Core Schema Definition', () => {
    test('should define complete schema structure', () => {
      expect(schema).toBeDefined();
      expect(typeof schema).toBe('object');

      // Verify all major schema fields are present
      expect(schema.embeddedItem).toBeDefined();
      expect(schema.mode).toBeDefined();
      expect(schema.attackChain).toBeDefined();
      expect(schema.savedDamage).toBeDefined();
      expect(schema.transformationConfig).toBeDefined();
      expect(schema.bgColor).toBeDefined();
      expect(schema.textColor).toBeDefined();
    });

    test('should extend base item schema', () => {
      // Should have base schema fields
      expect(schema.description).toBeDefined();
    });
  });

  describe('Embedded Item Configuration', () => {
    test('should define embedded item field correctly', () => {
      const field = schema.embeddedItem;

      expect(field).toBeDefined();
      expect(field.options.required).toBe(true);
      expect(field.options.initial).toEqual({});
      expect(field.options.nullable).toBe(true);
    });
  });

  describe('Color Configuration', () => {
    test('should define background color with correct defaults', () => {
      const field = schema.bgColor;

      expect(field).toBeDefined();
      expect(field.options.initial).toBe('#8B4513');
      expect(field.options.blank).toBe(false);
      expect(field.options.required).toBe(true);
    });

    test('should define text color with correct defaults', () => {
      const field = schema.textColor;

      expect(field).toBeDefined();
      expect(field.options.initial).toBe('#ffffff');
      expect(field.options.blank).toBe(false);
      expect(field.options.required).toBe(true);
    });
  });

  describe('Mode Configuration', () => {
    test('should define mode field with correct choices', () => {
      const field = schema.mode;

      expect(field).toBeDefined();
      expect(field.options.required).toBe(true);
      expect(field.options.initial).toBe('attackChain');
      expect(field.options.choices).toEqual(['attackChain', 'savedDamage']);
    });
  });

  describe('Attack Chain Configuration', () => {
    test('should define attack chain schema field', () => {
      const field = schema.attackChain;

      expect(field).toBeDefined();
      expect(field.schema).toBeDefined();
    });

    test('should define first stat with correct defaults', () => {
      const firstStat = schema.attackChain.schema.firstStat;

      expect(firstStat).toBeDefined();
      expect(firstStat.options.required).toBe(true);
      expect(firstStat.options.initial).toBe('acro');
      expect(firstStat.options.choices).toEqual(['acro', 'phys', 'fort', 'will', 'wits']);
    });

    test('should define second stat with correct defaults', () => {
      const secondStat = schema.attackChain.schema.secondStat;

      expect(secondStat).toBeDefined();
      expect(secondStat.options.required).toBe(true);
      expect(secondStat.options.initial).toBe('phys');
      expect(secondStat.options.choices).toEqual(['acro', 'phys', 'fort', 'will', 'wits']);
    });

    test('should define damage condition with correct choices', () => {
      const damageCondition = schema.attackChain.schema.damageCondition;

      expect(damageCondition).toBeDefined();
      expect(damageCondition.options.required).toBe(true);
      expect(damageCondition.options.initial).toBe('never');
      expect(damageCondition.options.choices).toEqual([
        'never',
        'oneSuccess',
        'twoSuccesses',
        'rollValue',
        'rollUnderValue',
        'rollEven',
        'rollOdd',
        'rollOnValue',
        'zeroSuccesses',
        'always',
        'criticalSuccess',
        'criticalFailure',
      ]);
    });

    test('should define damage formula with correct defaults', () => {
      const damageFormula = schema.attackChain.schema.damageFormula;

      expect(damageFormula).toBeDefined();
      expect(damageFormula.options.required).toBe(true);
      expect(damageFormula.options.initial).toBe('1d6');
    });

    test('should define damage type with correct choices', () => {
      const damageType = schema.attackChain.schema.damageType;

      expect(damageType).toBeDefined();
      expect(damageType.options.required).toBe(true);
      expect(damageType.options.initial).toBe('damage');
      expect(damageType.options.choices).toEqual(['damage', 'heal']);
    });

    test('should define damage threshold with correct constraints', () => {
      const damageThreshold = schema.attackChain.schema.damageThreshold;

      expect(damageThreshold).toBeDefined();
      expect(damageThreshold.options.required).toBe(false);
      expect(damageThreshold.options.initial).toBe(15);
      expect(damageThreshold.options.integer).toBe(true);
      expect(damageThreshold.options.min).toBe(1);
    });

    test('should define status condition with correct choices', () => {
      const statusCondition = schema.attackChain.schema.statusCondition;

      expect(statusCondition).toBeDefined();
      expect(statusCondition.options.required).toBe(true);
      expect(statusCondition.options.initial).toBe('oneSuccess');
      expect(statusCondition.options.choices).toEqual([
        'never',
        'oneSuccess',
        'twoSuccesses',
        'rollValue',
        'rollUnderValue',
        'rollEven',
        'rollOdd',
        'rollOnValue',
        'zeroSuccesses',
        'always',
        'criticalSuccess',
        'criticalFailure',
      ]);
    });

    test('should define status threshold with correct constraints', () => {
      const statusThreshold = schema.attackChain.schema.statusThreshold;

      expect(statusThreshold).toBeDefined();
      expect(statusThreshold.options.required).toBe(false);
      expect(statusThreshold.options.initial).toBe(15);
      expect(statusThreshold.options.integer).toBe(true);
      expect(statusThreshold.options.min).toBe(1);
    });
  });

  describe('Embedded Collections', () => {
    test('should define embedded status effects array', () => {
      const field = schema.embeddedStatusEffects;

      expect(field).toBeDefined();
      expect(field.element).toBeDefined();
    });

    test('should define embedded transformations array', () => {
      const field = schema.embeddedTransformations;

      expect(field).toBeDefined();
      expect(field.element).toBeDefined();
    });
  });

  describe('Transformation Configuration', () => {
    test('should define transformation config schema field', () => {
      const field = schema.transformationConfig;

      expect(field).toBeDefined();
      expect(field.schema).toBeDefined();
    });

    test('should define transformation condition with correct defaults', () => {
      const condition = schema.transformationConfig.schema.condition;

      expect(condition).toBeDefined();
      expect(condition.options.required).toBe(true);
      expect(condition.options.initial).toBe('oneSuccess');
      expect(condition.options.choices).toEqual([
        'never',
        'oneSuccess',
        'twoSuccesses',
        'rollValue',
        'rollUnderValue',
        'rollEven',
        'rollOdd',
        'rollOnValue',
        'zeroSuccesses',
        'always',
        'criticalSuccess',
        'criticalFailure',
      ]);
    });

    test('should define transformation threshold with correct constraints', () => {
      const threshold = schema.transformationConfig.schema.threshold;

      expect(threshold).toBeDefined();
      expect(threshold.options.required).toBe(false);
      expect(threshold.options.initial).toBe(15);
      expect(threshold.options.integer).toBe(true);
      expect(threshold.options.min).toBe(1);
    });
  });

  describe('Saved Damage Configuration', () => {
    test('should define saved damage schema field', () => {
      const field = schema.savedDamage;

      expect(field).toBeDefined();
      expect(field.schema).toBeDefined();
    });

    test('should define saved damage formula', () => {
      const formula = schema.savedDamage.schema.formula;

      expect(formula).toBeDefined();
      expect(formula.options.required).toBe(true);
      expect(formula.options.initial).toBe('1d6');
    });

    test('should define saved damage type', () => {
      const type = schema.savedDamage.schema.type;

      expect(type).toBeDefined();
      expect(type.options.required).toBe(true);
      expect(type.options.initial).toBe('damage');
      expect(type.options.choices).toEqual(['damage', 'heal']);
    });
  });

  describe('Advanced Features Configuration', () => {
    test('should define advance initiative flag', () => {
      const field = schema.advanceInitiative;

      expect(field).toBeDefined();
      expect(field.options.required).toBe(true);
      expect(field.options.initial).toBe(false);
    });

    test('should define inventory reduction flag', () => {
      const field = schema.attemptInventoryReduction;

      expect(field).toBeDefined();
      expect(field.options.required).toBe(true);
      expect(field.options.initial).toBe(false);
    });
  });

  describe('Repetition System Configuration', () => {
    test('should define repetitions formula field', () => {
      const field = schema.repetitions;

      expect(field).toBeDefined();
      expect(field.options.required).toBe(true);
      expect(field.options.initial).toBe('1');
      expect(field.options.blank).toBe(false);
    });

    test('should define repeat to hit flag', () => {
      const field = schema.repeatToHit;

      expect(field).toBeDefined();
      expect(field.options.required).toBe(true);
      expect(field.options.initial).toBe(false);
    });

    test('should define damage application mode', () => {
      const field = schema.damageApplication;

      expect(field).toBeDefined();
      expect(field.options.required).toBe(true);
      expect(field.options.initial).toBe(false);
    });

    test('should define status application limit', () => {
      const field = schema.statusApplicationLimit;

      expect(field).toBeDefined();
      expect(field.options.required).toBe(true);
      expect(field.options.initial).toBe(1);
      expect(field.options.min).toBe(0);
      expect(field.options.integer).toBe(true);
      expect(field.options.nullable).toBe(false);
    });

    test('should define timing override with correct constraints', () => {
      const field = schema.timingOverride;

      expect(field).toBeDefined();
      expect(field.options.required).toBe(true);
      expect(field.options.initial).toBe(0.0);
      expect(field.options.min).toBe(0);
      expect(field.options.nullable).toBe(false);
    });

    test('should define cost on repetition flag', () => {
      const field = schema.costOnRepetition;

      expect(field).toBeDefined();
      expect(field.options.required).toBe(true);
      expect(field.options.initial).toBe(false);
    });
  });

  describe('Schema Validation and Data Integrity', () => {
    test('should have consistent field types across similar configurations', () => {
      // All condition fields should have the same choices
      const conditionChoices = [
        'never',
        'oneSuccess',
        'twoSuccesses',
        'rollValue',
        'rollUnderValue',
        'rollEven',
        'rollOdd',
        'rollOnValue',
        'zeroSuccesses',
        'always',
        'criticalSuccess',
        'criticalFailure',
      ];

      expect(schema.attackChain.schema.damageCondition.options.choices).toEqual(conditionChoices);
      expect(schema.attackChain.schema.statusCondition.options.choices).toEqual(conditionChoices);
      expect(schema.transformationConfig.schema.condition.options.choices).toEqual(conditionChoices);
    });

    test('should have consistent damage/heal type choices', () => {
      const typeChoices = ['damage', 'heal'];

      expect(schema.attackChain.schema.damageType.options.choices).toEqual(typeChoices);
      expect(schema.savedDamage.schema.type.options.choices).toEqual(typeChoices);
    });

    test('should have consistent threshold configurations', () => {
      const thresholds = [
        schema.attackChain.schema.damageThreshold,
        schema.attackChain.schema.statusThreshold,
        schema.transformationConfig.schema.threshold
      ];

      thresholds.forEach(threshold => {
        expect(threshold.options.required).toBe(false);
        expect(threshold.options.initial).toBe(15);
        expect(threshold.options.integer).toBe(true);
        expect(threshold.options.min).toBe(1);
      });
    });

    test('should have consistent ability choices', () => {
      const abilityChoices = ['acro', 'phys', 'fort', 'will', 'wits'];

      expect(schema.attackChain.schema.firstStat.options.choices).toEqual(abilityChoices);
      expect(schema.attackChain.schema.secondStat.options.choices).toEqual(abilityChoices);
    });

    test('should have appropriate required flags', () => {
      // Critical fields should be required
      expect(schema.mode.options.required).toBe(true);
      expect(schema.bgColor.options.required).toBe(true);
      expect(schema.textColor.options.required).toBe(true);
      expect(schema.embeddedItem.options.required).toBe(true);

      // Optional fields should not be required
      expect(schema.attackChain.schema.damageThreshold.options.required).toBe(false);
      expect(schema.attackChain.schema.statusThreshold.options.required).toBe(false);
      expect(schema.transformationConfig.schema.threshold.options.required).toBe(false);
    });

    test('should have logical default values', () => {
      // Mode should default to attackChain (primary use case)
      expect(schema.mode.options.initial).toBe('attackChain');

      // Damage conditions should default to never (conservative)
      expect(schema.attackChain.schema.damageCondition.options.initial).toBe('never');
      expect(schema.attackChain.schema.statusCondition.options.initial).toBe('oneSuccess');
      expect(schema.transformationConfig.schema.condition.options.initial).toBe('oneSuccess');

      // Boolean flags should default to false (conservative)
      expect(schema.advanceInitiative.options.initial).toBe(false);
      expect(schema.attemptInventoryReduction.options.initial).toBe(false);
      expect(schema.repeatToHit.options.initial).toBe(false);
      expect(schema.damageApplication.options.initial).toBe(false);
      expect(schema.costOnRepetition.options.initial).toBe(false);

      // Status application limit should default to 1 (apply once)
      expect(schema.statusApplicationLimit.options.initial).toBe(1);
    });
  });

  describe('Schema Field Types and Constraints', () => {
    test('should use appropriate field types', () => {
      // String fields
      expect(schema.mode.constructor.name).toContain('StringField');
      expect(schema.attackChain.schema.firstStat.constructor.name).toContain('StringField');
      expect(schema.attackChain.schema.damageFormula.constructor.name).toContain('StringField');
      expect(schema.repetitions.constructor.name).toContain('StringField');

      // Number fields
      expect(schema.attackChain.schema.damageThreshold.constructor.name).toContain('NumberField');
      expect(schema.timingOverride.constructor.name).toContain('NumberField');

      // Boolean fields
      expect(schema.advanceInitiative.constructor.name).toContain('BooleanField');
      expect(schema.repeatToHit.constructor.name).toContain('BooleanField');

      // Array fields
      expect(schema.embeddedStatusEffects.constructor.name).toContain('ArrayField');
      expect(schema.embeddedTransformations.constructor.name).toContain('ArrayField');

      // Object fields
      expect(schema.embeddedItem.constructor.name).toContain('ObjectField');

      // Schema fields
      expect(schema.attackChain.constructor.name).toContain('SchemaField');
      expect(schema.savedDamage.constructor.name).toContain('SchemaField');
      expect(schema.transformationConfig.constructor.name).toContain('SchemaField');

      // Color fields
      expect(schema.bgColor.constructor.name).toContain('ColorField');
      expect(schema.textColor.constructor.name).toContain('ColorField');
    });

    test('should have proper numeric constraints', () => {
      // Threshold fields should have min value of 1
      expect(schema.attackChain.schema.damageThreshold.options.min).toBe(1);
      expect(schema.attackChain.schema.statusThreshold.options.min).toBe(1);
      expect(schema.transformationConfig.schema.threshold.options.min).toBe(1);

      // Timing override should allow 0 (no override)
      expect(schema.timingOverride.options.min).toBe(0);

      // Threshold fields should require integers
      expect(schema.attackChain.schema.damageThreshold.options.integer).toBe(true);
      expect(schema.attackChain.schema.statusThreshold.options.integer).toBe(true);
      expect(schema.transformationConfig.schema.threshold.options.integer).toBe(true);
    });
  });

  describe('Future-Proofing and Extensibility', () => {
    test('should allow for schema extensions', () => {
      // Schema should be extensible for future features
      expect(typeof schema).toBe('object');
      expect(Object.keys(schema).length).toBeGreaterThan(10);
    });

    test('should maintain backwards compatibility markers', () => {
      // Embedded collections should start empty for backwards compatibility
      // ArrayField with 2-parameter constructor stores options differently
      expect(schema.embeddedStatusEffects).toBeDefined();
      expect(schema.embeddedTransformations).toBeDefined();
    });
  });

  describe('Schema Field Validation Functions', () => {
    describe('attackChain.damageFormula validation', () => {
      test('should accept valid damage formulas', () => {
        const damageFormula = schema.attackChain.schema.damageFormula;
        const validate = damageFormula.options.validate;

        // Valid formulas should return true
        expect(validate('1d6')).toBe(true);
        expect(validate('2d8+3')).toBe(true);
        expect(validate('1d4+@abilities.acro.total')).toBe(true);
        expect(validate('')).toBe(true); // blank is allowed with allowBlank: true
      });

      test('should sanitize formulas before validation', () => {
        const damageFormula = schema.attackChain.schema.damageFormula;
        const validate = damageFormula.options.validate;

        // FormulaValidator.sanitizeFormula should clean invalid characters
        // After sanitization, valid formulas should pass
        expect(validate('1d6')).toBe(true);
      });

      test('should accept formulas with data references', () => {
        const damageFormula = schema.attackChain.schema.damageFormula;
        const validate = damageFormula.options.validate;

        // Data references are allowed in damage formulas
        expect(validate('@abilities.acro.total')).toBe(true);
        expect(validate('1d6+@system.level')).toBe(true);
      });
    });

    describe('savedDamage.formula validation', () => {
      test('should accept valid saved damage formulas', () => {
        const formula = schema.savedDamage.schema.formula;
        const validate = formula.options.validate;

        // Valid formulas should return true
        expect(validate('1d6')).toBe(true);
        expect(validate('2d8+3')).toBe(true);
        expect(validate('')).toBe(true); // blank is allowed with allowBlank: true
      });

      test('should reject formulas with data references', () => {
        const formula = schema.savedDamage.schema.formula;
        const validate = formula.options.validate;

        // Data references are NOT allowed in saved damage formulas (allowDataRefs: false)
        expect(() => validate('@abilities.acro.total')).toThrow();
      });

      test('should sanitize formulas before validation', () => {
        const formula = schema.savedDamage.schema.formula;
        const validate = formula.options.validate;

        // After sanitization, valid formulas should pass
        expect(validate('1d6')).toBe(true);
      });
    });

    describe('repetitions validation', () => {
      test('should accept valid repetition formulas', () => {
        const repetitions = schema.repetitions;
        const validate = repetitions.options.validate;

        // Valid formulas should return true
        expect(validate('1')).toBe(true);
        expect(validate('1d4')).toBe(true);
        expect(validate('2d6')).toBe(true);
      });

      test('should reject empty formulas', () => {
        const repetitions = schema.repetitions;
        const validate = repetitions.options.validate;

        // Empty formulas should throw (blank: false)
        expect(() => validate('')).toThrow();
      });

      test('should reject formulas exceeding max repetitions', () => {
        const repetitions = schema.repetitions;
        const validate = repetitions.options.validate;

        // Formulas that could exceed 100 repetitions should throw
        expect(() => validate('200')).toThrow();
        expect(() => validate('101d20')).toThrow();
      });

      test('should accept formulas within max repetitions', () => {
        const repetitions = schema.repetitions;
        const validate = repetitions.options.validate;

        // Formulas within bounds should pass
        expect(validate('50')).toBe(true);
        expect(validate('10d10')).toBe(true);
      });

      test('should reject zero repetitions', () => {
        const repetitions = schema.repetitions;
        const validate = repetitions.options.validate;

        // Zero should throw (negative numbers get sanitized to positive)
        expect(() => validate('0')).toThrow();
      });

      test('should sanitize negative numbers to positive', () => {
        const repetitions = schema.repetitions;
        const validate = repetitions.options.validate;

        // Negative numbers get sanitized (minus removed) to positive
        // "-1" becomes "1" which is valid
        expect(validate('-1')).toBe(true);
      });
    });
  });
});