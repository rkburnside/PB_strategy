# ARCHITECTURE.md — Client/Server Split, Deployment Tiers, Build Order

Read `CLAUDE.md` first.

## The Central Constraint

**Everything that makes the trainer work is client-only.** The entire domain engine — rules, scoring, heat map, rally simulation, opponent policy, execution probability, POV rendering — runs in the browser with no backend.

Only two things require a server: the Claude API key, and persistence beyond a session.

Build the engine so this remains true by construction. If any core feature ever requires the server to function, the offline courtside use case is dead.

---

## Client vs. Server

| Feature | Runs where | Reason |
|---|---|---|
| Court diagram and SVG rendering | Client | Pure rendering |
| Drag interaction, coordinate model | Client | Pure UI |
| Derived state — formations, gaps, depth, handedness envelopes | Client | Trivial geometry |
| Rules engine / `evaluateTarget` | Client | Pure function, no data or secrets |
| Discrete shot ranking | Client | Sampled peaks of the local surface |
| Static rule explanations | Client | Strings keyed to rule IDs |
| Heat map computation and rendering | Client | ~440 samples per band, fast locally |
| Speed slider recomputation | Client | Same engine, re-run |
| Execution probability sampling | Client | Local RNG against static tables |
| Opponent policy | Client | Reuses the local engine, role-swapped |
| Position state transitions | Client | Deterministic geometry |
| Rally termination and attribution | Client | Local |
| Rally entry-point templates and jitter | Client | Static data |
| Division rule sets | Client | Static rule data |
| Handedness logic | Client | Static geometry |
| Quiz scenario randomizer | Client | Local |
| POV projection and rendering | Client | Rendering only |
| Session state, streaks, scores | Client | React state |
| **Claude API — shot rationale** | **Server** | Key must not ship to the browser |
| **Claude API — rally review** | **Server** | Same |
| **Claude API — drill cards** | **Server** | Same |
| **Claude API — match strategy** | **Server** | Same; this mode is API-dependent by design |
| Saved scenarios across devices | Server | Database |
| Progress tracking over time | Server | Database |
| User accounts | Server | Auth |
| Coach-assigned scenarios | Server | Multi-user |
| Leaderboards | Server | Multi-user |

---

## Deployment Tiers

### Tier 1 — Pure client, no server

Full shot trainer, live analysis, heat map, rally simulator, all divisions, all entry points, handedness, POV, quiz and grader modes. Explanations composed from static rule strings.

Deployable as a single file or on GitHub Pages. Works fully offline as a PWA.

**This is a complete, useful product.** It is not a stepping stone — it is the version that works courtside with no signal.

Only match strategy and drill cards are missing.

### Tier 2 — One serverless function

A single endpoint proxying to the Claude API with the key in an environment variable. Vercel or Netlify function, roughly thirty lines. No database.

Unlocks AI rationale, rally review, drill cards, and match strategy.

**This is the sweet spot.**

Note: the Claude artifact environment is effectively Tier 2 without the work, since the API key is handled. That is the fastest path to validating whether the AI layer adds enough to justify building the proxy.

### Tier 3 — Database

Cross-device saves, progress history, accounts, coach features.

Only worth building if those specific features prove wanted.

---

## Platform Options

| Platform | Effort | Persistence | Notes |
|---|---|---|---|
| Claude artifact | Lowest | None | Fastest iteration, no build step, API key handled. No localStorage. |
| Static site — GitHub Pages, Netlify, Vercel | Low | localStorage | Free, fits an existing GitHub workflow. API key needs a serverless proxy. |
| Vite + React repo, local | Low-medium | localStorage | Proper dev loop in VS Code |
| Next.js on Vercel | Medium | Full | API routes solve the key problem cleanly. Overkill without accounts. |
| PWA — installable | Medium | localStorage + service worker | Offline courtside, home screen icon. Meaningful upgrade for on-court use. |
| React Native / Expo | High | Full | Only for camera, sensors, or app store distribution |

### Suggested path

1. **Artifact** — declarative rule table, static explanations, no API call. Prove the rules are good. This phase decides whether the project succeeds, and needs no infrastructure.
2. **Artifact plus Claude API** — layer AI rationale on top once rules are sound, with static explanations as fallback. Exactly the degraded-state behavior the mobile spec already requires.
3. **Vite repo on GitHub Pages or Vercel** — move out when localStorage is wanted for streaks and saved scenarios. Add a serverless function for the key.
4. **PWA** — only if the app is actually being used courtside. Offline is the one thing earlier phases cannot deliver.

---

## Rules Engine Implementation Options

| Approach | Assessment |
|---|---|
| Hand-coded JS conditionals | Zero dependencies and debuggable, but unmaintainable past roughly 40 rules |
| **Declarative rule table** | **Chosen.** Rules as data — easy to add, tune, and audit. Still zero dependencies. |
| `json-rules-engine` | Battle-tested, but adds a dependency and is unavailable in the artifact environment |
| Weighted scoring model | Complements the rule table; produces natural ranking rather than binary outcomes |
| Decision tree / lookup table | Explodes combinatorially against continuous coordinates. Poor fit. |
| Trained model on match data | Genuinely authoritative if the data existed. Pickleball tracking datasets are thin. Not viable. |

