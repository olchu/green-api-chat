import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { useAuthStore } from './store/authStore'
import { apiUrl, testSession } from './test/fixtures'
import { server, setupMockServer } from './test/server'

setupMockServer()
beforeEach(() => {
  server.use(http.get(apiUrl('getSettings'), () => HttpResponse.json({})))
})

describe('App', () => {
  it('без сессии показывает страницу входа', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument()
  })

  it('с сессией позволяет выйти', async () => {
    useAuthStore.setState({ session: testSession })
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Выйти' }))

    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument()
  })
})
