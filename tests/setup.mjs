// @ts-nocheck
/**
 * Vitest setup - runs before each test file
 */

// Import FoundryVTT mocks from @rayners/foundry-test-utils
import '@rayners/foundry-test-utils/dist/mocks/foundry-mocks.js';

// Expose foundry globally for modules that use bare 'foundry' identifier
globalThis.foundry = globalThis.foundry || {};
// Also expose as top-level foundry for backward compatibility
global.foundry = globalThis.foundry;

// Add foundry.documents.collections mock for Actor/Item sheet registration
if (!global.foundry.documents) {
  global.foundry.documents = {};
}
if (!global.foundry.documents.collections) {
  global.foundry.documents.collections = {
    Actors: class Actors {},
    Items: class Items {},
  };
}
if (!global.foundry.appv1) {
  global.foundry.appv1 = {};
}
if (!global.foundry.appv1.sheets) {
  global.foundry.appv1.sheets = {
    ActorSheet: class ActorSheet {},
    ItemSheet: class ItemSheet {},
  };
}

// Add missing foundry.applications.handlebars mock
if (!global.foundry.applications) {
  global.foundry.applications = {};
}
if (!global.foundry.applications.handlebars) {
  global.foundry.applications.handlebars = {
    renderTemplate: vi.fn(() => Promise.resolve('<div>Rendered Template</div>')),
    loadTemplates: vi.fn(() => Promise.resolve())
  };
}

// Ensure canvas has tokens property (library mock omits it)
if (global.canvas && !global.canvas.tokens) {
  global.canvas.tokens = { placeables: [] };
}

// Ensure CONFIG.EVENTIDE_RP_SYSTEM has baseline ability configuration.
// Individual tests may override with more specific values.
if (!global.CONFIG) global.CONFIG = {};
if (!global.CONFIG.EVENTIDE_RP_SYSTEM) {
  global.CONFIG.EVENTIDE_RP_SYSTEM = {
    abilities: {
      acro: 'EVENTIDE_RP_SYSTEM.Abilities.Acro',
      phys: 'EVENTIDE_RP_SYSTEM.Abilities.Phys',
      fort: 'EVENTIDE_RP_SYSTEM.Abilities.Fort',
      will: 'EVENTIDE_RP_SYSTEM.Abilities.Will',
      wits: 'EVENTIDE_RP_SYSTEM.Abilities.Wits',
    },
    hiddenAbilities: {
      dice: 'EVENTIDE_RP_SYSTEM.HiddenAbilities.Dice',
      cmax: 'EVENTIDE_RP_SYSTEM.HiddenAbilities.Cmax',
      cmin: 'EVENTIDE_RP_SYSTEM.HiddenAbilities.Cmin',
      fmax: 'EVENTIDE_RP_SYSTEM.HiddenAbilities.Fmax',
      fmin: 'EVENTIDE_RP_SYSTEM.HiddenAbilities.Fmin',
      vuln: 'EVENTIDE_RP_SYSTEM.HiddenAbilities.Vuln',
      powerMult: 'EVENTIDE_RP_SYSTEM.HiddenAbilities.PowerMult',
      resolveMult: 'EVENTIDE_RP_SYSTEM.HiddenAbilities.ResolveMult',
      healIncrease: 'EVENTIDE_RP_SYSTEM.HiddenAbilities.HealIncrease',
    },
  };
}

// Ensure CONST has ActiveEffect show-icon modes (Foundry V14)
if (!global.CONST) global.CONST = {};
if (!global.CONST.ACTIVE_EFFECT_SHOW_ICON) {
  global.CONST.ACTIVE_EFFECT_SHOW_ICON = {
    NEVER: 0,
    NONE: 0,
    CONDITIONAL: 1,
    HOVER: 1,
    ALWAYS: 2,
  };
}

// Ensure CONST has token display modes (Foundry V14)
if (!global.CONST.TOKEN_DISPLAY_MODES) {
  global.CONST.TOKEN_DISPLAY_MODES = {
    NONE: 0,
    CONTROL: 10,
    OWNER_HOVER: 20,
    OWNER: 30,
    HOVER: 40,
    ALWAYS: 50,
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
        enrichHTML: vi.fn(() => Promise.resolve('<p>Enriched</p>')),
        getDragEventData: vi.fn(() => ({
          type: 'Item',
          itemId: 'item123',
          actorId: 'actor123',
          data: { type: 'actionCard' },
        }))
      }
    }
  };
}

