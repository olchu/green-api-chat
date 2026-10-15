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

/** +7 999 123-45-67 для российских номеров, иначе +цифры */
export function formatPhone(phone: string | number): string {
  const digits = digitsOnly(phone)
  const ru = /^7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(digits)
  return ru ? `+7 ${ru[1]} ${ru[2]}-${ru[3]}-${ru[4]}` : `+${digits}`
}
