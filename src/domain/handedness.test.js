import { describe, it, expect } from 'vitest'
import {
  resolveHandednessGeometry,
  detectHandednessConfig,
  middleSeamMultiplier,
  isBackhandSide,
  isForehandSide,
  facingSign,
  paddleXDir,
} from './handedness.js'

// Near-side players (negative y) are the user's team; far-side players
// (positive y) are opponents, who face the viewer.
const NEAR_Y = -6.5
const FAR_Y = 6.5

describe('facingSign / paddleXDir', () => {
  it('has near-side players facing away and far-side players facing the viewer', () => {
    expect(facingSign({ y: NEAR_Y })).toBe(1)
    expect(facingSign({ y: FAR_Y })).toBe(-1)
  })

  it('puts a near-side right-hander’s paddle on the viewer’s right', () => {
    expect(paddleXDir({ y: NEAR_Y, handedness: 'right' })).toBe(1)
  })

  it('mirrors a far-side right-hander’s paddle onto the viewer’s left', () => {
    expect(paddleXDir({ y: FAR_Y, handedness: 'right' })).toBe(-1)
  })

  it('mirrors handedness and facing independently', () => {
    expect(paddleXDir({ y: NEAR_Y, handedness: 'left' })).toBe(-1)
    expect(paddleXDir({ y: FAR_Y, handedness: 'left' })).toBe(1)
  })
})

// CLAUDE.md: "Both right-handed | Right-side player's backhand faces middle".
// "Right-side" there is player-relative — the player standing in their own
// right service court facing the net — so for opponents it is the viewer's
// LEFT half of the court.
describe('resolveHandednessGeometry — near side (user team, facing away)', () => {
  it('gives a right-hander on the left half a forehand facing the middle', () => {
    const geom = resolveHandednessGeometry({ x: 3, y: NEAR_Y, handedness: 'right' })
    expect(geom.side).toBe('left')
    expect(geom.facesViewer).toBe(false)
    expect(geom.forehandTowardMiddle).toBe(true)
    expect(geom.forehandXDir).toBe(1) // toward increasing x, i.e. toward center
  })

  it('gives a right-hander on the right half a backhand facing the middle', () => {
    const geom = resolveHandednessGeometry({ x: 17, y: NEAR_Y, handedness: 'right' })
    expect(geom.side).toBe('right')
    expect(geom.forehandTowardMiddle).toBe(false)
    expect(geom.backhandXDir).toBe(-1) // toward decreasing x, i.e. toward center
  })

  it('mirrors for a left-hander on the left half (backhand faces middle)', () => {
    const geom = resolveHandednessGeometry({ x: 3, y: NEAR_Y, handedness: 'left' })
    expect(geom.forehandTowardMiddle).toBe(false)
  })

  it('mirrors for a left-hander on the right half (forehand faces middle)', () => {
    const geom = resolveHandednessGeometry({ x: 17, y: NEAR_Y, handedness: 'left' })
    expect(geom.forehandTowardMiddle).toBe(true)
  })
})

describe('resolveHandednessGeometry — far side (opponents, facing the viewer)', () => {
  it('flags the opponent as facing the viewer', () => {
    expect(resolveHandednessGeometry({ x: 3, y: FAR_Y, handedness: 'right' }).facesViewer).toBe(true)
  })

  // The player-relative "right-side player" is the viewer's LEFT half here.
  it('gives a right-handed opponent on the viewer’s left half a backhand facing the middle', () => {
    const geom = resolveHandednessGeometry({ x: 3, y: FAR_Y, handedness: 'right' })
    expect(geom.forehandTowardMiddle).toBe(false)
    expect(geom.forehandXDir).toBe(-1) // paddle toward the near sideline
  })

  it('gives a right-handed opponent on the viewer’s right half a forehand facing the middle', () => {
    const geom = resolveHandednessGeometry({ x: 17, y: FAR_Y, handedness: 'right' })
    expect(geom.forehandTowardMiddle).toBe(true)
  })

  it('is the exact mirror of the same player on the near side', () => {
    for (const handedness of ['right', 'left']) {
      for (const x of [3, 17]) {
        const near = resolveHandednessGeometry({ x, y: NEAR_Y, handedness })
        const far = resolveHandednessGeometry({ x, y: FAR_Y, handedness })
        expect(far.forehandXDir).toBe(-near.forehandXDir)
        expect(far.forehandTowardMiddle).toBe(!near.forehandTowardMiddle)
      }
    }
  })
})

