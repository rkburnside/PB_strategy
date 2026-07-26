// Shared slider/segmented control primitives used across modes.

export function Slider({ label, value, min, max, step, onChange, formatValue, marker }) {
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

export function Segmented({ options, value, onChange, labels }) {
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
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </div>
  )
}

export function RiskBadge({ badge }) {
  const toneClasses = {
    low: 'bg-emerald-900 text-emerald-300 border-emerald-600',
    medium: 'bg-amber-900 text-amber-300 border-amber-600',
    high: 'bg-rose-900 text-rose-300 border-rose-600',
  }
  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${toneClasses[badge.tone]}`}>{badge.label}</span>
  )
}
