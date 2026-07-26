import { describe, it, expect } from 'vitest'
import {
  COURT,
  CENTER_X,
  netClearanceHeightFt,
  inBounds,
  inKitchen,
  depthCategory,
  distance,
  clamp,
  sideOf,
} from './court.js'

describe('CENTER_X', () => {
  it('is half the court width', () => {
    expect(CENTER_X).toBe(10)
  })
})

describe('netClearanceHeightFt', () => {
  it('returns the center height at the center line', () => {
    expect(netClearanceHeightFt(CENTER_X)).toBeCloseTo(COURT.netHeightCenterFt)
  })

  it('returns the sideline height at each sideline', () => {
    expect(netClearanceHeightFt(0)).toBeCloseTo(COURT.netHeightSidelineFt)
    expect(netClearanceHeightFt(COURT.widthFt)).toBeCloseTo(COURT.netHeightSidelineFt)
  })

  it('interpolates monotonically between center and sideline', () => {
    const atQuarter = netClearanceHeightFt(5)
    expect(atQuarter).toBeGreaterThan(COURT.netHeightCenterFt)
    expect(atQuarter).toBeLessThan(COURT.netHeightSidelineFt)
  })
})

describe('inBounds', () => {
  it('accepts points within the court rectangle', () => {
    expect(inBounds(10, 0)).toBe(true)
    expect(inBounds(0, -22)).toBe(true)
    expect(inBounds(20, 22)).toBe(true)
  })

  it('rejects points outside the court rectangle', () => {
    expect(inBounds(-1, 0)).toBe(false)
    expect(inBounds(21, 0)).toBe(false)
    expect(inBounds(10, 23)).toBe(false)
    expect(inBounds(10, -23)).toBe(false)
  })
})

describe('inKitchen', () => {
  it('accepts distances within the non-volley zone', () => {
    expect(inKitchen(0)).toBe(true)
    expect(inKitchen(7)).toBe(true)
    expect(inKitchen(-7)).toBe(true)
  })

  it('rejects distances beyond the kitchen', () => {
    expect(inKitchen(7.1)).toBe(false)
    expect(inKitchen(-8)).toBe(false)
  })
})

describe('depthCategory', () => {
  it('classifies the kitchen line', () => {
    expect(depthCategory(0)).toBe('kitchen')
    expect(depthCategory(7)).toBe('kitchen')
  })

  it('classifies the transition zone, including the 7.5ft boundary', () => {
    expect(depthCategory(7.5)).toBe('transition')
    expect(depthCategory(10)).toBe('transition')
    expect(depthCategory(13.9)).toBe('transition')
  })

  it('classifies mid-court', () => {
    expect(depthCategory(14)).toBe('midcourt')
    expect(depthCategory(17.9)).toBe('midcourt')
  })

  it('classifies the baseline and beyond', () => {
    expect(depthCategory(18)).toBe('baseline')
    expect(depthCategory(30)).toBe('baseline')
  })

  it('is symmetric across the net (uses absolute distance)', () => {
    expect(depthCategory(-10)).toBe(depthCategory(10))
    expect(depthCategory(-20)).toBe(depthCategory(20))
  })
})

describe('distance', () => {
  it('computes straight-line distance', () => {
    expect(distance(0, 0, 3, 4)).toBe(5)
    expect(distance(1, 1, 1, 1)).toBe(0)
  })
})

describe('clamp', () => {
  it('passes through values already in range', () => {
    expect(clamp(50, 0, 100)).toBe(50)
  })

  it('clamps below the minimum and above the maximum', () => {
    expect(clamp(-5, 0, 100)).toBe(0)
    expect(clamp(150, 0, 100)).toBe(100)
  })
})

describe('sideOf', () => {
  it('treats y=0 and negative y as the near (user) side', () => {
    expect(sideOf(0)).toBe('near')
    expect(sideOf(-5)).toBe('near')
  })

  it('treats positive y as the far (opponent) side', () => {
    expect(sideOf(5)).toBe('far')
  })
})
