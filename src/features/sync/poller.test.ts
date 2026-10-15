import { delay, http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGreenApiClient } from '../../api/greenApi'
import type { Notification } from '../../api/types'
import { useChatStore } from '../../store/chatStore'
import {
  apiUrl,
  testCredentials,
  testInstanceData,
  testMessage,
  testMessageNotification,
} from '../../test/fixtures'
import { server, setupMockServer } from '../../test/server'
import { CONNECTION_PROBLEM, runPoller } from './poller'
import { useSyncStore } from './syncStore'

setupMockServer()

const INSTANCE = testCredentials.idInstance
const client = createGreenApiClient(testCredentials)
const instanceData = testInstanceData
let controller: AbortController

beforeEach(() => {
  controller = new AbortController()
})
afterEach(() => controller.abort())

/** Отдаёт уведомления по очереди, затем «пустую очередь» с задержкой, как настоящий API */
function mockQueue(notifications: Notification[]) {
  const deleted: number[] = []
  server.use(
    http.get(apiUrl('receiveNotification'), async () => {
      const next = notifications.find((n) => !deleted.includes(n.receiptId))
      if (next) return HttpResponse.json(next)
      await delay(50)
      return HttpResponse.json(null)
    }),
    http.delete(`${apiUrl('deleteNotification')}/:receiptId`, ({ params }) => {
      deleted.push(Number(params.receiptId))
      return HttpResponse.json({ result: true })
    }),
    http.post(apiUrl('getContactInfo'), () => new HttpResponse(null, { status: 500 })),
  )
  return deleted
}

const incoming = (receiptId: number, text: string): Notification => ({
  receiptId,
  body: testMessageNotification({
    timestamp: 1763115112 + receiptId,
    idMessage: `in-${receiptId}`,
    senderData: {
      chatId: '555',
      chatName: 'Алексей',
      sender: '555',
      senderName: 'Алексей',
      senderPhoneNumber: 79991234567,
    },
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: text } },
  }),
})

const chatMessages = () => useChatStore.getState().byInstance[INSTANCE]?.messages['555'] ?? []

describe('runPoller', () => {
  it('принимает сообщения, создаёт чат и удаляет уведомления из очереди', async () => {
    const deleted = mockQueue([incoming(1, 'Привет'), incoming(2, 'Как дела?')])

    void runPoller(client, INSTANCE, controller.signal)

    await expect.poll(() => chatMessages().map((m) => m.text)).toEqual(['Привет', 'Как дела?'])
    expect(deleted).toEqual([1, 2])
    expect(useChatStore.getState().byInstance[INSTANCE].chats['555']).toMatchObject({
      name: 'Алексей',
      phone: '79991234567',
      unread: 2,
    })
  })

  it('обновляет статус отправленного сообщения', async () => {
    useChatStore.getState().upsertChat(INSTANCE, { chatId: '555', name: 'Алексей' })
    useChatStore
      .getState()
      .addMessage(
        INSTANCE,
        testMessage({ id: 'srv-1', chatId: '555', direction: 'out', status: 'sent' }),
      )
    mockQueue([
      {
        receiptId: 7,
        body: {
          typeWebhook: 'outgoingMessageStatus',
          instanceData,
          timestamp: 1,
          chatId: '555',
          idMessage: 'srv-1',
          status: 'read',
        },
      },
    ])

    void runPoller(client, INSTANCE, controller.signal)

    await expect.poll(() => chatMessages()[0]?.status).toBe('read')
  })

  it('при ошибке сети показывает проблему и восстанавливается', async () => {
    let failures = 1
    const deleted = mockQueue([incoming(1, 'После сбоя')])
    server.use(
      http.get(apiUrl('receiveNotification'), () => {
        if (failures-- > 0) return HttpResponse.error()
        return undefined
      }),
    )

    void runPoller(client, INSTANCE, controller.signal)

    await expect.poll(() => useSyncStore.getState().problems.connection).toBe(CONNECTION_PROBLEM)
    await expect.poll(() => deleted, { timeout: 3000 }).toEqual([1])
    expect(useSyncStore.getState().problems.connection).toBeUndefined()
  })

  it('удаляет уведомление, даже если его не удалось обработать', async () => {
    const broken = { receiptId: 9, body: { typeWebhook: 'incomingMessageReceived' } }
    const deleted = mockQueue([broken as unknown as Notification, incoming(10, 'Дальше')])
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    void runPoller(client, INSTANCE, controller.signal)

    await expect.poll(() => deleted).toEqual([9, 10])
    expect(chatMessages().map((m) => m.text)).toEqual(['Дальше'])
    consoleError.mockRestore()
  })

  it('останавливается после отмены', async () => {
    mockQueue([])
    const running = runPoller(client, INSTANCE, controller.signal)

    controller.abort()

    await expect(running).resolves.toBeUndefined()
  })
})
