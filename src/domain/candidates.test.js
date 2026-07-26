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
  it('produces a grid whose dimensions match the axes', () => {
    const { xs, ys, grid } = sampleHeatmap(context, 'dink-cross', 0.3, 2)
    expect(grid).toHaveLength(ys.length)
    expect(grid[0]).toHaveLength(xs.length)
  })

  it('samples past the lines so out-of-bounds is visible, and reports the extent', () => {
    const { xs, ys, extent } = sampleHeatmap(context, 'dink-cross', 0.3, 1)
    expect(extent.minX).toBeLessThan(0)
    expect(extent.maxX).toBeGreaterThan(COURT.widthFt)
    expect(extent.minY).toBeLessThan(0)
    expect(extent.maxY).toBeGreaterThan(COURT.lengthHalfFt)
    expect(xs[0]).toBe(extent.minX)
    expect(ys[ys.length - 1]).toBe(extent.maxY)
  })

  it('honours an explicit margin of zero', () => {
    const { extent } = sampleHeatmap(context, 'dink-cross', 0.3, 1, 0)
    expect(extent.minX).toBe(0)
    expect(extent.maxX).toBe(COURT.widthFt)
    expect(extent.minY).toBe(0)
    expect(extent.maxY).toBe(COURT.lengthHalfFt)
  })

  it('matches evaluateTarget at each sampled point', () => {
    const { xs, ys, grid } = sampleHeatmap(context, 'dink-cross', 0.3, 5)
    expect(grid[1][1]).toBe(evaluateTarget(context, xs[1], ys[1], 'dink-cross', 0.3))
  })

  it('scores out-of-bounds samples worse than the in-bounds ideal', () => {
    const { xs, ys, grid } = sampleHeatmap(context, 'dink-cross', 0.3, 1)
    const at = (x, y) => grid[ys.indexOf(y)][xs.indexOf(x)]
    expect(at(-2, 5)).toBeLessThan(at(5, 5)) // wide of the sideline
    expect(at(5, 25)).toBeLessThan(at(5, 5)) // past the baseline
  })
})

describe('rankedCandidates — bounds', () => {
  it('never recommends a target outside the lines', () => {
    for (const c of rankedCandidatesAcrossSpeeds(context, { topN: CANDIDATE_SHOT_TYPES.length, gridStepFt: 1 })) {
      expect(c.x).toBeGreaterThanOrEqual(0)
      expect(c.x).toBeLessThanOrEqual(COURT.widthFt)
      expect(c.y).toBeGreaterThanOrEqual(0)
      expect(c.y).toBeLessThanOrEqual(COURT.lengthHalfFt)
    }
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
