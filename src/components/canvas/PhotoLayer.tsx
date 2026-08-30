import type { CanvasPhoto } from './RouteCanvas'
import type { TemplateConfig } from '../../templates/types'

interface PhotoLayerProps {
  photos: CanvasPhoto[]
  activePhotoId: string | null
  cropModeId: string | null
  template: TemplateConfig
  onSetBackground: (photoId: string) => void
  onRemoveBackground: (photoId: string) => void
  onRemove: (id: string) => void
}

/** 渲染所有照片：普通照片（含交互 handles）+ 裁剪模式 + 背景照片 */
export function PhotoLayer({ photos, activePhotoId, cropModeId, template, onSetBackground, onRemoveBackground, onRemove }: PhotoLayerProps) {
  return (
    <>
      {photos.map(photo =>
        cropModeId === photo.id
          ? renderCropMode(photo)
          : renderNormalPhoto(photo, photo.id === activePhotoId, template, onSetBackground, onRemove)
      )}

      {photos.some(p => p.isBackground) && (() => {
        const bgPhoto = photos.find(p => p.isBackground)!
        return (
          <div data-exclude-export style={{
            position: 'absolute', top: 12, right: 12, zIndex: 90,
            display: 'flex', gap: 6,
          }}>
            <div
              data-remove-bg-btn
              style={{
                padding: '6px 14px',
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                color: 'white', fontSize: 12, fontWeight: 600,
                borderRadius: 6, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.3)',
                whiteSpace: 'nowrap', transition: 'background 0.15s',
              }}
              onClick={() => onRemoveBackground(bgPhoto.id)}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.85)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.65)' }}
            >
              取消背景
            </div>
            <div
              data-bg-delete-btn
              style={{
                width: 28, height: 28, cursor: 'pointer',
                background: 'rgba(239,68,68,0.85)', borderRadius: 6,
                border: '2px solid rgba(255,255,255,0.7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                transition: 'background 0.15s',
              }}
              onClick={() => onRemove(bgPhoto.id)}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.85)' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2l-8 8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        )
      })()}
    </>
  )
}

