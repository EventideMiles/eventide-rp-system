# Installation Guide

This guide will walk you through installing and setting up the Eventide Roleplaying System for Foundry VTT.

## Prerequisites

Before installing Eventide RP System, ensure you have:

- **Foundry VTT v13.341 or higher** (verified compatible with v13.344)
- **Administrator access** to your Foundry VTT installation (for GMs)
- **Basic familiarity** with Foundry VTT interface

## Installation Methods

### Method 1: Install from Manifest URL (Recommended)

1. **Open Foundry VTT** and navigate to the **Game Systems** tab
2. Click **"Install System"**
3. In the **Manifest URL** field, paste:

   ```text
   https://github.com/EventideMiles/eventide-rp-system/releases/latest/download/system.json
   ```

4. Click **"Install"**
5. Wait for the installation to complete

### Method 2: Manual Installation

1. **Download** the latest release from [GitHub Releases](https://github.com/EventideMiles/eventide-rp-system/releases)
2. **Extract** the ZIP file to your Foundry VTT `Data/systems/` directory
3. **Rename** the extracted folder to `eventide-rp-system` if necessary
4. **Restart** Foundry VTT

## Creating Your First World

1. **Return to Setup** and click **"Create World"**
2. **Select "Eventide Roleplaying System"** from the Game System dropdown
3. **Configure your world settings:**
   - **World Title**: Choose a memorable name
   - **Data Path**: Leave as default unless you have specific needs
   - **Description**: Optional world description
4. Click **"Create World"**
5. **Launch** your new world

## Initial Configuration

### For Game Masters

After creating your world, configure these essential settings:

1. **Navigate to Settings** → **Configure Settings** → **System Settings**

2. **Combat Settings:**

   - **Initiative Formula**: Default is optimized for Eventide mechanics
   - **Auto-Roll NPC Initiative**: Recommended to enable for smoother combat
   - **Hide NPC Initiative Rolls**: Enable to maintain mystery

3. **Interface Settings:**

   - **Application Theme**: Choose your preferred visual theme
   - **Default Character Tab**: Set which tab opens by default on character sheets

4. **Sound Settings:**
   - **Enable System Sounds**: Toggle system audio feedback
   - **Configure Sound Effects**: Access via Settings → Sound Effects (GM only)

### For Players

Players only need to configure personal preferences:

1. **Navigate to Settings** → **Configure Settings** → **System Settings**
2. **Set your preferred:**
   - **Application Theme**: Personal visual preference
   - **Default Character Tab**: Your preferred starting tab
   - **Enable System Sounds**: Personal audio preference

## Importing Content

### ERPS Macros Compendium

The system includes a macro compendium with useful tools:

1. **Open the Compendiums tab**
2. **Find "ERPS Macros"**
3. **Import macros** you want to use:
   - **Gear Creator**: For creating equipment
   - **Effect Creator**: For creating status effects
   - **Damage/Healing macros**: For combat management

### Creating Your First Content

**For GMs:**

1. **Create an NPC** to test system features
2. **Use the Gear Creator** to make some basic equipment
3. **Try the Effect Creator** to make a simple status effect

**For Players:**

1. **Ask your GM** to create a character for you
2. **Familiarize yourself** with the character sheet layout
3. **Practice rolling** abilities by clicking on them

## Troubleshooting

### Common Issues

**System not appearing in Game Systems list:**

- Verify Foundry VTT version compatibility
- Check that the manifest URL is correct
- Ensure stable internet connection during installation

**Character sheet not loading properly:**

- Refresh your browser (F5)
- Check browser console for errors
- Verify all system files installed correctly

**Macros not working:**

- Ensure you have appropriate permissions
- Check that macros are imported from the compendium
- Verify you have selected/targeted tokens as required

### Getting Help

If you encounter issues:

1. **Check the documentation** in other sections of this guide
2. **Search existing issues** on [GitHub](https://github.com/EventideMiles/eventide-rp-system/issues)
3. **Create a new issue** with detailed information about your problem
4. **Include your Foundry VTT version** and system version in bug reports

## Next Steps

Now that you have Eventide RP System installed:

- **GMs**: Continue to [For Game Masters](../for-gms/README.md)
- **Players**: Continue to [For Players](../for-players/README.md)
- **Everyone**: Explore [System Features](../system-features/README.md) for detailed mechanics

## System Information

- **Current Version**: 13.12.0
- **Foundry Compatibility**: v13.341 minimum, v13.345 verified (NOTE: We will not be tracking . foundry releases after v13.345 since they do not make major api changes mid-major version and I don't want the system complaining about compatibility with minor version bumps)
- **Last Updated**: Check [GitHub Releases](https://github.com/EventideMiles/eventide-rp-system/releases) for latest information
- **Installation Method**: Foundry Package Manager (recommended) or Manual
- **Dependencies**: None required
