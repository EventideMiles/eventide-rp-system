/**
 * FormulaValidator Service
 *
 * Provides centralized validation for roll formula fields throughout the system.
 * Uses Foundry VTT's Roll.validate() for parseability testing and custom
 * regex patterns for enhanced validation.
 *
 * @module FormulaValidator
 */

import { Logger } from "./logger.mjs";

/**
 * FormulaValidator class for validating roll formulas
 *
 * @class FormulaValidator
 */
export class FormulaValidator {
  /**
   * Validation result types
   * @type {Object}
   * @static
   * @readonly
   */
  static VALIDATION_TYPES = Object.freeze({
    ROLL_FORMULA: "roll_formula",
    DATA_REFERENCE: "data_reference",
    SIMPLE_MATH: "simple_math",
    REPETITION: "repetition",
  });

  /**
   * Error codes for localization
   * @type {Object}
   * @static
   * @readonly
   */
  static ERROR_CODES = Object.freeze({
    EMPTY_FORMULA: "empty_formula",
    INVALID_SYNTAX: "invalid_syntax",
    UNPARSEABLE: "unparseable",
    INVALID_MODIFIER: "invalid_modifier",
    INVALID_DATA_REF: "invalid_data_ref",
    NEGATIVE_RESULT: "negative_result",
    TOO_COMPLEX: "too_complex",
    INVALID_DICE_NOTATION: "invalid_dice_notation",
    MAX_REPETITIONS_EXCEEDED: "max_repetitions_exceeded",
    MISSING_REQUIRED_DATA_REF: "missing_required_data_ref",
    STATIC_EVALUATION_FAILED: "static_evaluation_failed",
    // Specific syntax error codes
    INVALID_DICE_TRAILING_CHARS: "invalid_dice_trailing_chars",
    INVALID_DICE_MISSING_COUNT: "invalid_dice_missing_count",
    INVALID_DICE_MISSING_SIZE: "invalid_dice_missing_size",
    INVALID_MODIFIER_MISSING_VALUE: "invalid_modifier_missing_value",
    MISMATCHED_PARENTHESES: "mismatched_parentheses",
    INVALID_OPERATOR_POSITION: "invalid_operator_position",
    INVALID_NUMBER_FORMAT: "invalid_number_format",
  });

  /**
   * Valid Foundry VTT v13 roll modifiers
   * @type {string[]}
   * @static
   * @readonly
   */
  static VALID_MODIFIERS = Object.freeze([
    "r",
    "rr",
    "x",
    "xo",
    "k",
    "kh",
    "kl",
    "d",
    "dh",
    "dl",
    "min",
    "max",
    "cs",
    "cf",
    "sf",
    "df",
    "ms",
    "even",
    "odd",
  ]);

  /**
   * Regex pattern for valid roll formula components
   * Matches: numbers, operators, dice notation, modifiers, data refs, functions
   * @type {RegExp}
   * @static
   * @readonly
   */
  static BASIC_FORMULA_PATTERN =
    /^(?:[\d\s]+|[+\-*/^(){}[\]]|[dDrRkKxXoOhHlLmMsS]|@[\w.]+|floor|ceil|round|abs|min|max|sqrt|pow|random|even|odd|cs|cf|sf|df|\.\d+|\d+\.\d*)+$/;

  /**
   * Regex pattern for data references (@data.path)
   * @type {RegExp}
   * @static
   * @readonly
   */
  static DATA_REF_PATTERN = /@[\w.]+/g;

  /**
   * Regex pattern for valid dice notation (XdY+Z)
   * @type {RegExp}
   * @static
   * @readonly
   */
  static DICE_PATTERN = /^\d+d\d+([+-]\d+)*$/i;

  /**
   * Regex pattern for valid roll modifiers
   * @type {RegExp}
   * @static
   * @readonly
   */
  static MODIFIER_PATTERN =
    /^(?:r|rr|x|xo|k|kh|kl|d|dh|dl|min|max|cs|cf|sf|df|ms|even|odd)$/i;

