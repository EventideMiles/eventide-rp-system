import { Logger } from "../../services/logger.mjs";

/**
 * Mixin to fix ApplicationV2 window sizing issues
 *
 * This mixin prevents double-click maximize from restoring windows to incorrect dimensions,
 * particularly addressing cut-off height issues. It only restores height and width,
 * not position (left/top) to prevent windows from jumping around.
 * Uses the system's Logger for debugging.
 *
 * @param {Class} BaseClass - The ApplicationV2 class to extend
 * @returns {Class} Extended class with window sizing fix
 */
export function WindowSizingFixMixin(BaseClass) {
  return class extends BaseClass {
    /**
     * Clean up stored positions when closing
     * @param {Object} options - Close options
     * @returns {Promise<void>}
     * @override
     */
    async _preClose(options) {
      Logger.debug("Cleaning up stored dimensions on close", {
        className: this.constructor.name,
        hasStoredDimensions: !!this._storedDimensions,
        hasBaselineDimensions: !!this._baselineDimensions,
      }, "WINDOW_SIZING");

      // Clean up stored dimensions
      this._storedDimensions = null;
      this._baselineDimensions = null;

      return super._preClose(options);
    }

    /**
     * Capture baseline dimensions during render
     * @param {ApplicationRenderContext} context - Prepared context data
     * @param {RenderOptions} options - Provided render options
     * @protected
     * @override
     */
    _onRender(context, options) {
      // Capture current dimensions after render for future restoration
      if (!this.minimized && !this._storedDimensions) {
        this._baselineDimensions = {
          width: this.position.width,
          height: this.position.height,
        };

        Logger.debug("Captured baseline dimensions", {
          className: this.constructor.name,
          dimensions: this._baselineDimensions,
        }, "WINDOW_SIZING");
      }

      // Call parent _onRender if it exists
      if (super._onRender) {
        super._onRender(context, options);
      }
    }

    /**
     * Store dimensions before minimizing
     * @returns {Promise<void>}
     * @override
     */
    async minimize() {
      Logger.methodEntry(this.constructor.name, "minimize", {
        currentPosition: this.position,
        minimized: this.minimized,
        hasStoredDimensions: !!this._storedDimensions,
        hasBaselineDimensions: !!this._baselineDimensions,
      });

      try {
        // Store the current dimensions BEFORE minimizing
        if (!this.minimized) {
          this._storedDimensions = {
            width: this.position.width,
            height: this.position.height,
          };

          Logger.debug("Stored dimensions before minimize", {
            className: this.constructor.name,
            storedDimensions: this._storedDimensions,
          }, "WINDOW_SIZING");

          // Ensure we have a baseline fallback
          if (!this._baselineDimensions) {
            this._baselineDimensions = { ...this._storedDimensions };
            Logger.debug("Created baseline dimensions from stored dimensions", {
              className: this.constructor.name,
              baselineDimensions: this._baselineDimensions,
            }, "WINDOW_SIZING");
          }
        }

        await super.minimize();
        Logger.methodExit(this.constructor.name, "minimize");
      } catch (error) {
        Logger.error("Failed to minimize application", error, "WINDOW_SIZING");
        await super.minimize();
      }
    }

    /**
     * Restore to best available dimensions when maximizing
     * @returns {Promise<void>}
     * @override
     */
    async maximize() {
      Logger.methodEntry(this.constructor.name, "maximize", {
        currentPosition: this.position,
        minimized: this.minimized,
        storedDimensions: this._storedDimensions,
        baselineDimensions: this._baselineDimensions,
      });

      try {
        if (this.minimized) {
          let dimensionsToRestore = null;
          let dimensionsSource = "none";

          // Determine the best dimensions to restore
          if (this._storedDimensions && this._baselineDimensions) {
            // Compare heights and use the larger one
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

          Logger.debug("Determined dimensions to restore", {
            className: this.constructor.name,
            dimensionsSource,
            dimensionsToRestore,
            storedHeight: this._storedDimensions?.height,
            baselineHeight: this._baselineDimensions?.height,
          }, "WINDOW_SIZING");

          if (dimensionsToRestore) {
            await super.maximize();

            setTimeout(() => {
              // Only restore width and height, not position
              this.setPosition({
                width: dimensionsToRestore.width,
                height: dimensionsToRestore.height,
              });

              Logger.debug("Restored window dimensions", {
                className: this.constructor.name,
                restoredDimensions: dimensionsToRestore,
                source: dimensionsSource,
              }, "WINDOW_SIZING");

              // Clear the stored dimensions after successful restoration
              this._storedDimensions = null;
            }, 50);
          } else {
            Logger.warn("No dimensions available to restore, using default maximize", {
              className: this.constructor.name,
            }, "WINDOW_SIZING");
            await super.maximize();
          }
        } else {
          await super.maximize();
        }

        Logger.methodExit(this.constructor.name, "maximize");
      } catch (error) {
        Logger.error("Failed to maximize application", error, "WINDOW_SIZING");
        await super.maximize();
      }
    }

    /**
     * Track dimension changes for better restoration
     * @param {Partial<ApplicationPosition>} position - New position data
     * @returns {void | ApplicationPosition}
     * @override
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
            Logger.debug("Updated baseline dimensions", {
              className: this.constructor.name,
              newBaseline,
              trigger: "setPosition",
            }, "WINDOW_SIZING");
          }
        }
      }

      return super.setPosition(position);
    }
  };
}
