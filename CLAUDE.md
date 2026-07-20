# CLAUDE.md — Pickleball Shot Selection Trainer

## Project Overview

An interactive trainer for advanced pickleball players (4.0+) that teaches shot selection, rally construction, and match strategy. Users arrange court scenarios, receive ranked shot recommendations with a continuous quality heat map, play out simulated rallies, and review decisions after the fact.

This file is the **shared foundation**. It defines the domain model, engine architecture, and constraints that every mode depends on. Mode-specific specifications live in separate files.

## Companion Specification Files

| File | Scope |
|---|---|
| `docs/MODES.md` | The five single-shot and analysis modes |
| `docs/RALLY.md` | Rally simulation, entry points, execution probability, opponent policy |
| `docs/HEATMAP.md` | Continuous target scoring, speed dependence, rendering |
| `docs/DIVISIONS.md` | Mixed / men's / women's tactical rule sets |
| `docs/POV.md` | First-person court view and ball trajectory rendering |
| `docs/STRATEGY.md` | Game and match strategy trainer |
| `docs/ARCHITECTURE.md` | Client/server split, deployment tiers, build order |

Read this file first. Read the relevant companion file before implementing any mode.

## Target User

Advanced players (4.0+) and coaches. Assume fluency with the vocabulary: dink, drop, drive, reset, speed-up, ATP, Erne, roll volley, punch volley, lob, block, counter, transition zone, kitchen line, stacking, hands battle, third shot, seam.

**Do not explain fundamentals.** Rationale text should read like a coach speaking to a peer. No tutorial framing, no definitions of standard terms.

## Stack and Constraints

- React, single-file artifact for early phases
- Tailwind core utility classes only — no compiler, so only pre-defined base stylesheet classes work
- No persistence in Tier 1: all state in React `useState`, session only
- No `localStorage` or `sessionStorage` in the artifact environment
- No HTML `<form>` tags — use `onClick` and `onChange` handlers
- Canvas layer for heat map raster, SVG for court geometry and markers
- Three.js if used is r128: no `OrbitControls`, no `CapsuleGeometry`

## Court Model

### Dimensions

Standard court: 44 ft long by 20 ft wide. Non-volley zone (kitchen) extends 7 ft from the net on each side. Baseline sits 22 ft from the net. Centerline splits each service court.

### Coordinate System

Continuous floating-point coordinates.

- `x`: 0 to 20 — feet from the left sideline from the viewer's perspective
- `y`: -22 to +22 — feet from the net; negative is the near/user side, positive is the far/opponent side
- `z`: 0 to ~12 — feet above the court surface, used for ball height and trajectory

Net height: 36 in at the sidelines, 34 in at center. The engine should use the center height (34 in / 2.83 ft) as the reference for net clearance calculations unless the ball is near a sideline.

Players may be positioned anywhere including off-court, since advanced play involves poaching, Erne positions, and deep retrieval. Allow a margin of approximately 6 ft beyond each boundary.

### Depth Categories

Derived from `y`, per player:

| Category | Distance from net |
|---|---|
| Kitchen line | 6.5 to 7.5 ft |
| Transition zone | 7.5 to 14 ft |
| Mid-court | 14 to 18 ft |
| Baseline | 18 ft or greater |

## Scenario Schema

```
Scenario {
  players: [Player, Player, Player, Player]   // index 0 = user, 1 = partner, 2 & 3 = opponents
  ball: { x, y, z }
  incomingShot: ShotType
  incomingSpeed: number        // 0-1 continuous, mapped to speed bands
  ballHeightAtContact: number  // feet, continuous
  bounceState: "volley" | "afterBounce"
  userBalance: number          // 0-1, 1 = fully balanced, 0 = fully stretched
  division: "mens" | "womens" | "mixed"
  skillLevel: number           // 3.5 - 5.0
  score?: ScoreState           // optional, used by strategy mode
}

Player {
  x: number
  y: number
  handedness: "right" | "left"
  gender?: "M" | "F"           // required when division is "mixed"
  role: "user" | "partner" | "opponent"
}
```

### Shot Taxonomy

Incoming shot types, each carrying implied height, pace, spin, and bounce characteristics:

- Dink — cross-court, straight, middle
- Third-shot drop — well-executed, floating
- Third-shot drive
- Speed-up — at body, at feet, at shoulder
- Reset attempt
- Lob — offensive, defensive
- Punch volley
- Roll volley
- Deep return of serve
- Block, counter
- Overhead
- Serve — short, deep, wide, at body

