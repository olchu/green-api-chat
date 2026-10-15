import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../../store/authStore'
import { testSession } from '../../test/fixtures'
import { AppLayout } from './AppLayout'

beforeEach(() => {
  useAuthStore.setState({ session: { ...testSession, typeInstance: 'v3' } })
})

describe('AppLayout', () => {
  it('показывает мессенджер и номер аккаунта', () => {
    render(<AppLayout />)

    expect(screen.getByRole('heading', { name: 'Чаты' })).toBeInTheDocument()
    expect(screen.getByText('MAX · +79991234567')).toBeInTheDocument()
  })

  it('кнопка «Выйти» завершает сессию', async () => {
    render(<AppLayout />)

    await userEvent.click(screen.getByRole('button', { name: 'Выйти' }))

    expect(useAuthStore.getState().session).toBeNull()
  })
})
