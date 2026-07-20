import { Slider, Segmented } from './controls.jsx'
import { netClearanceHeightFt } from '../../domain/court.js'
import { SHOT_TYPES } from '../../domain/scenario.js'

const DIVISIONS = ['mens', 'womens', 'mixed']
const BOUNCE_STATES = ['volley', 'afterBounce']

// Shared scenario-field controls (height, incoming speed, balance, bounce,
// division, skill) reused by every mode that lets the user set up a
// scenario. Mode-specific controls (output speed, incoming shot type, a
// commit button, ...) are passed as children so each mode stays a thin
// presentation layer per docs/MODES.md.
export default function ScenarioPanel({ scenario, onScenarioChange, children, showIncomingShot = false }) {
  const netTape = netClearanceHeightFt(scenario.ball.x)
  const updateScenario = (patch) => onScenarioChange({ ...scenario, ...patch })

  return (
    <div className="rounded-lg border border-neutral-700 p-3">
      <h2 className="text-sm font-semibold text-neutral-200 mb-2">Scenario</h2>

      {showIncomingShot && (
        <div className="mb-3" data-testid="incoming-shot-selector">
          <div className="text-sm text-neutral-300 mb-1">Incoming shot</div>
          <Segmented options={SHOT_TYPES} value={scenario.incomingShot} onChange={(v) => updateScenario({ incomingShot: v })} />
        </div>
      )}

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

      {children}

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
  )
}
