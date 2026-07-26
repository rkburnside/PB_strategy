// Discrete ranked shot candidates are sampled peaks of the continuous
// evaluateTarget surface — not a separate code path. See CLAUDE.md
// "Engine Architecture" and docs/HEATMAP.md "Core Concept".
import { COURT, HEATMAP_MARGIN_FT } from './court.js'
import { evaluateTarget } from './evaluate.js'
import { OFFENSIVE_SHOTS, CONTROL_SHOTS } from './rules/base.js'

export const CANDIDATE_SHOT_TYPES = [...CONTROL_SHOTS, ...OFFENSIVE_SHOTS]

// Samples the target grid for a single shot type + speed and returns the raw
// score matrix, used by the heat map canvas.
//
// Sampling runs a margin past the lines so out-of-bounds reads as visibly bad
// rather than simply absent (docs/HEATMAP.md "Sampling"). The returned extent
// tells the renderer what rectangle the grid covers, since it is larger than
// the court itself.
export function sampleHeatmap(context, shotType, speed, gridStepFt = 1, marginFt = HEATMAP_MARGIN_FT) {
  const xs = []
  const ys = []
  // `|| 0` keeps a negative zero out of the axes when marginFt is 0.
  const noNegZero = (v) => v || 0
  for (let x = -marginFt; x <= COURT.widthFt + marginFt + 1e-9; x += gridStepFt) xs.push(noNegZero(x))
  for (let y = -marginFt; y <= COURT.lengthHalfFt + marginFt + 1e-9; y += gridStepFt) ys.push(noNegZero(y))

  const grid = ys.map((y) => xs.map((x) => evaluateTarget(context, x, y, shotType, speed)))
  return {
    xs,
    ys,
    grid,
    extent: { minX: xs[0], maxX: xs[xs.length - 1], minY: ys[0], maxY: ys[ys.length - 1] },
  }
}

// Finds the best-scoring target for a single shot type at a given speed.
function bestTargetForShot(context, shotType, speed, gridStepFt = 1) {
  let best = null
  for (let y = 0; y <= COURT.lengthHalfFt; y += gridStepFt) {
    for (let x = 0; x <= COURT.widthFt; x += gridStepFt) {
      const score = evaluateTarget(context, x, y, shotType, speed)
      if (!best || score > best.score) best = { x, y, score, shotType, speed }
    }
  }
  return best
}

// Ranked discrete shot candidates: one peak per shot type, sorted descending.
export function rankedCandidates(context, speed, { topN = 5, gridStepFt = 1, shotTypes = CANDIDATE_SHOT_TYPES } = {}) {
  const peaks = shotTypes.map((shotType) => bestTargetForShot(context, shotType, speed, gridStepFt))
  return peaks.sort((a, b) => b.score - a.score).slice(0, topN)
}

export const DEFAULT_SPEED_BANDS = [0.1, 0.3, 0.5, 0.7, 0.9]

// Like rankedCandidates, but also optimizes over speed for modes with no
// live speed slider (Recommender, Grader, Quiz). Still a sampled-peaks
// query against the same evaluateTarget surface, just swept across speed too.
export function rankedCandidatesAcrossSpeeds(
  context,
  { topN = 5, gridStepFt = 1, shotTypes = CANDIDATE_SHOT_TYPES, speeds = DEFAULT_SPEED_BANDS } = {},
) {
  const peaks = shotTypes.map((shotType) => {
    let best = null
    for (const speed of speeds) {
      const candidate = bestTargetForShot(context, shotType, speed, gridStepFt)
      if (!best || candidate.score > best.score) best = candidate
    }
    return best
  })
  return peaks.sort((a, b) => b.score - a.score).slice(0, topN)
}

// Evaluates a user-committed (target, shotType) pair for the Grader mode.
// Speed is swept the same way peaks are computed, so the comparison against
// the ranked list is apples-to-apples: best-case pace for that exact spot.
export function evaluateChoice(context, targetX, targetY, shotType, speeds = DEFAULT_SPEED_BANDS) {
  let best = null
  for (const speed of speeds) {
    const score = evaluateTarget(context, targetX, targetY, shotType, speed)
    if (!best || score > best.score) best = { x: targetX, y: targetY, shotType, score, speed }
  }
  return best
}
