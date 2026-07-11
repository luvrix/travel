import type { RouteMap, RouteNode } from '../../types'
import type { TemplateConfig, TemplateGradient } from '../types'

export { MODE_LABEL, MODE_ICON } from '../../lib/transport'

// ── Utility functions ──

export function visualScale(w: number, h: number): number {
  const minDim = Math.min(w, h)
  return minDim / 1080 * 1.25
}

export function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace('#', ''), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

export function blendColors(hex1: string, hex2: string, ratio: number): string {
  const [r1, g1, b1] = hexToRgb(hex1)
  const [r2, g2, b2] = hexToRgb(hex2)
  const r = Math.round(r1 * ratio + r2 * (1 - ratio))
  const g = Math.round(g1 * ratio + g2 * (1 - ratio))
  const b = Math.round(b1 * ratio + b2 * (1 - ratio))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

export function buildGradient(gradient: TemplateGradient, direction: 'vertical' | 'radial'): string {
  return direction === 'radial'
    ? `radial-gradient(circle, ${gradient.stops.map(s => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ')})`
    : `linear-gradient(180deg, ${gradient.stops.map(s => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ')})`
}

// ── Edge path computation ──

export type ComputedEdge = RouteMap['edges'][0] & {
  sx: number; sy: number; tx: number; ty: number
  cpx: number; cpy: number
  color: string
  mxIcon: number; myIcon: number
  local?: boolean
}

export function computeEdgePaths(
  edges: RouteMap['edges'],
  nodeMap: Map<string, RouteNode>,
  scale: number,
  edgeStrokeColor: string,
  lineType: 'curve' | 'straight' | 'step' = 'curve',
  colorMode?: 'day' | 'theme' | 'day-tinted',
): ComputedEdge[] {
  const pairKey = (a: string, b: string) => [a, b].sort().join('-')
  const pairCount = new Map<string, number>()
  for (const e of edges) {
    if (e.line === 'arc') pairCount.set(pairKey(e.sourceId, e.targetId), (pairCount.get(pairKey(e.sourceId, e.targetId)) ?? 0) + 1)
  }
  const pairCurrentIdx = new Map<string, number>()

  const resolveColor = (dayColor: string | undefined): string => {
    const mode = colorMode ?? 'day'
    if (mode === 'theme') return edgeStrokeColor
    if (mode === 'day-tinted' && dayColor) return blendColors(edgeStrokeColor, dayColor, 0.6)
    return dayColor ?? edgeStrokeColor
  }

  return edges.map(e => {
    const src = nodeMap.get(e.sourceId), tgt = nodeMap.get(e.targetId)
    if (!src || !tgt) return null

    const isArc = e.line === 'arc'
    const color = resolveColor(e.color)
    let curveOffset: number

    // Base offset ensures parallel edges between same pair are visually separated
    const baseSeparation = 30 * scale
    if (lineType === 'straight') {
      curveOffset = baseSeparation
    } else if (isArc) {
      const k = pairKey(e.sourceId, e.targetId)
      const idx = pairCurrentIdx.get(k) ?? 0
      pairCurrentIdx.set(k, idx + 1)
      const total = pairCount.get(k) ?? 1
      curveOffset = total > 1 ? baseSeparation * (1 + idx) : baseSeparation
    } else {
      curveOffset = baseSeparation
    }

    const sx = src.position.x, sy = src.position.y
    const tx = tgt.position.x, ty = tgt.position.y
    const mx = (sx + tx) / 2, my = (sy + ty) / 2
    const dx = tx - sx, dy = ty - sy, len = Math.sqrt(dx * dx + dy * dy) || 1
    const cpx = mx + (-dy / len) * curveOffset, cpy = my + (dx / len) * curveOffset
    const mxIcon = (sx + 2 * cpx + tx) / 4, myIcon = (sy + 2 * cpy + ty) / 4

    const local = !!(src.parentId && tgt.parentId)
    return { ...e, sx, sy, tx, ty, cpx, cpy, color, mxIcon, myIcon, local }
  }).filter(Boolean) as ComputedEdge[]
}

// ── Renderer props type ──

export interface RendererProps {
  routeMap: RouteMap
  template: TemplateConfig
  canvasWidth: number
  canvasHeight: number
  hasBackgroundPhoto?: boolean
}
