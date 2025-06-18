# Eventide Roleplaying System for Foundry VTT

## System Requirements

- Foundry VTT v13.341 or higher
- A modern web browser (Chrome, Firefox, Edge, Safari)

## Installation

1. In Foundry VTT, navigate to the "Game Systems" tab
2. Click "Install System"
3. In the "Manifest URL" field, paste: https://github.com/EventideMiles/eventide-rp-system/releases/latest/download/system.json
4. Click "Install"

Alternatively, you can download the latest release from the [Releases](https://github.com/EventideMiles/eventide-rp-system/releases) page and install it manually.

![Foundry v13.341+](https://img.shields.io/badge/foundry-v13.341+-green)
[![License: LGPL 2.1+](https://img.shields.io/badge/License-LGPL_2.1+-blue.svg)](https://www.gnu.org/licenses/lgpl-2.1.html)

A comprehensive roleplaying system for Foundry VTT that emphasizes dynamic character abilities through status effects, features, and gear. The system provides an intuitive and flexible gaming experience with powerful tools for both players and Game Masters.

## Core Features

### Five-Ability System

The Eventide system is built around five core abilities that determine all character capabilities:

- **Acrobatics**: Agility, balance, finesse combat, ranged attacks, stealth
- **Physical**: Raw strength, heavy combat, grappling, intimidation, lifting
- **Fortitude**: Resilience, stamina, damage resistance, endurance (affects Resolve/health)
- **Will**: Mental fortitude, magic, combat powers, leadership (affects Power/mana)
- **Wits**: Intelligence, perception, tactics, awareness, problem-solving

### Dynamic Character Modification

#### **Status Effects System**
- **Temporary conditions** applied during gameplay (poisoned, blessed, frightened)
- **Environmental effects** from circumstances (wet, cold, inspired)
- **Visual token indicators** for easy tracking
- **Flexible creation tools** with the Effect Creator macro
- **Stacking and interaction** mechanics for complex scenarios

#### **Features System**
- **Permanent character traits** representing background and training
- **Racial or species abilities** for fantasy settings
- **Character development** rewards for growth and achievement
- **Rich HTML descriptions** for immersive storytelling
- **Active roll capabilities** with flexible mechanics

#### **Gear System**
- **Dynamic equipment effects** that modify abilities when equipped/unequipped
- **Cursed items** that cannot be easily removed
- **Usage tracking** for limited-use items
- **Equipment categories** (weapons, armor, tools, etc.)
- **Combat integration** for gear that functions as weapons
- **Optional chat messages** for equipment changes

#### **Hidden Abilities System**
- **GM-controlled modifiers** for special scenarios
- **Dice pool modifications** that change what dice characters roll
- **Critical range adjustments** for enhanced or reduced critical chances
- **Special vulnerability mechanics** for unique character states

### Combat System

#### **Flexible Initiative**
- **Customizable initiative formula** with configurable decimal places
- **Automatic rolling options** for NPCs and/or players
- **Privacy controls** for NPC initiative (hidden from players)
- **Configurable combat round duration**

#### **Ability-Based Combat**
- **Any ability can be used** for attacks based on narrative context
- **Armor Class calculation** (Ability + 11) shown automatically to GMs
- **Critical success and failure** mechanics with customizable ranges
- **Tactical depth** through positioning, status effects, and gear

#### **Combat Powers**
- **Special abilities** that cost Power to use
- **Ability-based activation** with flexible targeting
- **Rich descriptions** with HTML formatting support
- **Prerequisites system** for complex abilities
- **Integration** with status effects and transformations

### Advanced Systems

#### **Transformation System**
- **Comprehensive character changes** affecting abilities, resources, and appearance
- **Embedded combat powers** available only while transformed
- **Token modifications** for visual representation
- **Narrative integration** with rich descriptions

#### **Resource Management**
- **Resolve** (health/stamina) derived from Fortitude
- **Power** (mana/special abilities) derived from Will
- **Dynamic modification** through gear, status effects, and features
- **Healing and damage** application with formatted chat messages

### User Interface and Experience

#### **Multiple Themes**
- **Blue theme** (default) balances visuals with ease of use
- **Dark theme** best for long play sessions
- **Green theme** perfect to get into character with nature feel
- **Light theme** available for bright environments
- **Orange theme** reminicent of sunset
- **Purple theme** a bright dark mode theme for those who love purple

#### **System Sounds**
- **Configurable audio feedback** for key actions
- **Volume controls** and enable/disable options
- **Custom sounds** for healing, damage, status effects, gear changes, combat powers, and initiative
- **Immersive audio experience** that enhances gameplay

#### **Rich Text Support**
- **HTML formatting** in descriptions and biographies
- **Color customization** for effects and items
- **Visual indicators** on tokens for status effects and gear

### Powerful Macro System

The system includes a comprehensive macro library (ERPS Macros compendium):

#### **Creation Tools**
- **Effect Creator**: Intuitive interface for creating status effects and features
- **Gear Creator**: Comprehensive tool for creating equipment with effects
- **Transformation Creator**: Advanced tool for character transformations

#### **Player Tools**
- **Player versions** of creation macros for self-management
- **Ability rolling** macros for quick access
- **Gear management** tools for equipment handling

#### **GM Tools**
- **Damage and healing** scripts with formatted chat output
- **Status effect management** with intensify/weaken options
- **Target selection** and effect application tools
- **Settings memory** for frequently used configurations

#### **Extensible Design**
- **API** for creating custom macros
- **Documentation** for learning about how to integrate with the system
- **Configurable parameters** for different scenarios
- **Integration** with all system features

## Item Types and Functionality

### Features
- **Permanent character traits** with lasting effects
- **Background abilities** reflecting training and experience
- **Optional rolling capabilities** with ability-based mechanics
- **Rich descriptions** with HTML formatting support

### Gear
- **Equippable items** with dynamic effects
- **Class categorization** for organization
- **Usage tracking** for consumables
- **Combat integration** for weapons and tools
- **Cursed item support** for items that resist removal

### Status Effects
- **Temporary modifications** applied during gameplay
- **Environmental conditions** from circumstances
- **Combat conditions** like poisoned, blessed, or stunned
- **Visual representation** on tokens

### Combat Powers
- **Special abilities** with Power costs
- **Ability-based activation** rolls
- **Damage or effect** application
- **Prerequisites** for complex abilities

### Transformations
- **Comprehensive character changes** affecting multiple aspects
- **Embedded combat powers** available only while transformed
- **Resource modifications** to health and power pools
- **Visual changes** including token modifications

## Usage

### For Game Masters

#### **Character and World Management**
- **Modify character abilities** through status effects, features, and gear
- **Create custom equipment** and place it in the world
- **Design NPCs** with unique combat powers and abilities
- **Apply environmental effects** through status effects

#### **Combat and Encounter Management**
- **Track initiative** with flexible, automated options
- **Apply damage and healing** with formatted chat messages
- **Manage status effects** with visual indicators
- **Control hidden abilities** for special scenarios

#### **System Configuration**
- **Customize initiative** formulas and automation
- **Configure audio settings** for immersive experience
- **Set privacy controls** for NPC information
- **Choose themes** that work best for your group

#### **Advanced Features**
- **Hidden abilities system** for special mechanics
- **Transformation management** for dramatic character changes
- **Macro customization** for campaign-specific needs
- **Integration tools** for complex scenarios

### For Players

#### **Character Creation and Development**
- **Build characters** with unique combinations of features
- **Manage equipment** with dynamic effects
- **Track character growth** through features and abilities
- **Customize appearance** with rich text descriptions

#### **Gameplay**
- **Roll abilities** directly from character sheets
- **Use combat powers** with integrated resource management
- **Manage equipment** with easy equip/unequip controls
- **Track status effects** with visual indicators

#### **Interface Customization**
- **Choose themes** for comfortable viewing
- **Configure audio** preferences
- **Organize inventory** with equipped/unequipped separation
- **Access information** through popup details

## System Settings and Configuration

### Combat Settings
- **Initiative formula** customization
- **Automatic rolling** for NPCs and players
- **Privacy controls** for NPC information
- **Combat round duration** configuration

### Interface Settings
- **Theme selection** (Dark/Light)
- **Equipment change messages** toggle
- **Token icon display** options
- **Chat message formatting** preferences

### Audio Settings
- **System sounds** enable/disable
- **Volume controls** for all sound types
- **Custom sound** configuration
- **Individual sound** toggles for specific actions

### Performance Settings
- **Optimization options** for large campaigns
- **Memory management** for extensive item libraries
- **Network optimization** for remote play

## Contributing

This project is licensed under the GNU Lesser General Public License 2.1+. When contributing:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

Important licensing notes:

- **Core system modifications** must be shared under LGPL 2.1+
- **New core features** should be licensed under LGPL 2.1+
- **Module packs and extensions** can use different licenses
- **Include appropriate copyright notices** in new files

## Development

### Prerequisites

- Foundry VTT (v13.341 or higher)
- Basic knowledge of JavaScript and Foundry VTT systems
- Node.js (for building language files, SCSS, and minification)

### Setup for Development

1. Clone the repository
2. Link or copy to your Foundry systems directory
3. Run `npm install` to install dependencies
4. Restart Foundry VTT
5. Make changes and test in a running Foundry world

**Optional**: Build for distribution with `npm run release:win` or `npm run release:linux`

### Language File Organization

The system uses a modular approach for language files:

1. **Source files** in `lang/src/<language-code>` directories
2. **Organized by function**: abilities, actors, errors, forms, items, messages, settings, misc, ui
3. **Build process** combines source files into single language files
4. **Easy localization** with clear file organization

To build language files: `npm run build:lang`

To add a new language:
1. Create directory in `lang/src` with language code
2. Copy and translate JSON files from existing language
3. Run build script
4. Update `system.json` to include new language

## Compendiums and Content

### ERPS Macros Compendium
- **Effect Creator**: Create status effects and features
- **Gear Creator**: Create equipment with effects
- **Transformation Creator**: Create character transformations
- **Player Tools**: Self-management macros for players
- **GM Tools**: Advanced management and application tools

### NPC Compendium
- **Example NPCs** demonstrating system capabilities
- **Template characters** for quick campaign setup
- **Stat blocks** optimized for the Eventide system

### Items Compendium
- **Example gear** showing equipment possibilities
- **Status effects** for common conditions
- **Features** for character backgrounds and development
- **Combat powers** demonstrating special abilities

## Acknowledgements

This system evolved from the excellent [Boilerplate System](https://github.com/asacolips-projects/boilerplate) by Asacolips Projects. While it has grown significantly since then, we're grateful for the strong foundation it provided.

## License

This project is licensed under the GNU Lesser General Public License 2.1+ - see the [LICENSE.md](LICENSE.md) file for details.

Key points:

- **Core system** remains open source under LGPL 2.1+
- **Modifications to core** must be shared under LGPL 2.1+
- **Module packs and extensions** can use different licenses
- **Commercial use** is permitted for both core and extensions
- **Asset compatibility** with all included Creative Commons and open source assets

## Support

For bug reports and feature requests, please use the GitHub issues system.

- Review existing issues before reporting bugs and feature requests
- Check the documentation in the `docs/` directory
- Join discussions in GitHub Discussions for general questions

## Changelog

See the [Releases](https://github.com/EventideMiles/eventide-rp-system/releases) page for version notes and system updates.
