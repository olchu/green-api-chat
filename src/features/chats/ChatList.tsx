import { useMemo, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useChatList, useChatStore } from '../../store/chatStore'
import { ChatListItem } from './ChatListItem'
import styles from './ChatList.module.css'

export function ChatList() {
  const instanceId = useAuthStore((state) => state.session?.credentials.idInstance ?? '')
  const chats = useChatList(instanceId)
  const messages = useChatStore((state) => state.byInstance[instanceId]?.messages)
  const activeChatId = useChatStore((state) => state.activeChatId)
  const openChat = useChatStore((state) => state.openChat)
  const [query, setQuery] = useState('')

  const visibleChats = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const digits = needle.replace(/\D/g, '')
    if (!needle) return chats
    return chats.filter(
      (chat) =>
        chat.name.toLowerCase().includes(needle) ||
        chat.username?.toLowerCase().includes(needle) ||
        (digits && chat.phone?.includes(digits)),
    )
  }, [chats, query])

  return (
    <div className={styles.container}>
      <div className={styles.search}>
        <SearchIcon />
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Поиск"
          aria-label="Поиск по чатам"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {visibleChats.length > 0 ? (
        <ul className={styles.list}>
          {visibleChats.map((chat) => (
            <ChatListItem
              key={chat.chatId}
              chat={chat}
              lastMessage={messages?.[chat.chatId]?.at(-1)}
              active={chat.chatId === activeChatId}
              onSelect={(chatId) => openChat(instanceId, chatId)}
            />
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>
          {chats.length ? 'Ничего не найдено' : 'Чатов пока нет. Начните переписку по номеру'}
        </p>
      )}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
