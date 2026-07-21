// The engine's central function. Hot path: allocation-free, no async, no
// side effects, pure. All scenario-dependent target-independent work must
// already live in `context` (see derive.js). See CLAUDE.md "Engine Architecture".
import { clamp } from './court.js'

const BASELINE_SCORE = 50

// Reused across calls to avoid allocating a fresh object per sample.
const targetScratch = { x: 0, y: 0 }

export function evaluateTarget(context, targetX, targetY, shotType, speed) {
  targetScratch.x = targetX
  targetScratch.y = targetY

  let score = BASELINE_SCORE
  const rules = context.applicableRules
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i]
    if (!rule.condition(context, targetScratch, shotType, speed)) continue
    const delta =
      typeof rule.scoreDelta === 'function' ? rule.scoreDelta(context, targetScratch, shotType, speed) : rule.scoreDelta
    score += delta
  }
  return clamp(score, 0, 100)
}

// Returns the list of rules that fired for a given target/shot/speed, in
// priority order, for the explanation layer and per-factor breakdown.
export function explainTarget(context, targetX, targetY, shotType, speed) {
  targetScratch.x = targetX
  targetScratch.y = targetY

  const fired = []
  for (const rule of context.applicableRules) {
    if (!rule.condition(context, targetScratch, shotType, speed)) continue
    const delta =
      typeof rule.scoreDelta === 'function' ? rule.scoreDelta(context, targetScratch, shotType, speed) : rule.scoreDelta
    if (delta !== 0) {
      fired.push({ id: rule.id, name: rule.name, delta, explanation: rule.explanation, category: rule.category })
    }
  }
  return fired.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}
