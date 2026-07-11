#!/usr/bin/env node
/**
 * GeoNames 数据处理脚本
 *
 * 用法：
 *   1. 从 https://download.geonames.org/export/dump/allCountries.zip 下载并解压
 *   2. node scripts/process-geonames.js allCountries.txt src/data/geo_global.json
 *
 * 输出：只保留城市 + 景点，精简字段，约 25 万条
 */

const fs   = require('fs')
const path = require('path')
const readline = require('readline')

// ── 保留的地物类型 ──────────────────────────────────────────
// 城市：人口超过阈值的居民点
const CITY_CODES = new Set([
  'PPLC',   // 首都
  'PPLA',   // 省会/州府
  'PPLA2',  // 地级市
  'PPLA3',  // 县级市
  'PPL',    // 普通城市/镇
  'PPLX',   // 城区
])
const MIN_POPULATION = {
  PPLC:  0,      // 首都全收
  PPLA:  0,      // 省会全收
  PPLA2: 50000,  // 地级市 5万+
  PPLA3: 10000,  // 县级市 1万+
  PPL:   50000,  // 普通城市 5万+（过滤小村镇）
  PPLX:  100000, // 城区 10万+
}

// 景点：有旅游价值的地物
const ATTRACTION_CODES = new Set([
  'MNMT',  // 纪念碑/地标
  'MUS',   // 博物馆
  'CSTL',  // 城堡
  'TOWR',  // 塔
  'ATHF',  // 运动场馆
  'RSRT',  // 度假区
  'AMTH',  // 露天剧场
  'ANS',   // 考古遗址
  'ARCH',  // 拱门
  'CVNT',  // 修道院
  'GDN',   // 花园/公园
  'HSTS',  // 历史遗址
  'MSQE',  // 清真寺
  'MSTY',  // 寺庙
  'OBPT',  // 观景点
  'PAL',   // 宫殿
  'SHRN',  // 圣地/神龛
  'STDM',  // 体育场
  'TMPL',  // 寺庙/神殿
  'ZOO',   // 动物园
  'AIRP',  // 机场
  'PRMN',  // 步行街/广场
  'MALL',  // 购物中心
  'THTR',  // 剧院
  'UNIV',  // 大学（著名景点）
  'HTL',   // 知名酒店/度假村
  'PRK',   // 国家公园
  'RDGE',  // 山脊（著名风景）
  'WTFL',  // 瀑布
  'LNDF',  // 地标
])

// ── 工具函数 ────────────────────────────────────────────────
const CJK_RE = /[一-龥㐀-䶿]/

function hasChinese(str) {
  return CJK_RE.test(str)
}

