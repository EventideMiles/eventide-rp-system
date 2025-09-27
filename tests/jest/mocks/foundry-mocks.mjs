// @ts-nocheck
/**
 * Comprehensive FoundryVTT API mocks for testing
 */
import { jest } from '@jest/globals';

// Mock the foundry data fields
global.foundry = {
  data: {
    fields: {
      StringField: class MockStringField {
        constructor(options = {}) {
          this.options = options;
        }
        static create(options) {
          return new this(options);
        }
      },
      NumberField: class MockNumberField {
        constructor(options = {}) {
          this.options = options;
        }
        static create(options) {
          return new this(options);
        }
      },
      BooleanField: class MockBooleanField {
        constructor(options = {}) {
          this.options = options;
        }
        static create(options) {
          return new this(options);
        }
      },
      ArrayField: class MockArrayField {
        constructor(element, options = {}) {
          this.element = element;
          this.options = options;
        }
        static create(element, options) {
          return new this(element, options);
        }
      },
      ObjectField: class MockObjectField {
        constructor(options = {}) {
          this.options = options;
        }
        static create(options) {
          return new this(options);
        }
      },
      SchemaField: class MockSchemaField {
        constructor(fields, options = {}) {
          this.fields = fields;
          this.options = options;
        }
        static create(fields, options) {
          return new this(fields, options);
        }
      },
      ColorField: class MockColorField {
        constructor(options = {}) {
          this.options = options;
        }
        static create(options) {
          return new this(options);
        }
      },
      HTMLField: class MockHTMLField {
        constructor(options = {}) {
          this.options = options;
        }
        static create(options) {
          return new this(options);
        }
      }
    }
  },
  abstract: {
    TypeDataModel: class MockTypeDataModel {
      static defineSchema() {
        return {};
      }

      prepareDerivedData() {
        // Mock implementation
      }

      getRollData() {
        return {};
      }
    },
    DataModel: class MockDataModel {
      constructor(data = {}) {
        Object.assign(this, data);
      }

      static defineSchema() {
        return {};
      }
    }
  },
  utils: {
    mergeObject: (target, source) => Object.assign(target, source),
    deepClone: obj => JSON.parse(JSON.stringify(obj)),
    isNewerVersion: () => false,
    getProperty: (object, key) => {
      return key.split('.').reduce((o, k) => o?.[k], object);
    },
    setProperty: (object, key, value) => {
      const keys = key.split('.');
      const lastKey = keys.pop();
      const target = keys.reduce((o, k) => o[k] = o[k] || {}, object);
      target[lastKey] = value;
    }
  }
};

// Create user object separately to avoid circular reference
const mockUser = {
  id: 'test-user-id',
  name: 'Test User',
  isGM: false,
  can: jest.fn(() => true),
  hasPermission: jest.fn(() => true),
  hasRole: jest.fn(() => true)
};

// Mock the game object
global.game = {
  // Settings system
  settings: {
    register: jest.fn(),
    get: jest.fn((module, setting) => {
      // Default returns based on known settings
      const defaults = {
        'eventide-rp-system': {
          testingMode: true,
          theme: 'default',
          soundsEnabled: false
        }
      };
      return defaults[module]?.[setting];
    }),
    set: jest.fn(),
    storage: new Map()
  },

  // User system
  user: mockUser,

  // Users collection
  users: {
    get: jest.fn(() => mockUser),
    find: jest.fn(() => mockUser),
    contents: [mockUser]
  },

  // i18n system
  i18n: {
    localize: jest.fn(key => key),
    format: jest.fn((key, data) => `${key} ${JSON.stringify(data)}`)
  },

  // Dice system
  dice: {
    roll: jest.fn(async formula => ({
      total: 10,
      formula,
      dice: [{ results: [{ result: 10 }] }]
    }))
  },

  // Chat system
  chat: {
    processMessage: jest.fn()
  },

  // Canvas system
  canvas: {
    ready: true,
    tokens: {
      controlled: [],
      get: jest.fn()
    },
    scene: {
      id: 'test-scene-id'
    }
  },

  // Actors collection
  actors: {
    get: jest.fn(),
    getName: jest.fn(),
    find: jest.fn(),
    contents: []
  },

  // Items collection
  items: {
    get: jest.fn(),
    getName: jest.fn(),
    find: jest.fn(),
    contents: []
  },

  // Macros collection
  macros: {
    getName: jest.fn(),
    get: jest.fn(),
    contents: []
  },

  // Packs (compendiums)
  packs: new Map(),

  // System information
  system: {
    id: 'eventide-rp-system',
    version: '13.15.1'
  }
};

