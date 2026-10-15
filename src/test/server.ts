import { delay, http } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { apiUrl } from './fixtures'

// По умолчанию очередь уведомлений пуста и long-poll висит, пока его не отменят —
// как настоящий receiveNotification. Тесты поллера переопределяют это через server.use
export const server = setupServer(
  http.get(apiUrl('receiveNotification'), async () => {
    await delay('infinite')
  }),
)

/** Подключает MSW к тестовому файлу; незамоканные запросы считаются ошибкой */
export function setupMockServer() {
  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())
}
