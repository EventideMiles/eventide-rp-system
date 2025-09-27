# JSDoc Standards and Templates - Eventide RP System

## Overview

This document defines JSDoc standards and provides templates for documenting critical functions in the Eventide RP System. Proper documentation is essential for preventing accidental function removal and maintaining code quality.

## General Standards

### Critical Function Classification
- **PRIORITY 1**: Core game mechanics (rolling, data preparation, schemas)
- **PRIORITY 2**: UI handlers, resource management, validation
- **PRIORITY 3**: Helper functions, utilities, formatting

### Required Documentation Elements
All PRIORITY 1 functions must include:
- Detailed description with purpose
- All parameters with types and descriptions
- Return type and description
- Usage examples
- Error conditions
- Version/author information

## JSDoc Templates

### 1. Data Schema Methods

```javascript
/**
 * Define the data schema for [DocumentType] items.
 *
 * This schema defines the structure and validation rules for all [DocumentType]
 * data, including default values, field types, and validation constraints.
 * Schema changes require careful migration planning and version compatibility checks.
 *
 * @static
 * @returns {Object} The complete data schema definition
 * @property {StringField} fieldName - Description of what this field contains
 *
 * @example
 * // Access schema definition
 * const schema = EventideRpSystemActionCard.defineSchema();
 * console.log(schema.mode.choices); // ["attackChain", "savedDamage"]
 *
 * @throws {Error} If field validation fails during schema creation
 *
 * @since 13.15.0
 * @author Eventide RP System
 *
 * @critical This method defines core data structure. Modifications can break
 *          save compatibility and require migration scripts.
 */
static defineSchema() {
  // Implementation
}
```

### 2. Core Rolling Methods

```javascript
/**
 * Calculate and return the roll formula for a specific ability.
 *
 * Generates dice formulas considering ability scores, transformations,
 * advantages/disadvantages, and actor-specific modifiers. This is a critical
 * path for all dice rolling in the system.
 *
 * @param {Object} options - Rolling configuration options
 * @param {string} options.ability - Ability name (acro, phys, fort, will, wits)
 * @param {boolean} [options.advantage=false] - Whether to roll with advantage
 * @param {boolean} [options.disadvantage=false] - Whether to roll with disadvantage
 * @param {string} [options.rollType='normal'] - Type of roll (normal, advantage, disadvantage)
 *
 * @returns {string} The complete dice formula (e.g., "1d20+5")
 * @returns {null} If the ability cannot be rolled
 *
 * @example
 * // Standard ability roll
 * const formula = actor.getRollFormula({ ability: 'acro' });
 * // Returns: "1d20+3" (if acro total is 3)
 *
 * @example
 * // Advantage roll
 * const formula = actor.getRollFormula({
 *   ability: 'phys',
 *   advantage: true
 * });
 * // Returns: "2d20kh+4" (roll twice, keep highest)
 *
 * @throws {Error} If ability parameter is invalid
 * @throws {Error} If actor data is corrupted or missing
 *
 * @since 13.0.0
 * @author Eventide RP System
 *
 * @critical This method is used by ALL rolling mechanics in the system.
 *          Changes affect every dice roll and require extensive testing.
 */
getRollFormula({ability}) {
  // Implementation
}
```

### 3. Data Preparation Methods

```javascript
/**
 * Prepare derived data for this actor after base data preparation.
 *
 * Calculates total ability scores, armor classes, dice adjustments, and
 * other derived statistics. This method is called automatically by FoundryVTT
 * during data preparation cycles and is critical for character sheet accuracy.
 *
 * @override
 * @returns {void}
 *
 * @example
 * // Automatic call during data preparation
 * actor.prepareDerivedData();
 * // Results in calculated totals for abilities and resources
 *
 * @sideeffects
 * - Modifies actor.system.abilities[ability].total for all abilities
 * - Updates actor.system.abilities[ability].ac (armor class)
 * - Calculates actor.system.abilities[ability].diceAdjustments
 * - Updates actor.system.resources derived values
 *
 * @performance Called frequently during sheet updates and data changes.
 *             Should avoid heavy computations or async operations.
 *
 * @since 13.0.0
 * @author Eventide RP System
 *
 * @critical Core character data calculations. Errors here affect all
 *          character statistics and rolling mechanics.
 */
prepareDerivedData() {
  // Implementation
}
```

