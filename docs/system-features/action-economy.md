# Action Economy

The action economy is the heartbeat of combat in the Eventide RP System—a rich tapestry of tactical choices that defines how characters move, strike, react, and recover on the battlefield. While Foundry automates dice rolling and initiative, the action economy is tracked manually by the Game Master, giving you complete control over the flow and drama of every encounter.

---

## The Turn Structure

Each turn in combat is a carefully balanced set of resources: you must choose how to spend them wisely, for unused actions are lost when your turn ends.

### Your Action Pool

At the beginning of each of your turns in combat, you gain the following actions:

- **2 Full Actions** – Your primary resource for attacks, abilities, and decisive maneuvers
- **1 Move Action** – Travel across the battlefield and position yourself tactically
- **1 Cleanse Action** – Shake off harmful effects and maintain your combat effectiveness
- **1 Reaction** – Respond to threats when they arise (you also start each combat with this)

> **Game Master's Guide:** Track each character's available actions at the start of their turn. A typical turn grants 2 Full Actions, 1 Move Action, 1 Cleanse Action, and 1 Reaction. Encourage players to think tactically about how they spend these resources—unused actions are lost, so remind them to convert leftovers into recovery or decisive strikes. The choices they make with these actions will define the flow and drama of your combat scenes.

---

## Full Actions

**The Rule:** Full Actions are your most powerful resource. Each Full Action can be used to execute nearly any action card you have on your character—whether it's a sword strike, a combat power, a psychic assault, or a grappling maneuver.

**What They Do:**

- Activate action cards for attacks, combat powers, and abilities
- Execute complex maneuvers that require your full attention
- Be converted into other types of actions for tactical flexibility

**Conversion Options:**
You may convert any number of Full Actions into:

- **Move Actions** – When you need extra mobility on the battlefield
- **Cleanse Actions** – When multiple debuffs plague you (see [Cleanse Actions](./cleanse-actions.md) for details)
- **Prepared Actions** – To set up reactions before they're needed (see [Prepared Actions](./prepared-actions.md) for complete rules)

**In Practice:**
> **Elara's Turn:** Elara has two Full Actions and notices the enemy archer preparing a shot. She uses her first Full Action to fire a bolt of lightning (combat power), then converts her second Full Action into a **Prepared Action**. "If that archer shoots," she declares, "I'm casting a shield to block it." Now she can interrupt the attack before it lands.

**Under the Hood (Technical Note):**
Full Actions represent the core action economy. The system doesn't track them automatically—this is intentional, giving GMs flexibility to adjudicate unusual actions. Exceptionally powerful abilities (like ultimate moves) may consume more than one Full Action at the GM's discretion, creating dramatic moments where a character sacrifices everything for one decisive strike.

---

## Move Actions

**The Rule:** A Move Action allows you to travel 25 feet in any direction across the battlefield. If you're traversing difficult terrain (rocky ground, thick undergrowth, deep snow), your speed is halved to 12.5 feet.

**What It Does:**

- Reposition yourself tactically
- Close the distance to enemies
- Withdraw to safety or reach allies in need
- Move a grappled opponent (with appropriate rolls to maintain the grapple)

**In Practice:**
> **Grim's Tactical Advance:** Grim sees his ally cornered by goblins. With his Move Action, he dashes 25 feet across the battlefield, placing himself between the goblins and his fallen companion. The terrain is uneven, so his movement takes careful planning—he knows he might need his Full Actions to finish the goblins quickly.

**Under the Hood (Technical Note):**
When moving a grappled opponent, you can drag them up to half your Move Action distance (12.5 feet) with you. However, you must roll to maintain the grapple based on its type—Physical for strength-based grapples, Acrobatics for mobility-based ones, or Will for psychic influences. When you end your move, the opponent is placed in the square that makes narrative sense (typically ahead or behind you in your path). You may place them in state-based hazards, but they can use their Reaction to attempt breaking free and moving up to half their speed away.

---

## Cleanse Actions

**The Rule:** Cleanse Actions are your defense against harmful effects. Each turn, you gain one free Cleanse Action. If you need more, you may convert Full Actions into additional Cleanse Actions. To cleanse an effect, roll an appropriate ability against the Armor Class (AC) of the character or creature that created the effect.

**What It Does:**

- Remove status effects and debilitating conditions
- End ongoing magical or technological effects
- Shake off wounds that impair your abilities

**How It Works:**

1. Choose an ability appropriate to resisting the effect (Physical for arrows, Will for mental assaults, Acrobatics for maneuver-based effects)
2. Roll against the effect creator's AC (Ability + 11, plus any bonuses)
3. If you succeed: the effect is removed
4. If you fail: the effect lingers, and you've spent your Cleanse Action

