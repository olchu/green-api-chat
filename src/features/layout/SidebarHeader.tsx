import { formatPhone } from '../../lib/phone'
import { useMessenger, useSession } from '../../store/authStore'
import styles from './SidebarHeader.module.css'

export function SidebarHeader() {
  const messenger = useMessenger()
  const phone = useSession()?.account?.phone

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Чаты</h1>
      <p className={styles.account}>
        {messenger.name}
        {phone && ` · ${formatPhone(phone)}`}
      </p>
    </header>
  )
}