**Chosen: declarative rule table producing weighted scores.** Rule shape defined in `CLAUDE.md`. This keeps rules inspectable, supports ranked and continuous output, and stays dependency-free.

---

## Explanation Layer Options

| Option | Assessment |
|---|---|
| Claude API in artifact | Simplest working path today. No key management. |
| Claude API with own key and proxy | Required once outside the artifact |
| Other providers | No advantage; would mean rebuilding the same prompt |
| Local model — Ollama, WebLLM | Works offline, but small models produce poor pickleball reasoning |
| **Pre-written explanations keyed to rule IDs** | **Tier 1 default and permanent fallback.** Instant, free, offline, deterministic. Loses situational nuance. |

Each rule carries its own `explanation` string. The app composes rationale from triggered rule IDs with no API call. That is faster, works with no signal, and is fully predictable. The AI layer becomes an optional enhancement.

---

## Repository Structure

```
pickleball-trainer/
├── CLAUDE.md
├── docs/
│   ├── MODES.md
│   ├── RALLY.md
│   ├── HEATMAP.md
│   ├── DIVISIONS.md
│   ├── POV.md
│   ├── STRATEGY.md
│   └── ARCHITECTURE.md
└── src/
    ├── domain/
    │   ├── court.js           # geometry, coordinate helpers, depth categories
    │   ├── scenario.js        # schema, validation, defaults
    │   ├── handedness.js      # envelopes, body-jam zones, configuration detection
    │   ├── derive.js          # precomputed context builder
    │   ├── rules/
    │   │   ├── base.js
    │   │   ├── mens.js
    │   │   ├── womens.js
    │   │   ├── mixed.js
    │   │   └── index.js       # rule table assembly
    │   ├── evaluate.js        # evaluateTarget hot path
    │   └── candidates.js      # peak sampling to discrete shots
    ├── rally/
    │   ├── execution.js       # probability tables and sampling
    │   ├── policy.js          # opponent shot selection
    │   ├── transitions.js     # position updates
    │   ├── termination.js
    │   └── stages.js          # entry point templates
    ├── render/
    │   ├── CourtSvg.jsx
    │   ├── HeatCanvas.jsx
    │   ├── PovView.jsx
    │   └── ShotPaths.jsx
    ├── modes/
    │   ├── LiveAnalysis.jsx
    │   ├── Recommender.jsx
    │   ├── Grader.jsx
    │   ├── Quiz.jsx
    │   ├── DrillCard.jsx
    │   ├── RallySim.jsx
    │   └── Strategy.jsx
    └── api/
        └── claude.js          # proxy client with fallback
```

The `domain/` layer is the shared foundation and must have no React dependency. It should be testable as plain functions.

---

## Master Build Order

Across all specification files:

**Phase 1 — Foundation**
1. Court SVG with accurate geometry, responsive sizing
2. Pointer-event drag with mobile touch targets and `touch-action: none`
3. Scenario schema, coordinate model, derived state
4. Handedness envelopes and configuration detection
5. Declarative rule table with base rules and static explanations
6. `evaluateTarget` with the precompute split
7. Heat map canvas layer with sampling and rendering
8. **Live Analysis mode** — the engine diagnostic

**Phase 2 — Single-shot modes**
9. Responsive layout: mobile stack, sticky action bar, collapsible cards
10. Preset formation row
11. Candidate peak sampling and ranked shot cards
12. Recommender mode
13. Grader mode
14. Division rule sets
15. Scenario template library with jitter
16. Quiz mode

**Phase 3 — Rally**
17. Execution probability tables and sampling
18. Rally termination and attribution
19. Position state transitions
20. Opponent policy
21. Full rally loop
22. Stage entry points
23. Post-rally review with historical heat maps

**Phase 4 — API and strategy**
24. Serverless proxy (Tier 2)
25. AI rationale with graceful degradation
26. Drill card mode
27. Match strategy mode

**Phase 5 — POV and polish**
28. POV projection and static render
29. Trajectory animation and rally playback
30. Landscape layouts, compare views, visual polish

---

## Validation Gates

Do not proceed past a gate until it passes.

| Gate | Test |
|---|---|
| After phase 1 | Heat map produces plausible surfaces in every configuration. Speed slider redistributes. Handedness flips redistribute. |
| After phase 2 | 4.0-plus players stop materially disagreeing with the ranked output on a set of test scenarios. |
| After phase 3 | Rally position transitions look correct to an experienced player watching a replay. |
| After phase 4 | Generated plans differ meaningfully across opponent profiles. |

The phase 2 gate is the important one. The rally simulator compounds engine error, and building it on an unvalidated engine means debugging two systems with ground truth for neither.

---

## Paper Prototype

Before writing code: print six court diagrams representing common 4.0-plus situations. Write down the correct shot and reasoning for each. Hand them to two or three other 4.0-plus players.

If experienced players disagree materially on the same scenario, modes that assert a single correct answer are on shaky ground, and the grader or quiz framing — which tolerates ambiguity by showing tradeoffs — is the safer default.

This is cheap and will likely reorder priorities before anything worth throwing away has been written.
