import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { http, HttpResponse } from 'msw/http'
import { apiUrl, testCredentials, testSession } from '../../test/fixtures'
import { server, setupMockServer } from '../../test/server'
import { AppLayout } from './AppLayout'

setupMockServer()

beforeEach(() => {
  useAuthStore.setState({ session: { ...testSession, typeInstance: 'v3' } })
})

describe('AppLayout', () => {
  it('показывает мессенджер и номер аккаунта', () => {
    render(<AppLayout />)

    expect(screen.getByRole('heading', { name: 'Чаты' })).toBeInTheDocument()
    expect(screen.getByText('MAX · +7 999 123-45-67')).toBeInTheDocument()
  })

  it('кнопка «Выйти» завершает сессию', async () => {
    render(<AppLayout />)

    await userEvent.click(screen.getByRole('button', { name: 'Выйти' }))

    expect(useAuthStore.getState().session).toBeNull()
  })
})

describe('AppLayout: открытый чат', () => {
  it('помечает макет, чтобы на телефоне чат занял весь экран', () => {
    server.use(http.post(apiUrl('getContactInfo'), () => HttpResponse.json({ name: 'Анна' })))
    const { container } = render(<AppLayout />)
    const app = container.firstElementChild!
    expect(app).toHaveAttribute('data-chat-open', 'false')

    act(() => {
      useChatStore.getState().upsertChat(testCredentials.idInstance, { chatId: '1', name: 'Анна' })
      useChatStore.getState().openChat(testCredentials.idInstance, '1')
    })

    expect(app).toHaveAttribute('data-chat-open', 'true')
  })
})
