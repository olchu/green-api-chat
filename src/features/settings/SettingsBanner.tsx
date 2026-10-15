import { useEffect, useState, type CSSProperties } from 'react'
import { useGreenApi } from '../../api/useGreenApi'
import { findSettingsProblems, REQUIRED_SETTINGS, type RequiredSetting } from './instanceSettings'
import styles from './SettingsBanner.module.css'

type Status = 'idle' | 'saving' | 'saved' | 'error'

const SETTING_LABELS: Record<RequiredSetting, string> = {
  webhookUrl: 'Получение через HTTP API',
  incomingWebhook: 'Входящие сообщения',
  outgoingMessageWebhook: 'Сообщения с телефона',
  outgoingWebhook: 'Статусы доставки',
}

const FIX_BUTTON_LABEL: Record<Exclude<Status, 'saved'>, string> = {
  idle: 'Включить уведомления',
  saving: 'Сохраняем…',
  error: 'Повторить',
}

/** Предупреждает, если настройки инстанса мешают получать сообщения */
export function SettingsBanner() {
  const client = useGreenApi()
  const [problems, setProblems] = useState<RequiredSetting[]>([])
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

  const dismiss = () => setProblems([])
  const saved = status === 'saved'
  const saving = status === 'saving'

  return (
    <section
      className={styles.banner}
      data-status={status}
      role={saved ? 'status' : 'alert'}
      aria-labelledby="settings-banner-title"
    >
      <header className={styles.header}>
        <span className={styles.badge} aria-hidden="true">
          {saved ? <CheckIcon /> : <BellOffIcon />}
        </span>
        <div className={styles.heading}>
          <h2 id="settings-banner-title" className={styles.title}>
            {saved ? 'Настройки сохранены' : 'Сообщения не будут приходить'}
          </h2>
          <p className={styles.text}>
            {saved
              ? 'Инстанс перезапускается — ответы начнут приходить в течение 5 минут'
              : 'В инстансе GREEN-API выключены уведомления, которые нужны чату'}
          </p>
        </div>
      </header>

      <ul className={styles.list}>
        {problems.map((key, index) => (
          <li key={key} className={styles.row} style={{ '--index': index } as CSSProperties}>
            <span className={styles.label}>
              {SETTING_LABELS[key]}
              <span className={styles.key}>{key}</span>
            </span>
            <span className={styles.chip} data-on={saved}>
              {saved ? 'вкл' : 'выкл'}
            </span>
          </li>
        ))}
      </ul>

      {status === 'error' && (
        <p className={styles.error}>
          Не удалось сохранить настройки. Проверьте соединение и попробуйте ещё раз
        </p>
      )}

      <div className={styles.actions}>
        {saved ? (
          <button className={styles.primary} type="button" onClick={dismiss}>
            Готово
          </button>
        ) : (
          <>
            <button className={styles.primary} type="button" onClick={fix} disabled={saving}>
              {saving && <span className={styles.spinner} aria-hidden="true" />}
              {FIX_BUTTON_LABEL[status]}
            </button>
            <button className={styles.secondary} type="button" onClick={dismiss} disabled={saving}>
              Не сейчас
            </button>
          </>
        )}
      </div>
    </section>
  )
}

function BellOffIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M9.5 20a2.6 2.6 0 0 0 5 0M6.3 6.6A6 6 0 0 0 6 8.5c0 4.6-2 6.5-2 6.5h11.5M9 3.6A6 6 0 0 1 18 8.5c0 2 .4 3.5.9 4.6M3 3l18 18"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="m5 12.5 4.5 4.5L19 7.5"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
