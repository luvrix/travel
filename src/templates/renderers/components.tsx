import type { RouteNode, TransportMode, RouteMap } from '../../types'
import type { TemplateConfig, TemplateDecoration } from '../types'
import {
  type ComputedEdge,
  visualScale, rgba, buildGradient,
  MODE_LABEL, MODE_ICON,
} from './shared'

// ── Frame ──

export function Frame({ template, s }: { template: TemplateConfig; s: number }) {
  if (!template.frame) return null
  return (
    <>
      <div style={{
        position: 'absolute',
        inset: template.frame.margin * s,
        border: `${template.frame.borderWidth}px solid ${template.frame.borderColor}`,
        borderRadius: template.frame.borderRadius,
        pointerEvents: 'none',
      }} />
      {template.frame.innerLine && (
        <div style={{
          position: 'absolute',
          inset: (template.frame.margin + template.frame.innerLine.margin) * s,
          border: `${template.frame.innerLine.borderWidth}px solid ${template.frame.innerLineColor ?? 'transparent'}`,
          borderRadius: template.frame.innerLine.borderRadius,
          pointerEvents: 'none',
        }} />
      )}
    </>
  )
}

// ── Title (flexible positioning) ──

export function Title({ template, s, canvasWidth, canvasHeight, title, date }: {
  template: TemplateConfig; s: number; canvasWidth: number; canvasHeight: number; title: string; date: string
}) {
  const tl = template.titleLayout
  const sl = template.subtitleLayout

  // If titleLayout is defined, use it for custom positioning
  if (tl) {
    return (
      <>
        <div style={{
          position: 'absolute',
          left: tl.x * canvasWidth,
          top: tl.y * canvasHeight,
          transform: `translate(${tl.align === 'center' ? '-50%' : tl.align === 'right' ? '-100%' : '0'}, -50%) rotate(${tl.rotation ?? 0}deg)`,
          textAlign: tl.align,
        }}>
          <div style={{
            fontSize: tl.fontSize * s,
            fontWeight: tl.fontWeight,
            color: tl.color,
            fontFamily: tl.fontFamily,
            textShadow: tl.textShadow ?? 'none',
            letterSpacing: (tl.letterSpacing ?? 1) * s,
            background: tl.background,
            padding: tl.padding,
            borderRadius: tl.borderRadius,
            lineHeight: 1.2,
          }}>
            {title}
          </div>
        </div>
        {sl && (
          <div style={{
            position: 'absolute',
            left: sl.x * canvasWidth,
            top: sl.y * canvasHeight,
            transform: `translate(${sl.align === 'center' ? '-50%' : sl.align === 'right' ? '-100%' : '0'}, -50%) rotate(${sl.rotation ?? 0}deg)`,
            textAlign: sl.align,
          }}>
            <div style={{
              fontSize: sl.fontSize * s,
              fontWeight: sl.fontWeight,
              color: sl.color,
              fontFamily: sl.fontFamily,
              textShadow: sl.textShadow ?? 'none',
              letterSpacing: (sl.letterSpacing ?? 1) * s,
            }}>
              {date}
            </div>
          </div>
        )}
      </>
    )
  }

  // Fallback to legacy header layout
  return <Header template={template} s={s} title={title} date={date} />
}

// ── Header (legacy top bar) ──

