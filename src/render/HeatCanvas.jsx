// Rasterizes the evaluateTarget scoring surface to a canvas data URL, drawn
// beneath the SVG court. See docs/HEATMAP.md "Rendering".
import { useMemo } from 'react'
import { sampleHeatmap } from '../domain/candidates.js'

// Colorblind-safe diverging scale: blue (risk/low) -> white (neutral) -> amber (opportunity/high).
// Paired with contour lines in the UI legend rather than relying on hue alone.
function scoreToColor(score) {
  const t = Math.max(0, Math.min(100, score)) / 100
  if (t < 0.5) {
    const k = t / 0.5
    return [Math.round(60 + k * 195), Math.round(90 + k * 165), Math.round(200 + k * 55)]
  }
  const k = (t - 0.5) / 0.5
  return [255, Math.round(255 - k * 115), Math.round(255 - k * 215)]
}

// Returns { url, extent } — the extent is the court rectangle the raster
// covers, which is larger than the court itself because sampling runs past
// the lines so out-of-bounds renders as visibly bad.
export function useHeatmapImage(context, shotType, speed, gridStepFt = 1) {
  return useMemo(() => {
    if (!context) return null
    const { xs, ys, grid, extent } = sampleHeatmap(context, shotType, speed, gridStepFt)
    const canvas = document.createElement('canvas')
    canvas.width = xs.length
    canvas.height = ys.length
    const ctx2d = canvas.getContext('2d')
    const imageData = ctx2d.createImageData(xs.length, ys.length)

    // grid row 0 is the smallest y (nearest the viewer); the image is placed
    // top-down with the far baseline at the top, so the largest y must land in
    // canvas row 0.
    for (let row = 0; row < ys.length; row++) {
      const dataRow = ys.length - 1 - row
      for (let col = 0; col < xs.length; col++) {
        const score = grid[dataRow][col]
        const [r, g, b] = scoreToColor(score)
        const idx = (row * xs.length + col) * 4
        imageData.data[idx] = r
        imageData.data[idx + 1] = g
        imageData.data[idx + 2] = b
        imageData.data[idx + 3] = 235
      }
    }
    ctx2d.putImageData(imageData, 0, 0)
    return { url: canvas.toDataURL(), extent }
  }, [context, shotType, speed, gridStepFt])
}

export function HeatmapLegend() {
  return (
    <div className="flex items-center gap-2 text-xs text-neutral-300">
      <span>Risk</span>
      <div
        className="h-2 w-32 rounded"
        style={{ background: 'linear-gradient(to right, rgb(60,90,200), rgb(255,255,255), rgb(255,140,40))' }}
      />
      <span>Opportunity</span>
    </div>
  )
}
