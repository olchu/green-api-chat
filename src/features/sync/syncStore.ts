import { create } from 'zustand'

/** Источники проблем с получением сообщений, по убыванию важности */
const PROBLEM_KINDS = ['state', 'quota', 'connection'] as const
export type SyncProblemKind = (typeof PROBLEM_KINDS)[number]

/** Состояние получения уведомлений; не сохраняется между сессиями */
interface SyncState {
  problems: Partial<Record<SyncProblemKind, string>>
  /** null снимает проблему этого источника, не трогая остальные */
  setProblem: (kind: SyncProblemKind, text: string | null) => void
  reset: () => void
}

export const useSyncStore = create<SyncState>()((set) => ({
  problems: {},
  setProblem: (kind, text) =>
    set((state) =>
      state.problems[kind] === (text ?? undefined)
        ? state
        : { problems: { ...state.problems, [kind]: text ?? undefined } },
    ),
  reset: () => set({ problems: {} }),
}))

/** Самая важная текущая проблема для шапки списка чатов */
export const useSyncProblem = () =>
  useSyncStore((state) => PROBLEM_KINDS.map((kind) => state.problems[kind]).find(Boolean) ?? null)