  /**
   * Validate a roll formula string for parseability and correctness
   *
   * @param {string} formula - The formula to validate
   * @param {Object} [options={}] - Validation options
   * @param {boolean} [options.allowBlank=false] - Whether empty/blank formulas are valid
   * @param {boolean} [options.allowDataRefs=true] - Whether @data references are allowed
   * @param {number} [options.minResult] - Minimum acceptable result (for static evaluation)
   * @param {string} [options.context] - Validation context for logging
   * @returns {{isValid: boolean, errorKey: string|null, details: Object}} Validation result
   */
  validateRollFormula(formula, options = {}) {
    const {
      allowBlank = false,
      allowDataRefs = true,
      minResult,
      context = "validateRollFormula",
    } = options;

    // Check for null/undefined
    if (formula == null) {
      Logger.debug(
        `${context}: Formula is null or undefined`,
        {},
        "VALIDATION",
      );
      return {
        isValid: false,
        errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.EmptyFormula",
        details: { formula: "" },
      };
    }

    // Convert to string and trim
    const formulaStr = String(formula).trim();

    // Check for empty/blank formula
    if (formulaStr === "") {
      if (allowBlank) {
        return { isValid: true, errorKey: null, details: {} };
      }
      Logger.debug(`${context}: Formula is empty`, {}, "VALIDATION");
      return {
        isValid: false,
        errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.EmptyFormula",
        details: { formula: formulaStr },
      };
    }

    // Validate with Foundry's Roll.validate()
    const rollValidation = this._validateWithRoll(formulaStr, context);
    if (!rollValidation.isValid) {
      return rollValidation;
    }

    // Validate regex patterns
    const regexValidation = this._validateRegex(formulaStr, context);
    if (!regexValidation.isValid) {
      return regexValidation;
    }

    // Validate data references if allowed
    if (allowDataRefs) {
      const dataRefValidation = this._validateDataRefs(formulaStr, context);
      if (!dataRefValidation.isValid) {
        return dataRefValidation;
      }
    } else if (FormulaValidator.DATA_REF_PATTERN.test(formulaStr)) {
      // Data refs found but not allowed
      Logger.debug(
        `${context}: Data references not allowed but found in formula`,
        { formula: formulaStr },
        "VALIDATION",
      );
      return {
        isValid: false,
        errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.InvalidDataRef",
        details: { formula: formulaStr, reason: "Data references not allowed" },
      };
    }

    // Static evaluation if minResult specified
    if (minResult !== undefined) {
      const evalResult = this._staticEvaluate(formulaStr, {
        minResult,
        context,
      });
      if (!evalResult.isValid) {
        return evalResult;
      }
    }

    return { isValid: true, errorKey: null, details: { formula: formulaStr } };
  }

  /**
   * Validate a damage formula for action cards
   *
   * @param {string} formula - The damage formula to validate
   * @param {Object} [options={}] - Validation options
   * @param {boolean} [options.allowBlank=true] - Whether empty formulas are valid
   * @param {boolean} [options.allowDataRefs=true] - Whether data references are allowed
   * @returns {{isValid: boolean, errorKey: string|null, parsed: Object}} Validation result
   */
  validateDamageFormula(formula, options = {}) {
    const { allowBlank = true, allowDataRefs = true } = options;
    const context = "validateDamageFormula";

    // Handle blank formulas
    if (!formula || String(formula).trim() === "") {
      if (allowBlank) {
        return {
          isValid: true,
          errorKey: null,
          parsed: { formula: "", type: "blank" },
        };
      }
      return {
        isValid: false,
        errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.EmptyFormula",
        parsed: { formula: "" },
      };
    }

    const formulaStr = String(formula).trim();

    // Basic roll formula validation
    const baseValidation = this.validateRollFormula(formulaStr, {
      allowBlank: false,
      allowDataRefs,
      context,
    });

    if (!baseValidation.isValid) {
      return { ...baseValidation, parsed: { formula: formulaStr } };
    }

    // Parse the formula for damage-specific validation
    const parsed = this._parseDamageFormula(formulaStr);

    // Check for potential negative values in damage formulas
    // This is a heuristic check - we can't know for sure without actual data
    if (parsed.hasSubtraction && !parsed.hasDataRefs) {
      // Only warn if there's subtraction and no data refs
      // (data refs could make the result positive)
      Logger.debug(
        `${context}: Formula may produce negative values`,
        { formula: formulaStr },
        "VALIDATION",
      );
    }

    return {
      isValid: true,
      errorKey: null,
      parsed: { ...parsed, formula: formulaStr },
    };
  }