// Also add global TextEditor for modules that reference it directly from foundry scope
if (!global.TextEditor) {
  global.TextEditor = {
    enrichHTML: vi.fn((content => content)),
    implementation: {
      enrichHTML: vi.fn(() => Promise.resolve('<p>Enriched</p>')),
      getDragEventData: vi.fn(() => ({
        type: 'Item',
        itemId: 'item123',
        actorId: 'actor123',
        data: { type: 'actionCard' },
      }))
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

// Add/override foundry.utils mocks with working implementations.
// The @rayners/foundry-test-utils library provides empty vi.fn() stubs for
// several utils (getProperty, setProperty, etc.) that return undefined.
// Override them unconditionally with functional versions.
if (!global.foundry.utils) {
  global.foundry.utils = {};
}

global.foundry.utils.deepClone = function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
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

global.foundry.utils.mergeObject = function mergeObject(
  original,
  other = {},
  options = {},
) {
  const target = options.inplace === false ? JSON.parse(JSON.stringify(original)) : original;
  const sources = [other];

  for (const source of sources) {
    if (!source) continue;
    for (const key of Object.keys(source)) {
      const val = source[key];
      if (val === null || val === undefined) continue;
      if (
        typeof val === 'object' &&
        !Array.isArray(val) &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        mergeObject(target[key], val);
      } else {
        target[key] = val;
      }
    }
  }
  return target;
};

global.foundry.utils.randomID = function randomID() {
  return `id-${Math.random().toString(36).slice(2, 10)}`;
};

global.foundry.utils.getProperty = function getProperty(obj, path) {
  if (!obj || typeof path !== 'string') return undefined;
  return path.split('.').reduce((current, key) => {
    return current === null || current === undefined ? undefined : current[key];
  }, obj);
};

global.foundry.utils.setProperty = function setProperty(obj, path, value) {
  if (!obj || typeof path !== 'string') return false;
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof current[parts[i]] !== 'object' || current[parts[i]] === null) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
  return true;
};

global.foundry.utils.hasProperty = function hasProperty(obj, path) {
  return global.foundry.utils.getProperty(obj, path) !== undefined;
};

global.foundry.utils.duplicate = function duplicate(obj) {
  return global.foundry.utils.deepClone(obj);
};

global.foundry.utils.expandObject = function expandObject(obj) {
  const result = {};
  for (const key of Object.keys(obj || {})) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof current[parts[i]] !== 'object' || current[parts[i]] === null) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = obj[key];
  }
  return result;
};

