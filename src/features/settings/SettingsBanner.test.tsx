import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { beforeEach, describe, expect, it } from 'vitest'
import { server, setupMockServer } from '../../test/server'
import { apiUrl, testSession } from '../../test/fixtures'
import { useAuthStore } from '../../store/authStore'
import { REQUIRED_SETTINGS } from './instanceSettings'
import { SettingsBanner } from './SettingsBanner'

setupMockServer()
beforeEach(() => {
  useAuthStore.setState({ session: testSession })
})

function mockSettings(settings: object) {
  server.use(
    http.get(apiUrl('getSettings'), () => HttpResponse.json({ ...REQUIRED_SETTINGS, ...settings })),
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
      http.post(apiUrl('setSettings'), async ({ request }) => {
        saved = await request.json()
        return HttpResponse.json({ saveSettings: true })
      }),
    )
    render(<SettingsBanner />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Входящие сообщения')

    await userEvent.click(screen.getByRole('button', { name: 'Включить уведомления' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Настройки сохранены')
    expect(screen.getByText('вкл')).toBeInTheDocument()
    expect(saved).toEqual(REQUIRED_SETTINGS)
  })

  it('сообщает об ошибке сохранения', async () => {
    mockSettings({ webhookUrl: 'https://example.com' })
    server.use(http.post(apiUrl('setSettings'), () => new HttpResponse(null, { status: 500 })))
    render(<SettingsBanner />)

    await userEvent.click(await screen.findByRole('button', { name: 'Включить уведомления' }))

    expect(await screen.findByText(/Не удалось сохранить настройки/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeEnabled()
  })

  it('скрывается по кнопке «Не сейчас»', async () => {
    mockSettings({ incomingWebhook: 'no' })
    render(<SettingsBanner />)

    await userEvent.click(await screen.findByRole('button', { name: 'Не сейчас' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
