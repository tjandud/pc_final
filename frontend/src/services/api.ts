import type { ApiResponse, HealthStatus } from '@/types/api'

/**
 * Thin fetch client. Calls relative /api/* only (proxied by Vite in dev).
 * No API keys or secrets are ever handled in the frontend.
 */
export class ApiClientError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api/v1${path}`, {
      headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
      ...init,
    })
  } catch {
    throw new ApiClientError(0, 'NETWORK_ERROR', '서버에 연결할 수 없습니다.')
  }

  let body: ApiResponse<T>
  try {
    body = (await res.json()) as ApiResponse<T>
  } catch {
    throw new ApiClientError(res.status, 'INVALID_RESPONSE', '서버 응답을 해석할 수 없습니다.')
  }

  if (!body.success) {
    throw new ApiClientError(res.status, body.error.code, body.error.message)
  }
  return body.data
}

export const api = {
  health: () => request<HealthStatus>('/health'),
}
