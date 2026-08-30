import type { ComputedEdge } from '../shared'
import type { TemplateConfig } from '../../types'

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
      {glow && (
        <path d={pathD} fill="none" stroke={e.color}
          strokeWidth={18 * s} strokeOpacity={0.08} strokeLinecap="round" />
      )}
      <path d={pathD} fill="none" stroke={e.color}
        strokeWidth={6 * s} strokeOpacity={0.12} strokeLinecap="round" />
      <path d={pathD} fill="none" stroke={e.color}
        strokeWidth={4 * s} strokeOpacity={0.18} strokeLinecap="round"
        strokeDasharray={`${16 * s} ${8 * s}`} />
      <path d={pathD} fill="none" stroke={e.color}
        strokeWidth={2.5 * s} strokeOpacity={0.75} strokeLinecap="round" />
      <path d={pathD} fill="none" stroke="#fff"
        strokeWidth={1 * s} strokeOpacity={0.2} strokeLinecap="round" />
      <circle cx={p0.x} cy={p0.y} r={3 * s} fill={e.color} fillOpacity={0.6} />
      <line x1={p1.x - armLen * Math.cos(angle - spread)} y1={p1.y - armLen * Math.sin(angle - spread)}
        x2={p1.x} y2={p1.y} stroke={e.color}
        strokeWidth={2 * s} strokeOpacity={0.5} strokeLinecap="round" />
      <line x1={p1.x - armLen * Math.cos(angle + spread)} y1={p1.y - armLen * Math.sin(angle + spread)}
        x2={p1.x} y2={p1.y} stroke={e.color}
        strokeWidth={2 * s} strokeOpacity={0.5} strokeLinecap="round" />
      <line x1={p1.x - (armLen * 0.6) * Math.cos(angle - spread) - 4 * s * Math.cos(angle)} y1={p1.y - (armLen * 0.6) * Math.sin(angle - spread) - 4 * s * Math.sin(angle)}
        x2={p1.x - 4 * s * Math.cos(angle)} y2={p1.y - 4 * s * Math.sin(angle)} stroke={e.color}
        strokeWidth={1.5 * s} strokeOpacity={0.35} strokeLinecap="round" />
      <line x1={p1.x - (armLen * 0.6) * Math.cos(angle + spread) - 4 * s * Math.cos(angle)} y1={p1.y - (armLen * 0.6) * Math.sin(angle + spread) - 4 * s * Math.sin(angle)}
        x2={p1.x - 4 * s * Math.cos(angle)} y2={p1.y - 4 * s * Math.sin(angle)} stroke={e.color}
        strokeWidth={1.5 * s} strokeOpacity={0.35} strokeLinecap="round" />
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
