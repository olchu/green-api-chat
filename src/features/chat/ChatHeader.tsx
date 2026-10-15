import { formatPhone } from '../../lib/phone'
import type { Chat } from '../../store/chatStore'
import { Avatar } from '../chats/Avatar'
import styles from './ChatHeader.module.css'

interface ChatHeaderProps {
  chat: Chat
  onClose: () => void
}

export function ChatHeader({ chat, onClose }: ChatHeaderProps) {
  const phone = chat.phone && formatPhone(chat.phone)
  // Под именем — то, чего нет в самом имени: номер или username
  const subtitle = [phone, chat.username]
    .filter((value) => value && value !== chat.name)
    .join(' · ')

  return (
    <header className={styles.header}>
      <button className={styles.back} type="button" onClick={onClose} aria-label="Закрыть чат">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="m15 5-7 7 7 7"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <Avatar id={chat.chatId} name={chat.name} src={chat.avatar} size={40} />
      <div className={styles.info}>
        <h2 className={styles.name}>{chat.name}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
    </header>
  )
}
