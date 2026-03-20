// @ts-nocheck
/**
 * Vitest setup - runs before each test file
 */

// Import FoundryVTT mocks from @rayners/foundry-test-utils
import '@rayners/foundry-test-utils/dist/mocks/foundry-mocks.js';

// Add missing foundry.applications.handlebars mock
if (!global.foundry.applications) {
  global.foundry.applications = {};
}
if (!global.foundry.applications.handlebars) {
  global.foundry.applications.handlebars = {
    renderTemplate: vi.fn(() => Promise.resolve('<div>Rendered Template</div>'))
  };
}

// Add missing foundry.applications.api mock for ApplicationV2
if (!global.foundry.applications.api) {
  global.foundry.applications.api = {
    ApplicationV2: class MockApplicationV2 {
      constructor() {}
    },
    HandlebarsApplicationMixin: (BaseClass) => BaseClass
  };
}

// Add missing foundry.applications.ux mock for TextEditor
if (!global.foundry.applications.ux) {
  global.foundry.applications.ux = {
    TextEditor: class MockTextEditor {
      constructor() {}
      static implementation = {
        enrichHTML: vi.fn(() => Promise.resolve('<p>Enriched</p>'))
      }
    }
  };
}

// Add missing foundry.applications.sheets mock for ActorSheetV2, ItemSheetV2
if (!global.foundry.applications.sheets) {
  global.foundry.applications.sheets = {
    ActorSheetV2: class MockActorSheetV2 {
      constructor() {}
      static DEFAULT_OPTIONS = {
        window: {
          controls: []
        }
      };
    },
    ItemSheetV2: class MockItemSheetV2 {
      constructor() {}
      static DEFAULT_OPTIONS = {
        window: {
          controls: []
        }
      };
    }
  };
}

// Add missing field types to foundry.data.fields
if (!global.foundry.data.fields.ColorField) {
  global.foundry.data.fields.ColorField = class MockColorField {
    constructor(options = {}) {
      this.options = options;
      this.initial = options.initial || '#000000';
    }
  };
}

// Add missing foundry.applications.apps mock for FilePicker
if (!global.foundry.applications.apps) {
  global.foundry.applications.apps = {
    FilePicker: {
      implementation: class MockFilePicker {
        constructor() {}
      }
    }
  };
}

if (!global.foundry.data.fields.SchemaField) {
  global.foundry.data.fields.SchemaField = class MockSchemaField {
    constructor(fields, options = {}) {
      // Store both the fields parameter and as a fields property for test access
      // Also store as 'schema' for compatibility with @rayners/foundry-test-utils tests
      this.fields = fields;
      this.schema = fields;
      this.options = options;
    }
  };
}

if (!global.foundry.data.fields.ArrayField) {
  global.foundry.data.fields.ArrayField = class MockArrayField {
    constructor(element, options = {}) {
      this.element = element;
      this.options = options || {};
      this.options.required = options.required ?? false;
      this.options.initial = options.initial ?? [];
    }
  };
}

// Add missing foundry.utils mocks
if (!global.foundry.utils) {
  global.foundry.utils = {};
}
if (!global.foundry.utils.deepClone) {
  global.foundry.utils.deepClone = function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
      const copy = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          copy[key] = deepClone(obj[key]);
        }
      }
      return copy;
    }
    return obj;
  };
}

