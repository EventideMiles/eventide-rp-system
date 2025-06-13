# Developer Guide

This guide is for developers who want to extend, modify, or contribute to the Eventide RP System. It covers the system architecture, development setup, and best practices for customization.

## Table of Contents

- [System Architecture](#system-architecture)
- [Design Patterns](#design-patterns)
- [Development Setup](#development-setup)
- [Core Components](#core-components)
- [Theme System Architecture](#theme-system-architecture)
- [Error Handling Architecture](#error-handling-architecture)
- [Migration Strategy](#migration-strategy)
- [Development Guidelines](#development-guidelines)
- [Testing and Quality Assurance](#testing-and-quality-assurance)
- [Contributing Guidelines](#contributing-guidelines)
- [Advanced Topics](#advanced-topics)
- [Known Issues and Workarounds](#known-issues-and-workarounds)
- [Resources and References](#resources-and-references)

## System Architecture

### Overview

The Eventide RP System is built using modern Foundry VTT v13+ APIs and follows a modular architecture with clear separation of concerns:

```
eventide-rp-system/
├── module/                 # Core system logic
│   ├── data/              # Data models and schemas
│   │   ├── base-model.mjs      # Base data model class
│   │   ├── base-actor.mjs      # Base actor functionality
│   │   ├── base-item.mjs       # Base item functionality
│   │   └── item-*.mjs          # Specific item type models
│   ├── documents/         # Foundry document classes
│   │   ├── actor.mjs          # Actor document class
│   │   ├── item.mjs           # Item document class
│   │   └── mixins/            # Reusable functionality mixins
│   ├── helpers/           # UI helpers and utilities
│   │   ├── theme/             # Modular theme management
│   │   ├── color-pickers.mjs  # Color picker functionality
│   │   ├── number-inputs.mjs  # Enhanced number inputs
│   │   └── *.mjs              # Other UI helpers
│   ├── services/          # Core system services
│   │   ├── hooks/             # Foundry hook handlers
│   │   ├── managers/          # System managers
│   │   ├── settings/          # Settings management
│   │   └── logger.mjs         # Centralized logging
│   ├── ui/                # User interface components
│   │   ├── sheets/            # Application V2 actor and item sheets
│   │   ├── creators/          # Macro creator applications
│   │   ├── popups/            # Dialog and popup applications
│   │   ├── components/        # Reusable UI components
│   │   └── mixins/            # UI functionality mixins
│   ├── utils/             # Utility functions
│   │   ├── error-handler.mjs  # Error handling utilities
│   │   ├── error-patterns.mjs # Standardized error patterns
│   │   └── *.mjs              # Other utilities
│   └── eventide-rp-system.mjs # Main system entry point
├── templates/             # Handlebars templates
├── css/                   # Compiled CSS (from SCSS)
├── src/scss/              # SCSS source files
├── lang/                  # Localization files
├── macros/                # System macro files
├── packs/                 # Compendium data
└── assets/                # Images, sounds, and other assets
```

### Core Principles

1. **Modular Design** - Functionality is organized into focused, reusable modules
2. **Separation of Concerns** - Clear boundaries between data, UI, and business logic
3. **Consistent Error Handling** - Standardized error patterns throughout the system
4. **Theme Management** - Comprehensive theming system for customization
5. **Performance** - Optimized for smooth gameplay experience

### Key Technologies

- **Foundry VTT v13+**: Latest Application V2 architecture
- **ES6 Modules**: Modern JavaScript with import/export
- **Handlebars**: Template engine for UI
- **SCSS**: CSS preprocessing with BEM methodology
- **DataModels**: Foundry's schema-based data system
- **Mixin Pattern**: Compositional architecture for actors

## Design Patterns

### Mixin Pattern

The system extensively uses mixins to compose functionality, particularly for actors:

```javascript
// module/documents/actor.mjs
import {
  ActorTransformationMixin,
  ActorResourceMixin,
  ActorRollsMixin,
} from "./mixins/_module.mjs";

export class EventideRpSystemActor extends ActorTransformationMixin(
  ActorResourceMixin(ActorRollsMixin(Actor)),
) {
  // Actor implementation with composed functionality
}
```

**Benefits:**
- **Separation of Concerns**: Each mixin handles specific functionality
- **Reusability**: Mixins can be applied to different base classes
- **Maintainability**: Changes to specific features are isolated
- **Avoids deep inheritance hierarchies**
- **Enables composition over inheritance**

### Module Pattern

Each major feature area is organized as a module with clear exports:

```javascript
// module/helpers/_module.mjs
export * from "./color-pickers.mjs";
export * from "./theme/_module.mjs";
// ... other exports
```

**Benefits:**
- Clear dependency management
- Easy to import specific functionality
- Supports tree-shaking for performance

### Error Handling Pattern

Standardized error handling using the ErrorHandler class and patterns:

```javascript
import { ErrorPatterns } from "../utils/error-patterns.mjs";

// Consistent error handling
const [result, error] = await ErrorPatterns.documentOperation(
  actor.update(data),
  "update actor",
  "character"
);
```

## Development Setup

### Prerequisites

- **Node.js 18+**: For build tools and development dependencies
- **Foundry VTT v13.341+**: Development environment
- **Git**: Version control
- **Code Editor**: VS Code recommended with Foundry VTT extensions
  - **Prettier**: For code formatting
  - **Stylelint**: To warn you of style linting errors

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/EventideMiles/eventide-rp-system.git
   cd eventide-rp-system
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Link to Foundry**:

   ```bash
   # Create symlink in your Foundry systems directory
   ln -s /path/to/eventide-rp-system /path/to/foundry/Data/systems/eventide-rp-system
   ```

   OR

   **Place in Foundry**

   This is how I handle it since simlinks can be complicated with foundry: make sure you're NOT doing this for your production foundry server

4. **Build the system**:
   ```bash
   npm run build
   ```

### Development Scripts

- `npm run build`: Build CSS from SCSS and lang files from .json
  - `npm run build:lang`: build lang files from .json
  - `npm run build:css`: build css files from scss
- `npm run watch`: Watch for SCSS changes and rebuild
- `npm run lint`: Run ESLint on JavaScript file and Stylelint on SCSS files
  - `npm run lint:js`: Run ESLint on Javascript files
  - `npm run lint:css`: Run Stylelint on SCSS files'
  - `npm run lint:fix`: Attempt to fix linting errors automatically
- `npm run format`: Format code with Prettier
- `npm run release`: Build a zip release - should automatically select win or linux
  - `npm run release:win`: Build a zip release on a windows system in the releases folder
  - `npm run release:linux`: build a zip release on a linux system in the releases folder

## Core Components

### Data Management

The system uses Foundry's DataModel system for type-safe data schemas:

```javascript
export class EventideRpSystemCharacter extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      abilities: new foundry.data.fields.SchemaField({
        // ... ability definitions
      }),
      // ... other fields
    };
  }
}
```

### Document Classes

Custom document classes extend Foundry's base documents:

```javascript
export class EventideRpSystemActor extends Actor {
  // System-specific actor functionality
}
```

## Theme System Architecture

The theme system has been refactored into a modular architecture to eliminate theme flashing and provide comprehensive theming capabilities:

### Theme Modules

- **theme-instance.mjs** - Instance management and lifecycle
- **theme-applicator.mjs** - DOM manipulation and theme application
- **theme-events.mjs** - Event handling and global listeners
- **theme-presets.mjs** - Configuration presets for different sheet types

### Multi-Layer Theme Application

The system uses a three-layer approach to eliminate theme flashing:

1. **CSS-Based Default Theme** - Immediate application via CSS rules
2. **JavaScript Immediate Application** - Synchronous theme application when elements are available
3. **Dynamic Style Injection** - Runtime style injection with smooth transitions

### Usage

```javascript
import { initializeThemeManager } from "./helpers/theme/_module.mjs";

// Initialize theme management for a sheet
const themeManager = await initializeThemeManager(application, "CHARACTER_SHEET");
```

## Error Handling Architecture

### Error Handler Class

Centralized error handling with consistent patterns:

```javascript
import { ErrorHandler } from "./utils/error-handler.mjs";

// Handle async operations
const [result, error] = await ErrorHandler.handleAsync(
  someAsyncOperation(),
  {
    context: "Operation Description",
    userMessage: "User-friendly error message",
    errorType: ErrorHandler.ERROR_TYPES.VALIDATION
  }
);
```

### Error Patterns

Standardized patterns for common operations:

```javascript
import { ErrorPatterns, ValidationPatterns } from "./utils/error-patterns.mjs";

// Document operations
const [actor, error] = await ErrorPatterns.documentOperation(
  Actor.create(data),
  "create actor",
  "character"
);

// Validation
const validation = ValidationPatterns.validateRequired(data, ["name", "type"]);
```

## Migration Strategy

### Current Approach

The system currently does **not** include a migrations directory or migration system. This is an intentional architectural decision based on the following considerations:

#### Why No Migrations Directory

1. **Foundry's Built-in Migration** - Foundry VTT provides its own migration system through the `system.json` version field and `migrate()` methods on documents.

2. **Data Model Evolution** - The system uses Foundry's DataModel system which handles schema evolution automatically in many cases.

3. **Simplicity** - Avoiding custom migration complexity reduces maintenance burden and potential for data corruption.

4. **Version Control** - System updates are handled through Foundry's package management system.

#### Future Migration Strategy

If migrations become necessary, the recommended approach would be:

1. **Create migrations directory** when the first migration is needed
2. **Use Foundry's migration hooks** (`migrateWorldData`, `migrateActorData`, etc.)
3. **Version-based migrations** using semantic versioning
4. **Rollback capabilities** for critical migrations

```javascript
// Future migration structure (when needed)
module/
└── migrations/
    ├── _module.mjs           # Migration system exports
    ├── migration-manager.mjs # Migration orchestration
    └── versions/
        ├── 1.0.0.mjs        # Version-specific migrations
        └── 1.1.0.mjs
```

### Data Compatibility

The system maintains backward compatibility through:

- **Conservative schema changes** - Additive rather than breaking changes
- **Default values** - Sensible defaults for new fields
- **Graceful degradation** - System continues to function with older data

## Development Guidelines

### Code Organization

1. **Single Responsibility** - Each module should have a clear, focused purpose
2. **Consistent Naming** - Use descriptive names following established conventions
3. **Documentation** - All public APIs should be documented with JSDoc
4. **Error Handling** - Use standardized error patterns throughout

### Performance Considerations

1. **Lazy Loading** - Use dynamic imports for non-critical functionality
2. **Event Delegation** - Minimize event listeners through delegation
3. **DOM Optimization** - Batch DOM updates and avoid unnecessary manipulations
4. **Memory Management** - Clean up resources in cleanup methods

### Testing Strategy

1. **Unit Tests** - Test individual functions and classes
2. **Integration Tests** - Test module interactions
3. **Manual Testing** - Comprehensive testing in Foundry environment
4. **Performance Testing** - Monitor system performance impact

### Contribution Guidelines

1. **Follow existing patterns** - Maintain consistency with established code patterns
2. **Add documentation** - Update this document for architectural changes
3. **Error handling** - Use standardized error patterns
4. **Testing** - Include appropriate tests for new functionality

### Data Models

#### Actor Data Models

Located in `module/data/`, these define the schema for character data. The actual implementation is more complex than basic examples:

```javascript
// module/data/base-actor.mjs
import EventideRpSystemDataModel from "./base-model.mjs";

export default class EventideRpSystemActorBase extends EventideRpSystemDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const overrideInteger = { integer: true, required: false, nullable: true };
    const schema = {};

    // Resource pools
    schema.resolve = new fields.SchemaField({
      value: new fields.NumberField({
        ...requiredInteger,
        initial: 10,
        min: 0,
      }),
      max: new fields.NumberField({ ...requiredInteger, initial: 10, min: 1 }),
    });

    schema.power = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 5, min: 0 }),
      max: new fields.NumberField({
        required: true,
        initial: 5,
        min: 0,
      }),
    });

    // Core abilities with complex structure
    schema.abilities = new fields.SchemaField(
      Object.keys(CONFIG.EVENTIDE_RP_SYSTEM.abilities).reduce(
        (obj, ability) => {
          obj[ability] = new fields.SchemaField({
            value: new fields.NumberField({ ...requiredInteger, initial: 1 }),
            override: new fields.NumberField({
              ...overrideInteger,
              initial: null,
            }),
            transform: new fields.NumberField({
              ...requiredInteger,
              initial: 0,
            }),
            change: new fields.NumberField({ ...requiredInteger, initial: 0 }),
            total: new fields.NumberField({ ...requiredInteger, initial: 1 }),
            ac: new fields.NumberField({ ...requiredInteger, initial: 11 }),
            diceAdjustments: new fields.SchemaField({
              advantage: new fields.NumberField({
                ...requiredInteger,
                initial: 0,
              }),
              disadvantage: new fields.NumberField({
                ...requiredInteger,
                initial: 0,
              }),
              total: new fields.NumberField({
                ...requiredInteger,
                initial: 0,
              }),
              mode: new fields.StringField({
                required: false,
                initial: "",
              }),
            }),
          });
          return obj;
        },
        {},
      ),
    );

    // Hidden abilities for advanced mechanics
    schema.hiddenAbilities = new fields.SchemaField({
      dice: new fields.SchemaField({
        value: new fields.NumberField({
          ...requiredInteger,
          initial: 20,
          min: 0,
        }),
        total: new fields.NumberField({
          ...requiredInteger,
          initial: 20,
          min: 0,
        }),
        override: new fields.NumberField({ ...overrideInteger, initial: null }),
        change: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      }),
      // ... additional hidden abilities (cmax, cmin, fmin, fmax, vuln)
    });

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    // Derived data calculations happen here
  }
}
```

#### Item Data Models

Define schemas for different item types:

```javascript
// module/data/item-gear.mjs
import EventideRpSystemItemBase from "./base-item.mjs";

export default class EventideRpSystemGear extends EventideRpSystemItemBase {
  static LOCALIZATION_PREFIXES = [
    "EVENTIDE_RP_SYSTEM.Item.base",
    "EVENTIDE_RP_SYSTEM.Item.Gear",
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.equipped = new fields.BooleanField({
      required: true,
      initial: true,
    });

    schema.cursed = new fields.BooleanField({
      required: true,
      initial: false,
    });

    schema.quantity = new fields.NumberField({
      ...requiredInteger,
      initial: 1,
      min: 0,
    });

    schema.roll = new fields.SchemaField({
      type: new fields.StringField({
        initial: "roll",
        required: true,
        nullable: false,
        choices: ["roll", "flat", "none"],
      }),
      ability: new fields.StringField({
        required: true,
        nullable: false,
        choices: ["acro", "phys", "fort", "will", "wits", "unaugmented"],
        initial: "unaugmented",
      }),
      bonus: new fields.NumberField({ initial: 0 }),
      diceAdjustments: new fields.SchemaField({
        advantage: new fields.NumberField({ initial: 0, ...requiredInteger }),
        disadvantage: new fields.NumberField({
          initial: 0,
          ...requiredInteger,
        }),
        total: new fields.NumberField({ initial: 0, ...requiredInteger }),
      }),
    });

    return schema;
  }

  prepareDerivedData() {
    this.roll.diceAdjustments.total =
      this.roll.diceAdjustments.advantage -
      this.roll.diceAdjustments.disadvantage;
  }
}
```

### Document Classes

#### Actor Documents

The actor class uses mixin composition for functionality:

```javascript
// module/documents/actor.mjs
import { Logger } from "../services/logger.mjs";
import {
  ActorTransformationMixin,
  ActorResourceMixin,
  ActorRollsMixin,
} from "./mixins/_module.mjs";
import { getSetting } from "../services/_module.mjs";

export class EventideRpSystemActor extends ActorTransformationMixin(
  ActorResourceMixin(ActorRollsMixin(Actor)),
) {
  prepareData() {
    Logger.methodEntry("EventideRpSystemActor", "prepareData");
    super.prepareData();
    Logger.methodExit("EventideRpSystemActor", "prepareData");
  }

  async _onCreate(data, options, userId) {
    Logger.methodEntry("EventideRpSystemActor", "_onCreate", {
      actorName: data.name,
      actorType: data.type,
      userId,
    });

    await super._onCreate(data, options, userId);

    // Handle token linking and vision setup based on actor type
    try {
      // Get the default vision range from settings
      const visionRange = getSetting("defaultTokenVisionRange") || 50;

      if (data.type === "character") {
        // Characters should ALWAYS be linked to their tokens
        await this.update({
          "prototypeToken.actorLink": true,
          "prototypeToken.sight.enabled": true,
          "prototypeToken.sight.range": visionRange,
        });

        Logger.debug(
          `Auto-linked prototype token and enabled vision for character actor: ${this.name}`,
          { visionRange },
          "ACTOR_CREATION",
        );
      } else if (data.type === "npc") {
        // NPCs should ALWAYS be unlinked from their tokens
        await this.update({
          "prototypeToken.actorLink": false,
          "prototypeToken.sight.enabled": true,
          "prototypeToken.sight.range": visionRange,
        });

        Logger.debug(
          `Ensured prototype token is unlinked and enabled vision for NPC actor: ${this.name}`,
          { visionRange },
          "ACTOR_CREATION",
        );
      }
    } catch (error) {
      Logger.warn(
        `Failed to set prototype token configuration for ${data.type} actor: ${this.name}`,
        error,
        "ACTOR_CREATION",
      );
      // Don't throw the error - token configuration failure shouldn't prevent actor creation
    }

    Logger.methodExit("EventideRpSystemActor", "_onCreate");
  }

  // Additional methods provided by mixins:
  // - rollAbility() from ActorRollsMixin
  // - applyTransformation() from ActorTransformationMixin
  // - getResourcePercentages() from ActorResourceMixin
}
```

### UI Components

#### Application V2 Sheets

Modern Foundry applications using the new architecture:

```javascript
// module/ui/sheets/actor-sheet.mjs
import { CommonFoundryTasks } from "../../utils/_module.mjs";
import { erpsRollHandler, Logger } from "../../services/_module.mjs";
import { ErrorHandler } from "../../utils/error-handler.mjs";

const { api, sheets } = foundry.applications;

export class EventideRpSystemActorSheet extends api.HandlebarsApplicationMixin(
  sheets.ActorSheetV2,
) {
  constructor(options = {}) {
    Logger.methodEntry("EventideRpSystemActorSheet", "constructor", {
      actorId: options?.document?.id,
      actorName: options?.document?.name,
      actorType: options?.document?.type,
    });

    try {
      super(options);
      this.#dragDrop = this.#createDragDropHandlers();
      this.themeManager = null;

      Logger.debug(
        "Actor sheet initialized successfully",
        {
          sheetId: this.id,
          actorName: this.actor?.name,
          dragDropHandlers: this.#dragDrop?.length,
        },
        "ACTOR_SHEET",
      );
    } catch (error) {
      Logger.error("Failed to initialize actor sheet", error, "ACTOR_SHEET");
      throw error;
    }
  }

  static DEFAULT_OPTIONS = {
    classes: ["eventide-sheet", "eventide-sheet--scrollbars"],
    position: {
      width: 920,
      height: 950,
    },
    window: {
      controls: [
        // Custom window controls
        {
          action: "configureToken",
          icon: "fas fa-user-circle",
          label: "EVENTIDE_RP_SYSTEM.WindowTitles.ConfigureToken",
          ownership: "OWNER",
        },
        {
          action: "setSheetTheme",
          icon: "fas fa-palette",
          label: "EVENTIDE_RP_SYSTEM.WindowTitles.SheetTheme",
          ownership: "OWNER",
        },
      ],
    },
    actions: {
      onEditImage: this._onEditImage,
      viewDoc: this._viewDoc,
      createDoc: this._createDoc,
      deleteDoc: this._deleteDoc,
      toggleEffect: this._toggleEffect,
      roll: this._onRoll,
      toggleGear: this._toggleGear,
      // ... more actions
    },
    dragDrop: [
      {
        dragSelector:
          "[data-drag], .erps-data-table__row[data-item-id], .erps-data-table__row[data-document-class], .eventide-transformation-card[data-item-id]",
        dropSelector: null,
      },
    ],
    form: {
      submitOnChange: true,
    },
  };

  static PARTS = {
    header: {
      template: "systems/eventide-rp-system/templates/actor/header.hbs",
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    features: {
      template: "systems/eventide-rp-system/templates/actor/features.hbs",
    },
    biography: {
      template: "systems/eventide-rp-system/templates/actor/biography.hbs",
    },
    statuses: {
      template: "systems/eventide-rp-system/templates/actor/statuses.hbs",
    },
    gear: {
      template: "systems/eventide-rp-system/templates/actor/gear.hbs",
    },
    combatPowers: {
      template: "systems/eventide-rp-system/templates/actor/combat-powers.hbs",
    },
  };

  async _prepareContext(options) {
    Logger.methodEntry("EventideRpSystemActorSheet", "_prepareContext", {
      actorName: this.actor?.name,
      optionsParts: options?.parts,
    });

    try {
      const context = {
        editable: this.isEditable,
        owner: this.document.isOwner,
        limited: this.document.limited,
        actor: this.actor,
        system: this.actor.system,
        flags: this.actor.flags,
        config: CONFIG.EVENTIDE_RP_SYSTEM,
        tabs: this._getTabs(options.parts),
        fields: this.document.schema.fields,
        systemFields: this.document.system.schema.fields,
        // ... additional context preparation
      };

      return context;
    } catch (error) {
      Logger.error("Failed to prepare actor sheet context", error, "ACTOR_SHEET");
      throw error;
    }
  }
}
```

### Services

#### Settings Service

Manages system configuration. **Note**: There is a known spelling error in the setting name that is maintained for production compatibility:

```javascript
// module/services/settings/settings.mjs
import { EventideSheetHelpers } from "../../ui/_module.mjs";
import { erpsSoundManager, Logger } from "../_module.mjs";

export const registerSettings = function () {
  // NOTE: "initativeFormula" is intentionally misspelled for production compatibility
  // This setting name likely cannot be changed without breaking existing worlds
  game.settings.register("eventide-rp-system", "initativeFormula", {
    name: "SETTINGS.InitativeFormulaName",
    hint: "SETTINGS.InitativeFormulaHint",
    scope: "world",
    config: true,
    restricted: true,
    type: String,
    default:
      "1d@hiddenAbilities.dice.total + @statTotal.mainInit + @statTotal.subInit",
  });

  game.settings.register("eventide-rp-system", "initiativeDecimals", {
    name: "SETTINGS.InitiativeDecimalsName",
    hint: "SETTINGS.InitiativeDecimalsHint",
    scope: "world",
    config: true,
    restricted: true,
    type: Number,
    default: 2,
    range: {
      min: 0,
      max: 3,
      step: 1,
    },
  });

  // ... more settings
};
```

#### Logger Service

The system includes a comprehensive logging service for debugging and monitoring:

```javascript
// module/services/logger.mjs
export class Logger {
  static methodEntry(className, methodName, params = {}) {
    if (this.isDebugEnabled()) {
      console.log(`[ERPS] ENTRY | ${className}.${methodName}`, params);
    }
  }

  static methodExit(className, methodName, result = null) {
    if (this.isDebugEnabled()) {
      console.log(`[ERPS] EXIT | ${className}.${methodName}`, result);
    }
  }

  static debug(message, data = null, category = "GENERAL") {
    if (this.isDebugEnabled()) {
      console.log(`[ERPS] DEBUG | ${category} | ${message}`, data);
    }
  }

  static warn(message, error = null, category = "GENERAL") {
    console.warn(`[ERPS] WARN | ${category} | ${message}`, error);
  }

  static error(message, error = null, category = "GENERAL") {
    console.error(`[ERPS] ERROR | ${category} | ${message}`, error);
  }

  static isDebugEnabled() {
    return game.settings?.get("eventide-rp-system", "testingMode") || false;
  }
}
```

#### Hook Services

Manage Foundry VTT hooks and events:

```javascript
// module/services/hooks/combat.mjs
import { Logger } from "../logger.mjs";
import { getSetting } from "../settings/settings.mjs";

export const initializeCombatHooks = function () {
  Hooks.on("createCombatant", async (combatant, options, userId) => {
    Logger.methodEntry("CombatHooks", "createCombatant", {
      combatantId: combatant.id,
      actorType: combatant.actor?.type,
    });

    try {
      const settings = {
        autoRollNpcInitiative: getSetting("autoRollNpcInitiative"),
        hideNpcInitiativeRolls: getSetting("hideNpcInitiativeRolls"),
      };

      if (settings.autoRollNpcInitiative && combatant.actor.type === "npc") {
        await combatant.rollInitiative({
          messageOptions: {
            whisper: settings.hideNpcInitiativeRolls ? [game.user.id] : [],
          },
        });
      }
    } catch (error) {
      Logger.error("Failed to auto-roll NPC initiative", error, "COMBAT");
    }

    Logger.methodExit("CombatHooks", "createCombatant");
  });
};
```

## Error Handling System

The Eventide RP System includes a comprehensive error handling library (`module/utils/error-handler.mjs`) that provides consistent error management throughout the system.

### ErrorHandler Class

The `ErrorHandler` class provides centralized error handling with user notifications, structured logging, and categorization:

```javascript
import { ErrorHandler } from "./utils/error-handler.mjs";

// Wrap async operations with error handling
const [result, error] = await ErrorHandler.handleAsync(someAsyncOperation(), {
  context: "User Operation Description",
  userMessage: "Custom user-friendly message",
  showToUser: true,
  errorType: ErrorHandler.ERROR_TYPES.VALIDATION,
});

if (error) {
  // Handle error case
  return null;
}

// Use successful result
return result;
```

### Error Types

The system categorizes errors for better handling and logging:

```javascript
ErrorHandler.ERROR_TYPES = {
  VALIDATION: "validation", // Input validation errors
  NETWORK: "network", // Network/fetch errors
  PERMISSION: "permission", // Access/permission errors
  DATA: "data", // Data processing errors
  UI: "ui", // User interface errors
  FOUNDRY_API: "foundry_api", // Foundry VTT API errors
  UNKNOWN: "unknown", // Unclassified errors
};
```

### Specialized Error Handlers

#### Document Operations

```javascript
// Handle Foundry document operations
const [actor, error] = await ErrorHandler.handleDocumentOperation(
  Actor.create(actorData),
  "create actor",
  "actor",
);
```

#### Sheet Rendering

```javascript
// Handle sheet rendering errors
const [rendered, error] = await ErrorHandler.handleSheetRender(
  this.render(true),
  "Character Sheet",
);
```

#### Validation

```javascript
// Handle validation results
const validationResult = validateInput(data);
const isValid = ErrorHandler.handleValidation(
  validationResult,
  "Character Creation",
);

if (!isValid) {
  return; // Validation failed, user notified
}
```

### Safe Execution

For event handlers and UI callbacks that shouldn't throw:

```javascript
// Safely execute functions with error boundary
const result = ErrorHandler.safeExecute(
  riskyFunction,
  this, // context
  arg1,
  arg2, // arguments
);
```

### Integration with Logger

The ErrorHandler integrates with the system's Logger service for structured logging:

```javascript
// Errors are automatically logged with context
const [result, error] = await ErrorHandler.handleAsync(operation(), {
  context: "Important Operation",
  errorType: ErrorHandler.ERROR_TYPES.DATA,
});
// Logs: "ERROR | Error in Important Operation: [error details]"
```

## Customization Patterns

### Adding New Item Types

1. **Create Data Model**:

```javascript
// module/data/item-custom.mjs
import EventideRpSystemItemBase from "./base-item.mjs";

export default class EventideRpSystemCustom extends EventideRpSystemItemBase {
  static LOCALIZATION_PREFIXES = [
    "EVENTIDE_RP_SYSTEM.Item.base",
    "EVENTIDE_RP_SYSTEM.Item.Custom",
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.customProperty = new fields.StringField({ initial: "" });
    schema.customNumber = new fields.NumberField({ initial: 0 });

    return schema;
  }
}
```

2. **Register in System**:

```javascript
// module/data/_module.mjs
import EventideRpSystemCustom from "./item-custom.mjs";

export const models = {
  // ... existing models
  EventideRpSystemCustom,
};

// module/eventide-rp-system.mjs
import { models } from "./data/_module.mjs";

CONFIG.Item.dataModels.custom = models.EventideRpSystemCustom;
```

3. **Create Templates**:

```handlebars
{{! templates/item/custom.hbs }}
<div class="custom-item">
  {{formInput fields.customProperty value=system.customProperty name="system.customProperty"}}
  {{formInput fields.customNumber value=system.customNumber name="system.customNumber" type="number"}}
</div>
```

### Extending Actor Functionality

```javascript
// Custom mixin for additional actor capabilities
export const CustomActorMixin = (BaseClass) =>
  class extends BaseClass {
    calculateCustomStat() {
      // Custom calculation logic
      return this.system.abilities.phys.total * 2;
    }

    async performCustomAction(options = {}) {
      const [result, error] = await ErrorHandler.handleAsync(
        this.rollAbility("wits", options),
        {
          context: "Custom Action",
          errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
        }
      );

      if (error) {
        return null;
      }

      return result;
    }
  };

// Apply mixin to actor class
import { CustomActorMixin } from "./mixins/custom-actor-mixin.mjs";

export default class EventideRpSystemActor extends CustomActorMixin(
  ActorTransformationMixin(ActorResourceMixin(ActorRollsMixin(Actor)))
) {
  // Actor implementation with composed functionality
}
```

### Creating Custom Macros

```javascript
// Custom macro for specific functionality
async function customMacro() {
  const selected = canvas.tokens.controlled;

  if (!selected.length) {
    ui.notifications.warn("Please select a token first!");
    return;
  }

  for (const token of selected) {
    const actor = token.actor;

    // Use error handling for safety
    const [result, error] = await ErrorHandler.handleAsync(
      actor.performCustomAction(),
      {
        context: "Custom Macro Execution",
        userMessage: "Failed to perform custom action",
      }
    );

    if (error) {
      continue; // Skip this token and continue with others
    }

    // Handle successful result
    console.log(`Custom action result for ${actor.name}:`, result);
  }
}

// Register macro
game.macros.getName("Custom Macro")?.execute() || customMacro();
```

## SCSS and Styling

### Architecture

The system uses SCSS with BEM methodology for maintainable styles:

```scss
// src/scss/components/sheet/_character-sheet.scss
.eventide-sheet {
  &__header {
    display: flex;
    align-items: center;

    &--actor {
      background: var(--theme-accent);
    }
  }

  &__content {
    padding: 1rem;
  }
}

// BEM modifiers
.eventide-sheet--scrollbars {
  overflow-y: auto;
}
```

### Theme System

Themes are implemented using CSS custom properties:

```scss
// src/scss/global/_themes.scss
:root {
  // Default (blue) theme
  --theme-primary: #1e3a8a;
  --theme-accent: #3b82f6;
  --theme-text: #ffffff;
}

[data-theme="gold"] {
  --theme-primary: #92400e;
  --theme-accent: #f59e0b;
  --theme-text: #ffffff;
}
```

### Component Structure

```scss
// src/scss/components/_component-name.scss
.component-name {
  // Base styles

  &__element {
    // Element styles
  }

  &--modifier {
    // Modifier styles
  }

  // States
  &:hover,
  &:focus {
    // Interactive states
  }
}
```

## Localization

### Adding New Languages

1. **Create Language Folder With JSON in**:

```json
// lang/src/en/*.json
{
  "EVENTIDE_RP_SYSTEM": {
    "Ability": {
      "Acro": {
        "long": "Acrobacia",
        "abbr": "Acro"
      }
    }
  }
}
```

2. **Run `npm run build:lang` To Build Lang File**

3. **Register in System**:

```json
// system.json
{
  "languages": [
    {
      "lang": "en",
      "name": "English",
      "path": "lang/en.json"
    },
    {
      "lang": "es",
      "name": "Español",
      "path": "lang/es.json"
    }
  ]
}
```

### Localization Best Practices

- Use descriptive keys: `EVENTIDE_RP_SYSTEM.Actor.Attributes.Level.label`
- Group related strings: All ability-related strings under `Ability`
- Provide context in comments for translators
- Test with different languages to ensure UI layout works

## Testing and Quality Assurance

### Manual Testing Checklist

- [ ] Character creation and modification
- [ ] Combat mechanics and initiative
- [ ] Status effects application and removal
- [ ] Gear creation and equipment
- [ ] Macro functionality
- [ ] Settings configuration
- [ ] Theme switching
- [ ] Localization display

### Code Quality

```javascript
// Use JSDoc for documentation
/**
 * Calculate the total initiative for an actor
 * @param {Actor} actor - The actor to calculate initiative for
 * @param {Object} options - Additional options
 * @param {number} options.bonus - Bonus to add to initiative
 * @returns {Promise<number>} The calculated initiative value
 */
async function calculateInitiative(actor, { bonus = 0 } = {}) {
  const [result, error] = await ErrorHandler.handleAsync(
    actor.rollInitiative({ bonus }),
    {
      context: "Calculate Initiative",
      errorType: ErrorHandler.ERROR_TYPES.FOUNDRY_API,
    }
  );

  return result || 0;
}
```

### Best Practices

1. **Always use ErrorHandler for async operations**:

   ```javascript
   // Good
   const [result, error] = await ErrorHandler.handleAsync(promise);

   // Avoid
   try {
     const result = await promise;
   } catch (error) {
     console.error(error);
   }
   ```

2. **Provide meaningful context**:

   ```javascript
   const [updated, error] = await ErrorHandler.handleDocumentOperation(
     actor.update(data),
     "update character abilities",
     "actor",
   );
   ```

3. **Use appropriate error types**:

   ```javascript
   // UI-related errors
   ErrorHandler.handleAsync(promise, {
     errorType: ErrorHandler.ERROR_TYPES.UI,
   });

   // Validation errors
   ErrorHandler.handleValidation(result, "Form Validation");
   ```

4. **Leverage safe execution for event handlers**:
   ```javascript
   // In event handlers
   onClick(event) {
     return ErrorHandler.safeExecute(this._handleClick, this, event);
   }
   ```

## Contributing Guidelines

### Code Style

- Use ES6+ features (const/let, arrow functions, destructuring)
- Follow existing naming conventions
- Add JSDoc comments for public methods
- Use meaningful variable and function names
- Always use ErrorHandler for async operations
- Use Logger for debugging and monitoring

### Git Workflow

1. **Fork** the repository
2. **Create feature branch**: `git checkout -b feature/new-feature`
3. **Make changes** with clear, atomic commits
4. **Test thoroughly** before submitting
5. **Submit pull request** with detailed description

### Pull Request Guidelines

- **Clear title** describing the change
- **Detailed description** of what was changed and why
- **Test instructions** for reviewers
- **Screenshots** for UI changes
- **Breaking changes** clearly documented

## Advanced Topics

### Custom Roll Formulas

```javascript
// Extending the roll system
class CustomRoll extends Roll {
  constructor(formula, data, options = {}) {
    // Add custom roll logic
    super(formula, data, options);
  }

  async evaluate(options = {}) {
    const result = await super.evaluate(options);

    // Custom post-processing
    this.processCustomResults();

    return result;
  }
}
```

### Module Integration

```javascript
// Detecting and integrating with other modules
Hooks.once("ready", () => {
  if (game.modules.get("some-module")?.active) {
    // Integration logic
    integrateWithModule();
  }
});
```

### Performance Optimization

```javascript
// Debouncing frequent operations
const debouncedUpdate = foundry.utils.debounce(async (actor, updates) => {
  await actor.update(updates);
}, 100);

// Efficient data access
const cachedData = new Map();

function getCachedData(key) {
  if (!cachedData.has(key)) {
    cachedData.set(key, expensiveCalculation(key));
  }
  return cachedData.get(key);
}
```

## Known Issues and Workarounds

### Setting Name Spelling Error

**Issue**: The initiative formula setting is named `"initativeFormula"` (missing 'i') instead of `"initiativeFormula"`.

**Status**: This is a known issue that likely cannot be corrected without breaking existing worlds in production.

**Workaround**: When referencing this setting in code or documentation, use the actual (misspelled) name:

```javascript
// Correct usage (with spelling error)
const formula = game.settings.get("eventide-rp-system", "initativeFormula");

// Do NOT use (would break existing worlds)
const formula = game.settings.get("eventide-rp-system", "initiativeFormula");
```

**Impact**: This affects:
- Setting registration in `module/services/settings/settings.mjs`
- Setting retrieval in `module/eventide-rp-system.mjs`
- Localization keys in `lang/src/en/settings.json`

## Resources and References

### Foundry VTT Documentation

- [Application V2 Guide](https://foundryvtt.com/article/application-v2/)
- [Data Models](https://foundryvtt.com/article/data-models/)
- [System Development](https://foundryvtt.com/article/system-development/)

### Community Resources

- [Foundry VTT Discord](https://discord.gg/foundryvtt)
- [System Development Channel](https://discord.gg/foundryvtt)
- [Community Wiki](https://foundryvtt.wiki/)

### Development Tools

- [Foundry VTT Types](https://github.com/League-of-Foundry-Developers/foundry-vtt-types)
- [ESLint Config](https://github.com/League-of-Foundry-Developers/eslint-config-foundry)
- [VS Code Extensions](https://marketplace.visualstudio.com/search?term=foundry%20vtt)

## Next Steps

- **Study the codebase**: Explore existing implementations
- **Start small**: Begin with minor modifications or bug fixes
- **Join the community**: Participate in discussions and get feedback
- **Document changes**: Keep clear records of modifications
- **Share improvements**: Contribute back to the project

For specific implementation examples, see the existing codebase. For questions and support, reach out through the project's GitHub issues or community channels.
