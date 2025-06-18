# Status Effects System

The status effects system in Eventide RP is one of its most powerful and flexible features, allowing for dynamic character modification and rich storytelling opportunities.

## Overview

### What are Status Effects?

Status effects are temporary or permanent modifications to a character's abilities, representing:

- **Temporary conditions** (poisoned, blessed, frightened)
- **Environmental effects** (wet, cold, inspired)
- **Equipment bonuses** (magical items, armor, weapons)
- **Character features** (background traits, special abilities)
- **Transformation states** (enlarged, invisible, polymorphed)

### Types of Status Effects

#### **Status Effects** (Temporary)

- Applied and removed by GMs during gameplay
- Represent temporary conditions affecting characters
- Can show icons on tokens for visual reference
- Usually have narrative descriptions explaining their effects

#### **Features** (Permanent)

- Represent lasting character traits and abilities
- Typically created during character creation or advancement
- Provide consistent bonuses or special capabilities
- Can be racial traits, background features, or learned abilities

## Creating Status Effects

### Using the Effect Creator

The Effect Creator macro (found in ERPS Macros compendium) provides an intuitive interface for creating both status effects and features.

#### **Basic Information**

- **Type**: Choose between "Status" (temporary) or "Feature" (permanent)

1. **Name**: Clear, descriptive name for the effect
2. **Description**: Detailed explanation of what the effect represents
3. **Image**: Icon that represents the effect (shows on tokens if enabled)
4. **Colors**: Customize the appearance with background, text, and icon tint colors

#### **Display Options**

- **Display on Token**: Whether to show an icon on the character's token

#### **Effect Modifications**

Configure how the effect modifies character abilities:

- **Ability Bonuses/Penalties**: Modify core abilities (Acro, Phys, Fort, Will, Wits)
- **Resource Adjustments**: Affect Resolve or Power pools
- **Hidden Ability Changes**: Modify dice pools, critical ranges, etc.

### Manual Creation

Users can opt to create via the character sheet using the add effect buttons: but
remember that the information is more spread out in created items so make sure to check
each tab for additional information you may need to fill out.

## Effect Mechanics

### Ability Modifications

#### **Add Mode** (Default)

- **Function**: Adds or subtracts from the base ability score
- **Example**: +2 to Physical, -1 to Wits
- **Use Case**: Most temporary bonuses and penalties
- **Stacking**: Multiple "Add" effects stack together

#### **Override Mode**

- **Function**: Sets the ability to a specific value
- **Example**: Physical becomes 5 (regardless of base score)
- **Use Case**: Transformations, magical effects that set absolute values
- **Priority**: Override effects take place BEFORE add effects

#### **Advantage/Disadvantage**

- **Function**: Modifies dice rolling mechanics
- **Advantage**: Roll extra dice, keep the best result
- **Disadvantage**: Roll extra dice, keep the worst result
- **Sources**: Positioning, circumstances, magical effects, major impedences

### Hidden Abilities

GMs can modify these special values to create unique effects:

#### **Dice Pool**

- **Default**: 20 (characters roll d20)
- **Modification**: Change die size (d19, d18, etc.)
- **Effect**: Alters the range of possible roll results
- **Use Case**: Curses that reduce maximum potential, blessings that increase it
- **Important Note**: If you've changed the dice pool UP it might be valuable to add a cmax increase as well so that their new roll results usable.
  This requires the advanced effect creator OR editing directly from the item sheet to select this option as its NOT often used.

#### **Critical Ranges**

- **Cmax/Cmin**: Critical success range (default 20-20)
- **Fmax/Fmin**: Critical failure range (default 1-1)
- **Modification**: Expand or contract critical ranges
- **Use Case**: Lucky charms, cursed items, skill mastery
- **Important Note**: Cmax and Fmin are disabled by default in the basic effect creator. They're not often used and will need the ADVANCED creator
  if you wish to use them to avoid them being used unintentionally.

#### **Vulnerability**

- **Function**: Special modifier for specific damage types or situations
- **Use Case**: Weakness to fire, resistance to cold, etc.
- **Important Note:** negative vulnerability will NOT grant resistance but WILL prevent application of future vulnerability until its consumed as long as it uses the add type.

### Resource Effects

#### **Resolve Modifications**

- **Current**: Immediate healing or damage
- **Maximum**: Temporary increase or decrease to health pool
- **Use Case**: Healing spells, constitution damage, magical vigor

#### **Power Modifications**

- **Current**: Immediate restoration or drain
- **Maximum**: Temporary increase or decrease to power pool
- **Use Case**: Mana potions, exhaustion, magical enhancement

## Managing Status Effects

### Application Methods

#### **Direct Application**

