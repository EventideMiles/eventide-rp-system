/**
 * Scroll Preservation Mixin
 *
 * Provides scroll position preservation functionality for application sheets.
 * This mixin overrides the render method to save the current scroll position
 * before re-rendering and restore it afterward, preventing the annoying jump
 * to the top that normally occurs during re-renders.
 *
 * The implementation finds the actual scrolling element by checking which
 * element has scrollTop > 0, then attempts to restore the scroll position
 * after the render completes by finding the element again using its class
 * name and/or tag name.
 *
 * @param {class} BaseClass - The base application class to extend
 * @returns {class} Extended class with scroll preservation functionality
 */
export const ScrollPreservationMixin = (BaseClass) =>
  class extends BaseClass {
    /**
     * Override render method to preserve scroll position using the working pattern from creator-application.mjs
     * @param {boolean} force - Force a re-render
     * @param {Object} options - Render options
     * @returns {Promise<this>} The rendered application
     * @override
     */
    async render(force, options = {}) {
      // Find the actual scrolling element by checking what has scrollTop > 0
      let actualScrollingElement = null;
      let oldPosition = 0;

      if (this.element) {
        // Check all elements for scrollTop > 0
        const allElements = Array.from(this.element.querySelectorAll("*"));
        const scrollableElements = allElements.filter((el) => el.scrollTop > 0);

        if (scrollableElements.length > 0) {
          actualScrollingElement = scrollableElements[0];
          oldPosition = actualScrollingElement.scrollTop;
        }
      }

      // Call parent render
      const result = await super.render(force, options);

      // Restore scroll position
      if (actualScrollingElement && oldPosition > 0) {
        // Find the element again after render
        let restoreElement = null;
        if (actualScrollingElement.className) {
          restoreElement = this.element?.querySelector(
            `.${actualScrollingElement.className.split(" ").join(".")}`,
          );
        }
        if (!restoreElement && actualScrollingElement.tagName) {
          const selector =
            actualScrollingElement.tagName.toLowerCase() +
            (actualScrollingElement.className
              ? `.${actualScrollingElement.className.split(" ").join(".")}`
              : "");
          restoreElement = this.element?.querySelector(selector);
        }

        if (restoreElement) {
          restoreElement.scrollTop = oldPosition;
        }
      }

      return result;
    }
  };
