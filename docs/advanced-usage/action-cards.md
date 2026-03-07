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

## Activation Methods

Action cards use activation methods (also called conditions) to determine when damage, status effects, and transformations are applied. These conditions are evaluated based on the roll result from the embedded item in attack chain mode, or based on the saved damage application in saved damage mode.

### Understanding Activation Conditions

Activation conditions are configured separately for:

- **Damage Conditions**: When damage is applied to targets
- **Status Conditions**: When status effects and gear are applied to targets
- **Transformation Conditions**: When transformations are applied to targets

Each condition type can use any of the available activation methods, allowing for complex and nuanced action card behavior.

### Available Activation Methods

#### Success-Based Conditions

**Never**

- Never activates the effect
- Use case: Temporarily disable an effect without removing it from the configuration
- Example: A poison effect that's currently inactive but might be re-enabled later

**One Success**

- Activates when at least one of the two AC (Ability Check) rolls succeeds
- Use case: Standard attacks where partial success is sufficient
- Example: A sword strike that deals damage on any hit

**Two Successes**

- Activates only when both AC rolls succeed
- Use case: Powerful abilities that require exceptional performance
- Example: A precise strike that only applies bonus damage on a perfect hit

**Zero Successes**

- Activates only when both AC checks fail
- Use case: Counter-attacks or effects that trigger on failure
- Example: A defensive maneuver that applies a buff when you miss your attack

#### Roll Value Conditions

**Roll Value**

- Activates when the roll total is at or above the threshold value
- Use case: Effects that require a minimum level of performance
- Example: A fireball that deals extra damage if you roll 15 or higher
- Configuration: Set the threshold value (default: 15)

**Roll Under Value**

- Activates when the roll total is below the threshold value
- Use case: Effects that trigger on poor performance or low rolls
- Example: A clumsy attack that causes you to drop your weapon if you roll below 10
- Configuration: Set the threshold value (default: 15)

**Roll Exact Value**

- Activates only when the roll equals the exact threshold value
- Use case: Rare, special effects that trigger on specific results
- Example: A magical effect that only activates when you roll exactly a 20
- Configuration: Set the threshold value (default: 15)
- Note: This is a rare condition and should be used carefully

#### Roll Parity Conditions

**Roll Even**

- Activates when the roll total is an even number
- Use case: Effects based on mathematical properties of the roll
- Example: A blessing that heals you on even-numbered rolls

**Roll Odd**

- Activates when the roll total is an odd number
- Use case: Effects based on mathematical properties of the roll
- Example: A curse that applies on odd-numbered rolls

#### Critical Conditions

**Critical Success**

- Activates on a critical hit (based on die result, not total)
- Use case: Powerful effects that trigger on exceptional success
- Example: A devastating attack that applies a stun effect on a critical hit
- Note: This checks the actual die roll result, not the modified total

**Critical Failure**

- Activates on a critical miss (based on die result, not total)
- Use case: Negative effects that trigger on catastrophic failure
- Example: A spell that backfires and damages the caster on a critical miss
- Note: This checks the actual die roll result, not the modified total

#### Universal Conditions

**Always**

- Always activates the effect regardless of roll result
- Use case: Effects that should apply every time the action card is used
- Example: A battle cry that always applies a morale buff to allies
- Note: Only available in attack chain mode

### Choosing the Right Activation Method

When configuring your action cards, consider these guidelines:

1. **For Standard Attacks**: Use "One Success" for damage and status effects
2. **For Powerful Abilities**: Use "Two Successes" to require exceptional performance
3. **For Conditional Effects**: Use "Roll Value" with an appropriate threshold
4. **For Risk/Reward Mechanics**: Use "Critical Success" or "Critical Failure"
5. **For Guaranteed Effects**: Use "Always" (attack chain mode only)
6. **For Temporary Disabling**: Use "Never" to keep the configuration but disable the effect

### Combining Multiple Conditions

You can configure different activation methods for damage, status effects, and transformations within the same action card. This allows for sophisticated gameplay mechanics:

**Example: A Complex Fire Spell**

- Damage: "One Success" (deals damage on any hit)
- Status Effect (Burn): "Two Successes" (only applies burn on perfect hits)
- Transformation (Fire Form): "Critical Success" (transforms on critical hits)

**Example: A Defensive Counter-Attack**

- Damage: "Zero Successes" (deals damage when you miss)
- Status Effect (Stun): "Roll Value" with threshold 18 (stuns on high rolls even when missing)
- Transformation (Defensive Stance): "Always" (always enters defensive stance)

### Threshold Configuration

For conditions that use a threshold value ("Roll Value", "Roll Under Value", "Roll Exact Value"), you can configure the threshold in the action card settings:

- **Default Threshold**: 15
- **Minimum Threshold**: 1
- **Recommended Thresholds**:
  - Easy conditions: 10-12
  - Moderate conditions: 13-15
  - Hard conditions: 16-18
  - Very hard conditions: 19-20

### Critical Detection

Critical success and failure conditions are based on the actual die roll result, not the modified total. This means:

- A natural 20 on the die triggers "Critical Success" even if modifiers reduce the total below 20
- A natural 1 on the die triggers "Critical Failure" even if modifiers increase the total above 1

This distinction is important for abilities that should trigger based on the raw luck of the roll rather than the final result.

### Mode-Specific Considerations

**Attack Chain Mode**

- All activation methods are available
- Conditions are evaluated based on the embedded item's roll result
- "Always" condition is available for guaranteed effects

**Saved Damage Mode**

- Damage is applied directly without condition evaluation
- Status effects and transformations are not supported in saved damage mode

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
