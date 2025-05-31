# Developer Guide

This guide is for developers who want to extend, modify, or contribute to the Eventide RP System. It covers the system architecture, development setup, and best practices for customization.

## System Architecture

### Overview

The Eventide RP System is built using modern Foundry VTT v13+ APIs and follows a modular architecture:

```
eventide-rp-system/
├── module/                 # Core system logic
│   ├── data/              # Data models and schemas
│   ├── documents/         # Actor and Item document classes
│   ├── helpers/           # Utility functions and helpers
│   ├── services/          # System services (settings, hooks, etc.)
│   ├── ui/                # User interface components
│   └── utils/             # General utilities
├── templates/             # Handlebars templates
├── css/                   # Compiled CSS (from SCSS)
├── src/scss/              # SCSS source files
├── lang/                  # Localization files
└── assets/                # Images, sounds, and other assets
```

### Key Technologies

- **Foundry VTT v13+**: Latest Application V2 architecture
- **ES6 Modules**: Modern JavaScript with import/export
- **Handlebars**: Template engine for UI
- **SCSS**: CSS preprocessing with BEM methodology
- **DataModels**: Foundry's schema-based data system

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

### Data Models

#### Actor Data Models

Located in `module/data/`, these define the schema for character data:

```javascript
// module/data/base-actor.mjs
export default class EventideRpSystemActorBase extends foundry.abstract
  .TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};

    // Define abilities schema
    schema.abilities = new fields.SchemaField(
      Object.keys(CONFIG.EVENTIDE_RP_SYSTEM.abilities).reduce(
        (obj, ability) => {
          obj[ability] = new fields.SchemaField({
            value: new fields.NumberField({
              required: true,
              integer: true,
              initial: 1,
            }),
            total: new fields.NumberField({
              required: true,
              integer: true,
              initial: 1,
            }),
            // ... more fields
          });
          return obj;
        },
        {},
      ),
    );

    return schema;
  }
}
```

#### Item Data Models

Define schemas for different item types:

```javascript
// module/data/item-gear.mjs
export default class EventideRpSystemGear extends foundry.abstract
  .TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      description: new fields.HTMLField(),
      quantity: new fields.NumberField({
        required: true,
        integer: true,
        initial: 1,
      }),
      equipped: new fields.BooleanField({ initial: true }),
      // ... more fields
    };
  }
}
```

### Document Classes

#### Actor Documents

Extend Foundry's Actor class with system-specific functionality:

```javascript
// module/documents/actor.mjs
export default class EventideRpSystemActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();

    // Calculate derived values
    for (const [key, ability] of Object.entries(this.system.abilities)) {
      ability.total = ability.value + ability.change + ability.transform;
      ability.ac = ability.total + 11;
    }
  }

  async rollAbility(abilityId, options = {}) {
    // Custom rolling logic
    const ability = this.system.abilities[abilityId];
    const roll = new Roll(`1d20 + ${ability.total}`, this.getRollData());
    return roll.evaluate();
  }
}
```

### UI Components

#### Application V2 Sheets

Modern Foundry applications using the new architecture:

```javascript
// module/ui/sheets/actor-sheet.mjs
export class EventideRpSystemActorSheet extends foundry.applications.sheets
  .ActorSheetV2 {
  static DEFAULT_OPTIONS = {
    classes: ["eventide-sheet"],
    position: { width: 920, height: 950 },
    actions: {
      roll: this._onRoll,
      toggleGear: this._toggleGear,
      // ... more actions
    },
  };

  static PARTS = {
    header: {
      template: "systems/eventide-rp-system/templates/actor/header.hbs",
    },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    // ... more parts
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Add system-specific context
    context.config = CONFIG.EVENTIDE_RP_SYSTEM;
    context.abilities = this.actor.system.abilities;

    return context;
  }
}
```

### Services

#### Settings Service

Manages system configuration:

```javascript
// module/services/settings/settings.mjs
export const registerSettings = function () {
  game.settings.register("eventide-rp-system", "initativeFormula", {
    name: "SETTINGS.InitativeFormulaName",
    scope: "world",
    config: true,
    restricted: true,
    type: String,
    default:
      "1d@hiddenAbilities.dice.total + @statTotal.mainInit + @statTotal.subInit",
  });

  // ... more settings
};
```

#### Hook Services

Manage Foundry VTT hooks and events:

```javascript
// module/services/hooks/combat.mjs
export const initializeCombatHooks = function () {
  Hooks.on("createCombatant", async (combatant, options, userId) => {
    const settings = getCombatSettings();

    if (settings.autoRollNpcInitiative && combatant.actor.type === "npc") {
      await combatant.rollInitiative();
    }
  });
};
```

## Customization Patterns

### Adding New Item Types

1. **Create Data Model**:

```javascript
// module/data/item-custom.mjs
export default class EventideRpSystemCustom extends foundry.abstract
  .TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      customProperty: new fields.StringField({ initial: "" }),
      customNumber: new fields.NumberField({ initial: 0 }),
    };
  }
}
```

2. **Register in System**:

```javascript
// module/eventide-rp-system.mjs
CONFIG.Item.dataModels.custom = models.EventideRpSystemCustom;
```

3. **Create Templates**:

```handlebars
{{! templates/item/custom.hbs }}
<div class="custom-item">
  <input name="system.customProperty" value="{{system.customProperty}}" />
  <input
    name="system.customNumber"
    value="{{system.customNumber}}"
    type="number"
  />
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
      // Custom action implementation
      const roll = await this.rollAbility("wits", options);
      // Handle results
    }
  };

// Apply mixin to actor class
export default class EventideRpSystemActor extends CustomActorMixin(Actor) {
  // Actor implementation
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

    // Perform custom logic
    await actor.performCustomAction();
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
  // Implementation
}
```

### Error Handling

The Eventide RP System includes a comprehensive error handling library (`module/utils/error-handler.mjs`) that provides consistent error management throughout the system.

#### ErrorHandler Class

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

#### Error Types

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

#### Specialized Error Handlers

##### Document Operations

```javascript
// Handle Foundry document operations
const [actor, error] = await ErrorHandler.handleDocumentOperation(
  Actor.create(actorData),
  "create actor",
  "actor",
);
```

##### Sheet Rendering

```javascript
// Handle sheet rendering errors
const [rendered, error] = await ErrorHandler.handleSheetRender(
  this.render(true),
  "Character Sheet",
);
```

##### Validation

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

#### Safe Execution

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

#### Assertions and Preconditions

```javascript
// Assert conditions with proper error handling
ErrorHandler.assert(
  actor.type === "character",
  "Operation requires character actor",
  ErrorHandler.ERROR_TYPES.VALIDATION,
);
```

#### Validation Helpers

```javascript
// Create validation error objects
const validationError = ErrorHandler.createValidationError([
  "Name is required",
  "Value must be positive",
]);

// Create success result
const validationSuccess = ErrorHandler.createValidationSuccess();
```

#### Integration with Logger

The ErrorHandler integrates with the system's Logger service for structured logging:

```javascript
// Errors are automatically logged with context
const [result, error] = await ErrorHandler.handleAsync(operation(), {
  context: "Important Operation",
  errorType: ErrorHandler.ERROR_TYPES.DATA,
});
// Logs: "ERROR | Error in Important Operation: [error details]"
```

#### Best Practices

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
