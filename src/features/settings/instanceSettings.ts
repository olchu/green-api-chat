import type { InstanceSettings, SetSettingsRequest } from '../../api/types'

/** Настройки, без которых приложение не увидит ответы собеседников */
export const REQUIRED_SETTINGS = {
  webhookUrl: '',
  incomingWebhook: 'yes',
  outgoingMessageWebhook: 'yes',
  outgoingWebhook: 'yes',
} satisfies SetSettingsRequest

const PROBLEM_TEXT: Record<keyof typeof REQUIRED_SETTINGS, string> = {
  webhookUrl: 'Задан webhookUrl — уведомления уходят на него, а не в приложение',
  incomingWebhook: 'Выключены уведомления о входящих сообщениях',
  outgoingMessageWebhook: 'Выключены уведомления о сообщениях, отправленных с телефона',
  outgoingWebhook: 'Выключены статусы доставки сообщений',
}

export function findSettingsProblems(settings: InstanceSettings): string[] {
  return (Object.keys(REQUIRED_SETTINGS) as (keyof typeof REQUIRED_SETTINGS)[])
    .filter((key) => (settings[key] ?? '') !== REQUIRED_SETTINGS[key])
    .map((key) => PROBLEM_TEXT[key])
}
