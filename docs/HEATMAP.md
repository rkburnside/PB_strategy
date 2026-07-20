# HEATMAP.md — Continuous Target Quality Surface

Read `CLAUDE.md` first. The heat map is the visual expression of `evaluateTarget` sampled across the opponent's half of the court.

## Core Concept

The rules engine does not produce a list of discrete shots that happens to have a map attached. It produces a **continuous quality surface** over the target space, and discrete shot candidates are sampled peaks of that surface.

This ordering matters. It guarantees the map and the ranked list can never disagree, and it forces the engine to be correct everywhere rather than at a handful of hand-chosen points.

## Function Signature

```
evaluateTarget(precomputedContext, targetX, targetY, shotType, speed) => score   // 0-100
```

Hot path. Allocation-free. Pure. All scenario-dependent but target-independent work lives in `precomputedContext`.

## Speed Dependence

Speed is the variable that makes the map instructive rather than decorative. The same location can be excellent at one speed and terrible at another.

| Target | Slow | Fast |
|---|---|---|
| Opponent's feet in transition | Excellent | Countered speed-up |
| Cross-court deep | Safe | Floater, attackable |
| Middle seam | Mediocre | Strong — beats the communication window |
| Down the line | Low percentage | Viable — beats the reaction window |

The heat map is therefore a **function of output speed**, and speed must be a slider. Dragging it and watching the map redistribute is the most direct way to teach that pace and placement are a joint decision, not two independent ones.

### Speed bands

Five bands. Enough resolution to be meaningful, few enough to stay readable on a mobile slider.

| Band | Label | Character |
|---|---|---|
| 0 | Touch | Dead dink, minimal pace, maximum control |
| 1 | Soft | Standard dink, drop, reset |
| 2 | Medium | Roll, controlled attack |
| 3 | Firm | Speed-up, punch volley |
| 4 | Full | Drive, put-away |

Internally the slider is continuous 0–1 and bands are interpolated, so the map transitions smoothly rather than snapping.

## Scoring Composition

Each target-and-speed combination scores against these factors. Each maps to one or more rules in the declarative rule table.

### Opportunity factors
- Distance from each opponent — reachability
- Whether the ball lands at an opponent's feet given their depth category
- Whether it exploits the middle seam, a sideline gap, or the cross-court gap
- Whether the receiving opponent contacts it above or below net height
- Time available to the opponent — a function of distance and speed
- Whether it targets a backhand, resolved via handedness
- Whether it lands in the body-jam zone on the dominant-hand hip
- Whether the target exploits a handedness configuration weakness

### Risk factors
- Net clearance required from the user's position, which sets error probability
- Proximity to lines — out-error probability
- Execution difficulty from the user's position, balance, and handedness
- What the likely counter is and where it leaves the user's team
- Partner exposure created by the shot
- Whether the shot pulls the user out of position

### Modifiers
- Division-specific targeting weights (see `docs/DIVISIONS.md`)
- Skill level of opponents — affects reachability and counter probability
- Handedness configuration multiplier on the middle-seam weight

## Opportunity vs. Risk Layers

Some factors are upside and some are downside. The map should be able to display either.

- **Netted quality map** — single surface, opportunity minus risk. Simpler, default view.
- **Two-layer view** — opportunity and risk rendered separately with a toggle or side-by-side.

The two-layer version is more instructive, because a target can be both high-reward and high-risk and a single netted number hides that. Advanced players benefit from seeing the tradeoff explicitly.

Rules carry a `category` field of `opportunity`, `risk`, or `execution` to support this split.

## Rendering

### Sampling

Grid sample over the opponent's half: `x` from 0 to 20, `y` from 0 to 22. At one-foot resolution that is roughly 440 samples per speed band — cheap enough to compute client-side if `evaluateTarget` is lean.

Extend sampling slightly beyond the lines so out-of-bounds regions render as visibly bad rather than simply absent.

### Draw layer

