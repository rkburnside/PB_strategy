// Declarative rule table. Rules are data, not nested conditionals, so they
// stay auditable and tunable without touching engine logic. See CLAUDE.md
// "Rules layer" and "Core rule principles".
import { distance, isBeyondLines, isShortOfNet, distanceToOutLine, COURT } from '../court.js'
import { isBackhandSide } from '../handedness.js'
import { depthBandFor, isServe } from '../shotProfiles.js'

// Depth and margin weights. Tunable; the per-shot depth windows themselves
// live in shotProfiles.js.
const DEPTH_BONUS = 12 // peak reward for landing on the ideal depth
const DEPTH_PENALTY_PER_FT = 6 // per foot outside the shot's depth window
const DEPTH_PENALTY_CAP = 40
const LINE_MARGIN_FT = 1.5 // how close to a line before margin risk applies
const LINE_RISK_BASE = 6
const LINE_RISK_SPEED = 10 // extra risk at full pace, where margin shrinks

export const OFFENSIVE_SHOTS = [
  'speed-up-body',
  'speed-up-feet',
  'speed-up-shoulder',
  'third-shot-drive',
  'punch-volley',
  'roll-volley',
  'overhead',
  'counter',
]

export const CONTROL_SHOTS = [
  'dink-cross',
  'dink-straight',
  'dink-middle',
  'third-shot-drop',
  'reset',
  'lob-defensive',
  'block',
]

function nearestOpponent(context, targetX, targetY) {
  const [oppA, oppB] = context.players.slice(2)
  const dA = distance(targetX, targetY, oppA.x, oppA.y)
  const dB = distance(targetX, targetY, oppB.x, oppB.y)
  return dA <= dB
    ? { player: oppA, geometry: context.opponentGeometries[0], dist: dA, index: 2 }
    : { player: oppB, geometry: context.opponentGeometries[1], dist: dB, index: 3 }
}

