# New Item Sheet

The goal of this change is to make a modular item sheet that can be used for all item types. We will be following the ApplicationV2 pattern established in our creator-application classes: gear-creator, effect-creator, etc. We will be extending the item sheet the way that the current item-sheet does. In fact, it may be a good starting point to simply change the existing item sheet to match the new requirements.

## Requirements

1. We will be following the ApplicationV2 pattern established in our creator-application classes: gear-creator, effect-creator, etc. We will be extending the item sheet the way that the current item-sheet does. In fact, it may be a good starting point to simply change the existing item sheet to match the new requirements.
2. We will be using the patterns of our items to always assume that they have an active effect on them that has the same name as the item if they should have an active effect.
3. We will be using a checkbox to determine whether the active effect should have a duration or not: effects with durations show up on the token and effects with no duration do not even though both have effects on the player.
4. We will be updating the items on each change rather than requiring a submit. This should work similarly to our present item-sheet and actor-sheet in its implementation.
5. We will be splitting information into activatable sections. Basically if a section is toggled on it will be active and if it is toggled off it will be inactive. If all sections are active (and applicable to an item type) the final product will look similar to the current gear-creator.
6. Rather than using foundry's built-in activeEffect handler we will be using the API to manage active effects and display them in our sheet. Only one effect will be creatable per item, but we will allow the user to turn it off (disable it) if its unneeded for the item.
7. We will allow the user to add character effects to the active effect. They will be added at the press of a button and removable at the press of another.
8. Each effect will have a box to allow it to select from the available attributes and hidden attributes for characters. They will have separate sections and the GM will be the only one who can see, edit, add, or remove the hidden attributes section of any given item sheet.
9. Any number of effects should be addable to any given active effect even if they overlap categories or types.
10. We will allow attribute effects to have the same modes they presently have in our creator applications: add, override, advantage, and disadvantage.
11. Hidden attributes will be the same as hidden attributes in our creator applications: just add or override.

## Clarifications

1. Section Toggles should be all activated when you start to edit an item: the workflow should be that you would disable anything you don't need but we assume you want to see everything to begin with. We will only need to show/hide sections. It is okay to reset to all open each time: I may add in system settings to allow this behavior to be changed per-user in the future. It would be nice if we added that functionality with the implementation though.
2. The active effect should always exist on the item and disabled if it has no character effects currently applied to it. If it has a character effect on it then it should be active and the "apply to token" checkbox should be used to determine if we are setting a duration. Anything that has a duration will automatically show up on the token whereas anything with no defined duration will not show up on the token. The active effects will be a real foundry ActiveEffect but we will manage it via their API and our own UI/UX. I would like to be able to either have its icon match the item's icon or settable at the user's convenience. When apply to token is unchecked lets go ahead and look at how gear presently sets its duration since that's how we keep it from showing an icon but still keep it applied. The UI won't show a duration input: we will simply set it to a very large integer in the background.
3. When the field changes I want it to udpate on the item document. This functionality is already present in item-sheet and should be implemented in precisely that same way.
4. I would like the attribute effects (also called character effects) to be added via a + button and, if needed, removed using a - button beside the effect. Each effect should have the following information:
   - Attribute / Hidden Attribute (select from available attributes)
   - Mode (add, override, advantage, disadvantage)
   - Value
5. The hidden attributes section should be visible to players but not editable. I would like them to be an upper and lower section: basically an "Attributes" and "Hidden Attributes" section. They should have the same UI but not be the exact same add button (if that makes sense).
6. All item types should use the same sheet but with sections shown if they're relivant to the item type and hidden otherwise.
7. I would like to match gear-creator and use scss: if you have any UX improvements you would like to suggest I would be more than happy to add them to the road map if I like them. We do not need to be mobile responsive: foundry is desktop only.
8. RE: selectors. If its possible to include a search functionality that would be nice: but they are not overly large lists. Plus the attributes and hidden attributes are in two different sections which keeps the search functionality from being necessary. The add button for hidden attributes shouldn't show for non-GMs.
9. I only want add and override for hidden attributes as they aren't applicable to advantage and disadvantage. The mode selector should be a dropdown like it is for gear-creator unless you think there is a "something else" that would do it way better.
10. It would be best to have the relavant sections hard-coded as if they're updated we will need updates to the item's schema anyway to make them work that way.
11. Lets go ahead and add a confirmation dialog for removal of effects.
12. There absolutely should be tooltips: they can be implemented after the basic sheet functionality is in place.
13. Any useful logging would be appreciated that you can think of for it.
