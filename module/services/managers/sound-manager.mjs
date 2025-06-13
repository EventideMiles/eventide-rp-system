/**
 * Sound Manager for Eventide RP System
 *
 * @module services/managers/sound-manager
 */
import { getSetting } from "../settings/_module.mjs";
import { Logger } from "../logger.mjs";

/**
 * Sound Manager for Eventide RP System
 * Handles playing custom sounds for various system events
 *
 * @class
 */
export class ERPSSoundManager {
  /**
   * Initializes the sound manager with default sounds and sets up hooks
   *
   * @constructor
   */
  constructor() {
    /**
     * Default sound paths for various system events
     * @private
     * @type {Object.<string, string>}
     */
    this._defaultSounds = {
      healing: "systems/eventide-rp-system/assets/sounds/Cure2.wav",
      statusApply: "systems/eventide-rp-system/assets/sounds/jingles_SAX04.ogg",
      statusRemove: "systems/eventide-rp-system/assets/sounds/Cure5.wav",
      gearEquip: "systems/eventide-rp-system/assets/sounds/cloth3.ogg",
      gearUnequip: "systems/eventide-rp-system/assets/sounds/clothBelt2.ogg",
      combatPower: "systems/eventide-rp-system/assets/sounds/Trap_00.wav",
      damage: "systems/eventide-rp-system/assets/sounds/swish_4.wav",
      initiative: "systems/eventide-rp-system/assets/sounds/levelup.wav",
      diceRoll: "sounds/dice.wav", // Standard Foundry dice sound for ability rolls
      featureRoll: "systems/eventide-rp-system/assets/sounds/4.wav",
    };

    /**
     * Current sound paths, initially set to defaults
     * @type {Object.<string, string>}
     */
    this.sounds = { ...this._defaultSounds };

    /**
     * Set of recently played sounds for debouncing
     * @private
     * @type {Set<string>}
     */
    this._recentlyPlayedSounds = new Set();

    // Wait for game to be ready before loading from settings
    Hooks.once("ready", () => {
      this.refreshSounds();
      this._registerHooks();
    });
  }

  /**
   * Register hooks for chat messages to play sounds
   *
   * @private
   */
  _registerHooks() {
    // Listen for chat messages to play sounds
    Hooks.on("createChatMessage", (message) => {
      this._handleChatMessageSound(message);
    });
  }

  /**
   * Handle sound data in chat messages
   *
   * @private
   * @param {ChatMessage} message - The chat message to check for sound data
   */
  _handleChatMessageSound(message) {
    // Check if the message has sound data
    const flags = message.flags || {};
    const soundData = flags["eventide-rp-system"]?.sound;

    if (soundData && soundData.key) {
      Logger.info(
        "Playing sound from chat message",
        { soundKey: soundData.key },
        "SOUND_MANAGER",
      );
      // Play the sound locally without broadcasting to avoid loops
      this._playLocalSound(soundData.key, {
        force: soundData.force || false,
      });
    }
  }

  /**
   * Get the default sounds object
   *
   * @returns {Object.<string, string>} Default sounds mapping
   */
  getDefaultSounds() {
    return this._defaultSounds;
  }

  /**
   * Refresh sounds from settings
   * Loads each sound setting and falls back to defaults if needed
   */
  refreshSounds() {
    // Only proceed if game settings are available
    if (!game.settings) return;

    // Load each sound from settings or use default
    for (const [key, defaultPath] of Object.entries(this._defaultSounds)) {
      this._loadSoundSetting(key, defaultPath);
    }
  }

  /**
   * Load a single sound setting
   *
   * @private
   * @param {string} key - Sound key
   * @param {string} defaultPath - Default path to fall back to
   */
  _loadSoundSetting(key, defaultPath) {
    const settingKey = `sound_${key}`;

    try {
      let soundPath = getSetting(settingKey);

      // If empty, use default
      if (!soundPath || soundPath.trim() === "") {
        soundPath = defaultPath;
      }

      this.sounds[key] = soundPath;
    } catch {
      // If setting doesn't exist yet, use default
      Logger.info(
        "Sound setting not found, using default",
        { settingKey },
        "SOUND_MANAGER",
      );
      this.sounds[key] = defaultPath;
    }
  }

  /**
   * Play a sound locally and prepare flags for a chat message
   *
   * @param {string} soundKey - Key of the sound in this.sounds
   * @param {Object} [options={}] - Additional options
   * @param {boolean} [options.force=false] - Whether to force play the sound even if recently played
   * @returns {Object} Sound flags to add to a chat message
   */
  async playSound(soundKey, options = {}) {
    // Default options
    const opts = {
      force: false,
      ...options,
    };

    // Play locally first for immediate feedback
    await this._playLocalSound(soundKey, { force: opts.force });

    // Return flags to add to a chat message
    return {
      "eventide-rp-system": {
        sound: {
          key: soundKey,
          force: opts.force,
        },
      },
    };
  }

  /**
   * Play a sound locally if system sounds are enabled
   *
   * @private
   * @param {string} soundKey - Key of the sound in this.sounds
   * @param {Object} [options={}] - Additional options
   * @param {boolean} [options.force=false] - Whether to force play the sound even if recently played
   * @returns {Promise<void>}
   */
  async _playLocalSound(soundKey, options = {}) {
    // Check if sounds are enabled in settings
    if (!getSetting("enableSystemSounds")) return;

    // Get the sound path
    const soundPath = this.sounds[soundKey];
    if (!soundPath) {
      Logger.info(
        "Sound key not found or not yet implemented",
        { soundKey },
        "SOUND_MANAGER",
      );
      return;
    }

    // Debounce sounds to prevent multiple plays in quick succession
    if (!options?.force && this._recentlyPlayedSounds.has(soundKey)) {
      return;
    }

    // Play the sound
    this._playSoundFile(soundPath);

    // Add to recently played sounds and remove after debounce period
    this._addToRecentlyPlayed(soundKey);
  }

  /**
   * Play a sound file using the AudioHelper
   *
   * @private
   * @param {string} soundPath - Path to the sound file
   */
  _playSoundFile(soundPath) {
    // Get the volume from settings
    const volume = game.settings.get("core", "globalInterfaceVolume");

    // Play the sound using the namespaced AudioHelper
    foundry.audio.AudioHelper.play(
      {
        src: soundPath,
        volume,
        autoplay: true,
        loop: false,
      },
      false,
    );
  }

  /**
   * Add a sound key to recently played and set a timeout to remove it
   *
   * @private
   * @param {string} soundKey - Key of the sound
   * @param {number} [timeout=500] - Timeout in milliseconds
   */
  _addToRecentlyPlayed(soundKey, timeout = 500) {
    this._recentlyPlayedSounds.add(soundKey);
    setTimeout(() => {
      this._recentlyPlayedSounds.delete(soundKey);
    }, timeout);
  }

  /**
   * Check if a sound exists
   *
   * @param {string} soundKey - Key of the sound to check
   * @returns {boolean} Whether the sound exists
   */
  soundExists(soundKey) {
    return !!this.sounds[soundKey];
  }
}

/**
 * Singleton instance of the sound manager
 * @type {ERPSSoundManager}
 */
export const erpsSoundManager = new ERPSSoundManager();
