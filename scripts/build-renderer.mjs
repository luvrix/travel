#!/usr/bin/env node
/**
 * 构建渲染器并复制到小程序包
 *
 * 用法：node scripts/build-renderer.mjs
 *      （或 npm run build:renderer）
 */
import { execSync } from 'child_process'
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = join(__dir, '..')
const distDir = join(root, 'dist-renderer')
const targetDir = join(root, '..', 'tuway', 'renderer')

console.log('🔨 构建渲染器...')
execSync('npx vite build --config vite.renderer.config.ts', {
  cwd: root,
  stdio: 'inherit',
})

console.log(`\n📦 复制到 tuway/renderer/...`)
if (existsSync(targetDir)) rmSync(targetDir, { recursive: true })
mkdirSync(targetDir, { recursive: true })
cpSync(distDir, targetDir, { recursive: true })

const htmlPath = join(targetDir, 'renderer.html')
let html = readFileSync(htmlPath, 'utf8')
// 移除 crossorigin 和 type="module"（WebView file:// 下 CORS 会阻断模块加载）
html = html.replace(/ crossorigin/g, '')
html = html.replace(/ type="module"/g, '')
writeFileSync(htmlPath, html)
console.log(`🔧 已移除 crossorigin / type="module"`)

// 把 renderer.html 转成 .js 模块（mini-program 打包器一定会包含 .js 文件）
const jsContent = `module.exports = ${JSON.stringify(html)};`
writeFileSync(join(targetDir, 'renderer-content.js'), jsContent)
console.log(`📦 renderer-content.js 生成完毕（${Math.round(jsContent.length / 1024)}KB）`)

console.log(`✅ 完成！产物位置: tuway/renderer/`)
console.log(`   入口文件: tuway/renderer/renderer.html`)
