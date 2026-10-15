import type { PersistStorage, StorageValue } from 'zustand/middleware'

export interface ThrottledStorage<S> extends PersistStorage<S> {
  /** Немедленно записывает отложенное состояние */
  flush: () => void
}

/**
 * Хранилище для persist, которое пишет в localStorage не чаще раза в `delay` мс.
 * Поллер меняет чаты на каждое уведомление, а сериализация всей истории дорогая.
 */
export function createThrottledStorage<S>(delay = 500): ThrottledStorage<S> {
  let pending: { name: string; value: StorageValue<S> } | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  const flush = () => {
    clearTimeout(timer)
    timer = undefined
    if (!pending) return
    localStorage.setItem(pending.name, JSON.stringify(pending.value))
    pending = null
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
  }

  return {
    flush,
    getItem: (name) => {
      const raw = localStorage.getItem(name)
      return raw ? (JSON.parse(raw) as StorageValue<S>) : null
    },
    setItem: (name, value) => {
      pending = { name, value }
      timer ??= setTimeout(flush, delay)
    },
    removeItem: (name) => {
      pending = null
      localStorage.removeItem(name)
    },
  }
}
