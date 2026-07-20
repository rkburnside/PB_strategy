// Scenario schema, defaults, and validation. See CLAUDE.md "Scenario Schema".
import { CENTER_X } from './court.js'

export const SHOT_TYPES = [
  'dink-cross',
  'dink-straight',
  'dink-middle',
  'third-shot-drop',
  'third-shot-drive',
  'speed-up-body',
  'speed-up-feet',
  'speed-up-shoulder',
  'reset',
  'lob-offensive',
  'lob-defensive',
  'punch-volley',
  'roll-volley',
  'deep-return',
  'block',
  'counter',
  'overhead',
  'serve-short',
  'serve-deep',
  'serve-wide',
  'serve-body',
]

export const SPEED_BANDS = [
  { id: 0, label: 'Touch' },
  { id: 1, label: 'Soft' },
  { id: 2, label: 'Medium' },
  { id: 3, label: 'Firm' },
  { id: 4, label: 'Full' },
]

export function createPlayer({ x, y, handedness = 'right', gender, role }) {
  return { x, y, handedness, gender, role }
}

export function createDefaultScenario() {
  return {
    players: [
      createPlayer({ x: CENTER_X - 3, y: -20, handedness: 'right', role: 'user' }),
      createPlayer({ x: CENTER_X + 3, y: -20, handedness: 'right', role: 'partner' }),
      createPlayer({ x: CENTER_X - 3, y: 6.5, handedness: 'right', role: 'opponent' }),
      createPlayer({ x: CENTER_X + 3, y: 6.5, handedness: 'right', role: 'opponent' }),
    ],
    ball: { x: CENTER_X - 3, y: -20, z: 3 },
    incomingShot: 'third-shot-drop',
    incomingSpeed: 0.3,
    ballHeightAtContact: 2.5,
    bounceState: 'afterBounce',
    userBalance: 0.9,
    division: 'mens',
    skillLevel: 4.0,
  }
}

export function validateScenario(scenario) {
  const errors = []
  if (!Array.isArray(scenario.players) || scenario.players.length !== 4) {
    errors.push('scenario.players must contain exactly 4 players')
  }
  if (scenario.division === 'mixed') {
    for (const p of scenario.players ?? []) {
      if (p.gender !== 'M' && p.gender !== 'F') {
        errors.push(`player at role ${p.role} must have gender M or F when division is mixed`)
      }
    }
  }
  if (!SHOT_TYPES.includes(scenario.incomingShot)) {
    errors.push(`unknown incomingShot: ${scenario.incomingShot}`)
  }
  return errors
}