  /**
   * Validate a repetition formula
   *
   * @param {string} formula - The repetition formula to validate
   * @param {Object} [options={}] - Validation options
   * @param {number} [options.maxRepetitions=100] - Maximum allowed repetitions
   * @returns {{isValid: boolean, errorKey: string|null, maxRepetitions: number}} Validation result
   */
  validateRepetitionFormula(formula, options = {}) {
    const { maxRepetitions = 100 } = options;
    const context = "validateRepetitionFormula";

    // Check for empty formula
    if (!formula || String(formula).trim() === "") {
      return {
        isValid: false,
        errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.EmptyFormula",
        maxRepetitions: 0,
      };
    }

    const formulaStr = String(formula).trim();

    // Check if it's a simple number
    if (/^\d+$/.test(formulaStr)) {
      const value = parseInt(formulaStr, 10);
      if (value <= 0) {
        return {
          isValid: false,
          errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.NegativeResult",
          maxRepetitions: value,
        };
      }
      if (value > maxRepetitions) {
        return {
          isValid: false,
          errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.MaxRepetitionsExceeded",
          maxRepetitions: value,
        };
      }
      return {
        isValid: true,
        errorKey: null,
        maxRepetitions: value,
      };
    }

    // Check if it's dice notation
    if (FormulaValidator.DICE_PATTERN.test(formulaStr)) {
      // Parse the dice notation to estimate max
      const match = formulaStr.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
      if (match) {
        const [, numDice, dieSize, modifier] = match;
        const max = parseInt(numDice, 10) * parseInt(dieSize, 10);
        const mod = modifier ? parseInt(modifier, 10) : 0;
        const estimatedMax = max + mod;

        if (estimatedMax > maxRepetitions) {
          return {
            isValid: false,
            errorKey:
              "EVENTIDE_RP_SYSTEM.Errors.Formula.MaxRepetitionsExceeded",
            maxRepetitions: estimatedMax,
          };
        }

        return {
          isValid: true,
          errorKey: null,
          maxRepetitions: estimatedMax,
        };
      }
    }

    // For complex formulas, do basic validation
    const baseValidation = this.validateRollFormula(formulaStr, {
      allowBlank: false,
      allowDataRefs: true,
      context,
    });

    if (!baseValidation.isValid) {
      return {
        ...baseValidation,
        maxRepetitions: 0,
      };
    }

    // Can't reliably estimate max for complex formulas with data refs
    return {
      isValid: true,
      errorKey: null,
      maxRepetitions, // Assume within bounds
    };
  }

