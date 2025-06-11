# Action Cards

Action cards are an incredibly powerful new automation item type that can be used to create complex and dynamic actions.

## Creating an Action Card

Creating an action card is done through either the item creation menu in foundry or through the action card creation menu in the actor sheet.

Simply select the item type "Action Card" in the item creation menu or the "Action Card" button in the actor sheet. Then you'll need to set up the card by going through a few options. The image in the header will be the image that is displayed on any damage that gets dealt as part of the action card as well as its icon on your character sheet. The text and background colors will be used to theme damage cards off these actions. The description tab's contents will be used to apply description to the damage cards from these actions.

In the attributes tab we'll be setting up several options. Lets go over the two main card types.

### Saved Damage

The saved damage card type is a very simple one. It allows you to set up the information for a damage card that will be dealt when you execute the action card with a target selected. You can set the damage type (healing or damage), the damage amount, and the damage formula. Notably this card type doesn't actually interact with its embedded items in any way: so you can't add status effects or gear to it that will be applied to the target or anything like that. If you need that functionality pleasee look at the Attack Chain card type.

### Attack Chain

The action chain type is much more complex than just saved damage. It requires you to put either a gear, feature, or combat power in its action slot. It allows you to add effects to it as well that can be applied based on the results of the action. Effects can be gear or status items, and will be applied based on the setting in the attributes tab.

One thing to note: action chains with a 'none' roll type will be treated as an automatic two successes. If that's undesired you can add a roll or flat type action to the action chain and it will be treated as a normal action comparing against the target's AC.




## How to use

Using an action card is as simple as dragging an item onto an actor's action card section.



### Using an Action Card

### Action Card Attributes

### Action Card Effects
