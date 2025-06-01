# Combat Mechanics

Combat in the Eventide RP System is designed to be fast-paced, tactical, and narrative-focused. This guide covers all aspects of combat from initiative to resolution.

## Combat Overview

### Core Principles

- **Narrative Focus**: Combat serves the story, not the other way around
- **Player Agency**: Multiple viable approaches to any combat situation
- **Quick Resolution**: Streamlined mechanics keep the action moving
- **Tactical Depth**: Meaningful choices without overwhelming complexity

### Combat Sequence

1. **Initiative**: Determine action order
2. **Declare Actions**: Players and GM state intended actions
3. **Resolve Actions**: Roll dice and apply results
4. **Apply Effects**: Handle damage, status effects, and consequences
5. **Next Round**: Repeat until combat ends

## Initiative System

### Rolling Initiative

- **Formula**: Configurable by GM (default: `1d@hiddenAbilities.dice.total + @statTotal.mainInit + @statTotal.subInit`)
- **Main Initiative**: Average of Acrobatics and Wits abilities
- **Sub Initiative**: Total of all abilities ÷ 100 (tiebreaker)
- **Dice Pool**: Determines the die size for initiative rolls

### Initiative Modifiers

- **Equipment**: Some gear may modify initiative
- **Status Effects**: Conditions can affect action speed
- **Circumstances**: Environmental factors may apply bonuses/penalties

### GM Settings

- **Auto-Roll NPC Initiative**: Automatically rolls for NPCs when added to combat
- **Hide NPC Initiative Rolls**: Conceals NPC initiative results from players
- **Auto-Roll Player Initiative**: Automatically rolls for players (optional)
- **Initiative Decimals**: Number of decimal places displayed / calculated (0-4)

## Action Types

### Standard Actions

Most actions in combat fall into these categories:

#### **Attack Actions**

- **Melee Attack**: Physical combat using Acrobatics or Physical
- **Ranged Attack**: Projectile combat using Acrobatics or Wits
- **Combat Power**: Special abilities that cost Power to use and can be based on any stat (the crux of combat)
- **Gear Usage**: Activating equipment with combat effects

#### **Movement Actions**

- **Move**: Change position on the battlefield
- **Charge**: Move and attack with potential bonuses/penalties
- **Retreat**: Tactical withdrawal from combat
- **Positioning**: Gaining tactical advantage through movement

#### **Defensive Actions**

These are actually mostly used on your foe's turn: keep in mind not every GM will provide the same options

- **Challenge**: The core of defensive rolls. You use an appropriate stat to challenge the foe's attack.
  If you beat their original roll they either _defend_ against it or _challenge_ you back. If they _defend_
  then if they're successful nothing happens. If they fail to defend their attack is repelled onto them or
  some other effect occurs at GM discretion. if they _challenge_ then they roll back just like they would for
  a defend, but if their roll beats yours you roll back until one of you rolls lower. Whoever rolls lower first
  gets hit by the attack.
  _Note: An unsuccessful challenge action for either side means that their next turn is skipped: high risk high reward_
- **Use Fate Point**: Don't like the result of a roll? This will force the foe to roll it again or give you another chance at it.
  If any resources were spent on the action they're refunded, then the action is repeated, and the new result is taken no matter if
  its worse or better than the original! Players typically get 1 fate point / ingame day but that is at **gm discretion**. Also, it
  should be noted that some particularly strong foes may have this as an option as well.

#### **Support Actions**

- **Aid Ally**: Help another character with their action
- **Apply Status**: Use abilities to affect others
- **Heal**: Restore Resolve to allies
- **Tactical Coordination**: Provide bonuses through leadership

### Free Actions

Some actions don't consume your main action:

- **Speaking**: Brief communication with allies
- **Simple Interactions**: Drawing weapons, opening doors
- **Maintaining Effects**: Keeping ongoing abilities active (as long as you're not juggling too many and don't otherwise have to worry about the effect)
- **Basic Movement**: Short repositioning

## Rolling Mechanics

### Basic Attack Rolls

