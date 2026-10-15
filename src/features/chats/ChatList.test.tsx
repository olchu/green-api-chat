import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { testCredentials, testSession } from '../../test/fixtures'
import { ChatList } from './ChatList'

const INSTANCE = testCredentials.idInstance
const store = () => useChatStore.getState()

beforeEach(() => {
  useAuthStore.setState({ session: testSession })
})

function seed() {
  store().upsertChat(INSTANCE, { chatId: '1', name: 'Анна', phone: '79991112233' })
  store().upsertChat(INSTANCE, { chatId: '2', name: 'Борис', username: '@boris' })
  store().addMessage(INSTANCE, {
    id: 'a',
    chatId: '1',
    text: 'Привет!',
    timestamp: Date.now(),
    direction: 'in',
  })
  store().addMessage(INSTANCE, {
    id: 'b',
    chatId: '2',
    text: 'Как дела?',
    timestamp: Date.now() - 1000,
    direction: 'out',
    status: 'sent',
  })
}

describe('ChatList', () => {
  it('показывает пустое состояние', () => {
    render(<ChatList />)

    expect(screen.getByText(/Чатов пока нет/)).toBeInTheDocument()
  })

  it('показывает чаты с последним сообщением и непрочитанными', () => {
    seed()
    render(<ChatList />)

    const [anna, boris] = screen.getAllByRole('listitem')
    expect(anna).toHaveTextContent('Анна')
    expect(anna).toHaveTextContent('Привет!')
    expect(within(anna).getByLabelText('Непрочитанных: 1')).toBeInTheDocument()
    expect(boris).toHaveTextContent('Вы: Как дела?')
  })

  it('открывает чат по клику', async () => {
    seed()
    render(<ChatList />)

    await userEvent.click(screen.getByRole('button', { name: /Анна/ }))

    expect(store().active).toEqual({ instanceId: INSTANCE, chatId: '1' })
    expect(screen.getByRole('button', { name: /Анна/ })).toHaveAttribute('aria-current', 'true')
    expect(screen.queryByLabelText(/Непрочитанных/)).not.toBeInTheDocument()
  })

  it('ищет по имени, username и номеру', async () => {
    seed()
    render(<ChatList />)
    const search = screen.getByRole('searchbox', { name: 'Поиск по чатам' })

    await userEvent.type(search, 'bor')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)

    await userEvent.clear(search)
    await userEvent.type(search, '111 22')
    expect(screen.getByRole('listitem')).toHaveTextContent('Анна')

    await userEvent.clear(search)
    await userEvent.type(search, 'Вася')
    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument()
  })
})
