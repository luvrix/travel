import { useEffect, useRef, forwardRef, useImperativeHandle, useMemo, useCallback, useState } from 'react'
import { toPng } from 'html-to-image'
import type { RouteMap } from '../../types'
import type { TemplateId } from '../../templates/types'
import { getTemplate } from '../../templates'
import { getRenderer } from '../../templates/renderers'
import { computePositions, type ReservedZone } from '../../projection/layout'
import { usePhotoInteraction } from './usePhotoInteraction'
import { PhotoLayer } from './PhotoLayer'

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

/**
 * Reserved zone 估算参数（按 1080×1920 画布标定）
 * 经验值，源自设计稿测量；改一个全乱，调需同步看实际渲染。
 */
const RESERVED_ZONE_PARAMS = {
  BASE_DIAGONAL: 2203,          // 1080×1920 画布对角线长度（sqrt(1080²+1920²)≈2202.9）
  TITLE_CHAR_WIDTH: 1.0,       // 标题单字宽度系数（CJK 字符近似方形）
  TEXT_HEIGHT: 2.0,            // 标题/副标题高度系数（含行间距）
  SUBTITLE_CHAR_WIDTH: 0.8,    // 副标题字宽系数（数字+字母比 CJK 窄）
  VERTICAL_ALIGN_RATIO: 0.5,  // 文字 vertical-align 偏移比例
  PAD_X: 0.03,                 // 估算区水平外扩（相对画布宽）
  PAD_Y: 0.015,                // 估算区垂直外扩（相对画布高）
  PAD_W: 0.06,                 // 估算区宽度 padding（相对画布宽）
  PAD_H: 0.03,                 // 估算区高度 padding（相对画布高）
  DECO_SCALE: 2.5,            // decoration 尺寸倍率
  DECO_PAD_PX: 40,            // decoration padding（基准像素，按 1080 宽标定）
}

interface RouteCanvasProps {
  routeMap: RouteMap
  canvasWidth?: number
  canvasHeight?: number
  template?: TemplateId
  photos?: CanvasPhoto[]
  onPhotoChange?: (id: string, changes: Partial<CanvasPhoto>) => void
  onPhotoRemove?: (id: string) => void
}