/** 从 alternatenames 中提取中文和英文别名 */
function parseAliases(raw, primaryName) {
  if (!raw) return { zh: null, aliases: [] }
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
  const zhNames = parts.filter(hasChinese).slice(0, 3)
  const enNames = parts.filter(s => /^[a-zA-Z\s'-]+$/.test(s) && s !== primaryName).slice(0, 2)
  return {
    zh:      zhNames[0] ?? null,
    aliases: [...new Set([...zhNames.slice(1), ...enNames])].slice(0, 4),
  }
}

/** 将经纬度保留 4 位小数（精度约 11m） */
function round4(n) {
  return Math.round(parseFloat(n) * 10000) / 10000
}

// ── 主流程 ──────────────────────────────────────────────────
async function process(inputFile, outputFile) {
  const input  = fs.createReadStream(inputFile, { encoding: 'utf8' })
  const rl     = readline.createInterface({ input, crlfDelay: Infinity })

  const entries = []
  let total = 0, kept = 0

  for await (const line of rl) {
    total++
    if (total % 500000 === 0) {
      process.stdout.write(`\r处理中... ${(total/10000).toFixed(0)}万行，已保留 ${kept} 条`)
    }

    const cols = line.split('\t')
    if (cols.length < 15) continue

    const name          = cols[1]
    const alternatenames = cols[3]
    const lat           = cols[4]
    const lng           = cols[5]
    const featureClass  = cols[6]
    const featureCode   = cols[7]
    const countryCode   = cols[8]
    const population    = parseInt(cols[14]) || 0

    let category = null

    // 城市判断
    if (featureClass === 'P' && CITY_CODES.has(featureCode)) {
      const minPop = MIN_POPULATION[featureCode] ?? 50000
      if (population >= minPop) category = 'city'
    }
    // 景点判断
    else if (featureClass === 'S' && ATTRACTION_CODES.has(featureCode)) {
      category = 'attraction'
    }
    // 自然景观（山/湖等著名的）
    else if (featureClass === 'T' && population > 0) {
      category = 'attraction'
    }
    else if (featureClass === 'H' && featureCode === 'LK' && population > 0) {
      category = 'attraction' // 知名湖泊
    }

    if (!category) continue

    const { zh, aliases } = parseAliases(alternatenames, name)

    // 中国条目：优先用中文名
    const isCN      = countryCode === 'CN'
    const primaryName = isCN && zh ? zh : name

    const entry = {
      name:    primaryName,
      lat:     round4(lat),
      lng:     round4(lng),
      country: countryCode,
      cat:     category === 'city' ? 'c' : 'a',  // 压缩存储
    }

    // 中国条目存英文名，非中国条目存中文名
    if (isCN && name !== primaryName)  entry.en = name
    if (!isCN && zh)                   entry.zh = zh
    if (aliases.length)                entry.alt = aliases

    entries.push(entry)
    kept++
  }

  console.log(`\n总计处理 ${total} 行，保留 ${kept} 条`)

  // 按国家排序（加速搜索时过滤）
  entries.sort((a, b) => a.country.localeCompare(b.country))

  // 写入数据文件
  const dir = path.dirname(outputFile)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  fs.writeFileSync(outputFile, JSON.stringify(entries))
  const size = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(1)
  console.log(`输出数据: ${outputFile}（${size} MB，${kept} 条）`)

  // 构建 FlexSearch 索引并序列化
  // 这样 app 启动时直接加载序列化的索引，无需重新构建（省去 1-2 秒）
  console.log('\n构建 FlexSearch 索引...')
  const { Index } = require('flexsearch')

  function tokenize(str) {
    if (!str) return ''
    const hasCJK = /[一-龥]/.test(str)
    if (hasCJK) return str.split('').join(' ')
    return str.toLowerCase()
  }

  const index = new Index({ tokenize: 'strict' })
  entries.forEach((e, i) => {
    const aliases = [e.en, e.zh, ...(e.alt ?? [])].filter(Boolean)
    const text = [e.name, ...aliases].join(' ')
    index.add(i, tokenize(text))
  })

  // export() 同步调用回调，收集所有分片
  const chunks = {}
  index.export((key, data) => {
    if (data !== undefined) chunks[key] = data
  })

  const indexFile = outputFile.replace('.json', '_index.json')
  fs.writeFileSync(indexFile, JSON.stringify(chunks))
  const idxSize = (fs.statSync(indexFile).size / 1024 / 1024).toFixed(1)
  console.log(`输出索引: ${indexFile}（${idxSize} MB）`)

  // 统计各国数量（前20）
  const byCountry = {}
  entries.forEach(e => { byCountry[e.country] = (byCountry[e.country] || 0) + 1 })
  const top20 = Object.entries(byCountry).sort((a,b) => b[1]-a[1]).slice(0, 20)
  console.log('\n各国数量 Top 20:')
  top20.forEach(([c, n]) => console.log(`  ${c}: ${n}`))
}

// ── 入口 ─────────────────────────────────────────────────────
// 输出到 public/data/，用 fetch() 加载（不经过 Vite bundle）
const [,, inputFile = 'allCountries.txt', outputFile = 'public/data/geo_global.json'] = process.argv

if (!fs.existsSync(inputFile)) {
  console.error(`找不到文件: ${inputFile}`)
  console.error('请先从 https://download.geonames.org/export/dump/allCountries.zip 下载并解压')
  process.exit(1)
}

process(inputFile, outputFile).catch(err => {
  console.error('处理失败:', err)
  process.exit(1)
})