**In Practice:**
> **Varrick's Desperate Recovery:** Varrick has an arrow lodged in his leg from a skilled elven archer. The arrow has been poisoning him, reducing his combat effectiveness. On his turn, he uses his Cleanse Action, rolling Physical against the archer's AC (which is based on the archer's Acrobatics). He succeeds—the arrow is dislodged, and the poison ceases to afflict him. Now he can use his Full Actions without the penalty.
>
> **Game Master's Guide:** When a character uses a Cleanse action to remove a harmful effect, guide the roll appropriately. They'll roll against the AC of the effect's creator—use the stat tied to that character (Physical for an archer's arrow, Will for a mental assault, etc.). If they succeed, remove the status and celebrate their recovery. If they fail, the effect lingers and the battle continues against them. Cleanse actions represent the struggle to shake off wounds and ailments—make each attempt feel significant.

**Under the Hood (Technical Note):**
Cleanse actions are not challenge rolls—you roll against a static AC, not against an opponent's actual roll. This design choice was intentional to reduce luck's impact on recovery; effects are meant to slightly linger and wear characters down over time, so removing them requires deliberate effort. Some GMs prefer making cleanse actions into challenge rolls (both sides rolling) for more dramatic back-and-forth contests—that's a valid variation if you prefer higher variance.

---

## Reaction Actions

**The Rule:** Reactions allow you to respond to threats, but they happen **AFTER** the effect they're reacting to. You begin each combat with one Reaction, and you regain one at the start of each turn. Reactions are a powerful defensive tool, but timing is everything—you can't prevent the initial strike, only mitigate or counter its effects.

**What It Does:**

- Respond to attacks after they land
- Attempt to splash effects back at attackers
- Save yourself from falling into pits or other hazards
- Interrupt dangerous situations (though damage will already have occurred)

**How It Works:**

1. When a threat affects you, declare your Reaction
2. Roll an appropriate ability against the effect
3. If you succeed: remove the effect and optionally splash it back at the attacker
4. If you fail: your Reaction is consumed, and you suffer the full effect

**In Practice:**
> **Seraphina's Narrow Escape:** Seraphina is struck by a psychic blast that would normally charm her. She uses her Reaction to resist, rolling Will against the attacker's effect. She succeeds—the charm dissipates immediately, and she can use her next turn normally. If she had failed, she would have been charmed and potentially forced to act against her allies on the attacker's next turn.
>
> **Knocking Back a Hazard:** When a molotov cocktail explodes at Seraphina's feet, she Reacts to kick the flames away. She still takes damage from the initial explosion, but if her Reaction succeeds, the burning status effect is negated. The flames still consume the square she's standing in, but she's able to move half her speed as part of the Reaction to escape the area.

**Under the Hood (Technical Note):**
Reactions happen after their triggering effect to streamline combat flow. This design choice prevents constant interruption and keeps battles moving. When you use a Reaction, you're essentially challenging the effect (see [Challenge Rules](../erps-ruleset/erps-ruleset-combat.md#challenge-rules) for full details on how back-and-forth rolling works). You continue rolling back and forth with the opponent until one of you fails to beat the previous roll—creating moments of dramatic tension as skill clashes against skill.

---

## Recovery Actions

**The Rule:** Any action EXCEPT a Cleanse Action can be converted into recovery. By spending a Full Action, Move Action, or Reaction, you can restore 20 HP or 1 Power. This recovery cannot exceed your maximum HP or Power.

**What It Does:**

- Restore lost HP during combat to stay in the fight
- Replenish Power for combat powers and abilities
- Convert unused actions into meaningful recovery before they're lost

**In Practice:**
> **Kael's Calculated Retreat:** Kael has used both his Full Actions but hasn't used his Move or Reaction. He knows the next round will be brutal. Rather than letting those actions go to waste, he declares, "I convert my Move Action into recovery—restoring 20 HP." He does the same with his Reaction. Now he enters the next round healthier and ready for the challenge.

**Under the Hood (Technical Note):**
Recovery is a tactical decision point. The system rewards players who manage their action economy wisely—if you have actions left at the end of your turn, you should strongly consider using them for recovery. This keeps combat moving and prevents wasted resources. Some GMs may allow recovery from Cleanse Actions as well, but the default rules prohibit this to make the choice between removing effects and recovering health a meaningful tactical decision.

---

## Critical Hits and Misses

**The Rule:** Criticals impact the action economy, not the specific action in which they occurred. Critical hits grant bonus actions, while critical misses cost you actions—raising the stakes of every roll.

### Critical Hits

When you roll a natural 20 (or within your critical threshold), you gain an **immediate bonus Full Action**:

- **On Your Turn:** Use it right away as a third Full Action
- **On an Enemy's Turn:** Their turn pauses, and you take your bonus Full Action before they continue

### Critical Misses

When you roll a natural 1 (or within your failure threshold), you lose a Full Action:

- **First Action Miss:** You cannot take your second Full Action this turn
- **Second Action Miss:** You lose one Full Action next turn
- **While Pushing:** You lose BOTH your next turn's Full Actions (devastating!)

