import { getInitials, pickGradient } from './avatarUtils'
import styles from './Avatar.module.css'

interface AvatarProps {
  id: string
  name: string
  size?: number
}

export function Avatar({ id, name, size = 54 }: AvatarProps) {
  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: size * 0.36, background: pickGradient(id) }}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  )
}
