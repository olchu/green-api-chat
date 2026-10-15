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
import { testCredentials } from '../test/fixtures'

const INSTANCE = testCredentials.idInstance
const store = () => useChatStore.getState()
const chat = (instanceId = INSTANCE) => store().byInstance[instanceId]?.chats['100']
const messages = (instanceId = INSTANCE) => store().byInstance[instanceId]?.messages['100'] ?? []

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    idMessage: 'm1',
    chatId: '100',
    text: 'Привет',
    timestamp: 1000,
    direction: 'in',
    ...overrides,
  }
}

beforeEach(() => {
  store().upsertChat(INSTANCE, { chatId: '100', name: 'Анна', phone: '79991234567' })
})

describe('chatStore', () => {
  it('upsertChat обновляет данные чата, не сбрасывая непрочитанные', () => {
    store().addMessage(INSTANCE, message())
    store().upsertChat(INSTANCE, { chatId: '100', name: 'Анна Иванова' })

    expect(chat()).toMatchObject({ name: 'Анна Иванова', phone: '79991234567', unread: 1 })
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
