# Transformations System

The Transformations system is one of the most powerful features in Eventide RP, introduced in version 13.1.0. It allows for comprehensive character changes that go far beyond simple status effects, enabling everything from magical polymorphs to barbarian rage states to vampiric transformations.

## Overview

### What are Transformations?

Transformations are comprehensive character modifications that can include:

- **Physical Changes**: Size modifications, token image changes, and visual alterations
- **Ability Adjustments**: Temporary changes to all character capabilities using "Transformation" type effects
- **Resource Modifications**: Adjustments to maximum and current Resolve and Power pools
- **Combat Power Integration**: Access to transformation-specific abilities
- **Cursed Variants**: Transformations that players cannot remove without GM intervention

### Key Differences from Status Effects

Unlike regular status effects, transformations:

- **Change token size and appearance** automatically
- **Include embedded combat powers** that are only available while transformed
- **Modify resource pools** (maximum Resolve and Power) in addition to current values
- **Use "Transformation" type effects** that stack differently with other modifications
- **Can be cursed** to prevent player removal

## Transformation Creator

### Getting Started

The Transformation Creator follows the pattern of other system creator applications, supporting both on-the-fly creation and preparation workflows.

#### **Basic Information**

- **Name**: The transformation's identifier (appears on character sheet when active)
- **Description**: Optional text shown to players when transformation is applied
  - If left blank, uses default transformation message
  - Supports rich text formatting for enhanced descriptions
- **Image**: New token image for the transformed character
  - Use `"icons/svg/ice-aura.svg"` or `"icons/svg/item-bag.svg"` to keep current token image
  - Perfect for size-only transformations or when visual change isn't needed

#### **Size Configuration**

The size system offers precise control over token scaling:

- **Tiny (0.5)**: Reduces token to 1/4 of a grid square
- **Small (0.75)**: Reduces image size but maintains minimum one-square footprint
- **Medium (1.0)**: Standard character size (one grid square)
- **Large (2.0)**: 2x2 grid squares
- **Huge (3.0)**: 3x3 grid squares
- **Gargantuan (4.0+)**: 4x4 or larger

**Half-step Sizing**: Values like 1.5, 2.5, etc. create intermediate sizes:

- **1.5**: Larger image that still fits on one square
- **2.5**: Between 2x2 and 3x3, but occupies 2x2 space
- Useful for creatures that are "almost" the next size category

#### **Resource Adjustments**

- **Resolve Adjustment**: Modifies maximum and current health/stamina
  - Positive values increase both current and maximum
  - Negative values decrease both (current cannot go below 1)
  - Applied immediately when transformation activates
- **Power Adjustment**: Modifies maximum and current magical energy
  - Functions identically to Resolve adjustments
  - Useful for transformations that enhance or drain magical capacity

#### **Cursed Transformations**

- **Purpose**: Prevents players from removing transformation themselves
- **Use Cases**:
  - Baleful polymorphs (unwilling transformations)
  - Duration-based effects that should only end at specific times
  - Curses that require special removal conditions
  - GM-controlled transformation timing
- **Removal**: Only GMs can remove cursed transformations

### Combat Powers Integration

#### **Unique Feature**

Unlike other item types, transformations can "hold" combat power items:

- **Drag and Drop**: Add powers from character sheets, items directory, or compendiums
- **Exclusive Access**: When transformed, ONLY these powers are available
- **Complete Replacement**: Character's normal combat powers are temporarily disabled
- **Preparation**: Powers must be added before transformation is applied

#### **Power Management**

- **Include Essential Powers**: Add any abilities the transformed character needs
- **Consider Power Costs**: Ensure character has sufficient Power resource for abilities
- **Balance Considerations**: Transformation powers should reflect the new form's capabilities
- **Removal Effects**: Powers disappear when transformation ends

#### **Advanced Techniques**

- **Disable All Powers**: Add a single useless power to completely disable combat abilities
  - Perfect for baleful polymorphs that remove character capabilities
  - Creates helpless states for dramatic effect
  - Forces reliance on basic abilities only

### Effects System

#### **Transformation Type Effects**

All ability modifications in transformations use "Transformation" type:

- **Add Mode Only**: Cannot use Override, Advantage, or Disadvantage modes
- **Stacking Behavior**: Transformation effects stack with other effect types
- **Limitation**: For complex modifications, combine with separate status effects
- **Integration**: Works seamlessly with other system effects

#### **Ability Modifications**

Configure how the transformation affects core abilities:

- **Positive Bonuses**: Enhance abilities for powerful forms
- **Negative Penalties**: Reduce abilities for restrictive transformations
- **Balanced Changes**: Mix bonuses and penalties for realistic transformations
- **Resource Synergy**: Consider how ability changes affect derived resources

## Using Transformations

### Application Methods

#### **Preparation Workflow**

