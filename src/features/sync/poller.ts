import type { GreenApiClient } from '../../api/greenApi'
import { describeInstanceState } from '../../api/instanceState'
import { useChatStore } from '../../store/chatStore'
import { ensureContactInfo } from '../chats/contactInfo'
import { parseNotification, type SyncEvent } from './notifications'
import { useSyncStore } from './syncStore'

/** Сколько секунд GREEN-API держит запрос, ожидая уведомление (допустимо 5–60) */
export const RECEIVE_TIMEOUT = 20
export const CONNECTION_PROBLEM = 'Нет соединения с GREEN-API, переподключаемся…'
const MIN_RETRY_DELAY = 1000
const MAX_RETRY_DELAY = 30_000

/** Применяет событие из уведомления к данным приложения */
export function applyEvent(client: GreenApiClient, instanceId: string, event: SyncEvent) {
  const chats = useChatStore.getState()
  switch (event.type) {
    case 'message':
      chats.upsertChat(instanceId, event.chat)
      chats.addMessage(instanceId, event.message)
      void ensureContactInfo(client, instanceId, event.chat.chatId)
      break
    case 'status':
      chats.setMessageStatus(instanceId, event.chatId, event.idMessage, event.status)
      break
    case 'state':
      useSyncStore.getState().setProblem('state', describeInstanceState(event.stateInstance))
      break
    case 'quota':
      useSyncStore
        .getState()
        .setProblem('quota', event.description || 'Превышен лимит тарифа GREEN-API')
      break
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}

/**
 * Забирает уведомления из очереди инстанса, пока не отменён signal.
 * Уведомление удаляется только после обработки: если удаление не удалось,
 * оно придёт снова, а хранилище отбросит дубль по idMessage.
 */
export async function runPoller(
  client: GreenApiClient,
  instanceId: string,
  signal: AbortSignal,
  receiveTimeout = RECEIVE_TIMEOUT,
): Promise<void> {
  const { setProblem } = useSyncStore.getState()
  let retryDelay = MIN_RETRY_DELAY

  while (!signal.aborted) {
    try {
      const notification = await client.receiveNotification(receiveTimeout, signal)
      if (notification) {
        try {
          applyEvent(client, instanceId, parseNotification(notification.body))
        } catch (error) {
          // Непонятное уведомление не должно застрять в очереди навсегда
          console.error('Не удалось обработать уведомление', notification, error)
        }
        await client.deleteNotification(notification.receiptId, signal)
      }
      setProblem('connection', null)
      retryDelay = MIN_RETRY_DELAY
    } catch {
      if (signal.aborted) return
      setProblem('connection', CONNECTION_PROBLEM)
      await sleep(retryDelay, signal)
      retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY)
    }
  }
}
