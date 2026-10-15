import type { Credentials } from '../api/types'
import type { Session } from '../store/authStore'
import type { Message } from '../store/chatStore'

export const testCredentials: Credentials = {
  apiUrl: 'https://4100.api.green-api.com',
  idInstance: '4100000001',
  apiTokenInstance: 'token123',
}

export const testSession: Session = {
  credentials: testCredentials,
  typeInstance: 'telegram',
  account: { phone: '79991234567', chatId: '10000000', avatar: '' },
}

/** Адрес метода GREEN-API для тестового инстанса */
export function apiUrl(method: string): string {
  const { apiUrl, idInstance, apiTokenInstance } = testCredentials
  return `${apiUrl}/waInstance${idInstance}/${method}/${apiTokenInstance}`
}

/** Входящее сообщение «Привет» в чат «1»; поля переопределяются */
export function testMessage(overrides: Partial<Message> = {}): Message {
  const id = overrides.id ?? 'm1'
  return {
    id,
    idMessage: id,
    chatId: '1',
    text: 'Привет',
    timestamp: Date.now(),
    direction: 'in',
    ...overrides,
  }
}
