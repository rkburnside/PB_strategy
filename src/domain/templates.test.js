import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  SCENARIO_TEMPLATES,
  templatesForDivision,
  generateScenarioFromTemplate,
  generateRandomScenario,
} from './templates.js'
import { validateScenario } from './scenario.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('templatesForDivision', () => {
  it('returns the mixed-only template only for mixed', () => {
    expect(templatesForDivision('mixed').some((t) => t.id === 'mixed-stacked-isolation')).toBe(true)
    expect(templatesForDivision('mens').some((t) => t.id === 'mixed-stacked-isolation')).toBe(false)
    expect(templatesForDivision('womens').some((t) => t.id === 'mixed-stacked-isolation')).toBe(false)
  })

  it("returns every division-agnostic template for men's and women's", () => {
    const agnostic = SCENARIO_TEMPLATES.filter((t) => t.applicableDivisions.length === 3)
    expect(templatesForDivision('mens')).toHaveLength(agnostic.length)
    expect(templatesForDivision('womens')).toHaveLength(agnostic.length)
  })
})

describe('generateScenarioFromTemplate', () => {
  it('produces a scenario with no validation errors, for every template', () => {
    for (const template of SCENARIO_TEMPLATES) {
      const division = template.applicableDivisions[0]
      const scenario = generateScenarioFromTemplate(template, { division })
      expect(validateScenario(scenario)).toEqual([])
    }
  })

  it('applies no jitter when Math.random is pinned at the midpoint (0.5)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const template = SCENARIO_TEMPLATES[0]
    const scenario = generateScenarioFromTemplate(template, { division: 'mens' })
    scenario.players.forEach((p, i) => {
      expect(p.x).toBeCloseTo(template.basePlayers[i].x)
      expect(p.y).toBeCloseTo(template.basePlayers[i].y)
    })
    expect(scenario.ball.x).toBeCloseTo(template.ball.x)
    expect(scenario.ball.y).toBeCloseTo(template.ball.y)
  })

  it('keeps jittered values within the declared jitter range', () => {
    const template = SCENARIO_TEMPLATES[0]
    for (let trial = 0; trial < 20; trial++) {
      const scenario = generateScenarioFromTemplate(template, { division: 'mens' })
      scenario.players.forEach((p, i) => {
        expect(Math.abs(p.x - template.basePlayers[i].x)).toBeLessThanOrEqual(template.posJitterFt)
        expect(Math.abs(p.y - template.basePlayers[i].y)).toBeLessThanOrEqual(template.posJitterFt)
      })
    }
  })

  it('preserves gender assignment from the template (mixed template)', () => {
    const mixedTemplate = SCENARIO_TEMPLATES.find((t) => t.id === 'mixed-stacked-isolation')
    const scenario = generateScenarioFromTemplate(mixedTemplate, { division: 'mixed' })
    expect(scenario.players.map((p) => p.gender)).toEqual(['M', 'F', 'F', 'M'])
  })

  it('re-rolls handedness rather than always inheriting the template default', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // below LEFT_HANDED_RATE, forces left-handed
    const template = SCENARIO_TEMPLATES[0]
    const scenario = generateScenarioFromTemplate(template, { division: 'mens' })
    expect(scenario.players.every((p) => p.handedness === 'left')).toBe(true)
  })

  it('clamps incoming speed and balance to [0, 1] even under large jitter', () => {
    const scenario = generateScenarioFromTemplate(
      { ...SCENARIO_TEMPLATES[0], incomingSpeed: 0.05, userBalance: 0.02 },
      { division: 'mens' },
    )
    expect(scenario.incomingSpeed).toBeGreaterThanOrEqual(0)
    expect(scenario.incomingSpeed).toBeLessThanOrEqual(1)
    expect(scenario.userBalance).toBeGreaterThanOrEqual(0)
    expect(scenario.userBalance).toBeLessThanOrEqual(1)
  })
})

describe('generateRandomScenario', () => {
  it('only draws from templates applicable to the requested division', () => {
    for (let trial = 0; trial < 10; trial++) {
      const scenario = generateRandomScenario('mixed')
      expect(scenario.division).toBe('mixed')
    }
  })

  it('produces a valid scenario', () => {
    expect(validateScenario(generateRandomScenario('womens'))).toEqual([])
  })
})