// Mock CONFIG
global.CONFIG = {
  Actor: {
    documentClass: class MockActor {
      constructor(data = {}) {
        Object.assign(this, data);
      }

      static async create(data) {
        return new this(data);
      }
    }
  },
  Item: {
    documentClass: class MockItem {
      constructor(data = {}) {
        Object.assign(this, data);
      }

      static async create(data) {
        return new this(data);
      }
    }
  },
  Dice: {
    rolls: [],
    terms: {}
  }
};

// Mock ui notifications
global.ui = {
  notifications: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    notify: jest.fn()
  },
  chat: {
    scrollBottom: jest.fn()
  }
};

// Mock Hooks system
global.Hooks = {
  on: jest.fn(),
  once: jest.fn(),
  off: jest.fn(),
  call: jest.fn(),
  callAll: jest.fn()
};

// Mock Roll class
global.Roll = class MockRoll {
  constructor(formula = '1d20', data = {}) {
    this.formula = formula;
    this.data = data;
    this.total = 10;
    this.dice = [{ results: [{ result: 10 }] }];
  }

  async evaluate({ async: _async = true } = {}) {
    return this;
  }

  async roll() {
    return this;
  }

  async toMessage(_messageData = {}) {
    return { content: this.formula };
  }
};

// Mock ChatMessage
global.ChatMessage = {
  create: jest.fn()
};

// Mock Token class
global.Token = class MockToken {
  constructor(data = {}) {
    Object.assign(this, data);
  }
};

// Mock Application classes
global.Application = class MockApplication {
  constructor(options = {}) {
    this.options = options;
  }

  render(_force = false) {
    return this;
  }

  close() {
    return Promise.resolve();
  }
};

// Mock FormApplication
global.FormApplication = class MockFormApplication extends global.Application {
  constructor(object = {}, options = {}) {
    super(options);
    this.object = object;
  }

  getData() {
    return {};
  }

  _updateObject(_event, _formData) {
    return Promise.resolve();
  }
};

// Mock DocumentSheet
global.DocumentSheet = class MockDocumentSheet extends global.FormApplication {
  constructor(document, options = {}) {
    super(document, options);
    this.document = document;
  }
};

// Mock ActorSheet
global.ActorSheet = class MockActorSheet extends global.DocumentSheet {};

// Mock ItemSheet
global.ItemSheet = class MockItemSheet extends global.DocumentSheet {};

// Mock Dialog
global.Dialog = {
  confirm: jest.fn(() => Promise.resolve(true)),
  prompt: jest.fn(() => Promise.resolve('test-input'))
};

// Mock FilePicker
global.FilePicker = {
  browse: jest.fn(() => Promise.resolve({ target: 'test-path' }))
};

// Mock loadTemplates function
global.loadTemplates = jest.fn(() => Promise.resolve());

// Mock renderTemplate function
global.renderTemplate = jest.fn(() => Promise.resolve('<div>Rendered Template</div>'));

// Mock duplicate function
global.duplicate = obj => JSON.parse(JSON.stringify(obj));

// Mock mergeObject function
global.mergeObject = (target, source) => Object.assign(target, source);

// Mock setProperty and getProperty
global.setProperty = global.foundry.utils.setProperty;
global.getProperty = global.foundry.utils.getProperty;

// Mock CONST
global.CONST = {
  DOCUMENT_PERMISSION_LEVELS: {
    NONE: 0,
    LIMITED: 1,
    OBSERVER: 2,
    OWNER: 3
  },
  ACTIVE_EFFECT_MODES: {
    CUSTOM: 0,
    MULTIPLY: 1,
    ADD: 2,
    DOWNGRADE: 3,
    UPGRADE: 4,
    OVERRIDE: 5
  }
};

// Mock console methods to prevent spam during tests
if (!process.env.JEST_VERBOSE) {
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  };
}