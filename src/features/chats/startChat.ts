import { GreenApiError, type GreenApiClient } from '../../api/greenApi'
import type { CheckAccountRequest } from '../../api/types'
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

const USERNAME = /^@[a-z][a-z0-9_]{4,31}$/i

/** Ввод похож на username: начинается с @ или содержит латинские буквы */
export function isUsernameQuery(input: string): boolean {
  return /^\s*@|[a-z_]/i.test(input)
}

/** Проверяет аккаунт через checkAccount и собирает данные нового чата */
async function checkAccount(
  client: GreenApiClient,
  messenger: MessengerRules,
  request: CheckAccountRequest,
  notFound: string,
  fallback: NewChat,
): Promise<NewChat> {
  try {
    const result = await client.checkAccount(request)
    if (!result.exist || !result.chatId) throw new StartChatError(notFound)
    return {
      chatId: result.chatId,
      name: fallback.name,
      phone: result.phoneNumber ? String(result.phoneNumber) : fallback.phone,
      username: result.username || fallback.username,
    }
  } catch (error) {
    throw toStartChatError(error, messenger)
  }
}

async function findByPhone(
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

  const notFound = messenger.supportsUsername
    ? `Номер не найден в ${messenger.name} или скрыт настройками приватности`
    : `Номер не зарегистрирован в ${messenger.name}`
  return checkAccount(client, messenger, { phoneNumber: validation.phoneNumber }, notFound, {
    chatId: '',
    name: formatPhone(phone),
    phone,
  })
}

async function findByUsername(
  client: GreenApiClient,
  messenger: MessengerRules,
  input: string,
  knownChats: Chat[],
): Promise<NewChat> {
  const username = `@${input.trim().replace(/^@/, '')}`
  if (!USERNAME.test(username)) {
    throw new StartChatError(
      'Имя пользователя: от 5 до 32 латинских букв, цифр и _, начинается с буквы',
    )
  }

  const known = knownChats.find((chat) => chat.username?.toLowerCase() === username.toLowerCase())
  if (known) return known

  const notFound = `Пользователь ${username} не найден в ${messenger.name}`
  return checkAccount(client, messenger, { username }, notFound, {
    chatId: '',
    name: username,
    username,
  })
}

/**
 * Находит собеседника по номеру или @username (если мессенджер это поддерживает).
 * Известные собеседники не проверяются повторно: на тарифе Developer проверки ограничены.
 */
export function findChat(
  client: GreenApiClient,
  messenger: MessengerRules,
  input: string,
  knownChats: Chat[],
): Promise<NewChat> {
  return messenger.supportsUsername && isUsernameQuery(input)
    ? findByUsername(client, messenger, input, knownChats)
    : findByPhone(client, messenger, input, knownChats)
}
