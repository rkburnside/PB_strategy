# STRATEGY.md — Game and Match Strategy Trainer

Read `CLAUDE.md` first. Match strategy zooms out from the rally to the game and match. It shares domain vocabulary with the other modes but makes little use of the geometric rules engine.

## Position in the Project

This is the third product in the family, and the most different.

| | Shot Trainer | Rally Simulator | Match Strategy |
|---|---|---|---|
| Time horizon | One shot | One point | Game and match |
| Input | Static scenario | Sequence of choices | Score, profile, context |
| Court diagram | Central | Central, animated | Peripheral or absent |
| Rules engine | Full use | Full use plus policy and transitions | Little use |
| Claude API role | Rationale enhancement | Rally review | **Core — synthesis and planning** |
| Execution model | None | Required | None |
| Build cost | Baseline | Baseline plus 60-80% | Largely new, but simpler |
| Teaching mechanism | Correction | Consequence | Framing |

**This is the only mode that cannot ship in Tier 1.** It is API-dependent by design, because its output is synthesis rather than geometry. Everything else degrades gracefully to static rule explanations; this does not.

---

## Scope Areas

Roughly ordered by value.

### 1. Score-situational decisions

What changes at 9-9 versus 2-8? The correct risk posture is score-dependent in ways that are teachable and that most players handle by instinct rather than by plan.

Inputs: current score, serving or receiving, game format (to 11 or to 15, win by 2), match state in a best-of-three.

Teaches:
- Risk tolerance when leading versus trailing
- Serving at 10-8 versus receiving at 8-10
- When to protect a lead versus when protecting a lead becomes passivity
- Rally-length tolerance shifts with score
- Which errors are acceptable at which score

### 2. Opponent profiling and exploitation

Given a scouting profile, what patterns should the team run?

Profile schema:

```
OpponentProfile {
  playerA: {
    handedness: "right" | "left"
    backhandQuality: 1-5
    mobility: 1-5
    patience: 1-5
    attacksAboveNet: 1-5
    handlesPaceAtBody: 1-5
    resetQuality: 1-5
    thirdShotPreference: "drop" | "drive" | "mixed"
    poachTendency: 1-5
    notes: string
  }
  playerB: { ... }
  teamTendencies: {
    stacks: boolean
    formationPreference: string
    communicationQuality: 1-5
    middleCoverage: "playerA" | "playerB" | "contested"
  }
}
```

Output: a prioritized game plan — which patterns to run, which to avoid, what to do when the primary plan is not working.

This is where the Claude API genuinely outperforms a rules engine. Synthesizing a coherent plan from a multidimensional profile is a language task, not a geometry task.

### 3. Pattern construction

Multi-shot sequences rather than single shots. Setting up with three cross-court dinks and then going behind. Teaching the sequence.

- Named patterns with setup, trigger, and execution phases
- When each pattern applies given the opponent profile
- What the opponent's counter to each pattern looks like
- How to disguise a pattern so it stays effective across a match

This bridges toward the rally simulator — a pattern is a strategic prior over rally shot selection, and could eventually feed opponent policy or user guidance in rally mode.

### 4. Partner and stacking decisions

- When to stack and which side
- Who takes the middle, and how that is agreed
- Covering for a weaker partner without undermining them
- Switching strategy mid-game
- Communication protocols

Handedness is central here. Stacking exists to control which hand covers the middle (see `CLAUDE.md`). In mixed, stacking is near-universal at 4.0+ (see `docs/DIVISIONS.md`).

### 5. Momentum and timeouts

- When to call a timeout — the run length and score context that justify it
- What to actually change coming out of one
- Recognizing a momentum shift before it becomes a deficit
- Distinguishing a bad run from a genuine tactical problem

### 6. Serving and returning strategy

- Serve placement patterns by opponent profile
- Return depth priorities and the tradeoff against return placement
- Third-shot selection by opponent formation
- When to vary serve to prevent the opponent settling

---

## Division Dependence

Division is arguably the primary input to strategy mode, more so than in any other mode.

Mixed strategy differs from men's and women's strategy at nearly every level: stacking is near-universal, isolation targeting is the central pattern, poach management dominates positioning, and partner coordination is a larger fraction of the game.

See `docs/DIVISIONS.md`. Strategy mode should require a division selection before generating any plan.

---

## Interface

The court diagram is peripheral here. The interface is primarily forms and prose.

### Input panel
- Division and skill level
- Opponent profile — sliders and toggles per the schema, with a "quick profile" preset list for common opponent archetypes
- Score state, if using score-situational mode
- Team context: partner handedness, stacking preference, own strengths

### Output panel
- Prioritized game plan, three to five items
- Per-item: the pattern, why it works against this profile, the execution cue, and the fallback if it stops working
- What to avoid, with reasoning
- Adjustment triggers: what to watch for that means the plan needs changing

### Optional court integration
For pattern construction specifically, the court diagram can render a named pattern as a sequence of arrows. This reuses the existing SVG court and shot path rendering. Worth doing for the pattern area, unnecessary elsewhere.

---

## API Design

Model: `claude-sonnet-4-6`, `max_tokens: 1000`.

### Prompt structure

System instruction should establish:
- The advanced audience — no fundamentals, no definitions of standard terms
- Division context and its tactical implications
- Output as JSON only, no preamble, no markdown fences
- Concrete and actionable output; no generic advice that would apply to any opponent

### Output schema

```
{
  gamePlan: [
    {
      priority: number,
      pattern: string,
      rationale: string,
      executionCue: string,
      fallback: string
    }
  ],
  avoid: [
    { pattern: string, reason: string }
  ],
  adjustmentTriggers: [
    { signal: string, response: string }
  ]
}
```

### Failure handling

Since this mode is API-dependent, failure must be handled visibly rather than silently degraded. Show a clear error with a retry control. Do not attempt to fabricate a plan from static rules — a generic plan is worse than no plan and undermines trust in the mode.

Consider caching the last generated plan in session state so a network drop does not lose it.

---

## Relationship to Rally Simulator

Strategy and rally simulation could eventually connect:

- A generated game plan becomes a prior that biases the user's shot recommendations in rally mode
- Rally outcomes against a profiled opponent feed back into whether the plan is working
- Post-rally review could flag where the user departed from the plan

This is a phase-five idea. Do not design for it initially, but avoid architectural decisions that would preclude it — specifically, keep the opponent profile schema independent of any single mode.

---

## Build Order

1. Opponent profile schema and input form
2. API proxy (Tier 2 prerequisite — see `docs/ARCHITECTURE.md`)
3. Game plan generation and rendering
4. Score-situational mode
5. Quick-profile archetype presets
6. Pattern library with court diagram rendering
7. Partner and stacking guidance
8. Momentum and timeout guidance
9. Optional: plan-to-rally connection

---

## Validation

- The same profile with division switched produces materially different plans
- Two different profiles produce non-overlapping plans; if the output is generic across profiles, the prompt is not using the input
- Plans name specific patterns and targets rather than offering platitudes
- Output survives JSON parsing reliably; test with fences and preamble present
- A 4.0-plus player reading a generated plan finds it actionable rather than obvious
