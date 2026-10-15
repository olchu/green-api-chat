import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { useAuthStore } from './store/authStore'

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
        credentials: { apiUrl: 'https://x', idInstance: '1', apiTokenInstance: 't' },
        typeInstance: 'telegram',
        account: null,
      },
    })
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Выйти' }))

    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument()
  })
})
