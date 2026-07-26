import { describe, it, expect } from 'vitest'
import { createDefaultScenario, createPlayer, validateScenario, SHOT_TYPES } from './scenario.js'

describe('createDefaultScenario', () => {
  it('produces a scenario with no validation errors', () => {
    expect(validateScenario(createDefaultScenario())).toEqual([])
  })

  it('has exactly 4 players in the required roles', () => {
    const scenario = createDefaultScenario()
    expect(scenario.players).toHaveLength(4)
    expect(scenario.players.map((p) => p.role)).toEqual(['user', 'partner', 'opponent', 'opponent'])
  })

  it('uses a known shot type', () => {
    expect(SHOT_TYPES).toContain(createDefaultScenario().incomingShot)
  })
})

describe('validateScenario', () => {
  it('flags a player count other than 4', () => {
    const scenario = createDefaultScenario()
    scenario.players = scenario.players.slice(0, 3)
    const errors = validateScenario(scenario)
    expect(errors.some((e) => e.includes('4 players'))).toBe(true)
  })

  it('flags missing gender on any player when division is mixed', () => {
    const scenario = createDefaultScenario()
    scenario.division = 'mixed'
    // no gender set on any player
    const errors = validateScenario(scenario)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.every((e) => e.includes('gender'))).toBe(true)
  })

  it('passes when mixed division has gender set on every player', () => {
    const scenario = createDefaultScenario()
    scenario.division = 'mixed'
    scenario.players = scenario.players.map((p, i) => ({ ...p, gender: i % 2 === 0 ? 'M' : 'F' }))
    expect(validateScenario(scenario)).toEqual([])
  })

  it('flags an unknown incoming shot type', () => {
    const scenario = createDefaultScenario()
    scenario.incomingShot = 'not-a-real-shot'
    const errors = validateScenario(scenario)
    expect(errors.some((e) => e.includes('incomingShot'))).toBe(true)
  })
})

describe('createPlayer', () => {
  it('defaults to right-handed when handedness is omitted', () => {
    const player = createPlayer({ x: 1, y: 2, role: 'user' })
    expect(player.handedness).toBe('right')
  })
})
