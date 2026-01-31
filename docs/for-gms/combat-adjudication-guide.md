# Combat Adjudication Guide

Welcome, Game Master. You are the conductor of the battlefield orchestra—the one who brings order to chaos, drama to dice rolls, and life to the clash of steel and spell. This guide is your toolkit for running smooth, engaging combat in the Eventide RP System, where the action economy is tracked manually and every decision matters.

---

## The GM's Role in Combat

In the Eventide RP System, Foundry VTT handles the dice rolling, initiative tracking, and damage calculations—but **you** are the master of the action economy. This is by design. Manual tracking gives you the flexibility to adjudicate unusual actions, reward clever play, and create dramatic moments that automated systems cannot.

Your responsibilities during combat:

- **Track action economy** for all combatants (players and NPCs)
- **Adjudicate challenges** when opponents test each other's skill
- **Manage critical hits and misses** and their action economy consequences
- **Keep combat flowing** with pacing and narrative flair
- **Balance encounter difficulty** through tactical awareness, not just numbers

---

## Tracking the Action Economy

The action economy is the heartbeat of combat. Each combatant has a pool of actions each turn, and how they spend those resources determines the flow and outcome of battle.

### The Standard Action Pool

At the start of each combatant's turn, they gain:

| Action Type | Quantity | Purpose |
|-------------|----------|---------|
| **Full Actions** | 2 | Attacks, combat powers, abilities, complex maneuvers |
| **Move Action** | 1 | Travel 25 feet, reposition tactically |
| **Cleanse Action** | 1 | Remove harmful status effects |
| **Reaction** | 1 | Respond to threats (also start combat with this) |

### Tracking Methods

Choose a tracking system that works for your table:

#### **Visual Tokens (Recommended)**
Use colored beads, tokens, or dice to represent each action type:

- **White beads** – Full Actions
- **Blue beads** – Move Actions
- **Green beads** – Cleanse Actions
- **Red beads** – Reactions

As players spend actions, they return beads to a central pool. This visual system lets everyone see the tactical landscape at a glance.

#### **Digital Tracking**
Use Foundry's token status effects or a dedicated macro to track actions:

- Create custom status icons for each action type
- Apply/remove them as players declare actions
- Use the token HUD for quick reference

#### **Pen and Paper**
Keep a simple spreadsheet or notepad:

```
Turn 1:
Elara: [Full][Full][Move][Cleanse][React]
Grim:  [Full][Full][Move][Cleanse][React]
Varrick: [Full][Full][Move][Cleanse][React]
```

Cross off actions as they're spent. Reset at the start of each turn.

### Tracking Tips

1. **Reset at the start of each turn** – Don't let players carry over unused actions
2. **Ask players to declare their full turn** – "What are you doing this round?" helps you track everything at once
3. **Use consistent language** – "Full Action," "Move Action," etc., so everyone understands
4. **Track NPCs too** – Enemies follow the same action economy rules
5. **Be transparent** – Let players see your tracking so they can plan accordingly

---

## Running Challenges

Challenges are the heart of defensive play—back-and-forth contests where opponents test each other's skill. When someone challenges an attack or effect, you facilitate the dramatic exchange.

### Reaction Challenges

**When they happen:** A character uses their Reaction to respond to an effect AFTER it lands.

**How to run it:**

1. **Player declares Reaction** – "I React to that mind control spell!"
2. **Determine the ability** – Will for mental effects, Physical for physical, etc.
3. **Player rolls** – Against the effect's first hit (if multiple)
4. **If player succeeds:** Opponent rolls their primary ability
5. **Continue back-and-forth** – Until someone fails to beat the previous roll
6. **Resolve the outcome:**
   - **Player wins:** Effect is removed; optionally splash back damage
   - **Opponent wins:** Player's Reaction is consumed; effect remains

**Important:** Challenges consume ONLY the Reaction. The loser does NOT skip their next turn—they can still act normally with their Full Actions, Move, and Cleanse Action.

