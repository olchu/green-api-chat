import type { StateInstance } from './types'

/** Почему инстанс не может принимать и отправлять сообщения — для входа и поллера */
export const INSTANCE_STATE_MESSAGES: Record<Exclude<StateInstance, 'authorized'>, string> = {
  notAuthorized: 'Инстанс не авторизован. Привяжите аккаунт в личном кабинете GREEN-API',
  starting: 'Инстанс запускается. Попробуйте через минуту',
  blocked: 'Аккаунт заблокирован мессенджером',
  suspended: 'Работа инстанса приостановлена. Проверьте оплату в личном кабинете',
  pendingPassword: 'Инстанс ждёт пароль двухэтапной аутентификации в личном кабинете',
}

export function describeInstanceState(state: StateInstance): string | null {
  if (state === 'authorized') return null
  return INSTANCE_STATE_MESSAGES[state] ?? `Статус инстанса: ${state}`
}
