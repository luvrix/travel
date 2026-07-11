export type TemplateId = string

// ── Photo arrangement ──

export type PhotoArrangement =
  | { type: 'hero'; source: 'first-city' | 'destination' }
  | { type: 'grid'; columns: 2 | 3; rows: 1 | 2; gap: number }
  | { type: 'strip' }
  | { type: 'none' }

// ── Photo style (visual treatment of inserted photos) ──

export interface PhotoStyle {
  /** Border radius in design units */
  borderRadius: number
  /** Border: e.g. '2px solid rgba(255,255,255,0.2)' or 'none' */
  border: string
  /** Box shadow */
  shadow: string
  /** Overall opacity (0-1) */
  opacity?: number
  /** Optional CSS filter, e.g. 'sepia(0.3) contrast(1.05)' */
  filter?: string
  /** z-index relative to route map (negative = behind, positive = above) */
  zIndex: number
}

// ── Content zones (fractional coordinates 0-1) ──

export interface TemplateZone {
  x: number
  y: number
  width: number
  height: number
}

export interface TemplateLayout {
  header: TemplateZone
  routeMap: TemplateZone
  footer: TemplateZone
  photos: TemplateZone
}

// ── Colors ──

export interface TemplateColors {
  pinFill: string
  attractionFill: string
  attractionStroke: string
  comboFill: string
  comboStroke: string
  comboShadow: string
  cityLabelFill: string
  attractionLabelFill: string
  transportIconColor: string
  edgeStroke: string
  canvasBackground: string
}

// ── Typography ──

export interface TemplateFonts {
  city: { size: number; weight: string; color: string; family: string }
  attraction: { size: number; weight: string; color: string; family: string }
  transport: { size: number; weight: string; color: string; family: string }
}

// ── Background / overlay system ──

export type BackgroundStyle =
  | { type: 'clean' }
  | { type: 'cinematic'; topColor: string; topStop: number; bottomColor: string; bottomStop: number; colorWashOpacity: number }
  | { type: 'timeline'; colorWashOpacity: number }

// ── Gradient ──

export interface TemplateGradient {
  stops: { offset: number; color: string }[]
}

// ── Title layout (flexible positioning) ──

export interface TitleLayout {
  /** Fractional position 0-1, relative to canvas */
  x: number
  y: number
  /** Rotation in degrees */
  rotation?: number
  /** Text alignment */
  align: 'left' | 'center' | 'right'
  /** How title text is styled */
  color: string
  fontSize: number
  fontWeight: string
  fontFamily: string
  /** Optional text shadow */
  textShadow?: string
  /** Optional letter spacing multiplier */
  letterSpacing?: number
  /** Optional background behind title */
  background?: string
  /** Optional padding for background */
  padding?: string
  /** Optional border radius for background */
  borderRadius?: number
}

export interface SubtitleLayout {
  x: number
  y: number
  rotation?: number
  align: 'left' | 'center' | 'right'
  color: string
  fontSize: number
  fontWeight: string
  fontFamily: string
  textShadow?: string
  letterSpacing?: number
}

// ── Decorative elements ──

export type DecorationType = 'stamp' | 'label' | 'line' | 'badge' | 'watermark'

export interface TemplateDecoration {
  type: DecorationType
  /** Position relative to canvas (0-1) */
  x: number
  y: number
  /** Rotation in degrees */
  rotation?: number
  /** Text content (for stamp/label/badge/watermark) */
  text?: string
  /** Font size in design units */
  fontSize?: number
  fontWeight?: string
  fontFamily?: string
  color: string
  opacity?: number
  /** For 'line' type: width and thickness */
  width?: number
  thickness?: number
  /** For 'badge' type: border and background */
  borderColor?: string
  backgroundColor?: string
  borderWidth?: number
  borderRadius?: number
  padding?: string
  /** For 'stamp' type: double border effect */
  doubleBorder?: boolean
  /** Letter spacing */
  letterSpacing?: number
  /** Text transform */
  textTransform?: 'uppercase' | 'lowercase' | 'none'
}

// ── Header (legacy, kept for compatibility) ──

export interface TemplateHeader {
  titleFont: { size: number; weight: string; color: string; family: string }
  subtitleFont: { size: number; weight: string; color: string; family: string }
  divider?: { color: string; style: 'solid' | 'dashed' }
  align: 'left' | 'center' | 'right'
}

// ── Frame ──

export interface TemplateFrame {
  borderColor: string
  innerLineColor?: string
  margin: number
  borderWidth: number
  borderRadius: number
  innerLine?: {
    margin: number
    borderWidth: number
    borderRadius: number
  }
}

// ── Footer ──

export interface TemplateFooter {
  text: string
  color: string
  letterSpacing: number
}

// ── Element shape rules ──

export interface CityPinStyle {
  shape: 'circle-photo' | 'pin-drop' | 'diamond' | 'square-rounded'
  size: number
  showPhoto: boolean
  showLabel: boolean
  labelPosition: 'below' | 'right'
}

export interface AttractionNodeStyle {
  shape: 'dot' | 'diamond' | 'none'
  size: number
  showLabel: boolean
  labelPosition: 'right' | 'below'
}

export interface EdgeStyle {
  lineType: 'curve' | 'straight' | 'step'
  trailStyle: 'dot-trail' | 'flow' | 'dash' | 'thin' | 'sci-fi'
  showTransportBadge: boolean
  glowEffect: boolean
  /**
   * How to derive edge colors:
   * - 'day': use the original day color (default)
   * - 'theme': use template.colors.edgeStroke for all edges
   * - 'day-tinted': blend day color with template.colors.edgeStroke for harmony
   */
  colorMode?: 'day' | 'theme' | 'day-tinted'
}

export interface ComboCardStyle {
  style: 'glass' | 'solid' | 'outline' | 'none'
  borderRadius: number
}

export interface DayStickerStyle {
  style: 'pill' | 'badge' | 'none'
  position: 'above-first-node' | 'inline'
}

// ── Corners ──

export interface TemplateCorner {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  svg: string
  width: number
  height: number
}

// ── Main unified config ──

export interface TemplateConfig {
  id: TemplateId
  name: string
  icon: string
  description: string

  // Colors & visual
  colors: TemplateColors
  fonts: TemplateFonts
  gradient: TemplateGradient
  gradientDirection: 'vertical' | 'radial'
  header: TemplateHeader
  frame?: TemplateFrame
  footer: TemplateFooter
  background: BackgroundStyle

  // Flexible title positioning (overrides header-based positioning)
  titleLayout?: TitleLayout
  subtitleLayout?: SubtitleLayout
  decorations?: TemplateDecoration[]

  // Structure & layout
  photo: PhotoArrangement
  photoStyle: PhotoStyle
  layout: TemplateLayout
  cityPin: CityPinStyle
  attractionNode: AttractionNodeStyle
  edge: EdgeStyle
  comboCard: ComboCardStyle
  daySticker: DayStickerStyle
  headerHeight: number
  corners?: TemplateCorner[]
}
