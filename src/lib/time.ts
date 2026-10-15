const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dayFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
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