### 4. UI Event Handlers

```javascript
/**
 * Handle drop events on the actor sheet for items and effects.
 *
 * Processes drag and drop operations including item creation, action card
 * generation, and effect application. Validates permissions and handles
 * complex item embedding workflows.
 *
 * @async
 * @param {DragEvent} event - The drop event containing transferred data
 * @returns {Promise<Document|null>} The created/updated document, or null if cancelled
 *
 * @example
 * // Automatic call during drag/drop operations
 * // User drags Combat Power onto Character Sheet
 * // Results in action card creation with embedded combat power
 *
 * @throws {Error} If user lacks permission to modify the target actor
 * @throws {Error} If dropped data is malformed or invalid
 *
 * @permissions Requires OWNER permission on target actor
 *
 * @sideeffects
 * - May create new action cards
 * - May add items to actor inventory
 * - May apply status effects
 * - Triggers UI updates and sound effects
 *
 * @since 13.10.0
 * @author Eventide RP System
 *
 * @critical Core UI interaction. Failures disrupt primary user workflows.
 */
async _onDrop(event) {
  // Implementation
}
```

### 5. Complex Workflow Methods

```javascript
/**
 * Execute an action card workflow with all configured parameters.
 *
 * Handles the complete action card execution pipeline including repetitions,
 * resource management, embedded item execution, status effects, and
 * transformation applications. This is the most complex workflow in the system.
 *
 * @async
 * @param {Object} options - Execution configuration options
 * @param {Actor[]} [options.targets=[]] - Target actors for the action
 * @param {Object} [options.overrides={}] - Configuration overrides
 * @param {boolean} [options.skipResourceCheck=false] - Skip resource validation
 *
 * @returns {Promise<Object>} Execution results
 * @returns {Promise<Object>} result.success - Whether execution completed successfully
 * @returns {Promise<Object>} result.repetitions - Number of repetitions executed
 * @returns {Promise<Object>} result.damage - Total damage dealt/healed
 * @returns {Promise<Object>} result.statusEffects - Status effects applied
 * @returns {Promise<Object>} result.transformations - Transformations applied
 *
 * @example
 * // Execute action card on selected targets
 * const result = await actionCard.executeActionCard({
 *   targets: canvas.tokens.controlled.map(t => t.actor)
 * });
 * console.log(`Applied ${result.damage} damage over ${result.repetitions} repetitions`);
 *
 * @throws {Error} If actor lacks required resources
 * @throws {Error} If embedded item execution fails
 * @throws {Error} If target validation fails
 *
 * @permissions May require GM approval for unowned targets
 *
 * @performance Can be resource-intensive for high repetition counts.
 *             Includes automatic timing delays between repetitions.
 *
 * @sideeffects
 * - Consumes actor resources (resolve, power)
 * - May modify target actors (damage, status, transformations)
 * - Creates chat messages
 * - Triggers sound effects
 * - May advance initiative
 * - May reduce inventory quantities
 *
 * @since 13.15.0
 * @author Eventide RP System
 *
 * @critical Primary game mechanic. Failures affect core gameplay and
 *          can leave actors in inconsistent states.
 */
async executeActionCard(options = {}) {
  // Implementation
}
```

### 6. Service Layer Methods