> **In Practice:** Seraphina is struck by a psychic blast. She declares her Reaction, rolling Will of 5 + d20 = 18. The sorcerer rolls Will of 6 + d20 = 15. Seraphina wins! The charm is negated. The sorcerer could try to top her roll, but chooses not to—Seraphina's will is too strong.

### Prepared Challenges

**When they happen:** A character converts a Full Action into a Prepared Action to respond BEFORE an effect occurs.

**How to run it:**

1. **Player declares Prepared Action** – "I prepare to interrupt that spell!"
2. **Player describes trigger** – "When the sorcerer starts casting, I throw a rock"
3. **When trigger occurs:** Both roll immediately
4. **Player rolls** – Appropriate ability (GM's discretion)
5. **Opponent rolls** – Primary ability of their action
6. **Continue back-and-forth** – Until someone fails to beat the previous roll
7. **Resolve the outcome:**
   - **Player wins:** Prepared action succeeds; opponent's action is interrupted
   - **Opponent wins:** Prepared action is lost; opponent's action proceeds

**Important:** When your Prepared Action triggers, you and the opponent engage in a challenge roll. After this challenge resolves:

- **If you won:** The opponent is interrupted and loses their action. They may now choose to use their Reaction to counter your Prepared Action (this is a NEW challenge).
- **If you lost:** Your Prepared Action is consumed. The opponent continues with their action and may use their action card normally.

> **In Practice:** Elara prepares to interrupt the sorcerer's spell. When the sorcerer begins casting, Elara throws a rock, rolling Physical 4 + d20 = 16. The sorcerer rolls Will 6 + d20 = 19. The sorcerer wins! Elara's rock misses, and the spell completes. Elara loses her Prepared Action. The sorcerer now presses their action card to determine the spell's effects.

> **Opponent Reaction Example:** Kaelen prepares to interrupt an archer's shot. When the trigger occurs, they engage in a challenge roll. Kaelen wins—the archer is interrupted and loses their action. The archer,desperate to avoid defeat, now uses their Reaction to challenge Kaelen's Prepared Action. This is a new, separate challenge. If the archer wins this reaction challenge, their shot proceeds (though they've already spent their Reaction). If Kaelen wins again, the interruption stands—the archer has lost both their action and their Reaction with nothing to show for it.

---

## Managing Critical Hits and Misses

Criticals in the Eventide RP System impact the **action economy**, not the specific action in which they occurred. This creates dramatic swings in momentum and rewards (or punishes) luck.

### Critical Hits

**The Rule:** When you roll a natural 20 (or within your critical threshold), you gain an **immediate bonus Full Action**.

**How to adjudicate:**

- **On player's turn:** "Critical hit! You gain a bonus Full Action right now. What do you do with it?"
- **On enemy's turn:** Pause the enemy's turn. "Critical hit! Take your bonus Full Action before they continue."
- **Track the bonus action:** Add it to the player's current action pool

> **In Practice:** Lira rolls a natural 20 on her first attack. The GM announces, "Critical hit! You gain a bonus Full Action." Lira immediately uses it to strike again, turning a good round into a devastating one.

### Critical Misses

**The Rule:** When you roll a natural 1 (or within your failure threshold), you lose a Full Action.

**How to adjudicate:**

- **First action miss:** "Critical miss! You cannot take your second Full Action this turn."
- **Second action miss:** "Critical miss! You lose one Full Action next turn."
- **While pushing:** "Critical miss while pushing! You lose BOTH your Full Actions next turn."

> **In Practice:** Marcus critically misses on his first attack. His sword clatters against the enemy's shield. The GM rules he loses his second Full Action this turn. What could have been two attacks becomes one—and he must reconsider his strategy.

### Important Notes

- **Criticals ONLY occur on the first roll** of an action chain. Even if an action card displays "Critical Hit" or "Critical Miss" on subsequent hits, do not count these for action economy purposes.
- **"Stolen Crit" or "Saved Miss"** messages indicate that advantage or disadvantage prevented the critical—these do not alter the action economy.
- **Be consistent** – Apply critical rules the same way for players and NPCs.

---

## Handling Prepared Actions

Prepared Actions allow players to convert Full Actions into reactions that trigger BEFORE an effect occurs. This creates tactical depth but requires careful adjudication.

### When Players Declare Prepared Actions

1. **Listen for the trigger** – "If the archer shoots, I'll cast a shield"
2. **Confirm the trigger is valid** – It must be something that could reasonably happen
3. **Note the action type** – What ability will they roll? What happens if they succeed?
4. **Track the Prepared Action** – Mark that they've converted a Full Action

### When Triggers Occur

1. **Pause the action** – Stop the triggering effect mid-execution
2. **Initiate the challenge** – Both sides roll immediately
3. **Resolve the outcome** – See [Prepared Challenges](#prepared-challenges) above
4. **Continue or interrupt** – Based on who won the challenge

### Common Prepared Action Scenarios

| Scenario | Trigger | Roll | Success Outcome |
|----------|---------|------|-----------------|
| Interrupt spellcasting | Enemy begins casting | Physical (throwing) or Will (counterspell) | Spell is interrupted; enemy loses action |
| Block incoming attack | Enemy attacks | Physical (shield) or Acrobatics (dodge) | Attack is negated |
| Protect ally | Ally is targeted | Appropriate defense | Ally is protected; you take the effect instead |
| Set trap | Enemy moves into position | Acrobatics or Wits | Trap triggers; enemy suffers effect |

> **GM Tip:** Prepared actions are powerful but risky. If the trigger never occurs, the player wastes a Full Action. Encourage players to choose triggers that are likely to happen, but remind them that clever, unexpected triggers can create memorable moments.

### Tracking Prepared Actions

Prepared Actions require manual tracking since Foundry doesn't automate them. Use a simple tracking sheet to keep organized:

```
Prepared Actions Tracking Sheet Template:

Character: _________________
┌─────────┬─────────────────────┬─────────────────────┬──────────┐
│ Action # │ Trigger             │ Response            │ Status   │
├─────────┼─────────────────────┼─────────────────────┼──────────┤
│ 1        │                     │                     │ [ ] Ready│
│ 2        │                     │                     │ [ ] Ready│
└─────────┴─────────────────────┴─────────────────────┴──────────┘
Status: [X] Used | [ ] Failed | [ ] Triggered but lost
```

**Tracking Tips:**

1. **Record declarations immediately** – When a player declares a Prepared Action, write it down right away
2. **Note the exact trigger** – "When the mage casts a spell" is different from "When the mage casts fire"
3. **Track the conversion** – Mark which Full Action was converted (first or second)
4. **Update status as events unfold** – When a trigger occurs, mark the Prepared Action as used
5. **Clear between turns** – Prepared Actions last until your next turn, so reset tracking each round

**Visual Tracking Alternative:**

Use colored index cards or sticky notes for each character:
- **Blue card** – Prepared Action #1
- **Green card** – Prepared Action #2
- Write the trigger and response on the card
- When triggered, flip the card over or return it to the player

**Quick Reference for Common Prepared Action Scenarios:**

| Scenario | Trigger | Roll | Success Outcome | Failure Outcome |
|----------|---------|------|-----------------|-----------------|
| Interrupt spellcasting | Enemy begins casting | Physical (throwing) or Will (counterspell) | Spell is interrupted; enemy loses action | Prepared Action lost; spell proceeds |
| Block incoming attack | Enemy attacks | Physical (shield) or Acrobatics (dodge) | Attack is negated | Prepared Action lost; attack proceeds |
| Protect ally | Ally is targeted | Appropriate defense | Ally is protected; you take effect instead | Prepared Action lost; ally remains at risk |
| Set trap | Enemy moves into position | Acrobatics or Wits | Trap triggers; enemy suffers effect | Prepared Action lost; trap doesn't trigger |

---

## Balancing Encounter Difficulty

Without automated action economy tracking, balancing encounters requires tactical awareness rather than just number-crunching.

### Factors That Affect Difficulty

1. **Action economy advantage** – More combatants = more actions per round
2. **Status effect frequency** – More effects = more cleanse actions needed
3. **Challenge frequency** – More challenges = more turn-skipping penalties
4. **Critical luck** – Critical hits/misses can swing momentum dramatically
5. **Player tactics** – Smart play can overcome numerical disadvantages

### Quick Difficulty Assessment

Before combat, ask yourself:

- **How many actions do the enemies have total?** (2 Full + 1 Move + 1 Cleanse + 1 React per enemy)
- **How many actions do the players have total?**
- **What's the ratio?** If enemies have significantly more actions, the encounter will be harder
- **Do enemies have status effects?** These will tax players' Cleanse Actions
- **Are there environmental hazards?** These add complexity and may require additional actions

### Adjusting Difficulty Mid-Combat

If combat is too easy:

- **Have enemies use tactics** – Focus fire, use status effects, prepare actions
- **Introduce reinforcements** – New enemies arrive mid-combat
- **Use the environment** – Trigger hazards, change terrain, create obstacles

If combat is too hard:

- **Have enemies make mistakes** – Miss opportunities, waste actions, fail challenges
- **Reduce enemy effectiveness** – Hold back on status effects, avoid critical hits
- **Provide opportunities** – Environmental advantages, lucky breaks, NPC assistance

> **GM Tip:** The action economy is self-balancing to some extent. As players take damage and suffer status effects, they'll spend more actions on recovery and cleansing, reducing their offensive output. This naturally ramps up difficulty over time. Be aware of this snowball effect and intervene if it becomes overwhelming.

---

## Keeping Combat Flowing Smoothly

Pacing is everything. A well-paced combat feels like a movie scene—tense, dramatic, and engaging. A poorly-paced combat drags on and loses momentum.

### Before Combat Starts

1. **Set the scene** – Describe the environment, lighting, sounds, and smells
2. **Establish stakes** – Why does this combat matter? What's at risk?
3. **Roll initiative** – Use Foundry's automated system
4. **Explain action economy** – Remind players of their action pool if they're new
5. **Ask for tactics** – "What's your plan?" helps players think ahead

### During Combat

1. **Keep turns moving** – Don't let players agonize over decisions
2. **Use a timer** – Give players 30-60 seconds to declare their turn
3. **Narrate actively** – Describe actions with flair, not just numbers
4. **Maintain momentum** – Don't pause for rules debates; make a ruling and move on
5. **Engage inactive players** – Ask them what they're doing, even if it's just watching

### When Combat Slows

1. **Raise the stakes** – Introduce a new threat or complication
2. **Focus on the objective** – Remind players why they're fighting
3. **Speed up enemies** – Have NPCs act more decisively
4. **Skip to the good parts** – If a turn is routine, summarize it quickly
5. **Call for a break** – If everyone's tired, pause and resume later

> **GM Tip:** Combat should feel like a conversation, not a lecture. Ask players questions, respond to their ideas, and build on their creativity. The more engaged they are, the faster combat will flow.

---

## Troubleshooting Common Issues

### Issue: Players Forget Their Actions

**Solution:** Use visual tracking and remind them at the start of each turn. "You have 2 Full Actions, 1 Move, 1 Cleanse, and 1 Reaction. What are you doing?"

### Issue: Combat Takes Too Long

**Solution:** 
- Reduce the number of enemies
- Use minions that die in one hit
- Skip minor enemies' turns or summarize them
- Focus on the main threat

### Issue: Players Overwhelmed by Options

**Solution:** 
- Simplify choices: "Attack, defend, or move?"
- Provide examples: "You could cast a spell, use your sword, or prepare an action"
- Encourage teamwork: "What can you do to help your ally?"

### Issue: Criticals Create Unfair Swings

**Solution:** 
- Remember that criticals go both ways—players benefit too
- If a critical miss is devastating, offer a narrative alternative
- Consider adjusting critical thresholds for more consistent results

### Issue: Challenges Never End

**Solution:** 
- Set a limit: "Three exchanges max, then highest roll wins"
- Encourage players to concede when they're clearly outmatched
- Use narrative to end it: "Your strength fails you—the sorcerer's will is too strong"

### Issue: Players Abuse Action Conversions

**Solution:** 
- Enforce the rules strictly: conversions are one-way
- Remind them of the opportunity cost: "You're giving up an attack for this"
- Use narrative consequences: "Your desperate push leaves you exhausted"

---

## Best Practices for GMs

### 1. Be Consistent

Apply rules the same way for everyone. If players can convert Full Actions into Cleanse Actions, NPCs can too. If critical hits grant bonus actions for players, they do for enemies too. Consistency builds trust and fairness.

### 2. Be Transparent

Let players see your tracking and reasoning. Explain why you're making a ruling. "I'm having you roll against AC 16 because the archer has Acrobatics 5." This helps players understand the system and plan accordingly.

### 3. Be Flexible

The rules are a framework, not a straitjacket. If a player wants to do something unusual, consider it. "You want to swing from the chandelier? Sure, roll Acrobatics with advantage." Creative play should be rewarded.

### 4. Be Fair

Balance challenge and fun. Don't punish players for trying clever things. Don't let enemies cheat. If you make a mistake, admit it and fix it. "Sorry, I forgot that you had a Prepared Action. Let's redo that."

### 5. Be Engaging

Combat is a story, not a math problem. Describe the action vividly. "Your sword catches the light as you swing, striking true!" Make every roll feel meaningful. Celebrate successes and commiserate with failures.

### 6. Be Prepared

Know your enemies' stats before combat starts. Have their ACs and abilities written down. This keeps combat moving and prevents awkward pauses while you look things up.

### 7. Be Patient

Players will forget rules. They'll make mistakes. They'll ask the same questions repeatedly. That's okay. Help them learn and grow. The goal is for everyone to have fun, not for everyone to be perfect.

---

## Sample Combat Turn

Here's how a typical turn might flow at your table:

**GM:** "Elara, you're up. You have 2 Full Actions, 1 Move, 1 Cleanse, and 1 Reaction. What are you doing?"

**Elara:** "I want to cast lightning bolt at the goblin chieftain with my first Full Action. Then I'll move behind cover with my Move Action."

**GM:** "Great. Roll your lightning bolt." *[Elara rolls]* "Natural 20! Critical hit! You gain a bonus Full Action. What do you do with it?"

**Elara:** "I'll cast another lightning bolt at the same target!"

**GM:** "Excellent. Roll again." *[Elara rolls]* "15 plus your Will of 5 is 20. The chieftain's AC is 18, so you hit. Roll damage." *[Elara rolls damage]* "The chieftain takes 30 damage and falls! Now move behind cover."

**Elara:** *[Moves token]* "Done. I still have my Cleanse Action and Reaction available."

**GM:** "Noted. Grim, you're up."

---

## Final Thoughts

Running combat in the Eventide RP System is an art form. You're not just managing numbers—you're crafting a story of heroism, sacrifice, and triumph. The manual action economy gives you the freedom to make that story as dramatic and memorable as you want.

Trust your instincts. Engage your players. Have fun. The rules are there to support you, not constrain you. When in doubt, choose the option that makes the best story.

Now go forth and create legendary battles!

---

## Additional Resources

- [Action Economy](../system-features/action-economy.md) – Detailed rules on actions and conversions
- [Cleanse Actions](../system-features/cleanse-actions.md) – Status removal mechanics
- [Prepared Actions](../system-features/prepared-actions.md) – Converting Full Actions into preemptive interrupts
- [Combat Rules](../erps-ruleset/erps-ruleset-combat.md) – Core combat mechanics and challenge rules
- [Status Effects](../system-features/status-effects.md) – Managing conditions and modifiers
- [Reactions](../erps-ruleset/erps-ruleset-combat.md#reaction-actions) – Responding to threats after effects occur
- [Challenge Rules](../erps-ruleset/erps-ruleset-combat.md#challenge-rules) – Back-and-forth contest mechanics
- [Critical Hits and Misses](../system-features/action-economy.md#critical-hits-and-misses) – Action economy impact of criticals
- [Pushing Rules](../system-features/action-economy.md#pushing-rules) – Desperate all-or-nothing actions
