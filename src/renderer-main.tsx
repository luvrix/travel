/**
 * 小程序 WebView 渲染器入口
 * 通过 URL 参数接收路线数据（适合 localhost / HTTPS 场景）
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import ReactDOM from 'react-dom/client'
import { RouteCanvas, type RouteCanvasHandle } from './components/canvas/RouteCanvas'
import { computePositions } from './projection/layout'
import { getAllTemplates } from './templates'
import type { RouteMap } from './types'
import type { TemplateId } from './templates/types'
import './index.css'

declare const wx: any

function RendererApp() {
  const canvasRef = useRef<RouteCanvasHandle>(null)
  const [templateId, setTemplateId] = useState<TemplateId>('minimal')
  const [routeMap, setRouteMap] = useState<RouteMap | null>(null)
  const [exporting, setExporting] = useState(false)

  const canvasW = window.innerWidth || 375
  const canvasH = Math.round(canvasW * 1920 / 1080)

  useEffect(() => {
    // 从 URL params 解析路线数据
    const p = new URLSearchParams(location.search)
    const raw = p.get('rm')
    const tmpl = (p.get('t') || 'minimal') as TemplateId
    setTemplateId(tmpl)

    if (!raw) return
    try {
      const rm: RouteMap = JSON.parse(decodeURIComponent(raw))
      computePositions(rm, canvasW, canvasH)
      setRouteMap(rm)
    } catch (e) {
      console.error('[renderer] parse error', e)
    }
  }, [canvasW, canvasH])

  const handleExport = useCallback(async () => {
    if (!canvasRef.current || exporting) return
    setExporting(true)
    try {
      const dataUrl = await canvasRef.current.exportPng()
      const isMP = typeof wx !== 'undefined' && wx?.miniProgram
      if (isMP) {
        wx.miniProgram.postMessage({ data: { action: 'export', dataUrl } })
        wx.miniProgram.navigateBack()
      } else {
        const a = document.createElement('a')
        a.href = dataUrl; a.download = 'route.png'; a.click()
      }
    } catch (e) {
      console.error('[renderer] export error', e)
    } finally {
      setExporting(false)
    }
  }, [exporting])

  const templates = useMemo(() => getAllTemplates(), [])

  if (!routeMap) {
    return (
      <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center',
        background:'#111', color:'#888', fontFamily:'system-ui', flexDirection:'column', gap:16 }}>
        <div style={{ fontSize:32 }}>🗺️</div>
        <div>加载中…</div>
      </div>
    )
  }

  return (
    <div style={{ background:'#0d0d0d', minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <div style={{ flex:1, overflowY:'auto' }}>
        <RouteCanvas ref={canvasRef} routeMap={routeMap}
          canvasWidth={canvasW} canvasHeight={canvasH}
          template={templateId} photos={[]}
          onPhotoChange={() => {}} onPhotoRemove={() => {}} />
      </div>
      <div style={{ background:'#1a1a1a', padding:'12px 16px',
        paddingBottom:'calc(12px + env(safe-area-inset-bottom))',
        display:'flex', gap:12, alignItems:'center', flexShrink:0 }}>
        <div style={{ flex:1, display:'flex', gap:8, overflowX:'auto' }}>
          {templates.map(t => (
            <button key={t.id} onClick={() => setTemplateId(t.id as TemplateId)}
              style={{ padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer',
                flexShrink:0, fontFamily:'system-ui', fontSize:13,
                background: t.id === templateId ? '#fff' : 'rgba(255,255,255,0.15)',
                color: t.id === templateId ? '#000' : '#fff' }}>
              {t.icon} {t.name}
            </button>
          ))}
        </div>
        <button onClick={handleExport} disabled={exporting}
          style={{ padding:'10px 20px', borderRadius:10, border:'none', cursor:'pointer',
            flexShrink:0, fontFamily:'system-ui', fontSize:14, fontWeight:600,
            background: exporting ? '#444' : '#fff', color: exporting ? '#888' : '#000' }}>
          {exporting ? '保存中…' : '保存相册'}
        </button>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<RendererApp />)
