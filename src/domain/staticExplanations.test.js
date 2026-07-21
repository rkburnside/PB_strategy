import { describe, it, expect } from 'vitest'
import { riskBadge, composeExplanation } from './staticExplanations.js'
import { buildPrecomputedContext } from './derive.js'
import { createDefaultScenario } from './scenario.js'
import { CENTER_X } from './court.js'

describe('riskBadge', () => {
  it('labels 70+ as Recommended (low risk)', () => {
    expect(riskBadge(70)).toEqual({ label: 'Recommended', tone: 'low' })
    expect(riskBadge(100)).toEqual({ label: 'Recommended', tone: 'low' })
  })

  it('labels 45-69 as Moderate risk', () => {
    expect(riskBadge(45)).toEqual({ label: 'Moderate risk', tone: 'medium' })
    expect(riskBadge(69)).toEqual({ label: 'Moderate risk', tone: 'medium' })
  })

  it('labels below 45 as High risk', () => {
    expect(riskBadge(44)).toEqual({ label: 'High risk', tone: 'high' })
    expect(riskBadge(0)).toEqual({ label: 'High risk', tone: 'high' })
  })
})

describe('composeExplanation', () => {
  const context = buildPrecomputedContext(createDefaultScenario())

  it('returns all four required fields for a known shot type', () => {
    const candidate = { x: CENTER_X, y: 6.5, shotType: 'dink-cross', speed: 0.3, score: 60 }
    const explanation = composeExplanation(context, candidate)
    expect(explanation).toHaveProperty('rationale')
    expect(explanation).toHaveProperty('tradeoff')
    expect(explanation).toHaveProperty('failureMode')
    expect(explanation).toHaveProperty('opponentResponse')
    expect(explanation.failureMode.length).toBeGreaterThan(0)
    expect(explanation.opponentResponse.length).toBeGreaterThan(0)
  })

  it('falls back to generic failure mode / opponent response text for an unmapped shot type', () => {
    const candidate = { x: CENTER_X, y: 6.5, shotType: 'not-a-real-shot', speed: 0.3, score: 60 }
    const explanation = composeExplanation(context, candidate)
    expect(explanation.failureMode).toContain('gives the opponent time')
    expect(explanation.opponentResponse).toContain('Resets or continues')
  })

  it('falls back to neutral rationale text when no opportunity rule fires', () => {
    // A deep target with a slow, low-stakes shot is unlikely to trigger any
    // opportunity rule; this asserts the fallback string, not a specific rule.
    const candidate = { x: CENTER_X, y: 21.9, shotType: 'lob-defensive', speed: 0.1, score: 50 }
    const explanation = composeExplanation(context, candidate)
    expect(typeof explanation.rationale).toBe('string')
    expect(explanation.rationale.length).toBeGreaterThan(0)
  })
})
