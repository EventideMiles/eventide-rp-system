# Transformations

Transformations are our new item type: introduced with version 13.1.0 and above. They make it easy to apply different sets of abilities, form bonuses and penalties, sizes, and icons to players and NPCs if they transform throughout the course of your adventure.

## Transformation Creator - Getting Started

This application follows the pattern of most of our creator applications in that it can be used for on-the-fly creation or preparation creation. When you open it you'll see several options that you should fill out for the transformation.

- **Name:** The name of the transformation
- **Description:** (optional) Provide a text description that should be shown to players when the transformation is applied to a character. If nothing is provided you'll get the default transformation message.
- **Image:** The new image for the token this will be applied to. Keep in mind that if you set it to "icons/svg/ice-aura.svg" or "icons/svg/item-bag.svg" that their current token will be kept and only other aspects of the transformation will be applied (good for size modification only transformations)
- **Size:** The size that the character will be following the transformation. There are a few special things to note here:
  1. Tiny will reduce their token size to 1/4 of the square.
  2. Small will reduce the size of the image but not reduce the token below a square in size.
  3. Every "half" step is a round up to the next one. So, 1.5 will make a bigger token image that still technically fits on 1 square, 2 will be the next bump up making it a 2x2 token, 2.5 will be halfway between a 2x2 and a 3x3 but will 'fit' on a 2x2 and so on.
- **Cursed:** If you flip this toggle your player will be unable to release the transformation on their own. Best used for 'baleful' transformations or those that are strictly duration based.
- **Combat Powers:** This is the part that really makes transformations unique. Unlike other item types, Transformations are able to "hold" combat power items that you've prepared before. Simply drag them to this sheet either from other character sheets, your items section, or a comendium and they'll be added to the sheet.
  - _Note - If you add powers in this section they will be the only powers available to the transformed actor: make sure to add whatever the transformed character will need._
- **Effects:** This section works like other effects but with one key difference. ANY changes made here will be an "add" of the type "Transformtion". That means that while they will have an impact on the stat they aren't to be used to assign disasdvantage, advantage, or to override a stat. If you need these modes please use in conjunction with a status effect.

If you're preparing transformations ahead of time then use the creator without targeting another token: it will simply create your transformations in a compendium called "Custom Transformations" so you can put them to use later.

## Applying a Transformation

There are two ways to apply a transformation to an actor:

1. Drag and drop to their character sheet from your items section or a compendium.
2. If you use the transformation creator with a token targeted it will apply the transformation to them directly: useful for on-the-fly transformations that you had no time to prepare for because things took a different turn than you imagined during your session.

## Ending a Transformation

When a character is transformed the transformation will appear near the top right of the character sheet (beside their name) and can be dismissed by pressing the "reload" arrow at the right of its section. If the transformation is "cursed" then removal can only be completed by a GM.

## Advanced Usage

- If you want to disable a character's combat powers completely with a transformation you should create a power with that explicit purpose: something useless to apply in the effects section, as then their typical combat powers will be disabled while the transformation is applied. Especially good for baleful polymorphs which would remove typical character abilities without providing much of use in return.
- Transformations are good for just about every 'use case' you can imagine: from barbarian raging to size changes to full on curses and even things like vampirism. The sky and your imagination are the limits, so feel free to indulge your creativity and your player's.
