// Landing-depth windows per shot type, measured in feet from the net on the
// receiving side. A shot is only the shot you named if it lands where that
// shot lands: a dink that carries past the kitchen is an attackable floater,
// a drive that lands short is a free ball.
//
// These are starting values for tuning, not researched figures — they live in
// a data table rather than in rule logic so they can be adjusted without
// touching the engine. Same convention docs/RALLY.md sets for the execution
// probability tables.
//
// min / max bound the window the shot stays recognisable in; ideal is where
// it wants to land.

export const DEFAULT_DEPTH_BAND = { min: 1, ideal: 10, max: 21 }

export const SHOT_DEPTH_BANDS = {
  // Soft game — must die in or around the kitchen.
  'dink-cross': { min: 1, ideal: 5, max: 7 },
  'dink-straight': { min: 1, ideal: 5, max: 7 },
  'dink-middle': { min: 1, ideal: 5, max: 7 },
  'third-shot-drop': { min: 2, ideal: 6, max: 8 },
  reset: { min: 1, ideal: 5, max: 8 },
  block: { min: 1, ideal: 5, max: 10 },

  // Attacking shots — placed at a player rather than at an absolute depth,
  // so the window is wide and the opponent-proximity rules do the work.
  'speed-up-body': { min: 3, ideal: 7, max: 13 },
  'speed-up-feet': { min: 3, ideal: 7, max: 13 },
  'speed-up-shoulder': { min: 3, ideal: 7, max: 12 },
  'roll-volley': { min: 3, ideal: 8, max: 14 },
  'punch-volley': { min: 3, ideal: 9, max: 16 },
  counter: { min: 3, ideal: 9, max: 16 },
  overhead: { min: 2, ideal: 10, max: 20 },

  // Deep game — has to carry.
  'third-shot-drive': { min: 10, ideal: 17, max: 21 },
  'deep-return': { min: 15, ideal: 20, max: 22 },
  'lob-defensive': { min: 15, ideal: 20, max: 22 },
  'lob-offensive': { min: 16, ideal: 20.5, max: 22 },

  // Serves must clear the non-volley zone to be legal; see the
  // serve-must-clear-kitchen rule for the fault itself.
  'serve-short': { min: 8, ideal: 12, max: 15 },
  'serve-deep': { min: 15, ideal: 20, max: 21.5 },
  'serve-wide': { min: 12, ideal: 18, max: 21.5 },
  'serve-body': { min: 12, ideal: 18, max: 21.5 },
}

export function depthBandFor(shotType) {
  return SHOT_DEPTH_BANDS[shotType] ?? DEFAULT_DEPTH_BAND
}

export function isServe(shotType) {
  return typeof shotType === 'string' && shotType.startsWith('serve-')
}
