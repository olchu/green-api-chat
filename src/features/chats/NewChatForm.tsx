import { useState, type FormEvent } from 'react'
import { useGreenApi } from '../../api/useGreenApi'
import { useInstanceId, useMessenger } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { findChat } from './startChat'
import { BackButton } from '../../components/BackButton'
import styles from './NewChatForm.module.css'

interface NewChatFormProps {
  onClose: () => void
}

export function NewChatForm({ onClose }: NewChatFormProps) {
  const client = useGreenApi()
  const messenger = useMessenger()
  const instanceId = useInstanceId()
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { countryCodes } = messenger.phone
  const hint = countryCodes
    ? `Номера с кодом ${countryCodes.map((code) => `+${code}`).join(' или ')}`
    : messenger.supportsUsername
      ? 'Номер с кодом страны или имя пользователя'
      : 'В международном формате, с кодом страны'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!client || loading) return

    setLoading(true)
    setError(null)
    try {
      const { upsertChat, openChat, byInstance } = useChatStore.getState()
      const knownChats = Object.values(byInstance[instanceId]?.chats ?? {})
      const chat = await findChat(client, messenger, query, knownChats)
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
        <BackButton label="Назад" onClick={onClose} />
        <h1 id="new-chat-title" className={styles.title}>
          Новый чат
        </h1>
      </header>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <label className={styles.field}>
          <span className={styles.label}>
            {messenger.supportsUsername ? 'Номер телефона или @username' : 'Номер телефона'} в{' '}
            {messenger.name}
          </span>
          <input
            className={styles.input}
            type={messenger.supportsUsername ? 'text' : 'tel'}
            inputMode={messenger.supportsUsername ? 'text' : 'tel'}
            autoComplete={messenger.supportsUsername ? 'off' : 'tel'}
            autoCapitalize="off"
            spellCheck={false}
            placeholder="+7 999 123-45-67"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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

        <button className={styles.submit} type="submit" disabled={!query.trim() || loading}>
          {loading && <span className={styles.spinner} aria-hidden="true" />}
          {loading ? 'Ищем собеседника…' : 'Начать чат'}
        </button>
      </form>
    </section>
  )
}
