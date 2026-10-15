import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { apiUrl, testCredentials, testSession } from '../../test/fixtures'
import { server, setupMockServer } from '../../test/server'
import { ChatList } from './ChatList'
import { useActiveChatInfo } from './useActiveChatInfo'

const INSTANCE = testCredentials.idInstance
setupMockServer()

function Harness() {
  useActiveChatInfo()
  return <ChatList />
}

beforeEach(() => {
  useAuthStore.setState({ session: testSession })
  useChatStore
    .getState()
    .upsertChat(INSTANCE, { chatId: '555', name: '+7 926 287-61-51', phone: '79262876151' })
})

describe('useActiveChatInfo', () => {
  it('подгружает имя и фото открытого чата один раз', async () => {
    let calls = 0
    server.use(
      http.post(apiUrl('getContactInfo'), () => {
        calls++
        return HttpResponse.json({
          chatId: '555',
          name: 'Мария',
          contactName: '',
          avatar: 'https://example.com/m.jpg',
        })
      }),
    )
    useChatStore.getState().openChat(INSTANCE, '555')

    const { rerender } = render(<Harness />)

    expect(await screen.findByText('Мария')).toBeInTheDocument()
    expect(document.querySelector('img')).toHaveAttribute('src', 'https://example.com/m.jpg')

    rerender(<Harness />)
    expect(calls).toBe(1)
  })

  it('при ошибке оставляет номер', async () => {
    let requested = false
    server.use(
      http.post(apiUrl('getContactInfo'), () => {
        requested = true
        return new HttpResponse(null, { status: 500 })
      }),
    )
    useChatStore.getState().openChat(INSTANCE, '555')

    render(<Harness />)

    await expect.poll(() => requested).toBe(true)
    expect(screen.getByText('+7 926 287-61-51')).toBeInTheDocument()
  })
})
