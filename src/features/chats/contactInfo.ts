import type { GreenApiClient } from '../../api/greenApi'
import { formatPhone } from '../../lib/phone'
import type { Chat } from '../../store/chatStore'

/** Имя, фото и контакты собеседника из getContactInfo */
export async function loadContactInfo(
  client: GreenApiClient,
  chatId: string,
  signal?: AbortSignal,
): Promise<Partial<Chat>> {
  const info = await client.getContactInfo(chatId, signal)
  const phone = info.phoneNumber ? String(info.phoneNumber) : undefined
  return {
    name: info.contactName || info.name || info.username || (phone && formatPhone(phone)),
    avatar: info.avatar || undefined,
    username: info.username || undefined,
    phone,
    infoLoaded: true,
  }
}
