# Quick Start Guide

Get up and running with Eventide RP System in 10 minutes or less!

## For Game Masters (5-Minute Setup)

### 1. Create Your First NPC (2 minutes)

1. **Click** the Actors Directory → **Create Actor** → **NPC**
2. **Name** your NPC (e.g., "Guard Captain")
3. **Set abilities** by clicking in the ability value fields:
   - **Acrobatics**: 2 (agility/dexterity)
   - **Physical**: 4 (strength/power)
   - **Fortitude**: 3 (constitution/resilience)
   - **Will**: 2 (mental strength)
   - **Wits**: 3 (intelligence/perception)
4. **Set resources**:
   - **Resolve**: 25 (health/stamina)
   - **Power**: 15 (special abilities resource)

### 2. Add a Combat Power (1 minute)

1. **Open** the NPC sheet → **Combat Powers** tab
2. **Click** the **+** to create a new combat power
3. **Name**: "Sword Strike"
4. **Description**: "A powerful melee attack"
5. **Set** roll type to "Roll" and ability to "Physical"
6. **Save** the power

### 3. Create Basic Gear (1 minute)

1. **Import** the "Gear Creator" macro from ERPS Macros compendium
2. **Run** the macro with your NPC targeted
3. **Create** a "Steel Sword":
   - **Name**: Steel Sword
   - **Class**: Weapon
   - **Effects**: +1 to Physical ability (phys | add | +1)
4. **Create** the gear

### 4. Test the System (1 minute)

1. **Click** on abilities in the character sheet to roll them
2. **Use** the combat power you created
3. **Equip/unequip** the gear to see effects change

## For Players (3-Minute Setup)

### 1. Understand Your Character Sheet (1 minute)

Your character has **five core abilities**:

- **Acro** (Acrobatics): Agility, balance, reflexes
- **Phys** (Physical): Strength, power, athletics
- **Fort** (Fortitude): Constitution, resilience, health
- **Will**: Mental strength, determination, magic
- **Wits**: Intelligence, perception, quick thinking

**Resources**:

- **Resolve**: Your health/stamina (typically derived from Fortitude)
- **Power**: Resource for special abilities (typically derived from Will)

### 2. Make Your First Rolls (1 minute)

1. **Click** any ability card to roll that ability
2. **Watch** the chat for results
3. **Notice** how equipped gear affects your totals

### 3. Explore Your Sheet (1 minute)

- **Features Tab**: Permanent character traits
- **Combat Powers Tab**: Special abilities you can use
- **Biography Tab**: Character background and notes
- **Status Effects Tab**: Temporary conditions
- **Gear Tab**: Equipment and inventory

## Essential Concepts (Everyone)

### Rolling System

- **Click abilities** to roll them automatically
- **Results show** in chat with success/failure indicators
  - _indicators will only show if you have someone targeted / for critical success or critical failure_
- **Modifiers** from gear and status effects apply automatically

### Status Effects

- **Temporary conditions** that modify abilities
- **Show as icons** on tokens (optional)
- **Applied by GMs** typically due to something happening in the world or an attack you've been hit by

### Equipment System

- **Equipped gear** affects your abilities
- **Toggle equipment** by clicking the equip/unequip button
- **Some items** may have limited uses or special properties

### Combat Powers

- **Special abilities** that cost Power to use
- **Click to activate** from your character sheet
- **Effects** are automatically posted to chat

## Quick Reference

### Common Actions

- **Roll Ability**: Click ability card on character sheet
- **Use Combat Power**: Click power name in Combat Powers tab
- **Equip/Unequip Gear**: Click gear toggle button
- **View Item Details**: Click item name

### GM Tools (Macros)

- **Gear Creator**: Create equipment with effects
- **Effect Creator**: Create status effects and features
- **Damage/Healing**: Apply damage or healing to targets
- **Transformation Creator**: Create transformation effects
- **Restore Target**: Allows you to quickly restore all health, power, and remove status effects in large groups

### Player Tips

- **Hover** over elements for tooltips and additional information
- **Check** the Status Effects tab and your status cards for active conditions
- **Coordinate** with your GM for custom gear and effects

## What's Next?

### For GMs

- Read [GM Guide](../for-gms/README.md) for advanced features
- Learn about [Transformations](../for-gms/transformations.md)
- Explore [System Settings](../system-features/settings.md)

### For Players

- Read [Player Guide](../for-players/README.md) for detailed mechanics
- Learn about [Character Creation](../for-players/character-creation.md)
- Understand [Combat Mechanics](../system-features/combat.md)

### Everyone

- Review [System Features](../system-features/README.md) for complete mechanics
- Check [Advanced Usage](../advanced-usage/README.md) for tips and tricks

## Need Help?

- **Documentation**: Check the relevant guide sections
- **GitHub Issues**: [Report bugs or request features](https://github.com/EventideMiles/eventide-rp-system/issues)
- **Community**: Ask questions with the "documentation" label

---

**Remember**: Eventide RP System is designed to be intuitive. When in doubt, try clicking on things - most elements are interactive and provide immediate feedback!

## Character Features and Bonuses

### Understanding Features

Features represent permanent character traits that reflect background, training, and inherent abilities. They provide both passive bonuses and active roll capabilities.

#### **Feature Types**

- **Passive Features**: Constant bonuses to abilities or resources
- **Active Features**: Clickable features that can make their own rolls
- **Circumstantial Features**: Bonuses that apply only in specific situations

#### **Circumstantial Bonuses**

One of the most engaging aspects of Eventide RP is circumstantial bonuses - advantages that apply when your character's background is relevant.

**Examples:**
- **City-Raised**: +2 to Wits rolls in urban environments
- **Military Veteran**: +2 to Wits rolls during tactical situations
- **Scholar**: +3 to Wits rolls when researching information
- **Wilderness Survivor**: +3 to Fortitude rolls in natural environments

#### **Using Features**

1. **Passive Features**: Bonuses apply automatically
2. **Active Features**: Click the feature to make a roll
3. **Circumstantial Bonuses**: Communicate with your GM when you think they apply
4. **Roleplay**: Use feature moments to highlight your character's background

### Feature Creation (GM)

GMs can create custom features using the Feature Creator:

1. **Open Creator**: Use the macro or compendium
2. **Set Basic Info**: Name, description, and icon
3. **Configure Rolls**: Choose roll type and abilities
4. **Add Effects**: Set ability modifications and bonuses
5. **Save and Apply**: Add to characters as appropriate

**Quick Feature Template:**
```
Name: [Background/Training Type]
Description: [How the character gained this ability]
Roll Type: Ability-Based
Target Ability: [Most relevant ability]
Bonus: +1 to +3 (based on specificity)
Circumstance: [When the bonus applies]
```
