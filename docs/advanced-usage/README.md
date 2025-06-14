# Eventide RP System Advanced Usage

This section covers advanced techniques and customizations for the Eventide Roleplaying System.

## Action Cards System

### Combat Automation Revolution

The Action Cards system is a powerful new feature that revolutionizes combat automation:

1. **[Action Cards Guide](action-cards.md)** - Complete documentation for creating and using action cards
   - **Saved Damage Cards** - Simple, consistent damage/healing effects
   - **Attack Chain Cards** - Complex multi-step automated actions
   - **Automation Features** - GM/Player workflows, conditional effects, inventory management
   - **Perfect for** - Streamlined combat, spell effects, monster abilities, recurring actions

Action Cards transform repetitive combat sequences into streamlined, thematic experiences with sophisticated targeting, damage application, and effect management.

## Developer Resources

### System Architecture and Development

For developers looking to extend, modify, or contribute to the system:

1. **[Developer Guide](developer-guide.md)** - Comprehensive development documentation including:
   - Complete system architecture overview
   - Design patterns and best practices
   - Theme system architecture
   - Error handling patterns
   - Migration strategy
   - Development setup and guidelines

### ApplicationV2 Window Sizing Fix

The system includes a comprehensive fix for ApplicationV2 double-click maximize issues:

1. **[ApplicationV2 Window Sizing Fix](applicationv2-window-sizing-fix.md)** - Complete documentation of the fix implementation
2. **[Standalone Version](applicationv2-window-sizing-fix-standalone.md)** - Copy-paste ready code for other developers

This fix prevents windows from restoring to incorrect dimensions when maximized from a minimized state, particularly addressing cut-off height issues.

## Advanced Macro Usage

### Creating Custom Macros

The system's included macros can serve as templates for your own custom versions:

1. **Modifying Existing Macros**:
   - Most system macros save their settings for reuse
   - Duplicating macros with different default parameters can streamline gameplay
   - Look for macros with number arguments - these can be templated

2. **Creating Specialized Variants**:
   - Create status effect macros for common conditions in your game
   - Develop gear package macros that create multiple items at once
   - Build combat sequence macros that apply several effects in order
   - While we do not officially support these use cases we will not prevent you from building as you desire: simply look at our source code to understand how the system works and build your own macros

## Advanced Character Management

### Token Configuration

Optimize your token setup:

1. **Token Icons**:
   - Configure which features, statuses, and gear display icons
   - Create a visual language with consistent icon usage
   - Use token icons to highlight the most important active effects

2. **Token Attributes**:
   - The system uses resolve and power as primary and secondary attributes
   - Configure how these are displayed on tokens
   - Link resource bars to these attributes for visual tracking

### Multi-character Management

For GMs or players managing multiple characters:

1. **Using Compendiums**:
   - Create compendiums for reusable items, features, and statuses outside those automatically managed by the creators
   - Build template characters for quick NPC creation
   - Share standardized equipment across multiple characters with easy drag and drop

2. **Bulk Operations**:
   - Use macros to apply status effects to multiple selected tokens
   - Create scene setups with predefined lighting and effects
   - Develop combat initialization macros for different encounter types

## System Integration

### Working with Other Modules

Enhance Eventide with compatible Foundry VTT modules:

1. **Recommended Modules**:
   - **work in progress**

2. **Module Configuration**:
   - Ensure modules are compatible with Foundry v13.341+
   - Check for specific settings needed for compatibility
   - Consult the Foundry VTT Discord for community recommendations

### API Usage for Developers

For developers looking to extend the system:

1. **System API**:
   - The system provides hooks for major events
   - Character ability modifications can be accessed programmatically
   - Status effect application has accessible events

2. **Custom Development**:
   - Follow the LGPL 2.1+ license requirements for modifications
   - Use the existing codebase as a reference for styling and behavior
   - Maintain compatibility with the core system structure

## Performance Optimization

### Managing Complex Scenes

For large or complex games:

1. **Token Optimization**:
   - Use simplified tokens for large groups of NPCs
   - Limit the number of active status effects displaying icons
   - Consider performance impact of animated tokens

2. **Effect Management**:
   - Consolidate similar effects when possible
   - Remove expired or unnecessary effects
   - Use folders to organize large numbers of items

### Browser Performance

Ensure smooth gameplay experience:

1. **Recommended Browsers**:
   - Chrome and Firefox provide the best performance
   - Keep browsers updated to latest versions
   - Disable unnecessary extensions during gameplay

2. **System Settings**:
   - Adjust sound settings if experiencing lag
   - Consider disabling animations if performance suffers
   - Optimize scene lighting and vision settings

## Customization Techniques

### CSS Customization

For users familiar with CSS:

1. **Theme Modifications**:
   - The system uses CSS variables for theming
   - Custom CSS can be applied via modules like Custom CSS
   - System style structure follows BEM methodology

2. **Style Variables**:
   - Key colors are defined in the _colors.scss file
   - Form element styling uses grid-compliant mixins
   - Toggle switches, inputs, and selects have dedicated styling

### Advanced Configuration

Specialized system adjustments:

1. **System JSON**:
   - Advanced users can modify system.json for custom configurations
   - Token defaults can be adjusted
   - Grid settings can be customized

2. **Template Customization**:
   - Handlebars templates can be overridden via modules
   - Sheet layout can be adjusted for specific campaigns
   - Custom HTML can be integrated with proper knowledge of the system

## Next Steps

- Return to [System Features](../system-features/README.md) for core mechanics
- Review [For GMs](../for-gms/README.md) or [For Players](../for-players/README.md) guides
- Check [Getting Started](../getting-started/README.md) for basic setup instructions