**In Practice:**
> **Lira's Critical Triumph:** Lira rolls a natural 20 on her first attack of the turn. The GM announces, "Critical hit!" and grants her a bonus Full Action. She immediately uses it to strike again, turning a good round into a devastating one.
>
> **Marcus's Costly Mistake:** Marcus critically misses on his first attack. His sword clatters against the enemy's shield, and the GM rules he loses his second Full Action this turn. What could have been two attacks becomes one—and he must reconsider his strategy.
>
> **Game Master's Guide:** When the dice land on a critical, Foundry flags it—but you decide what it means. Critical hits can grant bonus actions, allowing characters to seize the moment and turn the tide. Critical misses can cost actions, creating setbacks that heighten tension. You choose how these impact the action economy: grant extra turns on hits, deduct actions on misses, or keep things purely narrative. Whatever you decide, make it consistent and make it memorable. Criticals should feel special—whether through mechanical advantage or dramatic storytelling.

**Under the Hood (Technical Note):**
Criticals can ONLY occur on the first roll of an action chain. Even if an action card displays "Critical Hit" or "Critical Miss" on subsequent hits, do not count these for action economy purposes. This rule balances multi-hit moves, which are already powerful without additional critical rewards. Additionally, status messages like "Stolen Crit" or "Saved Miss" indicate that advantage or disadvantage prevented the critical—these do not alter the action economy.

---

## Pushing Rules

**The Rule:** A Push is a desperate gamble—converting your Move, Reaction, and Cleanse Actions into one additional Full Action for this turn. You sacrifice all mobility and defensive capabilities for one devastating strike. If you critically miss while pushing, the penalty is severe: you lose BOTH your Full Actions next turn.

**What It Does:**

- Gain an additional Full Action beyond your normal two
- Sacrifice your ability to move, react, or cleanse this turn
- Create all-or-nothing moments of dramatic tension

**In Practice:**
> **Varrick's Desperate Push:** Varrick sees the boss creature near death. He knows a regular attack won't finish it. He declares a Push, converting his Move, Reaction, and Cleanse Actions into a bonus Full Action. He now has three Full Actions this turn: two normal plus one from pushing. He unleashes all three in rapid succession—and succeeds! The creature falls, and Varrick's gamble pays off. Had he missed, his next turn would have been completely actionless.
>
> **Game Master's Guide:** A Push represents a character's desperate gamble to finish a foe—converting Move, Reaction, and Cleanse actions into one final, devastating Full Action. Track this sacrifice carefully: they cannot move, react, or cleanse during that turn. And the risk is real—if they critically miss while pushing, they lose both their Full Actions next turn! These all-or-nothing moments create the most dramatic combat scenes. When a player declares a Push, pause to acknowledge the stakes. When it pays off, celebrate their triumph. When it fails, make the consequences meaningful.

**Under the Hood (Technical Note):**
Pushing is intentionally designed to be high-risk, high-reward. The system rewards bold play but punishes failure harshly to maintain balance. When pushing, you cannot have already used a Cleanse Action this turn, you cannot move (except as part of a Full Action that includes movement), and you lose your ability to React for the remainder of the turn. This leaves you vulnerable, making the push a calculated risk rather than a default tactic.

---

## Action Tracking

**The Rule:** The Eventide RP System does NOT automatically track your action economy in Foundry. This is intentional—the Game Master maintains full control over action economy adjudication, allowing for flexibility and narrative rulings.

**What This Means for You:**

- **Game Masters:** Track each character's available actions using tokens, counters, or a dedicated tracking sheet. Foundry will flag critical hits and misses, but you decide the action economy consequences.
- **Players:** Keep track of your actions and communicate them clearly to your GM. Use your full action economy strategically, and convert unused actions into recovery before your turn ends.

**In Practice:**
> **GM Sarah's Tracking Method:** Sarah uses colored glass beads to track each character's actions. White beads for Full Actions, blue for Move Actions, green for Cleanse Actions, red for Reactions. As players spend actions, they return beads to a central pool. This visual system helps everyone see the tactical landscape at a glance.
>
> **Player Kael's Turn:** Kael's turn begins. He gathers his action pool (2 Full, 1 Move, 1 Cleanse, 1 Reaction). He declares, "I'm using my first Full Action to attack, my Move Action to get into position, and converting my second Full Action into recovery for 20 HP." Sarah tracks this on her action beads. Kael still has his Cleanse Action and Reaction available for threats that might arise.

---

## The Philosophy of Action Economy

The action economy in the Eventide RP System is designed to create meaningful tactical choices without overwhelming complexity. Every action you take is a decision—you choose between offense, defense, mobility, and recovery. The system rewards smart play and punishes carelessness, but always leaves room for dramatic moments and heroic reversals.

Remember: unused actions are lost at the end of your turn. Convert leftovers into recovery. Push when the stakes are highest. React when danger looms. Cleanse when effects weigh you down. Move to position yourself for victory.

Your actions are your most precious resource in combat. Spend them wisely.
