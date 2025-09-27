// @ts-nocheck
/**
 * @fileoverview Tests for Action Card Schema - Priority 1 Critical Functions
 *
 * Tests the defineSchema method for action cards, which is the most complex
 * item type in the Eventide RP System. The schema defines the data structure
 * for all action card functionality including attack chains, saved damage,
 * repetitions, and embedded items.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

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
jest.unstable_mockModule('../../../module/data/_module.mjs', () => ({
  EventideRpSystemItemBase: mockItemBase
}));

// Import the action card schema after mocking dependencies
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
      expect(field.fields).toBeDefined();
    });

    test('should define first stat with correct defaults', () => {
      const firstStat = schema.attackChain.fields.firstStat;

      expect(firstStat).toBeDefined();
      expect(firstStat.options.required).toBe(true);
      expect(firstStat.options.initial).toBe('acro');
      expect(firstStat.options.choices).toEqual(['acro', 'phys', 'fort', 'will', 'wits']);
    });

    test('should define second stat with correct defaults', () => {
      const secondStat = schema.attackChain.fields.secondStat;

      expect(secondStat).toBeDefined();
      expect(secondStat.options.required).toBe(true);
      expect(secondStat.options.initial).toBe('phys');
      expect(secondStat.options.choices).toEqual(['acro', 'phys', 'fort', 'will', 'wits']);
    });

    test('should define damage condition with correct choices', () => {
      const damageCondition = schema.attackChain.fields.damageCondition;

      expect(damageCondition).toBeDefined();
      expect(damageCondition.options.required).toBe(true);
      expect(damageCondition.options.initial).toBe('never');
      expect(damageCondition.options.choices).toEqual(['never', 'oneSuccess', 'twoSuccesses', 'rollValue']);
    });

    test('should define damage formula with correct defaults', () => {
      const damageFormula = schema.attackChain.fields.damageFormula;

      expect(damageFormula).toBeDefined();
      expect(damageFormula.options.required).toBe(true);
      expect(damageFormula.options.initial).toBe('1d6');
      expect(damageFormula.options.blank).toBe(true);
    });

    test('should define damage type with correct choices', () => {
      const damageType = schema.attackChain.fields.damageType;

      expect(damageType).toBeDefined();
      expect(damageType.options.required).toBe(true);
      expect(damageType.options.initial).toBe('damage');
      expect(damageType.options.choices).toEqual(['damage', 'heal']);
    });

    test('should define damage threshold with correct constraints', () => {
      const damageThreshold = schema.attackChain.fields.damageThreshold;

      expect(damageThreshold).toBeDefined();
      expect(damageThreshold.options.required).toBe(false);
      expect(damageThreshold.options.initial).toBe(15);
      expect(damageThreshold.options.integer).toBe(true);
      expect(damageThreshold.options.min).toBe(1);
    });

    test('should define status condition with correct choices', () => {
      const statusCondition = schema.attackChain.fields.statusCondition;

      expect(statusCondition).toBeDefined();
      expect(statusCondition.options.required).toBe(true);
      expect(statusCondition.options.initial).toBe('never');
      expect(statusCondition.options.choices).toEqual(['never', 'oneSuccess', 'twoSuccesses', 'rollValue']);
    });

    test('should define status threshold with correct constraints', () => {
      const statusThreshold = schema.attackChain.fields.statusThreshold;

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
      expect(field.options.required).toBe(true);
      expect(field.options.initial).toEqual([]);
    });

    test('should define embedded transformations array', () => {
      const field = schema.embeddedTransformations;

      expect(field).toBeDefined();
      expect(field.options.required).toBe(true);
      expect(field.options.initial).toEqual([]);
    });
  });

  describe('Transformation Configuration', () => {
    test('should define transformation config schema field', () => {
      const field = schema.transformationConfig;

      expect(field).toBeDefined();
      expect(field.fields).toBeDefined();
    });

    test('should define transformation condition with correct defaults', () => {
      const condition = schema.transformationConfig.fields.condition;

      expect(condition).toBeDefined();
      expect(condition.options.required).toBe(true);
      expect(condition.options.initial).toBe('never'); // Updated default per user request
      expect(condition.options.choices).toEqual(['never', 'oneSuccess', 'twoSuccesses', 'rollValue']);
    });

    test('should define transformation threshold with correct constraints', () => {
      const threshold = schema.transformationConfig.fields.threshold;

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
      expect(field.fields).toBeDefined();
    });

    test('should define saved damage formula', () => {
      const formula = schema.savedDamage.fields.formula;

      expect(formula).toBeDefined();
      expect(formula.options.required).toBe(true);
      expect(formula.options.initial).toBe('1d6');
      expect(formula.options.blank).toBe(true);
    });

    test('should define saved damage type', () => {
      const type = schema.savedDamage.fields.type;

      expect(type).toBeDefined();
      expect(type.options.required).toBe(true);
      expect(type.options.initial).toBe('damage');
      expect(type.options.choices).toEqual(['damage', 'heal']);
    });

    test('should define saved damage description', () => {
      const description = schema.savedDamage.fields.description;

      expect(description).toBeDefined();
      expect(description.options.required).toBe(true);
      expect(description.options.initial).toBe('');
      expect(description.options.blank).toBe(true);
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

    test('should define status per success flag', () => {
      const field = schema.statusPerSuccess;

      expect(field).toBeDefined();
      expect(field.options.required).toBe(true);
      expect(field.options.initial).toBe(false);
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
      const conditionChoices = ['never', 'oneSuccess', 'twoSuccesses', 'rollValue'];

      expect(schema.attackChain.fields.damageCondition.options.choices).toEqual(conditionChoices);
      expect(schema.attackChain.fields.statusCondition.options.choices).toEqual(conditionChoices);
      expect(schema.transformationConfig.fields.condition.options.choices).toEqual(conditionChoices);
    });

    test('should have consistent damage/heal type choices', () => {
      const typeChoices = ['damage', 'heal'];

      expect(schema.attackChain.fields.damageType.options.choices).toEqual(typeChoices);
      expect(schema.savedDamage.fields.type.options.choices).toEqual(typeChoices);
    });

    test('should have consistent threshold configurations', () => {
      const thresholds = [
        schema.attackChain.fields.damageThreshold,
        schema.attackChain.fields.statusThreshold,
        schema.transformationConfig.fields.threshold
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

      expect(schema.attackChain.fields.firstStat.options.choices).toEqual(abilityChoices);
      expect(schema.attackChain.fields.secondStat.options.choices).toEqual(abilityChoices);
    });

    test('should have appropriate required flags', () => {
      // Critical fields should be required
      expect(schema.mode.options.required).toBe(true);
      expect(schema.bgColor.options.required).toBe(true);
      expect(schema.textColor.options.required).toBe(true);
      expect(schema.embeddedItem.options.required).toBe(true);

      // Optional fields should not be required
      expect(schema.attackChain.fields.damageThreshold.options.required).toBe(false);
      expect(schema.attackChain.fields.statusThreshold.options.required).toBe(false);
      expect(schema.transformationConfig.fields.threshold.options.required).toBe(false);
    });

    test('should have logical default values', () => {
      // Mode should default to attackChain (primary use case)
      expect(schema.mode.options.initial).toBe('attackChain');

      // Damage conditions should default to never (conservative)
      expect(schema.attackChain.fields.damageCondition.options.initial).toBe('never');
      expect(schema.attackChain.fields.statusCondition.options.initial).toBe('never');
      expect(schema.transformationConfig.fields.condition.options.initial).toBe('never');

      // Boolean flags should default to false (conservative)
      expect(schema.advanceInitiative.options.initial).toBe(false);
      expect(schema.attemptInventoryReduction.options.initial).toBe(false);
      expect(schema.repeatToHit.options.initial).toBe(false);
      expect(schema.damageApplication.options.initial).toBe(false);
      expect(schema.statusPerSuccess.options.initial).toBe(false);
      expect(schema.costOnRepetition.options.initial).toBe(false);
    });
  });

  describe('Schema Field Types and Constraints', () => {
    test('should use appropriate field types', () => {
      // String fields
      expect(schema.mode.constructor.name).toContain('StringField');
      expect(schema.attackChain.fields.firstStat.constructor.name).toContain('StringField');
      expect(schema.attackChain.fields.damageFormula.constructor.name).toContain('StringField');
      expect(schema.repetitions.constructor.name).toContain('StringField');

      // Number fields
      expect(schema.attackChain.fields.damageThreshold.constructor.name).toContain('NumberField');
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
      expect(schema.attackChain.fields.damageThreshold.options.min).toBe(1);
      expect(schema.attackChain.fields.statusThreshold.options.min).toBe(1);
      expect(schema.transformationConfig.fields.threshold.options.min).toBe(1);

      // Timing override should allow 0 (no override)
      expect(schema.timingOverride.options.min).toBe(0);

      // Threshold fields should require integers
      expect(schema.attackChain.fields.damageThreshold.options.integer).toBe(true);
      expect(schema.attackChain.fields.statusThreshold.options.integer).toBe(true);
      expect(schema.transformationConfig.fields.threshold.options.integer).toBe(true);
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
      expect(schema.embeddedStatusEffects.options.initial).toEqual([]);
      expect(schema.embeddedTransformations.options.initial).toEqual([]);
    });
  });
});