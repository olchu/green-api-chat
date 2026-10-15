import { useEffect } from 'react'
import { useGreenApi } from '../../api/useGreenApi'
import { useInstanceId } from '../../store/authStore'
import { useActiveChatId } from '../../store/chatStore'
import { ensureContactInfo } from './contactInfo'

/** Подгружает имя и фото собеседника, когда его чат открывают */
export function useActiveChatInfo() {
  const client = useGreenApi()
  const instanceId = useInstanceId()
  const chatId = useActiveChatId(instanceId)

  useEffect(() => {
    if (client && chatId) void ensureContactInfo(client, instanceId, chatId)
  }, [client, instanceId, chatId])
}
