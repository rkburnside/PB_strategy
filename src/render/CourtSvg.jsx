import { useCallback, useRef } from 'react'
import { COURT } from '../domain/court.js'

const SCALE = 14 // px per foot
const MARGIN = COURT.outOfBoundsMarginFt
const VIEW_W = (COURT.widthFt + MARGIN * 2) * SCALE
const VIEW_H = (COURT.lengthHalfFt * 2 + MARGIN * 2) * SCALE

function ftToPx(x, y) {
  return {
    px: (x + MARGIN) * SCALE,
    py: (COURT.lengthHalfFt + MARGIN - y) * SCALE,
  }
}

function pxToFt(px, py) {
  return {
    x: px / SCALE - MARGIN,
    y: COURT.lengthHalfFt + MARGIN - py / SCALE,
  }
}

const ROLE_COLOR = {
  user: '#5fb3ff',
  partner: '#7de3a8',
  opponent: '#ff8a7a',
}

function PlayerMarker({ player, index, onDrag, onToggleHandedness, locked }) {
  const { px, py } = ftToPx(player.x, player.y)
  const svgRef = useRef(null)
  const dragging = useRef(false)

  const handlePointerDown = useCallback(
    (e) => {
      if (locked) return
      e.preventDefault()
      e.stopPropagation()
      dragging.current = true
      e.target.setPointerCapture(e.pointerId)
    },
    [locked],
  )

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragging.current) return
      const svg = e.target.closest('svg')
      const rect = svg.getBoundingClientRect()
      const scaleX = VIEW_W / rect.width
      const scaleY = VIEW_H / rect.height
      const px2 = (e.clientX - rect.left) * scaleX
      const py2 = (e.clientY - rect.top) * scaleY
      const { x, y } = pxToFt(px2, py2)
      onDrag(index, x, y)
    },
    [index, onDrag],
  )

  const handlePointerUp = useCallback((e) => {
    dragging.current = false
    e.target.releasePointerCapture(e.pointerId)
  }, [])

  const color = ROLE_COLOR[player.role] ?? '#ccc'
  const label = player.role === 'user' ? 'U' : player.role === 'partner' ? 'P' : index === 2 ? 'O1' : 'O2'

  return (
    <g
      ref={svgRef}
      style={{ touchAction: 'none', cursor: 'grab' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Larger invisible hit target for touch, min 44x44 px equivalent in view units */}
      <circle cx={px} cy={py} r={22} fill="transparent" />
      <circle cx={px} cy={py} r={11} fill={color} stroke="#14161a" strokeWidth={2} />
      <text x={px} y={py + 4} textAnchor="middle" fontSize="11" fill="#14161a" fontWeight="700">
        {label}
      </text>
      <g
        onPointerDown={(e) => {
          e.stopPropagation()
          onToggleHandedness(index)
        }}
        style={{ cursor: 'pointer' }}
      >
        <circle cx={px + 16} cy={py - 16} r={9} fill="#14161a" stroke={color} strokeWidth={1.5} />
        <text x={px + 16} y={py - 12} textAnchor="middle" fontSize="9" fill={color} fontWeight="700">
          {player.handedness === 'right' ? 'R' : 'L'}
        </text>
      </g>
    </g>
  )
}

