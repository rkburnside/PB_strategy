import { useMemo, useState } from 'react'
import CourtSvg from '../render/CourtSvg.jsx'
import { useHeatmapImage, HeatmapLegend } from '../render/HeatCanvas.jsx'
import { buildPrecomputedContext } from '../domain/derive.js'
import { rankedCandidates, CANDIDATE_SHOT_TYPES } from '../domain/candidates.js'
import { explainTarget } from '../domain/evaluate.js'
import { netClearanceHeightFt } from '../domain/court.js'

const DIVISIONS = ['mens', 'womens', 'mixed']
const BOUNCE_STATES = ['volley', 'afterBounce']

function Slider({ label, value, min, max, step, onChange, formatValue, marker }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm text-neutral-300 mb-1">
        <span>{label}</span>
        <span className="font-mono">{formatValue ? formatValue(value) : value}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full accent-amber-400"
        />
        {marker != null && (
          <div
            className="absolute top-0 h-2 w-px bg-white/70 pointer-events-none"
            style={{ left: `${((marker - min) / (max - min)) * 100}%` }}
            title="Net tape"
          />
        )}
      </div>
    </div>
  )
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`whitespace-nowrap rounded px-3 py-1 text-sm border ${
            value === opt ? 'bg-amber-400 text-black border-amber-400' : 'border-neutral-600 text-neutral-300'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export default function LiveAnalysis({ scenario, onScenarioChange }) {
  const [outputSpeed, setOutputSpeed] = useState(0.4)
  const [selectedShotType, setSelectedShotType] = useState('dink-cross')

  const context = useMemo(() => buildPrecomputedContext(scenario), [scenario])

  const heatmapUrl = useHeatmapImage(context, selectedShotType, outputSpeed)

  const candidates = useMemo(
    () => rankedCandidates(context, outputSpeed, { topN: 6, shotTypes: CANDIDATE_SHOT_TYPES }),
    [context, outputSpeed]
  )

  const topPeak = candidates.find((c) => c.shotType === selectedShotType) ?? candidates[0]
  const explanation = topPeak ? explainTarget(context, topPeak.x, topPeak.y, topPeak.shotType, topPeak.speed) : []

  const netTape = netClearanceHeightFt(scenario.ball.x)

  const updateScenario = (patch) => onScenarioChange({ ...scenario, ...patch })

  return (
    <div className="flex flex-col md:flex-row gap-4 p-3 md:p-4">
      <div className="md:w-3/5">
        <CourtSvg scenario={scenario} onScenarioChange={onScenarioChange} peakMarker={topPeak} heatmapCanvasUrl={heatmapUrl} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <HeatmapLegend />
          <Segmented options={CANDIDATE_SHOT_TYPES} value={selectedShotType} onChange={setSelectedShotType} />
        </div>
      </div>

      <div className="md:w-2/5 flex flex-col gap-4">
        <div className="rounded-lg border border-neutral-700 p-3">
          <h2 className="text-sm font-semibold text-neutral-200 mb-2">Scenario</h2>
          <Slider
            label="Height at contact (ft)"
            value={scenario.ballHeightAtContact}
            min={1}
            max={9}
            step={0.1}
            marker={netTape}
            onChange={(v) => updateScenario({ ballHeightAtContact: v })}
            formatValue={(v) => v.toFixed(1)}
          />
          <Slider
            label="Incoming speed"
            value={scenario.incomingSpeed}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateScenario({ incomingSpeed: v })}
            formatValue={(v) => v.toFixed(2)}
          />
          <Slider
            label="Balance"
            value={scenario.userBalance}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => updateScenario({ userBalance: v })}
            formatValue={(v) => v.toFixed(2)}
          />
          <Slider
            label="Output speed"
            value={outputSpeed}
            min={0}
            max={1}
            step={0.01}
            onChange={setOutputSpeed}
            formatValue={(v) => v.toFixed(2)}
          />

          <div className="mt-2">
            <div className="text-sm text-neutral-300 mb-1">Bounce state</div>
            <Segmented options={BOUNCE_STATES} value={scenario.bounceState} onChange={(v) => updateScenario({ bounceState: v })} />
          </div>
          <div className="mt-2">
            <div className="text-sm text-neutral-300 mb-1">Division</div>
            <Segmented options={DIVISIONS} value={scenario.division} onChange={(v) => updateScenario({ division: v })} />
          </div>
          <Slider
            label="Skill level"
            value={scenario.skillLevel}
            min={3.5}
            max={5.0}
            step={0.5}
            onChange={(v) => updateScenario({ skillLevel: v })}
            formatValue={(v) => v.toFixed(1)}
          />
        </div>

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

        {topPeak && (
          <div className="rounded-lg border border-neutral-700 p-3">
            <h2 className="text-sm font-semibold text-neutral-200 mb-2">
              Why: {selectedShotType} ({topPeak.score.toFixed(0)})
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
