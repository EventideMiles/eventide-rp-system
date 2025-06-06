# What's New in Eventide RP System v13.10.0

## Major Features and Improvements

### 🎯 Feature Roll System - Circumstantial Bonuses

**The biggest addition to this release is the comprehensive Feature Roll system that enables circumstantial bonuses for enhanced character customization and storytelling.**

#### **New Feature Roll Capabilities**

- **Active Feature Rolls**: Features can now include their own roll mechanics, allowing characters to make feature-specific rolls beyond the basic five abilities
- **Circumstantial Bonuses**: Characters can now receive situational advantages based on their background and training
- **Flexible Roll Types**: Support for both flat bonus rolls and ability-based rolls
- **Sound Integration**: Feature rolls now play audio feedback for enhanced immersion

#### **Roll Configuration Options**

- **Roll Type Selection**: Choose between none (passive), flat bonus, or ability-based rolls
- **Ability Integration**: Feature rolls can use any of the five core abilities (Acrobatics, Physical, Fortitude, Will, Wits)
- **Bonus Values**: Add flat modifiers to roll results for specialized advantages
- **Dice Adjustments**: Configure advantage/disadvantage dice for feature rolls
- **Targeting Support**: Enable targeting for combat-relevant features

#### **Circumstantial Bonus Examples**

- **City-Raised**: +2 to Wits rolls when in urban environments
- **Military Veteran**: +2 to Wits rolls during tactical situations
- **Scholar**: +3 to Wits rolls when researching information
- **Wilderness Survivor**: +3 to Fortitude rolls in natural environments
- **Noble Education**: +2 to Will rolls in formal social situations

#### **Enhanced Feature Creator**

- **Roll Configuration Interface**: Comprehensive UI for setting up feature roll mechanics
- **Advantage/Disadvantage Controls**: Number inputs with increment/decrement buttons
- **Dynamic Form Sections**: Collapsible sections that maintain state during re-renders
- **Storage Persistence**: Form data is preserved across sessions and re-renders

### 🎵 Sound System Integration

#### **Feature Roll Audio**

- **New Sound Effect**: Added "4.wav" from celestialghost8 under CC0 license for feature rolls
- **Automatic Sound Registration**: `sound_featureRoll` setting automatically registered
- **Selective Audio**: Only roll-type features play sounds (passive features remain silent)
- **Multiplayer Sync**: Sound effects sync across all players via chat message flags

#### **Sound Attribution**

- **Updated LICENSE.md**: Added proper attribution for the new feature roll sound effect
- **CC0 License**: Sound is freely usable under Creative Commons Zero license

### 🎨 User Interface Improvements

#### **Layout and Alignment Fixes**

- **Feature Roll Alignment**: Fixed feature roll values to be center-aligned like combat powers
- **Combat Power Cost Position**: Moved cost sections to appear after critical hit/miss headers
- **Card Spacing**: Resolved awkward spacing issues when sections were missing
- **Visual Consistency**: Improved overall visual harmony across different item types

#### **Dynamic State Management**

- **Form State Preservation**: Enhanced form restoration to maintain visibility states of dynamic sections
- **Section Visibility**: Roll sections and details maintain their expanded/collapsed state during re-renders
- **Internal State Handling**: Added special handling for internal state keys prefixed with underscore

### 🔧 Technical Improvements

#### **Code Architecture Modernization**

- **Component Breakdown**: Moved many monolithic files into smaller, maintainable components
- **SCSS Consolidation**: Cleaned up legacy SCSS code and consolidated styling Can't understate that this is a MAJOR overhaul of the scss system
- **Linting Compliance**: Corrected all ESLint errors and improved code quality
- **JSDoc Documentation**: Added comprehensive documentation to previously undocumented functions

#### **Data Handling Enhancements**

- **Feature Data Processing**: Added comprehensive feature roll data extraction and storage
- **Roll Data Construction**: Enhanced item data construction to include feature roll information
- **Storage Optimization**: Improved data persistence for roll preferences and configurations

#### **Translation System Updates**

- **Fixed Translation Keys**: Corrected incorrect translation key references in effect creator
- **Enhanced Localization**: Added new localization strings for feature roll functionality
- **Consistent Key Structure**: Standardized translation key patterns across the system

