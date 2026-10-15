import type { GreenApiClient } from '../../api/greenApi'
import { formatPhone } from '../../lib/phone'
import { useChatStore, type Chat } from '../../store/chatStore'

/** Имя, фото и контакты собеседника из getContactInfo */
export async function loadContactInfo(
  client: GreenApiClient,
  chatId: string,
): Promise<Partial<Chat>> {
  const info = await client.getContactInfo(chatId)
  const phone = info.phoneNumber ? String(info.phoneNumber) : undefined
  return {
    name: info.contactName || info.name || info.username || (phone && formatPhone(phone)),
    avatar: info.avatar || undefined,
    username: info.username || undefined,
    phone,
    infoLoaded: true,
  }
}

const inFlight = new Set<string>()

/**
 * Один раз подгружает данные собеседника в чат. Повторные вызовы для того же чата,
 * пока идёт запрос или после успешной загрузки, ничего не делают. При ошибке
 * данные запросятся снова при следующем вызове.
 */
export async function ensureContactInfo(
  client: GreenApiClient,
  instanceId: string,
  chatId: string,
): Promise<void> {
  const key = `${instanceId}:${chatId}`
  const chat = useChatStore.getState().byInstance[instanceId]?.chats[chatId]
  if (!chat || chat.infoLoaded || inFlight.has(key)) return

  inFlight.add(key)
  try {
    const info = await loadContactInfo(client, chatId)
    useChatStore.getState().updateChat(instanceId, chatId, info)
  } catch {
    // Без имени и фото чат остаётся рабочим: номер и инициалы
  } finally {
    inFlight.delete(key)
  }
}
