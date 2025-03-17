# Eventide Roleplaying System for Foundry VTT

![Foundry v12](https://img.shields.io/badge/foundry-v12-green)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

A custom roleplaying system for Foundry VTT that emphasizes dynamic character abilities through status effects features, and gear. The system is focused on providing an intuitive and flexible gaming experience.

## Core Features

### Character Management

- Five core abilities: Acrobatics, Physical, Fortitude, Will, and Wits
- Rich HTML-supported biography fields for both characters and NPCs
- Streamlined character creation and management
- Gear, Status, Feature, and Combat Power management easy via the item system and system provided macros.

### Dynamic Ability System

- Status effects that modify character abilities dynamically - allowing for prep work before session and improvization during session to react to unexpected player choices
- Feature-based ability modifications for lasting character changes
- Hidden abilities support for GM-controlled special effects - such as changing rolled dice, adding advantage / disadvantage, or modifying critical ranges
- Intuitive dialogs for formatted system control

### Equipment and Powers

- Extensive Combat Gear Management system - Quick and easy to manage combat gear and use it:
  - As extensive as you want it to be: items can have effects on stats, roll data like a combat power, they can track uses, and can be equipped and unequipped
- Combat powers with detailed descriptions and reminders to ensure you fulfill their requirements / have enough power to use them
- Status effect tracking and management - formatted chat messages for when they apply and expire

## Usage

### For Game Masters

- Modify character abilities through status effects and features
- Manage abilties and hidden abilities using the status system and feature system via the effect creator
- Design NPCs with custom combat powers, inflictable status effects, and features
- Track combat powers and their effects
- Popup system provides details on anything on any player - simply click the item and get information about it
- Apply damage and healing to characters - with chat messages to keep tabs on what's happening

### For Players

- Create and customize characters with unique combinations of features
- Manage equipment and combat powers - your creativity and the gm's guidance are the limits of what you can do
- Track active status effects - clicking to roll them shows you the status but doesn't reroll it to the chat
- Roll abilities directly from character sheets or using one of the macros included in the system

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

### Setup for Development

1. Clone the repository
2. Link or copy to your Foundry systems directory
3. Run npm install to install dependencies for sass and terser
4. Restart Foundry VTT
5. Make any changes in your favorite development tools and test them against a running foundry world

- **Optional**: if you want to build your modifications for distribution you can run npm run release:win or npm run release:linux to build a minified .zip file.

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

- Review existing issues before reporting bugs and feature requests
