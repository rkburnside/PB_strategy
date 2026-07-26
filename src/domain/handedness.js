// Handedness geometry: forehand/backhand sides, body-jam zones, and
// configuration detection. See CLAUDE.md "Handedness".
import { CENTER_X } from './court.js'

const BODY_JAM_OFFSET_FT = 1.2
const FOREHAND_REACH_FT = 5
const BACKHAND_REACH_FT = 3.5

// Which way a player faces along y. Near-side players (y <= 0) face the far
// side (+y); far-side players face back toward the near side (-y).
//
// This is what makes an opponent a mirror image, and it is easy to get wrong:
// a right-hander facing away from the viewer carries the paddle on the
// viewer's right, but the same player facing the viewer carries it on the
// viewer's LEFT. Since the rules engine targets opponents — who always face
// the user — ignoring this mirrors every body-jam and backhand target onto
// the wrong side of the opponent.
export function facingSign(player) {
  return player.y > 0 ? -1 : 1
}

// World-x direction of a player's paddle (forehand) hand, from handedness and
// facing together. Formally right = forward × up, so a right-hander facing +y
// has the paddle at +x and the same player facing -y has it at -x.
export function paddleXDir(player) {
  return (player.handedness === 'right' ? 1 : -1) * facingSign(player)
}

// Resolves which lateral (x) direction is a player's forehand vs backhand,
// and whether their forehand faces the middle of the court.
export function resolveHandednessGeometry(player, centerX = CENTER_X) {
  const side = player.x < centerX ? 'left' : 'right' // viewer-relative half
  const towardMiddleSign = side === 'left' ? 1 : -1

  const forehandXDir = paddleXDir(player)
  const backhandXDir = -forehandXDir
  const forehandTowardMiddle = forehandXDir === towardMiddleSign

  return {
    side,
    facesViewer: facingSign(player) < 0,
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