  /**
   * Validate a formula used in system settings
   *
   * @param {string} formula - The setting formula to validate
   * @param {string} settingType - Type of setting (initative, crToXp, maxPower, etc.)
   * @param {Object} [options={}] - Validation options
   * @param {boolean} [options.allowBlank=false] - Whether empty formulas are valid
   * @param {boolean} [options.allowDataRefs=true] - Whether data references are allowed
   * @param {string[]} [options.requiredRefs] - Required data references
   * @returns {{isValid: boolean, errorKey: string|null, warnings: string[]}} Validation result
   */
  validateSettingFormula(formula, settingType, options = {}) {
    const {
      allowBlank = false,
      allowDataRefs = true,
      requiredRefs = [],
    } = options;
    const context = `validateSettingFormula:${settingType}`;

    // Check for empty formula
    if (!formula || String(formula).trim() === "") {
      if (allowBlank) {
        return { isValid: true, errorKey: null, warnings: [] };
      }
      return {
        isValid: false,
        errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.EmptyFormula",
        warnings: [],
      };
    }

    const formulaStr = String(formula).trim();

    // Basic validation
    const baseValidation = this.validateRollFormula(formulaStr, {
      allowBlank: false,
      allowDataRefs,
      context,
    });

    if (!baseValidation.isValid) {
      return { ...baseValidation, warnings: [] };
    }

    const warnings = [];

    // Check for required data references
    if (requiredRefs.length > 0) {
      const foundRefs =
        formulaStr.match(FormulaValidator.DATA_REF_PATTERN) || [];
      const missingRefs = requiredRefs.filter(
        (ref) => !foundRefs.some((found) => found.startsWith(ref)),
      );

      if (missingRefs.length > 0) {
        Logger.debug(
          `${context}: Missing required data references`,
          { formula: formulaStr, missing: missingRefs },
          "VALIDATION",
        );
        return {
          isValid: false,
          errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.MissingRequiredDataRef",
          warnings: [],
          details: { missingRefs: missingRefs.join(", ") },
        };
      }
    }

    // Setting-specific validation
    const settingValidation = this._validateSettingSpecific(
      formulaStr,
      settingType,
      context,
    );
    if (!settingValidation.isValid) {
      return { ...settingValidation, warnings };
    }

    warnings.push(...(settingValidation.warnings || []));

    return { isValid: true, errorKey: null, warnings };
  }

  /**
   * Validate formula using Foundry's Roll.validate()
   *
   * @private
   * @param {string} formula - The formula to validate
   * @param {string} context - Validation context for logging
   * @returns {{isValid: boolean, errorKey: string|null, details: Object}} Validation result
   */
  _validateWithRoll(formula, context) {
    try {
      // Check if Roll API is available
      if (typeof Roll === "undefined" || typeof Roll.validate !== "function") {
        Logger.warn(
          `${context}: Roll.validate not available, skipping validation`,
          {},
          "VALIDATION",
        );
        return { isValid: true, errorKey: null, details: {} };
      }

      const isValid = Roll.validate(formula);

      if (!isValid) {
        Logger.debug(
          `${context}: Formula failed Roll.validate()`,
          { formula },
          "VALIDATION",
        );
        // Try to detect specific syntax errors
        const syntaxError = this._detectSyntaxError(formula, context);
        if (syntaxError) {
          return syntaxError;
        }
        return {
          isValid: false,
          errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.Unparseable",
          details: { formula },
        };
      }

      return { isValid: true, errorKey: null, details: {} };
    } catch (error) {
      Logger.error(
        `${context}: Error during Roll.validate()`,
        error,
        "VALIDATION",
      );
      return {
        isValid: false,
        errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.Unparseable",
        details: { formula, error: error.message },
      };
    }
  }

  /**
   * Detect specific syntax errors in a formula
   *
   * @private
   * @param {string} formula - The formula to analyze
   * @param {string} context - Validation context for logging
   * @returns {{isValid: boolean, errorKey: string|null, details: Object}|null} Specific error or null
   */
  _detectSyntaxError(formula, context) {
    // Check for mismatched parentheses
    const parenError = this._checkParentheses(formula, context);
    if (parenError) {
      return parenError;
    }

    // Check for invalid dice notation patterns
    const diceError = this._checkDiceNotation(formula, context);
    if (diceError) {
      return diceError;
    }

    // Check for invalid modifier patterns
    const modifierError = this._checkModifiers(formula, context);
    if (modifierError) {
      return modifierError;
    }

    // Check for invalid operator positions
    const operatorError = this._checkOperators(formula, context);
    if (operatorError) {
      return operatorError;
    }

    // Check for invalid number formats
    const numberError = this._checkNumbers(formula, context);
    if (numberError) {
      return numberError;
    }

    // Try to parse with Roll constructor for more detailed error info
    const parseError = this._tryParseWithRoll(formula, context);
    if (parseError) {
      return parseError;
    }

    return null;
  }

