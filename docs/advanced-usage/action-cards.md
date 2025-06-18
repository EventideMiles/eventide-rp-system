# Action Cards

Action cards are an incredibly powerful new automation item type that can be used to create complex and dynamic actions. They allow you to decide what kind of attack you're going to use, how much damage you're going to deal, to apply images to damage that gets dealt, and to apply statuses and gear to the target.

## Creating an Action Card

Creating an action card is done through either the item creation menu in foundry or through the action card creation menu in the actor sheet.

Simply select the item type "Action Card" in the item creation menu or the "Action Card" button in the actor sheet. Then you'll need to set up the card by going through a few options. The image in the header will be the image that is displayed on any damage that gets dealt as part of the action card as well as its icon on your character sheet. The text and background colors will be used to theme damage cards off these actions. The description tab's contents will be used to apply description to the damage cards from these actions.

In the attributes tab we'll be setting up several options. Lets go over the two main card types.

### Saved Damage

The saved damage card type is a very simple one. It allows you to set up the information for a damage card that will be dealt when you execute the action card with a target selected. You can set the damage type (healing or damage), the damage amount, and the damage formula. Notably this card type doesn't actually interact with its embedded items in any way: so you can't add status effects or gear to it that will be applied to the target or anything like that. If you need that functionality pleasee look at the Attack Chain card type.

### Attack Chain

The action chain type is much more complex than just saved damage. It requires you to put either a gear, feature, or combat power in its action slot. It allows you to add effects to it as well that can be applied based on the results of the action. Effects can be gear or status items, and will be applied based on the setting in the attributes tab.

**One thing to note:** action chains with a 'none' roll type will be treated as an automatic two successes. If that's undesired you can add a roll or flat type action to the action chain and it will be treated as a normal action comparing against the target's AC.

Attack chains allow you to set the following parameters:

- Whether to advance the initative after the action card is used.
- Whether to attempt inventory reduction for and gear effects applied to the target.
- The first and second stats you'll be comparing against on the target.
- The condition to apply damage, its roll formula, and the type (healing or damage).
- The condition to apply statuses and, optionally, the roll value above which to apply them.

They also have the "Embedded Items" tab that is used to configure the combat powers / gear that is used for the attack part of the chain and the statuses / gear that will be applied to the target if the rules for applying them are met.

**Important:** for combat powers the cost kept on the internal card will be the one applied to the user. So, if you change the power its best to reapply it to the action card. The same applies to gear but with one major caveat. The gear's cost will be applied against the same named gear item in your inventory and requires that you have the same gear equipped. So if you change the gear's cost the best way to keep it in-sync is to reapply it to the action card.

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