function renderNormalPhoto(
  photo: CanvasPhoto,
  isActive: boolean,
  template: TemplateConfig,
  onSetBackground: (id: string) => void,
  onRemove: (id: string) => void,
) {
  // 背景照片：全覆盖、在渐变之下、无交互 handle
  if (photo.isBackground) {
    const { x, y, width, aspectRatio } = photo
    const fullH = width / aspectRatio
    return (
      <div
        key={photo.id}
        data-photo-id={photo.id}
        style={{
          position: 'absolute', left: x, top: y, zIndex: -15,
          width, height: fullH, pointerEvents: 'none',
        }}
      >
        <img src={photo.url} alt="" draggable={false}
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', pointerEvents: 'none' }}
        />
      </div>
    )
  }

  const { x, y, width, rotation, crop, aspectRatio } = photo
  const isCropped = crop.x > 0.001 || crop.y > 0.001 || crop.w < 0.999 || crop.h < 0.999
  const ps = template.photoStyle

  const fullH = width / aspectRatio
  const clipTop = crop.y * 100
  const clipRight = (1 - crop.x - crop.w) * 100
  const clipBottom = (1 - crop.y - crop.h) * 100
  const clipLeft = crop.x * 100
  const mLeft = -clipLeft / 100 * width
  const mTop = -clipTop / 100 * fullH

  return (
    <div
      key={photo.id}
      data-photo-id={photo.id}
      style={{
        position: 'absolute', left: x, top: y,
        zIndex: isActive ? 60 : ps.zIndex,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center center',
        opacity: ps.opacity,
      }}
    >
      <div style={{
        width, height: fullH,
        clipPath: `inset(${clipTop}% ${clipRight}% ${clipBottom}% ${clipLeft}%)`,
        marginLeft: mLeft, marginTop: mTop,
        borderRadius: ps.borderRadius, overflow: 'hidden',
        boxShadow: ps.shadow,
        border: isActive ? '2px solid rgba(255,255,255,0.85)' : ps.border,
        position: 'relative', filter: ps.filter,
      }}>
        <img src={photo.url} alt="" draggable={false}
          style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
        />
        <div style={{ position: 'absolute', inset: 0, cursor: isActive ? 'grab' : 'pointer' }} />
      </div>

      {isActive && (
        <>
          <div data-exclude-export style={{
            position: 'absolute', left: '50%', top: 0,
            transform: 'translate(-50%, -100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div data-rotate-handle style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'white', border: '2px solid rgba(0,0,0,0.1)',
              cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M10 4.2a4.5 4.5 0 11-4.2 3" stroke="#555" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M8.8 1.2L10.3 3.8L7.6 4.4" stroke="#555" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ width: 1.5, height: 14, background: 'rgba(255,255,255,0.6)', borderRadius: 1 }} />
          </div>

          {isCropped ? (
            <div data-uncrop-btn data-exclude-export style={{
              position: 'absolute', top: -14, left: -14,
              width: 28, height: 28, cursor: 'pointer',
              background: 'rgba(0,0,0,0.65)', borderRadius: 6,
              border: '2px solid rgba(255,255,255,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7a4 4 0 108 0 4 4 0 00-8 0z" stroke="white" strokeWidth="1.3" />
                <path d="M7 5v4M5 7h4" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
          ) : (
            <div data-crop-btn data-exclude-export style={{
              position: 'absolute', top: -14, left: -14,
              width: 28, height: 28, cursor: 'pointer',
              background: 'rgba(0,0,0,0.65)', borderRadius: 6,
              border: '2px solid rgba(255,255,255,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 1v3M1 3h3M11 13v-3M13 11h-3M3 5v6h6M11 9V3H5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}

          <div data-delete-btn data-exclude-export style={{
            position: 'absolute', top: -14, right: -14,
            width: 28, height: 28, cursor: 'pointer',
            background: 'rgba(239,68,68,0.85)', borderRadius: 6,
            border: '2px solid rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
          onClick={(e) => { e.stopPropagation(); onRemove(photo.id) }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>

          <div data-set-bg-btn data-exclude-export style={{
            position: 'absolute', bottom: -14, left: -14,
            padding: '4px 10px',
            background: 'rgba(37,99,235,0.9)', borderRadius: 6,
            border: '2px solid rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            color: 'white', fontSize: 10, fontWeight: 700,
            whiteSpace: 'nowrap', letterSpacing: 0.5,
          }}
          onClick={(e) => { e.stopPropagation(); onSetBackground(photo.id) }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ marginRight: 3 }}>
              <rect x="1" y="1" width="12" height="12" rx="2" stroke="white" strokeWidth="1.3" />
              <path d="M1 10l4-3 3 2 5-5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="4.5" cy="4.5" r="1.5" stroke="white" strokeWidth="1" />
            </svg>
            背景
          </div>

          <div data-resize-handle data-exclude-export style={{
            position: 'absolute', right: -14, bottom: -14,
            width: 28, height: 28, cursor: 'nwse-resize',
            background: 'rgba(0,0,0,0.65)', borderRadius: 6,
            border: '2px solid rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M10 2L2 10M10 5.5L5.5 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </>
      )}
    </div>
  )
}

function renderCropMode(photo: CanvasPhoto) {
  const { x, y, width, crop, aspectRatio } = photo
  const fullH = width / aspectRatio

  return (
    <div
      key={photo.id}
      data-photo-id={photo.id}
      style={{ position: 'absolute', left: x, top: y, zIndex: 70, opacity: 1, filter: undefined }}
    >
      <div style={{
        width, height: fullH,
        overflow: 'hidden', borderRadius: 0,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        border: '2px solid rgba(255,255,255,0.85)',
        position: 'relative',
      }}>
        <img src={photo.url} alt="" draggable={false}
          style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
        />
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <div
            data-crop-move
            style={{
              position: 'absolute',
              left: `${crop.x * 100}%`, top: `${crop.y * 100}%`,
              width: `${crop.w * 100}%`, height: `${crop.h * 100}%`,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              border: '1.5px solid rgba(255,255,255,0.9)',
              cursor: 'move',
            }}
          >
            <div style={{ position: 'absolute', inset: 0 }}>
              {[33.33, 66.66].map(p => (
                <div key={`v${p}`} style={{ position: 'absolute', left: `${p}%`, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.3)' }} />
              ))}
              {[33.33, 66.66].map(p => (
                <div key={`h${p}`} style={{ position: 'absolute', top: `${p}%`, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.3)' }} />
              ))}
            </div>
            {(['nw', 'ne', 'sw', 'se'] as const).map(corner => {
              const s: React.CSSProperties = {
                position: 'absolute',
                width: 14, height: 14,
                background: 'white',
                border: '1px solid rgba(0,0,0,0.15)',
                borderRadius: 2, zIndex: 2,
                cursor: `${corner}-resize` as React.CSSProperties['cursor'],
              }
              if (corner[0] === 'n') s.top = -7; else s.bottom = -7
              if (corner[1] === 'w') s.left = -7; else s.right = -7
              return <div key={corner} data-crop-handle={corner} data-exclude-export style={s} />
            })}
          </div>
        </div>
      </div>
      <div data-exclude-export style={{
        marginTop: 10, display: 'flex', gap: 6, justifyContent: 'center',
      }}>
        <div data-crop-cancel style={{
          padding: '8px 22px',
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          color: 'white', fontSize: 13, fontWeight: 600,
          borderRadius: 8, cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.2)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.85)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.65)' }}>
          取消
        </div>
        <div data-crop-confirm style={{
          padding: '8px 22px',
          background: 'rgba(37,99,235,0.9)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          color: 'white', fontSize: 13, fontWeight: 600,
          borderRadius: 8, cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(29,78,216,1)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(37,99,235,0.9)' }}>
          确认裁剪
        </div>
      </div>
    </div>
  )
}
