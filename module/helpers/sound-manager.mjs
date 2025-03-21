/**
 * Sound Manager for Eventide RP System
 * Handles playing custom sounds for various system events
 */
export class ERPSSoundManager {
  constructor() {
    this.sounds = {
      healing: "systems/eventide-rp-system/assets/sounds/Cure2.wav",
      statusApply: "systems/eventide-rp-system/assets/sounds/jingles_SAX04.ogg",
      statusRemove: "systems/eventide-rp-system/assets/sounds/Cure5.wav",
      gearEquip: "systems/eventide-rp-system/assets/sounds/cloth3.ogg",
      gearUnequip: "systems/eventide-rp-system/assets/sounds/clothBelt2.ogg",
      combatPower: "systems/eventide-rp-system/assets/sounds/trap_00.wav",
      damage: "systems/eventide-rp-system/assets/sounds/swish_4.wav",
      initiative: "systems/eventide-rp-system/assets/sounds/levelup.wav",
    };
    this._recentlyPlayedSounds = new Set();
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
   * Check if a sound file exists
   * @param {string} soundKey - Key of the sound in this.sounds
   * @returns {Promise<boolean>} - Whether the sound file exists
   */
  async soundExists(soundKey) {
    const soundPath = this.sounds[soundKey];
    if (!soundPath) return false;

    try {
      const response = await fetch(soundPath);
      return response.ok;
    } catch (error) {
      console.warn(`Eventide RP System | Error checking sound file: ${error}`);
      return false;
    }
  }
}

// Create a singleton instance
export const erpsSoundManager = new ERPSSoundManager();
