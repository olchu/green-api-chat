import { useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { createGreenApiClient, type GreenApiClient } from './greenApi'

/** Клиент и инстанс текущей сессии вне React (сервисы, поллер); null без входа */
export function getSessionClient(): { client: GreenApiClient; instanceId: string } | null {
  const session = useAuthStore.getState().session
  return session
    ? {
        client: createGreenApiClient(session.credentials),
        instanceId: session.credentials.idInstance,
      }
    : null
}

/** Клиент для текущей сессии; null, если пользователь не вошёл */
export function useGreenApi(): GreenApiClient | null {
  const credentials = useAuthStore((state) => state.session?.credentials)
  return useMemo(() => (credentials ? createGreenApiClient(credentials) : null), [credentials])
}
