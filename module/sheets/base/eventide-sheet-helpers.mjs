const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Base class for creator applications that handle item creation
 * @extends {HandlebarsApplicationMixin(ApplicationV2)}
 */
export class EventideSheetHelpers extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  constructor() {
    super();
  }

  /**
   * Handle changing the gear image.
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - The capturing HTML element which defined a [data-edit]
   * @returns {Promise} The file picker browse operation
   * @protected
   */
  static async _onEditImage(event, target) {
    try {
      // Clean the current path
      let currentPath = target.src;
      // Remove origin if present
      currentPath = currentPath.replace(window.location.origin, "");
      // Remove leading slash if present
      currentPath = currentPath.replace(/^\/+/, "");

      const fp = new FilePicker({
        displayMode: "tiles",
        type: "image",
        current: currentPath,
        callback: (path) => {
          // Clean the selected path
          let cleanPath = path;
          // Remove any leading slashes
          cleanPath = cleanPath.replace(/^\/+/, "");

          // Update the image source and hidden input with clean path
          target.src = cleanPath;

          // Find or create the hidden input
          let input = target.parentNode.querySelector('input[name="img"]');
          if (!input) {
            input = document.createElement("input");
            input.type = "hidden";
            input.name = "img";
            target.parentNode.appendChild(input);
          }
          input.value = cleanPath;
        },
        top: this.position?.top + 40 || 40,
        left: this.position?.left + 10 || 10,
      });
      return fp.browse();
    } catch (error) {
      console.error("Error in _onEditImage:", error);
      ui.notifications.error("Failed to open file picker");
    }
  }
}
