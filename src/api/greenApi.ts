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
  SetSettingsRequest,
  SetSettingsResponse,
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
  query?: Record<string, string>
  signal?: AbortSignal
}

/** Убирает пробелы, скопированные вместе со значениями, и слэш в конце apiUrl */
export function normalizeCredentials({
  apiUrl,
  idInstance,
  apiTokenInstance,
}: Credentials): Credentials {
  return {
    apiUrl: apiUrl.trim().replace(/\/+$/, ''),
    idInstance: idInstance.trim(),
    apiTokenInstance: apiTokenInstance.trim(),
  }
}

export function buildUrl(
  { apiUrl, idInstance, apiTokenInstance }: Credentials,
  method: string,
  { pathSuffix, query }: Pick<RequestOptions, 'pathSuffix' | 'query'> = {},
): string {
  let url = `${apiUrl}/waInstance${idInstance}/${method}/${apiTokenInstance}`
  if (pathSuffix) url += `/${pathSuffix}`
  if (query) url += `?${new URLSearchParams(query)}`
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
    const hasBody = body !== undefined

    let response: Response
    try {
      response = await fetch(buildUrl(credentials, method, options), {
        method: httpMethod,
        headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
        body: hasBody ? JSON.stringify(body) : undefined,
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

    /** Перезапускает инстанс; настройки применяются в течение 5 минут */
    setSettings: (body: SetSettingsRequest) =>
      request<SetSettingsResponse>('setSettings', { httpMethod: 'POST', body }),

    getAccountSettings: (signal?: AbortSignal) =>
      request<AccountSettings>('getAccountSettings', { signal }),

    checkAccount: (body: CheckAccountRequest) =>
      request<CheckAccountResponse>('checkAccount', { httpMethod: 'POST', body }),

    sendMessage: (body: SendMessageRequest) =>
      request<SendMessageResponse>('sendMessage', { httpMethod: 'POST', body }),

    receiveNotification: (receiveTimeout: number, signal?: AbortSignal) =>
      request<ReceiveNotificationResponse>('receiveNotification', {
        query: { receiveTimeout: String(receiveTimeout) },
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
