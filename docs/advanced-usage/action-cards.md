# Action Cards

Action cards are a powerful automation item type enabling complex, dynamic actions. They determine attacks, damage dealt, apply images to damage, and add statuses or gear to targets.

## Creating an Action Card

Create action cards via Foundry's item creation menu or the actor sheet's action card creation menu. Select "Action Card" as the item type, then configure it with these options:

- **Image:** Displayed on damage dealt and character sheet icon.
- **Text & Background Colors:** Theme damage cards.
- **Description:** Applied to damage cards.

In the attributes tab, choose between two main card types: Saved Damage or Attack Chain.
### Saved Damage

Set up a damage card with these parameters:

- **Damage Type** (healing or damage)
- **Damage Amount**
- **Damage Formula**

Saved damage doesn't interact with embedded items. Use Attack Chain for additional functionality.
### Attack Chain

More complex than saved damage, it requires an action in the slot and allows adding effects based on results. Set these parameters:

- **Advance Initiative** (after use)
- **Attempt Inventory Reduction**
- **Stats Compared Against**
- **Damage & Status Conditions**, formulas, thresholds
- **Embedded Items**: Configure combat powers/gear for attack chains and statuses/gear applied to targets.

Action chains with 'none' roll type have automatic two successes. Add a roll or flat action if undesired.

**Important:** Update action cards when changing costs of linked items.

## Configuring Action Cards

In addition, configure execution behavior:

- **Repetitions** (default: 1)
- **Timing Override**
- **Repeat to Hit** (default: false)
- **Damage per Success** (default: false)
- **Status Application Limit** (0 = no limit, default: 1)
- **Cost per Repetition** (default: false)
- **Fail on First Miss** (default: true)
## Using Action Cards

Using an action card is as simple as targeting an opponent and either:

- Clicking the action card's row on your character sheet, or
- Clicking the execute button (⚡/💔/▶️) in the controls column

Both methods will present you with a popup confirming the details of the action you're about to take, showing:

- The embedded item's details and roll formula (if applicable)
- Attack chain configuration (damage conditions, status conditions, thresholds)
- Saved damage configuration (formula, type, description)
- Any validation warnings or errors
- Proper callouts for what will happen when executed

From the popup, you can choose to execute the action or cancel. If you choose to execute it, the flow will go one of two ways:

### The GM Path

- Your roll will be executed and, of course, display its results in the chat log.
- If your attack chain's success conditions are met then damage, effects, or both will be applied to the target.
- If your attack chain's success conditions are not met then nothing will be applied to the target.
- If your attack chain's success conditions are met and the 'attempt inventory reduction' setting is enabled then the gear effects will be applied and the gear will be removed from your inventory. This will always apply the gear in equipped mode so you don't have to worry about that: don't equip cursed gear to yourself just to get it to the opponent.
- If the 'advance initiative' setting is enabled then the initiative will be advanced after the action card is used.

### The Player Path

- Your roll will be executed and, of course, display its results in the chat log.
- If your attack chain's success conditions are met then your GM will receive a notification that they need to apply the effects to the target.
- Your GM will then confirm the effects to apply and they will be applied to the target: they can elect not to apply the damage or the effects since they may know something about the target that you don't.
- If the 'attempt inventory reduction' setting is enabled then the gear effects will be applied and the gear will be removed from your inventory. This will always apply the gear in equipped mode so you don't have to worry about that: don't equip cursed gear to yourself just to get it to the opponent.
- If the 'advance initiative' setting is enabled then the initiative will be advanced after the action card is used.

### When to use an Action Card

Action cards are a great way to automate your actions and make your game more streamlined. They're particularly useful for:

- Automated damage and status application
- Complex attack chains with multiple conditions
- Gear application with inventory reduction
- Spells and spell effects

Basically if you have something you do "all the time" that is a flow of action it may be worth it to define it as an action card. This can be particularly helpful for adventure module creators as it can allow you to define and theme a flow of actions that can be used by characters in your game. For instance if you have a slime monster that always does one of a few actions it would be best to define them as action cards so that you can theme them for player immersion and ease of use by your end users.



### When to Use an Action Card
Automate actions, apply damage/status, create complex attack chains, apply gear with inventory reduction, cast spells, or standardize frequent actions in adventure modules.

