import { EventideSheetHelpers } from "../components/_module.mjs";
import {
  initThemeManager,
  THEME_PRESETS,
  applyThemeImmediate,
  cleanupThemeManager,
} from "../../helpers/_module.mjs";
import { Logger } from "../../services/logger.mjs";
import { DefaultDataFactory } from "../../services/default-data-factory.mjs";
import { FormulaValidator } from "../../services/formula-validator.mjs";
import { getSetting, setSetting } from "../../services/settings/settings.mjs";

const FilePicker = foundry.applications.apps.FilePicker.implementation;

/**
 * Setting key under which the last-used dialog configuration is persisted
 * (client-scoped, hidden from the settings UI).
 */
const CONFIG_SETTING_KEY = "bulkSavedDamageCreatorConfig";

/**
 * Image file extensions recognized by the bulk scanner.
 * Matches without case sensitivity.
 */
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "svg", "gif", "bmp"];
const IMAGE_EXTENSION_PATTERN = new RegExp(
  `\\.(${IMAGE_EXTENSIONS.join("|")})$`,
  "i",
);

/**
 * Maximum recursion depth when the "recursive" option is enabled.
 * Prevents runaway scans on unexpectedly deep directory trees.
 */
const MAX_RECURSION_DEPTH = 5;

/**
 * Bulk Saved Damage Action Card Creator
 *
 * ApplicationV2 dialog for creating many savedDamage-style action cards at
 * once from a folder of images in the Foundry user-data directory. One action
 * card is created per image, named with the full image filename (including
 * extension) so that names are obviously machine-generated and invite manual
 * review.
 *
 * All created cards share the same damage formulas, repetition settings,
 * and colors entered in the dialog. Per-card customization is intentionally
 * out of scope — the goal is quick attack creation, not customized attack
 * creation.
 *
 * @extends EventideSheetHelpers
 */
export class BulkSavedDamageCreator extends EventideSheetHelpers {
  static PARTS = {
    bulkSavedDamageCreator: {
      template:
        "systems/eventide-rp-system/templates/macros/bulk-saved-damage-creator.hbs",
    },
  };

  static DEFAULT_OPTIONS = {
    id: "bulk-saved-damage-creator",
    classes: [
      "eventide-sheet",
      "eventide-sheet--scrollbars",
      "bulk-saved-damage-creator",
    ],
    position: {
      width: 820,
      height: "auto",
    },
    tag: "form",
    window: {
      icon: "fa-solid fa-layer-group",
    },
    form: {
      handler: BulkSavedDamageCreator.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    actions: {
      browseFolder: BulkSavedDamageCreator.prototype._onBrowseFolder,
      scanFolder: BulkSavedDamageCreator.prototype._onScanFolder,
      removeImage: BulkSavedDamageCreator.prototype._onRemoveImage,
      cancel: BulkSavedDamageCreator.prototype._onCancel,
    },
  };

  /**
   * @param {Object} [options={}]
   * @param {Actor} [options.actor] - Target actor the cards will be created on.
   * @param {string} [options.folderPath] - Optional initial folder path to pre-scan.
   */
  constructor(options = {}) {
    super();

    this._actor = options.actor || null;
    this._themeManager = null;
    this._discoveredImages = [];
    this._scanError = null;
    this._scanning = false;

    // Load persisted config (last-used values) and merge over defaults.
    // Falls back gracefully if the setting isn't registered yet (e.g. during
    // tests) or returns null/undefined.
    const saved = this._loadSavedConfig();

    this._folderPath = (options.folderPath || saved.folderPath || "").replace(
      /^\/+/,
      "",
    );
    this._folderSource = options.folderSource || saved.folderSource || "data";

    this._config = {
      resolveFormula: "1d6",
      resolveType: "damage",
      powerFormula: "0",
      powerType: "damage",
      repetitions: "1",
      damageApplication: true,
      powerDamageApplication: true,
      bgColor: "#8B4513",
      textColor: "#ffffff",
      recursive: false,
      ...saved,
    };

    // Group assignment selection — NOT persisted (intentionally per-creation).
    this._groupConfig = {
      mode: "none", // "none" | "existing" | "new"
      existingId: "",
      newName: "",
    };
  }

  get title() {
    return game.i18n.localize(
      "EVENTIDE_RP_SYSTEM.BulkSavedDamageCreator.Title",
    );
  }

  // =================================
  // Context Preparation
  // =================================

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.actorName = this._actor?.name || "";
    context.folderPath = this._folderPath;
    context.folderSource = this._folderSource;
    context.scanError = this._scanError;
    context.scanning = this._scanning;
    context.hasImages = this._discoveredImages.length > 0;
    context.imageCount = this._discoveredImages.length;
    context.images = this._discoveredImages.map((entry, index) => ({
      index,
      path: entry.path,
      name: entry.name,
    }));
    context.config = this._config;
    context.cssClass =
      BulkSavedDamageCreator.DEFAULT_OPTIONS.classes.join(" ");

    // Group assignment context
    const groups = Array.isArray(this._actor?.system?.actionCardGroups)
      ? this._actor.system.actionCardGroups
      : [];
    context.existingGroups = groups.map((g) => ({
      id: g._id,
      name: g.name || "Group",
    }));
    context.groupConfig = this._groupConfig;

    context.footerButtons = [
      {
        label: game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.BulkSavedDamageCreator.CancelButton",
        ),
        type: "button",
        cssClass: "erps-button erps-button--secondary",
        action: "cancel",
      },
      {
        label: game.i18n.format(
          "EVENTIDE_RP_SYSTEM.BulkSavedDamageCreator.CreateButton",
          { count: this._discoveredImages.length },
        ),
        type: "submit",
        cssClass: "erps-button erps-button--primary",
        disabled: this._discoveredImages.length === 0,
      },
    ];

