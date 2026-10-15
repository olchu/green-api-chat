import { memo, type ReactNode } from 'react'
import { formatTime } from '../../lib/time'
import type { Message, MessageStatus } from '../../store/chatStore'
import styles from './MessageBubble.module.css'

const STATUS_LABELS: Record<MessageStatus, string> = {
  pending: 'Отправляется',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не отправлено',
}

const SINGLE_CHECK = 'm3 8.5 3 3 7-7'
const DOUBLE_CHECK = 'm1 8.5 3 3 7-7M7.5 11.5 14.5 4.5'

const checks = (d: string) => (
  <path
    d={d}
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
)

const STATUS_ICONS: Record<MessageStatus, ReactNode> = {
  pending: (
    <>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  sent: checks(SINGLE_CHECK),
  // В Telegram и MAX нет отдельной отметки «доставлено»: две галочки — только «прочитано»
  delivered: checks(SINGLE_CHECK),
  read: checks(DOUBLE_CHECK),
  failed: (
    <>
      <circle cx="8" cy="8" r="6.5" fill="var(--color-negative)" />
      <path d="M8 4.5v4M8 11h.01" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
}

interface MessageBubbleProps {
  message: Message
  onRetry: (message: Message) => unknown
}

export const MessageBubble = memo(function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  // Повторить можно только то, что не дошло до GREEN-API: у такого нет idMessage
  const canRetry = message.status === 'failed' && !message.idMessage

  return (
    <li className={styles.row} data-direction={message.direction}>
      <div className={styles.bubble} data-status={message.status}>
        <p className={styles.text}>{message.text}</p>
        <span className={styles.meta}>
          <time dateTime={new Date(message.timestamp).toISOString()}>
            {formatTime(message.timestamp)}
          </time>
          {message.direction === 'out' && message.status && (
            <svg
              className={styles.status}
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              role="img"
              aria-label={STATUS_LABELS[message.status]}
            >
              {STATUS_ICONS[message.status]}
            </svg>
          )}
        </span>
        {canRetry && (
          <button className={styles.retry} type="button" onClick={() => onRetry(message)}>
            Не отправлено. Повторить
          </button>
        )}
      </div>
    </li>
  )
})
