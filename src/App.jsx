import { useState } from 'react'
import LiveAnalysis from './modes/LiveAnalysis.jsx'
import { createDefaultScenario } from './domain/scenario.js'

export default function App() {
  const [scenario, setScenario] = useState(createDefaultScenario)

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100">
      <header className="border-b border-neutral-700 px-4 py-3">
        <h1 className="text-base font-semibold tracking-tight">Pickleball Shot Selection Trainer</h1>
        <p className="text-xs text-neutral-400">Live Analysis — drag players and the ball, watch the surface respond</p>
      </header>
      <LiveAnalysis scenario={scenario} onScenarioChange={setScenario} />
    </div>
  )
}
