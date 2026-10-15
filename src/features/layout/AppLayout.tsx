import { NavRail } from './NavRail'
import { Sidebar } from './Sidebar'
import styles from './AppLayout.module.css'

export function AppLayout() {
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
