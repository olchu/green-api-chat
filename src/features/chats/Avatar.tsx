import { useState } from 'react'
import { getInitials, pickGradient } from './avatarUtils'
import styles from './Avatar.module.css'

interface AvatarProps {
  id: string
  name: string
  src?: string
  size?: number
}

export function Avatar({ id, name, src, size = 54 }: AvatarProps) {
  // Ссылка может устареть или фото скрыто — тогда показываем инициалы
  const [failedSrc, setFailedSrc] = useState<string>()
  const showPhoto = src && src !== failedSrc

  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: size * 0.36, background: pickGradient(id) }}
      aria-hidden="true"
    >
      {showPhoto ? (
        <img
          className={styles.photo}
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  )
}