Outgoing shot candidates use the same taxonomy plus a target coordinate and a speed band.

## Derived State

Computed from raw scenario state, exposed to the scoring engine. All of this belongs in the **precomputed context**, not the per-sample hot path.

### Per player
- Depth category
- Forehand side and backhand side in court coordinates, derived from handedness plus position
- Backhand reach envelope, smaller than the forehand envelope
- Body-jam target zone, positioned on the dominant-hand hip
- Whether the player's backhand faces the middle or the sideline given court position

### Per team
- Formation: both up, both back, staggered, and which player is up
- Middle gap location and width
- Sideline gaps
- Cross-court gap
- Handedness configuration: forehands-middle, backhands-middle, both-right, both-left

### Situational
- ATP opportunity present
- Erne setup available
- User distance to ball and derived time pressure
- Partner exposure — whether a lane is open behind the partner
- Net clearance required from the user's position to any given target

## Engine Architecture

### Core primitive

The engine's central function:

```
evaluateTarget(precomputedContext, targetX, targetY, shotType, speed) => score
```

Returns a quality score from 0 to 100 for hitting a specific shot type at a specific speed to a specific coordinate.

This is a **hot-path function**. It is called several hundred times per heat map redraw, potentially every animation frame during a drag. Constraints:

- Allocation-free — no object creation per call
- All scenario-dependent but target-independent work is precomputed once per input change and passed in via `precomputedContext`
- No async, no side effects, pure

Discrete ranked shot candidates are defined as **sampled peaks of this scoring surface**, not as a separate code path. This ensures the map and the ranked list can never disagree.

### Rules layer

A declarative rule table, not nested conditionals. Each rule:

```
Rule {
  id: string
  name: string
  condition: (context, target, shotType, speed) => boolean
  scoreDelta: number | (context, target, shotType, speed) => number
  appliesToDivisions: ("mens" | "womens" | "mixed")[]
  handednessConfig?: string[]        // restrict to specific handedness configurations
  explanation: string                // static rationale, used in Tier 1
  category: "opportunity" | "risk" | "execution"
}
```

Rules as data, not code. This keeps them auditable, tunable, and addable without touching engine logic. Score deltas can be functions for continuous weighting.

The `category` field supports the opportunity/risk layer split in the heat map.

### Core rule principles

These are non-negotiable pickleball fundamentals the rule table must encode:

- **Height dictates aggression.** Ball below net height means do not attack — reset or dink. Ball above net height at the kitchen means attack.
- **Position dictates target.** Attack the player who is back or in transition. Do not attack the player set at the kitchen line unless their feet are exposed.
- **Middle is high-percentage** when both opponents are up — but this weight is **derived from the handedness configuration**, not fixed. Forehands-middle inverts it.
- **Transition zone opponents get balls at their feet.** No exceptions.
- **Off-balance user resets.** Suppress all offensive candidates when `userBalance` is low.
- **Partner exposure vetoes cross-court speed-ups** that invite a counter into the open lane.
- **ATP and Erne opportunities** unlock only under specific geometric conditions detected by the rules layer, never inferred by the AI layer.

### Explanation layer

Two sources, in priority order:

1. **Static rule explanations** — composed from the `explanation` strings of triggered rules. Instant, offline, deterministic. This is the Tier 1 default and the permanent fallback.
2. **Claude API rationale** — optional enhancement. The model does **not** re-rank; it explains. It receives the scenario and the ranked candidate list and returns coaching prose.

The application must be fully useful with the API disabled. Never block the interface on the network.

#### API contract

Model: `claude-sonnet-4-6`, `max_tokens: 1000`.

Instruct the model to return only JSON, no preamble, no markdown fences. Schema: array of objects with `shotName`, `rationale`, `tradeoff`, `failureMode`, `opponentResponse`.