export const BASE_RULES = [
  {
    id: 'height-below-net-suppress-attack',
    name: 'Below net height — do not attack',
    condition: (ctx, target, shotType) =>
      ctx.scenario.ballHeightAtContact < ctx.netClearanceAt(ctx.scenario.ball.x) && OFFENSIVE_SHOTS.includes(shotType),
    scoreDelta: -35,
    appliesToDivisions: ['mens', 'womens', 'mixed'],
    explanation: 'Ball is below net height — attacking from here is low-percentage. Reset or dink.',
    category: 'risk',
  },
  {
    id: 'height-above-net-at-kitchen-attack',
    name: 'Above net height at the kitchen — attack',
    condition: (ctx, target, shotType) =>
      ctx.scenario.ballHeightAtContact > ctx.netClearanceAt(ctx.scenario.ball.x) &&
      ctx.perPlayer[0].depthCategory === 'kitchen' &&
      OFFENSIVE_SHOTS.includes(shotType),
    scoreDelta: 25,
    appliesToDivisions: ['mens', 'womens', 'mixed'],
    explanation: 'Ball arrives above net height at the kitchen line — this is an attacking opportunity.',
    category: 'opportunity',
  },
  {
    id: 'target-player-back-or-transition',
    name: 'Target the player who is back or in transition',
    condition: (ctx, target) => {
      const { player } = nearestOpponent(ctx, target.x, target.y)
      return (
        player.role === 'opponent' &&
        ['transition', 'midcourt', 'baseline'].includes(ctx.perPlayer.find((p) => p.role === player.role).depthCategory)
      )
    },
    scoreDelta: 20,
    appliesToDivisions: ['mens', 'womens', 'mixed'],
    explanation: 'Target lands on a player who is back or in transition, not set at the net.',
    category: 'opportunity',
  },
  {
    id: 'avoid-set-kitchen-opponent',
    name: "Don't attack a set kitchen-line opponent",
    condition: (ctx, target) => {
      const { player, dist } = nearestOpponent(ctx, target.x, target.y)
      const depth = ctx.perPlayer.find((p, i) => i >= 2 && p.role === player.role)?.depthCategory
      return depth === 'kitchen' && dist < 3
    },
    scoreDelta: -15,
    appliesToDivisions: ['mens', 'womens', 'mixed'],
    explanation: 'This opponent is set and balanced at the kitchen line — low value without an exposed opening.',
    category: 'risk',
  },
  {
    id: 'middle-seam-weighted-by-handedness',
    name: 'Middle seam, weighted by handedness configuration',
    condition: (ctx) => ctx.opponentFormation.type === 'both-up',
    scoreDelta: (ctx, target) => {
      const distFromGap = Math.abs(target.x - ctx.opponentGaps.middleGapX)
      if (distFromGap > 3) return 0
      const base = 15 * (1 - distFromGap / 3)
      return base * ctx.middleSeamMultiplier
    },
    appliesToDivisions: ['mens', 'womens', 'mixed'],
    explanation: 'Middle-seam value is derived from the handedness configuration — forehands-middle inverts it.',
    category: 'opportunity',
  },
  {
    id: 'transition-opponent-balls-at-feet',
    name: 'Feed transition-zone opponents at their feet',
    condition: (ctx, target) => {
      const { player, dist } = nearestOpponent(ctx, target.x, target.y)
      const depth = ctx.perPlayer.find((p) => p.role === player.role)?.depthCategory
      return depth === 'transition' && dist < 2.5
    },
    scoreDelta: 18,
    appliesToDivisions: ['mens', 'womens', 'mixed'],
    explanation: 'A transition-zone opponent should get the ball at their feet — no exceptions.',
    category: 'opportunity',
  },
  {
    id: 'off-balance-user-must-reset',
    name: 'Off-balance user suppresses offense',
    condition: (ctx, target, shotType) => ctx.userBalance < 0.5 && OFFENSIVE_SHOTS.includes(shotType),
    scoreDelta: -50,
    appliesToDivisions: ['mens', 'womens', 'mixed'],
    explanation: 'User is off balance — offensive candidates are suppressed until balance is recovered.',
    category: 'execution',
  },
  {
    id: 'partner-exposure-vetoes-crosscourt-speedup',
    name: 'Partner exposure vetoes cross-court speed-ups',
    condition: (ctx, target, shotType) => {
      const partnerX = ctx.players[1].x
      const partnerPulledWide = Math.abs(partnerX - ctx.centerX) > 6
      const isCrossCourtSpeedUp =
        OFFENSIVE_SHOTS.includes(shotType) &&
        Math.sign(target.x - ctx.players[0].x) !== 0 &&
        Math.abs(target.x - ctx.players[0].x) > 5
      return partnerPulledWide && isCrossCourtSpeedUp
    },
    scoreDelta: -25,
    appliesToDivisions: ['mens', 'womens', 'mixed'],
    explanation: 'Partner is pulled wide — a cross-court speed-up here invites a counter into the open lane.',
    category: 'risk',
  },
  {
    id: 'body-jam-bonus',
    name: 'Body-jam target on the dominant-hand hip',
    condition: (ctx, target, shotType) => {
      const { geometry, dist } = nearestOpponent(ctx, target.x, target.y)
      return OFFENSIVE_SHOTS.includes(shotType) && Math.abs(target.x - geometry.bodyJamX) < 1 && dist < 4
    },
    scoreDelta: 15,
    appliesToDivisions: ['mens', 'womens', 'mixed'],
    explanation: 'Target crowds the dominant-hand hip, jamming the swing.',
    category: 'opportunity',
  },
  {
    id: 'backhand-attack-bonus',
    name: 'Attack the resolved backhand side',
    condition: (ctx, target) => {
      const { player, geometry } = nearestOpponent(ctx, target.x, target.y)
      return isBackhandSide(player, geometry, target.x)
    },
    scoreDelta: 12,
    appliesToDivisions: ['mens', 'womens', 'mixed'],
    explanation: 'Target falls on the resolved backhand side for this matchup.',
    category: 'opportunity',
  },
  {
    id: 'net-clearance-risk',
    name: 'Net clearance risk',
    condition: (ctx, target, shotType) =>
      OFFENSIVE_SHOTS.includes(shotType) && ctx.scenario.ballHeightAtContact < ctx.netClearanceAt(target.x) + 0.5,
    scoreDelta: (ctx, target, shotType, speed) => -10 - 10 * speed,
    appliesToDivisions: ['mens', 'womens', 'mixed'],
    explanation: 'Insufficient net clearance for the pace attempted raises error probability.',
    category: 'risk',
  },
  {
    id: 'division-pace-tolerance',
    name: 'Division pace tolerance',
    condition: (ctx, target, shotType, speed) => OFFENSIVE_SHOTS.includes(shotType) && speed > 0.6,
    scoreDelta: (ctx) => (ctx.divisionMods.paceTolerance - 1) * 15,
    appliesToDivisions: ['mens', 'womens', 'mixed'],
    explanation: 'Division pace tolerance shifts how much a fast shot is rewarded or punished.',
    category: 'risk',
  },

  // --- Bounds and depth -----------------------------------------------
  // Without these the surface is depth-blind: a dink scores the same landing
  // a foot past the net as it does on the baseline.

  {
    id: 'target-out-of-bounds',
    name: 'Target lands out',
    condition: (ctx, target) => isBeyondLines(target.x, target.y),
    scoreDelta: -45,
    appliesToDivisions: ['mens', 'womens', 'mixed'],
    explanation: 'Target is beyond the lines — this ball is out.',
    category: 'risk',
  },
  {
    id: 'target-short-of-net',
    name: 'Target is short of the net',
    condition: (ctx, target) => isShortOfNet(target.y),
    scoreDelta: -45,
    appliesToDivisions: ['mens', 'womens', 'mixed'],
    explanation: 'Target never crosses the net plane.',
    category: 'risk',
  },
  {
    id: 'line-margin-risk',
    name: 'Little margin to the line',
    condition: (ctx, target) =>
      !isBeyondLines(target.x, target.y) &&
      !isShortOfNet(target.y) &&
      distanceToOutLine(target.x, target.y) < LINE_MARGIN_FT,
    scoreDelta: (ctx, target, shotType, speed) => {
      const closeness = 1 - distanceToOutLine(target.x, target.y) / LINE_MARGIN_FT
      return -closeness * (LINE_RISK_BASE + LINE_RISK_SPEED * speed)
    },
    appliesToDivisions: ['mens', 'womens', 'mixed'],
    explanation: 'Painting this close to the line leaves no margin, and the margin shrinks as pace goes up.',
    category: 'risk',
  },
  {
    id: 'serve-must-clear-kitchen',
    name: 'Serve into the non-volley zone is a fault',
    condition: (ctx, target, shotType) => isServe(shotType) && target.y > 0 && target.y <= COURT.kitchenDepthFt,
    scoreDelta: -50,
    appliesToDivisions: ['mens', 'womens', 'mixed'],
    explanation: 'A serve landing in the non-volley zone is a fault.',
    category: 'risk',
  },
  {
    id: 'depth-in-band',
    name: 'Landing depth suits the shot',
    condition: (ctx, target, shotType) => {
      const band = depthBandFor(shotType)
      return target.y >= band.min && target.y <= band.max
    },
    scoreDelta: (ctx, target, shotType) => {
      const band = depthBandFor(shotType)
      const spread = Math.max(band.ideal - band.min, band.max - band.ideal) || 1
      const offBy = Math.abs(target.y - band.ideal) / spread
      return DEPTH_BONUS * Math.max(0, 1 - offBy)
    },
    appliesToDivisions: ['mens', 'womens', 'mixed'],
    explanation: 'Landing depth fits the shot — it arrives as the ball you intended.',
    category: 'opportunity',
  },
  {
    id: 'depth-out-of-band',
    name: 'Landing depth wrong for the shot',
    condition: (ctx, target, shotType) => {
      const band = depthBandFor(shotType)
      return target.y < band.min || target.y > band.max
    },
    scoreDelta: (ctx, target, shotType) => {
      const band = depthBandFor(shotType)
      const overshoot = target.y > band.max ? target.y - band.max : band.min - target.y
      return -Math.min(DEPTH_PENALTY_CAP, overshoot * DEPTH_PENALTY_PER_FT)
    },
    appliesToDivisions: ['mens', 'womens', 'mixed'],
    explanation:
      'Landing depth is wrong for this shot: a dink that carries becomes an attackable floater, a drive that lands short is a free ball.',
    category: 'risk',
  },
]
