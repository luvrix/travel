import type { RouteNode, RouteMap } from '../../../types'
import type { TemplateConfig } from '../../types'
import { rgba } from '../shared'
import { MODE_ICON } from '../../../lib/transport'

// Transport badges

export function TransportBadges({ edges, template, s }: {
  edges: import('../shared').ComputedEdge[]; template: TemplateConfig; s: number
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

// City pins

export function CityPins({ cities, template, s, canvasWidth = 9999 }: {
  cities: RouteNode[]
  template: TemplateConfig; s: number
  canvasWidth?: number
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

// Attraction nodes

export function AttractionNodes({ attractions, template, s }: {
  attractions: RouteNode[]; template: TemplateConfig; s: number
}) {
  if (template.attractionNode.shape === 'none') return null
  const size = template.attractionNode.size * s
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

// Day stickers

export function DayStickers({ days, nodeMap, template, s }: {
  days: RouteMap['days']; nodeMap: Map<string, RouteNode>; template: TemplateConfig; s: number
}) {
  if (template.daySticker.style === 'none') return null
  if (template.daySticker.position === 'inline') return null

  const pin = template.cityPin
  const pinSize = pin.size * s
  const stickerStyle = template.daySticker.style
  const colors = template.colors

  const pinHalfH = pin.shape === 'pin-drop' ? pinSize * 0.5
    : pin.shape === 'diamond' ? pinSize * 0.3
    : pin.shape === 'square-rounded' ? pinSize * 0.375
    : pinSize * 0.5

  const attSize = template.attractionNode.size * s
  const attLabelH = template.attractionNode.showLabel
    ? template.fonts.attraction.size * s * 1.2 : 0
  const attContainerHalfH = template.attractionNode.labelPosition === 'below'
    ? (attSize + 2 * s + attLabelH) / 2
    : Math.max(attSize, attLabelH) / 2

  const stickerFontSize = 14 * s
  const stickerPadV = 3 * s
  const stickerPadH = 10 * s
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
