import { useRef, useCallback, useState, useEffect } from 'react'
import { RouteCanvas, type RouteCanvasHandle, type CanvasPhoto } from './components/canvas/RouteCanvas'
import { TemplatePicker } from './components/TemplatePicker'
import { TripEditor } from './components/TripEditor'
import { AiPanel } from './components/AiPanel'
import { useAiRender } from './hooks/useAiRender'
import { useExport } from './hooks/useExport'
import { useTripPersistence } from './hooks/useTripPersistence'
import { useAmapEnrichment } from './hooks/useAmapEnrichment'
import { useRouteMapCompile } from './hooks/useRouteMapCompile'
import { markdownToTrip } from './lib/markdown'
import { useToast } from './components/Toast'
import type { TemplateId } from './templates/types'

function App() {
  const toast = useToast()

  const [trip, setTrip] = useTripPersistence(toast)

  useAmapEnrichment(trip, setTrip, toast)

  const routeMap = useRouteMapCompile(trip)

  const canvasRef = useRef<RouteCanvasHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [canvasWidth, setCanvasWidth] = useState(1080)
  const [canvasHeight, setCanvasHeight] = useState(1920)
  const [canvasPreset, setCanvasPreset] = useState('douyin')
  const [template, setTemplate] = useState<TemplateId>('minimal')
  const [photos, setPhotos] = useState<CanvasPhoto[]>([])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const fileList = Array.from(files)
    e.target.value = ''
    for (let i = 0; i < fileList.length; i++) {
      const id = `img-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`
      const reader = new FileReader()
      reader.onload = () => {
        const url = reader.result as string
        const img = new Image()
        img.onload = () => {
          setPhotos(prev => [...prev, {
            id,
            url,
            x: canvasWidth * 0.25 + (prev.length % 3) * 60,
            y: canvasHeight * 0.2 + Math.floor(prev.length / 3) * 80,
            width: canvasWidth * 0.5,
            rotation: 0,
            crop: { x: 0, y: 0, w: 1, h: 1 },
            aspectRatio: img.naturalWidth / img.naturalHeight,
          }])
        }
        img.src = url
      }
      reader.readAsDataURL(fileList[i])
    }
  }, [canvasWidth, canvasHeight])

  const handlePhotoChange = useCallback((id: string, changes: Partial<CanvasPhoto>) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p))
  }, [])

  const handlePhotoRemove = useCallback((id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id))
  }, [])

  const [showImportModal, setShowImportModal] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')

  const handleImport = useCallback(async () => {
    const md = importText.trim()
    if (!md) { setImportError('请粘贴行程文字'); return }
    try {
      const imported = await markdownToTrip(md)
      setTrip(imported)
      setShowImportModal(false)
      setImportText('')
      setImportError('')
      toast.success('行程已导入')
    } catch {
      setImportError('格式解析失败，请检查内容格式')
    }
  }, [importText, toast, setTrip])

  const { exporting, exportPng, exportMarkdown } = useExport({ canvasRef, title: trip.title, trip })
  const aiRender = useAiRender({ canvasRef, trip, canvasWidth, canvasHeight })

  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!exportMenuOpen && !showAiPanel) return
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false)
        setShowAiPanel(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [exportMenuOpen, showAiPanel])

  const handleOpenAiPanel = useCallback(() => {
    setExportMenuOpen(false)
    setShowAiPanel(true)
    aiRender.setError('')
  }, [aiRender])

  const handleAiSubmit = useCallback(async (params: { apiKey: string; prompt: string }) => {
    const ok = await aiRender.render(params)
    if (ok) setShowAiPanel(false)
  }, [aiRender])

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-end gap-2">
          <div className="relative">
            <span className="invisible text-lg font-semibold px-1.5 py-0.5 whitespace-pre">{trip.title || '    '}</span>
            <input
              type="text"
              value={trip.title}
              onChange={e => setTrip({ ...trip, title: e.target.value })}
              className="absolute inset-0 text-lg font-semibold text-gray-900 bg-transparent hover:bg-gray-100 focus:bg-gray-100 rounded px-1.5 py-0.5 focus:outline-none transition-colors"
            />
          </div>
          <input
            type="date"
            value={trip.startDate}
            onChange={e => setTrip({ ...trip, startDate: e.target.value })}
            className="text-xs font-normal text-gray-400 bg-transparent hover:bg-gray-100 focus:bg-gray-100 rounded px-1.5 py-1 focus:outline-none transition-colors [color-scheme:light]"
          />
        </div>
        <div className="flex items-center gap-3">
          <TemplatePicker current={template} onChange={setTemplate} />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => { setShowImportModal(true); setImportText(''); setImportError('') }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            导入行程
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            + 插入图片
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="text-gray-500">画布</span>
            <select
              value={canvasPreset}
              onChange={e => {
                const v = e.target.value
                setCanvasPreset(v)
                if (v === 'douyin') { setCanvasWidth(1080); setCanvasHeight(1920) }
                else if (v === 'xiaohongshu') { setCanvasWidth(1080); setCanvasHeight(1440) }
                else if (v === 'wechat') { setCanvasWidth(1280); setCanvasHeight(1184) }
              }}
              className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="douyin">抖音 1080×1920</option>
              <option value="xiaohongshu">小红书 1080×1440</option>
              <option value="wechat">微信 1280×1184</option>
              <option value="custom">自定义</option>
            </select>
            <input
              type="number"
              value={canvasWidth}
              onChange={e => { setCanvasPreset('custom'); setCanvasWidth(Math.max(200, Math.min(4096, Number(e.target.value)))) }}
              disabled={canvasPreset !== 'custom'}
              className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
            />
            <span className="text-gray-400">×</span>
            <input
              type="number"
              value={canvasHeight}
              onChange={e => { setCanvasPreset('custom'); setCanvasHeight(Math.max(200, Math.min(4096, Number(e.target.value)))) }}
              disabled={canvasPreset !== 'custom'}
              className="w-16 px-2 py-1 text-xs border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
            />
          </div>
          <div className="relative" ref={exportMenuRef}>
            <div className="flex items-stretch">
              <button
                onClick={exportPng}
                disabled={exporting}
                className="px-4 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-l-lg"
              >
                {exporting ? '导出中...' : '导出路线'}
              </button>
              <button
                onClick={() => setExportMenuOpen(v => !v)}
                disabled={exporting}
                className="px-2 py-1.5 text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 border-l border-blue-400 rounded-r-lg transition-colors"
                title="更多导出选项"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            {exportMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1 overflow-hidden">
                <button
                  onClick={exportPng}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  导出路线
                  <span className="text-xs text-gray-400 ml-auto">含背景</span>
                </button>
                <button
                  onClick={handleOpenAiPanel}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  AI 渲染
                  <span className="text-xs text-gray-400 ml-auto">透明底</span>
                </button>
                <button
                  onClick={exportMarkdown}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  导出行程
                  <span className="text-xs text-gray-400 ml-auto">复制</span>
                </button>
              </div>
            )}

            {showAiPanel && (
              <AiPanel
                trip={trip}
                templateId={template}
                rendering={aiRender.rendering}
                error={aiRender.error}
                onClose={() => setShowAiPanel(false)}
                onSubmit={handleAiSubmit}
              />
            )}
          </div>
        </div>
      </header>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowImportModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col gap-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">导入行程文字</h2>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <p className="text-xs text-gray-500 -mt-1">支持从小程序「长按路线图 → 复制行程文字」导出的格式</p>
            <textarea
              autoFocus
              value={importText}
              onChange={e => { setImportText(e.target.value); setImportError('') }}
              placeholder={'# 北京3日游\n2026-06-01\n\n## Day 1\n- 07:00　上海\n- 10:00　飞机 故宫博物院\n...'}
              rows={12}
              className="w-full text-sm font-mono border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none text-gray-700 leading-relaxed"
            />
            {importError && (
              <p className="text-xs text-red-500 -mt-2">{importError}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
              >
                导入
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <aside className="w-72 border-r border-gray-200 bg-white overflow-y-auto overflow-x-hidden shrink-0">
          <TripEditor trip={trip} onChange={setTrip} />
        </aside>

        <main className="flex-1 min-w-0">
          {routeMap ? (
            <RouteCanvas
              ref={canvasRef}
              routeMap={routeMap}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              template={template}
              photos={photos}
              onPhotoChange={handlePhotoChange}
              onPhotoRemove={handlePhotoRemove}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              加载中…
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
