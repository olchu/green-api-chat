import { memo } from 'react'
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

export const MessageBubble = memo(function MessageBubble({ message }: { message: Message }) {
  const outgoing = message.direction === 'out'

  return (
    <li className={styles.row} data-direction={message.direction}>
      <div className={styles.bubble} data-status={message.status}>
        <p className={styles.text}>{message.text}</p>
        <span className={styles.meta}>
          <time dateTime={new Date(message.timestamp).toISOString()}>
            {formatTime(message.timestamp)}
          </time>
          {outgoing && message.status && <StatusIcon status={message.status} />}
        </span>
      </div>
    </li>
  )
})

function StatusIcon({ status }: { status: MessageStatus }) {
  const label = STATUS_LABELS[status]
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    fill: 'none',
    role: 'img',
    'aria-label': label,
    className: styles.status,
  } as const

  if (status === 'pending') {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    )
  }
  if (status === 'failed') {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="6.5" fill="var(--color-negative)" />
        <path d="M8 4.5v4M8 11h.01" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path
        d={status === 'sent' ? 'm3 8.5 3 3 7-7' : 'm1 8.5 3 3 7-7M7.5 11.5 14.5 4.5'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