global.foundry.utils.flattenObject = function flattenObject(obj, prefix = '') {
  const result = {};
  for (const key of Object.keys(obj || {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      Object.assign(result, flattenObject(obj[key], path));
    } else {
      result[path] = obj[key];
    }
  }
  return result;
};

global.foundry.utils.performIntegerSort = function performIntegerSort(array) {
  return array ? [...array].sort((a, b) => (a.sort || 0) - (b.sort || 0)) : [];
};

global.foundry.utils.getDocumentClass = function getDocumentClass(
  documentName,
) {
  if (documentName && global.CONFIG?.[documentName]?.documentClass) {
    return global.CONFIG[documentName].documentClass;
  }
  return class {};
};

global.foundry.utils.isNewerVersion = function isNewerVersion(v1, v2) {
  const p1 = String(v1).split('.').map(Number);
  const p2 = String(v2).split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const a = p1[i] || 0;
    const b = p2[i] || 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
};

global.foundry.utils.Collection = class MockCollection extends Map {
  constructor(entries) {
    super(entries);
  }
  find(fn) {
    for (const value of this.values()) {
      if (fn(value)) return value;
    }
    return undefined;
  }
  filter(fn) {
    const result = [];
    for (const value of this.values()) {
      if (fn(value)) result.push(value);
    }
    return result;
  }
  map(fn) {
    const result = [];
    for (const value of this.values()) {
      result.push(fn(value));
    }
    return result;
  }
};

global.foundry.utils.delay = function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  
  _initializeSchemaDefaults(schema, data, target = this) {
    // Recursively initialize schema defaults, filling in missing values on the
    // target object while preserving any values provided in data.
    if (!schema) return;

    const fields = global.foundry.data.fields;
    for (const [key, field] of Object.entries(schema)) {
      const hasDataValue = data && typeof data === 'object' && key in data;

      if (field instanceof fields.SchemaField) {
        const nestedSchema = field.fields || field.schema;
        // Use the provided data object if present; otherwise the existing
        // target value; otherwise a fresh object. This ensures provided
        // values are preserved while missing nested defaults get filled in.
        let nestedTarget;
        if (hasDataValue && typeof data[key] === 'object' && data[key] !== null) {
          nestedTarget = data[key];
          target[key] = nestedTarget;
        } else if (target[key] && typeof target[key] === 'object') {
          nestedTarget = target[key];
        } else {
          nestedTarget = {};
          target[key] = nestedTarget;
        }
        this._initializeSchemaDefaults(
          nestedSchema,
          nestedTarget,
          nestedTarget,
        );
      } else if (field instanceof fields.ArrayField) {
        // Initialize array fields with data or default
        if (hasDataValue) {
          target[key] = data[key];
        } else if (target[key] === undefined) {
          target[key] =
            field.options && field.options.initial !== undefined
              ? field.options.initial
              : [];
        }
      } else {
        // Initialize simple fields: provided data value takes priority,
        // then existing target value, then schema default.
        const defaultValue =
          field.options && field.options.initial !== undefined
            ? field.options.initial
            : field.initial;
        if (hasDataValue) {
          target[key] = data[key];
        } else if (target[key] === undefined && defaultValue !== undefined) {
          target[key] = defaultValue;
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

// Ensure game.i18n is properly mocked for format() calls
if (!global.game?.i18n) {
  global.game = { ...global.game, i18n: { format: vi.fn((key, _data) => key) } };
} else if (!global.game.i18n.format) {
  global.game.i18n.format = vi.fn((key, _data) => key);
}

// Mock performance.memory if not available (for Node.js environment)
/* eslint-disable no-undef */
if (typeof performance !== 'undefined' && !performance.memory) {
  Object.defineProperty(performance, 'memory', {
    value: {
      usedJSHeapSize: 50 * 1024 * 1024,
      totalJSHeapSize: 100 * 1024 * 1024,
      jsHeapSizeLimit: 200 * 1024 * 1024,
    },
    configurable: true,
  });
}
/* eslint-enable no-undef */

// Ensure ui.notifications is properly mocked
if (!global.ui?.notifications) {
  global.ui = { ...global.ui, notifications: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } };
} else if (!global.ui.notifications.warn) {
  global.ui.notifications.warn = vi.fn();
  global.ui.notifications.info = vi.fn();
  global.ui.notifications.error = vi.fn();
}

/**
 * Enhanced Roll mock that actually evaluates formulas.
 *
 * The default @rayners/foundry-test-utils Roll mock always returns total: 10
 * and lacks evaluateSync(), which breaks derived-data calculations. This
 * override substitutes @data references from rollData, resolves dice terms
 * deterministically (min roll per die), maps math helper functions, and
 * evaluates the resulting arithmetic expression.
 */
globalThis.Roll = class EnhancedMockRoll {
  constructor(formula, rollData = {}) {
    this.formula = formula;
    this.rollData = rollData;
    this.total = 0;
    this.dice = [];
    this.terms = [];
    this.results = [];
    this._evaluated = false;
  }

  _resolveValue(path) {
    const parts = path.split('.');
    let value = this.rollData;
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) return 0;
    }
    if (typeof value === 'number') return value;
    if (value && typeof value === 'object' && typeof value.total === 'number') {
      return value.total;
    }
    return 0;
  }

  _evaluate() {
    let formula = String(this.formula ?? '0');

    // Replace @path.to.value data references with resolved numbers
    formula = formula.replace(/@([\w.]+)/g, (match, path) =>
      String(this._resolveValue(path)),
    );

    // Resolve dice terms (NdM) deterministically: each die rolls its minimum (1)
    // Consume the full modifier suffix (kh1, kl2, etc.) so no trailing chars remain
    formula = formula.replace(
      /(\d+)d(\d+)(?:[khlo!]\d*)*/gi,
      (match, count) => String(parseInt(count, 10)),
    );

    // Map Foundry/math helper functions to their JS Math equivalents
    formula = formula
      .replace(/\bmax\s*\(/g, 'Math.max(')
      .replace(/\bmin\s*\(/g, 'Math.min(')
      .replace(/\bfloor\s*\(/g, 'Math.floor(')
      .replace(/\bceil\s*\(/g, 'Math.ceil(')
      .replace(/\bround\s*\(/g, 'Math.round(')
      .replace(/\babs\s*\(/g, 'Math.abs(')
      .replace(/\bsign\s*\(/g, 'Math.sign(')
      .replace(/\bpow\s*\(/g, 'Math.pow(')
      .replace(/\bsqrt\s*\(/g, 'Math.sqrt(');

    try {
       
      const result = new Function(`"use strict"; return (${formula});`)();
      this.total =
        typeof result === 'number' && !Number.isNaN(result) ? result : 0;
    } catch {
      this.total = 0;
    }

    this._evaluated = true;
    return this;
  }

  evaluateSync(_options) {
    return this._evaluate();
  }

  async evaluate(_options) {
    return this._evaluate();
  }

  static safeEvaluate(formula, rollData) {
    const roll = new globalThis.Roll(formula, rollData);
    return roll.evaluateSync();
  }

  static validate(formula) {
    return typeof formula === 'string' && formula.trim().length > 0;
  }
};

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
});
