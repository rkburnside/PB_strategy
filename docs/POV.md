# POV.md — First-Person Court View

Read `CLAUDE.md` first. POV is an alternate rendering of the same scenario state, not a separate mode.

## Rationale

The top-down diagram teaches geometry. It does not teach **recognition**.

On court, players do not see a top-down map. They see a ball coming at them and must read height, pace, and spin in under a second. A POV mode trains the actual perceptual task, which is closer to what transfers to play.

It is also the strongest fit for the rally simulator. Watching a rally play out from the user's own eye position is meaningfully different from watching markers move on a diagram.

## Sequencing

Not phase one. The top-down view plus a sound rules engine is the foundation. POV is a phase three or four enhancement that primarily improves the rally simulator.

Build it after the rally simulator works in top-down.

---

## Technical Options

| Option | Effort | Notes |
|---|---|---|
| CSS 3D transforms | Low | Perspective-transformed court plane, sprites for players, animated ball. Works in the artifact. Convincing enough for training. |
| SVG with manual perspective projection | Low-medium | Project 3D coordinates to 2D directly. Full control, no dependency, integrates with the existing SVG court. |
| Three.js | Medium | Available in artifacts at r128. Proper 3D, real ball arc, camera control. Note r128 constraints. |
| Canvas 2D with manual projection | Medium | Better animation performance than SVG, more code |
| Pre-rendered video or images | High content cost | Not viable for arbitrary scenarios |

### Recommendation

**Manual perspective projection into the existing SVG**, or **Three.js** if real ball arc physics are wanted.

The scenario model already carries a `z` coordinate for ball height, so a 3D-aware model exists. Projecting it is not a large leap.

Three.js gives better trajectory realism but adds weight, and the r128 limitations are restrictive: no `OrbitControls`, no `CapsuleGeometry`. Use `CylinderGeometry`, `SphereGeometry`, or custom geometries for player figures.

---

## Camera Model

- Position at the user's court coordinates
- Eye height approximately 5.5 ft
- Looking toward the net, direction derived from the user's position relative to the ball
- Field of view roughly 70 degrees — wide enough to see both opponents in most configurations
- Camera does not rotate freely; it follows the ball with damping so the user's read is realistic rather than omniscient

### Projection

Standard perspective projection. For the manual SVG approach:

```
screenX = (worldX - camX) * focalLength / depth + centerX
screenY = (camZ - worldZ) * focalLength / depth + centerY
depth   = worldY - camY
```

Clip anything behind the camera plane. Scale player figure size by `1 / depth`.

---

## What to Render

### Essential
- **Net, accurately positioned and scaled.** The ball's relationship to the net tape is the critical read. Render the tape as a distinct line.
- **Ball trajectory as a proper arc** with apex height, not a straight line. Height over the net is the entire point of the view.
- **Kitchen lines on both sides** for spatial reference
- **Opponent figures as simple silhouettes** with correct scale by distance. Do not attempt realistic figures — they add cost and reduce clarity.
- **Handedness cue** on each opponent: paddle side or stance. The user should learn to read it rather than be told it.
- Baseline and sidelines

### Deliberately omitted
- Backgrounds, crowds, environmental detail
- Textured surfaces
- Realistic lighting or shadows beyond a simple ball shadow

A ball shadow on the court surface is worth including — it is a real depth cue players use.

---

## Trajectory Rendering

The arc is the product. Render it with care.

- Compute the arc from the launch point, target, and speed band using simple projectile motion
- Show the full arc as a trailing path, with the ball at its current position during animation
- Mark net crossing height visibly — a small indicator where the arc passes the net plane
- Mark the bounce point on the court surface
- Color the arc by shot quality when displaying a recommendation

In rally mode, animate each shot in sequence with playback controls: play, pause, step forward, step back, and a speed control.

---

## Integration with Top-Down

POV and top-down are **two renderings of one state**. Both driven by the same scenario object.

- Toggle control switches between them
- Optionally, a small top-down inset in the corner of the POV view for spatial orientation
- Heat map is a top-down concept and does not translate to POV. When the user switches to POV with a heat map active, either hide it or project the peak region onto the court plane as a highlighted zone.

Projecting the heat map onto the perspective court plane is possible and visually striking, but harder to read than the top-down version. Treat it as optional polish.

---

## Mobile

POV is harder on mobile than top-down.

The court reads well top-down on a phone in portrait. A POV view wants landscape and more screen real estate — the horizontal field of view is what makes it useful, and portrait crops it badly.

Options:
- Prompt for rotation when POV is selected on a narrow portrait viewport
- Accept that POV is the desktop-favored and landscape-favored view
- Render a narrower FOV in portrait, accepting reduced peripheral information

Recommendation: prompt for rotation, and if declined, render in portrait with a narrowed FOV and a note that landscape gives a fuller view.

Touch controls in POV are limited — there is nothing to drag. Interaction is playback controls and a return-to-top-down toggle. This actually simplifies the mobile problem relative to top-down.

---

## Performance

- Simple silhouettes and a single arc keep the scene trivially cheap
- Animation at 60fps is achievable with any of the listed approaches
- If using Three.js, dispose geometries and materials on unmount to avoid leaks across scenario changes
- Do not recompute the arc per frame; compute once per shot and interpolate position along it

---

## Build Order

1. Static POV render of a scenario — camera, court lines, net, figures
2. Perspective projection validated against known coordinates
3. Ball position rendering with shadow
4. Trajectory arc computation and static display
5. Toggle between POV and top-down
6. Animation with playback controls
7. Rally sequence playback
8. Handedness visual cues
9. Mobile orientation handling
10. Optional: heat map projection onto the court plane

---

## Validation

- A ball at net height renders at the net tape line from the user's eye position
- Opponent figure scale is correct: a player at the far baseline should be roughly half the apparent height of one at the far kitchen line
- The arc apex is visibly above the net for a drop and below the net path for a drive
- Switching between POV and top-down preserves scenario state exactly
- Handedness cue is readable at typical opponent distance