The model must not invent shots outside the provided candidate list. Strip any ` ```json ` fences before parsing. Wrap in try/catch and fall back to static explanations on any failure.

## Handedness

Handedness is a first-class scenario variable affecting targeting geometry more than most players consciously account for.

### The four configurations

| Configuration | Middle seam | Consequence |
|---|---|---|
| Both right-handed | Right-side player's backhand faces middle | Middle target quality raised — base assumption |
| Both left-handed | Mirror image — middle finds a backhand | Same as both-right, mirrored |
| Opposite, forehands middle | Both forehands converge center | Middle goes **cold**; sidelines and outside corners heat up |
| Opposite, backhands middle | Both backhands meet center | Middle becomes **stronger** than base |

The forehands-middle case is the significant one. It is a substantial redistribution of the heat map and is exactly the situation players fail to adjust for.

### What handedness resolves

Generic rules like "attack the backhand" or "jam the body" have no coordinates without handedness. Handedness converts them to actual target locations:

- Body-jam lands on the dominant-hand hip — right hip for a right-hander
- Backhand-side attacks require knowing which side that is; attacking down the line into a left-hander's forehand when the backhand was intended is a common and costly error
- Cross-court angle comfort inverts by matchup — sharp angles easy forehand-side are awkward backhand-side
- Spin direction inverts: topspin roll and slice curve opposite ways off opposite hands
- ATP window and Erne setup both shift with the receiving hand

### User handedness

Applies to the user, not only opponents. It changes execution difficulty — a ball at the user's backhand side is harder to angle sharply cross-court. The heat map is a function of the user's handedness as well as the opponents'.

### Implementation

- Handedness enters the **precomputed context**, not the per-sample path. Forehand and backhand envelopes and body-jam zones are computed once per input change.
- Most base rules take a handedness-conditional **multiplier** rather than requiring new rules. The middle-seam rule weight must be derived from the configuration.
- A small number of genuinely new rules are needed for opposite-handed cases, since forehands-middle **inverts** rather than reweights.
- UI: small R/L indicator on each player marker, tappable to flip. Discoverable without an extra control panel.
- Scenario templates and quiz jitter must include left-handed players at a realistic rate.

### Self-test

Flipping one opponent's handedness with everything else fixed should visibly move heat between the middle and the outside. If it does not, handedness is not wired in deeply enough.

## Mobile Requirements

Mobile is a primary target. Players will use this courtside on a phone, one-handed, possibly in bright sunlight.

### Layout
- Single column below roughly 768px: court, then scenario controls, then results
- Court fills viewport width with aspect ratio preserved; portrait renders the net horizontal with the user's side at the bottom
- Auto-scroll results into view after an analyze action
- Result cards collapse to shot name plus risk badge, expanding on tap
- Scenario controls become horizontally scrolling chips or segmented controls, not stacked dropdowns
- Sticky bottom bar for the primary action
- Landscape reverts to two columns: court left, results right

### Touch
- Pointer events throughout, not mouse events
- Minimum 44 by 44 px hit areas; render markers smaller but give each a larger invisible target
- `touch-action: none` on the court SVG; `preventDefault` on touch move during active drag
- Hold threshold or expanded hit area near court edges to distinguish drag from scroll
- Visual grab feedback: enlarge marker, add ring
- No hover. Replace with tap-to-select. One shot path shown at a time on mobile.

### Environment
- High contrast for outdoor sunlight
- 16px minimum base font — prevents iOS input zoom, aids outdoor legibility
- Risk encoding pairs color with explicit text label and distinct badge shape or border weight; never color alone
- Below 480px: thicker court lines, proportionally larger markers, drop decorative detail

### Performance
- Rules-layer results render instantly with no network dependency
- AI rationale fills in progressively with a clear degraded state and a retry control on failure
- Reduce heat map grid resolution on mobile; consider recomputing on drag-end for player markers while keeping sliders live

### Presets
Presets matter more on mobile than desktop — dragging four markers on a phone is tedious. A horizontally scrolling row of formation and rally-stage buttons directly adjacent to the court. One tap to a useful scenario, then adjust only what differs.

## Design Direction

Court-first visual hierarchy. The diagram is the interface; text supports it. Muted, slightly desaturated palette so risk color coding reads clearly against it. Avoid generic dashboard styling and default card shadows. Typography tight and confident.

## Testing the Engine

The live analysis mode (see `docs/MODES.md`) is the primary engine diagnostic. If the heat map produces an implausible surface in any configuration, the rules engine has a bug. Build it early — before the grader, possibly before the rally simulator — specifically because it makes engine errors visible.

Validate against real players. Print six court diagrams representing common 4.0+ situations and have several 4.0-plus players write their choice and reasoning. If experienced players disagree materially on the same scenario, modes that assert a single correct answer are on shaky ground and grader or quiz framing is safer.

## Open Questions

- Should opponent skill level be a modeled variable, or should the engine assume 4.0+ opponents throughout?
- How many rules are needed before the engine feels authoritative rather than simplistic?
- Should the heat map default to netted quality or to separate opportunity and risk layers?
