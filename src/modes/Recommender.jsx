import { useMemo, useState } from 'react'
import CourtSvg from '../render/CourtSvg.jsx'
import { buildPrecomputedContext } from '../domain/derive.js'
import { rankedCandidatesAcrossSpeeds } from '../domain/candidates.js'
import { composeExplanation, riskBadge } from '../domain/staticExplanations.js'
import ScenarioPanel from './shared/ScenarioPanel.jsx'
import { RiskBadge } from './shared/controls.jsx'

function ShotCard({ candidate, expanded, onToggle, context }) {
  const badge = riskBadge(candidate.score)
  const explanation = useMemo(() => composeExplanation(context, candidate), [context, candidate])

  return (
    <div className="rounded-lg border border-neutral-700 overflow-hidden">
      <button
        onClick={onToggle}
        data-testid={`card-toggle-${candidate.shotType}`}
        className="w-full flex items-center justify-between px-3 py-2 bg-neutral-800/60 text-left"
      >
        <span className="font-medium">{candidate.shotType}</span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-sm text-neutral-400">{candidate.score.toFixed(0)}</span>
          <RiskBadge badge={badge} />
        </span>
      </button>
      {expanded && (
        <div className="px-3 py-2 text-sm flex flex-col gap-2 border-t border-neutral-700">
          <div>
            <span className="text-neutral-400">Rationale: </span>
            {explanation.rationale}
          </div>
          <div>
            <span className="text-neutral-400">Tradeoff: </span>
            {explanation.tradeoff}
          </div>
          <div>
            <span className="text-neutral-400">Failure mode: </span>
            {explanation.failureMode}
          </div>
          <div>
            <span className="text-neutral-400">Opponent response: </span>
            {explanation.opponentResponse}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Recommender({ scenario, onScenarioChange }) {
  const [analyzed, setAnalyzed] = useState(false)
  const [expandedShot, setExpandedShot] = useState(null)
  const [highlightedShot, setHighlightedShot] = useState(null)

  const context = useMemo(() => buildPrecomputedContext(scenario), [scenario])
  const candidates = useMemo(
    () => (analyzed ? rankedCandidatesAcrossSpeeds(context, { topN: 6 }) : []),
    [analyzed, context]
  )

  const peakMarker = candidates.find((c) => c.shotType === highlightedShot) ?? null

  const handleAnalyze = () => {
    setAnalyzed(true)
    setExpandedShot(null)
    setHighlightedShot(candidates[0]?.shotType ?? null)
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 p-3 md:p-4">
      <div className="md:w-3/5">
        <CourtSvg scenario={scenario} onScenarioChange={onScenarioChange} peakMarker={peakMarker} />
        <p className="mt-2 text-xs text-neutral-400">
          Arrange the scenario, then analyze. Tap a card to highlight its target on the court.
        </p>
      </div>

      <div className="md:w-2/5 flex flex-col gap-4">
        <ScenarioPanel scenario={scenario} onScenarioChange={onScenarioChange} showIncomingShot />

        <button
          onClick={handleAnalyze}
          className="rounded-lg bg-amber-400 text-black font-semibold py-3 text-base sticky bottom-2"
        >
          Analyze
        </button>

        {analyzed && (
          <div className="flex flex-col gap-2">
            {candidates.map((c) => (
              <div
                key={c.shotType}
                onClick={() => setHighlightedShot(c.shotType)}
                className={highlightedShot === c.shotType ? 'ring-1 ring-amber-400 rounded-lg' : ''}
              >
                <ShotCard
                  candidate={c}
                  context={context}
                  expanded={expandedShot === c.shotType}
                  onToggle={() => setExpandedShot(expandedShot === c.shotType ? null : c.shotType)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
