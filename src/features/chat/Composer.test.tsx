import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Composer } from './Composer'

function setup(maxLength = 100) {
  const onSend = vi.fn()
  const user = userEvent.setup()
  render(<Composer maxLength={maxLength} onSend={onSend} />)
  return { onSend, user, input: screen.getByRole('textbox', { name: 'Сообщение' }) }
}

describe('Composer', () => {
  it('Enter отправляет обрезанный текст и очищает поле', async () => {
    const { onSend, user, input } = setup()

    await user.type(input, '  Привет  {Enter}')

    expect(onSend).toHaveBeenCalledWith('Привет')
    expect(input).toHaveValue('')
  })

  it('Shift+Enter переносит строку', async () => {
    const { onSend, user, input } = setup()

    await user.type(input, 'Первая{Shift>}{Enter}{/Shift}вторая')
    await user.click(screen.getByRole('button', { name: 'Отправить' }))

    expect(onSend).toHaveBeenCalledWith('Первая\nвторая')
  })

  it('не отправляет пустое сообщение', async () => {
    const { onSend, user, input } = setup()

    await user.type(input, '   {Enter}')

    expect(onSend).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Отправить' })).toBeDisabled()
  })

  it('показывает счётчик у лимита и блокирует отправку при превышении', async () => {
    const { onSend, user, input } = setup(10)

    await user.type(input, '123456789')
    expect(screen.getByText('9 / 10')).toBeInTheDocument()

    await user.type(input, '01{Enter}')
    expect(screen.getByText('11 / 10')).toHaveAttribute('data-over', 'true')
    expect(onSend).not.toHaveBeenCalled()
  })
})
