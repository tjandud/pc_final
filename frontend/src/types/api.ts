/** Shared API envelope types (mirror backend/src/utils/apiResponse.ts). */
export interface ApiMeta {
  page?: number
  limit?: number
  total?: number
}

export interface ApiSuccess<T> {
  success: true
  data: T
  meta?: ApiMeta
}

export interface ApiFailure {
  success: false
  error: { code: string; message: string; details?: unknown }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export interface HealthStatus {
  status: 'ok'
  service: string
  time: string
  config: {
    techspecs: { credentialsConfigured: boolean; liveCallEnabled: boolean }
    supabase: { configured: boolean }
  }
}

export type CategorySlug = 'smartphone' | 'tablet' | 'smartwatch'
export type BrandSlug = 'apple' | 'samsung'
