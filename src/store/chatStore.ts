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
  unread: number
  createdAt: number
}

export type NewChat = Pick<Chat, 'chatId' | 'name' | 'phone' | 'username'>

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
  upsertChat: (instanceId: string, chat: NewChat) => void
  openChat: (instanceId: string, chatId: string | null) => void
  addMessage: (instanceId: string, message: Message) => void
  updateMessage: (instanceId: string, chatId: string, id: string, patch: Partial<Message>) => void
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

function patchChat(
  data: InstanceChats,
  chatId: string,
  patch: (chat: Chat) => Partial<Chat>,
): InstanceChats {
  const chat = data.chats[chatId]
  if (!chat) return data
  return { ...data, chats: { ...data.chats, [chatId]: { ...chat, ...patch(chat) } } }
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

export const chatStorage = createThrottledStorage<Pick<ChatState, 'byInstance'>>()

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      byInstance: {},
      active: null,

      upsertChat: (instanceId, chat) =>
        set((state) =>
          updateInstance(state, instanceId, (data) => {
            const existing = data.chats[chat.chatId]
            const next: Chat = existing
              ? { ...existing, ...chat }
              : { ...chat, unread: 0, createdAt: Date.now() }
            return { ...data, chats: { ...data.chats, [chat.chatId]: next } }
          }),
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

      setMessageStatus: (instanceId, chatId, idMessage, status) =>
        set((state) =>
          updateInstance(state, instanceId, (data) =>
            patchMessage(
              data,
              chatId,
              (m) => m.idMessage === idMessage,
              (m) => (canChangeStatus(m.status ?? 'pending', status) ? { status } : null),
            ),
          ),
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

/** chatId открытого чата текущего инстанса */
export function useActiveChatId(instanceId: string): string | null {
  return useChatStore((state) =>
    state.active?.instanceId === instanceId ? state.active.chatId : null,
  )
}
