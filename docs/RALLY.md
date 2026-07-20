# RALLY.md — Rally Simulator

Read `CLAUDE.md` first. The rally simulator is a turn-based point simulation built on the same engine as the single-shot modes.

## Concept

The user chooses a shot. The engine samples an execution outcome from a probability distribution. If the ball stays in play, the engine samples an opponent response from a policy. Positions update. Repeat until the rally ends.

This teaches shot selection through **consequence** rather than through verdict. It is the highest-value mode in the project and the natural extension of the single-shot engine.

## Sequencing Warning

The rally simulator compounds every weakness in the rules engine. A single-shot recommendation that is 80 percent sound feels acceptable. An eight-shot rally built on 80 percent soundness produces rallies that 4.0-plus players will recognize as wrong.

Position transitions are the most unforgiving component. If players do not move plausibly after each shot, the simulation loses credibility with the target user regardless of how good the shot scoring is.

**Build the single-shot engine until 4.0-plus players stop disagreeing with it. Then build this.** Attempting the rally first means debugging the engine and the transition model simultaneously with no ground truth for either.

---

## Subsystem 1: Execution Probability

Choosing a shot is not making it. Every shot needs a distribution over outcomes.

### Outcome categories

| Outcome | Effect |
|---|---|
| Clean | Executed as intended, lands at the target |
| Degraded | Executed poorly — lands short, floats high, or misses the target laterally |
| Error | Net, out, or kitchen fault. Rally ends. |

Degraded outcomes should perturb the target and the resulting ball height rather than simply failing. A floated drop is still in play, but it arrives above net height and hands the opponent an attack.

### Difficulty inputs

Execution probability is a function of:
- Shot type and speed band
- User position and depth category
- User balance
- Whether the ball is on the forehand or backhand side, resolved via handedness
- Incoming ball height and speed — time pressure
- Net clearance required for the intended target
- Distance to the target and required precision
- Skill level

### Illustrative rates

At 4.0+, roughly:

| Shot | Clean | Degraded | Error |
|---|---|---|---|
| Cross-court dink, balanced, at kitchen | 92% | 6% | 2% |
| Third-shot drop from baseline | 70% | 22% | 8% |
| Speed-up from below net height, stretched | 45% | 35% | 20% |
| Reset from transition, under pace | 60% | 28% | 12% |
| Overhead from a short lob | 88% | 8% | 4% |

These are starting values for tuning, not researched figures. They should live in a data table, not in code, so they can be adjusted without touching logic.

### Why this is the teaching mechanism

Pick a low-percentage shot repeatedly and the score reflects it. That is the lesson the single-shot modes cannot deliver, because they evaluate the decision in isolation from its execution risk.

---

## Subsystem 2: Opponent Policy

The engine must select opponent shots.

### Approach

Reuse the rules engine from the opponent's perspective. Swap the user and opponent roles in the scenario, run `evaluateTarget`, sample the candidate peaks.

**Sample weighted by score rather than always taking the best.** An opponent that always plays optimally is both unrealistic and unteachable — the user never sees the errors that real opponents make and never learns to capitalize on them.

### Skill level

Opponent skill controls two things:
- **Selection quality** — how tightly the sampling concentrates on top candidates
- **Execution rates** — their own clean/degraded/error distribution

A 3.5 opponent picks the third-best option often and misses more. A 5.0 opponent picks near-optimally and rarely errs.

### Division modulation

Opponent policy shifts by division (see `docs/DIVISIONS.md`):
- Men's opponents counter speed-ups more often
- Women's opponents reset more often and extend dink patterns
- Mixed opponents show asymmetric policy between the two players, and the male player poaches at a meaningfully higher rate

---

## Subsystem 3: Position State Transitions

The hardest technical piece and the most important. After each shot, recompute all four positions.

### Movement principles

- Players move toward the kitchen after hitting a drop or a dink that gives them time
- Players hold at the kitchen line during exchanges
- Players retreat for a lob
- Players get pulled wide by an angle and recover toward center afterward
- Players who hit a drive stay back or advance only partially, entering the transition zone
- Partners move together — one player pulled wide drags the partner toward the middle to cover

### Constraints

- Movement is bounded by available time, which is a function of the previous shot's speed and distance
- A player cannot reach the kitchen from the baseline in one shot against pace
- Recovery toward center is partial, not instant
- Off-balance players recover more slowly

### Why this decides credibility

Positional consequence is what makes the simulation teach anything. If a player hits a good drop and does not advance, or hits a drive and teleports to the kitchen, the whole simulation is invalid. Prioritize this over shot scoring refinement once the single-shot engine is sound.

---

## Subsystem 4: Rally Termination

### Ending conditions

