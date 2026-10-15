import { NavRail } from './NavRail'
import { SidebarHeader } from './SidebarHeader'
import styles from './AppLayout.module.css'

export function AppLayout() {
  return (
    <div className={styles.app}>
      <NavRail />

      <aside className={styles.sidebar}>
        <SidebarHeader />
        <p className={styles.sidebarEmpty}>Чатов пока нет</p>
      </aside>

      <main className={styles.chatArea}>
        <span className={styles.hint}>Выберите чат, чтобы начать переписку</span>
      </main>
    </div>
  )
}
