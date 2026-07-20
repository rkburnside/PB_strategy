// Men's-division rule adjustments. See docs/DIVISIONS.md.
import { OFFENSIVE_SHOTS } from './base.js'

export const MENS_RULES = [
  {
    id: 'mens-counter-risk-on-speedup',
    name: "Men's — counter probability on speed-ups",
    condition: (ctx, target, shotType) =>
      ctx.division === 'mens' && ['speed-up-body', 'speed-up-feet', 'speed-up-shoulder'].includes(shotType),
    scoreDelta: -8,
    appliesToDivisions: ['mens'],
    explanation: "The pattern here counters speed-ups at a high rate — weight the follow-up risk accordingly.",
    category: 'risk',
  },
  {
    id: 'mens-tighter-hands-battle-time',
    name: "Men's — hands battles resolve faster",
    condition: (ctx, target, shotType) => ctx.division === 'mens' && shotType === 'punch-volley',
    scoreDelta: -5,
    appliesToDivisions: ['mens'],
    explanation: 'Hands battles resolve faster at the net — time available tightens.',
    category: 'execution',
  },
]
