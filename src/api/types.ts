// Типы GREEN-API, общие для Telegram и MAX.
// Поля, которые есть только у одного мессенджера, отмечены как необязательные.

export interface Credentials {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export type YesNo = 'yes' | 'no'

/** `telegram`, `v3` (MAX) или `whatsapp` */
export type TypeInstance = string

export type StateInstance =
  'notAuthorized' | 'authorized' | 'blocked' | 'starting' | 'suspended' | 'pendingPassword'

export interface GetStateInstanceResponse {
  stateInstance: StateInstance
}

export interface InstanceSettings {
  wid: string
  typeInstance: TypeInstance
  webhookUrl: string
  webhookUrlToken: string
  delaySendMessagesMilliseconds: number
  markIncomingMessagesReaded: YesNo
  markIncomingMessagesReadedOnReply: YesNo
  outgoingWebhook: YesNo
  outgoingMessageWebhook: YesNo
  outgoingAPIMessageWebhook: YesNo
  incomingWebhook: YesNo
  stateWebhook: YesNo
  keepOnlineStatus: YesNo
}

export type SetSettingsRequest = Partial<Omit<InstanceSettings, 'wid' | 'typeInstance'>>

export interface SetSettingsResponse {
  saveSettings: boolean
}

export interface AccountSettings {
  stateInstance: StateInstance
  phone: string
  chatId: string
  avatar: string
}

export type CheckAccountRequest =
  { phoneNumber: number; force?: boolean } | { username: string; force?: boolean }

export interface CheckAccountResponse {
  exist: boolean
  chatId: string
  fromCache?: boolean
  /** Только Telegram */
  username?: string
  /** Только Telegram */
  phoneNumber?: number
}

export interface GetContactInfoResponse {
  chatId: string
  /** Имя из профиля мессенджера */
  name: string
  /** Имя из записной книжки, если контакт сохранён */
  contactName: string
  /** Пусто, если фото нет или скрыто настройками приватности */
  avatar: string
  chatType?: ChatType
  /** 0, если номер скрыт */
  phoneNumber?: number
  /** Только Telegram */
  username?: string
}

export interface SendMessageRequest {
  chatId: string
  message: string
  quotedMessageId?: string
}

export interface SendMessageResponse {
  idMessage: string
}

export interface DeleteNotificationResponse {
  result: boolean
}

// Уведомления

export interface InstanceData {
  idInstance: number
  wid: string
  typeInstance: TypeInstance
}

export type ChatType = 'user' | 'group' | 'supergroup' | 'channel' | 'bot'

export interface SenderData {
  chatId: string
  chatName: string
  sender: string
  senderName: string
  senderContactName?: string
  /** 0, если номер скрыт */
  senderPhoneNumber?: number
  chatType?: ChatType
  senderType?: ChatType
}

export interface TextMessageData {
  typeMessage: 'textMessage'
  textMessageData: {
    textMessage: string
  }
}

export interface ExtendedTextMessageData {
  typeMessage: 'extendedTextMessage'
  extendedTextMessageData: {
    text: string
    description?: string
    title?: string
  }
}

/** Остальные типы сообщений (фото, стикеры и т.д.) интерфейс не отображает */
export interface OtherMessageData {
  typeMessage:
    | 'quotedMessage'
    | 'imageMessage'
    | 'videoMessage'
    | 'documentMessage'
    | 'audioMessage'
    | 'locationMessage'
    | 'contactMessage'
    | 'pollMessage'
    | 'reactionMessage'
    | 'stickerMessage'
    | 'editedMessage'
    | 'deletedMessage'
}

export type MessageData = TextMessageData | ExtendedTextMessageData | OtherMessageData

export interface MessageNotification {
  /**
   * incomingMessageReceived — входящее,
   * outgoingMessageReceived — отправлено с телефона или другого клиента,
   * outgoingAPIMessageReceived — отправлено через API
   */
  typeWebhook: 'incomingMessageReceived' | 'outgoingMessageReceived' | 'outgoingAPIMessageReceived'
  instanceData: InstanceData
  timestamp: number
  idMessage: string
  senderData: SenderData
  messageData: MessageData
}

export type OutgoingMessageStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'noAccount'

export interface OutgoingMessageStatusNotification {
  typeWebhook: 'outgoingMessageStatus'
  instanceData: InstanceData
  timestamp: number
  chatId: string
  idMessage: string
  status: OutgoingMessageStatus
  description?: string
}

export interface StateInstanceChangedNotification {
  typeWebhook: 'stateInstanceChanged'
  instanceData: InstanceData
  timestamp: number
  stateInstance: StateInstance
}

/** Превышены лимиты тарифа Developer */
export interface QuotaExceededNotification {
  typeWebhook: 'quotaExceeded'
  instanceData: InstanceData
  timestamp?: number
  quotaData: {
    method: string
    used: number | string
    total: number | string
    status: string
    description: string
  }
}

export type NotificationBody =
  | MessageNotification
  | OutgoingMessageStatusNotification
  | StateInstanceChangedNotification
  | QuotaExceededNotification

export interface Notification {
  receiptId: number
  body: NotificationBody
}

/** Пустая очередь возвращает null */
export type ReceiveNotificationResponse = Notification | null
