import { useMemo, useState } from 'react'
import CourtSvg from '../render/CourtSvg.jsx'
import { useHeatmapImage, HeatmapLegend } from '../render/HeatCanvas.jsx'
import { buildPrecomputedContext } from '../domain/derive.js'
import { rankedCandidatesAcrossSpeeds, evaluateChoice, CANDIDATE_SHOT_TYPES } from '../domain/candidates.js'
import { explainTarget } from '../domain/evaluate.js'
import { distance } from '../domain/court.js'
import ScenarioPanel from './shared/ScenarioPanel.jsx'
import { Segmented } from './shared/controls.jsx'

export default function Grader({ scenario, onScenarioChange }) {
  const [chosenShotType, setChosenShotType] = useState('dink-cross')
  const [userTarget, setUserTarget] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [history, setHistory] = useState([]) // { hit: boolean }

  const context = useMemo(() => buildPrecomputedContext(scenario), [scenario])

  const fullRanking = useMemo(
    () => (revealed ? rankedCandidatesAcrossSpeeds(context, { topN: CANDIDATE_SHOT_TYPES.length }) : []),
    [revealed, context]
  )

  const userChoice = useMemo(
    () => (revealed && userTarget ? evaluateChoice(context, userTarget.x, userTarget.y, chosenShotType) : null),
    [revealed, userTarget, chosenShotType, context]
  )

  const heatmapUrl = useHeatmapImage(context, chosenShotType, userChoice?.speed ?? 0.4)

  const optimal = fullRanking[0]
  const deltaFromOptimal = optimal && userChoice ? optimal.score - userChoice.score : null
  const nearestPeakForShot = fullRanking.find((c) => c.shotType === chosenShotType)
  const distanceFromPeak =
    nearestPeakForShot && userTarget ? distance(userTarget.x, userTarget.y, nearestPeakForShot.x, nearestPeakForShot.y) : null

  const violatedRule = useMemo(() => {
    if (!userChoice) return null
    const fired = explainTarget(context, userChoice.x, userChoice.y, userChoice.shotType, userChoice.speed)
    const worst = fired.filter((r) => r.delta < 0).sort((a, b) => a.delta - b.delta)[0]
    return worst ?? null
  }, [userChoice, context])

  const accuracy = history.length ? Math.round((history.filter((h) => h.hit).length / history.length) * 100) : null

  const handleCommit = () => {
    if (!userTarget) return
    setRevealed(true)
  }

  const handleNext = () => {
    if (userChoice && optimal) {
      const hit = optimal.score - userChoice.score <= 8
      setHistory((h) => [...h, { hit }])
    }
    setRevealed(false)
    setUserTarget(null)
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 p-3 md:p-4">
      <div className="md:w-3/5">
        <CourtSvg
          scenario={scenario}
          onScenarioChange={onScenarioChange}
          peakMarker={revealed ? optimal : null}
          userTargetMarker={userTarget}
          heatmapCanvasUrl={revealed ? heatmapUrl : null}
          onPickTarget={revealed ? undefined : (x, y) => setUserTarget({ x, y })}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {revealed && <HeatmapLegend />}
          <span className="text-xs text-neutral-400">
            {revealed ? 'White ring = optimal target. Blue crosshair = your target.' : 'Tap the court to set your target.'}
          </span>
        </div>
      </div>

      <div className="md:w-2/5 flex flex-col gap-4">
        <ScenarioPanel scenario={scenario} onScenarioChange={onScenarioChange} showIncomingShot>
          {accuracy != null && (
            <div className="mb-3 text-sm text-neutral-300">
              Session accuracy: <span className="font-mono">{accuracy}%</span> ({history.length} attempt{history.length === 1 ? '' : 's'})
            </div>
          )}
        </ScenarioPanel>

        {!revealed && (
          <div className="rounded-lg border border-neutral-700 p-3" data-testid="grader-shot-picker">
            <h2 className="text-sm font-semibold text-neutral-200 mb-2">Your shot</h2>
            <Segmented options={CANDIDATE_SHOT_TYPES} value={chosenShotType} onChange={setChosenShotType} />
            <p className="mt-2 text-xs text-neutral-400">
              {userTarget ? `Target set at (${userTarget.x.toFixed(1)}, ${userTarget.y.toFixed(1)})` : 'No target set yet.'}
            </p>
            <button
              onClick={handleCommit}
              disabled={!userTarget}
              className="mt-3 w-full rounded-lg bg-amber-400 disabled:bg-neutral-700 disabled:text-neutral-500 text-black font-semibold py-3 text-base"
            >
              Commit
            </button>
          </div>
        )}

        {revealed && userChoice && (
          <div className="rounded-lg border border-neutral-700 p-3 flex flex-col gap-2 text-sm">
            <h2 className="text-sm font-semibold text-neutral-200">Reveal</h2>
            <div>
              Your choice: <span className="font-mono">{userChoice.shotType}</span> — score{' '}
              <span className="font-mono">{userChoice.score.toFixed(0)}</span>
            </div>
            <div>
              Optimal: <span className="font-mono">{optimal.shotType}</span> — score{' '}
              <span className="font-mono">{optimal.score.toFixed(0)}</span>
            </div>
            <div>
              Delta from optimal: <span className="font-mono">{deltaFromOptimal.toFixed(0)}</span>
            </div>
            {distanceFromPeak != null && (
              <div>
                Distance from the nearest {chosenShotType} peak: <span className="font-mono">{distanceFromPeak.toFixed(1)} ft</span>
              </div>
            )}
            {violatedRule ? (
              <div className="text-rose-300">
                Rule violated: {violatedRule.name} — {violatedRule.explanation}
              </div>
            ) : (
              <div className="text-emerald-300">No risk rule fired at your target.</div>
            )}

            <h3 className="mt-2 text-sm font-semibold text-neutral-200">Full ranking (best case per shot type)</h3>
            <ul className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
              {fullRanking.map((c, i) => (
                <li
                  key={c.shotType}
                  className={`flex justify-between px-2 py-0.5 rounded ${
                    c.shotType === chosenShotType ? 'bg-amber-400/20 text-amber-200' : ''
                  }`}
                >
                  <span>
                    {i + 1}. {c.shotType}
                    {c.shotType === chosenShotType ? ' (your pick)' : ''}
                  </span>
                  <span className="font-mono">
                    {c.score.toFixed(0)}
                    {c.shotType === chosenShotType ? ` · you hit ${userChoice.score.toFixed(0)}` : ''}
                  </span>
                </li>
              ))}
            </ul>

            <button onClick={handleNext} className="mt-2 w-full rounded-lg bg-neutral-700 py-3 text-base font-semibold">
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
