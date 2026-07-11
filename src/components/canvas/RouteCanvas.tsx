import { useEffect, useRef, forwardRef, useImperativeHandle, useMemo, useCallback, useState } from 'react'
import { toPng } from 'html-to-image'
import type { RouteMap } from '../../types'
import type { TemplateId } from '../../templates/types'
import { getTemplate } from '../../templates'
import { getRenderer } from '../../templates/renderers'
import { computePositions, type ReservedZone } from '../../projection/layout'

export interface CropData {
  x: number
  y: number
  w: number
  h: number
}

export interface CanvasPhoto {
  id: string
  url: string
  x: number
  y: number
  width: number
  rotation: number
  crop: CropData
  aspectRatio: number
  isBackground?: boolean
}

export interface RouteCanvasHandle {
  exportPng: () => Promise<string>
  exportPngTransparent: () => Promise<string>
}

const PHOTO_MIN_W = 100
const MIN_CROP = 0.05

export const RouteCanvas = forwardRef<RouteCanvasHandle, {
  routeMap: RouteMap
  canvasWidth?: number
  canvasHeight?: number
  template?: TemplateId
  photos?: CanvasPhoto[]
  onPhotoChange?: (id: string, changes: Partial<CanvasPhoto>) => void
  onPhotoRemove?: (id: string) => void
}>(function RouteCanvas({
  routeMap, canvasWidth = 1080, canvasHeight = 1920,
  template: templateId = 'minimal',
  photos = [], onPhotoChange, onPhotoRemove,
}, ref) {
  const posterRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const template = getTemplate(templateId)
  const Renderer = getRenderer()
  const hasBgPhoto = photos.some(p => p.isBackground)

  const [activePhotoId, setActivePhotoId] = useState<string | null>(null)
  const [cropModeId, setCropModeId] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const cropOriginalRef = useRef<CropData | null>(null)
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const panOffsetRef = useRef(panOffset)
  panOffsetRef.current = panOffset

  const mapData = useMemo(() => {
    const mapCopy: RouteMap = {
      ...routeMap,
      nodes: routeMap.nodes.map(n => ({ ...n, position: { ...n.position } })),
      edges: routeMap.edges.map(e => ({ ...e })),
    }

    // Compute reserved zones from template's title, subtitle, and decorations
    const zones: ReservedZone[] = []
    const ls = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight) / 2203

    if (template.titleLayout) {
      const tl = template.titleLayout
      // CJK characters are ~1.0 * fontSize wide; latin ~0.6. Use 1.0 for safety.
      const titleW = ((routeMap.title.length || 4) * tl.fontSize * 1.0) / canvasWidth
      const titleH = (tl.fontSize * 2.0) / canvasHeight
      const offsetX = tl.align === 'center' ? titleW / 2 : tl.align === 'right' ? titleW : 0
      const offsetY = 0.5 * titleH
      zones.push({
        x: Math.max(0, tl.x - offsetX - 0.03),
        y: Math.max(0, tl.y - offsetY - 0.015),
        width: titleW + 0.06,
        height: titleH + 0.03,
      })
    }

    if (template.subtitleLayout) {
      const sl = template.subtitleLayout
      const subW = ((routeMap.startDate.length || 6) * sl.fontSize * 0.8) / canvasWidth
      const subH = (sl.fontSize * 2.0) / canvasHeight
      const offsetX = sl.align === 'center' ? subW / 2 : sl.align === 'right' ? subW : 0
      const offsetY = 0.5 * subH
      zones.push({
        x: Math.max(0, sl.x - offsetX - 0.03),
        y: Math.max(0, sl.y - offsetY - 0.015),
        width: subW + 0.06,
        height: subH + 0.03,
      })
    }

    if (template.decorations) {
      for (const d of template.decorations) {
        const dw = ((d.width ?? d.fontSize ?? 18) * ls * 2.5 + 40 * ls) / canvasWidth
        const dh = ((d.thickness ?? d.fontSize ?? 18) * ls * 2.5 + 40 * ls) / canvasHeight
        zones.push({
          x: Math.max(0, d.x - dw / 2),
          y: Math.max(0, d.y - dh / 2),
          width: dw,
          height: dh,
        })
      }
    }

    computePositions(mapCopy, canvasWidth, canvasHeight, undefined, template.headerHeight, undefined, zones.length > 0 ? zones : undefined)
    return mapCopy
  }, [routeMap, canvasWidth, canvasHeight, template])

  const getViewScale = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return 1
    return Math.min(viewport.offsetWidth / canvasWidth, viewport.offsetHeight / canvasHeight)
  }, [canvasWidth, canvasHeight])

  useEffect(() => {
    const updateScale = () => {
      const viewport = viewportRef.current
      const poster = posterRef.current
      if (!viewport || !poster) return
      const vw = viewport.offsetWidth
      const vh = viewport.offsetHeight
      const scaleX = vw / canvasWidth
      const scaleY = vh / canvasHeight
      const baseScale = Math.min(scaleX, scaleY)
      const scale = baseScale * zoomLevel
      const scaledW = canvasWidth * scale
      const scaledH = canvasHeight * scale
      poster.style.transform = `scale(${scale})`
      poster.style.transformOrigin = 'top left'
      poster.style.marginLeft = `${(vw - scaledW) / 2 + panOffset.x}px`
      poster.style.marginTop = `${(vh - scaledH) / 2 + panOffset.y}px`
    }
    updateScale()
    const ro = new ResizeObserver(updateScale)
    if (viewportRef.current) ro.observe(viewportRef.current)
    return () => ro.disconnect()
  }, [canvasWidth, canvasHeight, zoomLevel, panOffset])

  const interactionRef = useRef<{
    photoId: string
    type: 'drag' | 'resize' | 'rotate' | 'crop-move' | 'crop-handle'
    startX: number
    startY: number
    startPhoto: { x: number; y: number; width: number; rotation: number; crop: CropData }
    handle?: string
    startAngle?: number
  } | null>(null)

  const photosRef = useRef(photos)
  photosRef.current = photos

  const cropModeIdRef = useRef(cropModeId)
  cropModeIdRef.current = cropModeId

  const exitCropMode = useCallback((revert: boolean) => {
    const mid = cropModeIdRef.current
    if (revert && mid && cropOriginalRef.current) {
      onPhotoChange?.(mid, { crop: cropOriginalRef.current })
    }
    setCropModeId(null)
    cropOriginalRef.current = null
  }, [onPhotoChange])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement

    if (cropModeIdRef.current) {
      if (target.closest('[data-crop-confirm]')) {
        e.preventDefault()
        exitCropMode(false)
        return
      }
      if (target.closest('[data-crop-cancel]')) {
        e.preventDefault()
        exitCropMode(true)
        return
      }

      const cropHandle = target.closest('[data-crop-handle]')
      const cropMove = target.closest('[data-crop-move]')

      if (cropHandle || cropMove) {
        e.preventDefault()
        const photo = photosRef.current.find(p => p.id === cropModeIdRef.current)
        if (!photo) return
        interactionRef.current = {
          photoId: photo.id,
          type: cropHandle ? 'crop-handle' : 'crop-move',
          startX: e.clientX,
          startY: e.clientY,
          startPhoto: { x: photo.x, y: photo.y, width: photo.width, rotation: photo.rotation, crop: { ...photo.crop } },
          handle: cropHandle?.getAttribute('data-crop-handle') ?? undefined,
        }
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        return
      }

      if (!target.closest(`[data-photo-id="${cropModeIdRef.current}"]`)) {
        exitCropMode(true)
      }
      return
    }

    // Background photo floating buttons (outside any data-photo-id container)
    if (target.closest('[data-remove-bg-btn]')) {
      e.preventDefault()
      const bgPhoto = photosRef.current.find(p => p.isBackground)
      if (bgPhoto) handleRemoveBackground(bgPhoto.id)
      return
    }
    if (target.closest('[data-bg-delete-btn]')) {
      e.preventDefault()
      const bgPhoto = photosRef.current.find(p => p.isBackground)
      if (bgPhoto) {
        onPhotoRemove?.(bgPhoto.id)
        setActivePhotoId(null)
      }
      return
    }

    const photoEl = target.closest('[data-photo-id]')
    if (!photoEl) {
      setActivePhotoId(null)
      isPanningRef.current = true
      panStartRef.current = { x: e.clientX, y: e.clientY, ox: panOffsetRef.current.x, oy: panOffsetRef.current.y }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      return
    }

    const photoId = photoEl.getAttribute('data-photo-id')!
    const photo = photosRef.current.find(p => p.id === photoId)
    if (!photo) return

    if (target.closest('[data-delete-btn]')) {
      e.preventDefault()
      onPhotoRemove?.(photoId)
      setActivePhotoId(prev => prev === photoId ? null : prev)
      return
    }
    if (target.closest('[data-set-bg-btn]')) {
      e.preventDefault()
      handleSetBackground(photoId)
      return
    }
    if (target.closest('[data-crop-btn]')) {
      e.preventDefault()
      cropOriginalRef.current = { ...photo.crop }
      setCropModeId(photoId)
      return
    }
    if (target.closest('[data-uncrop-btn]')) {
      e.preventDefault()
      onPhotoChange?.(photoId, { crop: { x: 0, y: 0, w: 1, h: 1 } })
      return
    }
    if (target.closest('[data-rotate-handle]')) {
      e.preventDefault()
      const rect = photoEl.getBoundingClientRect()
      const startAngle = Math.atan2(
        e.clientY - rect.top - rect.height / 2,
        e.clientX - rect.left - rect.width / 2,
      ) * 180 / Math.PI
      interactionRef.current = {
        photoId,
        type: 'rotate',
        startX: e.clientX,
        startY: e.clientY,
        startPhoto: { x: photo.x, y: photo.y, width: photo.width, rotation: photo.rotation, crop: { ...photo.crop } },
        startAngle,
      }
      setActivePhotoId(photoId)
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      return
    }

    e.preventDefault()
    interactionRef.current = {
      photoId,
      type: target.closest('[data-resize-handle]') ? 'resize' : 'drag',
      startX: e.clientX,
      startY: e.clientY,
      startPhoto: { x: photo.x, y: photo.y, width: photo.width, rotation: photo.rotation, crop: { ...photo.crop } },
    }
    setActivePhotoId(photoId)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [onPhotoRemove, onPhotoChange, exitCropMode])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x
      const dy = e.clientY - panStartRef.current.y
      setPanOffset({ x: panStartRef.current.ox + dx, y: panStartRef.current.oy + dy })
      return
    }

    const ix = interactionRef.current
    if (!ix) return
    const vs = getViewScale()
    const { photoId, type, startPhoto, handle, startAngle } = ix

    switch (type) {
      case 'drag': {
        const dx = (e.clientX - ix.startX) / vs
        const dy = (e.clientY - ix.startY) / vs
        onPhotoChange?.(photoId, { x: startPhoto.x + dx, y: startPhoto.y + dy })
        break
      }
      case 'resize': {
        const dx = (e.clientX - ix.startX) / vs
        onPhotoChange?.(photoId, { width: Math.max(PHOTO_MIN_W, startPhoto.width + dx) })
        break
      }
      case 'rotate': {
        const photoEl = document.querySelector(`[data-photo-id="${photoId}"]`)
        if (!photoEl) break
        const rect = photoEl.getBoundingClientRect()
        const curAngle = Math.atan2(
          e.clientY - rect.top - rect.height / 2,
          e.clientX - rect.left - rect.width / 2,
        ) * 180 / Math.PI
        let rot = startPhoto.rotation + (curAngle - startAngle!)
        for (const s of [0, 90, 180, 270, -90, -180, -270]) {
          if (Math.abs(rot - s) < 5) { rot = s; break }
        }
        onPhotoChange?.(photoId, { rotation: rot })
        break
      }
      case 'crop-move': {
        const photo = photosRef.current.find(p => p.id === photoId)
        if (!photo) break
        const fullH = photo.width / photo.aspectRatio
        const mx = (e.clientX - ix.startX) / (vs * photo.width)
        const my = (e.clientY - ix.startY) / (vs * fullH)
        const nx = Math.max(0, Math.min(1 - startPhoto.crop.w, startPhoto.crop.x + mx))
        const ny = Math.max(0, Math.min(1 - startPhoto.crop.h, startPhoto.crop.y + my))
        onPhotoChange?.(photoId, { crop: { ...startPhoto.crop, x: nx, y: ny } })
        break
      }
      case 'crop-handle': {
        const photo = photosRef.current.find(p => p.id === photoId)
        if (!photo) break
        const fullH = photo.width / photo.aspectRatio
        const mx = (e.clientX - ix.startX) / (vs * photo.width)
        const my = (e.clientY - ix.startY) / (vs * fullH)
        const c = { ...startPhoto.crop }
        if (handle === 'nw') {
          c.x = Math.min(c.x + c.w - MIN_CROP, Math.max(0, c.x + mx))
          c.y = Math.min(c.y + c.h - MIN_CROP, Math.max(0, c.y + my))
          c.w = startPhoto.crop.w - (c.x - startPhoto.crop.x)
          c.h = startPhoto.crop.h - (c.y - startPhoto.crop.y)
        } else if (handle === 'ne') {
          c.w = Math.max(MIN_CROP, Math.min(1 - c.x, startPhoto.crop.w + mx))
          c.y = Math.min(c.y + c.h - MIN_CROP, Math.max(0, c.y + my))
          c.h = startPhoto.crop.h - (c.y - startPhoto.crop.y)
        } else if (handle === 'sw') {
          c.x = Math.min(c.x + c.w - MIN_CROP, Math.max(0, c.x + mx))
          c.w = startPhoto.crop.w - (c.x - startPhoto.crop.x)
          c.h = Math.max(MIN_CROP, Math.min(1 - c.y, startPhoto.crop.h + my))
        } else if (handle === 'se') {
          c.w = Math.max(MIN_CROP, Math.min(1 - c.x, startPhoto.crop.w + mx))
          c.h = Math.max(MIN_CROP, Math.min(1 - c.y, startPhoto.crop.h + my))
        }
        onPhotoChange?.(photoId, { crop: c })
        break
      }
    }
  }, [getViewScale, onPhotoChange])

  const handlePointerUp = useCallback(() => {
    interactionRef.current = null
    isPanningRef.current = false
  }, [])

  const handleExport = useCallback(async () => {
    const el = posterRef.current
    if (!el) throw new Error('Poster not mounted')
    if (cropModeIdRef.current) exitCropMode(false)

    // Clone the poster to an off-screen container so the visible element
    // is never modified — zero visual flash for the user.
    const container = document.createElement('div')
    container.style.cssText = `position:fixed;left:-99999px;top:0;width:${canvasWidth}px;height:${canvasHeight}px;overflow:hidden;pointer-events:none;`

    const clone = el.cloneNode(true) as HTMLElement
    clone.style.transform = 'none'
    clone.style.marginLeft = '0'
    clone.style.marginTop = '0'

    container.appendChild(clone)
    document.body.appendChild(container)

    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

    try {
      return await toPng(clone, {
        width: canvasWidth,
        height: canvasHeight,
        pixelRatio: 3,
        filter: (node: HTMLElement) => !node.dataset?.excludeExport,
        fetchRequestInit: { mode: 'cors' } as RequestInit,
      })
    } finally {
      document.body.removeChild(container)
    }
  }, [canvasWidth, canvasHeight, exitCropMode])

  const handleExportTransparent = useCallback(async () => {
    const el = posterRef.current
    if (!el) throw new Error('Poster not mounted')
    if (cropModeIdRef.current) exitCropMode(false)

    const container = document.createElement('div')
    container.style.cssText = `position:fixed;left:-99999px;top:0;width:${canvasWidth}px;height:${canvasHeight}px;overflow:hidden;pointer-events:none;background:transparent;`

    const clone = el.cloneNode(true) as HTMLElement
    clone.style.transform = 'none'
    clone.style.marginLeft = '0'
    clone.style.marginTop = '0'
    clone.style.background = 'transparent'

    container.appendChild(clone)
    document.body.appendChild(container)

    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

    try {
      return await toPng(clone, {
        width: canvasWidth,
        height: canvasHeight,
        pixelRatio: 3,
        backgroundColor: 'rgba(0,0,0,0)',
        filter: (node: HTMLElement) => {
          if (node.dataset?.excludeExport) return false
          if ('bgLayer' in (node.dataset ?? {})) return false
          return true
        },
        fetchRequestInit: { mode: 'cors' } as RequestInit,
      })
    } finally {
      document.body.removeChild(container)
    }
  }, [canvasWidth, canvasHeight, exitCropMode])

  useImperativeHandle(ref, () => ({ exportPng: handleExport, exportPngTransparent: handleExportTransparent }))

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoomLevel(prev => Math.max(0.3, Math.min(5, prev * delta)))
  }, [])

  const handleSetBackground = useCallback((photoId: string) => {
    const photo = photos.find(p => p.id === photoId)
    if (!photo) return

    // Revert any existing background photo
    const existingBg = photos.find(p => p.isBackground)
    if (existingBg && existingBg.id !== photoId) {
      onPhotoChange?.(existingBg.id, { isBackground: false })
    }

    // Calculate cover dimensions
    const canvasAspect = canvasWidth / canvasHeight
    const photoAspect = photo.aspectRatio
    let newWidth: number, newX: number, newY: number
    if (photoAspect > canvasAspect) {
      newWidth = canvasHeight * photoAspect
      newX = (canvasWidth - newWidth) / 2
      newY = 0
    } else {
      newWidth = canvasWidth
      newX = 0
      newY = (canvasHeight - canvasWidth / photoAspect) / 2
    }

    onPhotoChange?.(photoId, {
      isBackground: true,
      x: newX,
      y: newY,
      width: newWidth,
      rotation: 0,
      crop: { x: 0, y: 0, w: 1, h: 1 },
    })
    setActivePhotoId(null)
  }, [photos, canvasWidth, canvasHeight, onPhotoChange])

  const handleRemoveBackground = useCallback((photoId: string) => {
    const photo = photos.find(p => p.id === photoId)
    if (!photo) return
    const newWidth = canvasWidth * 0.5
    const fullH = newWidth / photo.aspectRatio
    onPhotoChange?.(photoId, {
      isBackground: false,
      x: (canvasWidth - newWidth) / 2,
      y: (canvasHeight - fullH) / 2,
      width: newWidth,
      rotation: 0,
      crop: { x: 0, y: 0, w: 1, h: 1 },
    })
    setActivePhotoId(photoId)
  }, [photos, canvasWidth, canvasHeight, onPhotoChange])

  function renderNormalPhoto(photo: CanvasPhoto) {
    // Background photo: full-coverage, behind gradient, no interactive handles
    if (photo.isBackground) {
      const { x, y, width, aspectRatio } = photo
      const fullH = width / aspectRatio
      return (
        <div
          key={photo.id}
          data-photo-id={photo.id}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            zIndex: -15,
            width,
            height: fullH,
            pointerEvents: 'none',
          }}
        >
          <img src={photo.url} alt="" draggable={false}
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', pointerEvents: 'none' }}
          />
        </div>
      )
    }

    const isActive = photo.id === activePhotoId
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
          position: 'absolute',
          left: x,
          top: y,
          zIndex: isActive ? 60 : ps.zIndex,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center center',
          opacity: ps.opacity,
        }}
      >
        <div style={{
          width,
          height: fullH,
          clipPath: `inset(${clipTop}% ${clipRight}% ${clipBottom}% ${clipLeft}%)`,
          marginLeft: mLeft,
          marginTop: mTop,
          borderRadius: ps.borderRadius,
          overflow: 'hidden',
          boxShadow: ps.shadow,
          border: isActive ? '2px solid rgba(255,255,255,0.85)' : ps.border,
          position: 'relative',
          filter: ps.filter,
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
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2l8 8M10 2l-8 8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>

            {/* Set as background button */}
            <div data-set-bg-btn data-exclude-export style={{
              position: 'absolute', bottom: -14, left: -14,
              padding: '4px 10px',
              background: 'rgba(37,99,235,0.9)', borderRadius: 6,
              border: '2px solid rgba(255,255,255,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              cursor: 'pointer',
              color: 'white', fontSize: 10, fontWeight: 700,
              whiteSpace: 'nowrap',
              letterSpacing: 0.5,
            }}
            onClick={(e) => { e.stopPropagation(); handleSetBackground(photo.id) }}
            >
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
    const ps = template.photoStyle

    return (
      <div
        key={photo.id}
        data-photo-id={photo.id}
        style={{ position: 'absolute', left: x, top: y, zIndex: 70, opacity: ps.opacity, filter: ps.filter }}
      >
        <div style={{
          width,
          height: fullH,
          overflow: 'hidden',
          borderRadius: ps.borderRadius,
          boxShadow: ps.shadow,
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
                left: `${crop.x * 100}%`,
                top: `${crop.y * 100}%`,
                width: `${crop.w * 100}%`,
                height: `${crop.h * 100}%`,
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
                  borderRadius: 2,
                  zIndex: 2,
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
          marginTop: 10,
          display: 'flex', gap: 6, justifyContent: 'center',
        }}>
          <div data-crop-cancel style={{
            padding: '8px 22px',
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: 'white', fontSize: 13, fontWeight: 600,
            borderRadius: 8, cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.2)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.85)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.65)' }}
          >
            取消
          </div>
          <div data-crop-confirm style={{
            padding: '8px 22px',
            background: 'rgba(37,99,235,0.9)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: 'white', fontSize: 13, fontWeight: 600,
            borderRadius: 8, cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(29,78,216,1)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(37,99,235,0.9)' }}
          >
            确认裁剪
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={viewportRef}
      className="w-full h-full overflow-hidden bg-gray-900"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <div
        ref={posterRef}
        style={{
          width: canvasWidth,
          height: canvasHeight,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: template.header.titleFont.family,
          userSelect: 'none',
        }}
      >
        <Renderer
          routeMap={mapData}
          template={template}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          hasBackgroundPhoto={hasBgPhoto}
        />

        {photos.map(photo =>
          cropModeId === photo.id ? renderCropMode(photo) : renderNormalPhoto(photo)
        )}

        {/* Floating button to cancel background photo */}
        {hasBgPhoto && (() => {
          const bgPhoto = photos.find(p => p.isBackground)!
          return (
            <div data-exclude-export style={{
              position: 'absolute',
              top: 12, right: 12,
              zIndex: 90,
              display: 'flex', gap: 6,
            }}>
              <div
                data-remove-bg-btn
                style={{
                  padding: '6px 14px',
                  background: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  color: 'white', fontSize: 12, fontWeight: 600,
                  borderRadius: 6, cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.3)',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.15s',
                }}
                onClick={() => handleRemoveBackground(bgPhoto.id)}
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
                onClick={() => onPhotoRemove?.(bgPhoto.id)}
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
      </div>
    </div>
  )
})