1. **Create Without Target**: Use Transformation Creator with no token selected
2. **Storage**: Transformation saved to "Custom Transformations" compendium
3. **Later Application**: Drag from compendium to character sheet when needed
4. **Reusability**: Same transformation can be applied to multiple characters

#### **On-the-Fly Creation**

1. **Target Token**: Select character token before opening creator
2. **Immediate Application**: Transformation applies directly upon creation
3. **Spontaneous Use**: Perfect for unexpected story developments
4. **Quick Response**: Handle player actions that weren't anticipated

#### **Drag and Drop Application**

- **From Compendium**: Drag prepared transformations to character sheets
- **From Items Directory**: Apply transformations stored in world items
- **Visual Feedback**: Character sheet updates immediately show transformation status

### Managing Active Transformations

#### **Visual Indicators**

- **Character Sheet**: Transformation appears near character name (top right)
- **Reload Icon**: Arrow button allows removal of transformation
- **Token Changes**: Size and image update automatically
- **Status Integration**: Works alongside other status effects

#### **Removal Process**

1. **Player Removal**: Click reload arrow on character sheet (if not cursed)
2. **GM Override**: GMs can remove any transformation, including cursed ones
3. **Resource Handling**: Health and Power adjust to new maximums (see Advanced Usage)
4. **Power Restoration**: Normal combat powers return when transformation ends

## Transformation Examples

### Magical Polymorphs

#### **Wolf Form**

- **Size**: Medium (1.0) - maintains human size
- **Image**: Wolf token image
- **Resolve**: +5 (enhanced stamina)
- **Power**: -3 (reduced magical capacity)
- **Abilities**: +2 Physical, +1 Acrobatics, -2 Will, -1 Wits
- **Combat Powers**: Bite Attack, Pack Tactics, Enhanced Senses
- **Use Case**: Druid shapeshifting, lycanthropy

#### **Giant Eagle Form**

- **Size**: Large (2.0) - 2x2 token
- **Image**: Eagle token
- **Resolve**: +3 (robust avian form)
- **Power**: 0 (maintains magical capacity)
- **Abilities**: +3 Acrobatics, +1 Wits, -2 Physical, -1 Fortitude
- **Combat Powers**: Aerial Dive, Keen Sight, Talon Strike
- **Use Case**: Flight-capable transformation

### Size Magic

#### **Enlarge Person**

- **Size**: Large (2.0) - double size
- **Image**: Keep current (`icons/svg/ice-aura.svg`)
- **Resolve**: +10 (increased mass)
- **Power**: 0 (no magical change)
- **Abilities**: +3 Physical, -1 Acrobatics
- **Combat Powers**: None (retains normal abilities)
- **Use Case**: Classic enlargement spell

#### **Reduce Person**

- **Size**: Small (0.75) - half size
- **Image**: Keep current (`icons/svg/ice-aura.svg`)
- **Resolve**: -5 (reduced mass)
- **Power**: 0 (no magical change)
- **Abilities**: -2 Physical, +2 Acrobatics
- **Combat Powers**: None (retains normal abilities)
- **Use Case**: Shrinking magic, stealth enhancement

### Character States

#### **Barbarian Rage**

- **Size**: Medium (1.0) - no size change
- **Image**: Keep current or use rage-themed image
- **Resolve**: +15 (battle fury endurance)
- **Power**: -5 (reduced magical focus)
- **Abilities**: +3 Physical, +2 Fortitude, -2 Will, -1 Wits
- **Combat Powers**: Reckless Attack, Intimidating Shout, Berserker's Resilience
- **Use Case**: Class feature representation

#### **Vampiric Form**

- **Size**: Medium (1.0) - maintains size
- **Image**: Vampiric appearance token
- **Resolve**: +20 (undead resilience)
- **Power**: +10 (dark magical energy)
- **Abilities**: +2 Physical, +3 Will, +1 Wits, -2 Fortitude
- **Combat Powers**: Blood Drain, Charm, Shadow Step, Mist Form
- **Cursed**: Yes (cannot be removed by player)
- **Use Case**: Permanent character change, curse

### Baleful Transformations

#### **Bunny Polymorph**

- **Size**: Tiny (0.5) - helpless animal
- **Image**: Bunny token
- **Resolve**: -10 (fragile animal form)
- **Power**: -15 (severely reduced magical capacity)
- **Abilities**: -3 Physical, -2 Will, -2 Wits, +1 Fortitude (hardy animal)
- **Combat Powers**: Panic (useless power to disable normal abilities)
- **Cursed**: Yes (victim cannot remove)
- **Use Case**: Punishment, enemy spellcaster control

## Advanced Usage

### Resource Management

#### **Application Behavior**

When a transformation is applied:

