// Precomputed context builder. Everything here runs once per input change,
// never in the evaluateTarget hot path. See CLAUDE.md "Derived State".
import { depthCategory, CENTER_X, netClearanceHeightFt } from './court.js'
import { resolveHandednessGeometry, detectHandednessConfig, middleSeamMultiplier } from './handedness.js'
import { rulesForDivision } from './rules/index.js'

function classifyFormation(a, b) {
  const da = depthCategory(a.y)
  const db = depthCategory(b.y)
  const bothUp = da === 'kitchen' && db === 'kitchen'
  const bothBack = (da === 'baseline' || da === 'midcourt') && (db === 'baseline' || db === 'midcourt')
  if (bothUp) return { type: 'both-up' }
  if (bothBack) return { type: 'both-back' }
  const upPlayer = da === 'kitchen' ? a : db === 'kitchen' ? b : null
  return { type: 'staggered', upPlayerRole: upPlayer?.role ?? null }
}

function teamGaps(a, b) {
  const [left, right] = a.x <= b.x ? [a, b] : [b, a]
  return {
    middleGapX: (left.x + right.x) / 2,
    middleGapWidth: right.x - left.x,
    leftSidelineGapFt: left.x,
    rightSidelineGapFt: 20 - right.x,
  }
}

const DIVISION_MULTIPLIERS = {
  mens: { paceTolerance: 1.2, resetValue: 0.9, counterProbability: 1.2 },
  womens: { paceTolerance: 0.85, resetValue: 1.2, counterProbability: 0.85 },
  mixed: { paceTolerance: 1.1, resetValue: 1.0, counterProbability: 1.1 },
}

const SKILL_BASELINE = 4.0

export function buildPrecomputedContext(scenario) {
  const { players, division, skillLevel, userBalance } = scenario
  const [user, partner, oppA, oppB] = players

  const perPlayer = players.map((p) => ({
    role: p.role,
    depthCategory: depthCategory(p.y),
    geometry: resolveHandednessGeometry(p),
  }))

  const userTeamConfig = detectHandednessConfig(user, partner)
  const opponentTeamConfig = detectHandednessConfig(oppA, oppB)

  const opponentFormation = classifyFormation(oppA, oppB)
  const userFormation = classifyFormation(user, partner)
  const opponentGaps = teamGaps(oppA, oppB)

  const divisionMods = DIVISION_MULTIPLIERS[division] ?? DIVISION_MULTIPLIERS.mens
  const skillDelta = skillLevel - SKILL_BASELINE

  return {
    scenario,
    players,
    perPlayer,
    userGeometry: perPlayer[0].geometry,
    partnerGeometry: perPlayer[1].geometry,
    opponentGeometries: [perPlayer[2].geometry, perPlayer[3].geometry],
    userTeamConfig,
    opponentTeamConfig,
    middleSeamMultiplier: middleSeamMultiplier(opponentTeamConfig),
    opponentFormation,
    userFormation,
    opponentGaps,
    division,
    divisionMods,
    skillLevel,
    skillDelta,
    userBalance,
    netClearanceAt: netClearanceHeightFt,
    centerX: CENTER_X,
    applicableRules: rulesForDivision(division),
  }
}
