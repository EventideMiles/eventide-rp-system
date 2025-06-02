# ApplicationV2 Window Sizing Fix - Standalone Version

## Overview

This is a standalone fix for a bug in Foundry VTT's `ApplicationV2##onWindowDoubleClick` method where double-clicking a minimized window causes it to restore to incorrect dimensions, particularly with cut-off heights.

**Key Feature**: This fix only restores window dimensions (width/height), not position (left/top), preventing windows from jumping around the screen.

## The Problem

When using Foundry VTT's ApplicationV2 windows:
1. Open a window (e.g., actor sheet, item sheet)
2. Minimize the window
3. Double-click the minimized window to restore it
4. **Bug**: The window often restores to incorrect dimensions, especially with cut-off heights

## The Solution

This mixin provides:

1. **Captures baseline dimensions** when windows are first rendered
2. **Stores current dimensions** before minimizing
3. **Intelligently restores dimensions** when maximizing, choosing the best available size
4. **Only restores width and height** - position (left/top) is left unchanged
5. **Comprehensive error handling** and cleanup

## Implementation

### Basic Version (No Logging)

```javascript
/**
 * Mixin to fix ApplicationV2 window sizing issues
 * Only restores width and height, not position, to prevent window jumping
 */
export function WindowSizingFixMixin(BaseClass) {
  return class extends BaseClass {
    /**
     * Clean up stored dimensions when closing
     */
    async _preClose(options) {
      this._storedDimensions = null;
      this._baselineDimensions = null;
      return super._preClose(options);
    }

    /**
     * Capture baseline dimensions during render
     */
    _onRender(context, options) {
      // Capture current dimensions after render for future restoration
      if (!this.minimized && !this._storedDimensions) {
        this._baselineDimensions = {
          width: this.position.width,
          height: this.position.height,
        };
      }

      // Call parent _onRender if it exists
      if (super._onRender) {
        super._onRender(context, options);
      }
    }

    /**
     * Store dimensions before minimizing
     */
    async minimize() {
      try {
        // Store the current dimensions BEFORE minimizing
        if (!this.minimized) {
          this._storedDimensions = {
            width: this.position.width,
            height: this.position.height,
          };

          // Ensure we have a baseline fallback
          if (!this._baselineDimensions) {
            this._baselineDimensions = { ...this._storedDimensions };
          }
        }

        await super.minimize();
      } catch (error) {
        console.error("Failed to minimize application:", error);
        await super.minimize();
      }
    }

    /**
     * Restore to best available dimensions when maximizing
     */
    async maximize() {
      try {
        if (this.minimized) {
          let dimensionsToRestore = null;

          // Determine the best dimensions to restore
          if (this._storedDimensions && this._baselineDimensions) {
            // Compare heights and use the larger one
            if (this._storedDimensions.height >= this._baselineDimensions.height) {
              dimensionsToRestore = this._storedDimensions;
            } else {
              dimensionsToRestore = this._baselineDimensions;
            }
          } else if (this._storedDimensions) {
            dimensionsToRestore = this._storedDimensions;
          } else if (this._baselineDimensions) {
            dimensionsToRestore = this._baselineDimensions;
          }

          if (dimensionsToRestore) {
            await super.maximize();

            setTimeout(() => {
              // Only restore width and height, not position
              this.setPosition({
                width: dimensionsToRestore.width,
                height: dimensionsToRestore.height,
              });

              // Clear the stored dimensions after successful restoration
              this._storedDimensions = null;
            }, 50);
          } else {
            await super.maximize();
          }
        } else {
          await super.maximize();
        }
      } catch (error) {
        console.error("Failed to maximize application:", error);
        await super.maximize();
      }
    }

    /**
     * Track dimension changes for better restoration
     */
    setPosition(position) {
      // Update baseline dimensions for future cycles
      if (!this.minimized && position && (position.width || position.height)) {
        if (!this._storedDimensions && this._baselineDimensions) {
          const newBaseline = {
            width: position.width || this.position.width,
            height: position.height || this.position.height,
          };

          // Only update if there's a meaningful change
          const hasSignificantChange =
            Math.abs(newBaseline.width - this._baselineDimensions.width) > 10 ||
            Math.abs(newBaseline.height - this._baselineDimensions.height) > 10;

          if (hasSignificantChange) {
            this._baselineDimensions = newBaseline;
          }
        }
      }

      return super.setPosition(position);
    }
  };
}
```

### Enhanced Version (With Logging)

If you have a logging system, you can enhance the mixin with detailed logging:

