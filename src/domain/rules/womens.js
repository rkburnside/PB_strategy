// Women's-division rule adjustments. See docs/DIVISIONS.md.

export const WOMENS_RULES = [
  {
    id: 'womens-premature-speedup-penalty',
    name: "Women's — premature speed-up penalty",
    condition: (ctx, target, shotType, speed) =>
      ctx.division === 'womens' &&
      ['speed-up-body', 'speed-up-feet', 'speed-up-shoulder'].includes(shotType) &&
      speed < 0.7,
    scoreDelta: -12,
    appliesToDivisions: ['womens'],
    explanation: 'Dink patterns extend here — patience has higher value, so a premature speed-up is penalized more.',
    category: 'risk',
  },
  {
    id: 'womens-reset-quality-bonus',
    name: "Women's — reset quality is higher",
    condition: (ctx, target, shotType) => ctx.division === 'womens' && shotType === 'reset',
    scoreDelta: 8,
    appliesToDivisions: ['womens'],
    explanation: 'Reset quality is higher on average — the expected reward for attacking a resettable ball drops.',
    category: 'opportunity',
  },
]
