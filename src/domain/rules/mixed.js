// Mixed-division rule adjustments. Mixed is not a modifier on the base case;
// it has its own targeting dimension. See docs/DIVISIONS.md.
import { distance } from '../court.js'
import { OFFENSIVE_SHOTS } from './base.js'

function femaleOpponent(ctx) {
  const [oppA, oppB] = ctx.players.slice(2)
  const femaleIdx = oppA.gender === 'F' ? 2 : oppB.gender === 'F' ? 3 : null
  if (femaleIdx === null) return null
  return { player: ctx.players[femaleIdx], depth: ctx.perPlayer[femaleIdx].depthCategory }
}

export const MIXED_RULES = [
  {
    id: 'mixed-isolation-targeting',
    name: 'Mixed — isolation targeting toward the contained player',
    condition: (ctx, target) => {
      const f = femaleOpponent(ctx)
      if (!f) return false
      const balancedAtKitchen = f.depth === 'kitchen'
      return !balancedAtKitchen && distance(target.x, target.y, f.player.x, f.player.y) < 3.5
    },
    scoreDelta: 14,
    appliesToDivisions: ['mixed'],
    explanation:
      'Isolation targeting away from the more aggressive court position is the dominant 4.0+ mixed pattern.',
    category: 'opportunity',
  },
  {
    id: 'mixed-middle-reweight-down',
    name: 'Mixed — middle re-weighted downward',
    condition: (ctx) => ctx.opponentFormation.type === 'both-up',
    scoreDelta: (ctx, target) => {
      if (ctx.division !== 'mixed') return 0
      const distFromGap = Math.abs(target.x - ctx.opponentGaps.middleGapX)
      return distFromGap < 3 ? -8 * (1 - distFromGap / 3) : 0
    },
    appliesToDivisions: ['mixed'],
    explanation: 'The male player typically covers more middle in mixed — base middle-gap value is re-weighted down.',
    category: 'risk',
  },
  {
    id: 'mixed-drop-tolerance',
    name: 'Mixed — harsher drop-float punishment',
    condition: (ctx, target, shotType) => ctx.division === 'mixed' && shotType === 'third-shot-drop',
    scoreDelta: -6,
    appliesToDivisions: ['mixed'],
    explanation: 'Third-shot drops face harsher punishment when they float — the poaching player attacks them.',
    category: 'risk',
  },
]
