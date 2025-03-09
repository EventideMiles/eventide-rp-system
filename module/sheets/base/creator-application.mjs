const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CreatorApplication extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: "creator-application",
    classes: ["eventide-rp-system", "standard-form", "creator-application"],
    position: {
      width: 800,
      height: 800,
    },
    tag: "form",
    window: {
      title: "Creator Application",
      icon: "fa-solid fa-sack",
    },
  };

  static abilities = ["acro", "phys", "fort", "will", "wits"];
  static hiddenAbilities = ["Dice", "Cmin", "Fmax"];
  static advancedHiddenAbilities = ["Cmax", "Fmin"];
  static rollTypes = ["None", "Roll", "Flat"];

  constructor({ number = 0, advanced = false, playerMode = false } = {}) {
    this.number = Math.floor(number);
    this.hiddenabilities = [...CreatorApplication.hiddenAbilities];
    if (advanced) {
      this.hiddenabilities = [
        ...this.hiddenabilities,
        ...CreatorApplication.advancedHiddenAbilities,
      ];
    }
    this.playerMode = playerMode;
  }

  async _preparePartContext(partId, context, options) {
    context.partId = partId;
    return context;
  }

  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    frame.autocomplete = "off";
    return frame;
  }

  /**
   * Handle changing the gear image.
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-edit]
   * @returns {Promise}
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
