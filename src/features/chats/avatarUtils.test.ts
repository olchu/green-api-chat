// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { getInitials, pickGradient } from './avatarUtils'

describe('getInitials', () => {
  it('берёт первые буквы двух слов', () => {
    expect(getInitials('Анна Иванова Петровна')).toBe('АИ')
    expect(getInitials('anna')).toBe('A')
  })

  it('пропускает знаки в начале слова', () => {
    expect(getInitials('@durov')).toBe('D')
  })

  it('для номера возвращает две последние цифры', () => {
    expect(getInitials('+7 999 123-45-67')).toBe('67')
  })
})

describe('pickGradient', () => {
  it('стабилен для одного chatId', () => {
    expect(pickGradient('10000000')).toBe(pickGradient('10000000'))
    expect(pickGradient('10000000')).toMatch(/^var\(--avatar-\w+\)$/)
  })
})
