import { describe, it, expect } from 'vitest'
import { evaluateTarget, explainTarget } from './evaluate.js'
import { buildPrecomputedContext } from './derive.js'
import { createDefaultScenario } from './scenario.js'
import { CENTER_X } from './court.js'

function contextWith(overrides) {
  return buildPrecomputedContext({ ...createDefaultScenario(), ...overrides })
}

describe('evaluateTarget', () => {
  it('always returns a score clamped to 0-100', () => {
    const context = contextWith({})
    for (const [x, y] of [
      [0, 0],
      [10, 15],
      [20, 22],
    ]) {
      const score = evaluateTarget(context, x, y, 'speed-up-feet', 0.8)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    }
  })

  it('suppresses an offensive shot when the user is off balance', () => {
    const balanced = contextWith({ userBalance: 0.95 })
    const offBalance = contextWith({ userBalance: 0.2 })
    const target = { x: CENTER_X, y: 6.5 }
    const balancedScore = evaluateTarget(balanced, target.x, target.y, 'speed-up-feet', 0.8)
    const offBalanceScore = evaluateTarget(offBalance, target.x, target.y, 'speed-up-feet', 0.8)
    expect(offBalanceScore).toBeLessThan(balancedScore)
  })

  it('penalizes an offensive shot when the ball is below net height', () => {
    const below = contextWith({ ballHeightAtContact: 1.0 })
    const above = contextWith({ ballHeightAtContact: 5.0 })
    const target = { x: CENTER_X, y: 6.5 }
    const belowScore = evaluateTarget(below, target.x, target.y, 'speed-up-feet', 0.8)
    const aboveScore = evaluateTarget(above, target.x, target.y, 'speed-up-feet', 0.8)
    expect(belowScore).toBeLessThan(aboveScore)
  })

  it('does not mutate the context or throw across repeated calls (hot-path safety)', () => {
    const context = contextWith({})
    expect(() => {
      for (let i = 0; i < 50; i++) {
        evaluateTarget(context, i % 20, (i % 22) - 11, 'dink-cross', 0.3)
      }
    }).not.toThrow()
  })
})

describe('explainTarget', () => {
  it('returns only rules with a non-zero delta, sorted by magnitude descending', () => {
    const context = contextWith({ userBalance: 0.2 })
    const fired = explainTarget(context, CENTER_X, 6.5, 'speed-up-feet', 0.8)
    expect(fired.every((r) => r.delta !== 0)).toBe(true)
    for (let i = 1; i < fired.length; i++) {
      expect(Math.abs(fired[i - 1].delta)).toBeGreaterThanOrEqual(Math.abs(fired[i].delta))
    }
  })

  it('includes the off-balance rule when the user is stretched and the shot is offensive', () => {
    const context = contextWith({ userBalance: 0.1 })
    const fired = explainTarget(context, CENTER_X, 6.5, 'speed-up-feet', 0.8)
    expect(fired.some((r) => r.id === 'off-balance-user-must-reset')).toBe(true)
  })
})