```javascript
/**
 * Process and clean up resolved GM control messages.
 *
 * Automatically removes processed action approval messages from chat to
 * prevent clutter. Includes safety checks and bulk processing capabilities.
 *
 * @async
 * @param {Object} options - Cleanup configuration
 * @param {number} [options.maxAge=3600000] - Maximum message age in milliseconds (default: 1 hour)
 * @param {boolean} [options.force=false] - Force cleanup even if messages are recent
 *
 * @returns {Promise<number>} Number of messages cleaned up
 *
 * @example
 * // Clean up messages older than 1 hour
 * const cleaned = await gmControl.cleanupResolvedMessages();
 * console.log(`Cleaned up ${cleaned} resolved messages`);
 *
 * @permissions Requires GM permission
 *
 * @performance Processes all chat messages. Use maxAge to limit scope.
 *
 * @sideeffects
 * - Deletes chat messages from the game
 * - Updates system diagnostic counters
 *
 * @since 13.12.0
 * @author Eventide RP System
 *
 * @maintenance This method prevents chat log bloat and should be called
 *             periodically during longer game sessions.
 */
async cleanupResolvedMessages(options = {}) {
  // Implementation
}
```

### 7. Utility Functions

```javascript
/**
 * Determine critical hit and fumble states for a roll result.
 *
 * Analyzes dice roll results against actor-specific critical ranges to
 * determine if the roll is a critical hit, fumble, or normal result.
 *
 * @param {Object} options - Critical determination options
 * @param {Roll} options.roll - The evaluated Roll object
 * @param {Actor} options.actor - Actor whose critical ranges to use
 * @param {string} options.formula - Original roll formula
 * @param {boolean} [options.critAllowed=true] - Whether criticals are allowed
 *
 * @returns {Object} Critical state information
 * @returns {boolean} return.isCritical - True if roll is a critical hit
 * @returns {boolean} return.isFumble - True if roll is a fumble
 * @returns {string} return.criticalType - Type of critical ('natural' | 'range' | 'none')
 *
 * @example
 * // Check if a roll is critical
 * const roll = await new Roll('1d20+5').evaluate();
 * const critState = determineCriticalStates({
 *   roll,
 *   actor: game.actors.get('actor-id'),
 *   formula: '1d20+5'
 * });
 * if (critState.isCritical) {
 *   console.log('Critical hit!');
 * }
 *
 * @since 13.8.0
 * @author Eventide RP System
 *
 * @utility Used by rolling mechanics to enhance roll results with critical states.
 */
function determineCriticalStates(options) {
  // Implementation
}
```

## Documentation Standards

### Required JSDoc Tags

#### For All Critical Functions
- `@param` - All parameters with types and descriptions
- `@returns` - Return type and description
- `@example` - At least one usage example
- `@since` - Version when function was added
- `@author` - Author or system name

#### For PRIORITY 1 Functions (Additional)
- `@throws` - All possible error conditions
- `@critical` - Warning about importance and impact
- `@performance` - Performance considerations if relevant
- `@sideeffects` - All side effects and state changes

#### For UI and Async Functions
- `@async` - Mark async functions
- `@permissions` - Required permissions
- `@sideeffects` - UI updates, sound effects, etc.

#### For Service Functions
- `@maintenance` - Maintenance and operational notes
- `@permissions` - Required user roles

### Special Warnings

#### Use @critical for:
- Functions that affect save game compatibility
- Core game mechanics (rolling, data preparation)
- Functions whose removal would break major features
- Functions called by multiple other systems

#### Use @maintenance for:
- Cleanup functions
- Performance optimization functions
- System diagnostic functions

#### Use @performance for:
- Functions called frequently
- Functions with timing considerations
- Functions that may block UI

## Validation Rules

### ESLint Integration
The following ESLint rules will validate JSDoc:
- Require JSDoc for all exported functions
- Validate parameter documentation matches function signature
- Require @returns documentation for non-void functions
- Require @example for PRIORITY 1 functions

### Automated Checks
Pre-commit hooks will validate:
- All PRIORITY 1 functions have complete documentation
- Parameter types match function signatures
- Examples are syntactically valid JavaScript
- No functions marked @critical lack comprehensive documentation

## Migration Guide

### Updating Existing Functions
1. Identify function priority level
2. Select appropriate template
3. Document all parameters and return values
4. Add usage examples
5. Document error conditions
6. Add performance/side effect notes
7. Include version information

### New Function Requirements
All new functions must include appropriate JSDoc before code review approval. Use the templates above as starting points and customize for specific function requirements.

---

*This document is part of the comprehensive testing and documentation initiative to prevent accidental function removal and improve code maintainability.*