1. **Choose Ability**: Select appropriate ability for the attack
2. **Roll Dice**: Roll based on your dice pool (usually d20)
3. **Add Modifiers**: Include ability score and equipment bonuses (Typically systematically applied)
4. **Compare to Target**: Beat opponent's Armor Class (AC = Ability + 11) (Shown for GM on roll card if you targeted opponent)

### Ability-Based Combat

Different abilities serve different combat roles:

#### **Acrobatics in Combat**

- **Melee Finesse**: Light weapons, precise strikes
- **Ranged Combat**: Bows, thrown weapons, firearms
- **Defense**: Dodging, evasion, mobility
- **Tactics**: Quick repositioning, hit-and-run

#### **Physical in Combat**

- **Heavy Melee**: Swords, axes, maces, unarmed
- **Grappling**: Wrestling, restraining opponents
- **Intimidation**: Demoralizing enemies through presence
- **Brute Force**: Breaking through defenses

#### **Fortitude in Combat**

- **Endurance**: Maintaining performance over long fights
- **Resistance**: Shrugging off damage and effects
- **Recovery**: Bouncing back from injuries
- **Persistence**: Continuing when others would fall

#### **Will in Combat**

- **Combat Powers**: Fueling special abilities
- **Mental Resistance**: Resisting fear, charm, confusion
- **Leadership**: Inspiring and coordinating allies
- **Magic**: Spellcasting and supernatural abilities

#### **Wits in Combat**

- **Tactics**: Analyzing battlefield conditions
- **Targeting**: Finding weak points and vulnerabilities
- **Awareness**: Noticing threats and opportunities
- **Strategy**: Planning multi-turn combinations

### Critical Success and Failure

#### **Critical Success (Natural 20 / Within critical theshold)**

- **Enhanced Success**: Add 10 to the number shown typically (or optionally make an automatic success)
- **Enhanced Effect**: Extra damage, additional benefits
- **Narrative Impact**: Spectacular results that advance the story
- **Momentum**: May provide advantages for subsequent actions

#### **Critical Failure (Natural 1 / Within fail threshold)**

- **Probable Failure**: Subtract 10 from the shown result (or optionally make an automatic failure)
- **Complications**: Equipment malfunction, positioning problems, awkward situations, battlefield dangers
- **Narrative Consequences**: Setbacks that create story opportunities
- **Recovery**: Usually temporary setbacks, not permanent harm

#### **Modified Critical Ranges**

GMs can adjust critical ranges using Hidden Abilities:

- **Expanded Crits**: Characters might crit on 19-20 or even 18-20
- **Expanded Failures**: Critical failures might occur at ranges higher than 1
- **Situational Modifiers**: Circumstances can temporarily change ranges

## Damage and Health

### Resolve (Health) System

- **Current Resolve**: Your character's current health/stamina
- **Maximum Resolve**: Total health capacity (typically derived from Fortitude)
- **Damage**: Reduces current Resolve
- **Healing**: Restores current Resolve (cannot exceed maximum)

### Damage Types

While the system doesn't have complex damage types, GMs may consider:

- **Physical Damage**: Cuts, bruises, broken bones
- **Mental Damage**: Stress, fear, psychic trauma
- **Environmental Damage**: Fire, cold, poison, disease
- **Magical Damage**: Supernatural effects and curses

_Any of these can apply extra damage or resistance based on GM discretion_

### Damage Application

1. **Calculate Damage**: Based on successful attack and weapon/ability
2. **Subtract from Resolve**: Reduce target's current health
3. **Apply Resisteances**: Armor, resistance, defensive abilities: add them back to the target's resolve pool
4. **Check Status**: Determine if target is still functional

### Health States

- **Healthy**: Above 75% of maximum Resolve
- **Wounded**: 25-75% of maximum Resolve
- **Critical**: Below 25% of maximum Resolve
- **Incapacitated**: At 0 Resolve (unconscious, dying, or defeated)

## Combat Powers

### Using Combat Powers

1. **Check Requirements**: Ensure you meet prerequisites
2. **Spend Power**: Pay the required Power cost
3. **Declare Target**: Choose valid targets for the ability
4. **Make Rolls**: Roll any required dice
5. **Apply Effects**: Resolve damage, status effects, or other results

