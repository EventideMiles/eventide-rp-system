import { Logger } from "../../services/logger.mjs";

/**
 * Actor Sheet Status Bar Mixin
 *
 * Provides drag-scrolling functionality for status bars with arrow navigation.
 * Includes mouse and touch support for mobile devices.
 *
 * @param {class} BaseClass - The base actor sheet class to extend
 * @returns {class} Extended class with status bar scrolling functionality
 */
export const ActorSheetStatusBarMixin = (BaseClass) =>
  class extends BaseClass {
    // Private fields
    #statusBarEventHandlers;

    /**
     * Initialize drag-scrolling functionality for the status bar
     * @private
     */
    #initStatusBarScrolling() {
      const statusBar = this.element.querySelector(
        ".eventide-header__status-bar",
      );
      if (!statusBar) return;

      let isDown = false;
      let startX;
      let scrollLeft;

      // Function to update arrow visibility and positioning
      const updateArrows = () => {
        const scrollLeft = statusBar.scrollLeft;
        const maxScrollLeft = statusBar.scrollWidth - statusBar.clientWidth;

        // Show left arrow if we can scroll left (scrollLeft > 0)
        const canScrollLeft = scrollLeft > 0;
        // Show right arrow if we can scroll right (not at the end) AND there's actually content to scroll
        const canScrollRight = scrollLeft < maxScrollLeft && maxScrollLeft > 0;

        statusBar.classList.toggle("scrollable-left", canScrollLeft);
        statusBar.classList.toggle("scrollable-right", canScrollRight);

        // Calculate arrow positions to keep them at the visible edges
        // Left arrow: always at 0.5rem from the left edge of the visible area
        const leftArrowPosition = `${scrollLeft + 8}px`; // 8px = 0.5rem

        // Right arrow: always at 0.5rem from the right edge of the visible area
        // Calculate position from left edge of container to right edge of visible area
        const containerWidth = statusBar.clientWidth;
        const rightArrowPosition = `${scrollLeft + containerWidth - 16}px`; // 16px = 8px more to the left

        // Set CSS custom properties for dynamic positioning
        statusBar.style.setProperty("--arrow-left-position", leftArrowPosition);
        statusBar.style.setProperty(
          "--arrow-right-position",
          rightArrowPosition,
        );
      };

      // Arrow click handlers
      const handleLeftArrowClick = (e) => {
        // Check if click is on the left arrow area
        const rect = statusBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;

        if (clickX <= 32 && statusBar.classList.contains("scrollable-left")) {
          // 32px = arrow area
          e.preventDefault();
          e.stopPropagation();

          // Scroll left by container width
          const scrollAmount = statusBar.clientWidth;
          statusBar.scrollBy({
            left: -scrollAmount,
            behavior: "smooth",
          });

          // Update arrows after scroll animation
          setTimeout(updateArrows, 300);
        }
      };

      const handleRightArrowClick = (e) => {
        // Check if click is on the right arrow area
        const rect = statusBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const rightArrowStart = rect.width - 32; // 32px = arrow area

        if (
          clickX >= rightArrowStart &&
          statusBar.classList.contains("scrollable-right")
        ) {
          e.preventDefault();
          e.stopPropagation();

          // Scroll right by container width
          const scrollAmount = statusBar.clientWidth;
          statusBar.scrollBy({
            left: scrollAmount,
            behavior: "smooth",
          });

          // Update arrows after scroll animation
          setTimeout(updateArrows, 300);
        }
      };

      // Combined click handler
      const handleArrowClick = (e) => {
        handleLeftArrowClick(e);
        handleRightArrowClick(e);
      };

      // Mouse events
      const handleMouseDown = (e) => {
        // Don't start drag if clicking on arrow areas
        const rect = statusBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const rightArrowStart = rect.width - 32;

        if (
          (clickX <= 32 && statusBar.classList.contains("scrollable-left")) ||
          (clickX >= rightArrowStart &&
            statusBar.classList.contains("scrollable-right"))
        ) {
          return; // Let arrow click handler deal with it
        }

        // Don't interfere with drag operations on transformation cards
        if (e.target.closest(".eventide-transformation-card")) {
          Logger.debug(
            "Skipping status bar drag for transformation card",
            {
              target: e.target,
              closest: e.target.closest(".eventide-transformation-card"),
            },
            "STATUS_BAR",
          );
          return; // Let the drag and drop system handle it
        }

        isDown = true;
        statusBar.style.cursor = "grabbing";
        startX = e.pageX - statusBar.offsetLeft;
        scrollLeft = statusBar.scrollLeft;
        e.preventDefault();
      };

      const handleMouseLeave = () => {
        isDown = false;
        statusBar.style.cursor = "grab";
      };

      const handleMouseUp = () => {
        isDown = false;
        statusBar.style.cursor = "grab";
      };

      const handleMouseMove = (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - statusBar.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed multiplier
        statusBar.scrollLeft = scrollLeft - walk;
        updateArrows();
      };

      // Touch events for mobile support
      const handleTouchStart = (e) => {
        const touch = e.touches[0];
        startX = touch.pageX - statusBar.offsetLeft;
        scrollLeft = statusBar.scrollLeft;
      };

      const handleTouchMove = (e) => {
        if (!startX) return;
        e.preventDefault();
        const touch = e.touches[0];
        const x = touch.pageX - statusBar.offsetLeft;
        const walk = (x - startX) * 2;
        statusBar.scrollLeft = scrollLeft - walk;
        updateArrows();
      };

      const handleTouchEnd = () => {
        startX = null;
      };

      const handleScroll = () => {
        updateArrows();
      };

      // Add event listeners
      statusBar.addEventListener("click", handleArrowClick);
      statusBar.addEventListener("mousedown", handleMouseDown);
      statusBar.addEventListener("mouseleave", handleMouseLeave);
      statusBar.addEventListener("mouseup", handleMouseUp);
      statusBar.addEventListener("mousemove", handleMouseMove);
      statusBar.addEventListener("touchstart", handleTouchStart);
      statusBar.addEventListener("touchmove", handleTouchMove);
      statusBar.addEventListener("touchend", handleTouchEnd);
      statusBar.addEventListener("scroll", handleScroll);

      // Store references for cleanup
      this.#statusBarEventHandlers = {
        statusBar,
        handleArrowClick,
        handleMouseDown,
        handleMouseLeave,
        handleMouseUp,
        handleMouseMove,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleScroll,
      };

      // Initial arrow state
      updateArrows();

      // Update arrows when content changes (with a small delay to ensure DOM is updated)
      setTimeout(updateArrows, 100);

      Logger.debug(
        "Status bar scrolling initialized",
        {
          statusBarFound: !!statusBar,
          scrollWidth: statusBar?.scrollWidth,
          clientWidth: statusBar?.clientWidth,
        },
        "STATUS_BAR",
      );
    }

    /**
     * Clean up status bar scrolling event listeners
     * @private
     */
    #cleanupStatusBarScrolling() {
      if (!this.#statusBarEventHandlers) return;

      const {
        statusBar,
        handleArrowClick,
        handleMouseDown,
        handleMouseLeave,
        handleMouseUp,
        handleMouseMove,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleScroll,
      } = this.#statusBarEventHandlers;

      // Remove all event listeners
      statusBar.removeEventListener("click", handleArrowClick);
      statusBar.removeEventListener("mousedown", handleMouseDown);
      statusBar.removeEventListener("mouseleave", handleMouseLeave);
      statusBar.removeEventListener("mouseup", handleMouseUp);
      statusBar.removeEventListener("mousemove", handleMouseMove);
      statusBar.removeEventListener("touchstart", handleTouchStart);
      statusBar.removeEventListener("touchmove", handleTouchMove);
      statusBar.removeEventListener("touchend", handleTouchEnd);
      statusBar.removeEventListener("scroll", handleScroll);

      // Clear the reference
      this.#statusBarEventHandlers = null;

      Logger.debug(
        "Status bar scrolling cleaned up",
        {
          appId: this.id,
          appName: this.constructor.name,
        },
        "STATUS_BAR",
      );
    }

    /**
     * Initialize status bar functionality during render
     * Call this from your _onRender method
     * @protected
     */
    _initStatusBarScrolling() {
      this.#initStatusBarScrolling();
    }

    /**
     * Clean up status bar functionality during close
     * Call this from your _preClose method
     * @protected
     */
    _cleanupStatusBarScrolling() {
      this.#cleanupStatusBarScrolling();
    }
  };
