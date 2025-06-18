# Status Effect Intensification

## Overview

The status effect intensification feature automatically enhances existing status effects when action cards attempt to apply a status effect with the same name and description to a target that already has it.

## How It Works

When an action card applies a status effect to a target:

1. **Check for Existing Status**: The system checks if the target already has a status effect with the exact same name and description.

2. **Apply or Intensify**:

   - If no matching status exists, the new status effect is applied normally
   - If a matching status exists, the existing status is "intensified" instead of creating a duplicate

3. **Intensification Logic**: The intensification follows a simplified intensify pattern:
   - **Positive values**: Increase by +1
   - **Negative values**: Decrease by -1 (making them more negative)
   - **Zero values**: Remain unchanged at zero

## Example

If a target has a status effect "Poisoned" with a -2 penalty to a stat, and an action card tries to apply another "Poisoned" status:

- Instead of creating a second "Poisoned" status
- The existing "Poisoned" status is intensified from -2 to -3 (adding -1)

If a target has a status effect "Blessed" with a +3 bonus to a stat, and an action card tries to apply another "Blessed" status:

- Instead of creating a second "Blessed" status
- The existing "Blessed" status is intensified from +3 to +4 (adding +1)

## Technical Details

### Matching Criteria

Two status effects are considered the same if they have:

- Identical `name` property
- Identical `system.description` property
- Both are of type "status"

### Effect Types

- **Status Effects**: Subject to intensification logic
- **Gear Effects**: Applied normally (no intensification)
- **Other Effects**: Applied normally (no intensification)

### Implementation

The feature is implemented in:

- `module/helpers/status-intensification.mjs` - Core intensification logic
- `module/documents/mixins/item-action-card-execution.mjs` - Direct GM application
- `module/services/managers/gm-control.mjs` - GM control panel application

### Logging

The system logs intensification events with the "STATUS_INTENSIFICATION" category, including:

- When existing statuses are found
- Intensification calculations
- Success/failure of intensification attempts

## Benefits

1. **Prevents Status Duplication**: Avoids cluttering character sheets with multiple identical status effects
2. **Realistic Effect Stacking**: Represents how repeated exposure to the same effect would intensify rather than duplicate
3. **Consistent with Existing UI**: Uses the same logic as the manual status modification tools
4. **Automatic**: Requires no additional user input or configuration
