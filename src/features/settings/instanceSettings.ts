import type { InstanceSettings, SetSettingsRequest } from '../../api/types'

/** Настройки, без которых приложение не увидит ответы собеседников */
export const REQUIRED_SETTINGS = {
  webhookUrl: '',
  incomingWebhook: 'yes',
  outgoingMessageWebhook: 'yes',
  outgoingWebhook: 'yes',
} satisfies SetSettingsRequest

export type RequiredSetting = keyof typeof REQUIRED_SETTINGS

export function findSettingsProblems(settings: InstanceSettings): RequiredSetting[] {
  return (Object.keys(REQUIRED_SETTINGS) as RequiredSetting[]).filter(
    (key) => (settings[key] ?? '') !== REQUIRED_SETTINGS[key],
  )
}
