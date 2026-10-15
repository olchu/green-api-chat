import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'

export const server = setupServer()

/** Подключает MSW к тестовому файлу; незамоканные запросы считаются ошибкой */
export function setupMockServer() {
  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())
}