describe('resolveHandednessGeometry — envelopes', () => {
  it('places the body-jam zone on the forehand (dominant-hand) side', () => {
    for (const y of [NEAR_Y, FAR_Y]) {
      const geom = resolveHandednessGeometry({ x: 3, y, handedness: 'right' })
      expect(Math.sign(geom.bodyJamX - 3)).toBe(geom.forehandXDir)
    }
  })

  it('gives the forehand envelope a larger reach than the backhand', () => {
    const geom = resolveHandednessGeometry({ x: 3, y: NEAR_Y, handedness: 'right' })
    expect(geom.forehandReachFt).toBeGreaterThan(geom.backhandReachFt)
  })
})

describe('detectHandednessConfig', () => {
  it('detects both-right when both players are right-handed', () => {
    const config = detectHandednessConfig(
      { x: 3, y: NEAR_Y, handedness: 'right' },
      { x: 17, y: NEAR_Y, handedness: 'right' },
    )
    expect(config).toBe('both-right')
  })

  it('detects both-left when both players are left-handed', () => {
    const config = detectHandednessConfig(
      { x: 3, y: NEAR_Y, handedness: 'left' },
      { x: 17, y: NEAR_Y, handedness: 'left' },
    )
    expect(config).toBe('both-left')
  })

  it('detects opposite-forehands-middle: left-side righty + right-side lefty', () => {
    const config = detectHandednessConfig(
      { x: 3, y: NEAR_Y, handedness: 'right' },
      { x: 17, y: NEAR_Y, handedness: 'left' },
    )
    expect(config).toBe('opposite-forehands-middle')
  })

  it('detects opposite-backhands-middle: left-side lefty + right-side righty', () => {
    const config = detectHandednessConfig(
      { x: 3, y: NEAR_Y, handedness: 'left' },
      { x: 17, y: NEAR_Y, handedness: 'right' },
    )
    expect(config).toBe('opposite-backhands-middle')
  })

  it('is order-independent for the same-handedness cases', () => {
    const a = detectHandednessConfig(
      { x: 3, y: NEAR_Y, handedness: 'right' },
      { x: 17, y: NEAR_Y, handedness: 'right' },
    )
    const b = detectHandednessConfig(
      { x: 17, y: NEAR_Y, handedness: 'right' },
      { x: 3, y: NEAR_Y, handedness: 'right' },
    )
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
    const player = { x: 3, y: NEAR_Y, handedness: 'right' }
    const geom = resolveHandednessGeometry(player)
    // backhand faces away from the middle for a left-side right-hander
    const backhandTarget = player.x + geom.backhandXDir * 1
    expect(isBackhandSide(player, geom, backhandTarget)).toBe(true)
    expect(isForehandSide(player, geom, backhandTarget)).toBe(false)
  })

  it('does not flag a target beyond the backhand reach envelope', () => {
    const player = { x: 3, y: NEAR_Y, handedness: 'right' }
    const geom = resolveHandednessGeometry(player)
    const farBeyondReach = player.x + geom.backhandXDir * (geom.backhandReachFt + 5)
    expect(isBackhandSide(player, geom, farBeyondReach)).toBe(false)
  })

  it('does not flag the player position itself as either side', () => {
    const player = { x: 3, y: NEAR_Y, handedness: 'right' }
    const geom = resolveHandednessGeometry(player)
    expect(isBackhandSide(player, geom, player.x)).toBe(false)
    expect(isForehandSide(player, geom, player.x)).toBe(false)
  })
})
