// @vitest-environment node
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { createGreenApiClient } from '../../api/greenApi'
import { apiUrl, testCredentials } from '../../test/fixtures'
import { server, setupMockServer } from '../../test/server'
import { ensureContactInfo, loadContactInfo } from './contactInfo'
import { useChatStore } from '../../store/chatStore'

setupMockServer()
const client = createGreenApiClient(testCredentials)

function mockContact(info: object) {
  let body: unknown
  server.use(
    http.post(apiUrl('getContactInfo'), async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ chatId: '555', name: '', contactName: '', avatar: '', ...info })
    }),
  )
  return () => body
}

describe('loadContactInfo', () => {
  it('берёт имя из записной книжки, фото и контакты', async () => {
    const body = mockContact({
      name: 'Вася',
      contactName: 'Василий Петров',
      avatar: 'https://example.com/v.jpg',
      username: '@vasya',
      phoneNumber: 79991234567,
    })

    await expect(loadContactInfo(client, '555')).resolves.toEqual({
      name: 'Василий Петров',
      avatar: 'https://example.com/v.jpg',
      username: '@vasya',
      phone: '79991234567',
      infoLoaded: true,
    })
    expect(body()).toEqual({ chatId: '555' })
  })

  it('без имени и фото оставляет только известное', async () => {
    mockContact({ phoneNumber: 0 })

    await expect(loadContactInfo(client, '555')).resolves.toEqual({
      name: undefined,
      avatar: undefined,
      username: undefined,
      phone: undefined,
      infoLoaded: true,
    })
  })
})

describe('ensureContactInfo', () => {
  const INSTANCE = testCredentials.idInstance

  it('загружает данные один раз, даже при одновременных вызовах', async () => {
    let calls = 0
    server.use(
      http.post(apiUrl('getContactInfo'), () => {
        calls++
        return HttpResponse.json({ chatId: '555', name: 'Мария', contactName: '', avatar: '' })
      }),
    )
    useChatStore.getState().upsertChat(INSTANCE, { chatId: '555', name: '+7 999' })

    await Promise.all([
      ensureContactInfo(client, INSTANCE, '555'),
      ensureContactInfo(client, INSTANCE, '555'),
    ])
    await ensureContactInfo(client, INSTANCE, '555')

    expect(calls).toBe(1)
    expect(useChatStore.getState().byInstance[INSTANCE].chats['555']).toMatchObject({
      name: 'Мария',
      infoLoaded: true,
    })
  })

  it('ничего не делает для неизвестного чата', async () => {
    await expect(ensureContactInfo(client, INSTANCE, 'нет')).resolves.toBeUndefined()
  })
})