### Power Resource Management

- **Power Pool**: Your total capacity for special abilities
- **Power Costs**: Each Combat Power has a specific cost
- **Recovery**: Power typically regenerates during rest periods and by spending an action recovering a power point
- **Conservation**: Managing Power is a key tactical consideration: and GMs should limit power point recovery / pool based on the type of story they're trying to tell

### Types of Combat Powers

#### **Offensive Powers**

- **Direct Damage**: Abilities that deal immediate harm
- **Area Effects**: Powers that affect multiple targets
- **Debuffs**: Abilities that weaken or hinder enemies
- **Combination Attacks**: Powers that enhance normal attacks

#### **Defensive Powers**

- **Damage Reduction**: Abilities that reduce incoming harm
- **Evasion**: Powers that help avoid attacks entirely
- **Healing**: Abilities that restore Resolve
- **Protective Barriers**: Powers that shield allies

#### **Utility Powers**

- **Movement**: Abilities that enhance positioning
- **Buffs**: Powers that enhance allies' capabilities
- **Control**: Abilities that manipulate the battlefield
- **Information**: Powers that reveal hidden details

## Status Effects in Combat

### Applying Status Effects

- **Through Combat Powers**: Many abilities apply conditions
- **Environmental Hazards**: Battlefield conditions can cause effects
- **Equipment**: Some gear applies status effects when used
- **GM Narrative**: Circumstances may warrant temporary conditions

### Common Combat Status Effects

#### **Advantage/Disadvantage**

- **Advantage**: Roll additional dice, keep the best
- **Disadvantage**: Roll additional dice, keep the worst
- **Sources**: Positioning, equipment, ally assistance, conditions

#### **Ability Modifications**

- **Temporary Bonuses**: +1 to +3 to specific abilities (scale with power of effect)
- **Temporary Penalties**: -1 to -3 to specific abilities (scale with power of effect)
- **Duration**: Usually last until end of combat or specific trigger to remove

#### **Movement Effects**

- **Slowed**: Reduced movement options
- **Immobilized**: Cannot move from current position
- **Enhanced Movement**: Increased mobility or special movement types

#### **Action Restrictions**

- **Stunned**: Cannot take actions for a period
- **Confused**: Actions may target randomly or fail
- **Silenced**: Cannot use abilities requiring speech

### Managing Status Effects

- **Duration**: Most effects last until GM removes them
- **Stacking**: Multiple effects can apply simultaneously
- **Removal**: Some abilities or circumstances can end effects early
- **Player Agency**: Players should understand their current conditions: clear descriptions can assist with that

## Tactical Considerations

### Positioning and Movement

- **High Ground**: Elevated positions may provide advantages
- **Cover**: Obstacles can reduce incoming damage
- **Flanking**: Attacking from multiple directions
- **Chokepoints**: Controlling narrow passages

### Team Tactics

- **Coordination**: Working together for combined effects
- **Role Specialization**: Each character focusing on their strengths
- **Resource Sharing**: Supporting allies with abilities and equipment
- **Communication**: Sharing information and planning actions

### Environmental Factors

- **Terrain**: Difficult ground, obstacles, hazards
- **Weather**: Rain, wind, extreme temperatures
- **Lighting**: Darkness, bright light, magical illumination
- **Distractions**: Noise, crowds, ongoing events

## GM Combat Tools

### Managing Combat Flow

- **Initiative Tracking**: Use Foundry's combat tracker effectively
- **Quick Decisions**: Keep combat moving with rapid rulings
- **Narrative Description**: Make each action feel cinematic
- **Player Engagement**: Ensure everyone has meaningful choices

### NPC Combat Tactics

- **Varied Approaches**: Different enemies use different strategies
- **Intelligent Opposition**: NPCs should use terrain and abilities cleverly or not depending on who that NPC is!
- **Escalation**: Combat intensity can increase over time
- **Retreat Options**: Not every fight needs to end in death - in fact in my experience death is best used only when narratively fitting

### Balancing Encounters

