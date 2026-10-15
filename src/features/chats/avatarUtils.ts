import { digitsOnly } from '../../lib/phone'

const GRADIENTS = ['sky', 'violet', 'green', 'orange', 'coral'] as const

/** Первые буквы двух слов имени; для номера без букв — две последние цифры */
export function getInitials(name: string): string {
  const letters = name
    .split(/\s+/)
    .map((word) => word.match(/\p{L}/u)?.[0])
    .filter(Boolean)
  if (letters.length) return letters.slice(0, 2).join('').toUpperCase()
  return digitsOnly(name).slice(-2)
}

/** Один и тот же чат всегда получает один и тот же градиент */
export function pickGradient(id: string): string {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return `var(--avatar-${GRADIENTS[hash % GRADIENTS.length]})`
}