  /**
   * Check for mismatched parentheses
   *
   * @private
   * @param {string} formula - The formula to check
   * @param {string} context - Validation context for logging
   * @returns {{isValid: boolean, errorKey: string|null, details: Object}|null} Error or null
   */
  _checkParentheses(formula, context) {
    let openCount = 0;
    let closeCount = 0;

    for (const char of formula) {
      if (char === "(") openCount++;
      if (char === ")") closeCount++;
    }

    if (openCount !== closeCount) {
      const missing = openCount > closeCount ? "closing" : "opening";
      Logger.debug(
        `${context}: Mismatched parentheses - missing ${missing} parenthesis`,
        { formula, openCount, closeCount },
        "VALIDATION",
      );
      return {
        isValid: false,
        errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.MismatchedParentheses",
        details: { formula, missing },
      };
    }

    return null;
  }

  /**
   * Check for invalid dice notation patterns
   *
   * @private
   * @param {string} formula - The formula to check
   * @param {string} context - Validation context for logging
   * @returns {{isValid: boolean, errorKey: string|null, details: Object}|null} Error or null
   */
  _checkDiceNotation(formula, context) {
    // Pattern to find dice notation with potential issues
    // Matches: d6x, 3d, d, 2d6kh (without number), etc.
    const dicePatterns = [
      // Trailing characters after dice (e.g., "d6x", "2d6y")
      {
        regex: /\b\d*d\d+[a-z][a-z0-9]*\b/gi,
        errorCode: "InvalidDiceTrailingChars",
        getMessage: (match) => ({
          notation: match,
          suggestion: match.replace(/[a-z]+$/gi, ""),
        }),
      },
      // Missing die size (e.g., "2d", "d")
      {
        regex: /\b\d*d\b(?!\d)/gi,
        errorCode: "InvalidDiceMissingSize",
        getMessage: (match) => ({
          notation: match,
          suggestion: match.replace(/d$/gi, "d6"),
        }),
      },
      // Missing die count with trailing chars (e.g., "dx", "d6x" where x is not a modifier)
      {
        regex: /\bd[a-z][a-z0-9]*\b/gi,
        errorCode: "InvalidDiceMissingCount",
        getMessage: (match) => ({
          notation: match,
          suggestion: `1${match.replace(/^[a-z]+/gi, "d")}`,
        }),
      },
    ];

    for (const pattern of dicePatterns) {
      const matches = formula.match(pattern.regex);
      if (matches) {
        const firstMatch = matches[0];
        const details = pattern.getMessage(firstMatch);
        Logger.debug(
          `${context}: Invalid dice notation detected`,
          { formula, match: firstMatch, errorCode: pattern.errorCode },
          "VALIDATION",
        );
        return {
          isValid: false,
          errorKey: `EVENTIDE_RP_SYSTEM.Errors.Formula.${pattern.errorCode}`,
          details: { formula, ...details },
        };
      }
    }

    return null;
  }

  /**
   * Check for invalid modifier patterns
   *
   * @private
   * @param {string} formula - The formula to check
   * @param {string} context - Validation context for logging
   * @returns {{isValid: boolean, errorKey: string|null, details: Object}|null} Error or null
   */
  _checkModifiers(formula, context) {
    // Pattern to find modifiers without required values
    // Matches: kh, kl, k, d, dh, dl, min, max, cs, cf, sf, df without numbers
    const modifierPatterns = [
      // Keep highest/lowest without number (e.g., "2d6kh", "2d6kl")
      {
        regex: /\d+d\d+(kh|kl|k|d|dh|dl)\b(?!\d)/gi,
        errorCode: "InvalidModifierMissingValue",
        getMessage: (match) => ({
          modifier: match.match(/(kh|kl|k|d|dh|dl)$/i)[0],
          suggestion: `${match}1`,
        }),
      },
      // Critical success/failure without number (e.g., "2d6cs", "2d6cf")
      {
        regex: /\d+d\d+(cs|cf|sf|df)\b(?!\d)/gi,
        errorCode: "InvalidModifierMissingValue",
        getMessage: (match) => ({
          modifier: match.match(/(cs|cf|sf|df)$/i)[0],
          suggestion: `${match}20`,
        }),
      },
      // Min/max without number (e.g., "2d6min", "2d6max")
      {
        regex: /\d+d\d+(min|max)\b(?!\d)/gi,
        errorCode: "InvalidModifierMissingValue",
        getMessage: (match) => ({
          modifier: match.match(/(min|max)$/i)[0],
          suggestion: `${match}1`,
        }),
      },
    ];

    for (const pattern of modifierPatterns) {
      const matches = formula.match(pattern.regex);
      if (matches) {
        const firstMatch = matches[0];
        const details = pattern.getMessage(firstMatch);
        Logger.debug(
          `${context}: Invalid modifier detected`,
          { formula, match: firstMatch, errorCode: pattern.errorCode },
          "VALIDATION",
        );
        return {
          isValid: false,
          errorKey: `EVENTIDE_RP_SYSTEM.Errors.Formula.${pattern.errorCode}`,
          details: { formula, ...details },
        };
      }
    }

    return null;
  }

