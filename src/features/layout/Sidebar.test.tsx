import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { apiUrl, testCredentials, testSession } from '../../test/fixtures'
import { server, setupMockServer } from '../../test/server'
import { Sidebar } from './Sidebar'

setupMockServer()
beforeEach(() => {
  useAuthStore.setState({ session: testSession })
})

async function startChat(phone: string) {
  const user = userEvent.setup()
  render(<Sidebar />)
  await user.click(screen.getByRole('button', { name: 'Новый чат' }))
  await user.type(screen.getByRole('textbox', { name: /Номер телефона/ }), phone)
  await user.click(screen.getByRole('button', { name: 'Начать чат' }))
  return user
}

describe('Sidebar: новый чат', () => {
  it('создаёт и открывает чат по номеру', async () => {
    server.use(
      http.post(apiUrl('checkAccount'), () => HttpResponse.json({ exist: true, chatId: '555' })),
    )

    await startChat('+7 999 123-45-67')

    expect(await screen.findByRole('button', { name: /\+7 999 123-45-67/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(useChatStore.getState().active).toEqual({
      instanceId: testCredentials.idInstance,
      chatId: '555',
    })
  })

  it('показывает ошибку и остаётся в форме', async () => {
    server.use(
      http.post(apiUrl('checkAccount'), () => HttpResponse.json({ exist: false, chatId: '' })),
    )

    await startChat('+7 999 123-45-67')

    expect(await screen.findByRole('alert')).toHaveTextContent('Номер не найден в Telegram')
    expect(screen.getByRole('heading', { name: 'Новый чат' })).toBeInTheDocument()
  })

  it('кнопка «Назад» возвращает к списку', async () => {
    const user = userEvent.setup()
    render(<Sidebar />)

    await user.click(screen.getByRole('button', { name: 'Новый чат' }))
    await user.click(screen.getByRole('button', { name: 'Назад' }))

    expect(screen.getByRole('heading', { name: 'Чаты' })).toBeInTheDocument()
  })
})
