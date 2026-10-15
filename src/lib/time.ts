const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dayFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
const dayMonthFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const dayMonthYearFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** Время в списке чатов: 12:06 сегодня, «9 апр.» в этом году, иначе 09.04.2025 */
export function formatChatTime(timestamp: number, now = Date.now()): string {
  const date = new Date(timestamp)
  const today = new Date(now)
  if (date.toDateString() === today.toDateString()) return timeFormat.format(date)
  if (date.getFullYear() === today.getFullYear()) return dayFormat.format(date)
  return dateFormat.format(date)
}

export function formatTime(timestamp: number): string {
  return timeFormat.format(timestamp)
}

/** Начало суток в миллисекундах — ключ для группировки сообщений по дням */
export function startOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** Плашка над сообщениями дня: «сегодня», «вчера», «15 октября», «15 октября 2025 г.» */
export function formatDayLabel(timestamp: number, now = Date.now()): string {
  const day = startOfDay(timestamp)
  const today = startOfDay(now)
  if (day === today) return 'сегодня'
  if (day === startOfDay(today - 1)) return 'вчера'
  const date = new Date(timestamp)
  return date.getFullYear() === new Date(now).getFullYear()
    ? dayMonthFormat.format(date)
    : dayMonthYearFormat.format(date)
}