export function Header({ template, s, title, date }: {
  template: TemplateConfig; s: number; title: string; date: string
}) {
  const align = template.header.align
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      height: template.headerHeight,
      display: 'flex', flexDirection: 'column',
      alignItems: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
      paddingLeft: align === 'left' ? 30 * s : 0,
      paddingRight: align === 'right' ? 30 * s : 0,
    }}>
      <div style={{
        fontSize: template.header.titleFont.size * s,
        fontWeight: template.header.titleFont.weight,
        color: '#FFFFFF',
        textShadow: '0 2px 12px rgba(0,0,0,0.7), 0 0 30px rgba(0,0,0,0.3)',
        letterSpacing: 3 * s,
      }}>
        {title}
      </div>
      <div style={{
        fontSize: template.header.subtitleFont.size * s,
        fontWeight: template.header.subtitleFont.weight,
        color: 'rgba(255,255,255,0.85)',
        textShadow: '0 1px 6px rgba(0,0,0,0.6)',
        marginTop: 6 * s,
        letterSpacing: 1 * s,
      }}>
        {date}
      </div>
      {template.header.divider && (
        <div style={{
          width: 60 * s,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${template.header.divider.color}, transparent)`,
          marginTop: 10 * s,
          opacity: 0.7,
        }} />
      )}
    </div>
  )
}

// ── Decorations ──

export function Decorations({ template, s, canvasWidth, canvasHeight }: {
  template: TemplateConfig; s: number; canvasWidth: number; canvasHeight: number
}) {
  if (!template.decorations?.length) return null
  return (
    <>
      {template.decorations.map((d, i) => (
        <DecorationElement key={i} decoration={d} s={s} canvasWidth={canvasWidth} canvasHeight={canvasHeight} />
      ))}
    </>
  )
}

function DecorationElement({ decoration: d, s, canvasWidth, canvasHeight }: {
  decoration: TemplateDecoration; s: number; canvasWidth: number; canvasHeight: number
}) {
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: d.x * canvasWidth,
    top: d.y * canvasHeight,
    transform: `translate(-50%, -50%) rotate(${d.rotation ?? 0}deg)`,
    color: d.color,
    opacity: d.opacity ?? 1,
    pointerEvents: 'none',
  }

  switch (d.type) {
    case 'stamp':
      return (
        <div style={{
          ...baseStyle,
          border: `${d.borderWidth ?? 2}px solid ${d.color}`,
          padding: d.padding ?? `${4 * s}px ${12 * s}px`,
          borderRadius: d.borderRadius ?? 4,
          fontSize: (d.fontSize ?? 18) * s,
          fontWeight: d.fontWeight ?? '700',
          fontFamily: d.fontFamily ?? 'sans-serif',
          letterSpacing: (d.letterSpacing ?? 2) * s,
          textTransform: d.textTransform ?? 'uppercase',
        }}>
          {d.doubleBorder && (
            <div style={{
              border: `${Math.max(1, (d.borderWidth ?? 2) - 1)}px solid ${d.color}`,
              padding: `${2 * s}px ${8 * s}px`,
              borderRadius: (d.borderRadius ?? 4) - 1,
              textAlign: 'center',
            }}>
              {d.text}
            </div>
          )}
          {!d.doubleBorder && d.text}
        </div>
      )

    case 'label':
      return (
        <div style={{
          ...baseStyle,
          background: d.backgroundColor ?? d.color,
          color: d.backgroundColor ? d.color : '#fff',
          padding: d.padding ?? `${3 * s}px ${10 * s}px`,
          borderRadius: d.borderRadius ?? 20 * s,
          fontSize: (d.fontSize ?? 14) * s,
          fontWeight: d.fontWeight ?? '600',
          fontFamily: d.fontFamily ?? 'sans-serif',
          letterSpacing: (d.letterSpacing ?? 1) * s,
        }}>
          {d.text}
        </div>
      )

    case 'badge':
      return (
        <div style={{
          ...baseStyle,
          border: `${d.borderWidth ?? 2}px solid ${d.borderColor ?? d.color}`,
          background: d.backgroundColor ?? 'transparent',
          padding: d.padding ?? `${4 * s}px ${14 * s}px`,
          borderRadius: d.borderRadius ?? 4,
          fontSize: (d.fontSize ?? 16) * s,
          fontWeight: d.fontWeight ?? '700',
          fontFamily: d.fontFamily ?? 'sans-serif',
          letterSpacing: (d.letterSpacing ?? 1) * s,
        }}>
          {d.text}
        </div>
      )

    case 'line':
      return (
        <div style={{
          ...baseStyle,
          width: (d.width ?? 60) * s,
          height: (d.thickness ?? 1) * s,
          background: d.color,
          borderRadius: 1,
        }} />
      )

    case 'watermark':
      return (
        <div style={{
          ...baseStyle,
          fontSize: (d.fontSize ?? 80) * s,
          fontWeight: d.fontWeight ?? '900',
          fontFamily: d.fontFamily ?? 'sans-serif',
          letterSpacing: (d.letterSpacing ?? 10) * s,
          textTransform: d.textTransform ?? 'uppercase',
          WebkitTextStroke: `1px ${d.color}`,
          color: 'transparent',
        }}>
          {d.text}
        </div>
      )

    default:
      return null
  }
}

// ── Edge layer ──

function bezierPoint(e: ComputedEdge, t: number) {
  const mt = 1 - t
  return {
    x: mt * mt * e.sx + 2 * mt * t * e.cpx + t * t * e.tx,
    y: mt * mt * e.sy + 2 * mt * t * e.cpy + t * t * e.ty,
  }
}

function trimEnds(e: ComputedEdge, gapPx: number) {
  const totalDist = Math.sqrt((e.tx - e.sx) ** 2 + (e.ty - e.sy) ** 2)
  const clampGap = Math.min(gapPx, totalDist * 0.4)

  let t0 = 0, t1 = 1
  for (let i = 0; i < 20; i++) {
    const p = bezierPoint(e, t0)
    const d = Math.sqrt((p.x - e.sx) ** 2 + (p.y - e.sy) ** 2)
    if (d >= clampGap) break
    t0 += 0.01
  }
  for (let i = 0; i < 20; i++) {
    const p = bezierPoint(e, t1)
    const d = Math.sqrt((p.x - e.tx) ** 2 + (p.y - e.ty) ** 2)
    if (d >= clampGap) break
    t1 -= 0.01
  }
  return { t0: Math.min(t0, 0.4), t1: Math.max(t1, 0.6) }
}

function DotTrail({ e, s, glow }: { e: ComputedEdge; s: number; glow: boolean }) {
  const gapPx = e.local ? 18 * s : 30 * s
  const { t0, t1 } = trimEnds(e, gapPx)
  const p0 = bezierPoint(e, t0)
  const pEnd = bezierPoint(e, t1)

  const dist = Math.sqrt((e.tx - e.sx) ** 2 + (e.ty - e.sy) ** 2)
  const count = Math.max(4, Math.min(24, Math.round(dist / (18 * s))))
  const dots: { x: number; y: number; r: number; opacity: number }[] = []
  for (let i = 1; i <= count; i++) {
    const t = t0 + (t1 - t0) * (i / (count + 1))
    const p = bezierPoint(e, t)
    const progress = i / (count + 1)
    const r = (2.5 + 2.5 * progress) * s
    const opacity = 0.35 + 0.5 * progress
    dots.push({ ...p, r, opacity })
  }
  return (
    <>
      {glow && (
        <path d={`M${p0.x},${p0.y} Q${e.cpx},${e.cpy} ${pEnd.x},${pEnd.y}`}
          fill="none" stroke={e.color} strokeWidth={12 * s}
          strokeOpacity={0.15} strokeLinecap="round" />
      )}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r}
          fill={e.color} fillOpacity={d.opacity} />
      ))}
      <circle cx={pEnd.x} cy={pEnd.y} r={5 * s}
        fill={e.color} fillOpacity={0.85} />
    </>
  )
}

function FlowLine({ e, s }: { e: ComputedEdge; s: number }) {
  const gapPx = e.local ? 18 * s : 30 * s
  const { t0, t1 } = trimEnds(e, gapPx)
  const p0 = bezierPoint(e, t0)
  const p1 = bezierPoint(e, t1)
  const pathD = `M${p0.x},${p0.y} Q${e.cpx},${e.cpy} ${p1.x},${p1.y}`
  return (
    <>
      <path d={pathD} fill="none" stroke={e.color}
        strokeWidth={Math.max(1.5, 2.2 * s)} strokeOpacity={0.7}
        strokeLinecap="round" />
      <circle cx={p1.x} cy={p1.y} r={3.5 * s}
        fill={e.color} fillOpacity={0.75} />
    </>
  )
}

function DashLine({ e, s }: { e: ComputedEdge; s: number }) {
  const gapPx = e.local ? 18 * s : 30 * s
  const { t0, t1 } = trimEnds(e, gapPx)
  const p0 = bezierPoint(e, t0)
  const p1 = bezierPoint(e, t1)
  const pathD = `M${p0.x},${p0.y} Q${e.cpx},${e.cpy} ${p1.x},${p1.y}`
  const near = bezierPoint(e, t1 - 0.06)
  const angle = Math.atan2(p1.y - near.y, p1.x - near.x)
  const armLen = 8 * s
  const spread = 0.4
  return (
    <g>
      <path d={pathD} fill="none" stroke={e.color}
        strokeWidth={Math.max(1.5, 2 * s)} strokeOpacity={0.4}
        strokeLinecap="round" strokeDasharray={`${8 * s} ${6 * s}`} />
      <line x1={p1.x - armLen * Math.cos(angle - spread)} y1={p1.y - armLen * Math.sin(angle - spread)}
        x2={p1.x} y2={p1.y} stroke={e.color}
        strokeWidth={Math.max(1.5, 2 * s)} strokeOpacity={0.55} strokeLinecap="round" />
      <line x1={p1.x - armLen * Math.cos(angle + spread)} y1={p1.y - armLen * Math.sin(angle + spread)}
        x2={p1.x} y2={p1.y} stroke={e.color}
        strokeWidth={Math.max(1.5, 2 * s)} strokeOpacity={0.55} strokeLinecap="round" />
    </g>
  )
}

function ThinLine({ e, s }: { e: ComputedEdge; s: number }) {
  const gapPx = e.local ? 14 * s : 24 * s
  const { t0, t1 } = trimEnds(e, gapPx)
  const p0 = bezierPoint(e, t0)
  const p1 = bezierPoint(e, t1)
  const pathD = `M${p0.x},${p0.y} Q${e.cpx},${e.cpy} ${p1.x},${p1.y}`
  const near = bezierPoint(e, t1 - 0.05)
  const angle = Math.atan2(p1.y - near.y, p1.x - near.x)
  const endLen = 6 * s
  const perpLen = 3 * s
  return (
    <g>
      <path d={pathD} fill="none" stroke={e.color}
        strokeWidth={Math.max(1, 1.2 * s)} strokeOpacity={0.45}
        strokeLinecap="round" strokeDasharray={`${6 * s} ${4 * s}`} />
      {/* T-shaped end marker — precise and architectural */}
      <line x1={p1.x - perpLen * Math.cos(angle - Math.PI / 2)}
            y1={p1.y - perpLen * Math.sin(angle - Math.PI / 2)}
            x2={p1.x + perpLen * Math.cos(angle - Math.PI / 2)}
            y2={p1.y + perpLen * Math.sin(angle - Math.PI / 2)}
            stroke={e.color} strokeWidth={Math.max(1, 1.2 * s)} strokeOpacity={0.5} strokeLinecap="round" />
      <line x1={p1.x} y1={p1.y}
            x2={p1.x - endLen * Math.cos(angle)}
            y2={p1.y - endLen * Math.sin(angle)}
            stroke={e.color} strokeWidth={Math.max(1, 1.2 * s)} strokeOpacity={0.45} strokeLinecap="round" />
    </g>
  )
}

function SciFiLine({ e, s, glow }: { e: ComputedEdge; s: number; glow: boolean }) {
  const gapPx = e.local ? 18 * s : 28 * s
  const { t0, t1 } = trimEnds(e, gapPx)
  const p0 = bezierPoint(e, t0)
  const p1 = bezierPoint(e, t1)
  const pathD = `M${p0.x},${p0.y} Q${e.cpx},${e.cpy} ${p1.x},${p1.y}`

  const near = bezierPoint(e, t1 - 0.06)
  const angle = Math.atan2(p1.y - near.y, p1.x - near.x)
  const armLen = 10 * s
  const spread = 0.35

  return (
    <g>
      {/* Wide glow layer */}
      {glow && (
        <path d={pathD} fill="none" stroke={e.color}
          strokeWidth={18 * s} strokeOpacity={0.08} strokeLinecap="round" />
      )}
      {/* Outer parallel line — offset translucent */}
      <path d={pathD} fill="none" stroke={e.color}
        strokeWidth={6 * s} strokeOpacity={0.12} strokeLinecap="round" />
      {/* Inner parallel line — offset translucent */}
      <path d={pathD} fill="none" stroke={e.color}
        strokeWidth={4 * s} strokeOpacity={0.18} strokeLinecap="round"
        strokeDasharray={`${16 * s} ${8 * s}`} />
      {/* Core bright line */}
      <path d={pathD} fill="none" stroke={e.color}
        strokeWidth={2.5 * s} strokeOpacity={0.75} strokeLinecap="round" />
      {/* Center bright core */}
      <path d={pathD} fill="none" stroke="#fff"
        strokeWidth={1 * s} strokeOpacity={0.2} strokeLinecap="round" />
      {/* Start dot */}
      <circle cx={p0.x} cy={p0.y} r={3 * s} fill={e.color} fillOpacity={0.6} />
      {/* End arrow — double chevron */}
      <line x1={p1.x - armLen * Math.cos(angle - spread)} y1={p1.y - armLen * Math.sin(angle - spread)}
        x2={p1.x} y2={p1.y} stroke={e.color}
        strokeWidth={2 * s} strokeOpacity={0.5} strokeLinecap="round" />
      <line x1={p1.x - armLen * Math.cos(angle + spread)} y1={p1.y - armLen * Math.sin(angle + spread)}
        x2={p1.x} y2={p1.y} stroke={e.color}
        strokeWidth={2 * s} strokeOpacity={0.5} strokeLinecap="round" />
      {/* Second chevron */}
      <line x1={p1.x - (armLen * 0.6) * Math.cos(angle - spread) - 4 * s * Math.cos(angle)} y1={p1.y - (armLen * 0.6) * Math.sin(angle - spread) - 4 * s * Math.sin(angle)}
        x2={p1.x - 4 * s * Math.cos(angle)} y2={p1.y - 4 * s * Math.sin(angle)} stroke={e.color}
        strokeWidth={1.5 * s} strokeOpacity={0.35} strokeLinecap="round" />
      <line x1={p1.x - (armLen * 0.6) * Math.cos(angle + spread) - 4 * s * Math.cos(angle)} y1={p1.y - (armLen * 0.6) * Math.sin(angle + spread) - 4 * s * Math.sin(angle)}
        x2={p1.x - 4 * s * Math.cos(angle)} y2={p1.y - 4 * s * Math.sin(angle)} stroke={e.color}
        strokeWidth={1.5 * s} strokeOpacity={0.35} strokeLinecap="round" />
      {/* End glow dot */}
      {glow && (
        <circle cx={p1.x} cy={p1.y} r={6 * s} fill={e.color} fillOpacity={0.15} />
      )}
      <circle cx={p1.x} cy={p1.y} r={3 * s} fill={e.color} fillOpacity={0.7} />
    </g>
  )
}

function LocalLine({ e, s }: { e: ComputedEdge; s: number }) {
  const gapPx = 18 * s
  const { t0, t1 } = trimEnds(e, gapPx)
  const p0 = bezierPoint(e, t0)
  const p1 = bezierPoint(e, t1)
  const pathD = `M${p0.x},${p0.y} Q${e.cpx},${e.cpy} ${p1.x},${p1.y}`
  const near = bezierPoint(e, t1 - 0.06)
  const angle = Math.atan2(p1.y - near.y, p1.x - near.x)
  const armLen = 9 * s
  const spread = 0.45
  return (
    <g>
      <path d={pathD} fill="none" stroke={e.color}
        strokeWidth={Math.max(2, 3 * s)} strokeOpacity={0.35}
        strokeLinecap="round" />
      <line x1={p1.x - armLen * Math.cos(angle - spread)} y1={p1.y - armLen * Math.sin(angle - spread)}
        x2={p1.x} y2={p1.y} stroke={e.color}
        strokeWidth={Math.max(1.5, 2.5 * s)} strokeOpacity={0.35} strokeLinecap="round" />
      <line x1={p1.x - armLen * Math.cos(angle + spread)} y1={p1.y - armLen * Math.sin(angle + spread)}
        x2={p1.x} y2={p1.y} stroke={e.color}
        strokeWidth={Math.max(1.5, 2.5 * s)} strokeOpacity={0.35} strokeLinecap="round" />
    </g>
  )
}

export function EdgeLayer({ edges, template, s, localOnly }: {
  edges: ComputedEdge[]; template: TemplateConfig; s: number; localOnly?: boolean
}) {
  const { trailStyle, glowEffect } = template.edge
  const Trail = trailStyle === 'dot-trail' ? DotTrail
    : trailStyle === 'dash' ? DashLine
    : trailStyle === 'thin' ? ThinLine
    : trailStyle === 'sci-fi' ? SciFiLine
    : FlowLine

  const filtered = localOnly ? edges.filter(e => e.local) : edges.filter(e => !e.local)

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {filtered.map(e => (
        e.local ? <LocalLine key={e.id} e={e} s={s} /> : <Trail key={e.id} e={e} s={s} glow={glowEffect} />
      ))}
    </svg>
  )
}

// ── Transport badges ──

export function TransportBadges({ edges, template, s }: {
  edges: ComputedEdge[]; template: TemplateConfig; s: number
}) {
  if (!template.edge.showTransportBadge) return null
  return (
    <>
      {edges.filter(e => e.icon).map(e => (
        <span key={`badge-${e.id}`} style={{
          position: 'absolute',
          left: e.mxIcon, top: e.myIcon,
          transform: 'translate(-50%, -50%)',
          fontSize: Math.round(18 * s),
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
        }}>
          {MODE_ICON[e.icon!]}
        </span>
      ))}
    </>
  )
}

// ── Combo cards ──

export function ComboCards(_props: { combos: import('../../types').RouteNode[]; template: import('../types').TemplateConfig; s: number }) { return null }

// ── City pins ──

export function CityPins({ cities, template, s, canvasWidth = 9999, canvasHeight: _canvasHeight = 9999 }: {
  cities: RouteNode[]
  template: TemplateConfig; s: number
  canvasWidth?: number; canvasHeight?: number
}) {
  const pin = template.cityPin
  return (
    <>
      {cities.map(city => {
        const size = pin.size * s

        const shW = pin.shape === 'pin-drop' ? size * 0.7
          : pin.shape === 'diamond' ? size * 0.6
          : pin.shape === 'square-rounded' ? size * 0.75
          : size
        const shH = pin.shape === 'diamond' ? size * 0.6
          : pin.shape === 'square-rounded' ? size * 0.75
          : size

        // 'right' 标签时估算实际右延伸，若会超出画布则自动降为 'below'
        const wantsRight = pin.labelPosition === 'right'
        const estimatedLabelW = city.name.length * template.fonts.city.size * s + 2 * 12 * s
        const rightExtent = shW / 2 + 6 * s + estimatedLabelW
        const wouldOverflow = wantsRight && (city.position.x + rightExtent > canvasWidth - 4)
        const below = pin.labelPosition === 'below' || wouldOverflow

        const left = below ? city.position.x : city.position.x - shW / 2
        const top = city.position.y - shH / 2

        return (
          <div key={city.id} style={{
            position: 'absolute',
            left, top,
            transform: below ? 'translateX(-50%)' : undefined,
            display: 'flex',
            flexDirection: below ? 'column' : 'row',
            alignItems: 'center',
            gap: below ? 0 : 6 * s,
          }}>
            {pin.shape === 'circle-photo' && (
              <div style={{
                width: size, height: size,
                borderRadius: '50%',
                border: `${3 * s}px solid ${template.colors.pinFill}`,
                boxShadow: `0 ${4 * s}px ${12 * s}px rgba(0,0,0,0.5), 0 0 ${8 * s}px ${rgba(template.colors.pinFill, 0.3)}`,
                overflow: 'hidden',
                background: template.colors.pinFill,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: '#fff', fontSize: Math.round(size * 0.4), fontWeight: 700 }}>
                  {city.name[0]}
                </span>
              </div>
            )}
            {pin.shape === 'pin-drop' && (
              <div style={{
                width: size * 0.7, height: size,
                background: template.colors.pinFill,
                borderRadius: '50% 50% 50% 0',
                transform: 'rotate(-45deg)',
                boxShadow: `0 ${3 * s}px ${8 * s}px rgba(0,0,0,0.4)${template.edge.glowEffect ? `, 0 0 ${16 * s}px ${rgba(template.colors.pinFill, 0.35)}` : ''}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  color: '#fff',
                  fontSize: Math.round(size * 0.28),
                  fontWeight: 700,
                  transform: 'rotate(45deg)',
                }}>
                  {city.name[0]}
                </span>
              </div>
            )}
            {pin.shape === 'diamond' && (
              <div style={{
                width: size * 0.6, height: size * 0.6,
                background: template.colors.pinFill,
                transform: 'rotate(45deg)',
                borderRadius: 4 * s,
                boxShadow: `0 ${3 * s}px ${8 * s}px rgba(0,0,0,0.4)${template.edge.glowEffect ? `, 0 0 ${16 * s}px ${rgba(template.colors.pinFill, 0.35)}` : ''}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ transform: 'rotate(-45deg)', color: '#fff', fontSize: Math.round(size * 0.25), fontWeight: 700 }}>
                  {city.name[0]}
                </span>
              </div>
            )}
            {pin.shape === 'square-rounded' && (
              <div style={{
                width: size * 0.75, height: size * 0.75,
                borderRadius: 8 * s,
                border: `${2 * s}px solid ${template.colors.pinFill}`,
                boxShadow: `0 ${3 * s}px ${8 * s}px rgba(0,0,0,0.4)${template.edge.glowEffect ? `, 0 0 ${16 * s}px ${rgba(template.colors.pinFill, 0.35)}` : ''}`,
                background: template.colors.pinFill,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: '#fff', fontSize: Math.round(size * 0.3), fontWeight: 700 }}>
                  {city.name[0]}
                </span>
              </div>
            )}

            {pin.showLabel && (
              <div style={{
                marginTop: pin.labelPosition === 'below' ? 5 * s : 0,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderRadius: 14 * s,
                padding: `${4 * s}px ${12 * s}px`,
                color: '#fff',
                fontSize: Math.round(template.fonts.city.size * s),
                fontWeight: Number(template.fonts.city.weight) || 700,
                fontFamily: template.fonts.city.family,
                whiteSpace: 'nowrap',
                textAlign: 'center',
                letterSpacing: 0.5,
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}>
                {city.time ? `${city.name}  ${city.time}` : city.name}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

// ── Attraction nodes ──

export function AttractionNodes({ attractions, template, s }: {
  attractions: RouteNode[]; template: TemplateConfig; s: number
}) {
  if (template.attractionNode.shape === 'none') return null
  const size = template.attractionNode.size * s
  const shW = template.attractionNode.shape === 'diamond' ? size * 0.8 : size
  const shH = template.attractionNode.shape === 'diamond' ? size * 0.8 : size
  const below = template.attractionNode.labelPosition === 'below'
  return (
    <>
      {attractions.map(attr => (
        <div key={attr.id} style={{
          position: 'absolute',
          left: attr.position.x,
          top: attr.position.y,
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: below ? 'column' : 'row',
          alignItems: 'center',
          gap: below ? 2 * s : 5 * s,
        }}>
          {template.attractionNode.shape === 'dot' && (
            <div style={{
              width: size, height: size,
              borderRadius: '50%',
              background: template.colors.attractionFill,
              border: `${Math.max(1, 1.5 * s)}px solid rgba(255,255,255,0.9)`,
              boxShadow: `0 0 ${8 * s}px ${rgba(template.colors.attractionFill, 0.5)}`,
              flexShrink: 0,
            }} />
          )}
          {template.attractionNode.shape === 'diamond' && (
            <div style={{
              width: size * 0.8, height: size * 0.8,
              background: template.colors.attractionFill,
              border: `${Math.max(1, 1.5 * s)}px solid ${template.colors.attractionStroke}`,
              boxShadow: `0 0 ${6 * s}px ${rgba(template.colors.attractionFill, 0.4)}`,
              transform: 'rotate(45deg)',
              borderRadius: 2,
              flexShrink: 0,
            }} />
          )}
          {template.attractionNode.showLabel && (
            <div style={{
              color: '#fff',
              fontSize: Math.round(template.fonts.attraction.size * s),
              fontWeight: Number(template.fonts.attraction.weight) || 500,
              fontFamily: template.fonts.attraction.family,
              textShadow: '0 1px 4px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.3)',
              whiteSpace: 'nowrap',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              lineHeight: 1.2,
            }}>
              <span>{attr.name}</span>
              {attr.time && (
                <span style={{
                  fontSize: Math.round(template.fonts.attraction.size * s * 0.7),
                  opacity: 0.7,
                  fontWeight: 400,
                  fontFamily: template.fonts.attraction.family,
                }}>
                  {attr.time}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </>
  )
}

// ── Day stickers ──

export function DayStickers({ days, nodeMap, template, s }: {
  days: RouteMap['days']; nodeMap: Map<string, RouteNode>; template: TemplateConfig; s: number
}) {
  if (template.daySticker.style === 'none') return null
  if (template.daySticker.position === 'inline') return null

  const pin = template.cityPin
  const pinSize = pin.size * s
  const stickerStyle = template.daySticker.style
  const colors = template.colors

  // City pin shape half-height from center
  const pinHalfH = pin.shape === 'pin-drop' ? pinSize * 0.5
    : pin.shape === 'diamond' ? pinSize * 0.3
    : pin.shape === 'square-rounded' ? pinSize * 0.375
    : pinSize * 0.5

  // Attraction node container half-height
  const attSize = template.attractionNode.size * s
  const attLabelH = template.attractionNode.showLabel
    ? template.fonts.attraction.size * s * 1.2 : 0
  const attContainerHalfH = template.attractionNode.labelPosition === 'below'
    ? (attSize + 2 * s + attLabelH) / 2
    : Math.max(attSize, attLabelH) / 2

  const stickerFontSize = 14 * s
  const stickerPadV = 3 * s
  const stickerPadH = 10 * s
  const stickerH = stickerFontSize + stickerPadV * 2
  const gap = 8 * s

  const isPill = stickerStyle === 'pill'

  return (
    <>
      {days.map(day => {
        const anchorNode = nodeMap.get(day.nodeIds[0])
        if (!anchorNode) return null

        const offsetAbove = anchorNode.type === 'city'
          ? pinHalfH + gap
          : attContainerHalfH + gap

        const variantStyle = isPill
          ? { background: day.color, color: '#fff', borderRadius: 16 * s, boxShadow: `0 ${2 * s}px ${8 * s}px rgba(0,0,0,0.3)` }
          : { background: 'transparent', color: colors.pinFill, borderRadius: 3 * s, border: `${1.5 * s}px solid ${colors.pinFill}` }

        return (
          <div key={`day-${day.dayIndex}`} style={{
            position: 'absolute',
            left: anchorNode.position.x,
            top: anchorNode.position.y - offsetAbove,
            transform: 'translate(-50%, -100%)',
            padding: `${stickerPadV}px ${stickerPadH}px`,
            fontSize: Math.round(stickerFontSize),
            fontWeight: isPill ? 700 : 600,
            whiteSpace: 'nowrap',
            letterSpacing: isPill ? 1 * s : 0.5 * s,
            zIndex: 10,
            fontFamily: template.fonts.city.family,
            ...variantStyle,
          }}>
            DAY {day.dayIndex + 1}
          </div>
        )
      })}
    </>
  )
}

// ── Footer ──

export function Footer({ template, s }: { template: TemplateConfig; s: number }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: 60 * s,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      paddingBottom: 18 * s,
      pointerEvents: 'none',
    }}>
      <span style={{
        color: template.footer.color,
        fontSize: Math.round(18 * s),
        fontWeight: 400,
        letterSpacing: template.footer.letterSpacing * s,
        textTransform: 'uppercase',
      }}>
        {template.footer.text}
      </span>
    </div>
  )
}
