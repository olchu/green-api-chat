import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

interface InstanceChats {
  chats: Record<string, Chat>
  messages: Record<string, Message[]>
}

interface ChatState {
  /** Данные по idInstance, чтобы чаты разных инстансов не смешивались */
  byInstance: Record<string, InstanceChats>
  activeChatId: string | null
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

type Updater = (data: InstanceChats) => InstanceChats

function updateInstance(state: ChatState, instanceId: string, update: Updater) {
  return {
    byInstance: {
      ...state.byInstance,
      [instanceId]: update(state.byInstance[instanceId] ?? EMPTY_INSTANCE),
    },
  }
}

function patchChat(data: InstanceChats, chatId: string, patch: Partial<Chat>): InstanceChats {
  const chat = data.chats[chatId]
  return chat ? { ...data, chats: { ...data.chats, [chatId]: { ...chat, ...patch } } } : data
}

function setMessages(data: InstanceChats, chatId: string, messages: Message[]): InstanceChats {
  return { ...data, messages: { ...data.messages, [chatId]: messages } }
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      byInstance: {},
      activeChatId: null,

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
        set((state) => ({
          activeChatId: chatId,
          ...(chatId &&
            updateInstance(state, instanceId, (data) => patchChat(data, chatId, { unread: 0 }))),
        })),

      addMessage: (instanceId, message) =>
        set((state) =>
          updateInstance(state, instanceId, (data) => {
            const messages = data.messages[message.chatId] ?? EMPTY_MESSAGES
            const duplicate = messages.some(
              (m) =>
                m.id === message.id || (message.idMessage && m.idMessage === message.idMessage),
            )
            if (duplicate) return data

            const withMessage = setMessages(
              data,
              message.chatId,
              [...messages, message].slice(-MAX_MESSAGES_PER_CHAT),
            )
            const isUnread = message.direction === 'in' && state.activeChatId !== message.chatId
            const unread = (data.chats[message.chatId]?.unread ?? 0) + 1
            return isUnread ? patchChat(withMessage, message.chatId, { unread }) : withMessage
          }),
        ),

      updateMessage: (instanceId, chatId, id, patch) =>
        set((state) =>
          updateInstance(state, instanceId, (data) => {
            const messages = data.messages[chatId] ?? EMPTY_MESSAGES
            return setMessages(
              data,
              chatId,
              messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
            )
          }),
        ),

      setMessageStatus: (instanceId, chatId, idMessage, status) =>
        set((state) =>
          updateInstance(state, instanceId, (data) => {
            const messages = data.messages[chatId] ?? EMPTY_MESSAGES
            return setMessages(
              data,
              chatId,
              messages.map((m) =>
                m.idMessage === idMessage && canChangeStatus(m.status ?? 'pending', status)
                  ? { ...m, status }
                  : m,
              ),
            )
          }),
        ),
    }),
    {
      name: 'green-api-chat/chats',
      partialize: ({ byInstance }) => ({ byInstance }),
    },
  ),
)

/** Чаты инстанса: сначала с последней активностью */
export function useChatList(instanceId: string): Chat[] {
  const data = useChatStore((state) => state.byInstance[instanceId] ?? EMPTY_INSTANCE)
  return useMemo(() => {
    const lastActivity = (chat: Chat) =>
      data.messages[chat.chatId]?.at(-1)?.timestamp ?? chat.createdAt
    return Object.values(data.chats).sort((a, b) => lastActivity(b) - lastActivity(a))
  }, [data])
}

export function useMessages(instanceId: string, chatId: string): Message[] {
  return useChatStore((state) => state.byInstance[instanceId]?.messages[chatId] ?? EMPTY_MESSAGES)
}
