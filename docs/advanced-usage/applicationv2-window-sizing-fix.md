# ApplicationV2 Window Sizing Fix

## Overview

This document describes the window sizing fix implemented in the Eventide RP System to address a bug in Foundry VTT's `ApplicationV2##onWindowDoubleClick` method. The bug causes minimized windows to restore to incorrect dimensions when double-clicked, particularly resulting in cut-off heights.

## The Problem

When using Foundry VTT's ApplicationV2 windows:

1. Open a window (e.g., actor sheet, item sheet)
2. Minimize the window
3. Double-click the minimized window to restore it
4. **Bug**: The window often restores to incorrect dimensions, especially with cut-off heights

This is a known issue with Foundry's core ApplicationV2 implementation.

## The Solution

The Eventide RP System implements a `WindowSizingFixMixin` that:

1. **Captures baseline dimensions** when windows are first rendered
2. **Stores current dimensions** before minimizing
3. **Intelligently restores dimensions** when maximizing, choosing the best available size
4. **Only restores width and height** - position (left/top) is left unchanged to prevent windows from jumping around
5. **Uses system Logger** for comprehensive debugging

### Key Features

- **Dimension-only restoration**: Only width and height are restored, not window position
- **Smart size selection**: Compares stored vs baseline dimensions and uses the larger height
- **Automatic cleanup**: Clears stored data when windows close
- **Comprehensive logging**: Full debug information for troubleshooting
- **Fallback handling**: Graceful degradation if no stored dimensions are available

## Implementation

### Mixin Structure

```javascript
export function WindowSizingFixMixin(BaseClass) {
  return class extends BaseClass {
    // Override methods:
    // - _preClose(): Cleanup stored dimensions
    // - _onRender(): Capture baseline dimensions
    // - minimize(): Store current dimensions
    // - maximize(): Restore best available dimensions
    // - setPosition(): Track dimension changes
  };
}
```

### Applied To

The mixin is applied to all ApplicationV2 classes in the system:

**Sheet Applications:**

- `EventideRpSystemActorSheet`
- `EventideRpSystemItemSheet`
- `EventideSheetHelpers` (base class)

**Popup Applications:**

- `EventidePopupHelpers` (base class)
- All popup subclasses inherit the fix automatically

### Usage Example

```javascript
import { WindowSizingFixMixin } from "../components/_module.mjs";

export class MyCustomSheet extends WindowSizingFixMixin(
  api.HandlebarsApplicationMixin(sheets.ActorSheetV2)
) {
  // Your sheet implementation
  // The mixin automatically handles window sizing issues
}
```

## Technical Details

### Dimension Storage

The mixin stores two types of dimension data:

1. **Baseline Dimensions** (`_baselineDimensions`): Captured during initial render
2. **Stored Dimensions** (`_storedDimensions`): Captured before minimizing

### Restoration Logic

When maximizing a minimized window:

1. Compare stored vs baseline dimensions
2. Choose the dimensions with the larger height (prevents cut-off)
3. Restore only width and height via `setPosition({ width, height })`
4. Leave position (left/top) unchanged to prevent window jumping

### Logging

All operations are logged using the system's Logger service with the "WINDOW_SIZING" category:

- Dimension capture and storage
- Restoration decisions and sources
- Error handling and fallbacks
- Cleanup operations

## Benefits

1. **Fixes the core bug**: Windows restore to correct dimensions
2. **Prevents window jumping**: Position is preserved
3. **Intelligent sizing**: Always chooses the best available dimensions
4. **System-wide coverage**: Applied to all ApplicationV2 instances
5. **Easy maintenance**: Centralized in a single mixin
6. **Automatic inheritance**: New ApplicationV2 classes get the fix automatically
7. **Comprehensive debugging**: Full logging for troubleshooting

## Maintenance

### Adding to New Classes

To apply the fix to new ApplicationV2 classes:

```javascript
import { WindowSizingFixMixin } from "../components/_module.mjs";

export class NewApplicationClass extends WindowSizingFixMixin(BaseApplicationClass) {
  // Implementation

  async _preClose(options) {
    // Call mixin cleanup first
    await super._preClose(options);
    // Your cleanup code
  }
}
```

### Debugging

Enable debug logging to see the fix in action:

```javascript
// In browser console
CONFIG.debug.hooks = true;
```

Look for "WINDOW_SIZING" category logs to trace dimension capture, storage, and restoration.

## Community Sharing

A standalone version of this fix is available in [`applicationv2-window-sizing-fix-standalone.md`](./applicationv2-window-sizing-fix-standalone.md) for other system developers to use in their own projects.