| Ending | Attribution |
|---|---|
| Winner | Ball unreachable given opponent position and time |
| Unforced error | Error outcome on a low-difficulty shot |
| Forced error | Error outcome on a high-difficulty shot |
| Out | Degraded or clean outcome landing beyond the lines |
| Net | Insufficient clearance |
| Kitchen fault | Volley while in the non-volley zone, or momentum carrying in |

Every ending must be **attributed**, so the post-rally summary can state what actually decided the point rather than only who won it.

### Stage-limited termination

Rally entry points may end early rather than playing the full point. A third-shot drill might terminate after three shots with an assessment of the position reached rather than a winner.

Each stage template carries `maxShots` and a `terminationCondition`.

---

## Subsystem 5: Post-Rally Review

Where the learning lands. Not during the rally — after it.

### Contents

- Rally reconstruction, shot by shot, replayable
- Per-shot heat map as it was at that moment, with the user's actual target marked (see `docs/HEATMAP.md`)
- Decision points flagged:
  - Where a materially better option existed
  - Where the user got away with a low-percentage choice — a clean outcome on a bad decision, which is the most dangerous kind of feedback in real play
  - Where the opponent's response was unlucky rather than the user's error
- Attribution of the ending
- Optional AI narrative summary via the Claude API (Tier 2)

The "got away with it" flag is worth emphasizing. Real play teaches the wrong lesson when a poor decision produces a good outcome. The simulator can correct this by separating decision quality from result.

---

## Rally Entry Points

Jumping into a rally at a defined stage. Same simulator, seeded starting state.

### Why this matters more than it looks

Rally entry points solve the volume problem. Playing full points from the serve spends most repetitions on the parts the user already does well. Dropping into fifth-shot transition twenty times in a row is deliberate practice; playing twenty full points might produce three transition situations.

It also makes mobile sessions viable. A fifth-shot repetition takes fifteen seconds, so the app becomes something used for five minutes between games.

### Stage library

| Stage | Starting state | Trains |
|---|---|---|
| Serve | User serving, all four at baseline | Serve placement, setting up the third |
| Return of serve | Deep ball incoming, user at baseline | Return depth, getting forward |
| Third shot | User at baseline, opponents at kitchen, return incoming | Drop vs. drive — highest-leverage shot in the game |
| Fourth shot | User at kitchen, third shot incoming | Attacking a floater, handling a good drop, back to their feet |
| Fifth shot and transition | User in transition zone, ball at feet | Reset under pressure, when to move, when to hold |
| Both teams at the line | Neutral kitchen exchange | Dink patterns, seam construction, patience |
| Dink rally, cross-court | Extended cross-court exchange | Angle creation, when to change direction |
| Dink rally, straight-ahead | Down-the-line exchange | Different geometry, different attack windows |
| Hands battle | Fast exchange above net height at kitchen | Reaction, counter selection, when to reset out |
| Defending a lob | Opponent lobbed, user retreating | Retrieval, resetting to neutral |
| Out of position | Partner pulled wide, gap exposed | Damage control, recovery patterns |
| Attacking a short ball | Opponent floated one high | Finishing without over-hitting |

### Template structure

```
StageTemplate {
  id: string
  name: string
  basePositions: [Player, Player, Player, Player]
  ball: { x, y, z }
  incomingShot: ShotType
  incomingSpeed: number
  bounceState: string
  userBalance: number
  jitter: {                        // per-field plausible variation ranges
    playerPositions: [range, range, range, range]
    ballPosition: range
    incomingSpeed: range
    heightAtContact: range
  }
  handednessDistribution: object   // realistic left-handed rate
  maxShots: number
  terminationCondition: string
  applicableDivisions: string[]
}
```

Jitter is essential. Without it, repetitions are identical and the user memorizes a specific answer rather than learning the pattern.

### UI

Stage selection uses the same horizontally scrolling preset row as formation presets on mobile. The two controls can share a component.

---

## Division Handling

Division affects execution probability tables, opponent policy, and stage template availability. See `docs/DIVISIONS.md`.

Some stages are division-specific in character — mixed stacking scenarios, for instance, have no direct men's or women's equivalent.

---

## POV Integration

The rally simulator is the strongest fit for the POV view (`docs/POV.md`). Watching a rally play out from the user's own eye position is meaningfully different from watching markers move on a diagram, and it trains the actual perceptual task.

Animate each shot in sequence with a replay control. Build POV after the rally simulator works in top-down.

---

## Build Order

1. Execution probability tables and sampling — testable in isolation
2. Rally termination and attribution
3. Position state transitions — the credibility bottleneck
4. Opponent policy via role-swapped engine
5. Full rally loop from serve
6. Stage template library and entry points
7. Post-rally review with historical heat maps
8. AI narrative summary (Tier 2)
9. POV rendering
