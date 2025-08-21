# What's New in Eventide RP System v13.13.3

## Major Features and Improvements

### 🔄 Action Modes - Advanced Repetition System (v13.13.3)

**The newest addition is the powerful Action Modes system that transforms action cards into dynamic, repeatable actions with sophisticated control over repetition behavior.**

#### **What are Action Modes?**

Action Modes extend action cards with advanced repetition capabilities, allowing you to execute actions multiple times with configurable behavior for each repetition. This feature is perfect for multi-attack sequences, burst effects, channeled spells, and variable-outcome abilities.

#### **Key Action Modes Features**

- **Dynamic Repetitions**: Use roll formulas (e.g., "3", "1d4", "2d6+1") to determine execution count
- **Repeat to Hit**: Re-roll embedded items for each repetition in attack chains
- **Selective Damage Application**: Control whether damage applies per repetition or first success only
- **Status Per Success**: Configure status effect application/intensification per repetition
- **Cost Control**: Toggle resource consumption per repetition vs. first-time only
- **Custom Timing**: Override system delays with per-card timing configuration

#### **Advanced Repetition Controls**

**Repetitions Field**
- Support for roll formulas with actor data integration
- Automatic evaluation with `Math.floor()` for integer results
- Graceful failure handling for invalid formulas (≤0 results)

**Repetition Behavior Toggles**
- **Repeat to Hit**: Re-execute embedded items for fresh roll results
- **Damage Application**: Apply damage effects on every repetition
- **Status Per Success**: Apply/intensify status effects per repetition
- **Cost on Repetition**: Consume resources on each execution vs. first only

**Timing Configuration**
- **Timing Override**: Custom delays between repetitions (0 = system default)
- **Step Preservation**: Maintains existing timing delays within each repetition
- **Consistent Flow**: Smooth execution pacing across all repetition counts

#### **Resource Management**

- **Pre-execution Validation**: Check resource availability before starting repetitions
- **Mid-execution Monitoring**: Halt execution on resource depletion with clear feedback
- **Professional Failure Messages**: Dedicated chat card template for execution failures
- **Partial Success Tracking**: Report completed repetitions when execution stops early

#### **Perfect For**

- **Multi-attack Sequences**: Execute complex attack combinations with variable hit counts
- **Channeled Spells**: Create spells that intensify or repeat based on casting power
- **Burst Effects**: Random repetition counts for unpredictable magical effects
- **Resource Management**: Control when costs apply for strategic resource usage
- **Combat Automation**: Streamline repetitive actions with intelligent automation

#### **New Config Tab Interface**

- **Dedicated Configuration**: New "Config" tab in action card item sheets
- **Intuitive Controls**: Toggle switches following existing ERPS design patterns
- **Comprehensive Localization**: Full English language support with helpful hints
- **Form Validation**: Real-time validation with clear error feedback

### 🎴 Action Cards System - Combat Automation Revolution (v13.11.0)

**The biggest addition to this release is the comprehensive Action Cards system that revolutionizes combat automation and action management in the Eventide RP System.**

#### **What Are Action Cards?**

Action Cards are an incredibly powerful new automation item type that allows you to create complex, dynamic actions with sophisticated targeting, damage application, and effect management. They transform repetitive combat sequences into streamlined, thematic experiences.

#### **Key Action Card Capabilities**

- **Complex Attack Chains**: Combine gear, features, and combat powers into sophisticated action sequences
- **Automated Damage & Healing**: Configure damage types, amounts, and formulas with automatic application
- **Smart Status Application**: Apply status effects and gear to targets based on roll results and conditions
- **Themed Damage Cards**: Custom images, colors, and descriptions for immersive damage presentation
- **Inventory Integration**: Automatic gear consumption and application with inventory management
- **Initiative Management**: Optional automatic initiative advancement after action execution

#### **Two Action Card Types**

**Saved Damage Cards**
- Simple damage/healing cards with preset values
- Perfect for consistent effects like spells or environmental hazards
- Customizable damage types, amounts, and visual theming

**Attack Chain Cards**
- Complex multi-step actions combining attacks with effects
- Embed gear, features, or combat powers as the primary action
- Configure conditional damage and status application based on roll results
- Support for dual-stat comparisons and sophisticated targeting logic

#### **Automation Features**

- **GM vs Player Workflows**: Different execution paths for GMs (automatic) and players (GM confirmation)
- **Conditional Effects**: Apply damage and statuses only when specific conditions are met
- **Smart Targeting**: Automatic target detection and effect application
- **Visual Feedback**: Rich popup confirmations before action execution
- **Inventory Management**: Automatic gear reduction and equipped status handling

