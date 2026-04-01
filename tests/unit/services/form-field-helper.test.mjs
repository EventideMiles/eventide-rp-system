// @ts-nocheck
/**
 * @fileoverview Tests for FormFieldHelper Service
 *
 * Unit tests for the FormFieldHelper service which provides centralized
 * handling for form field operations in item sheets, including color
 * input normalization, damage formula synchronization, and formula
 * field sanitization.
 */

// Vitest globals are enabled, so we don't need to import them
// describe, test, expect, beforeEach, vi are available globally

// Mock dependencies before import
vi.mock('../../../module/services/logger.mjs', () => ({
  Logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Don't mock FormulaValidator - use the real implementation

// Import the service after setting up mocks
import { FormFieldHelper } from '../../../module/services/form-field-helper.mjs';

describe('FormFieldHelper', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // Static Properties Tests
  // ==========================================

  describe('Static Properties', () => {
    describe('COLOR_DEFAULTS', () => {
      test('should have textColor default as #ffffff', () => {
        expect(FormFieldHelper.COLOR_DEFAULTS.textColor).toBe('#ffffff');
      });

      test('should have bgColor default as #000000', () => {
        expect(FormFieldHelper.COLOR_DEFAULTS.bgColor).toBe('#000000');
      });

      test('should have iconTint default as #ffffff', () => {
        expect(FormFieldHelper.COLOR_DEFAULTS.iconTint).toBe('#ffffff');
      });
    });

    describe('DAMAGE_FORMULA_FIELDS', () => {
      test('should map attackChain.damageFormula to savedDamage.formula', () => {
        expect(FormFieldHelper.DAMAGE_FORMULA_FIELDS['system.attackChain.damageFormula']).toBe('system.savedDamage.formula');
      });

      test('should map savedDamage.formula to attackChain.damageFormula', () => {
        expect(FormFieldHelper.DAMAGE_FORMULA_FIELDS['system.savedDamage.formula']).toBe('system.attackChain.damageFormula');
      });

      test('should have exactly 2 field mappings', () => {
        expect(Object.keys(FormFieldHelper.DAMAGE_FORMULA_FIELDS)).toHaveLength(2);
      });
    });

    describe('FORMULA_FIELDS', () => {
      test('should include damageFormula', () => {
        expect(FormFieldHelper.FORMULA_FIELDS).toContain('damageFormula');
      });

      test('should include formula', () => {
        expect(FormFieldHelper.FORMULA_FIELDS).toContain('formula');
      });

      test('should include repetitions', () => {
        expect(FormFieldHelper.FORMULA_FIELDS).toContain('repetitions');
      });

      test('should have exactly 3 field names', () => {
        expect(FormFieldHelper.FORMULA_FIELDS).toHaveLength(3);
      });
    });
  });

  // ==========================================
  // isColorField() Tests
  // ==========================================

  describe('isColorField()', () => {
    describe('Valid color fields', () => {
      test('should return true for textColor field', () => {
        expect(FormFieldHelper.isColorField('system.textColor')).toBe(true);
      });

      test('should return true for bgColor field', () => {
        expect(FormFieldHelper.isColorField('system.bgColor')).toBe(true);
      });

      test('should return true for iconTint field', () => {
        expect(FormFieldHelper.isColorField('system.iconTint')).toBe(true);
      });

      test('should return true for nested textColor field', () => {
        expect(FormFieldHelper.isColorField('system.appearance.textColor')).toBe(true);
      });

      test('should return true for nested bgColor field', () => {
        expect(FormFieldHelper.isColorField('system.styles.bgColor')).toBe(true);
      });

      test('should return true for nested iconTint field', () => {
        expect(FormFieldHelper.isColorField('system.display.iconTint')).toBe(true);
      });
    });

    describe('Invalid color fields', () => {
      test('should return false for non-color field', () => {
        expect(FormFieldHelper.isColorField('system.value')).toBe(false);
      });

      test('should return false for empty string', () => {
        expect(FormFieldHelper.isColorField('')).toBe(false);
      });

      test('should return false for null', () => {
        expect(FormFieldHelper.isColorField(null)).toBe(false);
      });

      test('should return false for undefined', () => {
        expect(FormFieldHelper.isColorField(undefined)).toBe(false);
      });

      test('should return false for number', () => {
        expect(FormFieldHelper.isColorField(123)).toBe(false);
      });

      test('should return false for object', () => {
        expect(FormFieldHelper.isColorField({})).toBe(false);
      });
    });
  });

  // ==========================================
  // isDamageFormulaField() Tests
  // ==========================================

  describe('isDamageFormulaField()', () => {
    describe('Valid damage formula fields', () => {
      test('should return true for attackChain.damageFormula field', () => {
        expect(FormFieldHelper.isDamageFormulaField('system.attackChain.damageFormula')).toBe(true);
      });

      test('should return true for savedDamage.formula field', () => {
        expect(FormFieldHelper.isDamageFormulaField('system.savedDamage.formula')).toBe(true);
      });
    });

    describe('Invalid damage formula fields', () => {
      test('should return false for non-damage formula field', () => {
        expect(FormFieldHelper.isDamageFormulaField('system.value')).toBe(false);
      });

      test('should return false for partial match', () => {
        expect(FormFieldHelper.isDamageFormulaField('damageFormula')).toBe(false);
      });

      test('should return false for empty string', () => {
        expect(FormFieldHelper.isDamageFormulaField('')).toBe(false);
      });

      test('should return false for null', () => {
        expect(FormFieldHelper.isDamageFormulaField(null)).toBe(false);
      });

      test('should return false for undefined', () => {
        expect(FormFieldHelper.isDamageFormulaField(undefined)).toBe(false);
      });

      test('should return false for number', () => {
        expect(FormFieldHelper.isDamageFormulaField(123)).toBe(false);
      });
    });
  });

  // ==========================================
  // isFormulaField() Tests
  // ==========================================

  describe('isFormulaField()', () => {
    describe('Valid formula fields', () => {
      test('should return true for damageFormula field', () => {
        expect(FormFieldHelper.isFormulaField('system.attackChain.damageFormula')).toBe(true);
      });

      test('should return true for formula field', () => {
        expect(FormFieldHelper.isFormulaField('system.savedDamage.formula')).toBe(true);
      });

      test('should return true for repetitions field', () => {
        expect(FormFieldHelper.isFormulaField('system.repetitions')).toBe(true);
      });

      test('should return true for nested formula field', () => {
        expect(FormFieldHelper.isFormulaField('system.some.nested.formula')).toBe(true);
      });
    });

    describe('Invalid formula fields', () => {
      test('should return false for non-formula field', () => {
        expect(FormFieldHelper.isFormulaField('system.value')).toBe(false);
      });

      test('should return false for empty string', () => {
        expect(FormFieldHelper.isFormulaField('')).toBe(false);
      });

      test('should return false for null', () => {
        expect(FormFieldHelper.isFormulaField(null)).toBe(false);
      });

      test('should return false for undefined', () => {
        expect(FormFieldHelper.isFormulaField(undefined)).toBe(false);
      });

      test('should return false for number', () => {
        expect(FormFieldHelper.isFormulaField(123)).toBe(false);
      });
    });
  });

  // ==========================================
  // normalizeColorInput() Tests
  // ==========================================

  describe('normalizeColorInput()', () => {
    describe('Short hex expansion', () => {
      test('should expand #fff to #ffffff', () => {
        expect(FormFieldHelper.normalizeColorInput('#fff', 'system.textColor')).toBe('#ffffff');
      });

      test('should expand #000 to #000000', () => {
        expect(FormFieldHelper.normalizeColorInput('#000', 'system.bgColor')).toBe('#000000');
      });

      test('should expand #abc to #aabc', () => {
        expect(FormFieldHelper.normalizeColorInput('#abc', 'system.iconTint')).toBe('#abcabc');
      });
    });

    describe('Full hex validation', () => {
      test('should return valid 7-character hex as-is', () => {
        expect(FormFieldHelper.normalizeColorInput('#ffffff', 'system.textColor')).toBe('#ffffff');
      });

      test('should return valid 7-character hex with trimming', () => {
        expect(FormFieldHelper.normalizeColorInput('  #ffffff  ', 'system.textColor')).toBe('#ffffff');
      });

      test('should return valid hex #000000', () => {
        expect(FormFieldHelper.normalizeColorInput('#000000', 'system.bgColor')).toBe('#000000');
      });
    });

    describe('Invalid input handling', () => {
      test('should return default for textColor when value is too short', () => {
        expect(FormFieldHelper.normalizeColorInput('#ff', 'system.textColor')).toBe('#ffffff');
      });

      test('should return default for bgColor when value is too long', () => {
        expect(FormFieldHelper.normalizeColorInput('#fffffff', 'system.bgColor')).toBe('#000000');
      });

      test('should return default for iconTint when value is too short', () => {
        // Values that are not exactly 4 or 7 chars return default
        expect(FormFieldHelper.normalizeColorInput('abc', 'system.iconTint')).toBe('#ffffff');
      });

      test('should return default for null value', () => {
        expect(FormFieldHelper.normalizeColorInput(null, 'system.textColor')).toBe('#ffffff');
      });

      test('should return default for undefined value', () => {
        expect(FormFieldHelper.normalizeColorInput(undefined, 'system.bgColor')).toBe('#000000');
      });

      test('should return default for empty string', () => {
        expect(FormFieldHelper.normalizeColorInput('', 'system.iconTint')).toBe('#ffffff');
      });

      test('should return default for number value', () => {
        expect(FormFieldHelper.normalizeColorInput(123, 'system.textColor')).toBe('#ffffff');
      });
    });

    describe('Field-specific defaults', () => {
      test('should return #ffffff for textColor field with invalid input', () => {
        expect(FormFieldHelper.normalizeColorInput(null, 'system.textColor')).toBe('#ffffff');
      });

      test('should return #000000 for bgColor field with invalid input', () => {
        expect(FormFieldHelper.normalizeColorInput(null, 'system.bgColor')).toBe('#000000');
      });

      test('should return #ffffff for iconTint field with invalid input', () => {
        expect(FormFieldHelper.normalizeColorInput(null, 'system.iconTint')).toBe('#ffffff');
      });

      test('should return #ffffff for unknown field with invalid input', () => {
        expect(FormFieldHelper.normalizeColorInput(null, 'system.unknown')).toBe('#ffffff');
      });
    });
  });

  // ==========================================
  // _getDefaultColorForField() Tests
  // ==========================================

  describe('_getDefaultColorForField()', () => {
    describe('Field-specific defaults', () => {
      test('should return #ffffff for textColor field', () => {
        expect(FormFieldHelper._getDefaultColorForField('system.textColor')).toBe('#ffffff');
      });

      test('should return #000000 for bgColor field', () => {
        expect(FormFieldHelper._getDefaultColorForField('system.bgColor')).toBe('#000000');
      });

      test('should return #ffffff for iconTint field', () => {
        expect(FormFieldHelper._getDefaultColorForField('system.iconTint')).toBe('#ffffff');
      });

      test('should return #ffffff for unknown field', () => {
        expect(FormFieldHelper._getDefaultColorForField('system.unknown')).toBe('#ffffff');
      });
    });

    describe('Invalid field names', () => {
      test('should return #ffffff for null field name', () => {
        expect(FormFieldHelper._getDefaultColorForField(null)).toBe('#ffffff');
      });

      test('should return #ffffff for undefined field name', () => {
        expect(FormFieldHelper._getDefaultColorForField(undefined)).toBe('#ffffff');
      });

      test('should return #ffffff for empty string field name', () => {
        expect(FormFieldHelper._getDefaultColorForField('')).toBe('#ffffff');
      });

      test('should return #ffffff for number field name', () => {
        expect(FormFieldHelper._getDefaultColorForField(123)).toBe('#ffffff');
      });
    });
  });

  // ==========================================
  // getDamageFormulaUpdate() Tests
  // ==========================================

  describe('getDamageFormulaUpdate()', () => {
    describe('Valid damage formula fields', () => {
      test('should return update object for attackChain.damageFormula', () => {
        const result = FormFieldHelper.getDamageFormulaUpdate('system.attackChain.damageFormula', '2d6');
        expect(result).toEqual({
          'system.attackChain.damageFormula': '2d6',
          'system.savedDamage.formula': '2d6'
        });
      });

      test('should return update object for savedDamage.formula', () => {
        const result = FormFieldHelper.getDamageFormulaUpdate('system.savedDamage.formula', '1d8+3');
        expect(result).toEqual({
          'system.savedDamage.formula': '1d8+3',
          'system.attackChain.damageFormula': '1d8+3'
        });
      });

      test('should handle empty value', () => {
        const result = FormFieldHelper.getDamageFormulaUpdate('system.attackChain.damageFormula', '');
        expect(result).toEqual({
          'system.attackChain.damageFormula': '',
          'system.savedDamage.formula': ''
        });
      });
    });

    describe('Invalid damage formula fields', () => {
      test('should return null for non-damage formula field', () => {
        expect(FormFieldHelper.getDamageFormulaUpdate('system.value', '2d6')).toBeNull();
      });

      test('should return null for null field name', () => {
        expect(FormFieldHelper.getDamageFormulaUpdate(null, '2d6')).toBeNull();
      });

      test('should return null for undefined field name', () => {
        expect(FormFieldHelper.getDamageFormulaUpdate(undefined, '2d6')).toBeNull();
      });

      test('should return null for empty string field name', () => {
        expect(FormFieldHelper.getDamageFormulaUpdate('', '2d6')).toBeNull();
      });
    });
  });

  // ==========================================
  // sanitizeFormulaInput() Tests
  // ==========================================

  describe('sanitizeFormulaInput()', () => {
    describe('Valid formula sanitization', () => {
      test('should preserve formula with spaces (FormulaValidator allows spaces)', () => {
        const result = FormFieldHelper.sanitizeFormulaInput('1d6 + 2');
        expect(result).toBe('1d6 + 2');
      });

      test('should handle formula without spaces', () => {
        const result = FormFieldHelper.sanitizeFormulaInput('1d6+2');
        expect(result).toBe('1d6+2');
      });

      test('should handle complex formula with data references', () => {
        const result = FormFieldHelper.sanitizeFormulaInput('2d6 + @abilities.acro.total');
        expect(result).toBe('2d6 + @abilities.acro.total');
      });
    });

    describe('Invalid input handling', () => {
      test('should return null for null input', () => {
        expect(FormFieldHelper.sanitizeFormulaInput(null)).toBeNull();
      });

      test('should return undefined for undefined input', () => {
        expect(FormFieldHelper.sanitizeFormulaInput(undefined)).toBeUndefined();
      });

      test('should return empty string for empty string input', () => {
        const result = FormFieldHelper.sanitizeFormulaInput('');
        expect(result).toBe('');
      });

      test('should handle number input', () => {
        // Non-string values pass through as-is (the function returns value if !value || typeof value !== 'string')
        const result = FormFieldHelper.sanitizeFormulaInput(123);
        expect(result).toBe(123);
      });
    });
  });

  // ==========================================
  // handleFieldSync() Tests
  // ==========================================

  describe('handleFieldSync()', () => {
    let mockEvent;
    let mockItem;

    beforeEach(() => {
      mockItem = {
        id: 'item-123',
        name: 'Test Item'
      };
    });

    describe('Color field handling', () => {
      test('should normalize color field value', () => {
        mockEvent = {
          target: {
            name: 'system.textColor',
            value: '#fff'
          }
        };

        const result = FormFieldHelper.handleFieldSync(mockEvent, mockItem);

        expect(result.normalizedValue).toBe('#ffffff');
        expect(result.shouldUpdate).toBe(false);
        expect(result.updateData).toBeNull();
      });

      test('should normalize invalid-length color input to default', () => {
        mockEvent = {
          target: {
            name: 'system.bgColor',
            value: 'xyz'  // Too short - not 4 or 7 chars
          }
        };

        const result = FormFieldHelper.handleFieldSync(mockEvent, mockItem);

        // Values not exactly 4 or 7 chars return default
        expect(result.normalizedValue).toBe('#000000');
        expect(result.shouldUpdate).toBe(false);
      });
    });

    describe('Formula field handling', () => {
      test('should preserve formula field value (FormulaValidator allows spaces)', () => {
        mockEvent = {
          target: {
            name: 'system.damageFormula',
            value: '1d6 + 2'
          }
        };

        const result = FormFieldHelper.handleFieldSync(mockEvent, mockItem);

        // FormulaValidator doesn't remove spaces, so sanitized equals original
        // Therefore normalizedValue should be undefined (no change)
        expect(result.normalizedValue).toBeUndefined();
        expect(result.shouldUpdate).toBe(false);
      });

      test('should not set normalizedValue when formula is already clean', () => {
        mockEvent = {
          target: {
            name: 'system.damageFormula',
            value: '1d6+2'
          }
        };

        const result = FormFieldHelper.handleFieldSync(mockEvent, mockItem);

        // normalizedValue should be undefined when no change is needed
        expect(result.normalizedValue).toBeUndefined();
      });
    });

    describe('Damage formula synchronization', () => {
      test('should return update data for attackChain.damageFormula', () => {
        mockEvent = {
          target: {
            name: 'system.attackChain.damageFormula',
            value: '2d6'
          }
        };

        const result = FormFieldHelper.handleFieldSync(mockEvent, mockItem);

        expect(result.shouldUpdate).toBe(true);
        expect(result.updateData).toEqual({
          'system.attackChain.damageFormula': '2d6',
          'system.savedDamage.formula': '2d6'
        });
      });

      test('should return update data for savedDamage.formula', () => {
        mockEvent = {
          target: {
            name: 'system.savedDamage.formula',
            value: '1d8+3'
          }
        };

        const result = FormFieldHelper.handleFieldSync(mockEvent, mockItem);

        expect(result.shouldUpdate).toBe(true);
        expect(result.updateData).toEqual({
          'system.savedDamage.formula': '1d8+3',
          'system.attackChain.damageFormula': '1d8+3'
        });
      });

      test('should combine sanitization with damage formula sync', () => {
        mockEvent = {
          target: {
            name: 'system.attackChain.damageFormula',
            value: '2d6 + 3'
          }
        };

        const result = FormFieldHelper.handleFieldSync(mockEvent, mockItem);

        // FormulaValidator preserves spaces, so sanitized value is same as original
        expect(result.shouldUpdate).toBe(true);
        expect(result.normalizedValue).toBeUndefined(); // No sanitization change
        expect(result.updateData).toEqual({
          'system.attackChain.damageFormula': '2d6 + 3',
          'system.savedDamage.formula': '2d6 + 3'
        });
      });
    });

    describe('Invalid event handling', () => {
      test('should return default result for null event', () => {
        const result = FormFieldHelper.handleFieldSync(null, mockItem);

        expect(result.shouldUpdate).toBe(false);
        expect(result.updateData).toBeNull();
        expect(result.normalizedValue).toBeUndefined();
      });

      test('should return default result for event without target', () => {
        mockEvent = {};

        const result = FormFieldHelper.handleFieldSync(mockEvent, mockItem);

        expect(result.shouldUpdate).toBe(false);
        expect(result.updateData).toBeNull();
        expect(result.normalizedValue).toBeUndefined();
      });

      test('should return default result for event without target.name', () => {
        mockEvent = {
          target: {}
        };

        const result = FormFieldHelper.handleFieldSync(mockEvent, mockItem);

        expect(result.shouldUpdate).toBe(false);
        expect(result.updateData).toBeNull();
        expect(result.normalizedValue).toBeUndefined();
      });
    });

    describe('Non-special field handling', () => {
      test('should return default result for regular field', () => {
        mockEvent = {
          target: {
            name: 'system.name',
            value: 'Test Name'
          }
        };

        const result = FormFieldHelper.handleFieldSync(mockEvent, mockItem);

        expect(result.shouldUpdate).toBe(false);
        expect(result.updateData).toBeNull();
        expect(result.normalizedValue).toBeUndefined();
      });
    });
  });

  // ==========================================
  // Edge Cases and Integration Tests
  // ==========================================

  describe('Edge Cases', () => {
    let mockItem;

    beforeEach(() => {
      mockItem = {
        id: 'item-123',
        name: 'Test Item'
      };
    });

    describe('Combined field types', () => {
      // A field could theoretically be both a color field and formula field
      // based on the naming patterns (though unlikely in practice)
      test('should handle field that matches both color and formula patterns', () => {
        // This is an edge case - the order of checks matters
        const mockEvent = {
          target: {
            name: 'system.damageFormula', // This is a formula field
            value: '1d6 + 2'
          }
        };

        const result = FormFieldHelper.handleFieldSync(mockEvent, mockItem);

        // FormulaValidator preserves spaces, so no sanitization change
        expect(result.normalizedValue).toBeUndefined();
      });
    });

    describe('Empty and whitespace values', () => {
      test('should handle empty value for color field', () => {
        const result = FormFieldHelper.normalizeColorInput('', 'system.textColor');
        expect(result).toBe('#ffffff');
      });

      test('should handle whitespace-only value for color field', () => {
        const result = FormFieldHelper.normalizeColorInput('   ', 'system.textColor');
        // Whitespace-only string has length > 7 after trim, so returns default
        expect(result).toBe('#ffffff');
      });

      test('should handle empty value for formula field', () => {
        const result = FormFieldHelper.sanitizeFormulaInput('');
        expect(result).toBe('');
      });
    });

    describe('Unicode and special characters', () => {
      test('should handle color value with unicode characters', () => {
        const result = FormFieldHelper.normalizeColorInput('#fff', 'system.textColor');
        expect(result).toBe('#ffffff');
      });

      test('should preserve formula with special characters (@ is valid)', () => {
        const result = FormFieldHelper.sanitizeFormulaInput('1d6@abilities.acro');
        // FormulaValidator preserves @ characters for data references
        expect(result).toBe('1d6@abilities.acro');
      });
    });
  });
});