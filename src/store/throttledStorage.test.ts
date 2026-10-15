import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createThrottledStorage } from './throttledStorage'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const value = (n: number) => ({ state: { n }, version: 0 })

describe('createThrottledStorage', () => {
  it('пишет последнее значение один раз за интервал', () => {
    const storage = createThrottledStorage<{ n: number }>(500)
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    storage.setItem('key', value(1))
    storage.setItem('key', value(2))
    expect(setItem).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500)

    expect(setItem).toHaveBeenCalledTimes(1)
    expect(storage.getItem('key')).toEqual(value(2))
    setItem.mockRestore()
  })

  it('flush записывает сразу', () => {
    const storage = createThrottledStorage<{ n: number }>(500)

    storage.setItem('key', value(3))
    storage.flush()

    expect(JSON.parse(localStorage.getItem('key')!)).toEqual(value(3))
  })

  it('записывает при скрытии страницы', () => {
    const storage = createThrottledStorage<{ n: number }>(500)

    storage.setItem('key', value(4))
    window.dispatchEvent(new Event('pagehide'))

    expect(JSON.parse(localStorage.getItem('key')!)).toEqual(value(4))
  })
})
