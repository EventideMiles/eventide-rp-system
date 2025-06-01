# System Settings and Configuration

The Eventide RP System offers extensive customization options to tailor the gaming experience to your group's preferences. This guide covers all available settings and their effects.

## Settings Overview

### Setting Scopes

- **Client Settings**: Personal preferences that only affect your own experience
- **World Settings**: Game rules that affect all players (GM-only access)
- **Hidden Settings**: Advanced options not shown in the main settings menu

### Accessing Settings

1. **Navigate to Settings** → **Configure Settings**
2. **Find "System Settings"** section
3. **Modify desired options**
4. **Save changes** (some may require reload)

## Client Settings (Personal Preferences)

These settings affect only your personal experience and can be configured by any user.

### Application Theme

**Setting**: `sheetTheme`
**Default**: Night (Blue)
**Options**:

- **Night (Blue)**: Dark blue theme with cool tones
- **Twilight (Gold)**: Warm golden theme with amber accents
- **Dawn (Green)**: Natural green theme with earth tones
- **Midnight (Black)**: Pure black theme for minimal distraction
- **Dusk (Purple)**: Rich purple theme with mystical feel
- **Noon (Light)**: Light theme for bright environments

**Effect**: Changes the visual appearance of all system applications including character sheets, item sheets, and creator tools.

### Default Character Sheet Tab

**Setting**: `defaultCharacterTab`
**Default**: Features
**Options**:

- **Features**: Character traits and abilities
- **Combat Powers**: Special abilities and spells
- **Biography**: Character background and description
- **Status Effects**: Active conditions and temporary effects
- **Gear**: Equipment and inventory

**Effect**: Determines which tab opens by default when you open a character sheet.

### Enable System Sounds

**Setting**: `enableSystemSounds`
**Default**: Enabled
**Options**: Enabled/Disabled

**Effect**: Controls whether you hear system sound effects for various actions like damage, healing, and status changes.

## World Settings (GM-Only)

These settings affect game mechanics and are restricted to GM access.

### Combat Settings

#### Initiative Formula

**Setting**: `initativeFormula`
**Default**: `1d@hiddenAbilities.dice.total + @statTotal.mainInit + @statTotal.subInit`
**Requires Reload**: Yes

**Function**: Determines how initiative is calculated in combat.

- `@hiddenAbilities.dice.total`: Character's dice pool size
- `@statTotal.mainInit`: Average of Acrobatics and Wits
- `@statTotal.subInit`: Sum of all abilities ÷ 100 (tiebreaker)

**Customization Examples**:

- Simple: `1d20 + @abilities.acro.total + @abilities.wits.total`
- Complex: `1d@hiddenAbilities.dice.total + @abilities.acro.total + @abilities.wits.total + @attributes.level.value`

#### Initiative Decimal Places

**Setting**: `initiativeDecimals`
**Default**: 2
**Range**: 0-4
**Requires Reload**: Yes

**Effect**: Controls how many decimal places are shown for initiative values. Higher precision helps with tiebreaking.

#### Auto-Roll NPC Initiative

**Setting**: `autoRollNpcInitiative`
**Default**: Enabled

**Effect**: Automatically rolls initiative for NPCs when they're added to combat, speeding up encounter setup.

#### Hide NPC Initiative Rolls

**Setting**: `hideNpcInitiativeRolls`
**Default**: Disabled

**Effect**: Conceals NPC initiative roll results from players, maintaining mystery about enemy capabilities.

#### Auto-Roll Player Initiative

**Setting**: `autoRollPlayerInitiative`
**Default**: Disabled

**Effect**: Automatically rolls initiative for player characters when combat begins. Some groups prefer manual rolling for player agency.

#### Default Combat Round Duration

**Setting**: `defaultCombatRoundDuration`
**Default**: 6 seconds
**Range**: 1-60 seconds

**Effect**: Sets the default duration for combat rounds. This is primarily for narrative reference and doesn't affect status effect durations (which are GM-controlled).

### Equipment Settings

#### Show Gear Equip Messages

**Setting**: `showGearEquipMessages`
**Default**: Enabled

**Effect**: Creates chat messages when gear items are equipped or unequipped, providing transparency about character changes.

#### Gear Creator: Default Equipped

**Setting**: `gearEquippedDefault`
**Default**: Enabled

**Effect**: When using the Gear Creator, new gear items are marked as equipped by default. Disable if you prefer gear to start unequipped.

#### Token Linking Behavior

**Automatic**: No setting required

**Effect**: Character actors are automatically linked to their tokens (changes to character sheet affect all tokens), while NPC actors remain unlinked (each token has independent data). This behavior is hardcoded and cannot be changed.

#### Default Token Vision Range

**Setting**: `defaultTokenVisionRange`
**Default**: 50 grid units
**Range**: 0-1000 grid units

**Effect**: Sets the default vision range for newly created actor tokens. All actor tokens automatically start with vision enabled using this range. Existing tokens are not affected when this setting is changed.

### Developer Settings

#### Testing Mode

**Setting**: `testingMode`
**Default**: Disabled

**Effect**: Enables additional debugging information and developer features. Only useful for system development and troubleshooting.

## Sound Settings (GM-Only)

Advanced audio customization is available through a dedicated sound settings menu.

### Accessing Sound Settings

1. **Navigate to Settings** → **Configure Settings**
2. **Find "Sound Effects"** in the System Settings section
3. **Click "Configure Sound Effects"**

### Available Sound Settings

#### Healing Sound

**Setting**: `sound_healing`
**Default**: System-provided healing sound
**Effect**: Played when healing is applied to characters

