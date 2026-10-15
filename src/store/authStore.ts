import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AccountSettings, Credentials, TypeInstance } from '../api/types'
import { detectMessenger } from '../lib/messengers'

export type Account = Pick<AccountSettings, 'phone' | 'chatId' | 'avatar'>

export interface Session {
  credentials: Credentials
  typeInstance: TypeInstance
  account: Account | null
}

interface AuthState {
  session: Session | null
  login: (session: Session) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      login: (session) => set({ session }),
      logout: () => set({ session: null }),
    }),
    { name: 'green-api-chat/auth' },
  ),
)

export const useSession = () => useAuthStore((state) => state.session)

/** idInstance текущей сессии; пустая строка, если пользователь не вошёл */
export const useInstanceId = () =>
  useAuthStore((state) => state.session?.credentials.idInstance ?? '')

export const useMessenger = () =>
  detectMessenger(useAuthStore((state) => state.session?.typeInstance))
