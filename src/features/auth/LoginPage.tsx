import { useState, type FormEvent } from 'react'
import { useAuthStore } from '../../store/authStore'
import { deriveApiUrl, login } from './login'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const saveSession = useAuthStore((state) => state.login)
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  // Пока пользователь сам не изменил apiUrl, он строится из idInstance
  const [customApiUrl, setCustomApiUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const apiUrl = customApiUrl ?? deriveApiUrl(idInstance)
  const canSubmit = Boolean(idInstance.trim() && apiTokenInstance.trim() && apiUrl.trim())

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || loading) return

    setLoading(true)
    setError(null)
    try {
      saveSession(await login({ apiUrl, idInstance, apiTokenInstance }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось войти')
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <h1 className={styles.title}>Вход</h1>
        <p className={styles.subtitle}>
          Введите данные инстанса из{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            личного кабинета GREEN-API
          </a>
        </p>

        <label className={styles.field}>
          <span className={styles.label}>idInstance</span>
          <input
            className={styles.input}
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value)}
            inputMode="numeric"
            autoComplete="username"
            placeholder="1101000001"
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>apiTokenInstance</span>
          <input
            className={styles.input}
            type="password"
            value={apiTokenInstance}
            onChange={(e) => setApiTokenInstance(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>apiUrl</span>
          <input
            className={styles.input}
            type="url"
            value={apiUrl}
            onChange={(e) => setCustomApiUrl(e.target.value)}
            placeholder="https://1101.api.green-api.com"
          />
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button className={styles.submit} type="submit" disabled={!canSubmit || loading}>
          {loading ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </main>
  )
}
