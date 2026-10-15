import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createThrottledStorage } from './throttledStorage'

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface Message {
  /** Локальный id; для полученных с сервера совпадает с idMessage */
  id: string
  idMessage?: string
  chatId: string
  text: string
  /** Время в миллисекундах */
  timestamp: number
  direction: 'in' | 'out'
  /** Только для исходящих */
  status?: MessageStatus
}

export interface Chat {
  chatId: string
  name: string
  phone?: string
  username?: string
  /** Ссылка на фото профиля */
  avatar?: string
  /** Данные контакта уже загружены через getContactInfo */
  infoLoaded?: boolean
  unread: number
  createdAt: number
}

export type NewChat = Pick<Chat, 'chatId' | 'name' | 'phone' | 'username' | 'avatar'>

export interface ChatListEntry {
  chat: Chat
  lastMessage?: Message
}

interface InstanceChats {
  chats: Record<string, Chat>
  messages: Record<string, Message[]>
}

interface ActiveChat {
  instanceId: string
  chatId: string
}

interface ChatState {
  /** Данные по idInstance, чтобы чаты разных инстансов не смешивались */
  byInstance: Record<string, InstanceChats>
  /** Открытый чат вместе с инстансом: после смены инстанса он просто не совпадёт */
  active: ActiveChat | null
  /** Создаёт чат или дополняет его; имя уже существующего чата не меняет */
  upsertChat: (instanceId: string, chat: NewChat) => void
  /** Дополняет существующий чат, в том числе именем из профиля */
  updateChat: (instanceId: string, chatId: string, patch: Partial<Chat>) => void
  openChat: (instanceId: string, chatId: string | null) => void
  addMessage: (instanceId: string, message: Message) => void
  updateMessage: (instanceId: string, chatId: string, id: string, patch: Partial<Message>) => void
  /** Итог отправки локального сообщения; статус не откатывается назад */
  resolveMessage: (
    instanceId: string,
    chatId: string,
    id: string,
    result: { status: MessageStatus; idMessage?: string },
  ) => void
  setMessageStatus: (
    instanceId: string,
    chatId: string,
    idMessage: string,
    status: MessageStatus,
  ) => void
}

export const MAX_MESSAGES_PER_CHAT = 500

const EMPTY_INSTANCE: InstanceChats = { chats: {}, messages: {} }
const EMPTY_MESSAGES: Message[] = []

const STATUS_RANK: Record<MessageStatus, number> = {
  failed: 0,
  pending: 1,
  sent: 2,
  delivered: 3,
  read: 4,
}

/** Статус не откатывается назад, если уведомления пришли не по порядку */
function canChangeStatus(from: MessageStatus, to: MessageStatus): boolean {
  if (to === 'failed') return STATUS_RANK[from] < STATUS_RANK.delivered
  return STATUS_RANK[to] > STATUS_RANK[from]
}

/** Новый статус, если его можно поставить поверх текущего, иначе текущий */
function raiseStatus(
  current: MessageStatus | undefined,
  next: MessageStatus,
): MessageStatus | undefined {
  return canChangeStatus(current ?? 'pending', next) ? next : current
}

const isActive = (active: ActiveChat | null, instanceId: string, chatId: string) =>
  active?.instanceId === instanceId && active.chatId === chatId

/** Возвращает state без изменений, если update вернул те же данные — подписчики не дёргаются */
function updateInstance(
  state: ChatState,
  instanceId: string,
  update: (data: InstanceChats) => InstanceChats,
): Partial<ChatState> {
  const data = state.byInstance[instanceId] ?? EMPTY_INSTANCE
  const next = update(data)
  return next === data ? state : { byInstance: { ...state.byInstance, [instanceId]: next } }
}

/** Пропущенные поля не должны затирать уже известные данные */
function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, field]) => field !== undefined),
  ) as Partial<T>
}

function patchChat(
  data: InstanceChats,
  chatId: string,
  patch: (chat: Chat) => Partial<Chat>,
): InstanceChats {
  const chat = data.chats[chatId]
  if (!chat) return data
  const changes = patch(chat)
  const unchanged = Object.entries(changes).every(
    ([key, value]) => chat[key as keyof Chat] === value,
  )
  // Без изменений — прежние данные: нет перерисовок и записи в хранилище
  if (unchanged) return data
  return { ...data, chats: { ...data.chats, [chatId]: { ...chat, ...changes } } }
}

/** Меняет одно сообщение; если patch вернул null — данные остаются прежними */
function patchMessage(
  data: InstanceChats,
  chatId: string,
  matches: (message: Message) => boolean,
  patch: (message: Message) => Partial<Message> | null,
): InstanceChats {
  const messages = data.messages[chatId] ?? EMPTY_MESSAGES
  const index = messages.findIndex(matches)
  const changes = index === -1 ? null : patch(messages[index])
  if (!changes) return data

  const next = messages.slice()
  next[index] = { ...messages[index], ...changes }
  return { ...data, messages: { ...data.messages, [chatId]: next } }
}

/**
 * «Доставлено» и «прочитано» в Telegram и MAX относятся ко всему чату до этого сообщения,
 * и GREEN-API присылает статус только для последнего — поднимаем статус и у более ранних
 * отправленных. Ошибка доставки относится только к одному сообщению.
 */
