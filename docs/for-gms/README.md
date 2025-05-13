# Eventide RP System Guide for Game Masters

This guide provides comprehensive information for Game Masters using the Eventide Roleplaying System in Foundry VTT.

## Running Your First Session

### Setting Up NPCs

NPCs in Eventide are highly customizable and can be created with:

1. **Core Abilities**: Acrobatics, Physical, Fortitude, Will, and Wits
2. **Custom Features**: Create lasting traits that modify abilities - typically more for players and recurring NPCs
3. **Status Effects**: Temporary conditions that affect gameplay - you control when they apply and expire
4. **Combat Powers**: Special actions NPCs can take during encounters - uses their main power resource. Typical use case is for things like spells or special attacks

To create an effective NPC:
- Use the "NPC" actor type when creating a new actor - that way if you have multiple NPCs created from the same base actor they won't share statuses, health, etc.
- Add features that reflect the NPC's background and abilities
- Create combat powers appropriate to their role
- Use status effects to represent preparation or conditions - create status effects that might get applied to players in advance when they combat the NPC so you can simply drag them in from the compendium in combat
- Use gear to represent items the NPC has with them - you can use the gear creator macro to create gear that is appropriate for the NPC's role and, of course, can transfer to the player's inventory when they take the item

### Managing Encounters

The Eventide system provides several tools for encounter management:

1. **Initiative System**:
   - Customizable initiative formula with configurable decimal places
   - Option to hide NPC initiative rolls from players
   - Automatic initiative rolling for NPCs and players (configurable)

2. **Combat Tracking**:
   - Default combat round duration can be configured in system settings
      - This is more for a feel of what your players should be able to accomplish in a round - it has no effect on status durations because those are meant to be managed by you

3. **Damage and Healing**:
   - Apply damage and healing with formatted chat messages
   - System sounds provide audio feedback for key moments (configurable)

## The Status System

Status effects are a core mechanic in Eventide that allow dynamic modification of character abilities:

### Creating Status Effects

1. Use the Effect Creator macro (available in the ERPS Macros compendium)
2. Name your effect, add a description, and pick an icon
3. Set modifications to abilities (positive or negative)
4. Configure its card and icon colors
5. Pick if you want this effect to show on their token
6. Whether you're creating on a character or not you'll get a copy of the effect in your compendium to use as often as you need

### Using Hidden Abilities

Hidden abilities are powerful GM tools that allow for:
- Modifying critical ranges so that both critical fails and hits can be modified to the character being played and the circumstances of the game
- Modifying what dice a player can roll with. Have they earned rolling with a d19? Just reduce their roll by 1 and they'll roll a d19 instead of a d20

## Gear System

The gear system allows for creating interactive items in your world:

1. **Creating Gear**:
   - Use the Gear Creator macro for straightforward creation
   - Add descriptions, effects, and usage parameters
   - Set equipment status (can it be equipped/unequipped)
   - Configure cursed items that players cannot easily remove - powerful or weak effects and the need to remove the item to remove the effects

2. **Placing Gear in the World**:
   - Add gear to scenes as lootable objects - just drag them from the compendium to the scene and players can pick them up
   - Create treasure hoards with the gear system
      - Use journal entries to describe locations with available gear: drag from journal entries to player sheet to add to inventory

## System Customization

As a GM, you have several options to customize the Eventide experience:

1. **System Settings**:
   - Initiative formula customization
   - Combat round duration
   - NPC initiative visibility
   - Equipment change messages

2. **Sound Configuration**:
   - Enable/disable system sounds
   - Adjust system sound volume
   - Set custom sounds for key actions:
     - Healing and damage
     - Status effect application
     - Equipment changes
     - Combat power usage
     - Initiative rolls

3. **UI Theme**:
   - Choose between Dark (default) and Light themes
   - Theme selection affects all UI elements including inputs, selects, and toggle switches

## Advanced GM Tools

For experienced GMs, Eventide offers advanced functionality:

1. **Macro Management**:
   - Intensify and Weaken macros for fine-tuning status effects on-the-fly
   - Damage scripts for consistent application of damage to characters
   - Macros save your settings for repeated use and many offer the ability to create new macros based on existing ones that will save a new set of settings

2. **Token Management**:
   - Configure which items display icons on tokens: its just a toggle away
   - Set up token status visualization - an icon goes a long way to showing players what is happening in the world
   - For characters everything links up automatically from the token to the actor sheet. For NPCs you can place an item on the base actor sheet instead to have it apply down to all tokens created from then on

## Next Steps

- Explore [System Features](../system-features/README.md) for detailed mechanics
- Check [Advanced Usage](../advanced-usage/README.md) for advanced techniques
- Review the [For Players](../for-players/README.md) guide to understand the player experience
