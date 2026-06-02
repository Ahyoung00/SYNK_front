import { API_BASE_URL, STORAGE_KEYS } from '@/constants'
import type { ApiResponse } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight fetch wrapper
// 실제 API 응답 형식: { success: boolean, data: T, message: string }
// ─────────────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * localStorage에서 실제 JWT 토큰만 추출
 * zustand persist가 전체 상태 JSON을 같은 키로 저장하므로
 * raw string이 아닌 state.token 필드를 파싱해서 꺼낸다
 */
function getAuthToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { state?: { token?: string | null } }
    return parsed?.state?.token ?? null
  } catch {
    return null
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = getAuthToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })

  // HTTP 레벨 에러 처리
  if (res.status === 401) {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
    window.location.replace('/login')
    throw new ApiError(401, 'Unauthorized')
  }

  if (!res.ok) {
    // 백엔드가 에러 응답도 { success, data, message } 형식으로 내려줄 수 있음
    let message = res.statusText
    try {
      const body = await res.json() as Partial<ApiResponse<unknown>>
      message = body.message ?? message
    } catch {
      // 파싱 실패 시 statusText 사용
    }
    throw new ApiError(res.status, message)
  }

  const json = await res.json() as ApiResponse<T>

  // 애플리케이션 레벨 에러 처리 (HTTP 200이지만 success: false인 경우)
  if (json.success === false) {
    throw new ApiError(res.status, json.message || 'Request failed')
  }

  return json
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

  /** 비디오/이미지 multipart 업로드 */
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

    const json = await res.json() as ApiResponse<T>
    if (json.success === false) throw new ApiError(res.status, json.message)
    return json
  },
}
