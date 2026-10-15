import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { beforeEach, describe, expect, it } from 'vitest'
import { server, setupMockServer } from '../../test/server'
import { apiUrl } from '../../test/fixtures'
import { useAuthStore } from '../../store/authStore'
import { LoginPage } from './LoginPage'

setupMockServer()
beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ session: null })
})

async function fillForm() {
  const user = userEvent.setup()
  render(<LoginPage />)
  await user.type(screen.getByLabelText('idInstance'), '4100000001')
  await user.type(screen.getByLabelText('apiTokenInstance'), 'token123')
  return user
}

describe('LoginPage', () => {
  it('заполняет apiUrl по idInstance и разрешает ручное изменение', async () => {
    const user = await fillForm()
    const apiUrl = screen.getByLabelText('apiUrl')

    expect(apiUrl).toHaveValue('https://4100.api.green-api.com')

    await user.clear(apiUrl)
    await user.type(apiUrl, 'https://custom.example.com')
    await user.type(screen.getByLabelText('idInstance'), '9')

    expect(apiUrl).toHaveValue('https://custom.example.com')
  })

  it('кнопка недоступна, пока не заполнены поля', async () => {
    render(<LoginPage />)

    expect(screen.getByRole('button', { name: 'Войти' })).toBeDisabled()
  })

  it('сохраняет сессию после успешной проверки', async () => {
    server.use(
      http.get(apiUrl('getSettings'), () => HttpResponse.json({ typeInstance: 'v3' })),
      http.get(apiUrl('getAccountSettings'), () =>
        HttpResponse.json({ stateInstance: 'authorized', phone: '1', chatId: '2', avatar: '' }),
      ),
    )
    const user = await fillForm()

    await user.click(screen.getByRole('button', { name: 'Войти' }))

    await expect.poll(() => useAuthStore.getState().session?.typeInstance).toBe('v3')
  })

  it('показывает ошибку и позволяет повторить', async () => {
    server.use(
      http.get(apiUrl('getSettings'), () => new HttpResponse(null, { status: 401 })),
      http.get(apiUrl('getAccountSettings'), () => new HttpResponse(null, { status: 401 })),
    )
    const user = await fillForm()

    await user.click(screen.getByRole('button', { name: 'Войти' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный idInstance')
    expect(screen.getByRole('button', { name: 'Войти' })).toBeEnabled()
    expect(useAuthStore.getState().session).toBeNull()
  })
})
