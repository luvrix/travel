import { useCallback, useEffect, useRef, useState } from 'react'
import { generateAiPoster } from '../lib/aiRender'
import type { RouteCanvasHandle } from '../components/canvas/RouteCanvas'
import type { Trip } from '../types'
import { useToast } from '../components/Toast'

interface UseAiRenderOpts {
  canvasRef: React.RefObject<RouteCanvasHandle | null>
  trip: Trip
  canvasWidth: number
  canvasHeight: number
}

export function useAiRender({ canvasRef, trip, canvasWidth, canvasHeight }: UseAiRenderOpts) {
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()
  const tripRef = useRef(trip)
  useEffect(() => { tripRef.current = trip }, [trip])

  const render = useCallback(async (params: { apiKey: string; prompt: string }) => {
    if (!canvasRef.current || rendering) return
    setRendering(true)
    setError('')
    try {
      const routePng = await canvasRef.current.exportPngTransparent()
      const resultUrl = await generateAiPoster({
        routePng,
        prompt: params.prompt,
        apiKey: params.apiKey,
        canvasWidth,
        canvasHeight,
      })

      const link = document.createElement('a')
      link.download = `${tripRef.current.title}_AI渲染.jpg`
      link.href = resultUrl
      link.click()
      // 延迟释放：浏览器下载是异步的，立即 revoke 在 Safari 上可能 race 导致下载失败
      setTimeout(() => URL.revokeObjectURL(resultUrl), 1000)
      toast.success('AI 渲染完成')
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '生成失败，请重试'
      setError(msg)
      return false
    } finally {
      setRendering(false)
    }
  }, [rendering, canvasRef, canvasWidth, canvasHeight, toast])

  return { rendering, error, render, setError }
}
