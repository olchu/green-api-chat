import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Credentials, TypeInstance } from '../api/types'
import { detectMessenger } from '../lib/messengers'

export interface Account {
  phone: string
  chatId: string
  avatar: string
}

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
    {
      name: 'green-api-chat/auth',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ session }) => ({ session }),
    },
  ),
)

export const useSession = () => useAuthStore((state) => state.session)

export const useMessenger = () =>
  detectMessenger(useAuthStore((state) => state.session?.typeInstance))
