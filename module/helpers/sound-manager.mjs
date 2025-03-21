/**
 * Sound Manager for Eventide RP System
 * Handles playing custom sounds for various system events
 */
export class ERPSSoundManager {
  constructor() {
    this._defaultSounds = {
      healing: "systems/eventide-rp-system/assets/sounds/Cure2.wav",
      statusApply: "systems/eventide-rp-system/assets/sounds/jingles_SAX04.ogg",
      statusRemove: "systems/eventide-rp-system/assets/sounds/Cure5.wav",
      gearEquip: "systems/eventide-rp-system/assets/sounds/cloth3.ogg",
      gearUnequip: "systems/eventide-rp-system/assets/sounds/clothBelt2.ogg",
      combatPower: "systems/eventide-rp-system/assets/sounds/trap_00.wav",
      damage: "systems/eventide-rp-system/assets/sounds/swish_4.wav",
      initiative: "systems/eventide-rp-system/assets/sounds/levelup.wav",
    };
    
    // Initialize with default sounds
    this.sounds = { ...this._defaultSounds };
    this._recentlyPlayedSounds = new Set();
    
    // Wait for game to be ready before loading from settings
    Hooks.once('ready', () => {
      this.refreshSounds();
    });
  }

  /**
   * Get the default sounds object
   * @returns {Object} Default sounds mapping
   */
  getDefaultSounds() {
    return this._defaultSounds;
  }

  /**
   * Refresh sounds from settings
   */
  refreshSounds() {
    // Only proceed if game settings are available
    if (!game.settings) return;
    
    // Load each sound from settings or use default
    for (const [key, defaultPath] of Object.entries(this._defaultSounds)) {
      const settingKey = `sound_${key}`;
      
      try {
        let soundPath = game.settings.get("eventide-rp-system", settingKey);
        
        // If empty, use default
        if (!soundPath || soundPath.trim() === "") {
          soundPath = defaultPath;
        }
        
        this.sounds[key] = soundPath;
      } catch (error) {
        // If setting doesn't exist yet, use default
        console.log(`Sound setting ${settingKey} not found, using default`);
        this.sounds[key] = defaultPath;
      }
    }
  }

  /**
   * Play a sound if system sounds are enabled
   * @param {string} soundKey - Key of the sound in this.sounds
   * @param {Object} [options={}] - Additional options
   * @param {boolean} [options.force=false] - Whether to force play the sound even if recently played
   * @returns {Promise<void>}
   */
  async playSound(soundKey, options = {}) {
    // Check if sounds are enabled in settings
    if (!game.settings.get("eventide-rp-system", "enableSystemSounds")) return;

    // Get the sound path
    const soundPath = this.sounds[soundKey];
    if (!soundPath) {
      console.log(
        `Eventide RP System | Sound key "${soundKey}" not found or not yet implemented`
      );
      return;
    }

    // Debounce sounds to prevent multiple plays in quick succession
    if (!options?.force && this._recentlyPlayedSounds.has(soundKey)) {
      return;
    }

    // Get the volume from settings
    const volume = game.settings.get("eventide-rp-system", "systemSoundVolume");

    // Play the sound using the namespaced AudioHelper
    foundry.audio.AudioHelper.play(
      {
        src: soundPath,
        volume: volume,
        autoplay: true,
        loop: false,
      },
      false
    );

    // Add to recently played sounds and remove after debounce period
    this._recentlyPlayedSounds.add(soundKey);
    setTimeout(() => {
      this._recentlyPlayedSounds.delete(soundKey);
    }, 500); // 500ms debounce period
  }

  /**
   * Check if a sound exists
   * @param {string} soundKey - Key of the sound to check
   * @returns {boolean} Whether the sound exists
   */
  soundExists(soundKey) {
    return !!this.sounds[soundKey];
  }
}

// Create a singleton instance
export const erpsSoundManager = new ERPSSoundManager();
