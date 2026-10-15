import { useAuthStore } from '../../store/authStore'
import styles from './NavRail.module.css'

export function NavRail() {
  const logout = useAuthStore((state) => state.logout)

  return (
    <nav className={styles.rail} aria-label="Разделы">
      <button className={styles.item} type="button" aria-current="page">
        <ChatsIcon />
        <span>Чаты</span>
      </button>

      <button className={`${styles.item} ${styles.bottom}`} type="button" onClick={logout}>
        <LogoutIcon />
        <span>Выйти</span>
      </button>
    </nav>
  )
}

function ChatsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3.5c-4.97 0-9 3.47-9 7.75 0 2.2 1.07 4.18 2.79 5.6-.17 1.2-.7 2.3-1.5 3.13a.5.5 0 0 0 .38.84c1.8-.05 3.4-.7 4.62-1.67.86.2 1.77.3 2.71.3 4.97 0 9-3.47 9-7.75S16.97 3.5 12 3.5Z"
      />
      <circle cx="8" cy="11.25" r="1.25" fill="var(--rail-icon-dots, #fff)" />
      <circle cx="12" cy="11.25" r="1.25" fill="var(--rail-icon-dots, #fff)" />
      <circle cx="16" cy="11.25" r="1.25" fill="var(--rail-icon-dots, #fff)" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
