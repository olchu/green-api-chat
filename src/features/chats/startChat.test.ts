// @vitest-environment node
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { createGreenApiClient } from '../../api/greenApi'
import { MESSENGERS } from '../../lib/messengers'
import type { Chat } from '../../store/chatStore'
import { apiUrl, testCredentials } from '../../test/fixtures'
import { server, setupMockServer } from '../../test/server'
import { findChat, isUsernameQuery } from './startChat'

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

describe('findChat: по номеру', () => {
  it('проверяет номер и возвращает новый чат', async () => {
    const requestBody = mockCheckAccount({ exist: true, chatId: '555', username: '@anna' })

    await expect(findChat(client, telegram, '8 999 123-45-67', [])).resolves.toEqual({
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
    await expect(findChat(client, telegram, '+79991234567', [known])).resolves.toBe(known)
  })

  it('сохраняет имя чата, созданного раньше из входящего сообщения', async () => {
    mockCheckAccount({ exist: true, chatId: '555' })
    const known: Chat = { chatId: '555', name: 'Анна', unread: 0, createdAt: 0 }

    await expect(findChat(client, telegram, '+79991234567', [known])).resolves.toMatchObject({
      name: 'Анна',
      phone: '79991234567',
    })
  })

  it('не отправляет запрос с неверным номером', async () => {
    await expect(findChat(client, MESSENGERS.max, '+49 151 2345678', [])).rejects.toThrow(
      'Поддерживаются только номера с кодом +7 или +375',
    )
  })

  it('сообщает, что номер не найден', async () => {
    mockCheckAccount({ exist: false, chatId: '' })

    await expect(findChat(client, telegram, '+79991234567', [])).rejects.toThrow(
      'Номер не найден в Telegram или скрыт настройками приватности',
    )
  })

  it('сообщает об ограничении проверок', async () => {
    mockCheckAccount({ status: false, data: { status: 'fail', reason: 'rate_limit_exceeded' } })

    await expect(findChat(client, telegram, '+79991234567', [])).rejects.toThrow(
      'Telegram временно ограничил проверку номеров',
    )
  })

  it('сообщает о неавторизованном инстансе', async () => {
    mockCheckAccount({ status: false, reason: 'instance is starting or not authorized' })

    await expect(findChat(client, MESSENGERS.max, '+79991234567', [])).rejects.toThrow(
      'Инстанс не авторизован',
    )
  })
})

describe('findChat: по username', () => {
  it('ищет по username и добавляет @', async () => {
    const requestBody = mockCheckAccount({
      exist: true,
      chatId: '777',
      username: '@durov_test',
      phoneNumber: 79990001122,
    })

    await expect(findChat(client, telegram, ' durov_test ', [])).resolves.toEqual({
      chatId: '777',
      name: '@durov_test',
      phone: '79990001122',
      username: '@durov_test',
    })
    expect(requestBody()).toEqual({ username: '@durov_test' })
  })

  it('не проверяет известный username повторно', async () => {
    const known: Chat = {
      chatId: '777',
      name: 'Павел',
      username: '@Durov_Test',
      unread: 0,
      createdAt: 0,
    }

    await expect(findChat(client, telegram, '@durov_test', [known])).resolves.toBe(known)
  })

  it('не отправляет запрос с неверным username', async () => {
    await expect(findChat(client, telegram, '@ab', [])).rejects.toThrow('Имя пользователя')
    await expect(findChat(client, telegram, '@1abcde', [])).rejects.toThrow('Имя пользователя')
  })

  it('сообщает, что пользователь не найден', async () => {
    mockCheckAccount({ exist: false, chatId: '' })

    await expect(findChat(client, telegram, '@nobody_here', [])).rejects.toThrow(
      'Пользователь @nobody_here не найден в Telegram',
    )
  })

  it('в MAX username не поддерживается и ввод проверяется как номер', async () => {
    await expect(findChat(client, MESSENGERS.max, '@durov_test', [])).rejects.toThrow(
      'Номер может содержать только цифры',
    )
  })
})

describe('isUsernameQuery', () => {
  it('отличает username от номера', () => {
    expect(isUsernameQuery('@anna')).toBe(true)
    expect(isUsernameQuery('anna_k')).toBe(true)
    expect(isUsernameQuery('+7 (999) 123-45-67')).toBe(false)
    expect(isUsernameQuery('8 999 123 45 67')).toBe(false)
  })
})
