import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import { isNearBottom } from '../../lib/scroll'
import { formatDayLabel, startOfDay } from '../../lib/time'
import { useMessages } from '../../store/chatStore'
import { MessageBubble } from './MessageBubble'
import { retryChatMessage } from './sendMessage'
import styles from './MessageList.module.css'

interface MessageListProps {
  instanceId: string
  chatId: string
}

export function MessageList({ instanceId, chatId }: MessageListProps) {
  const messages = useMessages(instanceId, chatId)
  const lastMessage = messages.at(-1)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Пользователь внизу ленты — тогда новые сообщения прокручивают её дальше
  const stickToBottom = useRef(true)
  const [showJump, setShowJump] = useState(false)

  // Плавно — только по кнопке; при открытии чата лента сразу стоит внизу
  const scrollToBottom = (behavior: ScrollBehavior = 'instant') => {
    const element = scrollRef.current
    if (!element) return
    if (behavior === 'smooth') element.scrollTo({ top: element.scrollHeight, behavior })
    else element.scrollTop = element.scrollHeight
  }

  // При открытии чата (лента монтируется заново по key) и новом сообщении — к последнему.
  // Если пользователь читает старые сообщения, не сбиваем его; своё отправленное показываем всегда
  useLayoutEffect(() => {
    if (stickToBottom.current || lastMessage?.direction === 'out') scrollToBottom()
  }, [lastMessage?.id, lastMessage?.direction])

  function handleScroll() {
    const element = scrollRef.current
    if (!element) return
    stickToBottom.current = isNearBottom(element)
    setShowJump(!stickToBottom.current)
  }

  return (
    <div className={styles.container}>
      <div className={styles.scroll} ref={scrollRef} onScroll={handleScroll}>
        {messages.length === 0 ? (
          <span className={styles.empty}>Сообщений пока нет</span>
        ) : (
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
                  <MessageBubble message={message} onRetry={retryChatMessage} />
                </Fragment>
              )
            })}
          </ol>
        )}
      </div>

      {showJump && (
        <button
          className={styles.jump}
          type="button"
          onClick={() => scrollToBottom('smooth')}
          aria-label="К последним сообщениям"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="m6 9 6 6 6-6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
