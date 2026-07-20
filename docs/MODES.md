# MODES.md — Single-Shot and Analysis Modes

Read `CLAUDE.md` first. These modes share the scenario schema, court model, and `evaluateTarget` engine defined there. Each mode is a presentation layer over the same ranked candidate list plus heat map surface.

Architecturally: the rules engine returns a ranked candidate list and a scoring surface. Every mode is a **pure presentation layer** consuming those outputs. Adding a mode should cost an afternoon, not a refactor.

State: `mode` variable in the top-level component, mode switcher in the header.

---

## Mode 1: Live Analysis (Sandbox)

Everything manipulable, heat map redraws continuously, no commit step and no withheld answer. Pure exploration.

**This should be the default landing mode.** It requires no commitment, explains itself through manipulation, demonstrates the engine immediately, and is the best development diagnostic.

### Controls

Draggable on court:
- All four player markers, each with a tappable R/L handedness indicator
- Ball position

Continuous sliders:
- **Height at contact** — continuous, not the three-way toggle used in other modes. Roughly 12 in through overhead. Net tape marked on the slider as the critical threshold, since crossing it flips the engine from defensive to offensive.
- **Incoming speed** — affects time available and execution difficulty
- **Balance** — balanced through stretched
- **Output speed** — the pace of the user's shot. Separate from incoming speed. The heat map is a function of it.

Two speed sliders is the correct design: one describes what is happening to you, one describes what you are considering doing.

Selectors: bounce state, division, skill level.

### Output

- Heat map redrawing on every input change, no analyze button
- Peak marker at the optimal target
- Opportunity and risk layers toggleable
- Tap any location for numeric score and per-factor breakdown
- Ranked discrete shots alongside, updating live, sourced from static rule explanations so they stay instant

The intended experience is dragging the height slider slowly and watching the map invert as the ball crosses net height. That single interaction teaches more than a paragraph of explanation.

### Compare view

Hold the scenario fixed, flip one variable — handedness, division, speed band — and show before/after maps with the delta highlighted. Same teaching mechanism as the slider: manipulate one variable, observe the consequence.

### Performance

See `docs/HEATMAP.md` for the full live-recompute architecture. Summary: precompute split, adaptive grid resolution during drag, canvas raster layer, `requestAnimationFrame` throttling, contours computed only on settle.

---

## Mode 2: Recommender

User builds a static scenario, presses analyze, receives a ranked shot list.

### Flow
1. Arrange scenario, or select a preset formation
2. Set incoming shot type, height, bounce, balance
3. Analyze
4. Ranked cards render immediately from the rules layer; AI rationale fills in after

### Output per card
- Shot name
- Risk badge — color plus text label
- Rationale
- Tradeoff
- Failure mode: what happens when this shot is executed poorly
- Likely opponent response
- Tap to highlight the shot path on the court

### Notes
Build this first. It exercises the full engine end to end and exposes weakness fastest. It is a **reference tool** rather than a training tool — users learn less from it than from modes requiring commitment, but it is the natural development target.

Heat map overlay optional here, off by default.

---

## Mode 3: Grader

User builds a scenario, **commits to a shot first**, then sees the ranking and how their choice placed.

### Flow
1. Arrange scenario
2. Pick a shot and a target location on the court
3. Commit
4. Reveal: full ranking, user's choice highlighted in position, delta from optimal
5. Heat map revealed with the user's target marked

### Why it matters
Nearly free to build — the ranking already exists, it is only revealed later. Delivers the highest training value per unit of work in the single-shot family, because commitment before feedback is what produces learning.

It also tolerates expert disagreement better than the recommender, since it presents tradeoffs after the fact rather than asserting one answer up front.

**Consider making this the default training mode** rather than the recommender.

### Additions
- Show the distance between the user's target and the nearest peak
- Name the specific rule the user's choice violated, if any
- Track within-session accuracy

---

## Mode 4: Quiz

App generates a scenario, user picks, app scores and tracks a streak. Grader plus a randomizer plus score state.

### The hidden dependency

The scenario randomizer is the substantial work here, not the UI. Uniform random placement produces nonsensical situations that never occur in a real game. Required instead:

- A library of realistic formation templates
- Per-template jitter specification with plausible ranges per player
- Realistic distribution of incoming shot types per template
- Left-handed players appearing at a realistic rate
- Division-appropriate formations

This is the main reason quiz mode costs more than grader mode.

### Flow
1. Generate scenario from a weighted template
2. Present with a short time limit — optional but valuable, since real shot selection is time-pressured
3. User picks shot type and target
4. Score, reveal, advance
5. Running accuracy and streak

### Notes
Best mobile mode — fast loop, one tap, viable in five-minute sessions. Streak is lost on refresh in Tier 1; acceptable.

Time pressure is worth implementing. It trains the actual perceptual task rather than deliberate analysis.

---

## Mode 5: Drill Card

Scenario in, structured practice drill out. Same input, different output prompt.

### Flow
1. User builds a scenario, or selects a weakness area
2. Generate
3. Receive a runnable drill: setup, feed pattern, rep count, success criteria, progression

### Notes
The only mode where the AI layer is **core rather than enhancement** — the drill text is the product. Cannot ship in Tier 1.

Highest transfer value of any mode if drills are actually executed, but that depends on user behavior outside the app.

Best courtside usability of any mode, since it is designed to be read on court and then run.

---

## Mode Comparison

| | Live Analysis | Recommender | Grader | Quiz | Drill Card |
|---|---|---|---|---|---|
| Entry | User builds | User builds | User builds | App generates | User builds or selects |
| Commits first | N/A | No | Yes | Yes | N/A |
| Output | Live heat map | Ranked shots | Pick scored vs. ranking | Score and streak | Practice drill |
| Training value | Medium — exploratory | Low | High | High | Highest, conditional |
| Engine reuse | Full | Baseline | 100% | 100% | 100% input |
| Additional cost | Medium — perf work | Baseline | Low | Low-medium | Medium |
| New components | Live recompute, sliders | — | Shot picker, reveal | Randomizer, score state | New prompt, formatter |
| Tolerates disagreement | Well — shows surface | Poorly | Well | Moderately | Well |
| Mobile | Good — perf-limited | Good | Good | Excellent | Good |
| Courtside | Moderate | Moderate | Low | Low | High |
| API dependency | None | Rationale only | Rationale only | Rationale only | Core |
| If engine is weak | Immediately visible | Obvious, undermining | Obvious, softened | Erodes trust | Hidden |

---

## Build Order Within Modes

1. **Live Analysis** — forces the engine to be correct across the whole surface, not just at a few sampled points. Makes bugs visible.
2. **Recommender** — thin layer once the surface exists
3. **Grader** — reveal-after-commit wrapper
4. **Quiz** — requires the scenario template library
5. **Drill Card** — requires the API proxy (Tier 2)

Rally simulation (`docs/RALLY.md`) and match strategy (`docs/STRATEGY.md`) are separate products sharing this foundation, sequenced after the single-shot engine is validated.
