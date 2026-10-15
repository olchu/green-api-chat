import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  chatStorage,
  MAX_MESSAGES_PER_CHAT,
  useChatList,
  useChatStore,
  useMessages,
  type Message,
} from './chatStore'
import { testCredentials, testMessage } from '../test/fixtures'

const INSTANCE = testCredentials.idInstance
const store = () => useChatStore.getState()
const chat = (instanceId = INSTANCE) => store().byInstance[instanceId]?.chats['100']
const messages = (instanceId = INSTANCE) => store().byInstance[instanceId]?.messages['100'] ?? []

const message = (overrides: Partial<Message> = {}) =>
  testMessage({ chatId: '100', timestamp: 1000, ...overrides })

beforeEach(() => {
  store().upsertChat(INSTANCE, { chatId: '100', name: 'Анна', phone: '79991234567' })
})

describe('chatStore', () => {
  it('upsertChat дополняет чат, не сбрасывая непрочитанные', () => {
    store().addMessage(INSTANCE, message())
    store().upsertChat(INSTANCE, { chatId: '100', name: 'Анна', username: '@anna' })

    expect(chat()).toMatchObject({ username: '@anna', phone: '79991234567', unread: 1 })
  })

  it('addMessage пропускает дубли по id и idMessage', () => {
    store().addMessage(INSTANCE, message())
    store().addMessage(INSTANCE, message())
    store().addMessage(INSTANCE, message({ id: 'local-1', idMessage: 'm1' }))

    expect(messages()).toHaveLength(1)
  })

  it('входящее в открытый чат не увеличивает непрочитанные', () => {
    store().openChat(INSTANCE, '100')
    store().addMessage(INSTANCE, message())
    store().addMessage(INSTANCE, message({ id: 'm2', idMessage: 'm2', direction: 'out' }))

    expect(chat()?.unread).toBe(0)
  })

  it('openChat сбрасывает непрочитанные', () => {
    store().addMessage(INSTANCE, message())
    store().addMessage(INSTANCE, message({ id: 'm2', idMessage: 'm2' }))
    expect(chat()?.unread).toBe(2)

    store().openChat(INSTANCE, '100')

    expect(chat()?.unread).toBe(0)
    expect(store().active).toEqual({ instanceId: INSTANCE, chatId: '100' })
  })

  it('updateMessage меняет сообщение по локальному id', () => {
    store().addMessage(
      INSTANCE,
      message({ id: 'local-1', idMessage: undefined, status: 'pending' }),
    )

    store().updateMessage(INSTANCE, '100', 'local-1', { idMessage: 'srv-1', status: 'sent' })

    expect(messages()[0]).toMatchObject({ idMessage: 'srv-1', status: 'sent' })
  })

  it('setMessageStatus не откатывает статус назад', () => {
    store().addMessage(INSTANCE, message({ direction: 'out', status: 'sent' }))

    store().setMessageStatus(INSTANCE, '100', 'm1', 'read')
    store().setMessageStatus(INSTANCE, '100', 'm1', 'delivered')
    store().setMessageStatus(INSTANCE, '100', 'm1', 'failed')

    expect(messages()[0].status).toBe('read')
  })

  it('setMessageStatus ставит ошибку недоставленному сообщению', () => {
    store().addMessage(INSTANCE, message({ direction: 'out', status: 'sent' }))

    store().setMessageStatus(INSTANCE, '100', 'm1', 'failed')

    expect(messages()[0].status).toBe('failed')
  })

  it('хранит не больше MAX_MESSAGES_PER_CHAT сообщений', () => {
    for (let i = 0; i <= MAX_MESSAGES_PER_CHAT; i++) {
      store().addMessage(INSTANCE, message({ id: `m${i}`, idMessage: `m${i}`, timestamp: i }))
    }

    expect(messages()).toHaveLength(MAX_MESSAGES_PER_CHAT)
    expect(messages()[0].id).toBe('m1')
  })

  it('чаты разных инстансов не смешиваются', () => {
    store().addMessage('другой', message())

    expect(messages()).toHaveLength(0)
    expect(messages('другой')).toHaveLength(1)
  })

  it('сохраняет чаты в localStorage без открытого чата', () => {
    store().openChat(INSTANCE, '100')
    chatStorage.flush()

    const saved = JSON.parse(localStorage.getItem(useChatStore.persist.getOptions().name!)!)
    expect(saved.state.byInstance[INSTANCE].chats['100'].name).toBe('Анна')
    expect(saved.state.active).toBeUndefined()
  })
})

describe('useChatList', () => {
  it('сортирует чаты по последней активности', () => {
    store().upsertChat(INSTANCE, { chatId: '200', name: 'Борис' })
    store().addMessage(INSTANCE, message({ timestamp: Date.now() + 1000 }))

    const { result } = renderHook(() => useChatList(INSTANCE))

    expect(result.current.map((entry) => entry.chat.chatId)).toEqual(['100', '200'])
  })

  it('возвращает тот же массив, пока данные не менялись', () => {
    const { result, rerender } = renderHook(() => useChatList(INSTANCE))
    const first = result.current

    rerender()

    expect(result.current).toBe(first)
  })
})

describe('useMessages', () => {
  it('возвращает стабильный пустой массив для чата без сообщений', () => {
    const { result, rerender } = renderHook(() => useMessages(INSTANCE, 'нет'))
    const first = result.current

    rerender()

    expect(result.current).toBe(first)
    expect(first).toEqual([])
  })
})

