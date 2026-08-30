let counter = 0

/** 生成短随机 id，可选前缀 */
export function uid(prefix?: string): string {
  counter += 1
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 6)
  const c = counter.toString(36)
  const core = `${t}${r}${c}`
  return prefix ? `${prefix}-${core}` : core
}
