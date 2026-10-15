import { useEffect } from 'react'
import { useGreenApi } from '../../api/useGreenApi'
import { useInstanceId } from '../../store/authStore'
import { runPoller } from './poller'
import { useSyncStore } from './syncStore'

/** Получает сообщения и статусы, пока пользователь в приложении */
export function usePoller() {
  const client = useGreenApi()
  const instanceId = useInstanceId()

  useEffect(() => {
    if (!client) return
    const controller = new AbortController()
    void runPoller(client, instanceId, controller.signal)
    return () => {
      controller.abort()
      useSyncStore.getState().reset()
    }
  }, [client, instanceId])
}
