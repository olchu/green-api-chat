// @vitest-environment node
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { createGreenApiClient } from '../../api/greenApi'
import { MESSENGERS } from '../../lib/messengers'
import type { Chat } from '../../store/chatStore'
import { apiUrl, testCredentials } from '../../test/fixtures'
import { server, setupMockServer } from '../../test/server'
import { findChatByPhone } from './startChat'

setupMockServer()

const client = createGreenApiClient(testCredentials)
const telegram = MESSENGERS.telegram

function mockCheckAccount(response: object, status = 200) {
  let body: unknown
  server.use(
    http.post(apiUrl('checkAccount'), async ({ request }) => {
      body = await request.json()
      return HttpResponse.json(response, { status })
    }),
  )
  return () => body
}

describe('findChatByPhone', () => {
  it('проверяет номер и возвращает новый чат', async () => {
    const requestBody = mockCheckAccount({ exist: true, chatId: '555', username: '@anna' })

    await expect(findChatByPhone(client, telegram, '8 999 123-45-67', [])).resolves.toEqual({
      chatId: '555',
      name: '+7 999 123-45-67',
      phone: '79991234567',
      username: '@anna',
    })
    expect(requestBody()).toEqual({ phoneNumber: 79991234567 })
  })

  it('не проверяет номер повторно, если чат уже есть', async () => {
    const known: Chat = {
      chatId: '555',
      name: 'Анна',
      phone: '79991234567',
      unread: 0,
      createdAt: 0,
    }

    // Запрос без мока упал бы с ошибкой onUnhandledFrame
    await expect(findChatByPhone(client, telegram, '+79991234567', [known])).resolves.toBe(known)
  })

  it('сохраняет имя чата, созданного раньше из входящего сообщения', async () => {
    mockCheckAccount({ exist: true, chatId: '555' })
    const known: Chat = { chatId: '555', name: 'Анна', unread: 0, createdAt: 0 }

    await expect(findChatByPhone(client, telegram, '+79991234567', [known])).resolves.toMatchObject(
      { name: 'Анна', phone: '79991234567' },
    )
  })

  it('не отправляет запрос с неверным номером', async () => {
    await expect(findChatByPhone(client, MESSENGERS.max, '+49 151 2345678', [])).rejects.toThrow(
      'Поддерживаются только номера с кодом +7 или +375',
    )
  })

  it('сообщает, что номер не найден', async () => {
    mockCheckAccount({ exist: false, chatId: '' })

    await expect(findChatByPhone(client, telegram, '+79991234567', [])).rejects.toThrow(
      'Номер не найден в Telegram или скрыт настройками приватности',
    )
  })

  it('сообщает об ограничении проверок', async () => {
    mockCheckAccount({ status: false, data: { status: 'fail', reason: 'rate_limit_exceeded' } })

    await expect(findChatByPhone(client, telegram, '+79991234567', [])).rejects.toThrow(
      'Telegram временно ограничил проверку номеров',
    )
  })

  it('сообщает о неавторизованном инстансе', async () => {
    mockCheckAccount({ status: false, reason: 'instance is starting or not authorized' })

    await expect(findChatByPhone(client, MESSENGERS.max, '+79991234567', [])).rejects.toThrow(
      'Инстанс не авторизован',
    )
  })
})
