# Macro Guide for Game Masters

The Eventide RP System includes a powerful collection of macros that streamline game management and enhance the player experience. This guide covers all available macros and how to use them effectively.

## Macro Overview

### What are Macros?

Macros are automated scripts that perform complex tasks with a single click. In Eventide RP, they provide:

- **Content Creation**: Tools for making gear, effects, and other items
- **Game Management**: Utilities for damage, healing, and status management
- **Player Tools**: Simplified interfaces for common actions
- **Automation**: Streamlined workflows for repetitive tasks
- **Multiple Available**: For things like damage scripts and creators you can have many available that save information between uses to make it easier to keep things such as character colors and damage types available
  just add a "number" in the function call's options object and you're on your way to another creator / applicator

### Accessing Macros

1. **Open Compendiums** tab in the sidebar
2. **Find "ERPS Macros"** compendium
3. **Import desired macros** to your macro bar
4. **Execute macros** by clicking them or using hotkeys

### Technical Implementation

The macro system is built using Foundry VTT's Application V2 architecture and includes:

- **Creator Applications**: Located in `module/ui/creators/` for gear, effects, and transformations
- **Error Handling**: Comprehensive error management using the system's ErrorHandler
- **State Persistence**: Macro settings are saved between uses for convenience
- **Localization**: Full internationalization support for all macro interfaces

## Content Creation Macros

### Gear Creator

**Purpose**: Create equipment with mechanical effects and rich descriptions.

**Technical Details**: Implemented in `module/ui/creators/gear-creator.mjs` using Application V2 architecture.

#### **Basic Usage**

1. **Import** the Gear Creator macro
2. **Select a token** (optional - for direct application)
3. **Run the macro**
4. **Fill out the form**:
   - **Name**: Equipment name
   - **Description**: Rich text description with formatting
   - **Image**: Visual representation
   - **Colors**: Customize appearance
   - **Attributes**: Quantity, weight, cost, class

#### **Advanced Features**

- **Roll Settings**: Configure how the gear behaves when used
  - **Roll Type**: None, Roll, or Flat damage
  - **Ability**: Which ability to use for rolls (acro, phys, fort, will, wits, unaugmented)
  - **Modifiers**: Advantage/disadvantage settings
- **Effects**: Modify character abilities when equipped
- **Display Options**: Show icons on tokens
- **Equipment Status**: Whether gear starts equipped

#### **GM vs Player Mode**

- **GM Mode**: Full access to all features including cursed items
- **Player Mode**: Restricted feature set for player-created gear
- **Collaboration**: GMs can grant players access to create approved gear
- **Important Note**: Players will NOT have access to choose icons by default, make sure to give them permission if you want them to have file manager access and are giving them player mode tools.

#### **Best Practices**

- **Consistent Naming**: Use clear, searchable names
- **Balanced Effects**: Avoid overpowered bonuses
- **Rich Descriptions**: Use formatting for immersive text
- **Appropriate Images**: Choose thematic icons

### Effect Creator

**Purpose**: Create status effects and character features with ability modifications.

**Technical Details**: Implemented in `module/ui/creators/effect-creator.mjs` with comprehensive effect management.

#### **Basic Usage**

1. **Import** the Effect Creator macro
2. **Select a target** (optional - for immediate application)
3. **Run the macro**
4. **Configure the effect**:
   - **Name**: Clear, descriptive name
   - **Description**: Explanation of the effect
   - **Image**: Representative icon
   - **Type**: Status (temporary) or Feature (permanent)
   - **Character Effects**: The list of what the effect is going to DO when applied

#### **Effect Configuration**

- **Ability Modifications**: Bonuses/penalties to core abilities (acro, phys, fort, will, wits)
- **Resource Changes**: Affect Resolve or Power pools
- **Hidden Abilities**: Modify dice pools, critical ranges
- **Display Settings**: Token icons, colors, visibility

#### **Effect Types and Categories**

The system supports multiple effect modification types:

- **Add**: Cumulative bonuses/penalties
- **Override**: Replace base values entirely
- **Advantage**: Modify dice roll advantages
- **Disadvantage**: Modify dice roll disadvantages

#### **Common Use Cases**

- **Combat Conditions**: Poisoned, blessed, stunned
- **Environmental Effects**: Wet, cold, inspired
- **Character Features**: Background traits, racial abilities
- **Magical Effects**: Spell consequences, enchantments

#### **Advanced Techniques**

