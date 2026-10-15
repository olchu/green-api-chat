import type {
  AccountSettings,
  CheckAccountRequest,
  CheckAccountResponse,
  Credentials,
  DeleteNotificationResponse,
  GetStateInstanceResponse,
  InstanceSettings,
  ReceiveNotificationResponse,
  SendMessageRequest,
  SendMessageResponse,
} from './types'

/** status 0 — запрос не дошёл до сервера (нет сети, CORS) */
export class GreenApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'GreenApiError'
    this.status = status
    this.body = body
  }
}

interface RequestOptions {
  httpMethod?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  pathSuffix?: string
  query?: Record<string, string | number>
  signal?: AbortSignal
}

export function buildUrl(
  { apiUrl, idInstance, apiTokenInstance }: Credentials,
  method: string,
  { pathSuffix, query }: Pick<RequestOptions, 'pathSuffix' | 'query'> = {},
): string {
  const base = apiUrl.trim().replace(/\/+$/, '')
  let url = `${base}/waInstance${idInstance.trim()}/${method}/${apiTokenInstance.trim()}`
  if (pathSuffix) url += `/${pathSuffix}`
  if (query) {
    const params = new URLSearchParams(
      Object.entries(query).map(([key, value]) => [key, String(value)]),
    )
    url += `?${params}`
  }
  return url
}

function parseBody(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === 'string' && body) return body
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>
    const data = record.data as Record<string, unknown> | undefined
    for (const value of [record.message, record.description, record.reason, data?.reason]) {
      if (typeof value === 'string' && value) return value
    }
  }
  return fallback
}

export function createGreenApiClient(credentials: Credentials) {
  async function request<T>(method: string, options: RequestOptions = {}): Promise<T> {
    const { httpMethod = 'GET', body, signal } = options

    let response: Response
    try {
      response = await fetch(buildUrl(credentials, method, options), {
        method: httpMethod,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      })
    } catch (error) {
      if (signal?.aborted) throw error
      throw new GreenApiError('Не удалось подключиться к серверу GREEN-API', 0)
    }

    const data = parseBody(await response.text())

    if (!response.ok) {
      throw new GreenApiError(
        extractErrorMessage(data, response.statusText || `HTTP ${response.status}`),
        response.status,
        data,
      )
    }

    // Некоторые методы сообщают об ошибке с кодом 200: { status: false, reason }
    if (data && typeof data === 'object' && (data as { status?: unknown }).status === false) {
      throw new GreenApiError(extractErrorMessage(data, 'Ошибка GREEN-API'), response.status, data)
    }

    return data as T
  }

  return {
    getStateInstance: (signal?: AbortSignal) =>
      request<GetStateInstanceResponse>('getStateInstance', { signal }),

    getSettings: (signal?: AbortSignal) => request<InstanceSettings>('getSettings', { signal }),

    getAccountSettings: (signal?: AbortSignal) =>
      request<AccountSettings>('getAccountSettings', { signal }),

    checkAccount: (body: CheckAccountRequest) =>
      request<CheckAccountResponse>('checkAccount', { httpMethod: 'POST', body }),

    sendMessage: (body: SendMessageRequest) =>
      request<SendMessageResponse>('sendMessage', { httpMethod: 'POST', body }),

    receiveNotification: (receiveTimeout: number, signal?: AbortSignal) =>
      request<ReceiveNotificationResponse>('receiveNotification', {
        query: { receiveTimeout },
        signal,
      }),

    deleteNotification: (receiptId: number, signal?: AbortSignal) =>
      request<DeleteNotificationResponse>('deleteNotification', {
        httpMethod: 'DELETE',
        pathSuffix: String(receiptId),
        signal,
      }),
  }
}

export type GreenApiClient = ReturnType<typeof createGreenApiClient>