### 🐛 Bug Fixes and Stability

#### **Roll Mechanics**

- **Advantage System**: Fixed advantage dice calculations to work correctly
- **Critical Hit Integration**: Ensured combat power costs appear properly with critical results
- **Roll Value Display**: Corrected alignment and positioning of roll result values

#### **Form Handling**

- **Dynamic Sections**: Fixed issues with form sections losing state during updates
- **Data Persistence**: Resolved problems with form data not being properly saved and restored
- **Validation**: Improved form validation and error handling

#### **Styling and Layout**

- **Component Styling**: Added exemptions for stylelint rules where appropriate
- **CSS Cleanup**: Removed redundant and conflicting style rules
- **Responsive Design**: Improved layout behavior across different screen sizes

### 📚 Documentation Overhaul

#### **Comprehensive Feature Documentation**

- **New Features Guide**: Created detailed documentation for the Features system (`docs/system-features/features.md`)
- **Circumstantial Bonuses**: Extensive coverage of how to create and use situational advantages
- **Implementation Guidelines**: Best practices for GMs and players using the new feature system

#### **Updated User Guides**

- **Player Documentation**: Enhanced player guide with feature roll instructions and examples
- **GM Documentation**: Added comprehensive GM guidance for creating and managing circumstantial bonuses
- **Quick Start Guide**: Updated with feature roll information for immediate use

#### **Technical Documentation**

- **Developer Guide**: Enhanced with accurate code examples and architecture details
- **API Documentation**: Added JSDoc comments to all previously undocumented functions
- **System Settings**: Updated documentation to reflect new sound and feature settings

## Closed Issues and Resolved Problems

Based on the development work completed, this release addresses several key areas:

- **Feature System Limitations**: Previously, features were limited to passive bonuses only
- **Circumstantial Bonus Complexity**: No easy way for players to apply situational advantages
- **Sound Integration Gaps**: Missing audio feedback for feature interactions
- **UI Consistency Issues**: Alignment and spacing problems across different item types
- **Documentation Gaps**: Insufficient coverage of advanced system features
- **Code Quality**: Linting errors and missing documentation in codebase

## Migration and Compatibility

### **Existing Characters**

- **Backward Compatibility**: All existing features continue to work as before
- **Optional Upgrades**: Existing features can be enhanced with roll capabilities if desired
- **No Breaking Changes**: No existing functionality has been removed or significantly altered

### **New Installations**

- **Enhanced Defaults**: New installations benefit from improved default configurations
- **Complete Feature Set**: All new features are immediately available
- **Updated Macros**: ERPS Macros compendium includes latest creator tools

## Getting Started with New Features

### **For Players**

1. **Explore Feature Rolls**: Check your character sheet for features with roll capabilities
2. **Understand Circumstantial Bonuses**: Work with your GM to identify when your background provides advantages
3. **Use Feature Sounds**: Enable system sounds for audio feedback during feature rolls

### **For Game Masters**

1. **Create Circumstantial Features**: Use the Feature Creator to build background-based advantages
2. **Design Situational Bonuses**: Plan scenarios where character backgrounds matter
3. **Update Documentation**: Review the new GM guide sections for best practices

### **For Developers**

1. **Review Architecture Changes**: Examine the new component structure and patterns
2. **Check Documentation**: Updated developer guide with accurate implementation details
3. **Explore APIs**: New JSDoc documentation provides comprehensive API coverage

## Version Information

- **Release Version**: 13.10.0
- **Foundry Compatibility**: v13.341 minimum, v13.344 verified
- **Release Date**: June 2025
- **Major Features**: Feature Roll System, Circumstantial Bonuses, Sound Integration
- **Documentation**: Completely updated and expanded

## Next Steps

### **Community Feedback**

We encourage users to:

- **Test New Features**: Try the feature roll system and provide feedback
- **Report Issues**: Use GitHub issues for bug reports and feature requests
- **Share Examples**: Contribute circumstantial bonus examples and use cases
- **Improve Documentation**: Suggest documentation improvements and additions

---

**Ready to explore the new features?** Check out the [Features System Guide](system-features/features.md) for comprehensive information on creating and using circumstantial bonuses, or jump to the [Quick Start Guide](getting-started/quick-start.md) to begin using feature rolls immediately!
