// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { InstanceSettings } from '../../api/types'
import { findSettingsProblems } from './instanceSettings'

const okSettings = {
  webhookUrl: '',
  incomingWebhook: 'yes',
  outgoingMessageWebhook: 'yes',
  outgoingWebhook: 'yes',
} as InstanceSettings

describe('findSettingsProblems', () => {
  it('нет проблем при правильных настройках', () => {
    expect(findSettingsProblems(okSettings)).toEqual([])
  })

  it('находит webhookUrl и выключенные уведомления', () => {
    expect(
      findSettingsProblems({
        ...okSettings,
        webhookUrl: 'https://example.com/hook',
        incomingWebhook: 'no',
      }),
    ).toEqual([
      'Задан webhookUrl — уведомления уходят на него, а не в приложение',
      'Выключены уведомления о входящих сообщениях',
    ])
  })
})
