import type {
  MessageData,
  MessageNotification,
  NotificationBody,
  SenderData,
  StateInstance,
} from '../../api/types'
import type { Message, MessageStatus, NewChat } from '../../store/chatStore'

export type SyncEvent =
  | { type: 'message'; chat: NewChat; message: Message }
  | { type: 'status'; chatId: string; idMessage: string; status: MessageStatus }
  | { type: 'state'; stateInstance: StateInstance }
  | { type: 'quota'; description: string }
  | { type: 'ignored' }

const IGNORED: SyncEvent = { type: 'ignored' }

/** Нетекстовые сообщения показываем заглушкой, чтобы они не пропадали молча */
const PLACEHOLDERS: Partial<Record<MessageData['typeMessage'], string>> = {
  imageMessage: '[Фото]',
  videoMessage: '[Видео]',
  documentMessage: '[Документ]',
  audioMessage: '[Аудио]',
  stickerMessage: '[Стикер]',
  locationMessage: '[Геолокация]',
  contactMessage: '[Контакт]',
  pollMessage: '[Опрос]',
}

/** Текст сообщения; null — тип, который в ленте не показывается (реакции, правки, удаления) */
export function getMessageText(data: MessageData): string | null {
  if (data.typeMessage === 'textMessage') return data.textMessageData.textMessage
  // У extendedTextMessage и ответа с цитатой (quotedMessage) текст лежит в одном месте
  if ('extendedTextMessageData' in data) return data.extendedTextMessageData.text
  return PLACEHOLDERS[data.typeMessage] ?? null
}

/** Приложение работает только с личными чатами: у групп и каналов chatId отрицательный */
function isPersonalChat(sender: SenderData): boolean {
  if (sender.chatType && sender.chatType !== 'user' && sender.chatType !== 'bot') return false
  return !sender.chatId.startsWith('-') && !sender.chatId.endsWith('@g.us')
}

function toMessageEvent(body: MessageNotification): SyncEvent {
  const { senderData: sender } = body
  const text = getMessageText(body.messageData)
  if (text === null || !isPersonalChat(sender)) return IGNORED

  const incoming = body.typeWebhook === 'incomingMessageReceived'
  // Во входящем имя собеседника — отправитель, в исходящем — сам чат
  const name = incoming
    ? sender.senderContactName || sender.senderName || sender.chatName
    : sender.chatName
  const phone = incoming && sender.senderPhoneNumber ? String(sender.senderPhoneNumber) : undefined

  return {
    type: 'message',
    chat: { chatId: sender.chatId, name: name || sender.chatId, phone },
    message: {
      id: body.idMessage,
      idMessage: body.idMessage,
      chatId: sender.chatId,
      text,
      timestamp: body.timestamp * 1000,
      direction: incoming ? 'in' : 'out',
      status: incoming ? undefined : 'sent',
    },
  }
}

/** Переводит уведомление GREEN-API в событие для приложения */
export function parseNotification(body: NotificationBody): SyncEvent {
  switch (body.typeWebhook) {
    case 'incomingMessageReceived':
    case 'outgoingMessageReceived':
    case 'outgoingAPIMessageReceived':
      return toMessageEvent(body)
    case 'outgoingMessageStatus':
      return {
        type: 'status',
        chatId: body.chatId,
        idMessage: body.idMessage,
        status: body.status === 'noAccount' ? 'failed' : body.status,
      }
    case 'stateInstanceChanged':
      return { type: 'state', stateInstance: body.stateInstance }
    case 'quotaExceeded':
      return { type: 'quota', description: body.quotaData.description }
    default:
      // Незнакомые типы уведомлений из будущих версий API
      return IGNORED
  }
}
