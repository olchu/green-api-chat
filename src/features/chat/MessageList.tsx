import { Fragment, useLayoutEffect, useRef } from 'react'
import { formatDayLabel, startOfDay } from '../../lib/time'
import { useMessages } from '../../store/chatStore'
import { MessageBubble } from './MessageBubble'
import styles from './MessageList.module.css'

interface MessageListProps {
  instanceId: string
  chatId: string
}

export function MessageList({ instanceId, chatId }: MessageListProps) {
  const messages = useMessages(instanceId, chatId)
  const scrollRef = useRef<HTMLDivElement>(null)

  // При открытии чата и новых сообщениях — к последнему
  useLayoutEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [chatId, messages.length])

  if (messages.length === 0) {
    return (
      <div className={styles.scroll}>
        <span className={styles.chip}>Сообщений пока нет</span>
      </div>
    )
  }

  return (
    <div className={styles.scroll} ref={scrollRef}>
      <ol className={styles.list} aria-label="Сообщения">
        {messages.map((message, index) => {
          const day = startOfDay(message.timestamp)
          const newDay = index === 0 || day !== startOfDay(messages[index - 1].timestamp)
          return (
            <Fragment key={message.id}>
              {newDay && (
                <li className={styles.day}>
                  <span className={styles.chip}>{formatDayLabel(message.timestamp)}</span>
                </li>
              )}
              <MessageBubble message={message} />
            </Fragment>
          )
        })}
      </ol>
    </div>
  )
}