1. **Select Target**: Choose the character to affect
2. **Drag and Drop**: Move effect from compendium to character sheet
3. **Automatic**: Effect applies immediately with all modifications

#### **Through Combat Powers**

- Many combat powers apply status effects: when they should just drag it to the target if it hits
- Duration and removal are typically GM-controlled

#### **Environmental Application**

- GMs can apply effects based on story circumstances
- Weather, terrain, or magical areas might impose conditions
- Social situations might grant bonuses or penalties

### Duration and Removal

#### **GM-Controlled Duration**

- **Default**: Effects last until the GM removes them
- **Flexibility**: Allows for story-appropriate timing
- **Examples**: "Until you rest," "for the remainder of the scene," "until the curse is broken"

#### **Player Removal**

- **Caution**: Players can technically remove their own effects
- **Etiquette**: Should consult with GM before removing effects
- **Use Case**: Mainly for correcting mistakes or GM-approved removals
- **Note**: Removal of status effects will always apply a message to chat to ensure GM is notified

#### **Automatic Removal**

- **Transformation End**: Some effects end when transformations are removed (see [Transformations](../for-gms/transformations.md) for more information)
- **Gear Removal**: Gear can have automatic effects as well - unequipping it or having it taken will automatically remove those effects

### Visual Indicators

#### **Token Icons**

- **Display**: Effects can show small icons on character tokens
- **Visibility**: Helps everyone see character conditions at a glance
- **Customization**: Icons can be tinted and positioned
- **Management**: Icons automatically appear/disappear with effects

#### **Character Sheet Display**

- **Status Tab**: All active effects listed with descriptions
- **Ability Cards**: Modified abilities show their adjusted values
- **Identification**: Effects use custom icons and can be clicked on to pull up a popup form for additional details about them

## Common Status Effect Examples

### Combat Effects

#### **Blessed**

- **Effect**: +1 to all abilities (each ability add mode +1)
- **Duration**: Until end of combat or GM removes
- **Visual**: Golden glow icon
- **Description Without Name**: "Divine favor guides your actions"
- **Description With Name**: {name}... "is receiving divine power that is assisting them." (Note the name and dots are automatic as long as the roll name toggle is on)

#### **Poisoned**

- **Effect**: -2 to Fortitude, -1 to Physical
- **Duration**: Until healed or time passes
- **Visual**: Green skull icon
- **Description Without Name**: "Toxins course through your veins"
- **Description With Name**: {name}... "Feels a wave of nausea as the toxins take hold!"

#### **Inspired**

- **Effect**: +2 to Will, advantage on next roll
- **Duration**: Until used or scene ends
- **Visual**: Musical note icon
- **Description Without Name**: "Stirring words fill you with determination"
- **Description With Name**: {name}... "is feeling inspired in this moment."

### Environmental Effects

#### **Wet**

- **Effect**: -1 to Acrobatics, advantage given to lightning attacks aimed at affected creature
- **Duration**: Until dried off
- **Visual**: Water droplet icon
- **Description Without Name**: "Soaked clothing hampers movement"
- **Description With Name**: {name}... "is completely drenched!"

#### **High Ground**

- **Effect**: +1 to ranged attacks (acrobatics), advantage on intimidation (will advantage)
- **Duration**: While maintaining position
- **Visual**: Mountain icon
- **Description Without Name**: "Elevated position provides tactical advantage"
- **Description With Name**: {name}... "is in a perfect position to snipe from and dodge return fire"

#### **Webbing**

- **Effect**: -1 to acrobatics, half movement speed allowed, depending on character may apply fear disadvantages to will / wits if they're afraid of spiders
- **Duration**: Until removed
- **Visual**: Spider web / character trapped in spider web
- **Description Without Name**: "Thick spider webs restrict movement in this area."
- **Description With Name**: {name}... "is caught in a sticky mess of spider webs!"

### Magical Effects

#### **Enlarged** (Typically handled via a transformation rather than a typical effect. See [Transformation](../for-gms/transformations.md) for information)

- **Effect**: +2 Physical, -1 Acrobatics, size increase
- **Duration**: Spell duration
- **Visual**: Token Change in size and potentially even image possible through transformation system
- **Description With Name**: {name}... has grown to a much larger size!

#### **Invisible**

- **Effect**: +3 to stealth, advantage on first attack
- **Duration**: Until attacking or spell ends
- **Visual**: Transparent eye icon
- **Description Without Name**: "Magical invisibility conceals your presence"
- **Description With Name**: {name}... "fades from sight for most."

### Character Features

#### **Weapon Master**

- **Effect**: +1 Physical when using preferred weapon type
- **Duration**: Permanent character trait
- **Visual**: Crossed swords icon
- **Description Without Name**: "Years of training with your chosen weapon"
- **Description With Name**: {name}... "is very proficient with their chosen weapon!"

