import { useState } from 'react'
import LiveAnalysis from './modes/LiveAnalysis.jsx'
import Recommender from './modes/Recommender.jsx'
import Grader from './modes/Grader.jsx'
import Quiz from './modes/Quiz.jsx'
import { createDefaultScenario } from './domain/scenario.js'

const MODES = [
  { id: 'live', label: 'Live Analysis', Component: LiveAnalysis },
  { id: 'recommender', label: 'Recommender', Component: Recommender },
  { id: 'grader', label: 'Grader', Component: Grader },
  { id: 'quiz', label: 'Quiz', Component: Quiz },
]

export default function App() {
  const [scenario, setScenario] = useState(createDefaultScenario)
  const [modeId, setModeId] = useState('live')

  const ActiveMode = MODES.find((m) => m.id === modeId).Component

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100">
      <header className="border-b border-neutral-700 px-4 py-3">
        <h1 className="text-base font-semibold tracking-tight">Pickleball Shot Selection Trainer</h1>
        <div className="mt-2 flex gap-1 overflow-x-auto">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setModeId(m.id)}
              className={`whitespace-nowrap rounded px-3 py-1 text-sm border ${
                modeId === m.id ? 'bg-amber-400 text-black border-amber-400' : 'border-neutral-600 text-neutral-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </header>
      <ActiveMode scenario={scenario} onScenarioChange={setScenario} />
    </div>
  )
}
