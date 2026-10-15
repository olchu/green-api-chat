import { GreenApiError, type GreenApiClient } from '../../api/greenApi'
import type { MessengerRules } from '../../lib/messengers'
import { formatPhone, validatePhone } from '../../lib/phone'
import type { Chat, NewChat } from '../../store/chatStore'

export class StartChatError extends Error {
  name = 'StartChatError'
}

function toStartChatError(error: unknown, messenger: MessengerRules): StartChatError {
  if (error instanceof StartChatError) return error
  if (!(error instanceof GreenApiError)) return new StartChatError('Не удалось проверить номер')

  if (error.status === 0) {
    return new StartChatError('Нет соединения с GREEN-API. Проверьте интернет')
  }
  if (error.status === 469 || error.message === 'rate_limit_exceeded') {
    return new StartChatError(
      `${messenger.name} временно ограничил проверку номеров. Попробуйте через пару часов`,
    )
  }
  if (error.message.includes('not authorized')) {
    return new StartChatError('Инстанс не авторизован. Привяжите аккаунт в личном кабинете')
  }
  return new StartChatError(error.message)
}

/**
 * Находит собеседника по номеру. Известный номер не проверяется повторно:
 * на тарифе Developer проверки ограничены.
 */
export async function findChatByPhone(
  client: GreenApiClient,
  messenger: MessengerRules,
  input: string,
  knownChats: Chat[],
): Promise<NewChat> {
  const validation = validatePhone(input, messenger.phone)
  if (!validation.ok) throw new StartChatError(validation.error)

  const phone = String(validation.phoneNumber)
  const known = knownChats.find((chat) => chat.phone === phone)
  if (known) return known

  try {
    const result = await client.checkAccount({ phoneNumber: validation.phoneNumber })
    if (!result.exist || !result.chatId) {
      throw new StartChatError(
        messenger.supportsUsername
          ? `Номер не найден в ${messenger.name} или скрыт настройками приватности`
          : `Номер не зарегистрирован в ${messenger.name}`,
      )
    }
    return {
      chatId: result.chatId,
      name: knownChats.find((chat) => chat.chatId === result.chatId)?.name ?? formatPhone(phone),
      phone,
      username: result.username || undefined,
    }
  } catch (error) {
    throw toStartChatError(error, messenger)
  }
}