    return context;
  }

  // =================================
  // Action Handlers
  // =================================

  /**
   * Open Foundry's FilePicker so the user can visually navigate to a folder.
   * Uses type: "folder" so the picker operates in folder-selection mode —
   * the user clicks folders to navigate, then confirms to pick the current
   * folder. The folder path is written to the folder-path input and a scan
   * is triggered automatically.
   */
  _onBrowseFolder(_event, target) {
    const input = target.parentNode.querySelector('input[name="folderPath"]');
    const currentPath = (input?.value || this._folderPath || "").replace(
      /^\/+/,
      "",
    );

    try {
      const fp = new FilePicker({
        displayMode: "list",
        type: "folder",
        current: currentPath,
        callback: (path) => {
          const folder = String(path).replace(/^\/+/, "");
          if (input) {
            input.value = folder;
          }
          this._folderPath = folder;
          // Capture which source tab the user was browsing in (data/public/s3).
          // The callback doesn't receive this, so we read it off the instance.
          this._folderSource = fp.activeSource || "data";
          this._scanError = null;
          this._scanFolder(folder).then(() => this.render());
        },
        top: (this.position?.top || 0) + 40,
        left: (this.position?.left || 0) + 10,
      });
      return fp.browse();
    } catch (error) {
      Logger.error(
        "Failed to open folder browser",
        error,
        "BULK_SAVED_DAMAGE_CREATOR",
      );
      ui.notifications.error(
        game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.BulkSavedDamageCreator.Errors.BrowseFailed",
        ),
      );
    }
  }

  /**
   * Read the folder-path input and trigger a directory scan.
   * Also reads the recursive checkbox so the scan respects the current UI state.
   */
  async _onScanFolder(_event, target) {
    const form = target.closest("form") || this.element;
    const folderInput = form?.querySelector('input[name="folderPath"]');
    const recursiveInput = form?.querySelector('input[name="recursive"]');

    const folder = (folderInput?.value || "").replace(/^\/+/, "");
    if (folderInput) folderInput.value = folder;
    if (recursiveInput) {
      this._config.recursive = recursiveInput.checked;
    }
    this._folderPath = folder;
    this._scanError = null;
    await this._scanFolder(folder);
    this.render();
  }

  /**
   * Remove a discovered image from the in-memory list. Keeps names stable
   * by index — re-rendering reflects the removal.
   */
  _onRemoveImage(_event, target) {
    const index = Number(target.dataset.index);
    if (
      Number.isNaN(index) ||
      index < 0 ||
      index >= this._discoveredImages.length
    ) {
      return;
    }
    this._discoveredImages.splice(index, 1);
    this.render();
  }

  _onCancel(_event, _target) {
    this.close();
  }

  // =================================
  // Folder Scanning
  // =================================

  /**
   * Use FilePicker.browse (static) to list files in a directory, then filter
   * to recognized image extensions. Results populate this._discoveredImages.
   *
   * We deliberately do NOT pass `extensions` to FilePicker.browse — the
   * server-side filter is finicky about format and silently returns no
   * files if it doesn't like what we sent. We instead fetch every file
   * in the directory and filter client-side with a regex.
   *
   * When the "recursive" config option is enabled, subdirectories are
   * descended into up to MAX_RECURSION_DEPTH levels; image names for
   * nested files include their relative path (e.g. "subdir/image.png").
   *
   * @param {string} folder
   * @returns {Promise<void>}
   * @private
   */
  async _scanFolder(folder) {
    this._scanning = true;
    try {
      if (!folder) {
        this._discoveredImages = [];
        this._scanError = game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.BulkSavedDamageCreator.Errors.NoFolder",
        );
        return;
      }

      const source = this._folderSource || "data";
      const recursive = !!this._config.recursive;

      let allFiles;
      try {
        allFiles = await this._collectFiles(folder, source, recursive);
      } catch (browseError) {
        Logger.error(
          "FilePicker.browse threw while scanning folder",
          { source, folder, error: browseError },
          "BULK_SAVED_DAMAGE_CREATOR",
        );
        this._discoveredImages = [];
        this._scanError = game.i18n.format(
          "EVENTIDE_RP_SYSTEM.BulkSavedDamageCreator.Errors.ScanFailedWithPath",
          { source, folder },
        );
        return;
      }

      Logger.debug(
        "Bulk scan results",
        {
          source,
          folder,
          recursive,
          totalFiles: allFiles.length,
          sample: allFiles.slice(0, 5),
        },
        "BULK_SAVED_DAMAGE_CREATOR",
      );

      const images = BulkSavedDamageCreator._buildImageEntries(
        allFiles,
        this._folderPath,
      );

      this._discoveredImages = images;
      this._scanError =
        images.length === 0
          ? game.i18n.format(
              "EVENTIDE_RP_SYSTEM.BulkSavedDamageCreator.Errors.NoImagesWithCount",
              { fileCount: allFiles.length, source },
            )
          : null;
    } catch (error) {
      Logger.error(
        "Failed to scan folder for images",
        error,
        "BULK_SAVED_DAMAGE_CREATOR",
      );
      this._discoveredImages = [];
      this._scanError = game.i18n.localize(
        "EVENTIDE_RP_SYSTEM.BulkSavedDamageCreator.Errors.ScanFailed",
      );
    } finally {
      this._scanning = false;
    }
  }

  /**
   * Recursively (or non-recursively) collect raw file paths from a folder
   * using FilePicker.browse. Pure I/O — no filtering or transformation.
   *
   * @param {string} folder - Directory to scan.
   * @param {string} source - Foundry source ("data" | "public" | "s3").
   * @param {boolean} recursive - Whether to descend into subdirectories.
   * @param {number} [depth=0] - Current recursion depth (internal).
   * @returns {Promise<string[]>} Array of absolute file paths.
   * @private
   */
  async _collectFiles(folder, source, recursive, depth = 0) {
    if (depth > MAX_RECURSION_DEPTH) {
      Logger.warn(
        `Max recursion depth (${MAX_RECURSION_DEPTH}) reached at ${folder}; further subfolders ignored.`,
        {},
        "BULK_SAVED_DAMAGE_CREATOR",
      );
      return [];
    }

    const result = await FilePicker.browse(source, folder);
    let files = Array.isArray(result?.files) ? [...result.files] : [];

    if (recursive && Array.isArray(result.dirs) && result.dirs.length > 0) {
      for (const dir of result.dirs) {
        const subFiles = await this._collectFiles(
          dir,
          source,
          recursive,
          depth + 1,
        );
        files = files.concat(subFiles);
      }
    }

    return files;
  }

  // =================================
  // Form Submission
  // =================================

  /**
   * Handle form submission — validate inputs, build one action-card data
   * object per discovered image, optionally create a new action-card group,
   * and create all cards on the actor in one batch call.
   *
   * On success, the form configuration is persisted to a client setting so
   * the next invocation of the dialog remembers the user's choices.
   *
   * @param {Event} event - The submit event
   * @param {HTMLFormElement} form - The form element
   * @param {FormDataExtended} formData - The extended form data
   * @private
   */
  static async #onSubmit(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object || formData);

    if (!this._actor) {
      ui.notifications.error(
        game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.BulkSavedDamageCreator.Errors.NoActor",
        ),
      );
      return;
    }

    if (this._discoveredImages.length === 0) {
      ui.notifications.warn(
        game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.BulkSavedDamageCreator.Errors.NoImages",
        ),
      );
      return;
    }

    const config = BulkSavedDamageCreator._readConfigFromFormData(data);

    const validationError = this._validateConfig(config);
    if (validationError) {
      ui.notifications.error(validationError);
      return;
    }

    // Resolve the target group (may create a new one on the actor).
    const groupSelection = BulkSavedDamageCreator._readGroupConfigFromFormData(
      data,
      this._actor,
    );
    let targetGroupId = null;
    if (groupSelection.mode === "existing") {
      targetGroupId = groupSelection.existingId || null;
    } else if (groupSelection.mode === "new") {
      try {
        targetGroupId = await this._createNewGroup(groupSelection.newName);
      } catch (error) {
        Logger.error(
          "Failed to create new action card group",
          error,
          "BULK_SAVED_DAMAGE_CREATOR",
        );
        ui.notifications.error(
          game.i18n.localize(
            "EVENTIDE_RP_SYSTEM.BulkSavedDamageCreator.Errors.CreateGroupFailed",
          ),
        );
        event.preventDefault();
        return;
      }
    }

    const baseSystem = DefaultDataFactory.getActionCardData({
      name: "bulk",
      img: "icons/svg/item-bag.svg",
    }).system;

    const cardDataArray = this._discoveredImages.map((entry) =>
      BulkSavedDamageCreator._buildCardData(
        entry,
        config,
        baseSystem,
        targetGroupId,
      ),
    );

    try {
      const created = await this._actor.createEmbeddedDocuments(
        "Item",
        cardDataArray,
      );
      const count = Array.isArray(created) ? created.length : 0;
      ui.notifications.info(
        game.i18n.format(
          "EVENTIDE_RP_SYSTEM.BulkSavedDamageCreator.Notifications.Created",
          { count, actorName: this._actor.name },
        ),
      );

      // Persist the configuration for next time.
      this._persistConfig(config);
    } catch (error) {
      Logger.error(
        "Failed to create bulk action cards",
        error,
        "BULK_SAVED_DAMAGE_CREATOR",
      );
      ui.notifications.error(
        game.i18n.localize(
          "EVENTIDE_RP_SYSTEM.BulkSavedDamageCreator.Errors.CreateFailed",
        ),
      );
      // Prevent closeOnSubmit from closing the dialog so the user can fix input.
      event.preventDefault();
      throw error;
    }
  }

  /**
   * Push a new action card group onto the actor and return its ID.
   * Mirrors the canonical pattern in actor-sheet-additional-actions.mjs.
   *
   * @param {string} name - Desired group name.
   * @returns {Promise<string>} The new group's _id.
   * @private
   */
  async _createNewGroup(name) {
    const existingGroups =
      Array.isArray(this._actor?.system?.actionCardGroups)
        ? this._actor.system.actionCardGroups
        : [];

    const trimmed = String(name || "").trim();
    const groupName =
      trimmed ||
      game.i18n.format("EVENTIDE_RP_SYSTEM.Item.ActionCard.NewGroupName", {
        number: existingGroups.length + 1,
      });

    const newGroupId = foundry.utils.randomID();
    const newGroup = {
      _id: newGroupId,
      name: groupName,
      collapsed: false,
      sort: existingGroups.length * 100000,
    };

    await this._actor.update({
      "system.actionCardGroups": [...existingGroups, newGroup],
    });

    return newGroupId;
  }

  /**
   * Validate all formula inputs up-front so we can surface a precise error
   * before attempting the (atomic) bulk creation.
   *
   * Note: must be an instance method, not static. The static `#onSubmit`
   * handler is invoked by ApplicationV2 with `this` bound to the instance,
   * so it can reach instance methods but not static ones via `this`.
   *
   * @param {Object} config
   * @returns {string|null} Localized error message, or null if valid.
   * @private
   */
  _validateConfig(config) {
    const validator = new FormulaValidator();

    const resolveResult = validator.validateDamageFormula(config.resolveFormula, {
      allowBlank: false,
      allowDataRefs: false,
    });
    if (!resolveResult.isValid) {
      return game.i18n.format(
        "EVENTIDE_RP_SYSTEM.BulkSavedDamageCreator.Errors.InvalidResolveFormula",
        { formula: config.resolveFormula },
      );
    }

    const powerResult = validator.validateDamageFormula(config.powerFormula, {
      allowBlank: true,
      allowDataRefs: false,
    });
    if (!powerResult.isValid) {
      return game.i18n.format(
        "EVENTIDE_RP_SYSTEM.BulkSavedDamageCreator.Errors.InvalidPowerFormula",
        { formula: config.powerFormula },
      );
    }

    const repetitionResult = validator.validateRepetitionFormula(
      config.repetitions,
      { maxRepetitions: 100 },
    );
    if (!repetitionResult.isValid) {
      return game.i18n.format(
        "EVENTIDE_RP_SYSTEM.BulkSavedDamageCreator.Errors.InvalidRepetitionFormula",
        { formula: config.repetitions },
      );
    }

    return null;
  }

  // =================================
  // Persistence
  // =================================

  /**
   * Load the persisted dialog configuration from the client setting.
   * Returns an empty object on any failure so callers can safely spread it
   * over their defaults.
   *
   * @returns {Object}
   * @private
   */
  _loadSavedConfig() {
    try {
      const value = getSetting(CONFIG_SETTING_KEY);
      return value && typeof value === "object" ? value : {};
    } catch (error) {
      // Setting not registered yet, or game not ready — degrade gracefully.
      Logger.debug(
        "Could not load saved config; using defaults",
        { error },
        "BULK_SAVED_DAMAGE_CREATOR",
      );
      return {};
    }
  }

  /**
   * Persist the current dialog configuration to the client setting so the
   * next invocation remembers the user's choices. Failures are logged but
   * do not break the creation flow.
   *
   * Note: group selection is intentionally NOT persisted — it's a
   * per-creation decision, not a stable preference.
   *
   * @param {Object} config
   * @returns {Promise<void>}
   * @private
   */
  async _persistConfig(config) {
    const payload = {
      folderPath: this._folderPath,
      folderSource: this._folderSource,
      resolveFormula: config.resolveFormula,
      resolveType: config.resolveType,
      powerFormula: config.powerFormula,
      powerType: config.powerType,
      repetitions: config.repetitions,
      damageApplication: config.damageApplication,
      powerDamageApplication: config.powerDamageApplication,
      bgColor: config.bgColor,
      textColor: config.textColor,
      recursive: config.recursive,
    };
    try {
      await setSetting(CONFIG_SETTING_KEY, payload);
    } catch (error) {
      Logger.warn(
        "Failed to persist bulk creator config; continuing.",
        { error },
        "BULK_SAVED_DAMAGE_CREATOR",
      );
    }
  }

  // =================================
  // Pure Helpers (static — easily testable)
  // =================================

  /**
   * Normalize raw file paths from FilePicker.browse into image entries,
   * filtering out non-image files and computing display names relative to
   * the scan root folder.
   *
   * Top-level files get just their filename (e.g. "dragon.png").
   * Nested files (from recursive scans) get a relative path
   * (e.g. "boss/dragon.png").
   *
   * @param {string[]} files - Raw file paths returned by FilePicker.browse.
   * @param {string} rootFolder - The folder the top-level scan started in.
   * @returns {{path: string, name: string}[]} Filtered image entries.
   * @private
   */
  static _buildImageEntries(files, rootFolder) {
    const root = String(rootFolder || "").replace(/\/+$/, "");
    return files
      .filter((path) => IMAGE_EXTENSION_PATTERN.test(path))
      .map((path) => {
        const cleaned = String(path).replace(/^\/+/, "");
        let name;
        if (root && cleaned.startsWith(`${root}/`)) {
          name = cleaned.slice(root.length + 1);
        } else {
          name = cleaned.split("/").pop() || cleaned;
        }
        return { path: cleaned, name };
      });
  }

  /**
   * Read shared card configuration from submitted form data.
   * Checkbox handling: HTML checkboxes submit "on" when checked and nothing
   * when unchecked, so we normalize to booleans here.
   *
   * @param {Object} data - Expanded form data object.
   * @returns {Object} Normalized config object.
   * @private
   */
  static _readConfigFromFormData(data) {
    return {
      resolveFormula: String(data.resolveFormula ?? "1d6").trim(),
      resolveType: data.resolveType === "heal" ? "heal" : "damage",
      powerFormula: String(data.powerFormula ?? "0").trim(),
      powerType: data.powerType === "heal" ? "heal" : "damage",
      repetitions: String(data.repetitions ?? "1").trim(),
      damageApplication:
        data.damageApplication === true || data.damageApplication === "on",
      powerDamageApplication:
        data.powerDamageApplication === true ||
        data.powerDamageApplication === "on",
      bgColor: String(data.bgColor ?? "#8B4513"),
      textColor: String(data.textColor ?? "#ffffff"),
      recursive: data.recursive === true || data.recursive === "on",
    };
  }

  /**
   * Read group-assignment selection from submitted form data.
   *
   * The form submits a single `groupSelection` value:
   *   - "" (empty)        → no group
   *   - "__new__"         → create a new group (read name from `newGroupName`)
   *   - any other string  → the ID of an existing group on the actor
   *
   * If the submitted ID doesn't match any group on the actor (e.g. it was
   * deleted between render and submit), we silently fall back to "none"
   * rather than failing the bulk creation.
   *
   * @param {Object} data - Expanded form data object.
   * @param {Actor} actor - Target actor (used to validate existing group IDs).
   * @returns {{mode: string, existingId: string, newName: string}}
   * @private
   */
  static _readGroupConfigFromFormData(data, actor) {
    const value = String(data?.groupSelection || "").trim();
    if (!value) {
      return { mode: "none", existingId: "", newName: "" };
    }
    if (value === "__new__") {
      return {
        mode: "new",
        existingId: "",
        newName: String(data?.newGroupName || ""),
      };
    }
    const exists =
      Array.isArray(actor?.system?.actionCardGroups) &&
      actor.system.actionCardGroups.some((g) => g._id === value);
    if (!exists) {
      return { mode: "none", existingId: "", newName: "" };
    }
    return { mode: "existing", existingId: value, newName: "" };
  }

  /**
   * Build a single action-card creation payload from a discovered image and
   * the shared configuration. Used in a loop to assemble the batch.
   *
   * @param {{path: string, name: string}} entry - Discovered image entry.
   * @param {Object} config - Shared card configuration.
   * @param {Object} baseSystem - Default action-card system data (template).
   * @param {string|null} groupId - Action card group ID, or null for ungrouped.
   * @returns {{name: string, type: string, img: string, system: Object}}
   * @private
   */
  static _buildCardData(entry, config, baseSystem, groupId) {
    const system = foundry.utils.mergeObject(
      foundry.utils.deepClone(baseSystem),
      {
        description: "",
        mode: "savedDamage",
        bgColor: config.bgColor,
        textColor: config.textColor,
        advanceInitiative: false,
        attemptInventoryReduction: false,
        savedDamage: {
          formula: config.resolveFormula,
          type: config.resolveType,
          powerFormula: config.powerFormula,
          powerType: config.powerType,
        },
        repetitions: config.repetitions,
        damageApplication: config.damageApplication,
        powerDamageApplication: config.powerDamageApplication,
        groupId: groupId || null,
      },
      { inplace: false },
    );

    return {
      name: entry.name,
      type: "actionCard",
      img: entry.path,
      system,
    };
  }

  // =================================
  // Theme Management
  // =================================

  async _onFirstRender() {
    super._onFirstRender();
    applyThemeImmediate(this.element);

    if (!this.themeManager) {
      initThemeManager(this, THEME_PRESETS.CREATOR_APPLICATION)
        .then((manager) => {
          this.themeManager = manager;
        })
        .catch((error) => {
          Logger.error(
            "Failed to initialize theme manager for Bulk Saved Damage Creator",
            error,
            "THEME",
          );
        });
    }
  }

  async _onRender(_context, _options) {
    super._onRender(_context, _options);
    if (this.themeManager) {
      this.themeManager.applyThemes();
    }
    erps.utils.initColorPickersWithHex();
  }

  async _preClose(options) {
    if (this.themeManager) {
      cleanupThemeManager(this);
      this.themeManager = null;
    }
    if (this.element) {
      erps.utils.cleanupNumberInputs(this.element);
    }
    await super._preClose(options);
  }
}

export default BulkSavedDamageCreator;
