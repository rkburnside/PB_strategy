import { useEffect, useMemo, useRef, useState } from 'react'
import CourtSvg from '../render/CourtSvg.jsx'
import { buildPrecomputedContext } from '../domain/derive.js'
import { rankedCandidatesAcrossSpeeds, evaluateChoice, CANDIDATE_SHOT_TYPES } from '../domain/candidates.js'
import { generateRandomScenario } from '../domain/templates.js'
import { Segmented } from './shared/controls.jsx'

const TIME_LIMIT_S = 10
const DIVISIONS = ['mens', 'womens', 'mixed']
const HIT_THRESHOLD = 8 // score delta from optimal that still counts as a correct read

export default function Quiz() {
  const [division, setDivision] = useState('mens')
  const [quizScenario, setQuizScenario] = useState(() => generateRandomScenario('mens'))
  const [chosenShotType, setChosenShotType] = useState(null)
  const [userTarget, setUserTarget] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_S)
  const [streak, setStreak] = useState(0)
  const [history, setHistory] = useState([])
  const timerRef = useRef(null)

  const context = useMemo(() => buildPrecomputedContext(quizScenario), [quizScenario])

  const fullRanking = useMemo(
    () => (revealed ? rankedCandidatesAcrossSpeeds(context, { topN: CANDIDATE_SHOT_TYPES.length }) : []),
    [revealed, context],
  )
  const optimal = fullRanking[0]
  const userChoice = useMemo(
    () =>
      revealed && userTarget && chosenShotType
        ? evaluateChoice(context, userTarget.x, userTarget.y, chosenShotType)
        : null,
    [revealed, userTarget, chosenShotType, context],
  )

  // Synced after every render (not during) so the interval callback below —
  // created once per round, not per keystroke — can read the latest picks
  // without going stale.
  const latestRef = useRef({ context, userTarget, chosenShotType })
  useEffect(() => {
    latestRef.current = { context, userTarget, chosenShotType }
  })

  const reveal = () => {
    const { context, userTarget, chosenShotType } = latestRef.current
    const ranking = rankedCandidatesAcrossSpeeds(context, { topN: CANDIDATE_SHOT_TYPES.length })
    const best = ranking[0]
    const choice =
      userTarget && chosenShotType ? evaluateChoice(context, userTarget.x, userTarget.y, chosenShotType) : null
    const hit = choice ? best.score - choice.score <= HIT_THRESHOLD : false
    setHistory((h) => [...h, { hit }])
    setStreak((s) => (hit ? s + 1 : 0))
    setRevealed(true)
  }

  const startRound = (nextDivision = division) => {
    clearInterval(timerRef.current)
    setQuizScenario(generateRandomScenario(nextDivision))
    setChosenShotType(null)
    setUserTarget(null)
    setRevealed(false)
    setTimeLeft(TIME_LIMIT_S)
  }

  useEffect(() => {
    if (revealed) return
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          reveal()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [revealed, quizScenario])

  const handleCommit = () => {
    if (!userTarget || !chosenShotType) return
    clearInterval(timerRef.current)
    reveal()
  }

  const handleDivisionChange = (d) => {
    setDivision(d)
    startRound(d)
  }

  const accuracy = history.length ? Math.round((history.filter((h) => h.hit).length / history.length) * 100) : null

  return (
    <div className="flex flex-col md:flex-row gap-4 p-3 md:p-4">
      <div className="md:w-3/5">
        <CourtSvg
          scenario={quizScenario}
          onScenarioChange={() => {}}
          peakMarker={revealed ? optimal : null}
          userTargetMarker={userTarget}
          onPickTarget={revealed ? undefined : (x, y) => setUserTarget({ x, y })}
          locked
        />
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-neutral-400">{quizScenario.templateName}</span>
          {!revealed && (
            <span className={`font-mono ${timeLeft <= 3 ? 'text-rose-400' : 'text-neutral-300'}`}>{timeLeft}s</span>
          )}
        </div>
      </div>

      <div className="md:w-2/5 flex flex-col gap-4">
        <div className="rounded-lg border border-neutral-700 p-3 flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span>
              Streak: <span className="font-mono text-amber-300">{streak}</span>
            </span>
            <span>
              Accuracy: <span className="font-mono">{accuracy != null ? `${accuracy}%` : '—'}</span> ({history.length})
            </span>
          </div>
          <div className="text-sm text-neutral-300 mb-1">Division</div>
          <Segmented options={DIVISIONS} value={division} onChange={handleDivisionChange} />
        </div>

        {!revealed && (
          <div className="rounded-lg border border-neutral-700 p-3" data-testid="quiz-shot-picker">
            <h2 className="text-sm font-semibold text-neutral-200 mb-2">Pick your shot and target</h2>
            <Segmented options={CANDIDATE_SHOT_TYPES} value={chosenShotType} onChange={setChosenShotType} />
            <p className="mt-2 text-xs text-neutral-400">
              {userTarget
                ? `Target set at (${userTarget.x.toFixed(1)}, ${userTarget.y.toFixed(1)})`
                : 'Tap the court to set your target.'}
            </p>
            <button
              onClick={handleCommit}
              disabled={!userTarget || !chosenShotType}
              className="mt-3 w-full rounded-lg bg-amber-400 disabled:bg-neutral-700 disabled:text-neutral-500 text-black font-semibold py-3 text-base"
            >
              Commit
            </button>
          </div>
        )}

        {revealed && (
          <div className="rounded-lg border border-neutral-700 p-3 flex flex-col gap-2 text-sm">
            <h2 className="text-sm font-semibold text-neutral-200">Reveal</h2>
            {userChoice ? (
              <>
                <div>
                  Your choice: <span className="font-mono">{userChoice.shotType}</span> — score{' '}
                  <span className="font-mono">{userChoice.score.toFixed(0)}</span>
                </div>
                <div>
                  Optimal: <span className="font-mono">{optimal.shotType}</span> — score{' '}
                  <span className="font-mono">{optimal.score.toFixed(0)}</span>
                </div>
                <div
                  className={optimal.score - userChoice.score <= HIT_THRESHOLD ? 'text-emerald-300' : 'text-rose-300'}
                >
                  {optimal.score - userChoice.score <= HIT_THRESHOLD ? 'Good read.' : 'Off the mark.'}
                </div>
              </>
            ) : (
              <div className="text-rose-300">Time expired with no commit — counted as a miss.</div>
            )}
            <button
              onClick={() => startRound()}
              className="mt-2 w-full rounded-lg bg-neutral-700 py-3 text-base font-semibold"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
