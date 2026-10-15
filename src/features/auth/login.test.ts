// @vitest-environment node
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { server, setupMockServer } from '../../test/server'
import { apiUrl } from '../../test/fixtures'
import { deriveApiUrl, login } from './login'

const input = {
  apiUrl: 'https://4100.api.green-api.com/',
  idInstance: ' 4100000001',
  apiTokenInstance: 'token123 ',
}

const settings = { typeInstance: 'telegram', webhookUrl: '', incomingWebhook: 'yes' }
const account = {
  stateInstance: 'authorized',
  phone: '79991234567',
  chatId: '10000000',
  avatar: 'https://example.com/a.jpg',
}

setupMockServer()

function mockInstance(options: { account?: object | null; state?: string; status?: number }) {
  const { status = 200 } = options
  server.use(
    http.get(apiUrl('getSettings'), () =>
      status === 200 ? HttpResponse.json(settings) : new HttpResponse(null, { status }),
    ),
    http.get(apiUrl('getAccountSettings'), () =>
      options.account
        ? HttpResponse.json(options.account)
        : new HttpResponse(null, { status: 404 }),
    ),
    http.get(apiUrl('getStateInstance'), () =>
      HttpResponse.json({ stateInstance: options.state ?? 'authorized' }),
    ),
  )
}

describe('deriveApiUrl', () => {
  it('строит адрес по первым 4 цифрам', () => {
    expect(deriveApiUrl(' 4100000001 ')).toBe('https://4100.api.green-api.com')
  })

  it('возвращает пустую строку для неполного или нечислового id', () => {
    expect(deriveApiUrl('410')).toBe('')
    expect(deriveApiUrl('abcd1234')).toBe('')
  })
})

describe('login', () => {
  it('возвращает сессию с очищенными данными, типом инстанса и аккаунтом', async () => {
    mockInstance({ account })

    await expect(login(input)).resolves.toEqual({
      credentials: {
        apiUrl: 'https://4100.api.green-api.com',
        idInstance: '4100000001',
        apiTokenInstance: 'token123',
      },
      typeInstance: 'telegram',
      account: { phone: '79991234567', chatId: '10000000', avatar: 'https://example.com/a.jpg' },
    })
  })

  it('без getAccountSettings проверяет статус через getStateInstance', async () => {
    mockInstance({ account: null })

    await expect(login(input)).resolves.toMatchObject({ account: null })
  })

  it('сообщает, что инстанс не авторизован', async () => {
    mockInstance({ account: { ...account, stateInstance: 'notAuthorized' } })

    await expect(login(input)).rejects.toThrow('Инстанс не авторизован')
  })

  it('сообщает о неверном токене', async () => {
    mockInstance({ status: 401 })

    await expect(login(input)).rejects.toThrow('Неверный idInstance или apiTokenInstance')
  })

  it('сообщает об ошибке сети', async () => {
    mockInstance({ account })
    server.use(http.get(apiUrl('getSettings'), () => HttpResponse.error()))

    await expect(login(input)).rejects.toThrow('Не удалось подключиться к серверу')
  })
})