1. **Immediate Adjustment**: Current and maximum resources change by specified amounts
2. **Minimum Values**: Current resources cannot drop below 1
3. **Overflow Handling**: If maximum decreases below current, current adjusts down
4. **Visual Updates**: Character sheet reflects new values immediately

#### **Removal Behavior**

When a transformation ends:

1. **Maximum Restoration**: Resource maximums return to base values
2. **Current Capping**: Current resources cap at new maximum (don't subtract adjustment)
3. **No Reduction**: Characters don't lose health/power equal to the bonus they gained
4. **Safety Mechanism**: Prevents transformation cycling from reducing resources

#### **Stacking Transformations**

When applying a new transformation while one is active:

1. **Difference Calculation**: System calculates the difference between transformations
2. **Net Adjustment**: Applies only the difference to current resources
3. **Positive Changes**: Increase current resources immediately
4. **Negative Changes**: Decrease current resources immediately
5. **Seamless Transition**: No resource loss from transformation switching

### Creative Applications

#### **Environmental Transformations**

- **Underwater Adaptation**: Breathing apparatus, swimming bonuses
- **Desert Survival**: Heat resistance, water conservation
- **Arctic Exploration**: Cold immunity, enhanced endurance
- **Planar Travel**: Resistance to planar effects, environmental adaptation

#### **Social Transformations**

- **Noble Disguise**: Enhanced social abilities, reduced physical capabilities
- **Beggar's Ruse**: Reduced presence, enhanced stealth and perception
- **Diplomatic Immunity**: Social bonuses, combat restrictions
- **Cultural Adaptation**: Language bonuses, cultural knowledge

#### **Magical Conditions**

- **Spell Overload**: Enhanced magical power, reduced physical capabilities
- **Mana Burn**: Reduced magical capacity, enhanced physical abilities
- **Arcane Sensitivity**: Magical perception bonuses, vulnerability to magic
- **Spell Resistance**: Magic immunity, reduced spellcasting ability

### Balancing Considerations

#### **Power Level Guidelines**

- **Minor Transformations**: ±1-2 ability points, small resource changes
- **Moderate Transformations**: ±3-4 ability points, moderate resource changes
- **Major Transformations**: ±5+ ability points, significant resource changes
- **Baleful Transformations**: Large penalties, minimal or no benefits

#### **Duration Considerations**

- **Temporary**: Short-term transformations for specific scenes
- **Extended**: Longer transformations for story arcs
- **Permanent**: Character-changing transformations (often cursed)
- **Conditional**: Transformations with specific trigger conditions

#### **Narrative Integration**

- **Story Relevance**: Transformations should serve the narrative
- **Player Agency**: Consider player choice in transformation effects
- **Consequence Management**: Plan for transformation aftermath
- **World Building**: Use transformations to reinforce setting themes

## Troubleshooting

### Common Issues

#### **Size Problems**

- **Token Overlap**: Use appropriate grid sizing for large transformations
- **Movement Issues**: Ensure pathfinding works with new token size
- **Scene Boundaries**: Verify large tokens fit within scene dimensions
- **Visual Clarity**: Avoid sizes that make tokens difficult to distinguish

#### **Resource Conflicts**

- **Negative Resources**: Monitor for transformations that reduce resources below safe levels
- **Power Costs**: Ensure transformed characters can afford their new combat powers
- **Stacking Effects**: Watch for unexpected interactions with other status effects
- **Removal Timing**: Plan transformation end timing to avoid resource problems

#### **Combat Power Issues**

- **Missing Powers**: Verify all necessary powers are included in transformation
- **Power Costs**: Check that power costs match character's available resources (post transformation)
- **Ability Requirements**: Ensure powers use abilities the transformed character possesses
- **Targeting Problems**: Verify powers work with the character's new size and capabilities

### Best Practices

#### **Preparation**

- **Test Transformations**: Try transformations in safe environments before important scenes
- **Document Effects**: Keep clear notes on transformation mechanics and story impact
- **Player Communication**: Explain transformation effects clearly to affected players
- **Backup Plans**: Have removal methods ready for problematic transformations

#### **Session Management**

- **Visual Clarity**: Ensure all players can see and understand transformation effects
- **Mechanical Clarity**: Explain how new abilities and restrictions work
- **Story Integration**: Use transformations to enhance narrative moments
- **Pacing Consideration**: Don't overwhelm players with too many simultaneous transformations

## Next Steps

- **Practice**: Experiment with simple transformations to learn the system
- **Collaborate**: Work with players to create character-appropriate transformations
- **Expand**: Develop transformation libraries for different campaign themes
- **Integrate**: Combine transformations with other system features for rich gameplay

For more advanced techniques, see [Advanced Usage](../advanced-usage/README.md). For status effect integration, see [Status Effects](../system-features/status-effects.md). For macro creation, see [Macro Guide](macro-guide.md).
