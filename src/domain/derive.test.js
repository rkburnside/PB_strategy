import { describe, it, expect } from 'vitest'
import { buildPrecomputedContext } from './derive.js'
import { createDefaultScenario, createPlayer } from './scenario.js'
import { CENTER_X } from './court.js'

function scenarioWithOpponents(oppA, oppB, overrides = {}) {
  const scenario = createDefaultScenario()
  scenario.players[2] = createPlayer({ ...oppA, role: 'opponent' })
  scenario.players[3] = createPlayer({ ...oppB, role: 'opponent' })
  return { ...scenario, ...overrides }
}

describe('buildPrecomputedContext', () => {
  it('produces a geometry entry per player', () => {
    const context = buildPrecomputedContext(createDefaultScenario())
    expect(context.perPlayer).toHaveLength(4)
    expect(context.perPlayer.map((p) => p.role)).toEqual(['user', 'partner', 'opponent', 'opponent'])
  })

  it('classifies both-up when both opponents are at the kitchen line', () => {
    const scenario = scenarioWithOpponents(
      { x: CENTER_X - 3, y: 6.5, handedness: 'right' },
      { x: CENTER_X + 3, y: 6.5, handedness: 'right' },
    )
    const context = buildPrecomputedContext(scenario)
    expect(context.opponentFormation.type).toBe('both-up')
  })

  it('classifies both-back when both opponents are deep', () => {
    const scenario = scenarioWithOpponents(
      { x: CENTER_X - 3, y: 20, handedness: 'right' },
      { x: CENTER_X + 3, y: 20, handedness: 'right' },
    )
    const context = buildPrecomputedContext(scenario)
    expect(context.opponentFormation.type).toBe('both-back')
  })

  it('classifies staggered and names the up player when only one is at the kitchen', () => {
    const scenario = scenarioWithOpponents(
      { x: CENTER_X - 3, y: 6.5, handedness: 'right' },
      { x: CENTER_X + 3, y: 20, handedness: 'right' },
    )
    const context = buildPrecomputedContext(scenario)
    expect(context.opponentFormation.type).toBe('staggered')
    expect(context.opponentFormation.upPlayerRole).toBe('opponent')
  })

  it('computes team gaps independent of input order', () => {
    const scenario = scenarioWithOpponents(
      { x: 15, y: 6.5, handedness: 'right' },
      { x: 5, y: 6.5, handedness: 'right' },
    )
    const context = buildPrecomputedContext(scenario)
    expect(context.opponentGaps.middleGapX).toBe(10)
    expect(context.opponentGaps.middleGapWidth).toBe(10)
    expect(context.opponentGaps.leftSidelineGapFt).toBe(5)
    expect(context.opponentGaps.rightSidelineGapFt).toBe(5)
  })

  it('resolves the opponent handedness configuration from the two opponents', () => {
    const scenario = scenarioWithOpponents(
      { x: CENTER_X - 3, y: 6.5, handedness: 'right' },
      { x: CENTER_X + 3, y: 6.5, handedness: 'right' },
    )
    const context = buildPrecomputedContext(scenario)
    expect(context.opponentTeamConfig).toBe('both-right')
  })

  it('only includes rules applicable to the scenario division', () => {
    const mens = buildPrecomputedContext({ ...createDefaultScenario(), division: 'mens' })
    const womens = buildPrecomputedContext({ ...createDefaultScenario(), division: 'womens' })
    expect(mens.applicableRules.some((r) => r.id.startsWith('mens-'))).toBe(true)
    expect(mens.applicableRules.some((r) => r.id.startsWith('womens-'))).toBe(false)
    expect(womens.applicableRules.some((r) => r.id.startsWith('womens-'))).toBe(true)
    expect(womens.applicableRules.some((r) => r.id.startsWith('mens-'))).toBe(false)
  })

  it('computes skillDelta relative to the 4.0 baseline', () => {
    const context = buildPrecomputedContext({ ...createDefaultScenario(), skillLevel: 4.5 })
    expect(context.skillDelta).toBeCloseTo(0.5)
  })
})
