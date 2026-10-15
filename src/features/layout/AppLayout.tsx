import { ChatWindow } from '../chat/ChatWindow'
import { useActiveChatInfo } from '../chats/useActiveChatInfo'
import { usePoller } from '../sync/usePoller'
import { useInstanceId } from '../../store/authStore'
import { useActiveChatId } from '../../store/chatStore'
import { NavRail } from './NavRail'
import { Sidebar } from './Sidebar'
import styles from './AppLayout.module.css'

export function AppLayout() {
  useActiveChatInfo()
  usePoller()
  const chatOpen = useActiveChatId(useInstanceId()) !== null

  // На узких экранах открытый чат занимает весь экран, см. AppLayout.module.css
  return (
    <div className={styles.app} data-chat-open={chatOpen}>
      <NavRail />

      <aside className={styles.sidebar}>
        <Sidebar />
      </aside>

      <main className={styles.chatArea}>
        <ChatWindow />
      </main>
    </div>
  )
}