describe('изменения без эффекта', () => {
  it('не меняют состояние', () => {
    store().addMessage(INSTANCE, message({ direction: 'out', status: 'read' }))
    const before = store()

    store().setMessageStatus(INSTANCE, '100', 'm1', 'delivered')
    store().addMessage(INSTANCE, message({ direction: 'out', status: 'read' }))
    store().updateMessage(INSTANCE, '100', 'нет', { text: 'x' })
    store().upsertChat(INSTANCE, { chatId: '100', name: 'Анна', phone: '79991234567' })

    expect(store()).toBe(before)
  })
})

describe('открытый чат', () => {
  it('привязан к инстансу', () => {
    store().openChat(INSTANCE, '100')
    store().upsertChat('другой', { chatId: '100', name: 'Тёзка' })

    store().addMessage('другой', message())

    expect(store().byInstance['другой'].chats['100'].unread).toBe(1)
  })
})

describe('обновление данных чата', () => {
  it('upsertChat не меняет имя существующего чата, но дополняет данные', () => {
    store().upsertChat(INSTANCE, { chatId: '100', name: '+7 999 123-45-67', username: '@anna' })

    expect(chat()).toMatchObject({ name: 'Анна', username: '@anna' })
  })

  it('upsertChat не затирает известные поля пустыми', () => {
    store().upsertChat(INSTANCE, { chatId: '100', name: 'Анна', username: undefined })

    expect(chat()).toMatchObject({ name: 'Анна', phone: '79991234567' })
  })

  it('updateChat дополняет чат данными контакта', () => {
    store().updateChat(INSTANCE, '100', {
      name: 'Анна Смирнова',
      avatar: 'https://example.com/a.jpg',
      phone: undefined,
      infoLoaded: true,
    })

    expect(chat()).toMatchObject({
      name: 'Анна Смирнова',
      avatar: 'https://example.com/a.jpg',
      phone: '79991234567',
      infoLoaded: true,
    })
  })
})

describe('отправленные сообщения', () => {
  const local = () =>
    message({ id: 'local-1', idMessage: undefined, direction: 'out', status: 'pending' })

  it('эхо из уведомления склеивается с локальным сообщением без idMessage', () => {
    store().addMessage(INSTANCE, local())

    store().addMessage(INSTANCE, message({ id: 'srv-1', idMessage: 'srv-1', direction: 'out' }))
    store().resolveMessage(INSTANCE, '100', 'local-1', { status: 'sent', idMessage: 'srv-1' })

    expect(messages()).toHaveLength(1)
    expect(messages()[0]).toMatchObject({ id: 'local-1', idMessage: 'srv-1', status: 'sent' })
  })

  it('чужое сообщение с тем же текстом с телефона не склеивается с уже отправленным', () => {
    store().addMessage(INSTANCE, { ...local(), idMessage: 'srv-1', status: 'sent' })

    store().addMessage(INSTANCE, message({ id: 'srv-2', idMessage: 'srv-2', direction: 'out' }))

    expect(messages()).toHaveLength(2)
  })

  it('ответ sendMessage не откатывает статус, пришедший раньше из уведомления', () => {
    store().addMessage(INSTANCE, local())
    store().addMessage(
      INSTANCE,
      message({ id: 'srv-1', idMessage: 'srv-1', direction: 'out', status: 'delivered' }),
    )

    store().resolveMessage(INSTANCE, '100', 'local-1', { status: 'sent', idMessage: 'srv-1' })

    expect(messages()[0].status).toBe('delivered')
  })
})

describe('статусы по всему чату', () => {
  function seedOutgoing() {
    store().addMessage(
      INSTANCE,
      message({ id: 'a', text: 'a', idMessage: 'a', direction: 'out', status: 'sent' }),
    )
    store().addMessage(
      INSTANCE,
      message({ id: 'b', text: 'b', idMessage: 'b', direction: 'out', status: 'delivered' }),
    )
    store().addMessage(
      INSTANCE,
      message({ id: 'p', text: 'p', idMessage: undefined, direction: 'out', status: 'pending' }),
    )
    store().addMessage(
      INSTANCE,
      message({ id: 'f', text: 'f', idMessage: 'f', direction: 'out', status: 'failed' }),
    )
    store().addMessage(
      INSTANCE,
      message({ id: 'c', text: 'c', idMessage: 'c', direction: 'out', status: 'sent' }),
    )
    store().addMessage(
      INSTANCE,
      message({ id: 'd', text: 'd', idMessage: 'd', direction: 'out', status: 'sent' }),
    )
  }
  const statuses = () => Object.fromEntries(messages().map((m) => [m.id, m.status]))

  it('«прочитано» последнего сообщения отмечает и все более ранние отправленные', () => {
    seedOutgoing()

    store().setMessageStatus(INSTANCE, '100', 'c', 'read')

    expect(statuses()).toEqual({
      a: 'read',
      b: 'read',
      p: 'pending',
      f: 'failed',
      c: 'read',
      d: 'sent',
    })
  })

  it('ошибка доставки относится только к одному сообщению', () => {
    seedOutgoing()

    store().setMessageStatus(INSTANCE, '100', 'c', 'failed')

    expect(statuses()).toMatchObject({ a: 'sent', b: 'delivered', c: 'failed', d: 'sent' })
  })
})
