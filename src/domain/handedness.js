// Handedness geometry: forehand/backhand sides, body-jam zones, and
// configuration detection. See CLAUDE.md "Handedness".
import { CENTER_X } from './court.js'

const BODY_JAM_OFFSET_FT = 1.2
const FOREHAND_REACH_FT = 5
const BACKHAND_REACH_FT = 3.5

// Resolves which lateral (x) direction is a player's forehand vs backhand,
// and whether their forehand faces the middle of the court.
export function resolveHandednessGeometry(player, centerX = CENTER_X) {
  const side = player.x < centerX ? 'left' : 'right'
  const towardMiddleSign = side === 'left' ? 1 : -1

  const forehandTowardMiddle =
    (player.handedness === 'right' && side === 'left') || (player.handedness === 'left' && side === 'right')

  const forehandXDir = forehandTowardMiddle ? towardMiddleSign : -towardMiddleSign
  const backhandXDir = -forehandXDir

  return {
    side,
    forehandTowardMiddle,
    forehandXDir,
    backhandXDir,
    // Body-jam target sits on the dominant-hand hip, same side as the forehand.
    bodyJamX: player.x + forehandXDir * BODY_JAM_OFFSET_FT,
    forehandReachFt: FOREHAND_REACH_FT,
    backhandReachFt: BACKHAND_REACH_FT,
  }
}

// True if targetX falls within this player's backhand-side reach envelope.
export function isBackhandSide(player, geometry, targetX) {
  const dx = (targetX - player.x) * geometry.backhandXDir
  return dx > 0 && dx <= geometry.backhandReachFt
}

export function isForehandSide(player, geometry, targetX) {
  const dx = (targetX - player.x) * geometry.forehandXDir
  return dx > 0 && dx <= geometry.forehandReachFt
}

// Configuration of a two-player team: 'both-right' | 'both-left' |
// 'opposite-forehands-middle' | 'opposite-backhands-middle'.
export function detectHandednessConfig(playerA, playerB, centerX = CENTER_X) {
  if (playerA.handedness === playerB.handedness) {
    return playerA.handedness === 'right' ? 'both-right' : 'both-left'
  }
  const geomA = resolveHandednessGeometry(playerA, centerX)
  return geomA.forehandTowardMiddle ? 'opposite-forehands-middle' : 'opposite-backhands-middle'
}

// Middle-seam weight multiplier applied to the base middle-gap rule.
// Forehands-middle inverts the base assumption; backhands-middle strengthens it.
export function middleSeamMultiplier(config) {
  switch (config) {
    case 'opposite-forehands-middle':
      return -0.6 // middle goes cold
    case 'opposite-backhands-middle':
      return 1.3 // middle stronger than base
    case 'both-right':
    case 'both-left':
    default:
      return 1.0 // base assumption
  }
}
