import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useSyncProblem, useSyncStore } from './syncStore'

describe('syncStore', () => {
  it('показывает самую важную проблему и снимает их независимо', () => {
    const { setProblem } = useSyncStore.getState()
    setProblem('connection', 'Нет соединения')
    setProblem('state', 'Инстанс не авторизован')
    const { result, rerender } = renderHook(() => useSyncProblem())
    expect(result.current).toBe('Инстанс не авторизован')

    setProblem('state', null)
    rerender()
    expect(result.current).toBe('Нет соединения')

    setProblem('connection', null)
    rerender()
    expect(result.current).toBeNull()
  })
})
