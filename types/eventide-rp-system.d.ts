/**
 * Type definitions for Eventide RP System
 * Provides IntelliSense support for the system's global objects and functions
 *
 * The primary public API is exposed via `globalThis.erps` (shorthand: `erps`).
 * Access it from the browser console or macro scripts:
 *
 * @example
 * // Get a system setting
 * const formula = erps.settings.getSetting("initiativeFormula");
 *
 * @example
 * // Open a macro dialog
 * new erps.macros.GearCreator({ actor }).render(true);
 *
 * @example
 * // Run diagnostics
 * const info = erps.diagnostics();
 */

declare global {
  /**
   * Global namespace for Eventide RP System
   */
  namespace globalThis {
    var erps: EventideRPSystemGlobal;
  }

  /**
   * Main global API object for the Eventide RP System.
   *
   * Accessible via `erps` in the browser console, macros, and module scripts.
   * This is the primary entry point for downstream developers integrating with
   * the system. It provides runtime access to document classes, applications,
   * utility functions, macro dialogs, settings, and diagnostic tools.
   */
  interface EventideRPSystemGlobal {
    /**
     * System document classes for Actor and Item.
     *
     * Use these to create new documents or reference class constructors
     * for `instanceof` checks and subclassing.
     *
     * @example
     * const actor = new erps.documents.EventideRpSystemActor({ name: "Hero", type: "character" });
     * if (doc instanceof erps.documents.EventideRpSystemItem) { ... }
     */
    documents: {
      EventideRpSystemActor: typeof EventideRpSystemActor;
      EventideRpSystemItem: typeof EventideRpSystemItem;
    };

    /**
     * System sheet application classes for Actor and Item.
     *
     * Useful for `instanceof` checks or programmatic sheet rendering.
     *
     * @example
     * if (app instanceof erps.applications.EventideRpSystemActorSheet) { ... }
     */
    applications: {
      EventideRpSystemActorSheet: typeof EventideRpSystemActorSheet;
      EventideRpSystemItemSheet: typeof EventideRpSystemItemSheet;
    };

    /**
     * Utility functions for common Foundry tasks, UI helpers, and system operations.
     *
     * Includes methods from CommonFoundryTasks (getTargetArray, retrieveSheetTheme, etc.),
     * rollItemMacro, color picker/number input/range slider helpers, ErrorHandler,
     * performSystemCleanup, and TransformationConverter.
     *
     * @example
     * // Get currently targeted tokens
     * const targets = erps.utils.getTargetArray();
     *
     * @example
     * // Get the user's current sheet theme
     * const theme = erps.utils.retrieveSheetTheme();
     */
    utils: {
      /** Execute a macro created from an Item drop */
      rollItemMacro: (itemUuid: string) => Promise<void>;
      /** Initialize color picker inputs with hex value display */
      initColorPickersWithHex: () => void;
      /** Enhance existing color picker elements in the DOM */
      enhanceExistingColorPickers: () => void;
      /** Initialize number input enhancers on the page */
      initNumberInputs: () => void;
      /** Clean up number input enhancers for a specific form */
      cleanupNumberInputs: () => void;
      /** Clean up all number input enhancers globally */
      cleanupNumberInputsGlobal: () => void;
      /** Clean up color picker enhancers */
      cleanupColorPickers: () => void;
      /** Initialize range slider enhancers */
      initRangeSliders: () => void;
      /** Clean up range slider enhancers */
      cleanupRangeSliders: () => void;
      /** Get active themed application instances for diagnostics */
      getActiveThemeInstances: () => any[];
      /** Centralized error handling utility */
      ErrorHandler: any;
      /** Perform standard system cleanup of tracked intervals and stale references */
      performSystemCleanup: () => void;
      /** Convert actors to/from transformation items */
      TransformationConverter: any;
      /** Get an array of tokens currently targeted by the user */
      getTargetArray: () => Token[];
      /** Get an array of tokens currently controlled by the user */
      getSelectedArray: () => Token[];
      /** Store a key-value pair in the user's flags under the system namespace */
      storeUserFlag: (key: string, value: any) => Promise<User>;
      /** Retrieve a single user flag value by key */
      retrieveUserFlag: (key: string) => any;
      /** Get the user's current sheet theme preference */
      retrieveSheetTheme: () => string;
      /** Store multiple user flags at once */
      storeMultipleUserFlags: (flags: Record<string, any>) => Promise<User>;
    };

    /**
     * Macro dialog classes that can be instantiated programmatically.
     *
     * Each class extends Foundry's Application and provides a UI dialog
     * for a specific game action.
     *
     * @example
     * // Open a gear creation dialog for a specific actor
     * new erps.macros.GearCreator({ actor }).render(true);
     *
     * @example
     * // Open a damage targets dialog
     * new erps.macros.DamageTargets().render(true);
     */
    macros: {
      /** Dialog for transferring gear between actors */
      GearTransfer: any;
      /** Dialog for creating new gear items */
      GearCreator: any;
      /** Dialog for applying damage to targeted tokens */
      DamageTargets: any;
      /** Dialog for setting restore target values */
      RestoreTarget: any;
      /** Dialog for changing a target's status effects */
      ChangeTargetStatus: any;
      /** Dialog for selecting an ability to roll */
      SelectAbilityRoll: any;
      /** Dialog for creating new effects on items */
      EffectCreator: any;
      /** Dialog for creating transformation items */
      TransformationCreator: any;
      /** Dialog for converting an actor to a transformation item */
      ActorToTransformationConverter: any;
      /** Dialog for converting a transformation item back to an actor */
      TransformationToActorConverter: any;
    };

    /**
     * System settings getters and setters.
     *
     * Provides shorthand access to system settings without the full
     * `game.settings.get("eventide-rp-system", key)` pattern.
     *
     * @example
     * const initiative = erps.settings.getSetting("initiativeFormula");
     * await erps.settings.setSetting("initiativeFormula", "1d20+3");
     */
    settings: {
      /** Get a system setting value by key */
      getSetting: (key: string) => any;
      /** Set a system setting value by key */
      setSetting: (key: string, value: any) => Promise<any>;
    };

    /** Message handler for creating and managing system chat messages */
    messages: any;

    /**
     * Data model classes for all actor and item types.
     *
     * Maps type names to their DataModel classes, matching what is registered
     * in `CONFIG.Actor.dataModels` and `CONFIG.Item.dataModels`.
     *
     * @example
     * const schema = erps.models.EventideRpSystemCharacter.defineSchema();
     */
    models: {
      EventideRpSystemCharacter: any;
      EventideRpSystemNPC: any;
      EventideRpSystemGear: any;
      EventideRpSystemFeature: any;
      EventideRpSystemStatus: any;
      EventideRpSystemCombatPower: any;
      EventideRpSystemTransformation: any;
      EventideRpSystemActionCard: any;
      [key: string]: any;
    };

    /**
     * System logger with leveled output (debug, info, warn, error).
     *
     * Respects the `testingMode` setting for debug-level output.
     * All log messages are prefixed with `ERPS`.
     *
     * @example
     * erps.Logger.info("Character created", { name: actor.name }, "CHARACTER");
     */
    Logger: EventideLogger;

    /**
     * GM Control manager for action approval workflows.
     *
     * Set asynchronously after init — may be `null` during early initialization.
     */
    gmControl: any;

    /**
     * Perform standard system cleanup — clears tracked intervals and stale DOM references.
     * Safe to call during normal operation.
     *
     * @example
     * erps.cleanup();
     */
    cleanup: () => void;

    /**
     * Force aggressive cleanup — clears ALL intervals and timeouts.
     *
     * ⚠️ May disrupt active animations. Use only for debugging or emergency cleanup.
     *
     * @example
     * erps.forceCleanup();
     */
    forceCleanup: () => void;

    /**
     * Collect and return system diagnostic information.
     *
     * Returns memory usage, interval counts, initialization state, document counts,
     * system/Foundry versions, migration status, and active theme instances.
     *
     * @example
     * const info = erps.diagnostics();
     * console.log(`Actors: ${info.actorCount}, System: ${info.systemVersion}`);
     */
    diagnostics: () => SystemDiagnostics;

    /**
     * Open the system performance monitoring dashboard.
     *
     * Loads and renders a graphical dashboard showing system resource usage,
     * active intervals, and performance metrics.
     *
     * @example
     * erps.showPerformanceDashboard();
     */
    showPerformanceDashboard: () => void;
  }

  /**
   * System diagnostic information returned by `erps.diagnostics()`.
   */
  interface SystemDiagnostics {
    /** Number of tracked intervals currently active */
    trackedIntervals: number;
    /** Memory usage info (Chrome only), or "Memory info not available" */
    memoryInfo:
      | string
      | {
          used: string;
          total: string;
          limit: string;
        };
    /** Whether GM control hooks have been initialized */
    gmControlHooksInitialized: boolean;
    /** Whether number input enhancers are active */
    numberInputsInitialized: boolean;
    /** Number of active themed application instances */
    themeInstancesCount: number;
    /** Details of active themed application instances */
    themeInstances: any[];
    /** Total number of actors in the game */
    actorCount: number;
    /** Total number of items in the game */
    itemCount: number;
    /** Total number of chat messages */
    messageCount: number;
    /** Total number of scenes */
    sceneCount: number;
    /** Total number of users */
    userCount: number;
    /** System semver version string */
    systemVersion: string;
    /** Foundry VTT semver version string */
    foundryVersion: string;
    /** Migration version level (e.g., "Level 2") or status */
    migrationVersion: string;
    /** V14 migration version string or "Not run" */
    v14MigrationVersion: string;
    /** ISO timestamp of when diagnostics were collected */
    timestamp: string;
  }

  /**
   * Logger interface for the system.
   *
   * All methods accept a message, optional data object, and optional category string.
   * Messages are prefixed with `ERPS | LEVEL` and category is shown in brackets if provided.
   */
  interface EventideLogger {
    /** Log at debug level (only visible when testingMode is enabled or Foundry debug is active) */
    debug: (message: string, data?: any, category?: string) => void;
    /** Log at info level */
    info: (message: string, data?: any, category?: string) => void;
    /** Log at warn level */
    warn: (message: string, data?: any, category?: string) => void;
    /** Log at error level */
    error: (message: string, data?: any, category?: string) => void;
  }

  /**
   * Base actor class for the system.
   *
   * Composed via mixin chain: ActorTransformationMixin → ActorResourceMixin → ActorRollsMixin → Actor.
   * Provides rolling, resource management, transformation support, and derived data calculations.
   */
  class EventideRpSystemActor extends Actor {
    // See document source for full method list
  }

  /**
   * Base item class for the system.
   *
   * Composed via mixin chain: ItemActionCardExecutionMixin → ItemActionCardMixin →
   * ItemRollsMixin → ItemPopupsMixin → ItemUtilitiesMixin → Item.
   * Provides rolling, popups, action card execution, and quantity management.
   */
  class EventideRpSystemItem extends Item {
    // See document source for full method list
  }

  /**
   * Actor sheet class for the system.
   */
  class EventideRpSystemActorSheet extends ActorSheet {
    // See document source for full method list
  }

  /**
   * Item sheet class for the system.
   */
  class EventideRpSystemItemSheet extends ItemSheet {
    // See document source for full method list
  }
}

export {};