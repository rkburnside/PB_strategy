# DIVISIONS.md — Mixed, Men's, and Women's Tactical Rule Sets

Read `CLAUDE.md` first. Division is a scenario-level parameter that modulates the rules engine, execution probability tables, and opponent policy.

## Framing Requirement

Division rules describe **observed tactical patterns at the 4.0-plus level** — what actually happens on court and what opposing teams actually target. They are not claims about individual capability.

Two consequences for implementation:

1. Rule explanations must be worded as tactical observation, not as assertion about a player. "The pattern here targets the player positioned deeper" rather than any framing that generalizes about people.
2. **Scenario state overrides division heuristics.** If the female player is set at the kitchen line and balanced while the male player is in transition, the position-based rules win. Make this precedence explicit in the rule table and enforce it in code.

Encode precedence as rule ordering: position and height rules evaluate at higher priority than division heuristics, and division rules apply a multiplier to an already position-derived score rather than overriding it.

---

## Schema

```
division: "mens" | "womens" | "mixed"
```

When `division` is `"mixed"`, each player requires a `gender` field of `"M"` or `"F"`. Default mixed configuration: user and partner one of each, opponents one of each.

Rules carry `appliesToDivisions: string[]`. Base rules list all three. Division-specific rules list only their own.

---

## Comparative Overview

| Dimension | Men's | Women's | Mixed |
|---|---|---|---|
| Pace tolerance | Highest — speed-ups counter-attacked routinely | Lower — dink patterns extended, more resets | Asymmetric between the two players |
| Rally length | Shorter, more hands battles | Longer, more patience and construction | Varies by which pair is engaged |
| Middle coverage | Contested, either may take it | More defined by prior agreement | Male player typically covers more middle |
| Targeting logic | Attack weaker hands or worse position | Attack position and patience gaps | Target selection is the central problem |
| Poaching | Situational | Situational | Male player poaches aggressively; partner defends the vacated lane |
| Stacking frequency | Moderate | Moderate | High — near-universal at 4.0+ |
| Serve and return placement | Depth-driven | Depth-driven | Often designed to isolate one opponent |
| Speed-up frequency | High | Moderate | High but directionally selective |
| Lob usage | Low | Moderate | Moderate — used against an aggressive poacher |

---

## Men's

Base case for the engine. Most default rule weights are calibrated here.

### Rule adjustments
- Counter probability on speed-ups is high; the engine should weight the "what happens next" risk factor accordingly
- Hands battles at the kitchen resolve faster; time-available calculations tighten
- Reset difficulty against pace is higher, since incoming pace is higher
- Middle-seam targeting follows the standard handedness configuration logic with no division modifier

### Opponent policy
- Higher probability of selecting an attacking option when the ball is above net height
- Lower probability of resetting when a counter is available

---

## Women's

### Rule adjustments
- Dink patterns extend; patience has higher value, so the risk penalty on premature speed-ups increases
- Reset quality is higher on average; the engine should lower the expected reward for attacking a ball that can be reset
- Rally length expectation increases, which raises the value of construction over immediate attack
- Attacking a position gap outperforms attacking pace

### Opponent policy
- Higher probability of resetting rather than countering
- Higher probability of extending a dink exchange rather than forcing
- Lower probability of an unforced error in extended exchanges

---

## Mixed

Mixed is not a modifier on the base case. It requires its own rule set, because targeting has an explicit dimension that does not exist in the other two.

### Mixed-specific rules

These exist only when `division === "mixed"`:

- **Isolation targeting.** The dominant pattern at 4.0+ is directing shots to isolate one opponent. The engine should raise the score of targets that keep the ball away from the more aggressive court position and toward the more contained one — always resolved through actual position and handedness, not gender alone.
- **Outside shoulder and feet.** From the male player's position, attacks toward the female opponent's outside shoulder and feet score higher, **unless** she is set at the kitchen line and balanced, in which case the standard position rules apply unchanged.
- **Middle re-weighting.** The male player takes the middle more often. The base middle-gap rule must be re-weighted downward in mixed, since middle balls are more likely to be covered. This interacts with the handedness configuration multiplier — both apply.
- **Poach lane.** Male-player poach frequency is high enough to change the correct cross-court dink angle. The engine should penalize cross-court dinks that pass through a live poach lane and reward angles that stay outside it.
- **Counter pattern on speed-ups.** Speeding up at the female player invites a specific counter pattern that the base engine does not model. Add it as an explicit "likely opponent response" for that shot class in mixed.
- **Drop tolerance.** Third-shot drops face harsher punishment when they float, since the poaching player is positioned to attack them. The risk penalty on drop height error increases in mixed.

### Interaction with handedness

Mixed is where handedness matters most, because stacking is near-universal at 4.0+ and stacking exists specifically to control which hand covers the middle.

An opposite-handed mixed pair produces a genuinely different tactical problem from a same-handed one. The forehands-middle configuration combined with mixed middle coverage compounds — the middle becomes substantially worse as a target than either factor alone would suggest.

The engine must apply both the handedness configuration multiplier and the mixed middle re-weighting. Verify they compose rather than one overriding the other.

### Stacking

If the engine models stacking, handedness is the reason it exists. In mixed:
- Stacking is the default assumption at 4.0+, not the exception
- Stack side determines which opponent covers the middle
- The engine should support a stacking indicator in the scenario, or infer it from the position configuration
- Scenario templates for mixed should include stacked formations at a realistic rate

---

## Effect on Other Systems

### Execution probability (`docs/RALLY.md`)
Division shifts the clean/degraded/error tables. Not uniformly — the shift is per shot type. Reset rates differ more than dink rates.

### Opponent policy (`docs/RALLY.md`)
Division changes both selection concentration and the shape of the candidate distribution. In mixed, the two opponents need **separate policies**, since their tactical roles differ.

### Heat map (`docs/HEATMAP.md`)
Division enters the precomputed context as a set of numeric multipliers, resolved once per input change. It must never appear as a branch in the per-sample hot path.

Switching division with the scenario held fixed should visibly redistribute the map. If it does not, division rules are not wired in deeply enough. This is the division equivalent of the handedness self-test.

### Scenario templates (`docs/RALLY.md`)
Some stage templates are division-specific. Mixed stacking scenarios have no direct men's or women's equivalent. Templates carry `applicableDivisions`.

### Match strategy (`docs/STRATEGY.md`)
Division changes almost everything at the strategic level and is arguably the primary input to that mode.

---

## UI

- Division selector in the scenario controls, alongside skill level
- When mixed is selected, gender assignment controls appear on each player marker — the same interaction pattern as the handedness R/L toggle
- Division should persist across scenarios within a session, since users typically train for one division at a time
- Compare view (`docs/MODES.md`) should support flipping division with the scenario held fixed

---

## Validation

- Division switch with scenario fixed produces a visible heat map change
- Mixed middle targeting scores lower than men's for an identical configuration
- Mixed plus forehands-middle scores the middle worse than either factor alone
- Position override works: a female player set at the kitchen line and balanced is not treated as a preferred target
- Women's mode shows a higher risk penalty on premature speed-ups than men's
