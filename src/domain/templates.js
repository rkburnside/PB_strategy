// Scenario template library with per-field jitter, needed before Quiz mode.
// Uniform-random scenarios produce nonsensical situations that never occur
// in real play; templates plus jitter keep generated scenarios plausible.
// See docs/MODES.md "Mode 4: Quiz" and docs/RALLY.md "Template structure".
import { CENTER_X } from './court.js'
import { createPlayer } from './scenario.js'

function jitterValue(base, range) {
  return base + (Math.random() * 2 - 1) * range
}

function jitterPlayer(base, posRange) {
  return { ...base, x: jitterValue(base.x, posRange), y: jitterValue(base.y, posRange) }
}

const LEFT_HANDED_RATE = 0.12 // realistic-ish rate of left-handed players

function rollHandedness() {
  return Math.random() < LEFT_HANDED_RATE ? 'left' : 'right'
}

export const SCENARIO_TEMPLATES = [
  {
    id: 'both-up-neutral-dink',
    name: 'Both teams at the kitchen line',
    basePlayers: [
      createPlayer({ x: CENTER_X - 3, y: -6.5, handedness: 'right', role: 'user' }),
      createPlayer({ x: CENTER_X + 3, y: -6.5, handedness: 'right', role: 'partner' }),
      createPlayer({ x: CENTER_X - 3, y: 6.5, handedness: 'right', role: 'opponent' }),
      createPlayer({ x: CENTER_X + 3, y: 6.5, handedness: 'right', role: 'opponent' }),
    ],
    ball: { x: CENTER_X - 3, y: -3, z: 2.5 },
    incomingShot: 'dink-cross',
    incomingSpeed: 0.15,
    ballHeightAtContact: 2.2,
    bounceState: 'volley',
    userBalance: 0.95,
    posJitterFt: 1.5,
    heightJitterFt: 0.6,
    applicableDivisions: ['mens', 'womens', 'mixed'],
  },
  {
    id: 'third-shot-drop-vs-set-opponents',
    name: 'Third shot — opponents set at the line',
    basePlayers: [
      createPlayer({ x: CENTER_X - 3, y: -20, handedness: 'right', role: 'user' }),
      createPlayer({ x: CENTER_X + 3, y: -20, handedness: 'right', role: 'partner' }),
      createPlayer({ x: CENTER_X - 3, y: 6.5, handedness: 'right', role: 'opponent' }),
      createPlayer({ x: CENTER_X + 3, y: 6.5, handedness: 'right', role: 'opponent' }),
    ],
    ball: { x: CENTER_X - 3, y: -20, z: 3 },
    incomingShot: 'deep-return',
    incomingSpeed: 0.35,
    ballHeightAtContact: 2.0,
    bounceState: 'afterBounce',
    userBalance: 0.85,
    posJitterFt: 2,
    heightJitterFt: 0.8,
    applicableDivisions: ['mens', 'womens', 'mixed'],
  },
  {
    id: 'transition-zone-caught-mid',
    name: 'Caught in the transition zone',
    basePlayers: [
      createPlayer({ x: CENTER_X - 2, y: -10, handedness: 'right', role: 'user' }),
      createPlayer({ x: CENTER_X + 4, y: -7, handedness: 'right', role: 'partner' }),
      createPlayer({ x: CENTER_X - 3, y: 6.5, handedness: 'right', role: 'opponent' }),
      createPlayer({ x: CENTER_X + 3, y: 6.5, handedness: 'right', role: 'opponent' }),
    ],
    ball: { x: CENTER_X - 2, y: -10, z: 1.8 },
    incomingShot: 'speed-up-feet',
    incomingSpeed: 0.6,
    ballHeightAtContact: 1.6,
    bounceState: 'volley',
    userBalance: 0.55,
    posJitterFt: 2,
    heightJitterFt: 0.5,
    applicableDivisions: ['mens', 'womens', 'mixed'],
  },
  {
    id: 'high-ball-attack-opportunity',
    name: 'Floated ball above the net at the kitchen',
    basePlayers: [
      createPlayer({ x: CENTER_X - 3, y: -6.5, handedness: 'right', role: 'user' }),
      createPlayer({ x: CENTER_X + 3, y: -6.5, handedness: 'right', role: 'partner' }),
      createPlayer({ x: CENTER_X - 3, y: 6.5, handedness: 'right', role: 'opponent' }),
      createPlayer({ x: CENTER_X + 3, y: 6.5, handedness: 'right', role: 'opponent' }),
    ],
    ball: { x: CENTER_X - 3, y: -6.5, z: 4.5 },
    incomingShot: 'third-shot-drop',
    incomingSpeed: 0.2,
    ballHeightAtContact: 4.2,
    bounceState: 'volley',
    userBalance: 0.9,
    posJitterFt: 1.5,
    heightJitterFt: 0.5,
    applicableDivisions: ['mens', 'womens', 'mixed'],
  },
  {
    id: 'partner-pulled-wide',
    name: 'Partner pulled wide, lane exposed',
    basePlayers: [
      createPlayer({ x: CENTER_X - 3, y: -6.5, handedness: 'right', role: 'user' }),
      createPlayer({ x: 2, y: -6.5, handedness: 'right', role: 'partner' }),
      createPlayer({ x: CENTER_X - 3, y: 6.5, handedness: 'right', role: 'opponent' }),
      createPlayer({ x: CENTER_X + 3, y: 6.5, handedness: 'right', role: 'opponent' }),
    ],
    ball: { x: CENTER_X - 3, y: -6.5, z: 2.4 },
    incomingShot: 'dink-straight',
    incomingSpeed: 0.2,
    ballHeightAtContact: 2.3,
    bounceState: 'volley',
    userBalance: 0.9,
    posJitterFt: 1.5,
    heightJitterFt: 0.5,
    applicableDivisions: ['mens', 'womens', 'mixed'],
  },
  {
    id: 'mixed-stacked-isolation',
    name: 'Mixed — stacked, isolating a target',
    basePlayers: [
      createPlayer({ x: 5, y: -6.5, handedness: 'right', gender: 'M', role: 'user' }),
      createPlayer({ x: 15, y: -6.5, handedness: 'right', gender: 'F', role: 'partner' }),
      createPlayer({ x: 6, y: 6.5, handedness: 'right', gender: 'F', role: 'opponent' }),
      createPlayer({ x: 14, y: 6.5, handedness: 'right', gender: 'M', role: 'opponent' }),
    ],
    ball: { x: 5, y: -6.5, z: 2.3 },
    incomingShot: 'dink-cross',
    incomingSpeed: 0.15,
    ballHeightAtContact: 2.2,
    bounceState: 'volley',
    userBalance: 0.9,
    posJitterFt: 1.5,
    heightJitterFt: 0.5,
    applicableDivisions: ['mixed'],
  },
]

