/**
 * Element sizing constants used by both computePositions and fitToCanvas.
 * These mirror the actual rendered sizes in components.tsx so layout collision
 * detection matches what's drawn on screen.
 */
export interface ElementSizes {
  ls: number
  // City pin
  pinShapeHH: number
  labelH: number
  labelBelowGap: number
  cityHalfW: number
  cityHalfHAbove: number
  cityHalfHBelow: number
  cityCollisionHW: number
  cityCollisionHHAbove: number
  cityCollisionHHBelow: number
  cityCollisionRadius: number
  // Day sticker
  stickerH: number
  stickerW: number
  // Attraction node
  attDotR: number
  attLabelH: number
  attLabelWPerChar: number
  // Combo internals
  charW: number
  dotR: number
  textGap: number
  lineH: number
  comboPadding: number
  minNodeGap: number
  pinGap: number
  // X-axis clamp (right-side label overflow protection)
  clampHW: number
}

export function getElementSizes(ls: number): ElementSizes {
  const PIN_SIZE = Math.round(52 * ls)
  const PIN_SHAPE_HH = Math.round(PIN_SIZE * 0.54)
  const LABEL_H = Math.round(24 * ls * 1.0 + 8 * ls)
  const LABEL_BELOW_GAP = Math.round(5 * ls)

  const CITY_HALF_W = Math.round(65 * ls)
  const CITY_HALF_H_BELOW = PIN_SHAPE_HH + LABEL_BELOW_GAP + LABEL_H
  const CITY_HALF_H_ABOVE = PIN_SHAPE_HH
  const CITY_COLLISION_HW = CITY_HALF_W + Math.round(10 * ls)
  const CITY_COLLISION_HH_BELOW = CITY_HALF_H_BELOW + Math.round(10 * ls)
  const CITY_COLLISION_HH_ABOVE = CITY_HALF_H_ABOVE + Math.round(10 * ls)

  return {
    ls,
    pinShapeHH: PIN_SHAPE_HH,
    labelH: LABEL_H,
    labelBelowGap: LABEL_BELOW_GAP,
    cityHalfW: CITY_HALF_W,
    cityHalfHAbove: CITY_HALF_H_ABOVE,
    cityHalfHBelow: CITY_HALF_H_BELOW,
    cityCollisionHW: CITY_COLLISION_HW,
    cityCollisionHHAbove: CITY_COLLISION_HH_ABOVE,
    cityCollisionHHBelow: CITY_COLLISION_HH_BELOW,
    cityCollisionRadius: Math.max(CITY_COLLISION_HW, CITY_COLLISION_HH_BELOW),
    stickerH: Math.round(20 * ls + 8 * ls),
    stickerW: Math.round(80 * ls),
    attDotR: Math.round(5 * ls),
    attLabelH: Math.round(18 * ls * 1.2),
    attLabelWPerChar: Math.round(14 * ls),
    charW: Math.round(16 * ls),
    dotR: Math.round(4 * ls),
    textGap: Math.round(6 * ls),
    lineH: Math.round(22 * ls),
    comboPadding: Math.round(12 * ls),
    minNodeGap: Math.round(18 * ls),
    pinGap: Math.round(10 * ls),
    clampHW: Math.round(95 * ls),
  }
}
