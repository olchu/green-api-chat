// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { MESSENGERS } from './messengers'
import { formatPhone, normalizePhone, validatePhone } from './phone'

const telegram = MESSENGERS.telegram.phone
const max = MESSENGERS.max.phone

describe('normalizePhone', () => {
  it('убирает всё, кроме цифр', () => {
    expect(normalizePhone('+7 (999) 123-45-67')).toBe('79991234567')
  })

  it('заменяет российскую восьмёрку на 7', () => {
    expect(normalizePhone('8 999 123-45-67')).toBe('79991234567')
  })

  it('не трогает номер с плюсом, начинающийся с 8', () => {
    expect(normalizePhone('+81 3 1234 5678')).toBe('81312345678')
  })
})

describe('validatePhone', () => {
  it('принимает российский номер для Telegram и MAX', () => {
    expect(validatePhone('+7 999 123-45-67', telegram)).toEqual({
      ok: true,
      phoneNumber: 79991234567,
    })
    expect(validatePhone('89991234567', max)).toEqual({ ok: true, phoneNumber: 79991234567 })
  })

  it('принимает белорусский номер для MAX', () => {
    expect(validatePhone('+375 29 123-45-67', max)).toEqual({
      ok: true,
      phoneNumber: 375291234567,
    })
  })

  it('принимает номер любой страны для Telegram', () => {
    expect(validatePhone('+49 151 23456789', telegram)).toMatchObject({ ok: true })
  })

  it('отклоняет чужой код страны для MAX', () => {
    expect(validatePhone('+44 20 7946 0958', max)).toEqual({
      ok: false,
      error: 'Поддерживаются только номера с кодом +7 или +375',
    })
  })

  it('отклоняет пустой ввод, буквы и неверную длину', () => {
    expect(validatePhone('  ', telegram)).toMatchObject({ error: 'Введите номер телефона' })
    expect(validatePhone('+7 999 abc', telegram)).toMatchObject({ ok: false })
    expect(validatePhone('12345', telegram)).toMatchObject({
      error: 'Номер должен содержать от 10 до 15 цифр с кодом страны',
    })
  })
})

describe('formatPhone', () => {
  it('форматирует российский номер', () => {
    expect(formatPhone('79991234567')).toBe('+7 999 123-45-67')
    expect(formatPhone(79991234567)).toBe('+7 999 123-45-67')
  })

  it('остальные номера делит на код страны и группы', () => {
    expect(formatPhone('375291234567')).toBe('+375 291 234 567')
    expect(formatPhone('381601234567')).toBe('+381 601 234 567')
    expect(formatPhone('4915123456789')).toBe('+49 151 234 567 89')
    expect(formatPhone('12025550123')).toBe('+1 202 555 0123')
  })
})
