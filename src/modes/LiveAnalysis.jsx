import { useMemo, useState } from 'react'
import CourtSvg from '../render/CourtSvg.jsx'
import { useHeatmapImage } from '../render/HeatCanvas.jsx'
import { buildPrecomputedContext } from '../domain/derive.js'
import { rankedCandidates, CANDIDATE_SHOT_TYPES } from '../domain/candidates.js'
import { explainTarget } from '../domain/evaluate.js'
import ScenarioPanel from './shared/ScenarioPanel.jsx'
import CourtKey from './shared/CourtKey.jsx'
import { Slider, Segmented } from './shared/controls.jsx'

export default function LiveAnalysis({ scenario, onScenarioChange }) {
  const [outputSpeed, setOutputSpeed] = useState(0.4)
  const [selectedShotType, setSelectedShotType] = useState('dink-cross')

  const context = useMemo(() => buildPrecomputedContext(scenario), [scenario])

  const heatmapUrl = useHeatmapImage(context, selectedShotType, outputSpeed)

  const candidates = useMemo(
    () => rankedCandidates(context, outputSpeed, { topN: 6, shotTypes: CANDIDATE_SHOT_TYPES }),
    [context, outputSpeed],
  )

  // Peak for the selected shot specifically. Computed on its own rather than
  // looked up in `candidates`, because a poorly-scoring shot falls out of the
  // top six — which used to silently fall back to the best shot, labelling
  // another shot's ring and rationale with the selected shot's name.
  const selectedPeak = useMemo(
    () => rankedCandidates(context, outputSpeed, { topN: 1, shotTypes: [selectedShotType] })[0],
    [context, outputSpeed, selectedShotType],
  )

  const explanation = selectedPeak
    ? explainTarget(context, selectedPeak.x, selectedPeak.y, selectedPeak.shotType, selectedPeak.speed)
    : []

  return (
    <div className="flex flex-col md:flex-row gap-4 p-3 md:p-4">
      <div className="md:w-3/5">
        <CourtSvg
          scenario={scenario}
          onScenarioChange={onScenarioChange}
          peakMarker={selectedPeak}
          heatmap={heatmapUrl}
        />
        <div className="mt-2">
          <Segmented options={CANDIDATE_SHOT_TYPES} value={selectedShotType} onChange={setSelectedShotType} />
        </div>
        <div className="mt-2">
          <CourtKey />
        </div>
      </div>

      <div className="md:w-2/5 flex flex-col gap-4">
        <ScenarioPanel scenario={scenario} onScenarioChange={onScenarioChange}>
          <Slider
            label="Output speed"
            value={outputSpeed}
            min={0}
            max={1}
            step={0.01}
            onChange={setOutputSpeed}
            formatValue={(v) => v.toFixed(2)}
          />
        </ScenarioPanel>

        <div className="rounded-lg border border-neutral-700 p-3">
          <h2 className="text-sm font-semibold text-neutral-200 mb-2">Ranked shots</h2>
          <ul className="flex flex-col gap-1">
            {candidates.map((c) => (
              <li
                key={c.shotType}
                onClick={() => setSelectedShotType(c.shotType)}
                className={`flex justify-between rounded px-2 py-1 text-sm cursor-pointer ${
                  c.shotType === selectedShotType ? 'bg-neutral-700' : 'hover:bg-neutral-800'
                }`}
              >
                <span>{c.shotType}</span>
                <span className="font-mono">{c.score.toFixed(0)}</span>
              </li>
            ))}
          </ul>
        </div>

        {selectedPeak && (
          <div className="rounded-lg border border-neutral-700 p-3">
            <h2 className="text-sm font-semibold text-neutral-200 mb-2">
              Why: {selectedShotType} ({selectedPeak.score.toFixed(0)})
            </h2>
            <ul className="flex flex-col gap-1 text-sm">
              {explanation.length === 0 && <li className="text-neutral-500">No rules fired at this peak.</li>}
              {explanation.map((e) => (
                <li key={e.id} className={e.delta >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                  {e.delta >= 0 ? '+' : ''}
                  {e.delta.toFixed(0)} — {e.explanation}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
