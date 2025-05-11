# Eventide Roleplaying System for Foundry VTT

## System Requirements

- Foundry VTT v13.341 or higher
- A modern web browser (Chrome, Firefox, Edge, Safari)

## Installation

- WIP

1. In Foundry VTT, navigate to the "Game Systems" tab
2. Click "Install System"
3. In the "Manifest URL" field, paste: https://github.com/EventideMiles/eventide-rp-system/releases/latest/download/system.json
4. Click "Install"

Alternatively, you can download the latest release from the [Releases](https://github.com/EventideMiles/eventide-rp-system/releases) page and install it manually.

![Foundry v13](https://img.shields.io/badge/foundry-v13-green)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

A custom roleplaying system for Foundry VTT that emphasizes dynamic character abilities through status effects features, and gear. The system is focused on providing an intuitive and flexible gaming experience.

## Core Features

### Character Management

- Five core abilities: Acrobatics, Physical, Fortitude, Will, and Wits
- Rich HTML-supported biography fields for both characters and NPCs
- Streamlined character creation and management
- Gear, Status, Feature, and Combat Power management easy via the item system and system provided macros

### Dynamic Ability System

- Status effects and gear that modify character abilities dynamically - allowing for prep work before session and improvization during session to react to unexpected player choices
- Feature-based ability modifications for lasting character changes - reflect your character's background and development
- Hidden abilities support for GM-controlled special effects - such as changing rolled dice, adding advantage / disadvantage, or modifying critical ranges
- Intuitive dialogs for formatted system control

### Equipment and Powers

- Extensive Combat Gear Management system - Quick and easy to manage combat gear and use it:
  - As extensive as you want it to be: items can have effects on stats, roll data like a combat power, they can track uses, and can be equipped and unequipped
  - Equipped/unequipped status can be toggled directly from item sheets or character sheets
  - Optional chat messages for equipment changes (configurable in system settings)
  - Cursed Items - items that a player cannot unequip at will, and which may come with powers and drawbacks different than their first appearance
- Combat powers with detailed descriptions and reminders to ensure you fulfill their requirements / have enough power to use them
- Status effect tracking and management - formatted chat messages for when they apply and expire
- You can have features, statuses, and gear display their icon on the player's token: reminders of the most important changes to their stats

### Combat and Initiative

- Customizable initiative formula with configurable decimal places
- Options to automatically roll initiative for NPCs and/or players
- Privacy control for NPC initiative rolls - can be hidden from players and shown only to the GM
- Configurable combat round duration

### User Interface

- Multiple theme options: Dark is the default, but Light is also available
- System sounds for key actions like healing, damage, status effects, and more: all configurable in the system settings

## Usage

### For Game Masters

- Modify character abilities through status effects and features
- Create gear, place it in the world, and let your players interact with whatever you can imagine
- Manage abilities and hidden abilities using the status system, feature system, and gear via the effect and gear creator
- Design NPCs with custom combat powers, inflictable status effects, and features
- Track combat powers and their effects
- Popup system provides details on anything on any player - simply click the item and get information about it
- Apply damage and healing to characters - with chat messages to keep tabs on what's happening
- Configure system sounds for various actions:
  - Enable/disable system sounds
  - Adjust system sound volume
  - Configure custom sounds for healing, damage, status effects, gear equipping/unequipping, combat powers, and initiative rolls
- Configure system settings to customize your game experience:
  - Adjust initiative formula and display precision
  - Control visibility of NPC initiative rolls
  - Toggle automatic initiative rolling for NPCs and players
  - Set default combat round duration
  - Enable/disable gear equipment change messages
  - Choose UI theme that works best for your group

### For Players

- Create and customize characters with unique combinations of features
- Manage equipment and combat powers - your creativity and the GM's guidance are the limits of what you can do
  - Easily equip and unequip gear items directly from item sheets
  - View equipped items separately from unequipped items for better inventory management
- Track active status effects - clicking to roll them shows you the status but doesn't reroll it to the chat
- Roll abilities directly from character sheets or using one of the macros included in the system
- Configure your interface with different theme options

## Contributing

This project is licensed under the Apache License 2.0. When contributing:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

Important licensing notes:

- All modifications to existing files must be shared under Apache License 2.0
- New files you create can be licensed differently if desired
- Asacolips Projects / Foundry Mods may use contributions under the MIT license
- Include appropriate copyright notices in new files

## Development

### Prerequisites

- Foundry VTT (v12 or higher)
- Basic knowledge of JavaScript and Foundry VTT systems
- Node.js (for building language files / scss / terser)

### Setup for Development

1. Clone the repository
2. Link or copy to your Foundry systems directory
3. Run npm install to install dependencies for sass and terser
4. Restart Foundry VTT
5. Make any changes in your favorite development tools and test them against a running foundry world

- **Optional**: if you want to build your modifications for distribution you can run npm run release:win or npm run release:linux to build a minified .zip file.

### Language File Organization

The system uses a modular approach to manage language files:

1. Source files are organized in the `lang/src/<language-code>` directory (e.g., `lang/src/en` for English)
2. Each language directory contains multiple JSON files, each focused on a specific section of the UI:

   - `abilities.json`: Character abilities and hidden abilities
   - `actor.json`: Actor-related translations
   - `errors.json`: Error messages and notifications
   - `forms.json`: Form labels, buttons, and UI elements
   - `item.json`: Item-related translations
   - `messages.json`: Chat and notification messages
   - `settings.json`: System settings translations
   - `misc.json`: Miscellaneous translations
   - `ui.json`: UI elements and window titles

3. These source files are combined into a single language file (e.g., `lang/en.json`) using the build script

### Building Language Files

To build the language files:

1. Make changes to the source files in the `lang/src/<language-code>` directory
2. Run the build script:
   ```
   npm run build:lang
   ```
3. The script will process all language directories in `lang/src` and generate corresponding language files in the `lang` directory

To add a new language:

1. Create a new directory in `lang/src` with the language code (e.g., `lang/src/fr` for French)
2. Copy the JSON files from an existing language directory and translate the values
3. Run the build script to generate the language file
4. Update the `system.json` file to include the new language

## Acknowledgements

This system evolved from the excellent [Boilerplate System](https://github.com/asacolips-projects/boilerplate) by Asacolips Projects. While it has grown significantly since then, we're grateful for the strong foundation it provided.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE.md](LICENSE.md) file for details.

Key points:

- Source code must remain open source
- Modifications must be shared under Apache License 2.0
- Commercial use is permitted
- Original Boilerplate code remains under MIT license
- Out of gratitude for our starting point: contributions to this project may be used by Asacolips Projects under MIT license

## Support

For bug reports and feature requests, please use the GitHub issues system. For general support:

WIP

- Review existing issues before reporting bugs and feature requests
- Join our [Discord community](https://discord.gg/your-discord-link) for real-time help
- Check the [Wiki](https://github.com/yourusername/eventide-rp-system/wiki) for documentation

## Changelog

See the [Releases](https://github.com/yourusername/eventide-rp-system/releases) page for version notes.
