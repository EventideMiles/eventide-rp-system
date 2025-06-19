/**
 * Type definitions for Eventide RP System
 * Provides IntelliSense support for the system's global objects and functions
 */

declare global {
  /**
   * Global namespace for Eventide RP System
   */
  namespace globalThis {
    var erps: EventideRPSystemGlobal;
  }

  /**
   * Main global object for the Eventide RP System
   */
  interface EventideRPSystemGlobal {
    documents: {
      EventideRpSystemActor: typeof EventideRpSystemActor;
      EventideRpSystemItem: typeof EventideRpSystemItem;
    };
    applications: {
      EventideRpSystemActorSheet: typeof EventideRpSystemActorSheet;
      EventideRpSystemItemSheet: typeof EventideRpSystemItemSheet;
    };
    utils: {
      rollItemMacro: (itemUuid: string) => Promise<void>;
      initColorPickersWithHex: () => void;
      enhanceExistingColorPickers: () => void;
      initNumberInputs: () => void;
      cleanupNumberInputs: () => void;
      cleanupNumberInputsGlobal: () => void;
      cleanupColorPickers: () => void;
      initRangeSliders: () => void;
      cleanupRangeSliders: () => void;
      getActiveThemeInstances: () => any[];
      ErrorHandler: any;
      performSystemCleanup: () => void;
    };
    macros: {
      GearTransfer: any;
      GearCreator: any;
      DamageTargets: any;
      RestoreTarget: any;
      ChangeTargetStatus: any;
      SelectAbilityRoll: any;
      EffectCreator: any;
      TransformationCreator: any;
    };
    settings: {
      getSetting: (key: string) => any;
      setSetting: (key: string, value: any) => Promise<any>;
    };
    messages: any;
    models: any;
    Logger: EventideLogger;
    gmControl: any;
    cleanup: () => void;
    forceCleanup: () => void;
    diagnostics: () => SystemDiagnostics;
    showPerformanceDashboard: () => void;
  }

  /**
   * System diagnostics information
   */
  interface SystemDiagnostics {
    trackedIntervals: number;
    memoryInfo: string | {
      used: string;
      total: string;
      limit: string;
    };
    gmControlHooksInitialized: boolean;
    numberInputsInitialized: boolean;
    activeThemeInstances: any;
    actorCount: number;
    itemCount: number;
    messageCount: number;
    sceneCount: number;
    userCount: number;
    systemVersion: string;
    foundryVersion: string;
    timestamp: string;
  }

  /**
   * Logger interface for the system
   */
  interface EventideLogger {
    debug: (message: string, data?: any, category?: string) => void;
    info: (message: string, data?: any, category?: string) => void;
    warn: (message: string, data?: any, category?: string) => void;
    error: (message: string, data?: any, category?: string) => void;
  }

  /**
   * Base actor class for the system
   */
  class EventideRpSystemActor extends Actor {
    // Add specific methods and properties as needed
  }

  /**
   * Base item class for the system
   */
  class EventideRpSystemItem extends Item {
    // Add specific methods and properties as needed
  }

  /**
   * Actor sheet class for the system
   */
  class EventideRpSystemActorSheet extends ActorSheet {
    // Add specific methods and properties as needed
  }

  /**
   * Item sheet class for the system
   */
  class EventideRpSystemItemSheet extends ItemSheet {
    // Add specific methods and properties as needed
  }
}

export {};