// Add missing Roll mock with evaluateSync method
// Override the Roll mock from @rayners/foundry-test-utils to add evaluateSync
global.Roll = class MockRoll {
  constructor(formula, data) {
    this.formula = formula;
    this.data = data || {};
    this._total = 10; // Default mock result
  }

  /**
   * Resolve a nested property path from data object
   * @param {string} path - Dot-separated path like "will.total" or "lvl.value"
   * @param {object} data - Data object to resolve from
   * @returns {number} The resolved value or 0
   */
  _resolvePath(path, data) {
    const parts = path.split('.');
    let current = data;
    for (const part of parts) {
      if (current === null || current === undefined) return 0;
      current = current[part];
    }
    const num = Number(current);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Simple formula evaluator for basic mathematical expressions
   * Supports: +, -, *, /, parentheses, max(), and @property references
   * @param {string} formula - The formula to evaluate
   * @param {object} data - Data object for @property references
   * @returns {number} The evaluated result
   */
  _evaluateFormula(formula, data) {
    try {
      // Replace @property references with actual values
      // Handle both @prop and @prop.nested formats
      let processed = formula.replace(/@([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g, (match, path) => {
        const value = this._resolvePath(path, data);
        return value;
      });

      // Handle max() function - convert to Math.max
      processed = processed.replace(/\bmax\s*\(/gi, 'Math.max(');

      // Safely evaluate the expression using Function constructor
      // This is safe because we've only allowed numbers and basic math
      const evalFunc = new Function('return (' + processed + ')');
      const result = evalFunc();

      if (typeof result !== 'number' || isNaN(result)) {
        return 10; // Default fallback
      }

      return result;
    } catch (error) {
      console.error('Error evaluating formula:', formula, 'with data:', data, 'Error:', error);
      return 10; // Default fallback on error
    }
  }

  evaluateSync() {
    // Evaluate the formula with data
    this._total = this._evaluateFormula(this.formula, this.data);
   
   // Create terms array for critical state detection
   // This mimics the structure of a real Foundry Roll object
   this.terms = [{
     results: [{ result: this._total }]
   }];
   
   return this;
  }

  async evaluate() {
    return this.evaluateSync();
  }

  get total() {
    return this._total;
  }

  set total(value) {
    this._total = value;
  }
};

// Enhance MockTypeDataModel to properly initialize schema defaults
const OriginalMockTypeDataModel = global.foundry.abstract.TypeDataModel;
global.foundry.abstract.TypeDataModel = class EnhancedMockTypeDataModel extends OriginalMockTypeDataModel {
  constructor(data = {}) {
    // Call parent constructor first
    super(data);
    
    // Initialize schema defaults if defineSchema is defined
    if (this.constructor.defineSchema) {
      const schema = this.constructor.defineSchema();
      this._initializeSchemaDefaults(schema, data);
    }
  }
  
  _initializeSchemaDefaults(schema, data) {
    // Recursively initialize schema defaults and apply data values
    if (!schema) return;
    
    const fields = global.foundry.data.fields;
    for (const [key, field] of Object.entries(schema)) {
      // First, check if data has a value for this key
      const hasDataValue = data && key in data;
      
      if (field instanceof fields.SchemaField) {
        // Initialize nested schema fields
        if (!this[key]) {
          this[key] = {};
        }
        this._initializeSchemaDefaults(field.fields || field.schema, hasDataValue ? data[key] : {});
      } else if (field instanceof fields.ArrayField) {
        // Initialize array fields with data or default
        if (hasDataValue) {
          this[key] = data[key];
        } else if (this[key] === undefined) {
          this[key] = field.options && field.options.initial !== undefined ? field.options.initial : [];
        }
      } else {
        // Initialize simple fields with data value or default
        const defaultValue = field.options && field.options.initial !== undefined ? field.options.initial : field.initial;
        if (hasDataValue) {
          this[key] = data[key];
        } else if (this[key] === undefined && defaultValue !== undefined) {
          this[key] = defaultValue;
        }
      }
    }
  }
};

// Set up global test utilities
global.testUtils = {
  /**
   * Create a mock actor with default data
   */
  createMockActor: (overrides = {}) => ({
    id: 'test-actor-id',
    name: 'Test Actor',
    type: 'character',
    system: {
      abilities: {
        acro: { value: 0, override: false, transform: 0, change: 0 },
        phys: { value: 0, override: false, transform: 0, change: 0 },
        fort: { value: 0, override: false, transform: 0, change: 0 },
        will: { value: 0, override: false, transform: 0, change: 0 },
        wits: { value: 0, override: false, transform: 0, change: 0 }
      },
      resources: {
        resolve: { value: 10, max: 10 },
        power: { value: 5, max: 5 }
      },
      level: { value: 1 }
    },
    ...overrides
  }),

  /**
   * Create a mock item with default data
   */
  createMockItem: (overrides = {}) => ({
    id: 'test-item-id',
    name: 'Test Item',
    type: 'gear',
    system: {
      description: 'A test item',
      roll: {
        formula: '1d20',
        type: 'roll'
      }
    },
    ...overrides
  }),

  /**
   * Mock a dice roll result
   */
  createMockRoll: (total = 10, dice = [10], formula = '1d20') => ({
    total,
    dice: [{ results: dice.map(r => ({ result: r, active: true })) }],
    formula,
    terms: [
      {
        number: 1,
        faces: 20,
        results: dice.map(r => ({ result: r, active: true }))
      }
    ]
  }),

  /**
   * Wait for next tick (useful for async testing)
   */
  nextTick: () => new Promise(resolve => setTimeout(resolve, 0))
};

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
});
