import { useState, type FormEvent } from 'react'
import { useGreenApi } from '../../api/useGreenApi'
import { useInstanceId, useMessenger } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { findChatByPhone } from './startChat'
import styles from './NewChatForm.module.css'

interface NewChatFormProps {
  onClose: () => void
}

export function NewChatForm({ onClose }: NewChatFormProps) {
  const client = useGreenApi()
  const messenger = useMessenger()
  const instanceId = useInstanceId()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const hint = messenger.phone.countryCodes
    ? `Номера с кодом ${messenger.phone.countryCodes.map((code) => `+${code}`).join(' или ')}`
    : 'В международном формате, с кодом страны'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!client || loading) return

    setLoading(true)
    setError(null)
    try {
      const { upsertChat, openChat, byInstance } = useChatStore.getState()
      const knownChats = Object.values(byInstance[instanceId]?.chats ?? {})
      const chat = await findChatByPhone(client, messenger, phone, knownChats)
      upsertChat(instanceId, chat)
      openChat(instanceId, chat.chatId)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось начать чат')
      setLoading(false)
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="new-chat-title">
      <header className={styles.header}>
        <button className={styles.back} type="button" onClick={onClose} aria-label="Назад">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="m15 5-7 7 7 7"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 id="new-chat-title" className={styles.title}>
          Новый чат
        </h1>
      </header>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <label className={styles.field}>
          <span className={styles.label}>Номер телефона в {messenger.name}</span>
          <input
            className={styles.input}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 999 123-45-67"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby="new-chat-hint"
            autoFocus
          />
          <span
            id="new-chat-hint"
            className={error ? styles.error : styles.hint}
            role={error ? 'alert' : undefined}
          >
            {error ?? hint}
          </span>
        </label>

        <button className={styles.submit} type="submit" disabled={!phone.trim() || loading}>
          {loading && <span className={styles.spinner} aria-hidden="true" />}
          {loading ? 'Проверяем номер…' : 'Начать чат'}
        </button>
      </form>
    </section>
  )
}
