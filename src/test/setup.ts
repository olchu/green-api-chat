import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(async () => {
  cleanup()
  // Хранилища используют localStorage, поэтому сбрасываются только в jsdom
  if (typeof window === 'undefined') return
  const { useAuthStore } = await import('../store/authStore')
  const { chatStorage, useChatStore } = await import('../store/chatStore')
  chatStorage.flush()
  localStorage.clear()
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  useChatStore.setState(useChatStore.getInitialState(), true)
})
