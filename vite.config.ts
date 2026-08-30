import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE_PATH || '/travel/',
  server: {
    // 关闭预转换：vite 8 默认会在 HTML 请求时同步预转换所有 import 链，
    // 触发 rolldown-runtime 阻塞 ~110s（待上游修复）。关闭后按需懒转换，首屏 <1s。
    preTransformRequests: false,
    // 关闭 HMR：vite 8 + rolldown 在浏览器维持 ws 连接 + 持续请求时偶发死锁
    // （CPU 飙到 199% 无法响应）。改代码后手动刷新浏览器即可。
    hmr: false,
  },
})
