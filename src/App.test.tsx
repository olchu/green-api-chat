import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { useAuthStore } from './store/authStore'

const server = setupServer(
  http.get('https://api.test/waInstance1/getSettings/t', () => HttpResponse.json({})),
)

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterAll(() => server.close())
beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ session: null })
})

describe('App', () => {
  it('без сессии показывает страницу входа', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument()
  })

  it('с сессией позволяет выйти', async () => {
    useAuthStore.setState({
      session: {
        credentials: { apiUrl: 'https://api.test', idInstance: '1', apiTokenInstance: 't' },
        typeInstance: 'telegram',
        account: null,
      },
    })
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Выйти' }))

    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument()
  })
})
