import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../../store/authStore'
import { useChatStore, type Message } from '../../store/chatStore'
import { testCredentials, testSession } from '../../test/fixtures'
import { ChatWindow } from './ChatWindow'

const INSTANCE = testCredentials.idInstance
const store = () => useChatStore.getState()
const DAY = 24 * 60 * 60 * 1000

function message(id: string, overrides: Partial<Message>): Message {
  return {
    id,
    idMessage: id,
    chatId: '1',
    text: id,
    timestamp: Date.now(),
    direction: 'in',
    ...overrides,
  }
}

beforeEach(() => {
  useAuthStore.setState({ session: testSession })
  store().upsertChat(INSTANCE, {
    chatId: '1',
    name: 'Анна',
    phone: '79991112233',
    username: '@anna',
  })
})

describe('ChatWindow', () => {
  it('без открытого чата показывает подсказку', () => {
    render(<ChatWindow />)

    expect(screen.getByText('Выберите чат, чтобы начать переписку')).toBeInTheDocument()
  })

  it('показывает шапку и пустой чат', () => {
    store().openChat(INSTANCE, '1')
    render(<ChatWindow />)

    expect(screen.getByRole('heading', { name: 'Анна' })).toBeInTheDocument()
    expect(screen.getByText('+7 999 111-22-33 · @anna')).toBeInTheDocument()
    expect(screen.getByText('Сообщений пока нет')).toBeInTheDocument()
  })

  it('группирует сообщения по дням и показывает статусы исходящих', () => {
    store().addMessage(INSTANCE, message('Вчерашнее', { timestamp: Date.now() - DAY }))
    store().addMessage(INSTANCE, message('Моё', { direction: 'out', status: 'read' }))
    store().addMessage(INSTANCE, message('Не ушло', { direction: 'out', status: 'failed' }))
    store().openChat(INSTANCE, '1')
    render(<ChatWindow />)

    const items = within(screen.getByRole('list', { name: 'Сообщения' })).getAllByRole('listitem')
    expect(items.map((item) => item.textContent?.replace(/\d\d:\d\d/, '').trim())).toEqual([
      'вчера',
      'Вчерашнее',
      'сегодня',
      'Моё',
      'Не ушло',
    ])
    expect(screen.getByRole('img', { name: 'Прочитано' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Не отправлено' })).toBeInTheDocument()
  })

  it('кнопка «назад» закрывает чат', async () => {
    store().openChat(INSTANCE, '1')
    render(<ChatWindow />)

    await userEvent.click(screen.getByRole('button', { name: 'Закрыть чат' }))

    expect(store().active).toBeNull()
    expect(screen.getByText('Выберите чат, чтобы начать переписку')).toBeInTheDocument()
  })
})
