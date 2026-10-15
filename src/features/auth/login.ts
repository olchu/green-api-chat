import { createGreenApiClient, GreenApiError, normalizeCredentials } from '../../api/greenApi'
import type { Credentials, StateInstance } from '../../api/types'
import type { Session } from '../../store/authStore'

const STATE_MESSAGES: Record<Exclude<StateInstance, 'authorized'>, string> = {
  notAuthorized: 'Инстанс не авторизован. Привяжите аккаунт в личном кабинете GREEN-API',
  starting: 'Инстанс запускается. Попробуйте через минуту',
  blocked: 'Аккаунт заблокирован мессенджером',
  suspended: 'Работа инстанса приостановлена. Проверьте оплату в личном кабинете',
  pendingPassword: 'Инстанс ждёт пароль двухэтапной аутентификации в личном кабинете',
}

export class LoginError extends Error {
  name = 'LoginError'
}

/** Адрес API по умолчанию: первые 4 цифры idInstance */
export function deriveApiUrl(idInstance: string): string {
  const digits = idInstance.trim()
  return /^\d{4,}$/.test(digits) ? `https://${digits.slice(0, 4)}.api.green-api.com` : ''
}

function toLoginError(error: unknown): LoginError {
  if (!(error instanceof GreenApiError)) return new LoginError('Не удалось войти')
  switch (error.status) {
    case 0:
      return new LoginError('Не удалось подключиться к серверу. Проверьте apiUrl и интернет')
    case 401:
    case 403:
      return new LoginError('Неверный idInstance или apiTokenInstance')
    case 404:
      return new LoginError('Инстанс не найден. Проверьте apiUrl и idInstance')
    default:
      return new LoginError(error.message)
  }
}

/** Проверяет данные инстанса и собирает сессию */
export async function login(input: Credentials): Promise<Session> {
  const credentials = normalizeCredentials(input)
  const client = createGreenApiClient(credentials)

  try {
    const [settings, account] = await Promise.all([
      client.getSettings(),
      client.getAccountSettings().catch(() => null),
    ])
    const stateInstance = account?.stateInstance ?? (await client.getStateInstance()).stateInstance

    if (stateInstance !== 'authorized') {
      throw new LoginError(STATE_MESSAGES[stateInstance] ?? `Статус инстанса: ${stateInstance}`)
    }

    return {
      credentials,
      typeInstance: settings.typeInstance,
      account: account && { phone: account.phone, chatId: account.chatId, avatar: account.avatar },
    }
  } catch (error) {
    throw error instanceof LoginError ? error : toLoginError(error)
  }
}
