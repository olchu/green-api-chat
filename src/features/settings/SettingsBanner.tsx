import { useEffect, useState } from 'react'
import { useGreenApi } from '../../api/useGreenApi'
import { findSettingsProblems, REQUIRED_SETTINGS } from './instanceSettings'
import styles from './SettingsBanner.module.css'

type Status = 'idle' | 'saving' | 'saved' | 'error'

/** Предупреждает, если настройки инстанса мешают получать сообщения */
export function SettingsBanner() {
  const client = useGreenApi()
  const [problems, setProblems] = useState<string[]>([])
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    if (!client) return
    const controller = new AbortController()
    client
      .getSettings(controller.signal)
      .then((settings) => setProblems(findSettingsProblems(settings)))
      // Не удалось проверить — не мешаем работе
      .catch(() => {})
    return () => controller.abort()
  }, [client])

  if (!client || problems.length === 0) return null

  const fix = async () => {
    setStatus('saving')
    try {
      await client.setSettings(REQUIRED_SETTINGS)
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'saved') {
    return (
      <div className={styles.banner} role="status">
        Настройки сохранены. Инстанс перезапускается — это может занять до 5 минут.
      </div>
    )
  }

  return (
    <div className={styles.banner} role="alert">
      <p className={styles.title}>Настройки инстанса мешают получать сообщения</p>
      <ul className={styles.list}>
        {problems.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </ul>
      {status === 'error' && (
        <p className={styles.error}>Не удалось сохранить настройки. Попробуйте ещё раз</p>
      )}
      <button className={styles.button} type="button" onClick={fix} disabled={status === 'saving'}>
        {status === 'saving' ? 'Сохраняем…' : 'Исправить'}
      </button>
    </div>
  )
}
