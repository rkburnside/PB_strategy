import { describe, it, expect } from 'vitest'
import {
  sampleHeatmap,
  rankedCandidates,
  rankedCandidatesAcrossSpeeds,
  evaluateChoice,
  CANDIDATE_SHOT_TYPES,
} from './candidates.js'
import { evaluateTarget } from './evaluate.js'
import { buildPrecomputedContext } from './derive.js'
import { createDefaultScenario } from './scenario.js'
import { COURT } from './court.js'

const context = buildPrecomputedContext(createDefaultScenario())

describe('sampleHeatmap', () => {
  it('produces a grid matching the requested step size', () => {
    const { xs, ys, grid } = sampleHeatmap(context, 'dink-cross', 0.3, 2)
    expect(xs).toEqual(Array.from({ length: Math.floor(COURT.widthFt / 2) + 1 }, (_, i) => i * 2))
    expect(ys).toEqual(Array.from({ length: Math.floor(COURT.lengthHalfFt / 2) + 1 }, (_, i) => i * 2))
    expect(grid).toHaveLength(ys.length)
    expect(grid[0]).toHaveLength(xs.length)
  })

  it('matches evaluateTarget at each sampled point', () => {
    const { xs, ys, grid } = sampleHeatmap(context, 'dink-cross', 0.3, 5)
    expect(grid[1][1]).toBe(evaluateTarget(context, xs[1], ys[1], 'dink-cross', 0.3))
  })
})

describe('rankedCandidates', () => {
  it('returns at most topN candidates sorted by descending score', () => {
    const candidates = rankedCandidates(context, 0.4, { topN: 4, gridStepFt: 2 })
    expect(candidates.length).toBeLessThanOrEqual(4)
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i - 1].score).toBeGreaterThanOrEqual(candidates[i].score)
    }
  })

  it('returns one candidate per requested shot type', () => {
    const shotTypes = ['dink-cross', 'reset']
    const candidates = rankedCandidates(context, 0.4, { topN: 10, gridStepFt: 2, shotTypes })
    expect(candidates.map((c) => c.shotType).sort()).toEqual([...shotTypes].sort())
  })
})

describe('rankedCandidatesAcrossSpeeds', () => {
  it('never scores lower than a single fixed-speed peak for the same shot type', () => {
    const acrossSpeeds = rankedCandidatesAcrossSpeeds(context, {
      topN: CANDIDATE_SHOT_TYPES.length,
      gridStepFt: 2,
    })
    const fixedSpeed = rankedCandidates(context, 0.5, { topN: CANDIDATE_SHOT_TYPES.length, gridStepFt: 2 })
    const bestByType = Object.fromEntries(acrossSpeeds.map((c) => [c.shotType, c.score]))
    for (const candidate of fixedSpeed) {
      expect(bestByType[candidate.shotType]).toBeGreaterThanOrEqual(candidate.score)
    }
  })
})

describe('evaluateChoice', () => {
  it('matches evaluateTarget at the speed it selects as best', () => {
    const choice = evaluateChoice(context, 10, 6.5, 'dink-cross')
    expect(choice.score).toBe(evaluateTarget(context, 10, 6.5, 'dink-cross', choice.speed))
  })

  it('picks a speed at least as good as any other candidate speed', () => {
    const choice = evaluateChoice(context, 10, 6.5, 'dink-cross', [0.1, 0.5, 0.9])
    for (const speed of [0.1, 0.5, 0.9]) {
      expect(choice.score).toBeGreaterThanOrEqual(evaluateTarget(context, 10, 6.5, 'dink-cross', speed))
    }
  })
})
