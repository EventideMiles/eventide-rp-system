# Eventide Roleplaying System Documentation

Welcome to the comprehensive documentation for the Eventide Roleplaying System for Foundry VTT. This documentation will help you get started with the system and guide you through its features.

## Quick Start

### New to Eventide RP?

- **[Installation Guide](getting-started/installation.md)** - Complete setup instructions
- **[Quick Start Guide](getting-started/quick-start.md)** - Get playing in 10 minutes or less

### What's New?

- **[What's New in v13.11.0](WHATS_NEW.md)** - Action Cards system and combat automation revolution
- **What's New In v13.10.x** - Feature Roll system, circumstantial bonuses, and various improvements

### Ready to Dive Deeper?

- **[Getting Started](getting-started/README.md)** - Comprehensive introduction and setup
- **[System Features](system-features/README.md)** - Detailed explanation of system mechanics

## Documentation Sections

### [Getting Started](getting-started/README.md)

Essential information for new users and initial setup.

**Contents:**

- **[Installation Guide](getting-started/installation.md)** - Step-by-step installation and configuration
- **[Quick Start Guide](getting-started/quick-start.md)** - Fast-track introduction for immediate play
- **System overview** and first-time setup guidance
- **Troubleshooting** common installation and setup issues

### [For Game Masters](for-gms/README.md)

Comprehensive guide for running games with Eventide RP System.

**Contents:**

- **[GM Guide](for-gms/README.md)** - Complete game master documentation
- **[Macro Guide](for-gms/macro-guide.md)** - Master the powerful macro system
- **[Transformations](for-gms/transformations.md)** - Advanced character transformation system
- **NPC creation** and encounter management
- **Advanced GM tools** and techniques

### [For Players](for-players/README.md)

Guide for creating and playing characters in Eventide RP.

**Contents:**

- **[Player Guide](for-players/README.md)** - Complete player documentation
- **[Character Creation](for-players/character-creation.md)** - Detailed character building guide
- **Character sheet** navigation and usage
- **Equipment management** and status effects
- **Combat mechanics** from a player perspective

### [System Features](system-features/README.md)

Detailed explanation of system mechanics and features.

**Contents:**

- **[Features System](system-features/features.md)** - Character customization and circumstantial bonuses
- **[Combat Mechanics](system-features/combat.md)** - Complete combat system guide
- **[Status Effects](system-features/status-effects.md)** - Dynamic character modification system
- **[System Settings](system-features/settings.md)** - Configuration and customization options
- **Core mechanics** and ability system
- **Item types** and resource management

### [Advanced Usage](advanced-usage/README.md)

Tips, tricks, and advanced configuration techniques.

**Contents:**

- **[Action Cards Guide](advanced-usage/action-cards.md)** - Combat automation and complex action sequences
- **[Developer Guide](advanced-usage/developer-guide.md)** - Complete system architecture, design patterns, and development guide
- **[ApplicationV2 Window Sizing Fix](advanced-usage/applicationv2-window-sizing-fix.md)** - Fix for double-click maximize issues
- **Advanced customization** techniques
- **Performance optimization** strategies
- **Integration** with other Foundry modules
- **Troubleshooting** complex issues

## Documentation Quality and Accuracy

### Recent Improvements

This documentation has been thoroughly reviewed and updated to ensure accuracy with the current codebase:

- **Code Examples**: All code partials have been verified against the actual implementation
- **Architecture Details**: Enhanced coverage of the mixin pattern and Application V2 architecture
- **Error Handling**: Comprehensive documentation of the ErrorHandler and Logger systems
- **Technical Accuracy**: Updated examples to reflect real implementation complexity

### Known Issues

#### Setting Name Spelling Error

**Important for Developers**: The initiative formula setting is named `"initativeFormula"` (missing 'i') instead of `"initiativeFormula"`. This is a known issue that likely cannot be corrected without breaking existing worlds in production.

**Impact**: This affects:
- Setting registration and retrieval in code
- Localization keys
- Any custom development that references this setting

**Usage**: Always use the actual (misspelled) name when referencing this setting:
```javascript
// Correct usage
const formula = game.settings.get("eventide-rp-system", "initativeFormula");
```

### Documentation Standards

- **Accuracy**: All code examples are verified against the current codebase
- **Completeness**: Examples include proper imports and error handling
- **Clarity**: Complex implementations are explained with context
- **Maintenance**: Documentation is updated with each system release

## Key System Features

### Dynamic Character System

- **Five Core Abilities**: Acrobatics, Physical, Fortitude, Will, and Wits
- **Status Effects**: Temporary and permanent character modifications
- **Equipment System**: Gear that dynamically affects character capabilities
- **Transformations**: Comprehensive character changes including size, abilities, and powers

### Powerful GM Tools

- **Macro System**: Content creation tools for gear, effects, and transformations
- **Effect Creator**: Build custom status effects and character features
- **Gear Creator**: Design equipment with mechanical effects
- **Damage/Healing Tools**: Streamlined health and resource management

### Flexible Combat

- **Ability-Based**: Use your five core abilities for all combat actions
- **Initiative System**: Customizable formulas and automation options
- **Tactical Depth**: Multiple action types and positioning considerations
- **Quick Resolution**: Streamlined mechanics that keep action moving

### Rich Customization

- **Theme System**: Multiple visual themes for different preferences
- **Sound Integration**: Configurable audio feedback for game events
- **Settings Control**: Extensive options for tailoring the experience
- **Localization**: Support for multiple languages

## Getting Help

### Documentation Navigation

- **Use the sidebar** to navigate between sections
- **Follow cross-references** to related topics
- **Check the Quick Start** if you're new to the system
- **Explore Advanced Usage** for expert techniques

### Community Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/EventideMiles/eventide-rp-system/issues)
- **Documentation Issues**: Use the "documentation" label for doc-related questions
- **Feature Requests**: Suggest improvements or new features
- **Bug Reports**: Help improve the system by reporting problems

### Contributing

- **Documentation**: Help improve these guides
- **Translations**: Assist with localization efforts
- **Code**: Contribute to system development
- **Testing**: Help test new features and report issues

## About This Documentation

### Organization

This documentation is organized by user role and complexity:

- **Getting Started**: For new users and basic setup
- **Role-Specific Guides**: Tailored for GMs and players
- **System Features**: Detailed mechanics and features
- **Advanced Usage**: Expert techniques and development

### Maintenance

- **Regular Updates**: Documentation is updated with each system release
- **Community Input**: Improvements based on user feedback
- **Version Tracking**: Documentation matches system version
- **Comprehensive Coverage**: All features documented with examples

### Accessibility

- **Clear Structure**: Logical organization with consistent formatting
- **Cross-References**: Links between related topics
- **Examples**: Practical examples for all major features
- **Multiple Formats**: Different learning styles accommodated

## Version Information

- **System Version**: 13.11.0
- **Foundry Compatibility**: v13.341 minimum, v13.345 verified (NOTE: We will not be tracking . foundry releases after v13.345 since they do not make major api changes mid-major version and I don't want the system complaining about compatibility with minor version bumps)
- **Documentation Version**: Updated for latest release
- **Last Updated**: Check [GitHub Releases](https://github.com/EventideMiles/eventide-rp-system/releases) for latest information

## Quick Reference

### Essential Links

- **[Installation](getting-started/installation.md)** - Get the system installed
- **[Quick Start](getting-started/quick-start.md)** - Start playing immediately
- **[GM Guide](for-gms/README.md)** - Complete GM documentation
- **[Player Guide](for-players/README.md)** - Complete player documentation
- **[Combat System](system-features/combat.md)** - Combat mechanics
- **[Status Effects](system-features/status-effects.md)** - Character modification system

### Common Tasks

- **Creating Characters**: [Character Creation Guide](for-players/character-creation.md)
- **Making Custom Gear**: [Macro Guide](for-gms/macro-guide.md)
- **Configuring Settings**: [System Settings](system-features/settings.md)
- **Running Combat**: [Combat Mechanics](system-features/combat.md)
- **Managing Effects**: [Status Effects](system-features/status-effects.md)

---

**Ready to get started?** Begin with the [Installation Guide](getting-started/installation.md) or jump to the [Quick Start Guide](getting-started/quick-start.md) if you're ready to play immediately!
