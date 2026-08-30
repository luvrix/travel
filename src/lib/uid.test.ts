import { describe, it, expect } from 'vitest'
import { uid } from './uid'

describe('uid', () => {
  it('生成无前缀 id', () => {
    const id = uid()
    expect(id).toMatch(/^[0-9a-z]+$/)
  })

  it('生成带前缀 id', () => {
    expect(uid('stop')).toMatch(/^stop-/)
    expect(uid('day')).toMatch(/^day-/)
  })

  it('连续调用产生不同值', () => {
    const a = uid('x')
    const b = uid('x')
    expect(a).not.toBe(b)
  })
})
