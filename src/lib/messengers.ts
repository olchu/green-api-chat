import type { TypeInstance } from '../api/types'

export type MessengerId = 'telegram' | 'max' | 'unknown'

export interface MessengerRules {
  id: MessengerId
  name: string
  maxMessageLength: number
  phone: {
    minDigits: number
    maxDigits: number
    /** Допустимые коды стран; null — любые */
    countryCodes: string[] | null
  }
  /** Поиск собеседника по @username через checkAccount */
  supportsUsername: boolean
}

export const MESSENGERS: Record<MessengerId, MessengerRules> = {
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    maxMessageLength: 4096,
    phone: { minDigits: 10, maxDigits: 15, countryCodes: null },
    supportsUsername: true,
  },
  max: {
    id: 'max',
    name: 'MAX',
    maxMessageLength: 4000,
    phone: { minDigits: 11, maxDigits: 12, countryCodes: ['7', '375'] },
    supportsUsername: false,
  },
  // Незнакомый тип инстанса: самые строгие общие ограничения
  unknown: {
    id: 'unknown',
    name: 'Мессенджер',
    maxMessageLength: 4000,
    phone: { minDigits: 10, maxDigits: 15, countryCodes: null },
    supportsUsername: false,
  },
}

const TYPE_INSTANCE_TO_MESSENGER: Record<string, MessengerId> = {
  telegram: 'telegram',
  v3: 'max',
}

export function detectMessenger(typeInstance: TypeInstance | undefined): MessengerRules {
  const id = typeInstance ? TYPE_INSTANCE_TO_MESSENGER[typeInstance.toLowerCase()] : undefined
  return MESSENGERS[id ?? 'unknown']
}