#### Damage Sound

**Setting**: `sound_damage`
**Default**: System-provided damage sound
**Effect**: Played when damage is applied to characters

#### Status Apply Sound

**Setting**: `sound_statusApply`
**Default**: System-provided status sound
**Effect**: Played when status effects are applied

#### Equipment Change Sound

**Setting**: `sound_equipmentChange`
**Default**: System-provided equipment sound
**Effect**: Played when gear is equipped or unequipped

#### Combat Power Sound

**Setting**: `sound_combatPower`
**Default**: System-provided power sound
**Effect**: Played when combat powers are used

#### Initiative Roll Sound

**Setting**: `sound_initiativeRoll`
**Default**: System-provided initiative sound
**Effect**: Played when initiative is rolled

### Sound Management Tools

#### Test Sounds

- **Individual Testing**: Play button next to each sound setting
- **Test All Sounds**: Play all sounds in sequence to preview

#### Reset Options

- **Individual Reset**: Reset specific sounds to default
- **Reset All Sounds**: Restore all sounds to system defaults

#### Custom Sound Files

- **Browse Files**: Select custom audio files from your system
- **Supported Formats**: MP3, WAV, OGG, and other web-compatible audio formats
- **File Paths**: Can use local files or web URLs

## Configuration Best Practices

### For Game Masters

#### Initial Setup

1. **Configure combat settings** before your first session
2. **Test initiative formula** with sample characters
3. **Set up sound preferences** for your environment
4. **Choose appropriate themes** for your campaign tone

#### Ongoing Management

- **Review settings** periodically as your campaign evolves
- **Gather player feedback** on interface and sound preferences
- **Adjust initiative settings** if combat feels too fast/slow
- **Experiment with themes** for different story arcs

### For Players

#### Personal Optimization

1. **Choose a comfortable theme** for extended play sessions
2. **Set default tab** to your most-used character sheet section
3. **Configure sound levels** appropriate for your environment
4. **Test settings** before important sessions

#### Group Coordination

- **Discuss theme preferences** if using shared screens
- **Coordinate with GM** on any setting-related issues
- **Provide feedback** on how settings affect your experience

## Troubleshooting Settings

### Common Issues

#### Settings Not Saving

- **Check Permissions**: Ensure you have appropriate access level
- **Browser Issues**: Try refreshing the page and re-applying settings
- **Conflicts**: Disable other modules temporarily to test

#### Initiative Problems

- **Formula Errors**: Check syntax if using custom initiative formulas
- **Decimal Display**: Adjust decimal places if initiative values look wrong
- **Auto-Roll Issues**: Verify auto-roll settings match your preferences

#### Sound Problems

- **Volume Issues**: Check both system and browser volume settings
- **File Paths**: Ensure custom sound files are accessible
- **Format Support**: Verify audio files are in supported formats

#### Theme Issues

- **Display Problems**: Some themes may not work well with certain monitors
- **Accessibility**: Choose high-contrast themes if needed
- **Performance**: Light themes may perform better on older devices

### Advanced Troubleshooting

#### Console Debugging

1. **Open Browser Console** (F12)
2. **Look for Error Messages** related to settings
3. **Report Issues** with specific error text

#### Reset to Defaults

1. **Individual Settings**: Use reset options in settings menu
2. **Complete Reset**: May require module disable/re-enable
3. **Backup Settings**: Note custom configurations before resetting

## Setting Combinations and Recommendations

### Campaign Types

#### Tactical Combat Focus

- **Initiative Decimals**: 2-3 for precise turn order
- **Auto-Roll NPC Initiative**: Enabled for speed
- **Hide NPC Initiative**: Enabled for mystery
- **Combat Round Duration**: 6 seconds (standard)

#### Narrative Focus

- **Initiative Decimals**: 0-1 for simplicity
- **Auto-Roll Player Initiative**: Consider enabling for flow
- **Gear Equip Messages**: Disabled to reduce chat clutter
- **Sound Effects**: Minimal for less distraction

#### New Player Groups

- **Default Tab**: Features (most important for new players)
- **Gear Equipped Default**: Enabled (less complexity)
- **Show Gear Messages**: Enabled (learning feedback)
- **Theme**: Light themes for clarity

#### Experienced Groups

- **Custom Initiative Formula**: Tailored to campaign needs
- **Advanced Sound Setup**: Custom audio for immersion
- **Testing Mode**: Enabled for experimentation
- **Complex Status Effects**: Full feature utilization

### Performance Optimization

#### Lower-End Devices

- **Light Theme**: Better performance than dark themes
- **Minimal Sounds**: Reduce audio processing load
- **Fewer Decimal Places**: Simpler calculations
- **Disabled Auto-Features**: Manual control for stability

#### High-End Setups

- **Rich Themes**: Full visual experience
- **Custom Sounds**: Enhanced audio immersion
- **Maximum Precision**: High decimal places for exact calculations
- **All Auto-Features**: Streamlined gameplay

## Future Settings

The system continues to evolve with new configuration options. Check the [GitHub repository](https://github.com/EventideMiles/eventide-rp-system) for:

- **Upcoming Features**: New settings in development
- **Feature Requests**: Community suggestions for new options
- **Beta Testing**: Early access to experimental settings

## Next Steps

- **Experiment**: Try different setting combinations to find your preferences
- **Document**: Keep notes on settings that work well for your group
- **Share**: Contribute successful configurations to the community
- **Feedback**: Report issues or suggestions for new settings

For advanced customization techniques, see [Advanced Usage](../advanced-usage/README.md). For specific feature documentation, see other sections in [System Features](README.md).
