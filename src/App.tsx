import { LoginPage } from './features/auth/LoginPage'
import { AppLayout } from './features/layout/AppLayout'
import { SettingsBanner } from './features/settings/SettingsBanner'
import { useSession } from './store/authStore'

function App() {
  const session = useSession()

  if (!session) return <LoginPage />

  return (
    <>
      <AppLayout />
      <SettingsBanner />
    </>
  )
}

export default App
