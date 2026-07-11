#!/usr/bin/env node
// Merge all regional geo data files into a single geo.ts
// Deduplicates by name+lat+lng, keeps city entries unique by name

import { readFileSync, writeFileSync } from 'fs'

const files = [
  'src/data/geo-north.ts',
  'src/data/geo-east.ts',
  'src/data/geo-south.ts',
  'src/data/geo-west.ts',
]

function parseEntries(content) {
  // Extract array entries from TypeScript file
  const match = content.match(/=\s*\[([\s\S]*)\]/)
  if (!match) return []

  const inner = match[1]
  const entries = []

  // Parse each { ... } block
  const regex = /\{\s*([^}]+)\s*\}/g
  let m
  while ((m = regex.exec(inner)) !== null) {
    const body = m[1]
    const entry = {}

    // Extract name
    const nameMatch = body.match(/name:\s*'([^']+)'/)
    if (nameMatch) entry.name = nameMatch[1]

    // Extract aliases
    const aliasesMatch = body.match(/aliases:\s*(\[[^\]]*\])/)
    if (aliasesMatch) {
      try { entry.aliases = JSON.parse(aliasesMatch[1].replace(/'/g, '"')) } catch {}
    }

    // Extract pinyin
    const pinyinMatch = body.match(/pinyin:\s*'([^']+)'/)
    if (pinyinMatch) entry.pinyin = pinyinMatch[1]

    // Extract lat/lng
    const latMatch = body.match(/lat:\s*(-?[\d.]+)/)
    if (latMatch) entry.lat = parseFloat(latMatch[1])
    const lngMatch = body.match(/lng:\s*(-?[\d.]+)/)
    if (lngMatch) entry.lng = parseFloat(lngMatch[1])

    // Extract city
    const cityMatch = body.match(/city:\s*'([^']+)'/)
    if (cityMatch) entry.city = cityMatch[1]

    // Extract category
    const catMatch = body.match(/category:\s*'([^']+)'/)
    if (catMatch) entry.category = catMatch[1]

    if (entry.name && entry.lat !== undefined) {
      entries.push(entry)
    }
  }

  return entries
}

const allEntries = []
const seen = new Map() // key -> entry, for dedup

for (const file of files) {
  try {
    const content = readFileSync(file, 'utf-8')
    const entries = parseEntries(content)
    for (const e of entries) {
      // Dedup key: for cities use name, for others use name+city
      const key = e.category === 'city' ? `city:${e.name}` : `${e.name}@${e.city}:${e.lat.toFixed(2)},${e.lng.toFixed(2)}`

      if (!seen.has(key)) {
        seen.set(key, e)
        allEntries.push(e)
      } else {
        // Merge aliases if both have them
        const existing = seen.get(key)
        if (e.aliases && existing.aliases) {
          for (const a of e.aliases) {
            if (!existing.aliases.includes(a)) existing.aliases.push(a)
          }
        } else if (e.aliases && !existing.aliases) {
          existing.aliases = [...e.aliases]
        }
      }
    }
    console.log(`${file}: ${entries.length} entries`)
  } catch (err) {
    console.log(`${file}: not found, skipping`)
  }
}

// Sort: cities first (by province order), then attractions by city
const cityOrder = allEntries.filter(e => e.category === 'city')
const otherEntries = allEntries.filter(e => e.category !== 'city')

// Group attractions by city
const byCity = new Map()
for (const e of otherEntries) {
  if (!byCity.has(e.city)) byCity.set(e.city, [])
  byCity.get(e.city).push(e)
}

// Build final sorted list: city + its attractions
const sorted = []
for (const city of cityOrder) {
  sorted.push(city)
  const attrs = byCity.get(city.name) || []
  sorted.push(...attrs)
  byCity.delete(city.name)
}
// Add any remaining (orphaned attractions)
for (const [, attrs] of byCity) {
  sorted.push(...attrs)
}

// Format output
function formatEntry(e) {
  const parts = [`name: '${e.name}'`]
  if (e.aliases && e.aliases.length) parts.push(`aliases: ${JSON.stringify(e.aliases)}`)
  parts.push(`pinyin: '${e.pinyin}'`)
  parts.push(`lat: ${e.lat}`)
  parts.push(`lng: ${e.lng}`)
  parts.push(`city: '${e.city}'`)
  parts.push(`category: '${e.category}'`)
  return `  { ${parts.join(', ')} },`
}

const lines = [
  `export interface GeoEntry {`,
  `  name: string`,
  `  aliases?: string[]`,
  `  pinyin: string`,
  `  lat: number`,
  `  lng: number`,
  `  city: string`,
  `  category: 'city' | 'attraction' | 'district'`,
  `}`,
  ``,
  `const GEO_DATA: GeoEntry[] = [`,
]

for (const e of sorted) {
  lines.push(formatEntry(e))
}

lines.push(`]`)
lines.push(``)
lines.push(`export default GEO_DATA`)
lines.push(``)

writeFileSync('src/data/geo.ts', lines.join('\n'))

const cityCount = sorted.filter(e => e.category === 'city').length
const attrCount = sorted.filter(e => e.category === 'attraction').length
const distCount = sorted.filter(e => e.category === 'district').length
console.log(`\nMerged: ${sorted.length} total (${cityCount} cities, ${attrCount} attractions, ${distCount} districts)`)
