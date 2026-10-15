import type { MessengerRules } from './messengers'

export type PhoneValidation = { ok: true; phoneNumber: number } | { ok: false; error: string }

export const digitsOnly = (value: string | number) => String(value).replace(/\D/g, '')

/** Только цифры; «8 999…» без плюса считается российским номером и превращается в «7999…» */
export function normalizePhone(input: string): string {
  const digits = digitsOnly(input)
  const isRussianTrunk = !input.trim().startsWith('+') && /^8\d{10}$/.test(digits)
  return isRussianTrunk ? `7${digits.slice(1)}` : digits
}

export function validatePhone(input: string, rules: MessengerRules['phone']): PhoneValidation {
  if (!input.trim()) return { ok: false, error: 'Введите номер телефона' }
  if (/[^\d\s+()-]/.test(input)) {
    return { ok: false, error: 'Номер может содержать только цифры, пробелы, скобки и дефисы' }
  }

  const digits = normalizePhone(input)
  if (digits.length < rules.minDigits || digits.length > rules.maxDigits) {
    return {
      ok: false,
      error: `Номер должен содержать от ${rules.minDigits} до ${rules.maxDigits} цифр с кодом страны`,
    }
  }
  if (rules.countryCodes && !rules.countryCodes.some((code) => digits.startsWith(code))) {
    const codes = rules.countryCodes.map((code) => `+${code}`).join(' или ')
    return { ok: false, error: `Поддерживаются только номера с кодом ${codes}` }
  }

  return { ok: true, phoneNumber: Number(digits) }
}

// Коды стран ITU не являются префиксами друг друга: 1 и 7 — однозначные,
// эти — двузначные, остальные — трёхзначные
const TWO_DIGIT_CODES = new Set(
  '20 27 30 31 32 33 34 36 39 40 41 43 44 45 46 47 48 49 51 52 53 54 55 56 57 58 60 61 62 63 64 65 66 81 82 84 86 90 91 92 93 94 95 98'.split(
    ' ',
  ),
)

function countryCodeLength(digits: string): number {
  if (digits.startsWith('1') || digits.startsWith('7')) return 1
  return TWO_DIGIT_CODES.has(digits.slice(0, 2)) ? 2 : 3
}

/** +7 999 123-45-67 для российских номеров, иначе код страны и группы по три цифры */
export function formatPhone(phone: string | number): string {
  const digits = digitsOnly(phone)
  const ru = /^7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(digits)
  if (ru) return `+7 ${ru[1]} ${ru[2]}-${ru[3]}-${ru[4]}`

  const codeLength = countryCodeLength(digits)
  // Пробел после каждых трёх цифр, если за ними ещё хотя бы две: 202 555 0123, а не 202 555 012 3
  const rest = digits.slice(codeLength).replace(/\d{3}(?=\d{2})/g, '$& ')
  return `+${digits.slice(0, codeLength)} ${rest}`.trim()
}
