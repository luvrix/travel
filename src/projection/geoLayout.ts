import { forceSimulation, forceX, forceY, forceCollide } from 'd3-force'
import type { SimulationNodeDatum } from 'd3-force'
import type { RouteNode } from '../types'

export interface LayoutNode extends SimulationNodeDatum {
  id: string
  anchorX: number
  anchorY: number
  x: number
  y: number
  radius: number
}

export interface GeoLayoutInput {
  id: string
  lat: number
  lng: number
  radius: number
}

export interface GeoLayoutOutput {
  id: string
  x: number
  y: number
}

export interface LayoutConfig {
  radiusFactor: number
  innerRatio: number
  outerRatio: number
  forceStrength: number
  collisionPadding: number
  collisionIterations: number
}

interface RectBounds {
  halfW: number
  halfH_above: number
  halfH_below: number
}

export const CITY_CONFIG: LayoutConfig = {
  radiusFactor: 0.48,
  innerRatio: 0.15,
  outerRatio: 0.92,
  forceStrength: 0.98,
  collisionPadding: 2,
  collisionIterations: 50,
}

export const SUBGRAPH_CONFIG: LayoutConfig = {
  radiusFactor: 0.45,
  innerRatio: 0.2,
  outerRatio: 0.85,
  forceStrength: 0.95,
  collisionPadding: 4,
  collisionIterations: 80,
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * Math.PI / 180
  const lat1r = lat1 * Math.PI / 180
  const lat2r = lat2 * Math.PI / 180
  const y = Math.sin(dLng) * Math.cos(lat2r)
  const x = Math.cos(lat1r) * Math.sin(lat2r) - Math.sin(lat1r) * Math.cos(lat2r) * Math.cos(dLng)
  return Math.atan2(y, x)
}

export function layoutScale(w: number, h: number): number {
  return Math.min(w, h) / 1080 * 1.25
}

export function resolveCollisions(
  nodes: LayoutNode[],
  strength: number,
  padding: number,
  iterations: number,
): void {
  const simulation = forceSimulation(nodes)
    .force("x", forceX<LayoutNode>(d => d.anchorX).strength(strength))
    .force("y", forceY<LayoutNode>(d => d.anchorY).strength(strength))
    .force("collide", forceCollide<LayoutNode>(d => d.radius + padding))
    .alphaDecay(0.04)
    .stop()

  for (let i = 0; i < iterations; i++) simulation.tick()
}

/**
 * Resolve rectangular collisions between nodes.
 * Unlike circle-based d3-force, this accounts for asymmetric bounds (e.g. city pin with label below).
 * Iteratively pushes overlapping nodes apart along the axis of least penetration.
 */
export function resolveRectCollisions(
  nodes: RouteNode[],
  canvasWidth: number,
  canvasHeight: number,
  getBounds: (node: RouteNode) => RectBounds,
  iterations: number = 30,
  minGap: number = 4,
): void {
  for (let iter = 0; iter < iterations; iter++) {
    let anyOverlap = false
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]
      const ab = getBounds(a)
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j]
        const bb = getBounds(b)

        const overlapX = (ab.halfW + bb.halfW + minGap) - Math.abs(a.position.x - b.position.x)
        const overlapY = (
          (a.position.y <= b.position.y)
            ? (ab.halfH_below + bb.halfH_above + minGap) - (b.position.y - a.position.y)
            : (ab.halfH_above + bb.halfH_below + minGap) - (a.position.y - b.position.y)
        )

        if (overlapX > 0 && overlapY > 0) {
          anyOverlap = true
          if (overlapX < overlapY) {
            const push = overlapX / 2
            const sign = a.position.x <= b.position.x ? -1 : 1
            a.position.x += sign * push
            b.position.x -= sign * push
          } else {
            const push = overlapY / 2
            const sign = a.position.y <= b.position.y ? -1 : 1
            a.position.y += sign * push
            b.position.y -= sign * push
          }
        }
      }
    }
    if (!anyOverlap) break
  }

  for (const node of nodes) {
    const b = getBounds(node)
    node.position.x = Math.max(b.halfW + 5, Math.min(canvasWidth - b.halfW - 5, node.position.x))
    node.position.y = Math.max(b.halfH_above + 5, Math.min(canvasHeight - b.halfH_below - 5, node.position.y))
  }
}

export function layoutNodes(
  inputs: GeoLayoutInput[],
  canvasWidth: number,
  canvasHeight: number,
  config: LayoutConfig,
  centerLat?: number,
  centerLng?: number,
): GeoLayoutOutput[] {
  if (inputs.length === 0) return []
  if (inputs.length === 1) {
    return [{ id: inputs[0].id, x: canvasWidth / 2, y: canvasHeight / 2 }]
  }

  const cx = canvasWidth / 2
  const cy = canvasHeight / 2
  const canvasRadius = Math.min(canvasWidth, canvasHeight) / 2 * config.radiusFactor

  const geoLat = centerLat ?? inputs.reduce((s, n) => s + n.lat, 0) / inputs.length
  const geoLng = centerLng ?? inputs.reduce((s, n) => s + n.lng, 0) / inputs.length

  // 真实方位角 + 距离（不做人为去挤，保留相对方位关系）
  const polar = inputs.map((n, i) => {
    const distKm = haversine(geoLat, geoLng, n.lat, n.lng)
    let brng = bearing(geoLat, geoLng, n.lat, n.lng)
    // 退化兜底：所有点同坐标时 bearing 是 NaN/0，分配均匀方位角避免堆叠
    if (distKm < 1e-9 || !isFinite(brng)) brng = (2 * Math.PI * i) / inputs.length
    return { id: n.id, distKm, brng, radius: n.radius }
  })

  // rank-based 径向压缩：最近点 innerRatio，最远点 outerRatio，线性插值
  const sorted = [...polar].sort((a, b) => a.distKm - b.distKm)
  const rankMap = new Map<string, number>()
  sorted.forEach((p, i) => rankMap.set(p.id, i))

  const n = inputs.length
  const denom = Math.max(n - 1, 1)

  const nodes: LayoutNode[] = polar.map(p => {
    const rank = rankMap.get(p.id)!
    const ratio = config.innerRatio +
      (config.outerRatio - config.innerRatio) * (rank / denom)
    const screenX = cx + ratio * canvasRadius * Math.sin(p.brng)
    const screenY = cy - ratio * canvasRadius * Math.cos(p.brng)

    return {
      id: p.id,
      anchorX: screenX,
      anchorY: screenY,
      x: screenX,
      y: screenY,
      radius: p.radius,
    }
  })

  // Cartesian 碰撞修正（不动方位，只推开重叠）
  resolveCollisions(
    nodes,
    config.forceStrength,
    config.collisionPadding,
    config.collisionIterations,
  )

  return nodes.map(n => ({ id: n.id, x: n.x, y: n.y }))
}

/** Enforce a minimum center-to-center gap between nodes; push apart iteratively. */
export function enforceMinGap(
  positions: GeoLayoutOutput[],
  radii: Map<string, number>,
  minGap: number,
  iterations: number = 10,
): void {
  for (let iter = 0; iter < iterations; iter++) {
    let pushed = false
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i], b = positions[j]
        const ra = radii.get(a.id)!, rb = radii.get(b.id)!
        const dx = b.x - a.x, dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const minDist = ra + rb + minGap
        if (dist < minDist) {
          const push = (minDist - dist) / 2
          const nx = dx / dist, ny = dy / dist
          a.x -= nx * push; a.y -= ny * push
          b.x += nx * push; b.y += ny * push
          pushed = true
        }
      }
    }
    if (!pushed) break
  }
}
