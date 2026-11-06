import type {
  AdminProductUpsertInput,
  ApiMeta,
  ApiResponse,
  BrandRecord,
  CategoryRecord,
  CategorySlug,
  CompareResult,
  DataAuditSummary,
  HealthStatus,
  ProductDetailRecord,
  ProductQueryParams,
  ProductSpecificationsBundle,
  ProductSummaryRecord,
  ProductVariantRecord,
  SpecDefinitionRecord,
} from '@/types/api'

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

async function requestWithMeta<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; meta?: ApiMeta }> {
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
  return { data: body.data, meta: body.meta }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await requestWithMeta<T>(path, init)
  return data
}

function toQueryString(params: Record<string, string | number | undefined | null>): string {
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      usp.set(k, String(v))
    }
  }
  const str = usp.toString()
  return str ? `?${str}` : ''
}

export const api = {
  health: () => request<HealthStatus>('/health'),
  brands: () => request<BrandRecord[]>('/brands'),
  categories: () => request<CategoryRecord[]>('/categories'),

  categorySpecDefinitions: (slug: CategorySlug) =>
    request<{ category: CategoryRecord; definitions: SpecDefinitionRecord[] }>(
      `/categories/${encodeURIComponent(slug)}/spec-definitions`,
    ),

  products: (params: ProductQueryParams = {}) =>
    requestWithMeta<ProductSummaryRecord[]>(
      `/products${toQueryString({
        q: params.q,
        brand: params.brand,
        category: params.category,
        series: params.series,
        year: params.year,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        sort: params.sort,
        page: params.page,
        limit: params.limit,
      })}`,
    ),

  productDetail: (slug: string) => request<ProductDetailRecord>(`/products/${encodeURIComponent(slug)}`),

  productVariants: (slug: string) =>
    request<ProductVariantRecord[]>(`/products/${encodeURIComponent(slug)}/variants`),

  productSpecs: (slug: string, variantId?: string | null) =>
    request<ProductSpecificationsBundle>(
      `/products/${encodeURIComponent(slug)}/specs${toQueryString({ variantId: variantId ?? undefined })}`,
    ),

  compare: (items: string[]) =>
    request<CompareResult>(`/compare${toQueryString({ items: items.join(',') })}`),

  adminAudit: () => request<DataAuditSummary>('/admin/audit'),

  adminUpsertProduct: (input: AdminProductUpsertInput) =>
    request<ProductDetailRecord>('/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),

  adminDeleteProduct: (slug: string) =>
    request<{ deleted: boolean; slug: string }>(`/admin/products/${encodeURIComponent(slug)}`, {
      method: 'DELETE',
    }),
}