  /**
   * Check for invalid operator positions
   *
   * @private
   * @param {string} formula - The formula to check
   * @param {string} context - Validation context for logging
   * @returns {{isValid: boolean, errorKey: string|null, details: Object}|null} Error or null
   */
  _checkOperators(formula, context) {
    // Remove whitespace for checking
    const cleanFormula = formula.replace(/\s+/g, "");

    // Check for consecutive operators (e.g., "2++3", "3*/4")
    const consecutiveOps = cleanFormula.match(/[+\-*/^]{2,}/g);
    if (consecutiveOps) {
      Logger.debug(
        `${context}: Consecutive operators detected`,
        { formula, operators: consecutiveOps },
        "VALIDATION",
      );
      return {
        isValid: false,
        errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.InvalidOperatorPosition",
        details: {
          formula,
          issue: "consecutive_operators",
          operators: consecutiveOps.join(", "),
        },
      };
    }

    // Check for operators at start or end (e.g., "+3", "5-")
    if (/^[+\-*/^]/.test(cleanFormula)) {
      Logger.debug(
        `${context}: Operator at start of formula`,
        { formula },
        "VALIDATION",
      );
      return {
        isValid: false,
        errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.InvalidOperatorPosition",
        details: { formula, issue: "operator_at_start" },
      };
    }

    if (/[+\-*/^]$/.test(cleanFormula)) {
      Logger.debug(
        `${context}: Operator at end of formula`,
        { formula },
        "VALIDATION",
      );
      return {
        isValid: false,
        errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.InvalidOperatorPosition",
        details: { formula, issue: "operator_at_end" },
      };
    }

    // Check for operator after opening parenthesis or before closing parenthesis
    const invalidParenOps = cleanFormula.match(/\([+\-*/^]|[+\-*/^]\)/g);
    if (invalidParenOps) {
      Logger.debug(
        `${context}: Invalid operator position near parentheses`,
        { formula, patterns: invalidParenOps },
        "VALIDATION",
      );
      return {
        isValid: false,
        errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.InvalidOperatorPosition",
        details: {
          formula,
          issue: "operator_near_parentheses",
          patterns: invalidParenOps.join(", "),
        },
      };
    }

    return null;
  }

  /**
   * Check for invalid number formats
   *
   * @private
   * @param {string} formula - The formula to check
   * @param {string} context - Validation context for logging
   * @returns {{isValid: boolean, errorKey: string|null, details: Object}|null} Error or null
   */
  _checkNumbers(formula, context) {
    // Check for multiple decimal points in a number (e.g., "3.14.15")
    const multiDecimal = formula.match(/\d+\.\d+\.\d+/g);
    if (multiDecimal) {
      Logger.debug(
        `${context}: Multiple decimal points in number detected`,
        { formula, numbers: multiDecimal },
        "VALIDATION",
      );
      return {
        isValid: false,
        errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.InvalidNumberFormat",
        details: {
          formula,
          issue: "multiple_decimals",
          numbers: multiDecimal.join(", "),
        },
      };
    }

    // Check for decimal points without digits (e.g., "3.", ".5")
    const invalidDecimal = formula.match(/(?<!\d)\.(?!\d)|\d+\.(?!\d)/g);
    if (invalidDecimal) {
      Logger.debug(
        `${context}: Invalid decimal format detected`,
        { formula, patterns: invalidDecimal },
        "VALIDATION",
      );
      return {
        isValid: false,
        errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.InvalidNumberFormat",
        details: {
          formula,
          issue: "invalid_decimal",
          patterns: invalidDecimal.join(", "),
        },
      };
    }

    return null;
  }

