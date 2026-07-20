// Discrete ranked shot candidates are sampled peaks of the continuous
// evaluateTarget surface — not a separate code path. See CLAUDE.md
// "Engine Architecture" and docs/HEATMAP.md "Core Concept".
import { COURT } from './court.js'
import { evaluateTarget } from './evaluate.js'
import { OFFENSIVE_SHOTS, CONTROL_SHOTS } from './rules/base.js'

export const CANDIDATE_SHOT_TYPES = [...CONTROL_SHOTS, ...OFFENSIVE_SHOTS]

// Samples the full target grid for a single shot type + speed and returns
// the raw score matrix, used by the heat map canvas.
export function sampleHeatmap(context, shotType, speed, gridStepFt = 1) {
  const xs = []
  const ys = []
  for (let x = 0; x <= COURT.widthFt; x += gridStepFt) xs.push(x)
  for (let y = 0; y <= COURT.lengthHalfFt; y += gridStepFt) ys.push(y)

  const grid = ys.map((y) => xs.map((x) => evaluateTarget(context, x, y, shotType, speed)))
  return { xs, ys, grid }
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
