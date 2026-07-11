import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * 渲染器单文件构建配置
 * 使用 vite-plugin-singlefile 将 JS/CSS 全部内联进 HTML
 * 解决 WebView file:// 协议下 type="module" 被 CORS 阻断的问题
 */
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  publicDir: false,
  build: {
    outDir: 'dist-renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: { renderer: 'renderer.html' },
    },
    // singlefile 会处理内联，关掉默认的 chunk 分割
    assetsInlineLimit: Infinity,
    chunkSizeWarningLimit: 10000,
  },
})
