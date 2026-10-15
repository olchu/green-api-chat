// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { InstanceSettings } from '../../api/types'
import { findSettingsProblems, REQUIRED_SETTINGS } from './instanceSettings'

const okSettings = REQUIRED_SETTINGS as InstanceSettings

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
    ).toEqual(['webhookUrl', 'incomingWebhook'])
  })
})
