# Release Notes

Welcome to the Eventide RP System release notes! This page provides an overview of all releases with links to detailed version-specific documentation.

## Latest Release

**[v13.17.5](release-notes/v13.17.5.md)** - Enhanced Context Menus & Code Quality _(November 2025)_

**Key Highlights:**

- Universal item creation from context menus on any tab
- Comprehensive context menus for all item types across all sheets
- Fixed internationalization issues with hardcoded strings
- Resolved event listener memory leak for improved long-term performance

## Recent Major Releases

**[v13.17.2](release-notes/v13.17.2.md)** - UI and Usability Improvements _(November 2025)_

Context menus for action card management and optimized header layout.

**Key Highlights:**

- Added context menus to action cards on actor sheets for moving between groups
- Added context menus to action cards on item sheets
- Optimized actor sheet header layout to provide more room for main content area

**[v13.17.0](release-notes/v13.17.0.md)** - Transformation to Actor _(November 2025)_

Transformations can create actors now and vice-versa

**Key Features:**

- New scripts: for conversion both directions
- Drag and Drop implementation for actor to transformation: drag one actor into another's sheet to transform them
- Migration script for old transformation versions: run once if you used a version prior to 13.17.0 and you'll be all set

**[v13.16.0](release-notes/v13.16.0.md)** - Action Card Groups _(October 2025)_

Action cards now can be grouped together both within transformations and on actors. They can be drag-and-dropped to and from other actors and transformations.

**Key Highlights:**

- Made action card groups
- Ensured groups can be migrated the same way singular actions currently can be
- Ease of use: just drag two skills together to get started with groups

**[v13.15.5](release-notes/v13.15.5.md)** - Stability & Polish _(October 2025)_

Critical bug fixes for multi-level embedded items, enhanced action card UI with configuration callouts, and improved default settings based on user feedback.

**Key Highlights:**

- Fixed crash scenarios with deeply nested embedded items
- Enhanced action card display with callouts for misconfigured cards
- Improved embedded transformation reliability
- Better default configurations

### [v13.15.0](release-notes/v13.15.0.md) - Embedded Transformations & Export Features _(October 2025)_

Action cards can now contain embedded transformations, plus new export functionality for action cards and combat powers from transformations.

**Key Features:**

- Embedded transformations in action cards
- Export system for reusable components
- Enhanced transformation sheets
- Roll value damage support

### [v13.14.0](release-notes/v13.14.0.md) - Player Action Workflows & Item Selection _(October 2025)_

New GM approval workflow for player-initiated action cards and enhanced item creation with quick-add buttons.

**Key Features:**

- Player action approval system
- Quick-add buttons for combat powers and status effects
- Transformation action cards
- Improved linked token support

### [v13.13.3](release-notes/v13.13.3.md) - Action Modes & Advanced Repetition System _(August 2025)_

Powerful Action Modes system that transforms action cards into dynamic, repeatable actions with sophisticated control over repetition behavior.

**Key Features:**

- Dynamic repetitions with roll formula support
- Repeat to hit, selective damage, and status per success
- Resource management and timing control
- New Config tab interface

### [v13.11.0](release-notes/v13.11.0.md) - Action Cards System & Combat Automation

Comprehensive Action Cards system that revolutionizes combat automation and action management.

**Key Features:**

- Attack chain and saved damage cards
- Automated damage, healing, and status application
- Smart targeting and inventory integration
- GM vs player workflows

### [v13.10.0](release-notes/v13.10.0.md) - Feature Roll System & Circumstantial Bonuses

Enhanced character customization through circumstantial bonuses and feature-based rolls.

**Key Features:**

- Active feature rolls with circumstantial bonuses
- Sound system integration
- UI improvements and layout fixes
- Comprehensive documentation overhaul

## Version Timeline

| Version      | Release Date  | Focus                             |
| ------------ | ------------- | --------------------------------- |
| **v13.17.5** | November 2025 | Enhanced Context Menus & Quality  |
| v13.17.2     | November 2025 | UI and Usability Improvements     |
| v13.17.0     | November 2025 | Transformation to Actor           |
| v13.16.0     | October 2025  | Action Card Groups                |
| v13.15.5     | October 2025  | Stability & Polish                |
| v13.15.0     | October 2025  | Embedded Transformations & Export |
| v13.14.0     | October 2025  | Player Workflows & Item Selection |
| v13.13.3     | August 2025   | Action Modes & Repetition         |
| v13.11.0     | 2025          | Action Cards & Combat Automation  |
| v13.10.0     | 2025          | Feature Rolls & Bonuses           |

## Quick Navigation

### By Feature Area

- **Action Cards**: [v13.11.0](release-notes/v13.11.0.md), [v13.13.3](release-notes/v13.13.3.md), [v13.14.0](release-notes/v13.14.0.md), [v13.15.0](release-notes/v13.15.0.md), [v13.16.0](release-notes/v13.16.0.md)
- **Transformations**: [v13.14.0](release-notes/v13.14.0.md), [v13.15.0](release-notes/v13.15.0.md), [v13.15.5](release-notes/v13.15.5.md), [v13.17.0](release-notes/v13.17.0.md)
- **Features & Bonuses**: [v13.10.0](release-notes/v13.10.0.md)
- **Combat Automation**: [v13.11.0](release-notes/v13.11.0.md), [v13.13.3](release-notes/v13.13.3.md)
- **Conversion & Migration**: [v13.17.0](release-notes/v13.17.0.md)

### Documentation Links

- [Action Cards Guide](advanced-usage/action-cards.md) - Complete action cards documentation
- [Action Modes Guide](advanced-usage/action-modes-pull-request.md) - Action modes and repetition system
- [Features System Guide](system-features/features.md) - Circumstantial bonuses and feature rolls
- [Quick Start Guide](getting-started/quick-start.md) - Get started with the system

## Community and Support

### Feedback and Issues

We encourage users to:

- **Report Issues**: Use [GitHub Issues](https://github.com/your-repo/issues) for bug reports
- **Request Features**: Share your ideas for new features and improvements
- **Share Creations**: Contribute examples and creative uses of the system
- **Improve Documentation**: Suggest documentation improvements and additions

### Getting Help

- Check version-specific release notes for detailed feature information
- Review the documentation guides for comprehensive system information
- Join community discussions for tips and best practices

---

**Current Version**: v13.17.5 | **Foundry VTT Compatibility**: v13+ | **Last Updated**: November 2025
