/**
 * AI 渲染：调 SiliconFlow 生成背景图，Canvas 合成路线图，返回最终图片 dataURL
 */

export interface AiRenderOptions {
  routePng: string        // 透明背景路线图 dataURL
  prompt: string          // 完整提示词
  apiKey: string          // SiliconFlow API Key
  canvasWidth: number
  canvasHeight: number
}

const SILICONFLOW_URL = 'https://api.siliconflow.cn/v1/images/generations'
const MODEL = 'Tongyi-MAI/Z-Image-Turbo'
const GEN_SIZE = '576x1024'

/** 将 URL / dataURL 加载为 ImageBitmap（绕过 Canvas 跨域限制） */
async function loadImage(src: string): Promise<ImageBitmap> {
  if (src.startsWith('data:')) {
    const res = await fetch(src)
    const blob = await res.blob()
    return createImageBitmap(blob)
  }
  // 外部 URL：先 fetch 成 blob 再 createImageBitmap，避免跨域 getImageData 限制
  const res = await fetch(src)
  const blob = await res.blob()
  return createImageBitmap(blob)
}

/** 简单 box blur — 用于扩散路线 alpha 形成保护区 */
function boxBlur(data: Float32Array, w: number, h: number, r: number): Float32Array {
  const out = new Float32Array(w * h)
  const area = (2 * r + 1) * (2 * r + 1)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const ny = Math.min(h - 1, Math.max(0, y + dy))
          const nx = Math.min(w - 1, Math.max(0, x + dx))
          sum += data[ny * w + nx]
        }
      }
      out[y * w + x] = sum / area
    }
  }
  return out
}

export async function generateAiPoster(opts: AiRenderOptions): Promise<string> {
  const { routePng, prompt, apiKey, canvasWidth, canvasHeight } = opts

  // ── 1. 调 SiliconFlow 生成 AI 背景 ───────────────
  const res = await fetch(SILICONFLOW_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt, image_size: GEN_SIZE, batch_size: 1 }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`SiliconFlow 错误 ${res.status}: ${err}`)
  }
  const aiImageUrl: string = (await res.json()).images[0].url

  // ── 2. 加载两张图 ────────────────────────────────
  const [aiBitmap, routeBitmap] = await Promise.all([
    loadImage(aiImageUrl),
    loadImage(routePng),
  ])

  // ── 3. Canvas 合成 ───────────────────────────────
  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight)
  const ctx = canvas.getContext('2d')!

  // 3-1 白色底色
  ctx.fillStyle = '#f9f9f9'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // 3-2 绘制路线图到离屏 canvas，提取 alpha 通道
  const routeCanvas = new OffscreenCanvas(canvasWidth, canvasHeight)
  const rCtx = routeCanvas.getContext('2d')!
  rCtx.drawImage(routeBitmap, 0, 0, canvasWidth, canvasHeight)
  const routePixels = rCtx.getImageData(0, 0, canvasWidth, canvasHeight).data

  // 3-3 提取路线 alpha 并扩散（保护区）
  const routeAlpha = new Float32Array(canvasWidth * canvasHeight)
  for (let i = 0; i < canvasWidth * canvasHeight; i++) {
    routeAlpha[i] = routePixels[i * 4 + 3] / 255
  }
  const blurRadius = Math.round(canvasWidth * 0.025)  // 约 2.5% 画布宽度
  const protected_ = boxBlur(routeAlpha, canvasWidth, canvasHeight, blurRadius)

  // 3-4 绘制 AI 背景，路线区域淡出 50%
  const aiCanvas = new OffscreenCanvas(canvasWidth, canvasHeight)
  const aCtx = aiCanvas.getContext('2d')!
  aCtx.drawImage(aiBitmap, 0, 0, canvasWidth, canvasHeight)
  const aiImgData = aCtx.getImageData(0, 0, canvasWidth, canvasHeight)
  const aiPx = aiImgData.data
  for (let i = 0; i < canvasWidth * canvasHeight; i++) {
    const protection = protected_[i]
    aiPx[i * 4 + 3] = Math.round(aiPx[i * 4 + 3] * (1 - protection * 0.5))
  }
  aCtx.putImageData(aiImgData, 0, 0)
  ctx.drawImage(aiCanvas, 0, 0)

  // 3-5 叠路线图（透明 PNG，直接覆盖）
  ctx.drawImage(routeBitmap, 0, 0, canvasWidth, canvasHeight)

  // ── 4. 导出 JPEG ─────────────────────────────────
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.96 })
  return URL.createObjectURL(blob)
}
