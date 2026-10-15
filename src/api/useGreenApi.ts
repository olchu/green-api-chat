import { useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { createGreenApiClient, type GreenApiClient } from './greenApi'

/** Клиент для текущей сессии; null, если пользователь не вошёл */
export function useGreenApi(): GreenApiClient | null {
  const credentials = useAuthStore((state) => state.session?.credentials)
  return useMemo(() => (credentials ? createGreenApiClient(credentials) : null), [credentials])
}
