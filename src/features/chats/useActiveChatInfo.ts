import { useEffect } from 'react'
import { useGreenApi } from '../../api/useGreenApi'
import { useInstanceId } from '../../store/authStore'
import { useActiveChatId, useChatStore } from '../../store/chatStore'
import { loadContactInfo } from './contactInfo'

/** Один раз подгружает имя и фото собеседника, когда его чат открывают */
export function useActiveChatInfo() {
  const client = useGreenApi()
  const instanceId = useInstanceId()
  const chatId = useActiveChatId(instanceId)
  const needsInfo = useChatStore((state) =>
    chatId ? !state.byInstance[instanceId]?.chats[chatId]?.infoLoaded : false,
  )

  useEffect(() => {
    if (!client || !chatId || !needsInfo) return
    const controller = new AbortController()
    loadContactInfo(client, chatId, controller.signal)
      .then((info) => useChatStore.getState().updateChat(instanceId, chatId, info))
      // Без имени и фото чат остаётся рабочим: показываем номер и инициалы
      .catch(() => {})
    return () => controller.abort()
  }, [client, instanceId, chatId, needsInfo])
}