- **Action Economy**: Consider number of actions per side
- **Resource Drain**: Encounters should challenge without overwhelming
- **Variety**: Mix different types of challenges and opponents
- **Story Integration**: Combat should advance the narrative

## Advanced Combat Options

### Called Shots

- **Targeting Specific Areas**: Aiming for weak points or specific effects
- **Increased Difficulty**: Higher target numbers for precise attacks
- **Enhanced Results**: Greater damage or special effects on success
- **GM Discretion**: Availability depends on circumstances and equipment
- **Tip**: Keep status effects that apply disadvantage or advantage on hand that you can drag to the player as much as needed to adjust advantage or disadvantage for such situations (removing at the end of the action of course)

### Grappling and Wrestling

- **Initiation**: Use Physical ability to grab opponent (or acrobatics if you have a VERY good character reason for using acrobatics here instead)
- **Maintenance**: Ongoing contest to maintain hold
- **Effects**: Restricted movement, status effects reducing stats, potential damage over time
- **Escape**: Various methods to break free from grapples
- **Tip**: As a GM its nice to have a status effect library ready to apply for things that happen often: if you have a grappler keep their status effect available in a convenient place like the system items or a compendium

### Mounted Combat

- **Mount Abilities**: Creature's capabilities affect combat options
- **Coordination**: Rider and mount act as a team
- **Vulnerabilities**: Specific weaknesses when mounted
- **Dismounting**: Forced or voluntary separation from mount

### Mass Combat

- **Unit Actions**: Groups acting as single entities
- **Leadership**: Character abilities affecting large groups
- **Simplified Resolution**: Streamlined mechanics for large battles
- **Individual Heroics**: Player characters making a difference in big fights

## Combat Examples

### Example 1: Basic Melee Combat

**Situation**: Warrior attacks a bandit with a sword

1. **Initiative**: Warrior acts first (higher initiative)
2. **Action Declaration**: "I attack with my sword using Physical"
3. **Roll**: Warrior rolls 1d20 + Physical ability + sword bonus (typically by rolling the gear from the gear tab)
4. **Target**: Must beat bandit's AC (bandit's best of physical or acrobatics ability + 11)
5. **Success**: Roll exceeds target, sword deals damage
6. **Damage**: Bandit's Resolve reduced by weapon damage + Physical bonus (highly gm specific)

### Example 2: Combat Power Usage

**Situation**: Mage uses "Lightning Bolt" combat power

1. **Power Check**: Mage has sufficient Power to cast
2. **Target Selection**: Chooses enemy within range
3. **Power Cost**: Spends required Power points
4. **Roll**: Makes Will-based attack roll (vs Acrobatics / Fortitude as they're the most logical with Will available as a challenge option)
5. **Effect**: On success, deals magical damage and may apply status
6. **Resolution**: Damage applied, status effect added to statuses

### Example 3: Tactical Positioning

**Situation**: Scout uses terrain advantage

1. **Movement**: Scout moves to elevated position
2. **Advantage**: GM grants advantage for high ground (applies temporary advantage status effect for the action)
3. **Attack**: Scout makes ranged attack with Acrobatics
4. **Enhanced Roll**: Rolls extra die due to advantage
5. **Result**: Takes best result, applies damage if successful

## Troubleshooting Combat

### Common Issues

- **Slow Pace**: Encourage quick decisions, use timers if needed
- **Analysis Paralysis**: Limit discussion time, emphasize action
- **Unbalanced Encounters**: Adjust on the fly, add/remove enemies
- **Player Confusion**: Clarify rules quickly, rule in favor of fun

### Quick Fixes

- **Forgotten Modifiers**: Apply retroactively if reasonable
- **Rules Disputes**: GM makes quick ruling, discuss details later
- **Technical Issues**: Have backup methods for dice rolling
- **Engagement Problems**: Rotate spotlight, ensure everyone participates

## Next Steps

- **Practice**: Run simple combats to learn the system
- **Experiment**: Try different tactical approaches
- **Customize**: Adapt rules to fit your group's preferences
- **Expand**: Add house rules for specific situations or themes

For more advanced combat techniques, see [Advanced Usage](../advanced-usage/README.md). For status effect details, see [Status Effects](status-effects.md).
