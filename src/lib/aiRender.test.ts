import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { generateAiPoster } from './aiRender'

type FetchMock = ReturnType<typeof vi.fn> & typeof fetch

const mockFetch = (): FetchMock => vi.fn() as unknown as FetchMock

const mockResponse = (body: unknown, init?: { ok?: boolean; status?: number }): Response => ({
  ok: init?.ok ?? true,
  status: init?.status ?? 200,
  json: async () => body,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
} as Response)

describe('generateAiPoster - 响应校验', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = mockFetch()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('HTTP 非 2xx → 抛 "SiliconFlow 错误 {status}: {body}"', async () => {
    const fn = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    fn.mockResolvedValueOnce(mockResponse('rate limit exceeded', { ok: false, status: 429 }))

    await expect(generateAiPoster({
      routePng: 'data:,',
      prompt: 'test',
      apiKey: 'sk-test',
      canvasWidth: 576,
      canvasHeight: 1024,
    })).rejects.toThrow(/SiliconFlow 错误 429/)
  })

  it('images 字段缺失 → 抛 "AI 服务返回格式异常"', async () => {
    const fn = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    fn.mockResolvedValueOnce(mockResponse({ foo: 'bar' }))

    await expect(generateAiPoster({
      routePng: 'data:,',
      prompt: 'test',
      apiKey: 'sk-test',
      canvasWidth: 576,
      canvasHeight: 1024,
    })).rejects.toThrow(/AI 服务返回格式异常/)
  })

  it('images 是空数组 → 抛 "AI 服务返回格式异常"', async () => {
    const fn = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    fn.mockResolvedValueOnce(mockResponse({ images: [] }))

    await expect(generateAiPoster({
      routePng: 'data:,',
      prompt: 'test',
      apiKey: 'sk-test',
      canvasWidth: 576,
      canvasHeight: 1024,
    })).rejects.toThrow(/AI 服务返回格式异常/)
  })

  it('images[0].url 缺失 → 抛 "AI 服务返回格式异常"', async () => {
    const fn = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    fn.mockResolvedValueOnce(mockResponse({ images: [{ not_url: 'x' }] }))

    await expect(generateAiPoster({
      routePng: 'data:,',
      prompt: 'test',
      apiKey: 'sk-test',
      canvasWidth: 576,
      canvasHeight: 1024,
    })).rejects.toThrow(/AI 服务返回格式异常/)
  })

  it('images[0].url 不是 string 类型 → 抛 "AI 服务返回格式异常"', async () => {
    const fn = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    fn.mockResolvedValueOnce(mockResponse({ images: [{ url: 12345 }] }))

    await expect(generateAiPoster({
      routePng: 'data:,',
      prompt: 'test',
      apiKey: 'sk-test',
      canvasWidth: 576,
      canvasHeight: 1024,
    })).rejects.toThrow(/AI 服务返回格式异常/)
  })

  it('fetch 抛 AbortError → 提示 AI 生成超时', async () => {
    const fn = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    fn.mockImplementationOnce(() => {
      const err = new DOMException('The operation was aborted', 'AbortError')
      throw err
    })

    await expect(generateAiPoster({
      routePng: 'data:,',
      prompt: 'test',
      apiKey: 'sk-test',
      canvasWidth: 576,
      canvasHeight: 1024,
    })).rejects.toThrow(/AI 生成超时/)
  })

  it('fetch 抛网络错误 → 提示网络错误', async () => {
    const fn = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    fn.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(generateAiPoster({
      routePng: 'data:,',
      prompt: 'test',
      apiKey: 'sk-test',
      canvasWidth: 576,
      canvasHeight: 1024,
    })).rejects.toThrow(/网络错误/)
  })
})
