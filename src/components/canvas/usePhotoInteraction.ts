import { useCallback, useEffect, useRef, useState } from 'react'
import type { CanvasPhoto, CropData } from './RouteCanvas'

export interface InteractionState {
  photoId: string
  type: 'drag' | 'resize' | 'rotate' | 'crop-move' | 'crop-handle'
  startX: number
  startY: number
  startPhoto: { x: number; y: number; width: number; rotation: number; crop: CropData }
  handle?: string
  startAngle?: number
}

const PHOTO_MIN_W = 100
const MIN_CROP = 0.05

export interface PhotoInteractionApi {
  cropModeId: string | null
  exitCropMode: (revert: boolean) => void
  handlePointerDown: (e: React.PointerEvent) => void
  handlePointerMove: (e: React.PointerEvent) => void
  handlePointerUp: () => void
}

/**
 * 照片交互状态机：drag / resize / rotate / crop-move / crop-handle
 * viewport 的 pan 也在这里处理（pointerdown 在空白处时进入 pan 模式）
 */
export function usePhotoInteraction(opts: {
  photos: CanvasPhoto[]
  onPhotoChange?: (id: string, changes: Partial<CanvasPhoto>) => void
  onPhotoRemove?: (id: string) => void
  setActivePhotoId: (updater: string | null | ((prev: string | null) => string | null)) => void
  getViewScale: () => number
  panOffsetRef: React.MutableRefObject<{ x: number; y: number }>
  setPanOffset: (offset: { x: number; y: number }) => void
  handleSetBackground: (photoId: string) => void
  handleRemoveBackground: (photoId: string) => void
}): PhotoInteractionApi {
  const { photos, onPhotoChange, onPhotoRemove, setActivePhotoId, getViewScale, panOffsetRef, setPanOffset, handleSetBackground, handleRemoveBackground } = opts

  const interactionRef = useRef<InteractionState | null>(null)
  const photosRef = useRef(photos)
  useEffect(() => { photosRef.current = photos }, [photos])

  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  const [cropModeId, setCropModeId] = useState<string | null>(null)
  const cropOriginalRef = useRef<CropData | null>(null)
  const cropModeIdRef = useRef(cropModeId)
  useEffect(() => { cropModeIdRef.current = cropModeId }, [cropModeId])

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
      if (target.closest('[data-crop-confirm]')) { e.preventDefault(); exitCropMode(false); return }
      if (target.closest('[data-crop-cancel]')) { e.preventDefault(); exitCropMode(true); return }

      const cropHandle = target.closest('[data-crop-handle]')
      const cropMove = target.closest('[data-crop-move]')
      if (cropHandle || cropMove) {
        e.preventDefault()
        const photo = photosRef.current.find(p => p.id === cropModeIdRef.current)
        if (!photo) return
        interactionRef.current = {
          photoId: photo.id,
          type: cropHandle ? 'crop-handle' : 'crop-move',
          startX: e.clientX, startY: e.clientY,
          startPhoto: { x: photo.x, y: photo.y, width: photo.width, rotation: photo.rotation, crop: { ...photo.crop } },
          handle: cropHandle?.getAttribute('data-crop-handle') ?? undefined,
        }
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        return
      }
      if (!target.closest(`[data-photo-id="${cropModeIdRef.current}"]`)) exitCropMode(true)
      return
    }

    if (target.closest('[data-remove-bg-btn]')) {
      e.preventDefault()
      const bgPhoto = photosRef.current.find(p => p.isBackground)
      if (bgPhoto) handleRemoveBackground(bgPhoto.id)
      return
    }
    if (target.closest('[data-bg-delete-btn]')) {
      e.preventDefault()
      const bgPhoto = photosRef.current.find(p => p.isBackground)
      if (bgPhoto) { onPhotoRemove?.(bgPhoto.id); setActivePhotoId(null) }
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

    if (target.closest('[data-delete-btn]')) { e.preventDefault(); onPhotoRemove?.(photoId); setActivePhotoId(prev => prev === photoId ? null : prev); return }
    if (target.closest('[data-set-bg-btn]')) { e.preventDefault(); handleSetBackground(photoId); return }
    if (target.closest('[data-crop-btn]')) { e.preventDefault(); cropOriginalRef.current = { ...photo.crop }; setCropModeId(photoId); return }
    if (target.closest('[data-uncrop-btn]')) { e.preventDefault(); onPhotoChange?.(photoId, { crop: { x: 0, y: 0, w: 1, h: 1 } }); return }
    if (target.closest('[data-rotate-handle]')) {
      e.preventDefault()
      const rect = photoEl.getBoundingClientRect()
      const startAngle = Math.atan2(e.clientY - rect.top - rect.height / 2, e.clientX - rect.left - rect.width / 2) * 180 / Math.PI
      interactionRef.current = {
        photoId, type: 'rotate', startX: e.clientX, startY: e.clientY,
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
      startX: e.clientX, startY: e.clientY,
      startPhoto: { x: photo.x, y: photo.y, width: photo.width, rotation: photo.rotation, crop: { ...photo.crop } },
    }
    setActivePhotoId(photoId)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [onPhotoRemove, onPhotoChange, exitCropMode, handleSetBackground, handleRemoveBackground, setActivePhotoId, panOffsetRef])

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
        const curAngle = Math.atan2(e.clientY - rect.top - rect.height / 2, e.clientX - rect.left - rect.width / 2) * 180 / Math.PI
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
  }, [getViewScale, onPhotoChange, setPanOffset])

  const handlePointerUp = useCallback(() => {
    interactionRef.current = null
    isPanningRef.current = false
  }, [])

  return {
    cropModeId,
    exitCropMode,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  }
}

