import { formatPhone } from '../../lib/phone'
import { useMessenger, useSession } from '../../store/authStore'
import styles from './SidebarHeader.module.css'

interface SidebarHeaderProps {
  onNewChat: () => void
}

export function SidebarHeader({ onNewChat }: SidebarHeaderProps) {
  const messenger = useMessenger()
  const phone = useSession()?.account?.phone

  return (
    <header className={styles.header}>
      <div className={styles.heading}>
        <h1 className={styles.title}>Чаты</h1>
        <p className={styles.account}>
          {messenger.name}
          {phone && ` · ${formatPhone(phone)}`}
        </p>
      </div>
      <button className={styles.add} type="button" onClick={onNewChat} aria-label="Новый чат">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </header>
  )
}
