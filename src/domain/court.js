// Court geometry and coordinate helpers. See CLAUDE.md "Court Model".

export const COURT = {
  widthFt: 20, // x: 0 (left sideline) to 20 (right sideline)
  lengthHalfFt: 22, // y: -22 (user baseline) to +22 (opponent baseline)
  kitchenDepthFt: 7, // non-volley zone extends 7 ft from the net on each side
  netHeightSidelineFt: 3, // 36 in
  netHeightCenterFt: 34 / 12, // 34 in, reference height for clearance calc
  outOfBoundsMarginFt: 6,
}

export const CENTER_X = COURT.widthFt / 2 // 10

export function netClearanceHeightFt(x) {
  // Interpolate net height between center and nearest sideline.
  const distFromCenter = Math.abs(x - CENTER_X)
  const t = Math.min(distFromCenter / CENTER_X, 1)
  return COURT.netHeightCenterFt + t * (COURT.netHeightSidelineFt - COURT.netHeightCenterFt)
}

export function inBounds(x, y) {
  return x >= 0 && x <= COURT.widthFt && Math.abs(y) <= COURT.lengthHalfFt
}

export function inKitchen(y) {
  return Math.abs(y) <= COURT.kitchenDepthFt
}

// Depth categories, derived from distance-from-net (|y|).
export const DEPTH_CATEGORIES = [
  { id: 'kitchen', label: 'Kitchen line', min: 0, max: 7.5 },
  { id: 'transition', label: 'Transition zone', min: 7.5, max: 14 },
  { id: 'midcourt', label: 'Mid-court', min: 14, max: 18 },
  { id: 'baseline', label: 'Baseline', min: 18, max: Infinity },
]

export function depthCategory(y) {
  const distFromNet = Math.abs(y)
  for (const cat of DEPTH_CATEGORIES) {
    if (distFromNet >= cat.min && distFromNet < cat.max) return cat.id
  }
  return 'baseline'
}

export function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by)
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

// Which side of the net a y-coordinate sits on: 'near' (user) or 'far' (opponent).
export function sideOf(y) {
  return y <= 0 ? 'near' : 'far'
}
