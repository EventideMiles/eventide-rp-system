# Power System Redesign

## Overview
This document outlines the planned changes to the Eventide RP System's power mechanics. The goal is to create a more dynamic power system with improved UI controls and customizable player feedback.

## Current Version
- System Version: 0.21.6
- Each implementation step will increment the patch number (0.21.7, 0.21.8, etc.)
- Upon completion, the minor version will be incremented to 0.22.0

## Implementation Steps

### 1. Update Base Actor Schema
- Modify `schema.power` in `base-actor.mjs` to include:
  - `maxChange`: For dynamic adjustments to max power
  - `maxOverride`: To allow overriding the max power value
  - Migrate existing `max` field to `total` for consistency with other attributes
  - Ensure `value` has a minimum of 0

### 2. Create System Settings for Power
- Add settings in `settings.mjs` for default power maximum
- Set default to add wits to level (wits + level)
- Ensure setting changes trigger world reload for consistency
- Add to existing world-level settings section

### 3. Update Header UI
- Modify `header.hbs` to:
  - Remove direct control of the total power value
  - Replace text input for power value with increment/decrement buttons
  - Style buttons as arrows for better game UI aesthetics
  - Maintain the current layout structure

### 4. Create Player Settings Sheet
- Implement a new ApplicationV2 for player settings
- Include customization options:
  - Message text for power changes
  - Custom image
  - Text color
  - Background color
- Add a button to the header to access these settings
- Extend `EventideSheetHelpers` for image handling support

### 5. Extend System Settings
- Add GM controls for:
  - Default colors for power change messages
  - Option to disable power increment messages globally
- Use existing settings structure and UI patterns

### 6. Implement Form Styling
- Follow existing form patterns from macros
- Use SCSS files in the src directory for any style modifications
- Maintain consistency with existing UI

### 7. Create Power Change Chat Message
- Define a new chat message type for power changes
- Base on `status-message.hbs` template
- Include support for custom images and colors
- Implement message content customization

### 8. Migration Strategy
- Create migration script for existing character data
- Move `max` values to `total` field
- Initialize new fields with appropriate defaults
- Test with sample character data

## Technical Considerations

### Data Flow
1. System settings define default max power calculation
2. Actor data model applies this calculation during `prepareDerivedData()`
3. UI controls update power value through increment/decrement
4. Changes trigger chat messages with player customizations

### UI/UX Improvements
- Arrow buttons provide clearer interaction model
- Visual feedback through chat messages improves player experience
- Customization options allow for character personalization

### Future Extensibility
- The ApplicationV2 for player settings is designed to be extensible
- Additional settings can be added in future updates
- The power system redesign establishes patterns for other resources

## Testing Plan
- Test with existing character data
- Verify migration preserves existing power values
- Confirm UI updates work as expected
- Validate chat message functionality

## Documentation Updates
- Update system documentation to reflect new power mechanics
- Include examples of customization options
- Document GM settings for power system
