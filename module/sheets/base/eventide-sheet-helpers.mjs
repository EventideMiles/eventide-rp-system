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

  async _prepareContext(context, options) {
    context = (await super._prepareContext(context, options)) || {};
    context.config = CONFIG.EVENTIDE_RP_SYSTEM;
    return context;
  }

  /**
   * Returns an array of ability keys defined in the system configuration.
   * @returns {string[]} Array of ability keys (acro, phys, fort, will, wits)
   */
  static get abilities() {
    return Object.keys(CONFIG.EVENTIDE_RP_SYSTEM.abilities);
  }
  /**
   * Returns an object mapping ability keys to their values.
   * @returns {Object} Object with ability keys as keys and their values
   */
  static get abilityObject() {
    return Object.fromEntries(
      Object.keys(CONFIG.EVENTIDE_RP_SYSTEM.abilities).map((key) => [key, key])
    );
  }
  /**
   * Returns an array of hidden ability keys that are accessible to players.
   * @returns {string[]} Array of player-accessible hidden ability keys (vuln)
   */
  static get playerAccessableHiddenAbilities() {
    return ["vuln"];
  }
  /**
   * Returns an array of hidden ability keys defined in the system configuration.
   * @returns {string[]} Array of hidden ability keys (dice, cmin, fmax)
   */
  static get hiddenAbilities() {
    return ["dice", "cmin", "fmax"];
  }
  /**
   * Returns an array of advanced hidden ability keys defined in the system configuration.
   * @returns {string[]} Array of advanced hidden ability keys (cmax, fmin)
   */
  static get advancedHiddenAbilities() {
    return ["cmax", "fmin"];
  }
  /**
   * Returns an array of roll types defined in the system configuration.
   * @returns {string[]} Array of roll types (none, roll, flat)
   */
  static get rollTypes() {
    return Object.keys(CONFIG.EVENTIDE_RP_SYSTEM.rollTypes);
  }
  /**
   * Returns an object mapping roll types to their values.
   * @returns {Object} Object with roll types as keys and their values
   */
  static get rollTypeObject() {
    return Object.fromEntries(
      Object.keys(CONFIG.EVENTIDE_RP_SYSTEM.rollTypes).map((key) => [key, key])
    );
  }

  /**
   * Prepare context data for a specific part of the form
   * @param {string} partId - The ID of the form part
   * @param {Object} context - The context object to prepare
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} The prepared context
   */
  async _preparePartContext(partId, context, options) {
    context.partId = `${this.id}-${partId}`;
    return context;
  }

  /**
   * Render the application frame
   * @param {Object} options - Rendering options
   * @returns {Promise<HTMLElement>} The rendered frame
   */
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    frame.autocomplete = "off";
    return frame;
  }

  /**
   * Handle file selection for image, audio, or generic file inputs.
   * @param {PointerEvent} event - The originating click event
   * @param {HTMLElement} target - The capturing HTML element which defined a [data-edit]
   * @param {string} type - The type of file to select (image, audio, file)
   * @param {Function} callback - The callback function to handle the selected file
   * @returns {Promise} The file picker browse operation
   * @protected
   */
  static async _fileHandler(event, target, { type = "image" }) {
    try {
      let currentPath; //= target.src;
      const inputName = target.dataset.target;
      const input = target.parentNode.querySelector(
        `input[name="${inputName}"]`
      );
      currentPath = input.value || "";
      currentPath = currentPath.replace(window.location.origin, "");
      currentPath = currentPath.replace(/^\/+/, "");

      const fp = new FilePicker({
        displayMode: "tiles",
        type: type,
        current: currentPath,
        callback: (path) => {
          // Clean the selected path
          let cleanPath = path;
          // Remove any leading slashes
          cleanPath = cleanPath.replace(/^\/+/, "");

          // Update the image source and hidden input with clean path
          if (target.src && type === "image") {
            target.src = cleanPath;
          }

          // Find the input
          let input;
          input = target.parentNode.querySelector(`input[name="${inputName}"]`);
          input.value = cleanPath;

          input.dispatchEvent(new Event("change"));
        },
        top: this.position?.top + 40 || 40,
        left: this.position?.left + 10 || 10,
      });
      return fp.browse();
    } catch (error) {
      console.error("Error in fileHandler:", error);
      if (type === "image") {
        ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.EditImage")
        );
      } else if (type === "audio") {
        ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.EditAudio")
        );
      } else {
        ui.notifications.error(
          game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.EditFile")
        );
      }
    }
  }

  /**
   *
   * Wrappers for fileHandler
   */
  static async _onEditImage(event, target) {
    return await super._fileHandler(event, target, { type: "image" });
  }

  static async _onEditAudio(event, target) {
    return await super._fileHandler(event, target, { type: "audio" });
  }

  static async _onEditFile(event, target) {
    return await super._fileHandler(event, target, { type: "file" });
  }

  /**
   * Checks if the current user is a GM and handles permissions accordingly.
   * @param {Object} options - Configuration options
   * @param {boolean} [options.playerMode=false] - Whether to allow player access to the script
   * @returns {string} - "forbidden" if access denied, "player" if player with access, "gm" if GM
   */
  static async _gmCheck({ playerMode = false } = {}) {
    if (!game.user?.isGM && !playerMode) {
      ui.notifications.error(
        game.i18n.localize("EVENTIDE_RP_SYSTEM.Errors.GMOnly")
      );
      this.close();
      return "forbidden";
    } else if (!game.user?.isGM && playerMode) {
      return "player";
    }
    return "gm";
  }
}
