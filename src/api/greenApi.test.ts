// @vitest-environment node
import { http, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { buildUrl, createGreenApiClient, GreenApiError } from './greenApi'
import type { Credentials } from './types'

const credentials: Credentials = {
  apiUrl: 'https://4100.api.green-api.com/',
  idInstance: '4100000001',
  apiTokenInstance: 'token123',
}
const base = 'https://4100.api.green-api.com/waInstance4100000001'

const server = setupServer()
const client = createGreenApiClient(credentials)

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('buildUrl', () => {
  it('убирает лишний слэш и пробелы, добавляет суффикс и параметры', () => {
    expect(
      buildUrl({ ...credentials, idInstance: ' 4100000001 ' }, 'receiveNotification', {
        query: { receiveTimeout: 20 },
      }),
    ).toBe(`${base}/receiveNotification/token123?receiveTimeout=20`)

    expect(buildUrl(credentials, 'deleteNotification', { pathSuffix: '42' })).toBe(
      `${base}/deleteNotification/token123/42`,
    )
  })
})

describe('createGreenApiClient', () => {
  it('getStateInstance возвращает статус инстанса', async () => {
    server.use(
      http.get(`${base}/getStateInstance/token123`, () =>
        HttpResponse.json({ stateInstance: 'authorized' }),
      ),
    )

    await expect(client.getStateInstance()).resolves.toEqual({ stateInstance: 'authorized' })
  })

  it('sendMessage отправляет POST с JSON', async () => {
    let received: unknown
    server.use(
      http.post(`${base}/sendMessage/token123`, async ({ request }) => {
        received = await request.json()
        return HttpResponse.json({ idMessage: 'msg-1' })
      }),
    )

    const result = await client.sendMessage({ chatId: '10000000', message: 'Привет' })

    expect(received).toEqual({ chatId: '10000000', message: 'Привет' })
    expect(result).toEqual({ idMessage: 'msg-1' })
  })

  it('receiveNotification передаёт таймаут и возвращает null при пустой очереди', async () => {
    let timeout: string | null = null
    server.use(
      http.get(`${base}/receiveNotification/token123`, ({ request }) => {
        timeout = new URL(request.url).searchParams.get('receiveTimeout')
        return new HttpResponse('null', { headers: { 'Content-Type': 'application/json' } })
      }),
    )

    await expect(client.receiveNotification(20)).resolves.toBeNull()
    expect(timeout).toBe('20')
  })

  it('receiveNotification возвращает null на пустой ответ', async () => {
    server.use(http.get(`${base}/receiveNotification/token123`, () => new HttpResponse('')))

    await expect(client.receiveNotification(5)).resolves.toBeNull()
  })

  it('deleteNotification отправляет DELETE с receiptId', async () => {
    server.use(
      http.delete(`${base}/deleteNotification/token123/42`, () =>
        HttpResponse.json({ result: true }),
      ),
    )

    await expect(client.deleteNotification(42)).resolves.toEqual({ result: true })
  })

  it('бросает GreenApiError с кодом ответа при HTTP-ошибке', async () => {
    server.use(
      http.get(`${base}/getSettings/token123`, () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 }),
      ),
    )

    const error = await client.getSettings().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(GreenApiError)
    expect(error).toMatchObject({ status: 401, message: 'Unauthorized' })
  })

  it('бросает GreenApiError, если ответ 200 содержит status: false', async () => {
    server.use(
      http.post(`${base}/checkAccount/token123`, () =>
        HttpResponse.json({
          status: false,
          data: { status: 'fail', reason: 'rate_limit_exceeded', retryAfter: 100 },
        }),
      ),
    )

    await expect(client.checkAccount({ phoneNumber: 79991234567 })).rejects.toMatchObject({
      status: 200,
      message: 'rate_limit_exceeded',
    })
  })

  it('бросает GreenApiError со статусом 0 при сетевой ошибке', async () => {
    server.use(http.get(`${base}/getStateInstance/token123`, () => HttpResponse.error()))

    await expect(client.getStateInstance()).rejects.toMatchObject({ status: 0 })
  })

  it('пробрасывает отмену запроса как есть', async () => {
    server.use(
      http.get(`${base}/receiveNotification/token123`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return HttpResponse.json(null)
      }),
    )
    const controller = new AbortController()

    const promise = client.receiveNotification(20, controller.signal)
    controller.abort()

    const error = await promise.catch((e: unknown) => e)
    expect(error).not.toBeInstanceOf(GreenApiError)
    expect((error as Error).name).toBe('AbortError')
  })
})
