import { useCallback, useState } from 'react'
import type { RouteCanvasHandle } from '../components/canvas/RouteCanvas'
import type { Trip } from '../types'
import { tripToMarkdown } from '../lib/markdown'
import { useToast } from '../components/Toast'

interface UseExportOpts {
  canvasRef: React.RefObject<RouteCanvasHandle | null>
  title: string
  trip: Trip
}

// File System Access API：能 await 写盘完成，toast 在文件真正落地后再弹
// Safari/Firefox 不支持，降级到 <a download> + 延迟（fire-and-forget，无法可靠等完成）
type FileSystemFileHandleLike = {
  createWritable(): Promise<{ write(blob: Blob): Promise<void>; close(): Promise<void> }>
}
type WindowWithSavePicker = Window & {
  showSaveFilePicker?(opts: {
    suggestedName?: string
    types?: Array<{ description?: string; accept: Record<string, string[]> }>
  }): Promise<FileSystemFileHandleLike>
}

// 用户在保存对话框点取消 — 不算错误，但也不算成功，不应弹 success toast
class ExportCanceledError extends Error {
  constructor() { super('用户取消保存'); this.name = 'ExportCanceledError' }
}

async function downloadPng(dataUrl: string, filename: string): Promise<void> {
  const w = window as WindowWithSavePicker
  if (w.showSaveFilePicker) {
    let writable: { write(blob: Blob): Promise<void>; close(): Promise<void> } | null = null
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'PNG', accept: { 'image/png': ['.png'] } }],
      })
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (err) {
      // writable 已开但写失败 — 关闭避免句柄泄漏
      if (writable) await writable.close().catch(() => {})
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ExportCanceledError()
      }
      // 其它错误降级到传统下载
    }
  }
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
  // <a download> 是 fire-and-forget，浏览器写盘是异步的
  // 等浏览器处理 click 事件 + 真正写盘后再返回，让 toast 在文件落地后弹
  await new Promise(r => setTimeout(r, 500))
}

export function useExport({ canvasRef, title, trip }: UseExportOpts) {
  const [exporting, setExporting] = useState(false)
  const toast = useToast()

  const exportPng = useCallback(async () => {
    if (!canvasRef.current || exporting) return
    setExporting(true)
    try {
      const dataUrl = await canvasRef.current.exportPng()
      await downloadPng(dataUrl, `${title}.png`)
      toast.success('已导出路线图')
    } catch (err: unknown) {
      if (err instanceof ExportCanceledError) return
      toast.error(err instanceof Error ? err.message : '导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }, [exporting, canvasRef, title, toast])

  const exportTransparent = useCallback(async () => {
    if (!canvasRef.current || exporting) return
    setExporting(true)
    try {
      const dataUrl = await canvasRef.current.exportPngTransparent()
      await downloadPng(dataUrl, `${title}_路线.png`)
      toast.success('已导出透明路线图')
    } catch (err: unknown) {
      if (err instanceof ExportCanceledError) return
      toast.error(err instanceof Error ? err.message : '导出失败，请重试')
    } finally {
      setExporting(false)
    }
  }, [exporting, canvasRef, title, toast])

  const exportMarkdown = useCallback(async () => {
    const md = tripToMarkdown(trip)
    try {
      await navigator.clipboard.writeText(md)
      toast.success('行程已复制到剪贴板')
    } catch {
      // clipboard API 不可用（如非 HTTPS / 旧浏览器），降级下载 .md
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `${title}.md`
      link.href = url
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success('已下载行程文件')
    }
  }, [trip, title, toast])

  return { exporting, exportPng, exportTransparent, exportMarkdown }
}
