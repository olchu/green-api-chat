import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../../store/authStore'
import { SettingsBanner } from './SettingsBanner'

const base = 'https://4100.api.green-api.com/waInstance4100000001'
const server = setupServer()

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
beforeEach(() => {
  useAuthStore.setState({
    session: {
      credentials: {
        apiUrl: 'https://4100.api.green-api.com',
        idInstance: '4100000001',
        apiTokenInstance: 'token123',
      },
      typeInstance: 'telegram',
      account: null,
    },
  })
})

function mockSettings(settings: object) {
  server.use(
    http.get(`${base}/getSettings/token123`, () =>
      HttpResponse.json({
        webhookUrl: '',
        incomingWebhook: 'yes',
        outgoingMessageWebhook: 'yes',
        outgoingWebhook: 'yes',
        ...settings,
      }),
    ),
  )
}

describe('SettingsBanner', () => {
  it('ничего не показывает при правильных настройках', async () => {
    let requested = false
    server.events.on('request:start', () => {
      requested = true
    })
    mockSettings({})

    const { container } = render(<SettingsBanner />)

    await expect.poll(() => requested).toBe(true)
    expect(container).toBeEmptyDOMElement()
    server.events.removeAllListeners()
  })

  it('показывает проблемы и исправляет настройки', async () => {
    let saved: unknown
    mockSettings({ incomingWebhook: 'no' })
    server.use(
      http.post(`${base}/setSettings/token123`, async ({ request }) => {
        saved = await request.json()
        return HttpResponse.json({ saveSettings: true })
      }),
    )
    render(<SettingsBanner />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Выключены уведомления о входящих сообщениях',
    )

    await userEvent.click(screen.getByRole('button', { name: 'Исправить' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Настройки сохранены')
    expect(saved).toEqual({
      webhookUrl: '',
      incomingWebhook: 'yes',
      outgoingMessageWebhook: 'yes',
      outgoingWebhook: 'yes',
    })
  })

  it('сообщает об ошибке сохранения', async () => {
    mockSettings({ webhookUrl: 'https://example.com' })
    server.use(
      http.post(`${base}/setSettings/token123`, () => new HttpResponse(null, { status: 500 })),
    )
    render(<SettingsBanner />)

    await userEvent.click(await screen.findByRole('button', { name: 'Исправить' }))

    expect(await screen.findByText(/Не удалось сохранить настройки/)).toBeInTheDocument()
  })
})
