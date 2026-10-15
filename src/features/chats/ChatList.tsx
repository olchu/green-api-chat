import { useCallback, useMemo, useState } from 'react'
import { normalizePhone } from '../../lib/phone'
import { useInstanceId } from '../../store/authStore'
import { useActiveChatId, useChatList, useChatStore } from '../../store/chatStore'
import { ChatListItem } from './ChatListItem'
import styles from './ChatList.module.css'

export function ChatList() {
  const instanceId = useInstanceId()
  const entries = useChatList(instanceId)
  const activeChatId = useActiveChatId(instanceId)
  const openChat = useChatStore((state) => state.openChat)
  const [query, setQuery] = useState('')

  const selectChat = useCallback(
    (chatId: string) => openChat(instanceId, chatId),
    [instanceId, openChat],
  )

  const visibleEntries = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return entries
    const digits = normalizePhone(needle)
    return entries.filter(
      ({ chat }) =>
        chat.name.toLowerCase().includes(needle) ||
        chat.username?.toLowerCase().includes(needle) ||
        (digits && chat.phone?.includes(digits)),
    )
  }, [entries, query])

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

      {visibleEntries.length > 0 ? (
        <ul className={styles.list}>
          {visibleEntries.map(({ chat, lastMessage }) => (
            <ChatListItem
              key={chat.chatId}
              chat={chat}
              lastMessage={lastMessage}
              active={chat.chatId === activeChatId}
              onSelect={selectChat}
            />
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>
          {entries.length ? 'Ничего не найдено' : 'Чатов пока нет. Начните переписку по номеру'}
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