Render the raster to a **canvas layer beneath the SVG court**. SVG will not hold up at live update rates with hundreds of elements. Court geometry, player markers, and shot paths stay in SVG on top.

Smooth the raster with bilinear interpolation or a light blur so the surface reads as continuous rather than as visible grid cells.

### Color scale

Diverging scale with an explicit legend. Given the outdoor-readability and colorblindness requirements in `CLAUDE.md`:

- Pair color with **contour lines at score thresholds** so the map is readable without relying on hue alone
- Choose a colorblind-safe diverging palette
- Keep the palette muted enough that SVG court lines and markers remain legible on top

### Inspect interaction

Tapping or clicking any location shows:
- Numeric score at that point for the current speed band
- Per-factor breakdown — which rules fired and their contribution
- The best shot type for that specific target

This converts the map from a picture into an explanation. It is also the fastest way to debug an implausible surface during development.

## Live Recompute Architecture

Required by Live Analysis mode (`docs/MODES.md`). The map must redraw during drags and slider motion with no analyze button.

### Precompute split

Split work into two phases:

**Per input change (once):**
- Depth categories for all four players
- Forehand/backhand envelopes and body-jam zones from handedness
- Formation classification, gap geometry, handedness configuration
- User execution baseline from position, balance, handedness
- Division and skill modifiers resolved to numeric multipliers

**Per sample (hundreds of times):**
- Read from precomputed context, compute distances, apply rule deltas, return score

If a value can be computed once per input change, it must not appear in the per-sample path.

### Throttling and resolution

- Throttle to `requestAnimationFrame`, not to input events
- Drop grid resolution during active drag — two-foot sampling while moving, one-foot on settle
- Compute contour lines only on settle; they are more expensive than the raster fill
- Web Worker only if the main thread proves inadequate. Try the simpler path first.

### Mobile degradation

Full-resolution continuous recompute will struggle on a phone.

- Lower default grid resolution on mobile
- Consider recomputing on **drag-end** for player markers while keeping **sliders live**, since slider changes invalidate less precomputation than positional changes
- Fall back to a coarser palette with fewer contour bands if frame rate suffers

## Where the Heat Map Appears

| Context | Behavior |
|---|---|
| Live Analysis | Always on, continuously updating — the primary output |
| Recommender | Optional overlay, off by default |
| Grader | Revealed **after** commit, with the user's target marked |
| Quiz | Revealed after each answer; off before |
| Point review (`docs/RALLY.md`) | Per-shot historical map with the actual target marked |
| Speed-slider drill | Standalone: fixed scenario, only the speed slider moves |

Keep it off by default in grader and quiz. Showing the surface before commitment removes the challenge and destroys the training value.

### Point review usage

For each shot in a completed rally, show the map as it was at that moment with the user's actual target marked. Seeing that a shot went into a cool region when a hot region existed six feet away is the clearest possible feedback the app can produce.

### Speed-slider drill mode

A minimal standalone mode: scenario fixed, the only interaction is the output speed slider. Teaches the pace-placement relationship directly with nothing else competing for attention. Cheap to build once the map exists.

## Handedness Effect

Flipping one opponent's handedness with everything else fixed must visibly redistribute the map — heat moving between the middle and the outside. See `CLAUDE.md` for the four configurations.

This is both a teaching feature and the primary engine self-test. If handedness flips produce no visible change, the handedness rules are not wired deeply enough.

Compare view: hold the scenario, flip handedness, render before and after with the delta highlighted.

## Validation

The map is the engine's diagnostic. Watch for:

- Implausible hot regions — heat where no competent player would hit
- Flat surfaces — insufficient rule coverage, everything scoring the same
- Discontinuities — a rule with a hard boundary that should be continuous
- Speed slider producing no redistribution — speed not properly wired into scoring
- Handedness flips producing no change — handedness not wired in
- Middle always hot regardless of configuration — the handedness multiplier is not applied