  /**
   * Try to parse formula with Roll constructor for detailed error info
   *
   * @private
   * @param {string} formula - The formula to parse
   * @param {string} context - Validation context for logging
   * @returns {{isValid: boolean, errorKey: string|null, details: Object}|null} Error or null
   */
  _tryParseWithRoll(formula, context) {
    try {
      if (typeof Roll === "undefined" || typeof Roll.create !== "function") {
        return null;
      }

      // Try to create a Roll object to get more detailed error info
      Roll.create(formula);

      // If we got here, the formula is actually parseable
      // This shouldn't happen since Roll.validate() already returned false
      // But if it does, we return null to let the generic error handle it
      return null;
    } catch (error) {
      // Extract useful information from the error message
      const errorMessage = error.message || "";

      Logger.debug(
        `${context}: Roll parsing error`,
        { formula, error: errorMessage },
        "VALIDATION",
      );

      // Try to extract specific error information from the message
      const errorDetails = { formula, error: errorMessage };

      // Check for specific error patterns in the message
      if (errorMessage.includes("dice") || errorMessage.includes("d")) {
        errorDetails.type = "dice_error";
      } else if (
        errorMessage.includes("modifier") ||
        errorMessage.includes("kh") ||
        errorMessage.includes("kl")
      ) {
        errorDetails.type = "modifier_error";
      } else if (errorMessage.includes("parenthes")) {
        errorDetails.type = "parentheses_error";
      } else if (
        errorMessage.includes("operator") ||
        errorMessage.includes("syntax")
      ) {
        errorDetails.type = "syntax_error";
      }

      return {
        isValid: false,
        errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.Unparseable",
        details: errorDetails,
      };
    }
  }

  /**
   * Validate formula using regex patterns
   *
   * @private
   * @param {string} formula - The formula to validate
   * @param {string} context - Validation context for logging
   * @returns {{isValid: boolean, errorKey: string|null, details: Object}} Validation result
   */
  _validateRegex(formula, context) {
    // Check if formula contains only valid characters
    if (!FormulaValidator.BASIC_FORMULA_PATTERN.test(formula)) {
      Logger.debug(
        `${context}: Formula contains invalid characters`,
        { formula },
        "VALIDATION",
      );
      return {
        isValid: false,
        errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.InvalidSyntax",
        details: { formula },
      };
    }

    return { isValid: true, errorKey: null, details: {} };
  }

  /**
   * Validate data references in formula
   *
   * @private
   * @param {string} formula - The formula to validate
   * @param {string} context - Validation context for logging
   * @returns {{isValid: boolean, errorKey: string|null, details: Object}} Validation result
   */
  _validateDataRefs(formula, context) {
    const matches = formula.match(FormulaValidator.DATA_REF_PATTERN) || [];

    for (const ref of matches) {
      // Check if data reference is valid format
      // Should be @ followed by alphanumeric, dots, and underscores
      if (!/^@[\w.]+$/.test(ref)) {
        Logger.debug(
          `${context}: Invalid data reference format`,
          { ref, formula },
          "VALIDATION",
        );
        return {
          isValid: false,
          errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.InvalidDataRef",
          details: { ref, formula },
        };
      }
    }

    return { isValid: true, errorKey: null, details: {} };
  }

