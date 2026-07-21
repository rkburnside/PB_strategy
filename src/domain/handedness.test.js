import { describe, it, expect } from 'vitest'
import {
  resolveHandednessGeometry,
  detectHandednessConfig,
  middleSeamMultiplier,
  isBackhandSide,
  isForehandSide,
} from './handedness.js'

// Matches docs/DIVISIONS.md's comparative table exactly: a right-handed
// player on the right side of the court has their backhand facing the
// middle; on the left side, their forehand faces the middle.
describe('resolveHandednessGeometry', () => {
  it('gives a right-hander on the left side a forehand facing the middle', () => {
    const geom = resolveHandednessGeometry({ x: 3, handedness: 'right' })
    expect(geom.side).toBe('left')
    expect(geom.forehandTowardMiddle).toBe(true)
    expect(geom.forehandXDir).toBe(1) // toward increasing x, i.e. toward center
  })

  it('gives a right-hander on the right side a backhand facing the middle', () => {
    const geom = resolveHandednessGeometry({ x: 17, handedness: 'right' })
    expect(geom.side).toBe('right')
    expect(geom.forehandTowardMiddle).toBe(false)
    expect(geom.backhandXDir).toBe(-1) // toward decreasing x, i.e. toward center
  })

  it('mirrors for a left-hander on the left side (backhand faces middle)', () => {
    const geom = resolveHandednessGeometry({ x: 3, handedness: 'left' })
    expect(geom.forehandTowardMiddle).toBe(false)
  })

  it('mirrors for a left-hander on the right side (forehand faces middle)', () => {
    const geom = resolveHandednessGeometry({ x: 17, handedness: 'left' })
    expect(geom.forehandTowardMiddle).toBe(true)
  })

  it('places the body-jam zone on the forehand (dominant-hand) side', () => {
    const geom = resolveHandednessGeometry({ x: 3, handedness: 'right' })
    const jamOffset = geom.bodyJamX - 3
    expect(Math.sign(jamOffset)).toBe(geom.forehandXDir)
  })

  it('gives the forehand envelope a larger reach than the backhand', () => {
    const geom = resolveHandednessGeometry({ x: 3, handedness: 'right' })
    expect(geom.forehandReachFt).toBeGreaterThan(geom.backhandReachFt)
  })
})

describe('detectHandednessConfig', () => {
  it('detects both-right when both players are right-handed', () => {
    const config = detectHandednessConfig({ x: 3, handedness: 'right' }, { x: 17, handedness: 'right' })
    expect(config).toBe('both-right')
  })

  it('detects both-left when both players are left-handed', () => {
    const config = detectHandednessConfig({ x: 3, handedness: 'left' }, { x: 17, handedness: 'left' })
    expect(config).toBe('both-left')
  })

  it('detects opposite-forehands-middle: left-side righty + right-side lefty', () => {
    const config = detectHandednessConfig({ x: 3, handedness: 'right' }, { x: 17, handedness: 'left' })
    expect(config).toBe('opposite-forehands-middle')
  })

  it('detects opposite-backhands-middle: left-side lefty + right-side righty', () => {
    const config = detectHandednessConfig({ x: 3, handedness: 'left' }, { x: 17, handedness: 'right' })
    expect(config).toBe('opposite-backhands-middle')
  })

  it('is order-independent for the same-handedness cases', () => {
    const a = detectHandednessConfig({ x: 3, handedness: 'right' }, { x: 17, handedness: 'right' })
    const b = detectHandednessConfig({ x: 17, handedness: 'right' }, { x: 3, handedness: 'right' })
    expect(a).toBe(b)
  })
})

describe('middleSeamMultiplier', () => {
  it('makes the middle cold for forehands-middle', () => {
    expect(middleSeamMultiplier('opposite-forehands-middle')).toBeLessThan(0)
  })

  it('makes the middle stronger than base for backhands-middle', () => {
    expect(middleSeamMultiplier('opposite-backhands-middle')).toBeGreaterThan(1)
  })

  it('uses the base weight (1.0) for same-handedness configurations', () => {
    expect(middleSeamMultiplier('both-right')).toBe(1.0)
    expect(middleSeamMultiplier('both-left')).toBe(1.0)
  })
})

describe('isBackhandSide / isForehandSide', () => {
  it('flags a target just inside the backhand envelope as backhand side', () => {
    const player = { x: 3, handedness: 'right' }
    const geom = resolveHandednessGeometry(player)
    // backhand faces away from the middle for a left-side right-hander
    const backhandTarget = player.x + geom.backhandXDir * 1
    expect(isBackhandSide(player, geom, backhandTarget)).toBe(true)
    expect(isForehandSide(player, geom, backhandTarget)).toBe(false)
  })

  it('does not flag a target beyond the backhand reach envelope', () => {
    const player = { x: 3, handedness: 'right' }
    const geom = resolveHandednessGeometry(player)
    const farBeyondReach = player.x + geom.backhandXDir * (geom.backhandReachFt + 5)
    expect(isBackhandSide(player, geom, farBeyondReach)).toBe(false)
  })

  it('does not flag the player position itself as either side', () => {
    const player = { x: 3, handedness: 'right' }
    const geom = resolveHandednessGeometry(player)
    expect(isBackhandSide(player, geom, player.x)).toBe(false)
    expect(isForehandSide(player, geom, player.x)).toBe(false)
  })
})