#### **Street Smart**

- **Effect**: +2 Wits in urban environments
- **Duration**: Permanent background feature
- **Visual**: City icon
- **Description Without Name**: "Growing up in the city taught you to read situations"
- **Description With Name**: {name}... "is wise enough to understand how a city works to a whole other level than most."

## Advanced Status Effect Techniques

### Conditional Effects

#### **Situational Bonuses**

- **Implementation**: Create multiple versions for different situations
- **Example**: "Ranger's Favored Terrain" with different bonuses per environment
- **Management**: Apply/remove as characters enter/leave appropriate areas

#### **Triggered Effects**

- **Concept**: Effects that activate under specific conditions
- **Example**: "Berserker Rage" that activates when health drops below 25%
- **Implementation**: Requires GM monitoring and manual application

### Stacking and Interaction

#### **Multiple Sources**

- **Add Effects**: Stack together (two +1 bonuses = +2 total)
- **Override Effects**: Highest value takes precedence
- **Mixed Types**: Add effects apply to override base values

#### **Conflicting Effects**

- **Opposite Bonuses**: +2 and -1 to same ability = +1 net effect
- **Advantage/Disadvantage**: Cancel each other out if from different sources
- **GM Arbitration**: Final decision on complex interactions

### Custom Mechanics

#### **Unique Effect Types**

- **Damage Over Time**: Requires GM tracking and application (typically will want some reminder in init)
- **Escalating Effects**: Bonuses that increase over time
- **Linked Effects**: Multiple characters sharing connected conditions (each will need to be managed individually)

#### **Narrative Integration**

- **Story Hooks**: Effects that create roleplay opportunities
- **Character Development**: Effects that reflect character growth
- **World Building**: Effects that reinforce setting themes

## GM Tools and Tips

### Effect Management

#### **Organization**

- **Compendiums**: Create organized collections of common effects
- **Naming Conventions**: Use clear, searchable names
- **Categories**: Group effects by type, source, or theme
- **Documentation**: Keep notes on custom effects and their purposes

#### **Preparation**

- **Pre-Made Effects**: Create common conditions before sessions
- **Situational Sets**: Prepare effects for specific encounters or locations
- **Player Collaboration**: Work with players to create character-specific features
- **Special Note**: The creator can be used in real time by targeting those who are meant to be under the effect right away: this is great for if players get into situations you didn't anticipate

### Balancing Effects

#### **Power Level**

- **Minor Effects**: ±1 to abilities, small situational bonuses
- **Moderate Effects**: ±2 to abilities, advantage/disadvantage
- **Major Effects**: ±3+ to abilities, multiple modifications, unique mechanics
- **Note**: Every 1 added or subtracted is the equivilant of a 5% change in their ability

#### **Duration Considerations**

- **Temporary**: Short-term effects for immediate situations
- **Extended**: Longer effects for ongoing conditions
- **Permanent**: Character features and lasting changes

#### **Narrative Weight**

- **Mechanical Impact**: How much the effect changes gameplay
- **Story Significance**: How important the effect is to the narrative
- **Player Agency**: How much control players have over the effect

### Troubleshooting

#### **Common Issues**

- **Forgotten Effects**: Use token icons as reminders
- **Stacking Confusion**: Keep clear notes on active effects
- **Balance Problems**: Adjust effects that prove too powerful/weak
- **Technical Difficulties**: Have backup methods for applying effects and know how they operate

#### **Best Practices**

- **Clear Communication**: Explain effects to players when applied
- **Consistent Application**: Apply similar effects the same way
- **Player Input**: Listen to feedback about effect balance and fun
- **Flexibility**: Be willing to modify effects that aren't working

## Integration with Other Systems

### Combat Powers

- Many combat powers are meant to apply effects on resolution / hit
- Effects enhance the tactical depth of special abilities
- Power costs often reflect the strength of applied effects

### Gear System

- Equipment can provide status effect bonuses when equipped
- Cursed items might apply negative effects that can't be easily removed
- Magical items often grant unique status effects

### Transformations

- Transformation items apply comprehensive status effect packages
- Effects modify abilities, resources, and sometimes available powers
- Transformation effects use special "Transformation" type modifications
- Transformations CAN be curses too, good for things that the player isn't meant to have control over the duration of / negative polymorphs

## Next Steps

- **Experiment**: Try creating simple effects to learn the system
- **Collaborate**: Work with your GM to create character-appropriate features
- **Observe**: Pay attention to how effects enhance gameplay and story
- **Innovate**: Develop unique effects that fit your campaign's themes

For more advanced techniques, see [Advanced Usage](../advanced-usage/README.md). For combat applications, see [Combat Mechanics](combat.md).
