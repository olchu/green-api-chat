import { formatPhone } from '../../lib/phone'
import type { Chat } from '../../store/chatStore'
import { Avatar } from '../chats/Avatar'
import { BackButton } from '../../components/BackButton'
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
      <BackButton label="Закрыть чат" onClick={onClose} />
      <Avatar id={chat.chatId} name={chat.name} src={chat.avatar} size={40} />
      <div className={styles.info}>
        <h2 className={styles.name}>{chat.name}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
    </header>
  )
}
