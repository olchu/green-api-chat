import { http, HttpResponse } from 'msw/http'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { apiUrl, testCredentials, testSession } from '../../test/fixtures'
import { server, setupMockServer } from '../../test/server'
import { retryChatMessage, sendChatMessage } from './sendMessage'

setupMockServer()

const INSTANCE = testCredentials.idInstance
beforeEach(() => useAuthStore.setState({ session: testSession }))
const messages = () => useChatStore.getState().byInstance[INSTANCE]?.messages['1'] ?? []

describe('sendChatMessage', () => {
  it('показывает сообщение сразу и записывает idMessage после ответа', async () => {
    let body: unknown
    server.use(
      http.post(apiUrl('sendMessage'), async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ idMessage: 'srv-1' })
      }),
    )

    const sending = sendChatMessage('1', 'Привет')
    expect(messages()).toMatchObject([{ text: 'Привет', direction: 'out', status: 'pending' }])

    await sending

    expect(body).toEqual({ chatId: '1', message: 'Привет' })
    expect(messages()).toMatchObject([{ idMessage: 'srv-1', status: 'sent' }])
  })

  it('помечает сообщение как неотправленное и позволяет повторить', async () => {
    server.use(http.post(apiUrl('sendMessage'), () => new HttpResponse(null, { status: 500 })))

    await sendChatMessage('1', 'Привет')
    expect(messages()[0].status).toBe('failed')

    server.use(http.post(apiUrl('sendMessage'), () => HttpResponse.json({ idMessage: 'srv-2' })))
    await retryChatMessage(messages()[0])

    expect(messages()).toHaveLength(1)
    expect(messages()[0]).toMatchObject({ idMessage: 'srv-2', status: 'sent' })
  })
})
