import { API_BASE_URL, STORAGE_KEYS } from '@/constants'
import type { ApiResponse } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight fetch wrapper for Spring Boot REST API
// ─────────────────────────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })

  // Auto-refresh on 401 — placeholder; wire up real refresh logic here
  if (res.status === 401) {
    // TODO: call refreshToken endpoint, update store, retry
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
    window.location.replace('/login')
    throw new ApiError(401, 'Unauthorized')
  }

  if (!res.ok) {
    const body = await res.text()
    throw new ApiError(res.status, body || res.statusText)
  }

  return res.json() as Promise<ApiResponse<T>>
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body != null ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body != null ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body != null ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  /** Upload binary (video/image) via multipart */
  upload: async <T>(path: string, file: Blob, fieldName = 'file'): Promise<ApiResponse<T>> => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
    const form = new FormData()
    form.append(fieldName, file)

    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })

    if (!res.ok) throw new ApiError(res.status, res.statusText)
    return res.json() as Promise<ApiResponse<T>>
  },
}