function BallMarker({ ball, onDrag, locked }) {
  const { px, py } = ftToPx(ball.x, ball.y)
  const dragging = useRef(false)

  const handlePointerDown = useCallback(
    (e) => {
      if (locked) return
      e.preventDefault()
      e.stopPropagation()
      dragging.current = true
      e.target.setPointerCapture(e.pointerId)
    },
    [locked],
  )

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragging.current) return
      const svg = e.target.closest('svg')
      const rect = svg.getBoundingClientRect()
      const scaleX = VIEW_W / rect.width
      const scaleY = VIEW_H / rect.height
      const px2 = (e.clientX - rect.left) * scaleX
      const py2 = (e.clientY - rect.top) * scaleY
      const { x, y } = pxToFt(px2, py2)
      onDrag(x, y)
    },
    [onDrag],
  )

  const handlePointerUp = useCallback((e) => {
    dragging.current = false
    e.target.releasePointerCapture(e.pointerId)
  }, [])

  return (
    <g
      style={{ touchAction: 'none', cursor: 'grab' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <circle cx={px} cy={py} r={20} fill="transparent" />
      <circle cx={px} cy={py} r={7} fill="#f5e642" stroke="#14161a" strokeWidth={1.5} />
    </g>
  )
}

export default function CourtSvg({
  scenario,
  onScenarioChange,
  peakMarker,
  heatmapCanvasUrl,
  userTargetMarker,
  onPickTarget,
  locked = false,
}) {
  const netY = ftToPx(0, 0).py
  const kitchenNearY = ftToPx(0, -COURT.kitchenDepthFt).py
  const kitchenFarY = ftToPx(0, COURT.kitchenDepthFt).py
  const baselineNearY = ftToPx(0, -COURT.lengthHalfFt).py
  const baselineFarY = ftToPx(0, COURT.lengthHalfFt).py
  const leftX = ftToPx(0, 0).px
  const rightX = ftToPx(COURT.widthFt, 0).px
  const centerX = ftToPx(COURT.widthFt / 2, 0).px

  const handlePlayerDrag = (index, x, y) => {
    const players = scenario.players.map((p, i) => (i === index ? { ...p, x, y } : p))
    onScenarioChange({ ...scenario, players })
  }

  const handleToggleHandedness = (index) => {
    const players = scenario.players.map((p, i) =>
      i === index ? { ...p, handedness: p.handedness === 'right' ? 'left' : 'right' } : p,
    )
    onScenarioChange({ ...scenario, players })
  }

  const handleBallDrag = (x, y) => {
    onScenarioChange({ ...scenario, ball: { ...scenario.ball, x, y } })
  }

  const handleBackgroundClick = (e) => {
    if (!onPickTarget) return
    const svg = e.currentTarget.ownerSVGElement ?? e.currentTarget
    const rect = svg.getBoundingClientRect()
    const scaleX = VIEW_W / rect.width
    const scaleY = VIEW_H / rect.height
    const px = (e.clientX - rect.left) * scaleX
    const py = (e.clientY - rect.top) * scaleY
    const { x, y } = pxToFt(px, py)
    onPickTarget(x, y)
  }

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      style={{ width: '100%', height: 'auto', touchAction: 'none', background: '#1c3d2e', borderRadius: 8 }}
    >
      {heatmapCanvasUrl && (
        <image
          href={heatmapCanvasUrl}
          x={leftX}
          y={baselineFarY}
          width={rightX - leftX}
          height={netY - baselineFarY}
          preserveAspectRatio="none"
          opacity={0.85}
        />
      )}

      {/* Court outline; also the tap-to-pick-target surface when onPickTarget is provided */}
      <rect
        x={leftX}
        y={baselineFarY}
        width={rightX - leftX}
        height={baselineNearY - baselineFarY}
        fill="transparent"
        stroke="#e8e6e1"
        strokeWidth={2}
        onClick={handleBackgroundClick}
        style={{ cursor: onPickTarget ? 'crosshair' : 'default', pointerEvents: 'all' }}
      />
      {/* Net */}
      <line x1={leftX} y1={netY} x2={rightX} y2={netY} stroke="#e8e6e1" strokeWidth={4} />
      {/* Kitchen lines */}
      <line x1={leftX} y1={kitchenNearY} x2={rightX} y2={kitchenNearY} stroke="#e8e6e1" strokeWidth={1.5} />
      <line x1={leftX} y1={kitchenFarY} x2={rightX} y2={kitchenFarY} stroke="#e8e6e1" strokeWidth={1.5} />
      {/* Centerlines, outside the kitchen only */}
      <line x1={centerX} y1={baselineFarY} x2={centerX} y2={kitchenFarY} stroke="#e8e6e1" strokeWidth={1.5} />
      <line x1={centerX} y1={kitchenNearY} x2={centerX} y2={baselineNearY} stroke="#e8e6e1" strokeWidth={1.5} />

      {peakMarker && (
        <g>
          <circle
            cx={ftToPx(peakMarker.x, peakMarker.y).px}
            cy={ftToPx(peakMarker.x, peakMarker.y).py}
            r={9}
            fill="none"
            stroke="#fff"
            strokeWidth={2}
          />
          <circle
            cx={ftToPx(peakMarker.x, peakMarker.y).px}
            cy={ftToPx(peakMarker.x, peakMarker.y).py}
            r={2.5}
            fill="#fff"
          />
        </g>
      )}

      {userTargetMarker && (
        <g>
          <line
            x1={ftToPx(userTargetMarker.x, userTargetMarker.y).px - 8}
            y1={ftToPx(userTargetMarker.x, userTargetMarker.y).py}
            x2={ftToPx(userTargetMarker.x, userTargetMarker.y).px + 8}
            y2={ftToPx(userTargetMarker.x, userTargetMarker.y).py}
            stroke="#5fb3ff"
            strokeWidth={2.5}
          />
          <line
            x1={ftToPx(userTargetMarker.x, userTargetMarker.y).px}
            y1={ftToPx(userTargetMarker.x, userTargetMarker.y).py - 8}
            x2={ftToPx(userTargetMarker.x, userTargetMarker.y).px}
            y2={ftToPx(userTargetMarker.x, userTargetMarker.y).py + 8}
            stroke="#5fb3ff"
            strokeWidth={2.5}
          />
        </g>
      )}

      {scenario.players.map((p, i) => (
        <PlayerMarker
          key={i}
          player={p}
          index={i}
          onDrag={handlePlayerDrag}
          onToggleHandedness={handleToggleHandedness}
          locked={locked}
        />
      ))}
      <BallMarker ball={scenario.ball} onDrag={handleBallDrag} locked={locked} />
    </svg>
  )
}

export { VIEW_W, VIEW_H, ftToPx }
