import { useActiveChatInfo } from '../chats/useActiveChatInfo'
import { NavRail } from './NavRail'
import { Sidebar } from './Sidebar'
import styles from './AppLayout.module.css'

export function AppLayout() {
  useActiveChatInfo()

  return (
    <div className={styles.app}>
      <NavRail />

      <aside className={styles.sidebar}>
        <Sidebar />
      </aside>

      <main className={styles.chatArea}>
        <span className={styles.hint}>Выберите чат, чтобы начать переписку</span>
      </main>
    </div>
  )
}