#### **Perfect For**

- **Streamlined Combat**: Automate complex attack sequences
- **Spell Effects**: Create reusable spell cards with consistent theming
- **Monster Abilities**: Define themed monster actions for adventure modules
- **Recurring Actions**: Automate frequently-used action combinations
- **Adventure Design**: Create immersive, automated encounters

### 🎯 Feature Roll System - Circumstantial Bonuses (v13.10.0)

**Enhanced character customization through circumstantial bonuses and feature-based rolls.**

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

- **Release Version**: 13.13.3
- **Foundry Compatibility**: v13+ minimum, v13+ verified
- **Release Date**: August 2025
- **Major Features**: Action Modes System, Advanced Repetition Controls, Resource Management
- **Previous Version**: v13.11.0 introduced Action Cards System and Combat Automation
- **v13.10.0**: Feature Roll System and Circumstantial Bonuses
- **Documentation**: Completely updated and expanded

## Getting Started with Action Modes

### **For Players**

1. **Open the Config Tab**: Edit any action card and click the new "Config" tab
2. **Start Simple**: Begin with basic repetition counts like "2" or "3"
3. **Explore Variables**: Try roll formulas like "1d3" for random repetitions
4. **Control Costs**: Use the "Cost on Repetition" toggle to manage resource consumption
5. **Experiment with Timing**: Adjust timing overrides for dramatic effect pacing

### **For Game Masters**

1. **Create Multi-attack NPCs**: Design monsters with variable attack patterns using repetition formulas
2. **Design Channeled Effects**: Build spells that intensify with repetition counts
3. **Manage Resources**: Use cost controls to create strategic resource decisions
4. **Enhance Drama**: Custom timing creates cinematic combat sequences

### **Getting Started Examples**

**Simple Multi-attack**
- Repetitions: "3"
- Repeat to Hit: ✓
- Result: 3 separate attack rolls with independent damage

**Variable Burst Spell**
- Repetitions: "1d4+1" 
- Status Per Success: ✓
- Cost on Repetition: ✗
- Result: Random spell intensity (2-5 effects) with single resource cost

**Channeled Healing**
- Repetitions: "2d3"
- Damage Application: ✓
- Timing Override: 1.5
- Result: Multiple healing applications with dramatic 1.5-second intervals

## Getting Started with Action Cards

### **For Players**

1. **Create Your First Action Card**: Use the "Action Card" button on your character sheet or create through the item menu
2. **Start Simple**: Begin with Saved Damage cards for consistent spells or abilities
3. **Explore Attack Chains**: Combine your gear and powers into automated sequences
4. **Customize Theming**: Add images and colors to make your actions visually distinctive

### **For Game Masters**

1. **Automate Monster Actions**: Create themed action cards for recurring monster abilities
2. **Design Adventure Encounters**: Build immersive, automated combat sequences
3. **Streamline Combat**: Reduce manual damage and status application
4. **Create Spell Libraries**: Build reusable spell cards for NPCs and environments

### **For Developers and Module Creators**

1. **Adventure Integration**: Use action cards to create consistent, themed encounters
2. **Monster Design**: Define complex monster abilities as automated action sequences
3. **Spell Systems**: Create comprehensive spell libraries with visual theming
4. **Combat Automation**: Reduce GM workload with intelligent automation

## Next Steps

### **Community Feedback**

We encourage users to:

- **Test Action Cards**: Try both Saved Damage and Attack Chain types
- **Share Creations**: Contribute action card examples and creative uses
- **Report Issues**: Use GitHub issues for bug reports and feature requests
- **Improve Documentation**: Suggest documentation improvements and additions

### **Documentation Links**

- **[Action Modes Pull Request](advanced-usage/action-modes-pull-request.md)** - Complete Action Modes implementation documentation
- **[Action Cards Guide](advanced-usage/action-cards.md)** - Complete action cards documentation
- **[Features System Guide](system-features/features.md)** - Circumstantial bonuses and feature rolls
- **[Quick Start Guide](getting-started/quick-start.md)** - Get started with the system immediately

---

**Ready to supercharge your action cards?** Check out the [Action Modes Pull Request](advanced-usage/action-modes-pull-request.md) for comprehensive information on the new repetition system, or explore the [Action Cards Guide](advanced-usage/action-cards.md) for fundamental action card usage!
