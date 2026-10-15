import { formatChatTime } from '../../lib/time'
import type { Chat, Message } from '../../store/chatStore'
import { Avatar } from './Avatar'
import styles from './ChatListItem.module.css'

interface ChatListItemProps {
  chat: Chat
  lastMessage?: Message
  active: boolean
  onSelect: (chatId: string) => void
}

export function ChatListItem({ chat, lastMessage, active, onSelect }: ChatListItemProps) {
  return (
    <li>
      <button
        className={styles.item}
        type="button"
        aria-current={active || undefined}
        onClick={() => onSelect(chat.chatId)}
      >
        <Avatar id={chat.chatId} name={chat.name} />
        <span className={styles.body}>
          <span className={styles.top}>
            <span className={styles.name}>{chat.name}</span>
            <time className={styles.time}>
              {formatChatTime(lastMessage?.timestamp ?? chat.createdAt)}
            </time>
          </span>
          <span className={styles.bottom}>
            <span className={styles.preview}>
              {lastMessage ? (
                <>
                  {lastMessage.direction === 'out' && <span className={styles.you}>Вы: </span>}
                  {lastMessage.text}
                </>
              ) : (
                'Нет сообщений'
              )}
            </span>
            {chat.unread > 0 && (
              <span className={styles.unread} aria-label={`Непрочитанных: ${chat.unread}`}>
                {chat.unread > 99 ? '99+' : chat.unread}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  )
}
