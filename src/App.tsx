import { LoginPage } from './features/auth/LoginPage'
import { SettingsBanner } from './features/settings/SettingsBanner'
import { useAuthStore, useSession } from './store/authStore'

function App() {
  const session = useSession()
  const logout = useAuthStore((state) => state.logout)

  if (!session) return <LoginPage />

  // Временная заглушка до основного макета чата
  return (
    <main style={{ display: 'grid', gap: 16, padding: 16, justifyItems: 'start' }}>
      <SettingsBanner />
      <p>Вы вошли: инстанс {session.credentials.idInstance}</p>
      <button type="button" onClick={logout}>
        Выйти
      </button>
    </main>
  )
}

export default App
