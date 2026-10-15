// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { isNearBottom } from './scroll'

describe('isNearBottom', () => {
  it('внизу и почти внизу — да, выше — нет', () => {
    expect(isNearBottom({ scrollHeight: 1000, clientHeight: 400, scrollTop: 600 })).toBe(true)
    expect(isNearBottom({ scrollHeight: 1000, clientHeight: 400, scrollTop: 540 })).toBe(true)
    expect(isNearBottom({ scrollHeight: 1000, clientHeight: 400, scrollTop: 300 })).toBe(false)
  })
})
