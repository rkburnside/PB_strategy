import { useState } from 'react'

// Legend for the court diagram. Every glyph the court can draw is described
// here so the diagram is readable without prior context. Collapsible because
// experienced users stop needing it, but it defaults open — the markers are
// not self-explanatory on first look.
//
// Swatches are inline SVG reproductions of the real markers rather than
// coloured squares, so the key can't drift from CourtSvg's rendering.

const ROLE_COLOR = {
  user: '#5fb3ff',
  partner: '#7de3a8',
  opponent: '#ff8a7a',
}

function MarkerSwatch({ label, color, badge }) {
  return (
    <svg width="46" height="30" viewBox="0 0 46 30" aria-hidden="true" className="shrink-0">
      <circle cx="26" cy="17" r="10" fill={color} stroke="#14161a" strokeWidth="2" />
      <text x="26" y="21" textAnchor="middle" fontSize="10" fill="#14161a" fontWeight="700">
        {label}
      </text>
      {badge && (
        <>
          <circle cx="12" cy="8" r="8" fill="#14161a" stroke={color} strokeWidth="1.5" />
          <text x="12" y="11.5" textAnchor="middle" fontSize="8" fill={color} fontWeight="700">
            {badge}
          </text>
        </>
      )}
    </svg>
  )
}

function BallSwatch() {
  return (
    <svg width="46" height="30" viewBox="0 0 46 30" aria-hidden="true" className="shrink-0">
      <circle cx="23" cy="15" r="7" fill="#f5e642" stroke="#14161a" strokeWidth="1.5" />
    </svg>
  )
}

function PeakSwatch() {
  return (
    <svg width="46" height="30" viewBox="0 0 46 30" aria-hidden="true" className="shrink-0">
      <circle cx="23" cy="15" r="9" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx="23" cy="15" r="2.5" fill="#fff" />
    </svg>
  )
}

function TargetSwatch() {
  return (
    <svg width="46" height="30" viewBox="0 0 46 30" aria-hidden="true" className="shrink-0">
      <line x1="15" y1="15" x2="31" y2="15" stroke="#5fb3ff" strokeWidth="2.5" />
      <line x1="23" y1="7" x2="23" y2="23" stroke="#5fb3ff" strokeWidth="2.5" />
    </svg>
  )
}

function Row({ swatch, name, desc }) {
  return (
    <li className="flex items-start gap-2 py-1">
      {swatch}
      <span className="text-sm leading-snug">
        <span className="font-semibold text-neutral-100">{name}</span>
        <span className="text-neutral-400"> — {desc}</span>
      </span>
    </li>
  )
}

export default function CourtKey({ showTargetCrosshair = false, showHeatmap = true }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-lg border border-neutral-700">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-neutral-200"
      >
        Key
        <span className="text-neutral-500">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="border-t border-neutral-700 px-3 py-2">
          <ul className="flex flex-col">
            <Row swatch={<MarkerSwatch label="U" color={ROLE_COLOR.user} />} name="U — You" desc="drag to reposition" />
            <Row
              swatch={<MarkerSwatch label="P" color={ROLE_COLOR.partner} />}
              name="P — Your partner"
              desc="drag to reposition"
            />
            <Row
              swatch={<MarkerSwatch label="O1" color={ROLE_COLOR.opponent} />}
              name="O1 / O2 — Opponents"
              desc="the team across the net"
            />
            <Row
              swatch={<MarkerSwatch label="O1" color={ROLE_COLOR.opponent} badge="R" />}
              name="R / L — Paddle hand"
              desc="sits on the player's paddle side, between them and the net. Opponents face you, so theirs render mirrored. Tap to flip."
            />
            <Row
              swatch={<BallSwatch />}
              name="Yellow dot — The ball"
              desc="where contact is being made; drag to move"
            />
            <Row
              swatch={<PeakSwatch />}
              name="White ring — Best target"
              desc="the highest-scoring spot for the selected shot"
            />
            {showTargetCrosshair && (
              <Row
                swatch={<TargetSwatch />}
                name="Blue crosshair — Your target"
                desc="the spot you committed to, for comparison"
              />
            )}
          </ul>

          {showHeatmap && (
            <div className="mt-2 border-t border-neutral-700 pt-2">
              <div className="text-sm font-semibold text-neutral-100">Colour wash — Shot quality</div>
              <p className="mt-1 text-sm leading-snug text-neutral-400">
                Every point on the opponent&rsquo;s half scored for the selected shot and speed. Your own half is left
                plain because you are not aiming there.
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-neutral-300">
                <span>Risk</span>
                <div
                  className="h-2 flex-1 rounded"
                  style={{ background: 'linear-gradient(to right, rgb(60,90,200), rgb(255,255,255), rgb(255,140,40))' }}
                />
                <span>Opportunity</span>
              </div>
              <p className="mt-1 text-xs leading-snug text-neutral-500">
                Blue = poor target, pale = neutral, orange = strong. The blue pockets on the opponents are their
                reachable zones; the vertical bands are lanes the rules favour or avoid.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
