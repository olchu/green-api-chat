// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { formatChatTime, formatDayLabel, formatTime } from './time'

const now = new Date(2026, 9, 15, 18, 0).getTime()

describe('formatChatTime', () => {
  it('сегодня показывает время', () => {
    expect(formatChatTime(new Date(2026, 9, 15, 9, 5).getTime(), now)).toBe('09:05')
  })

  it('в этом году показывает день и месяц', () => {
    expect(formatChatTime(new Date(2026, 3, 9, 12, 0).getTime(), now)).toBe('9 апр.')
  })

  it('в прошлые годы показывает полную дату', () => {
    expect(formatChatTime(new Date(2025, 3, 9).getTime(), now)).toBe('09.04.2025')
  })
})

describe('formatTime', () => {
  it('показывает часы и минуты', () => {
    expect(formatTime(new Date(2026, 9, 15, 7, 3).getTime())).toBe('07:03')
  })
})

describe('formatDayLabel', () => {
  it('сегодня и вчера', () => {
    expect(formatDayLabel(new Date(2026, 9, 15, 0, 1).getTime(), now)).toBe('сегодня')
    expect(formatDayLabel(new Date(2026, 9, 14, 23, 59).getTime(), now)).toBe('вчера')
  })

  it('день и месяц в этом году, с годом — в прошлые', () => {
    expect(formatDayLabel(new Date(2026, 3, 9).getTime(), now)).toBe('9 апреля')
    expect(formatDayLabel(new Date(2025, 3, 9).getTime(), now)).toBe('9 апреля 2025 г.')
  })
})
