export interface LayoutBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface ReservedZone {
  /** Fractional x of zone's left edge (0-1) */
  x: number
  /** Fractional y of zone's top edge (0-1) */
  y: number
  /** Fractional width (0-1) */
  width: number
  /** Fractional height (0-1) */
  height: number
}