- **Conditional Effects**: Different versions for different situations
- **Stacking Considerations**: How multiple effects interact (IE: try not to use multiple "overrides" if possible, that is a category you should know what you're doing with it before application ideally)
- **Duration Planning**: Temporary vs permanent effects
- **Visual Consistency**: Coordinated colors and icons, character theme colors for effects applied by them

### Transformation Creator

**Purpose**: Create comprehensive character transformations with multiple effects.

**Technical Details**: Implemented in `module/ui/creators/transformation-creator.mjs` with advanced transformation management.

#### **Unique Features**

- **Size Changes**: Modify token size and scale (Tiny: 0.25, Small: 0.5, Medium: 1, Large: 2, etc.)
- **Resource Adjustments**: Temporary changes to Resolve/Power maximums
- **Embedded Combat Powers**: Include special abilities only available while transformed / limit player abilities in the event of a curse
- **Cursed Transformations**: Prevent player removal without GM intervention

#### **Configuration Options**

- **Basic Info**: Name, description, image
- **Size Setting**: Precise token scaling options
- **Resource Changes**: Positive or negative adjustments to maximum values
- **Combat Powers**: Drag and drop powers from other sources: you CANNOT edit them on these items at the moment so create them elsewhere
- **Effects**: Standard ability modifications using the same system as Effect Creator

#### **Use Cases**

- **Magical Polymorphs**: Animal forms, elemental shapes
- **Size Magic**: Enlarge/reduce spells
- **Racial Abilities**: Shapeshifting, alternate forms
- **Curses**: Unwilling transformations
- **Power States**: Rage, magical enhancement

## Game Management Macros

### Damage and Healing Macros

#### **Damage Targets**

**Purpose**: Apply damage to selected or targeted tokens.

**Usage**:

1. **Select or target** characters to affect
2. **Run the macro**
3. **Enter damage amount**
4. **Choose whether its a heal** (if applicable)
5. **Apply** to reduce Resolve (or increase in the event of a heal)

**Features**:

- **Multiple Targets**: Affect several characters at once
- **Damage Types**: Different categories for narrative purposes: this is why you can have as many damage macros as you desire
- **Chat Integration**: Automatic damage reports of what happened and to who
- **Sound Effects**: Audio feedback for damage application

#### **Restore Target**

**Purpose**: Heal characters and restore resources.

**Usage**:

1. **Select or target** characters to heal
2. **Run the macro**
3. **Choose restoration type**:
   - **Resolve**: Heal health/stamina
   - **Power**: Restore magical energy
   - **Both**: Full restoration
4. **Enter amount** or choose full healing

**Features**:

- **Flexible Healing**: Partial or complete restoration
- **Resource Selection**: Heal specific resources
- **Batch Processing**: Heal multiple characters
- **Visual Feedback**: Clear indication of healing applied

### Status Management Macros

#### **Change Target Status**

**Purpose**: Increment or decrement the effects of a status on a player.

**Usage**:

1. **Select or target** characters
2. **Run the macro**
3. **Choose action**:
   - **Modify change**: Change 'add' type effects
   - **Override change**: change 'override' type effects
   - **Advantage change**: change 'advantage' type effects
   - **Disadvantage change**: change 'disadvantage' type effects
4. **Choose mode**:
   - **Add**: Always increase the number in this type by the amount in the box (regardless of sign)
   - **Subtract**: Always decrease the number in this type by the amount in the box (regardless of sign)
   - **Intensify**: Drive the number further from 0 (negatives get more negative, positives get more positive)
   - **Weaken**: Drive the number closer to 0 (maxes out at -1 and 1 for purposes of not getting to a 0 effect unintentionally)

**Features**:

- **Effect Library**: Access to all created status effects
- **Mode Selection**: With the 4 categories and the modes you can always make sure it does what you want. I'd suggest sticking to intensify and weaken unless you have a good reason for using add / subtract on your operation.

### Utility Macros

#### **Gear Transfer**

**Purpose**: Move equipment between characters.

**Usage**:

1. **Select source** character (with gear)
2. **Target destination** character
3. **Run the macro**
4. **Choose items** to transfer
5. **Confirm transfer**

**Features**:

- **Selective Transfer**: Choose specific items
- **Quantity Management**: Transfer partial stacks
- **Automatic Updates**: Gear effects transfer appropriately
- **Loot Distribution**: Streamline treasure sharing

#### **Select Ability Roll**

**Purpose**: Make ability checks with custom modifiers.

**Technical Details**: Uses the actor's `rollAbility()` method from the ActorRollsMixin.

**Usage**:

1. **Select character** to roll for
2. **Run the macro**
3. **Choose ability** to roll (acro, phys, fort, will, wits, unaugmented)
4. **Add modifiers** (situational bonuses/penalties)
5. **Roll** and see results

**Features**:

- **All Abilities**: Access to all five core abilities plus unaugmented
- **Custom Modifiers**: Add circumstantial bonuses
- **Advantage/Disadvantage**: Apply roll modifications
- **Chat Integration**: Formatted results in chat
- **GM Use**: I've found most players use the individual macros since their bars aren't cluttered with creators / management macros

## Advanced Macro Techniques

### Customization and Modification

#### **Macro Settings**

Many macros remember your preferences:

- **Default Values**: Commonly used settings
- **Visual Preferences**: Colors, icons, layouts
- **Workflow Options**: Streamlined vs detailed interfaces

#### **Creating Variants**

- **Duplicate Macros**: Create specialized versions and give them a new number
- **Modify Parameters**: Adjust for specific use cases
- **Save Configurations**: Store different setups

### **Advanced Mode**

- **Extra Functionality**: The effect creators have an advanced mode that gives them more abilities to select from
- **Extra Complexity**: The extra abilities aren't used often and can lead to misuse so they're locked behind the advanced flag
- **Caution**: Use with caution and only for effects you REALLY want to be impacting things beyond the usual dice roll range and usual use cases (IE: making 7 your critical fail number and 13 your critical success number)

### Integration with Foundry Features

#### **Token Integration**

- **Selection Awareness**: Macros respond to selected tokens
- **Targeting System**: Use Foundry's targeting for precision
- **Visual Updates**: Automatic token updates when effects change

#### **Chat Integration**

- **Formatted Output**: Professional-looking results
- **Roll Integration**: Proper dice roll formatting
- **Whisper Options**: Private GM communications

#### **Compendium Integration**

- **Effect Libraries**: Store created effects for reuse
- **Gear Collections**: Organize equipment by theme or power level
- **Sharing**: Export/import macro creations

## Macro Management Best Practices

### Organization

#### **Macro Bar Setup**

- **Frequently Used**: Place common macros in easily accessible slots
- **Categorization**: Group related macros together
- **Hotkeys**: Assign keyboard shortcuts to essential macros

#### **Compendium Management**

- **Custom Collections**: Create themed compendiums for your content
- **Naming Conventions**: Use consistent, searchable names
- **Move Things**: Though the creators put what you make into automatic compendiums without management they'll become cluttered fast
- **Documentation**: Include usage notes in descriptions

### Workflow Optimization

#### **Session Preparation**

- **Pre-Create Effects**: Make status effects for planned encounters
- **Gear Preparation**: Create treasure and equipment in advance
- **Macro Testing**: Verify macros work with your content

#### **During Play**

- **Quick Access**: Keep essential macros readily available
- **Batch Operations**: Use macros for multiple targets when possible
- **Player Training**: Teach players to use appropriate macros

### Troubleshooting

#### **Common Issues**

- **Permission Errors**: Ensure proper token ownership
- **Missing Targets**: Verify selection/targeting before running macros
- **Effect Conflicts**: Check for overlapping or contradictory effects

#### **Error Recovery**

- **Undo Options**: Most macros can be reversed manually
- **Backup Plans**: Keep manual methods available
- **Documentation**: Note successful configurations for future use

## Player Access and Collaboration

### Player-Accessible Macros

#### **Gear Creator (Player Mode)**

- **Restricted Features**: Limited to basic gear creation. Limited to selected tokens.
- **GM Approval**: Requires GM oversight for balance
- **Collaborative Creation**: Work together on custom equipment

#### **Basic Utility Macros**

- **Ability Rolls**: Let players make custom ability checks
- **Simple Status**: Allow players to apply basic effects (with GM permission)

### Training Players

#### **Introduction Session**

- **Demonstrate Macros**: Show how each macro works
- **Practice Time**: Let players experiment safely
- **Guidelines**: Establish when and how players should use macros

#### **Ongoing Support**

- **Quick Reference**: Provide macro usage summaries
- **Troubleshooting**: Help players when macros don't work as expected
- **Feedback**: Gather input on macro usefulness and usability

## Technical Implementation Details

### Error Handling

All macros use the system's comprehensive ErrorHandler for robust error management:

```javascript
// Example from macro implementation
const [result, error] = await ErrorHandler.handleAsync(
  operation(),
  {
    context: "Macro Operation",
    userMessage: "Failed to complete macro action",
    errorType: ErrorHandler.ERROR_TYPES.UI,
  }
);

if (error) {
  return; // Error already handled and user notified
}
```

### Settings Integration

Macros integrate with system settings, including the initiative formula setting:

**Note**: The initiative formula setting has a known spelling error (`"initativeFormula"` instead of `"initiativeFormula"`) that is maintained for production compatibility. This does not affect macro functionality but is important for developers extending the system.

### Localization Support

All macro interfaces support the system's localization framework:

```javascript
// Localized text in macros
const title = game.i18n.localize("EVENTIDE_RP_SYSTEM.Macros.GearCreator.Title");
const hint = game.i18n.localize("EVENTIDE_RP_SYSTEM.Macros.GearCreator.Hint");
```

## Future Macro Development

### Upcoming Features

The macro system continues to evolve with new capabilities:

- **Enhanced Automation**: More sophisticated workflows
- **Better Integration**: Deeper Foundry VTT integration
- **User Customization**: More options for personalization

### Community Contributions

- **Macro Sharing**: Community-created macros and modifications
- **Feature Requests**: Suggest new macro functionality
- **Bug Reports**: Help improve existing macros

## Next Steps

- **Import Essential Macros**: Start with Gear Creator and Effect Creator
- **Practice**: Experiment with macro features in a test environment
- **Customize**: Adapt macros to your campaign's needs
- **Train Players**: Introduce appropriate macros to your group

For advanced macro techniques and custom development, see [Advanced Usage](../advanced-usage/README.md). For specific system features, see [System Features](../system-features/README.md).