export const RouteCanvas = forwardRef<RouteCanvasHandle, RouteCanvasProps>(function RouteCanvas({
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
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const panOffsetRef = useRef(panOffset)
  useEffect(() => { panOffsetRef.current = panOffset }, [panOffset])

  const getViewScale = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return 1
    return Math.min(viewport.offsetWidth / canvasWidth, viewport.offsetHeight / canvasHeight)
  }, [canvasWidth, canvasHeight])

  const mapData = useMemo(() => {
    const mapCopy: RouteMap = {
      ...routeMap,
      nodes: routeMap.nodes.map(n => ({ ...n, position: { ...n.position } })),
      edges: routeMap.edges.map(e => ({ ...e })),
    }

    // 从模板的 title / subtitle / decorations 推导 reserved zones
    const zones: ReservedZone[] = []
    // 对角线 scale：与 layoutScale/visualScale 不同，reserved zones 基于文字尺寸估算，
    // 文字在画布对角线方向变化更敏感，用 sqrt(w²+h²) 比单纯 min(w,h) 更准。
    const ls = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight) / RESERVED_ZONE_PARAMS.BASE_DIAGONAL

    if (template.titleLayout) {
      const tl = template.titleLayout
      const titleW = ((routeMap.title.length || 4) * tl.fontSize * RESERVED_ZONE_PARAMS.TITLE_CHAR_WIDTH) / canvasWidth
      const titleH = (tl.fontSize * RESERVED_ZONE_PARAMS.TEXT_HEIGHT) / canvasHeight
      const offsetX = tl.align === 'center' ? titleW / 2 : tl.align === 'right' ? titleW : 0
      const offsetY = RESERVED_ZONE_PARAMS.VERTICAL_ALIGN_RATIO * titleH
      zones.push({
        x: Math.max(0, tl.x - offsetX - RESERVED_ZONE_PARAMS.PAD_X),
        y: Math.max(0, tl.y - offsetY - RESERVED_ZONE_PARAMS.PAD_Y),
        width: titleW + RESERVED_ZONE_PARAMS.PAD_W,
        height: titleH + RESERVED_ZONE_PARAMS.PAD_H,
      })
    }

    if (template.subtitleLayout) {
      const sl = template.subtitleLayout
      const subW = ((routeMap.startDate.length || 6) * sl.fontSize * RESERVED_ZONE_PARAMS.SUBTITLE_CHAR_WIDTH) / canvasWidth
      const subH = (sl.fontSize * RESERVED_ZONE_PARAMS.TEXT_HEIGHT) / canvasHeight
      const offsetX = sl.align === 'center' ? subW / 2 : sl.align === 'right' ? subW : 0
      const offsetY = RESERVED_ZONE_PARAMS.VERTICAL_ALIGN_RATIO * subH
      zones.push({
        x: Math.max(0, sl.x - offsetX - RESERVED_ZONE_PARAMS.PAD_X),
        y: Math.max(0, sl.y - offsetY - RESERVED_ZONE_PARAMS.PAD_Y),
        width: subW + RESERVED_ZONE_PARAMS.PAD_W,
        height: subH + RESERVED_ZONE_PARAMS.PAD_H,
      })
    }

    if (template.decorations) {
      for (const d of template.decorations) {
        const dw = ((d.width ?? d.fontSize ?? 18) * ls * RESERVED_ZONE_PARAMS.DECO_SCALE + RESERVED_ZONE_PARAMS.DECO_PAD_PX * ls) / canvasWidth
        const dh = ((d.thickness ?? d.fontSize ?? 18) * ls * RESERVED_ZONE_PARAMS.DECO_SCALE + RESERVED_ZONE_PARAMS.DECO_PAD_PX * ls) / canvasHeight
        zones.push({
          x: Math.max(0, d.x - dw / 2),
          y: Math.max(0, d.y - dh / 2),
          width: dw,
          height: dh,
        })
      }
    }

    computePositions(mapCopy, canvasWidth, canvasHeight, template.headerHeight, undefined, zones.length > 0 ? zones : undefined)
    return mapCopy
  }, [routeMap, canvasWidth, canvasHeight, template])

  // viewport 自适应缩放
  useEffect(() => {
    const updateScale = () => {
      const viewport = viewportRef.current
      const poster = posterRef.current
      if (!viewport || !poster) return
      const vw = viewport.offsetWidth
      const vh = viewport.offsetHeight
      const baseScale = Math.min(vw / canvasWidth, vh / canvasHeight)
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

  // 照片背景切换：cover 模式布满画布
  const handleSetBackground = useCallback((photoId: string) => {
    const photo = photos.find(p => p.id === photoId)
    if (!photo) return
    const existingBg = photos.find(p => p.isBackground)
    if (existingBg && existingBg.id !== photoId) {
      onPhotoChange?.(existingBg.id, { isBackground: false })
    }

    const canvasAspect = canvasWidth / canvasHeight
    let newWidth: number, newX: number, newY: number
    if (photo.aspectRatio > canvasAspect) {
      newWidth = canvasHeight * photo.aspectRatio
      newX = (canvasWidth - newWidth) / 2
      newY = 0
    } else {
      newWidth = canvasWidth
      newX = 0
      newY = (canvasHeight - canvasWidth / photo.aspectRatio) / 2
    }

    onPhotoChange?.(photoId, {
      isBackground: true, x: newX, y: newY, width: newWidth, rotation: 0,
      crop: { x: 0, y: 0, w: 1, h: 1 },
    })
    setActivePhotoId(null)
  }, [photos, canvasWidth, canvasHeight, onPhotoChange])

  // 取消背景：恢复成画布中心 50% 宽度
  const handleRemoveBackground = useCallback((photoId: string) => {
    const photo = photos.find(p => p.id === photoId)
    if (!photo) return
    const newWidth = canvasWidth * 0.5
    const fullH = newWidth / photo.aspectRatio
    onPhotoChange?.(photoId, {
      isBackground: false,
      x: (canvasWidth - newWidth) / 2,
      y: (canvasHeight - fullH) / 2,
      width: newWidth, rotation: 0,
      crop: { x: 0, y: 0, w: 1, h: 1 },
    })
    setActivePhotoId(photoId)
  }, [photos, canvasWidth, canvasHeight, onPhotoChange])

  const interaction = usePhotoInteraction({
    photos,
    onPhotoChange,
    onPhotoRemove,
    setActivePhotoId,
    getViewScale,
    panOffsetRef,
    setPanOffset,
    handleSetBackground,
    handleRemoveBackground,
  })

  const handleExport = useCallback(async () => {
    return exportPoster(posterRef.current, canvasWidth, canvasHeight, false, interaction.exitCropMode)
  }, [canvasWidth, canvasHeight, interaction])

  const handleExportTransparent = useCallback(async () => {
    return exportPoster(posterRef.current, canvasWidth, canvasHeight, true, interaction.exitCropMode)
  }, [canvasWidth, canvasHeight, interaction])

  useImperativeHandle(ref, () => ({
    exportPng: handleExport,
    exportPngTransparent: handleExportTransparent,
  }))

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoomLevel(prev => Math.max(0.3, Math.min(5, prev * delta)))
  }, [])

  return (
    <div
      ref={viewportRef}
      className="w-full h-full overflow-hidden bg-gray-900"
      onPointerDown={interaction.handlePointerDown}
      onPointerMove={interaction.handlePointerMove}
      onPointerUp={interaction.handlePointerUp}
      onPointerCancel={interaction.handlePointerUp}
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

        <PhotoLayer
          photos={photos}
          activePhotoId={activePhotoId}
          cropModeId={interaction.cropModeId}
          template={template}
          onSetBackground={handleSetBackground}
          onRemoveBackground={handleRemoveBackground}
          onRemove={onPhotoRemove ?? (() => {})}
        />
      </div>
    </div>
  )
})

/** 克隆 poster 到离屏容器并导出 PNG，原始 DOM 不被修改 */
async function exportPoster(
  el: HTMLDivElement | null,
  canvasWidth: number,
  canvasHeight: number,
  transparent: boolean,
  exitCropMode: (revert: boolean) => void,
): Promise<string> {
  if (!el) throw new Error('Poster not mounted')
  exitCropMode(false)

  const container = document.createElement('div')
  container.style.cssText = `position:fixed;left:-99999px;top:0;width:${canvasWidth}px;height:${canvasHeight}px;overflow:hidden;pointer-events:none;background:${transparent ? 'transparent' : 'white'};`

  const clone = el.cloneNode(true) as HTMLElement
  clone.style.transform = 'none'
  clone.style.marginLeft = '0'
  clone.style.marginTop = '0'
  if (transparent) clone.style.background = 'transparent'

  container.appendChild(clone)
  document.body.appendChild(container)

  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

  try {
    return await toPng(clone, {
      width: canvasWidth,
      height: canvasHeight,
      pixelRatio: 3,
      backgroundColor: transparent ? 'rgba(0,0,0,0)' : undefined,
      filter: (node: HTMLElement) => {
        if (node.dataset?.excludeExport) return false
        if (transparent && 'bgLayer' in (node.dataset ?? {})) return false
        return true
      },
      fetchRequestInit: { mode: 'cors' } as RequestInit,
    })
  } finally {
    document.body.removeChild(container)
  }
}
