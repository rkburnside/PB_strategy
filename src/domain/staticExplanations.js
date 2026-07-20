// Tier 1 static explanation layer. Composed entirely from triggered rule
// strings and small per-shot-type coaching notes — instant, offline,
// deterministic, and the permanent fallback per CLAUDE.md "Explanation layer".
import { explainTarget } from './evaluate.js'

// Coach-to-peer notes on how each shot type typically fails when executed
// poorly, and the counter it invites. Not a substitute for the execution
// probability tables and opponent policy in docs/RALLY.md (Phase 3) — this
// is static per-shot-type text for the single-shot modes.
const SHOT_NOTES = {
  'dink-cross': {
    failureMode: 'Floats or sits up in the middle of the kitchen, inviting an easy attack.',
    opponentResponse: 'Extends the exchange, or attacks if the dink sits up.',
  },
  'dink-straight': {
    failureMode: 'Lands short of the kitchen line or drifts wide of the sideline.',
    opponentResponse: 'Resets or continues the same line back at you.',
  },
  'dink-middle': {
    failureMode: 'Sits up in a seam both opponents can cover, inviting a poach.',
    opponentResponse: 'Whichever player is stronger through the middle takes it and resets or attacks.',
  },
  'third-shot-drop': {
    failureMode: 'Floats above net height on arrival, handing the opponent a free attack.',
    opponentResponse: 'Attacks the float, or resets it back if it lands well.',
  },
  'third-shot-drive': {
    failureMode: 'Sits up for a block or is read early and countered.',
    opponentResponse: 'Blocks it short, or counters back at your feet if you crash the line.',
  },
  'speed-up-body': {
    failureMode: 'Lands off-target, away from the body, giving a clean look instead of a jam.',
    opponentResponse: 'Counters at your own feet or the open lane.',
  },
  'speed-up-feet': {
    failureMode: 'Sails through the strike zone above the waist and gets punished.',
    opponentResponse: 'Punches back at your feet.',
  },
  'speed-up-shoulder': {
    failureMode: 'Comes in slow enough to be picked out of the air and put away.',
    opponentResponse: 'Takes it out of the air and attacks the reply.',
  },
  reset: {
    failureMode: 'Pops up above net height instead of dying at the kitchen line.',
    opponentResponse: 'Attacks a resulting high ball; otherwise resumes neutral dinking.',
  },
  'lob-offensive': {
    failureMode: 'Comes up short and gets smashed.',
    opponentResponse: 'Retreats and resets, or overheads it if the lob is short.',
  },
  'lob-defensive': {
    failureMode: 'Doesn’t clear the retreating opponent and gets put away.',
    opponentResponse: 'Tracks it down and resets to neutral, or overheads a short one.',
  },
  'punch-volley': {
    failureMode: 'Contacts too early or late in the hands exchange and sails wide.',
    opponentResponse: 'Continues the hands battle or resets if pushed back.',
  },
  'roll-volley': {
    failureMode: 'Over-rotates the paddle face and nets it.',
    opponentResponse: 'Blocks it back short if the roll sits up.',
  },
  'deep-return': {
    failureMode: 'Lands short of the baseline, giving the serving team an easy third.',
    opponentResponse: 'Takes time to construct the third shot from a comfortable depth.',
  },
  block: {
    failureMode: 'Paddle face is open and the block sails long.',
    opponentResponse: 'Follows in behind the pace if the block is short.',
  },
  counter: {
    failureMode: 'Overhit and sails past the baseline.',
    opponentResponse: 'Resets if the counter is soft, or trades pace back if it is not.',
  },
  overhead: {
    failureMode: 'Mistimed and nets, or hit too flat and blocked back.',
    opponentResponse: 'Blocks it back if reachable; otherwise the point is over.',
  },
  'serve-short': {
    failureMode: 'Lands in the kitchen for a fault.',
    opponentResponse: 'Steps in and takes time away on the return.',
  },
  'serve-deep': {
    failureMode: 'Sits up with no pace and gets attacked off the bounce.',
    opponentResponse: 'Drives an aggressive return.',
  },
  'serve-wide': {
    failureMode: 'Misses wide for a fault, or leaves the middle exposed.',
    opponentResponse: 'Returns crosscourt into the vacated middle.',
  },
  'serve-body': {
    failureMode: 'Drifts off the body and gives a clean strike instead of a jam.',
    opponentResponse: 'Returns deep and settles into the point.',
  },
}

export function riskBadge(score) {
  if (score >= 70) return { label: 'Recommended', tone: 'low' }
  if (score >= 45) return { label: 'Moderate risk', tone: 'medium' }
  return { label: 'High risk', tone: 'high' }
}

export function composeExplanation(context, candidate) {
  const fired = explainTarget(context, candidate.x, candidate.y, candidate.shotType, candidate.speed)
  const opportunities = fired.filter((r) => r.category === 'opportunity')
  const risks = fired.filter((r) => r.category === 'risk' || r.category === 'execution')
  const notes = SHOT_NOTES[candidate.shotType] ?? {
    failureMode: 'Executed poorly, it gives the opponent time and pace to work with.',
    opponentResponse: 'Resets or continues the exchange from neutral.',
  }

  const rationale = opportunities.length
    ? opportunities.map((r) => r.explanation).join(' ')
    : 'No standout opportunity rule fired here — this is a neutral, low-commitment option.'

  const tradeoff = risks.length
    ? risks.map((r) => r.explanation).join(' ')
    : 'No material risk factors fired at this target and speed.'

  return {
    rationale,
    tradeoff,
    failureMode: notes.failureMode,
    opponentResponse: notes.opponentResponse,
    firedRules: fired,
  }
}