  /**
   * Attempt static evaluation of formula
   *
   * @private
   * @param {string} formula - The formula to evaluate
   * @param {Object} options - Evaluation options
   * @param {number} [options.minResult] - Minimum acceptable result
   * @param {string} [options.context] - Evaluation context for logging
   * @returns {{isValid: boolean, errorKey: string|null, details: Object}} Evaluation result
   */
  _staticEvaluate(formula, options = {}) {
    const { minResult, context = "staticEvaluate" } = options;

    // If formula has data references, we can't statically evaluate
    if (FormulaValidator.DATA_REF_PATTERN.test(formula)) {
      return { isValid: true, errorKey: null, details: {} };
    }

    try {
      // Use Roll to evaluate the formula
      if (typeof Roll !== "undefined") {
        const roll = Roll.create(formula);
        const total = roll.evaluateSync
          ? roll.evaluateSync().total
          : roll.total;

        if (minResult !== undefined && total < minResult) {
          Logger.debug(
            `${context}: Formula result below minimum`,
            { formula, total, minResult },
            "VALIDATION",
          );
          return {
            isValid: false,
            errorKey: "EVENTIDE_RP_SYSTEM.Errors.Formula.NegativeResult",
            details: { formula, total, minResult },
          };
        }
      }
    } catch (error) {
      Logger.debug(
        `${context}: Static evaluation failed`,
        { formula, error: error.message },
        "VALIDATION",
      );
      // Don't fail validation on evaluation errors - formula might be valid with data
    }

    return { isValid: true, errorKey: null, details: {} };
  }

  /**
   * Parse damage formula for components
   *
   * @private
   * @param {string} formula - The formula to parse
   * @returns {Object} Parsed components
   */
  _parseDamageFormula(formula) {
    return {
      hasDataRefs: FormulaValidator.DATA_REF_PATTERN.test(formula),
      hasSubtraction: formula.includes("-"),
      hasDice: /\d+d\d+/i.test(formula),
      hasModifiers: FormulaValidator.VALID_MODIFIERS.some((mod) =>
        formula.toLowerCase().includes(mod),
      ),
    };
  }

  /**
   * Validate setting-specific requirements
   *
   * @private
   * @param {string} formula - The formula to validate
   * @param {string} settingType - Type of setting
   * @param {string} context - Validation context
   * @returns {{isValid: boolean, errorKey: string|null, warnings: string[]}} Validation result
   */
  _validateSettingSpecific(formula, settingType, context) {
    // Setting-specific validation is intentionally minimal.
    // The purpose of this validator is to ensure formulas are syntactically valid,
    // not to enforce system-specific conventions. Users should be free to customize
    // their formulas as they see fit - that's why these are configurable settings.
    //
    // If specific validation is needed, it should be done through the requiredRefs
    // parameter in validateSettingFormula(), not hardcoded here.

    const warnings = [];

    switch (settingType) {
      case "initative":
      case "crToXp":
      case "maxPower":
      case "maxResolve":
      case "statPoints":
        // All setting types accept any valid roll formula
        // No opinionated validation - let users customize freely
        break;

      default:
        Logger.debug(
          `${context}: Unknown setting type '${settingType}', using basic validation`,
          {},
          "VALIDATION",
        );
    }

    return { isValid: true, errorKey: null, warnings };
  }

  /**
   * Sanitize a formula by removing invalid characters
   *
   * This method removes any characters that don't match the valid formula pattern,
   * allowing users to input formulas with typos or invalid characters that will be
   * automatically corrected.
   *
   * @static
   * @param {string} formula - The formula to sanitize
   * @returns {string} The sanitized formula
   */
  static sanitizeFormula(formula) {
    if (formula == null) {
      return "";
    }

    const formulaStr = String(formula);

    // Extract all valid characters using the BASIC_FORMULA_PATTERN
    // This pattern matches: numbers, operators, dice notation, modifiers, data refs, functions
    const validChars = formulaStr.match(
      /[\d\s]+|[+\-*/^(){}[\]]|[dDrRkKxXoOhHlLmMsS]|@[\w.]+|floor|ceil|round|abs|min|max|sqrt|pow|random|even|odd|cs|cf|sf|df|\.\d+|\d+\.\d*/g,
    );

    if (!validChars) {
      return "";
    }

    // Join the valid characters back together
    return validChars.join("");
  }
}