```javascript
/**
 * Enhanced version with logging support
 * Replace `Logger` with your logging system or remove logging calls
 */
export function WindowSizingFixMixin(BaseClass) {
  return class extends BaseClass {
    async _preClose(options) {
      // Logger.debug("Cleaning up stored dimensions on close", {
      //   className: this.constructor.name,
      //   hasStoredDimensions: !!this._storedDimensions,
      //   hasBaselineDimensions: !!this._baselineDimensions,
      // });

      this._storedDimensions = null;
      this._baselineDimensions = null;
      return super._preClose(options);
    }

    _onRender(context, options) {
      if (!this.minimized && !this._storedDimensions) {
        this._baselineDimensions = {
          width: this.position.width,
          height: this.position.height,
        };

        // Logger.debug("Captured baseline dimensions", {
        //   className: this.constructor.name,
        //   dimensions: this._baselineDimensions,
        // });
      }

      if (super._onRender) {
        super._onRender(context, options);
      }
    }

    async minimize() {
      try {
        if (!this.minimized) {
          this._storedDimensions = {
            width: this.position.width,
            height: this.position.height,
          };

          // Logger.debug("Stored dimensions before minimize", {
          //   className: this.constructor.name,
          //   storedDimensions: this._storedDimensions,
          // });

          if (!this._baselineDimensions) {
            this._baselineDimensions = { ...this._storedDimensions };
          }
        }

        await super.minimize();
      } catch (error) {
        console.error("Failed to minimize application:", error);
        await super.minimize();
      }
    }

    async maximize() {
      try {
        if (this.minimized) {
          let dimensionsToRestore = null;
          let dimensionsSource = "none";

          if (this._storedDimensions && this._baselineDimensions) {
            if (this._storedDimensions.height >= this._baselineDimensions.height) {
              dimensionsToRestore = this._storedDimensions;
              dimensionsSource = "stored";
            } else {
              dimensionsToRestore = this._baselineDimensions;
              dimensionsSource = "baseline";
            }
          } else if (this._storedDimensions) {
            dimensionsToRestore = this._storedDimensions;
            dimensionsSource = "stored";
          } else if (this._baselineDimensions) {
            dimensionsToRestore = this._baselineDimensions;
            dimensionsSource = "baseline";
          }

          // Logger.debug("Determined dimensions to restore", {
          //   className: this.constructor.name,
          //   dimensionsSource,
          //   dimensionsToRestore,
          // });

          if (dimensionsToRestore) {
            await super.maximize();

            setTimeout(() => {
              this.setPosition({
                width: dimensionsToRestore.width,
                height: dimensionsToRestore.height,
              });

              // Logger.debug("Restored window dimensions", {
              //   className: this.constructor.name,
              //   restoredDimensions: dimensionsToRestore,
              //   source: dimensionsSource,
              // });

              this._storedDimensions = null;
            }, 50);
          } else {
            await super.maximize();
          }
        } else {
          await super.maximize();
        }
      } catch (error) {
        console.error("Failed to maximize application:", error);
        await super.maximize();
      }
    }

    setPosition(position) {
      if (!this.minimized && position && (position.width || position.height)) {
        if (!this._storedDimensions && this._baselineDimensions) {
          const newBaseline = {
            width: position.width || this.position.width,
            height: position.height || this.position.height,
          };

          const hasSignificantChange =
            Math.abs(newBaseline.width - this._baselineDimensions.width) > 10 ||
            Math.abs(newBaseline.height - this._baselineDimensions.height) > 10;

          if (hasSignificantChange) {
            this._baselineDimensions = newBaseline;
            // Logger.debug("Updated baseline dimensions", {
            //   className: this.constructor.name,
            //   newBaseline,
            // });
          }
        }
      }

      return super.setPosition(position);
    }
  };
}
```

## Usage

### Apply to Your ApplicationV2 Classes

```javascript
import { WindowSizingFixMixin } from "./path/to/mixin.js";

// For actor sheets
export class MyActorSheet extends WindowSizingFixMixin(
  foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.sheets.ActorSheetV2
  )
) {
  // Your implementation

  async _preClose(options) {
    // Call mixin cleanup first
    await super._preClose(options);
    // Your cleanup code
  }
}

// For item sheets
export class MyItemSheet extends WindowSizingFixMixin(
  foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.sheets.ItemSheetV2
  )
) {
  // Your implementation

  async _preClose(options) {
    // Call mixin cleanup first
    await super._preClose(options);
    // Your cleanup code
  }
}

// For custom applications
export class MyCustomApp extends WindowSizingFixMixin(
  foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.api.ApplicationV2
  )
) {
  // Your implementation

  async _preClose(options) {
    // Call mixin cleanup first
    await super._preClose(options);
    // Your cleanup code
  }
}
```

### Apply to Base Classes

For maximum coverage, apply the mixin to your base classes:

```javascript
// Base sheet helper class
export class MySheetHelpers extends WindowSizingFixMixin(
  foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.api.ApplicationV2
  )
) {
  // Common sheet functionality
}

// All your sheets extend this base class
export class MyActorSheet extends MySheetHelpers {
  // Automatically inherits the window sizing fix
}

export class MyItemSheet extends MySheetHelpers {
  // Automatically inherits the window sizing fix
}
```

## Key Features

1. **Dimension-Only Restoration**: Only width and height are restored, position is preserved
2. **Smart Size Selection**: Compares stored vs baseline dimensions and uses the larger height
3. **Automatic Cleanup**: Clears stored data when windows close
4. **Error Handling**: Graceful fallbacks if operations fail
5. **Memory Efficient**: No memory leaks from stored dimension data

## Benefits

1. **Fixes the Core Bug**: Windows restore to correct dimensions
2. **Prevents Window Jumping**: Position (left/top) is never changed
3. **Intelligent Sizing**: Always chooses the best available dimensions
4. **Easy Integration**: Simple mixin pattern
5. **No Dependencies**: Works with any ApplicationV2 class
6. **Forward Compatible**: Should work with future Foundry updates

## Testing

To verify the fix is working:

1. Open any ApplicationV2 window
2. Resize it to a specific size
3. Minimize the window
4. Double-click the minimized header to restore
5. Verify the window restores to correct dimensions without jumping position

## Compatibility

- **Foundry VTT**: v11+ (ApplicationV2 systems)
- **Dependencies**: None
- **Conflicts**: None known

## License

This fix is provided as-is for the community. Feel free to use, modify, and distribute in your own projects.

## Credits

Originally developed for the Eventide RP System by EventideMiles. Abstracted for community use.

## Support

If you encounter issues with this fix:

1. Verify you're using ApplicationV2 (not the legacy Application class)
2. Check that you're calling `super` methods appropriately
3. Ensure the fix methods are added to the correct base class
4. Test with a minimal reproduction case

For questions or improvements, consider contributing back to the community through Foundry development forums or Discord channels.
