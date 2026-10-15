import { describe, expect, it } from 'vitest'
import { detectMessenger } from './messengers'

describe('detectMessenger', () => {
  it('определяет Telegram', () => {
    expect(detectMessenger('telegram')).toMatchObject({
      id: 'telegram',
      maxMessageLength: 4096,
      supportsUsername: true,
    })
  })

  it('определяет MAX по типу v3', () => {
    expect(detectMessenger('v3')).toMatchObject({
      id: 'max',
      maxMessageLength: 4000,
      phone: { countryCodes: ['7', '375'] },
    })
  })

  it('не зависит от регистра', () => {
    expect(detectMessenger('Telegram').id).toBe('telegram')
  })

  it('возвращает общие правила для незнакомого или пустого типа', () => {
    expect(detectMessenger('whatsapp').id).toBe('unknown')
    expect(detectMessenger(undefined).id).toBe('unknown')
    expect(detectMessenger('').id).toBe('unknown')
  })
})
