import type { TemplateConfig, TemplateDecoration } from '../../types'

// Frame

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

// Title

export function Title({ template, s, canvasWidth, canvasHeight, title, date }: {
  template: TemplateConfig; s: number; canvasWidth: number; canvasHeight: number; title: string; date: string
}) {
  const tl = template.titleLayout
  const sl = template.subtitleLayout

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

  return <Header template={template} s={s} title={title} date={date} />
}

// Header (legacy top bar, used by Title fallback)

function Header({ template, s, title, date }: {
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

// Decorations

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

// Footer

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
