import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore, useMessenger, type Session } from './authStore'

const session: Session = {
  credentials: {
    apiUrl: 'https://4100.api.green-api.com',
    idInstance: '4100000001',
    apiTokenInstance: 'token123',
  },
  typeInstance: 'telegram',
  account: { phone: '79991234567', chatId: '10000000', avatar: '' },
}

const STORAGE_KEY = useAuthStore.persist.getOptions().name!

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ session: null })
})

describe('authStore', () => {
  it('login сохраняет сессию в store и localStorage', () => {
    useAuthStore.getState().login(session)

    expect(useAuthStore.getState().session).toEqual(session)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).state.session).toEqual(session)
  })

  it('logout очищает сессию', () => {
    useAuthStore.getState().login(session)
    useAuthStore.getState().logout()

    expect(useAuthStore.getState().session).toBeNull()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).state.session).toBeNull()
  })

  it('восстанавливает сессию из localStorage', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { session }, version: 0 }))

    await useAuthStore.persist.rehydrate()

    expect(useAuthStore.getState().session).toEqual(session)
  })
})

describe('useMessenger', () => {
  it('возвращает правила мессенджера текущей сессии', () => {
    useAuthStore.getState().login({ ...session, typeInstance: 'v3' })

    const { result } = renderHook(() => useMessenger())

    expect(result.current.id).toBe('max')
  })

  it('без сессии возвращает общие правила', () => {
    const { result } = renderHook(() => useMessenger())

    expect(result.current.id).toBe('unknown')
  })
})