function applyStatus(
  data: InstanceChats,
  chatId: string,
  idMessage: string,
  status: MessageStatus,
): InstanceChats {
  const messages = data.messages[chatId] ?? EMPTY_MESSAGES
  const index = messages.findIndex((m) => m.idMessage === idMessage)
  if (index === -1) return data

  let next: Message[] | undefined
  const first = status === 'failed' ? index : 0
  for (let i = index; i >= first; i--) {
    const message = messages[i]
    const earlierSent =
      message.direction === 'out' && (message.status === 'sent' || message.status === 'delivered')
    if (i !== index && !earlierSent) continue

    const raised = raiseStatus(message.status, status)
    if (raised === message.status) continue
    next ??= messages.slice()
    next[i] = { ...message, status: raised }
  }
  return next ? { ...data, messages: { ...data.messages, [chatId]: next } } : data
}

export const chatStorage = createThrottledStorage<Pick<ChatState, 'byInstance'>>()

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      byInstance: {},
      active: null,

      upsertChat: (instanceId, chat) =>
        set((state) =>
          updateInstance(state, instanceId, (data) => {
            if (data.chats[chat.chatId]) {
              // Имя приходит из разных источников (номер, отправитель, профиль) —
              // единственный, кто может его заменить, это updateChat с данными профиля
              const { name: _name, ...rest } = chat
              return patchChat(data, chat.chatId, () => withoutUndefined(rest))
            }
            const created: Chat = { ...chat, unread: 0, createdAt: Date.now() }
            return { ...data, chats: { ...data.chats, [chat.chatId]: created } }
          }),
        ),

      updateChat: (instanceId, chatId, patch) =>
        set((state) =>
          updateInstance(state, instanceId, (data) =>
            patchChat(data, chatId, () => withoutUndefined(patch)),
          ),
        ),

      openChat: (instanceId, chatId) =>
        set((state) =>
          chatId
            ? {
                ...updateInstance(state, instanceId, (data) =>
                  data.chats[chatId]?.unread
                    ? patchChat(data, chatId, () => ({ unread: 0 }))
                    : data,
                ),
                active: { instanceId, chatId },
              }
            : { active: null },
        ),

      addMessage: (instanceId, message) =>
        set((state) =>
          updateInstance(state, instanceId, (data) => {
            const { chatId } = message
            const messages = data.messages[chatId] ?? EMPTY_MESSAGES
            const duplicate = messages.some(
              (m) =>
                m.id === message.id || (message.idMessage && m.idMessage === message.idMessage),
            )
            if (duplicate) return data

            // Эхо нашего же сообщения из уведомления может прийти раньше ответа sendMessage:
            // тогда у локального сообщения ещё нет idMessage — склеиваем по тексту
            if (message.direction === 'out' && message.idMessage) {
              const echoed = patchMessage(
                data,
                chatId,
                (m) =>
                  m.direction === 'out' &&
                  !m.idMessage &&
                  m.text === message.text &&
                  (m.status === 'pending' || m.status === 'failed'),
                (m) => ({
                  idMessage: message.idMessage,
                  status: raiseStatus(m.status, message.status ?? 'sent'),
                }),
              )
              if (echoed !== data) return echoed
            }

            const next = {
              ...data,
              messages: {
                ...data.messages,
                [chatId]: [...messages, message].slice(-MAX_MESSAGES_PER_CHAT),
              },
            }
            if (message.direction === 'out' || isActive(state.active, instanceId, chatId)) {
              return next
            }
            return patchChat(next, chatId, (chat) => ({ unread: chat.unread + 1 }))
          }),
        ),

      updateMessage: (instanceId, chatId, id, patch) =>
        set((state) =>
          updateInstance(state, instanceId, (data) =>
            patchMessage(
              data,
              chatId,
              (m) => m.id === id,
              () => patch,
            ),
          ),
        ),

      resolveMessage: (instanceId, chatId, id, { status, idMessage }) =>
        set((state) =>
          updateInstance(state, instanceId, (data) =>
            patchMessage(
              data,
              chatId,
              (m) => m.id === id,
              (m) => ({
                idMessage: m.idMessage ?? idMessage,
                status: raiseStatus(m.status, status),
              }),
            ),
          ),
        ),

      setMessageStatus: (instanceId, chatId, idMessage, status) =>
        set((state) =>
          updateInstance(state, instanceId, (data) => applyStatus(data, chatId, idMessage, status)),
        ),
    }),
    {
      name: 'green-api-chat/chats',
      storage: chatStorage,
      partialize: ({ byInstance }) => ({ byInstance }),
    },
  ),
)

/** Чаты инстанса с последним сообщением: сначала с последней активностью */
export function useChatList(instanceId: string): ChatListEntry[] {
  const data = useChatStore((state) => state.byInstance[instanceId] ?? EMPTY_INSTANCE)
  return useMemo(() => {
    const entries = Object.values(data.chats).map((chat) => ({
      chat,
      lastMessage: data.messages[chat.chatId]?.at(-1),
    }))
    const lastActivity = ({ chat, lastMessage }: ChatListEntry) =>
      lastMessage?.timestamp ?? chat.createdAt
    return entries.sort((a, b) => lastActivity(b) - lastActivity(a))
  }, [data])
}

export function useMessages(instanceId: string, chatId: string): Message[] {
  return useChatStore((state) => state.byInstance[instanceId]?.messages[chatId] ?? EMPTY_MESSAGES)
}

/** Открытый чат текущего инстанса */
export function useActiveChat(instanceId: string): Chat | undefined {
  return useChatStore((state) =>
    state.active?.instanceId === instanceId
      ? state.byInstance[instanceId]?.chats[state.active.chatId]
      : undefined,
  )
}

/** chatId открытого чата текущего инстанса */
export function useActiveChatId(instanceId: string): string | null {
  return useChatStore((state) =>
    state.active?.instanceId === instanceId ? state.active.chatId : null,
  )
}