export function templatesForDivision(division) {
  return SCENARIO_TEMPLATES.filter((t) => t.applicableDivisions.includes(division))
}

// Generates a jittered, randomized scenario from a template. Left-handed
// players and (for mixed) gender assignment are re-rolled each time so
// repeated attempts don't memorize a single answer.
export function generateScenarioFromTemplate(template, { division } = {}) {
  const targetDivision = division ?? template.applicableDivisions[0]
  const players = template.basePlayers.map((p) => {
    const jittered = jitterPlayer(p, template.posJitterFt)
    return { ...jittered, handedness: rollHandedness() }
  })

  return {
    players,
    ball: {
      ...template.ball,
      x: jitterValue(template.ball.x, template.posJitterFt),
      y: jitterValue(template.ball.y, template.posJitterFt),
    },
    incomingShot: template.incomingShot,
    incomingSpeed: Math.min(1, Math.max(0, jitterValue(template.incomingSpeed, 0.1))),
    ballHeightAtContact: Math.max(0.5, jitterValue(template.ballHeightAtContact, template.heightJitterFt)),
    bounceState: template.bounceState,
    userBalance: Math.min(1, Math.max(0, jitterValue(template.userBalance, 0.1))),
    division: targetDivision,
    skillLevel: 4.0,
    templateId: template.id,
    templateName: template.name,
  }
}

export function generateRandomScenario(division) {
  const pool = templatesForDivision(division)
  const template = pool[Math.floor(Math.random() * pool.length)]
  return generateScenarioFromTemplate(template, { division })
}
