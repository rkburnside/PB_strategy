import { describe, it, expect } from 'vitest'
import { evaluateTarget, explainTarget } from './evaluate.js'
import { buildPrecomputedContext } from './derive.js'
import { createDefaultScenario } from './scenario.js'
import { COURT, CENTER_X, isBeyondLines, isShortOfNet, distanceToOutLine } from './court.js'
import { depthBandFor, SHOT_DEPTH_BANDS } from './shotProfiles.js'

const context = buildPrecomputedContext(createDefaultScenario())
const firedIds = (x, y, shot, speed = 0.3) => explainTarget(context, x, y, shot, speed).map((r) => r.id)

// A lane down the middle of the left service court, clear of both opponents
// (who sit at x = 7 and x = 13), so depth is the only thing varying.
const LANE_X = 3

describe('court bounds helpers', () => {
  it('flags targets past the sidelines and baseline as out', () => {
    expect(isBeyondLines(-0.5, 10)).toBe(true)
    expect(isBeyondLines(COURT.widthFt + 0.5, 10)).toBe(true)
    expect(isBeyondLines(10, COURT.lengthHalfFt + 0.5)).toBe(true)
    expect(isBeyondLines(10, 10)).toBe(false)
  })

  it('flags targets on the near side of the net plane', () => {
    expect(isShortOfNet(0)).toBe(true)
    expect(isShortOfNet(-3)).toBe(true)
    expect(isShortOfNet(0.5)).toBe(false)
  })

  it('measures distance to the nearest out line', () => {
    expect(distanceToOutLine(CENTER_X, 11)).toBeCloseTo(10) // middle of the court
    expect(distanceToOutLine(1, 11)).toBeCloseTo(1) // near the left sideline
    expect(distanceToOutLine(CENTER_X, 21)).toBeCloseTo(1) // near the baseline
  })
})

describe('depth rules', () => {
  it('scores a dink best in the kitchen and worst at the baseline', () => {
    const inKitchen = evaluateTarget(context, LANE_X, 5, 'dink-cross', 0.3)
    const atBaseline = evaluateTarget(context, LANE_X, 21, 'dink-cross', 0.3)
    expect(inKitchen).toBeGreaterThan(atBaseline)
  })

  it('scores a drive best deep and worst dropped short', () => {
    const deep = evaluateTarget(context, LANE_X, 17, 'third-shot-drive', 0.8)
    const short = evaluateTarget(context, LANE_X, 3, 'third-shot-drive', 0.8)
    expect(deep).toBeGreaterThan(short)
  })

  it('is no longer depth-blind — the surface varies with depth for a dink', () => {
    const scores = [1, 5, 9, 14, 18, 22].map((y) => evaluateTarget(context, LANE_X, y, 'dink-cross', 0.3))
    expect(new Set(scores).size).toBeGreaterThan(1)
  })

  it('fires the in-band bonus inside the window and the penalty outside it', () => {
    expect(firedIds(LANE_X, 5, 'dink-cross')).toContain('depth-in-band')
    expect(firedIds(LANE_X, 5, 'dink-cross')).not.toContain('depth-out-of-band')
    expect(firedIds(LANE_X, 20, 'dink-cross')).toContain('depth-out-of-band')
    expect(firedIds(LANE_X, 20, 'dink-cross')).not.toContain('depth-in-band')
  })

  it('peaks the depth bonus at the ideal landing depth for every shot type', () => {
    for (const [shotType, band] of Object.entries(SHOT_DEPTH_BANDS)) {
      const bonusAt = (y) => {
        const rule = explainTarget(context, LANE_X, y, shotType, 0.3).find((r) => r.id === 'depth-in-band')
        return rule ? rule.delta : 0
      }
      expect(bonusAt(band.ideal)).toBeGreaterThanOrEqual(bonusAt(band.min))
      expect(bonusAt(band.ideal)).toBeGreaterThanOrEqual(bonusAt(band.max))
    }
  })

  it('caps the out-of-band penalty so one rule cannot swamp the surface', () => {
    const rule = explainTarget(context, LANE_X, 22, 'dink-cross', 0.3).find((r) => r.id === 'depth-out-of-band')
    expect(rule.delta).toBeGreaterThanOrEqual(-40)
  })

  it('falls back to a default band for an unknown shot type', () => {
    expect(depthBandFor('not-a-real-shot')).toEqual(depthBandFor('another-unknown'))
    expect(() => evaluateTarget(context, LANE_X, 10, 'not-a-real-shot', 0.3)).not.toThrow()
  })
})

describe('out-of-bounds rules', () => {
  it('penalises a target past the sideline', () => {
    expect(firedIds(-1, 5, 'dink-cross')).toContain('target-out-of-bounds')
    expect(evaluateTarget(context, -1, 5, 'dink-cross', 0.3)).toBeLessThan(
      evaluateTarget(context, LANE_X, 5, 'dink-cross', 0.3),
    )
  })

  it('penalises a target past the baseline', () => {
    expect(firedIds(LANE_X, 24, 'third-shot-drive', 0.8)).toContain('target-out-of-bounds')
  })

  it('penalises a target that never crosses the net', () => {
    expect(firedIds(LANE_X, -2, 'dink-cross')).toContain('target-short-of-net')
  })

  it('does not fire bounds penalties for a legal in-court target', () => {
    const ids = firedIds(LANE_X, 5, 'dink-cross')
    expect(ids).not.toContain('target-out-of-bounds')
    expect(ids).not.toContain('target-short-of-net')
  })
})

describe('line margin rule', () => {
  it('fires near a line and not in the middle of the court', () => {
    expect(firedIds(0.3, 11, 'punch-volley', 0.5)).toContain('line-margin-risk')
    expect(firedIds(CENTER_X, 11, 'punch-volley', 0.5)).not.toContain('line-margin-risk')
  })

  it('penalises harder at higher pace, since margin shrinks with speed', () => {
    const deltaAt = (speed) =>
      explainTarget(context, 0.3, 11, 'punch-volley', speed).find((r) => r.id === 'line-margin-risk').delta
    expect(deltaAt(0.9)).toBeLessThan(deltaAt(0.1))
  })

  it('does not fire outside the lines, where the out-of-bounds rule takes over', () => {
    expect(firedIds(-1, 11, 'punch-volley', 0.5)).not.toContain('line-margin-risk')
  })
})

describe('serve kitchen fault', () => {
  it('penalises a serve landing in the non-volley zone', () => {
    expect(firedIds(LANE_X, 4, 'serve-deep', 0.5)).toContain('serve-must-clear-kitchen')
  })

  it('does not fire for a serve that clears the kitchen', () => {
    expect(firedIds(LANE_X, 18, 'serve-deep', 0.5)).not.toContain('serve-must-clear-kitchen')
  })

  it('does not apply the fault to non-serve shots in the kitchen', () => {
    expect(firedIds(LANE_X, 4, 'dink-cross')).not.toContain('serve-must-clear-kitchen')
  })
})
