import type { RouteMap } from '../types'
import type { ElementSizes } from './elementSizes'
import { resolveRectCollisions } from './geoLayout'
import type { LayoutBounds, ReservedZone } from './types'

/**
 * Scale + translate all positioned nodes so they fit within the available area,
 * then re-enforce rectangular collisions on the scaled layout.
 */
export function fitToCanvas(
  routeMap: RouteMap,
  canvasWidth: number,
  canvasHeight: number,
  sizes: ElementSizes,
  contentTop: number = 0,
  bounds?: LayoutBounds,
  reservedZones?: ReservedZone[],
): void {
  const allNodes = routeMap.nodes
  const { ls, cityHalfW, cityHalfHAbove, cityHalfHBelow, clampHW } = sizes

  // 1. Measure content bounding box (cities + combos)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const node of allNodes) {
    let hw: number, hhAbove: number, hhBelow: number
    if (node.type === 'combo' && node.width && node.height) {
      hw = node.width / 2
      hhAbove = node.height / 2
      hhBelow = node.height / 2
    } else if (node.type === 'city') {
      hw = cityHalfW
      hhAbove = cityHalfHAbove
      hhBelow = cityHalfHBelow
    } else {
      continue
    }
    minX = Math.min(minX, node.position.x - hw)
    minY = Math.min(minY, node.position.y - hhAbove)
    maxX = Math.max(maxX, node.position.x + hw)
    maxY = Math.max(maxY, node.position.y + hhBelow)
  }

  const contentW = maxX - minX
  const contentH = maxY - minY
  if (contentW <= 0 || contentH <= 0) return

  // 2. Available area: header / footer / padding
  const padTop = Math.round(15 * ls)
  const padBottom = Math.round(40 * ls)
  const padLR = Math.round(18 * ls)
  const footerH = Math.round(35 * ls)

  let areaX = bounds ? bounds.x + padLR : padLR
  let areaY = bounds ? bounds.y + padTop : contentTop + padTop
  let areaW = bounds ? bounds.width - padLR * 2 : canvasWidth - padLR * 2
  let areaH = bounds ? bounds.height - padTop - padBottom : canvasHeight - contentTop - padTop - footerH - padBottom

  // Shrink available area to avoid reserved zones (titles, decorations)
  if (reservedZones && reservedZones.length > 0) {
    const shrunk = shrinkForReservedZones(
      { x: areaX, y: areaY, w: areaW, h: areaH },
      reservedZones, canvasWidth, canvasHeight,
    )
    areaX = shrunk.x
    areaY = shrunk.y
    areaW = shrunk.w
    areaH = shrunk.h
  }

  // 3. Scale + translate
  const scale = Math.min(areaW / contentW, areaH / contentH)
  const contentCx = (minX + maxX) / 2
  const contentCy = (minY + maxY) / 2
  const areaCx = areaX + areaW / 2
  const areaCy = areaY + areaH / 2

  for (const node of allNodes) {
    node.position.x = areaCx + (node.position.x - contentCx) * scale
    node.position.y = areaCy + (node.position.y - contentCy) * scale
    if (node.width) node.width = Math.round(node.width * scale)
    if (node.height) node.height = Math.round(node.height * scale)
  }

  // 4. Post-scale rect collision: re-enforce min gaps after shrink
  const cityNodesScaled = allNodes.filter(n => n.type === 'city')
  const scalePinHW = cityHalfW * scale
  const scalePinHAbove = cityHalfHAbove * scale
  const scalePinHBelow = cityHalfHBelow * scale
  const scaleMinGap = 4 * scale

  resolveRectCollisions(cityNodesScaled, canvasWidth, canvasHeight, () => ({
    halfW: scalePinHW,
    halfH_above: scalePinHAbove,
    halfH_below: scalePinHBelow,
  }), 20, scaleMinGap)

  // 5. Extra X-axis clamp: 'right' labels extend beyond pin shape, so the inner
  // rect clamp in resolveRectCollisions (which uses pin half-width) allows cities
  // too close to the right edge. clampHW covers the right-label overflow case.
  for (const node of cityNodesScaled) {
    node.position.x = Math.max(clampHW + 5, Math.min(canvasWidth - clampHW - 5, node.position.x))
  }

  routeMap._fitScale = scale
}

interface Rect { x: number; y: number; w: number; h: number }

function shrinkForReservedZones(
  area: Rect,
  reservedZones: ReservedZone[],
  canvasWidth: number,
  canvasHeight: number,
): Rect {
  let { x: areaX, y: areaY, w: areaW, h: areaH } = area
  for (const zone of reservedZones) {
    const zx = zone.x * canvasWidth
    const zy = zone.y * canvasHeight
    const zw = zone.width * canvasWidth
    const zh = zone.height * canvasHeight

    const overlapLeft = zx < areaX + areaW && zx + zw > areaX
    const overlapTop = zy < areaY + areaH && zy + zh > areaY
    if (!overlapLeft || !overlapTop) continue

    const shrinkLeft = (zx + zw) - areaX
    const shrinkRight = (areaX + areaW) - zx
    const shrinkTop = (zy + zh) - areaY
    const shrinkBottom = (areaY + areaH) - zy

    const minShrink = Math.min(shrinkLeft, shrinkRight, shrinkTop, shrinkBottom)
    if (minShrink === shrinkLeft && shrinkLeft < areaW * 0.5) {
      areaX = zx + zw
      areaW -= shrinkLeft
    } else if (minShrink === shrinkRight && shrinkRight < areaW * 0.5) {
      areaW -= shrinkRight
    } else if (minShrink === shrinkTop && shrinkTop < areaH * 0.5) {
      areaY = zy + zh
      areaH -= shrinkTop
    } else if (minShrink === shrinkBottom && shrinkBottom < areaH * 0.5) {
      areaH -= shrinkBottom
    }
  }
  return { x: areaX, y: areaY, w: areaW, h: areaH }
}
