import { API_BASE_URL, STORAGE_KEYS } from '@/constants'
import type { ApiResponse } from '@/types'
import { setOnlineStatus } from '@/services/networkStatus'

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

function getRefreshToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { state?: { refreshToken?: string | null } }
    return parsed?.state?.refreshToken ?? null
  } catch {
    return null
  }
}

/** zustand persist JSON 안의 token/refreshToken만 교체해서 다시 저장 */
function updateStoredTokens(token: string, refreshToken?: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
    if (!raw) return
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> }
    if (!parsed.state) parsed.state = {}
    parsed.state.token = token
    if (refreshToken) parsed.state.refreshToken = refreshToken
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, JSON.stringify(parsed))
  } catch {
    // ignore
  }
}

function forceLogout(): never {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
  window.location.replace('/login')
  throw new ApiError(401, 'Unauthorized')
}

// 동시에 401이 여러 개 떠도 refresh 요청은 한 번만 — 진행 중인 Promise 공유
let refreshInFlight: Promise<string> | null = null

/** Refresh Token으로 새 Access Token 발급. 성공 시 새 token 문자열 반환 */
async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight

  const refreshToken = getRefreshToken()
  if (!refreshToken) return Promise.reject(new ApiError(401, 'No refresh token'))

  refreshInFlight = (async () => {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) throw new ApiError(res.status, 'Refresh failed')

    const json = await res.json() as ApiResponse<{ token: string; refreshToken?: string }>
    if (json.success === false || !json.data?.token) {
      throw new ApiError(401, 'Refresh failed')
    }
    updateStoredTokens(json.data.token, json.data.refreshToken)
    return json.data.token
  })()

  try {
    return await refreshInFlight
  } finally {
    refreshInFlight = null
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<ApiResponse<T>> {
  const token = getAuthToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  } catch (e) {
    // fetch 자체가 실패 = 네트워크 도달 불가 → 오프라인
    setOnlineStatus(false)
    throw e
  }
  // 서버가 응답함(에러 응답 포함) → 온라인
  setOnlineStatus(true)

  // HTTP 401: Refresh Token으로 재발급 후 한 번만 재시도
  // 403은 접근 거부(방 멤버 아님 등) — 로그아웃 없이 일반 에러로 처리
  if (res.status === 401) {
    if (isRetry) forceLogout()
    let newToken: string
    try {
      newToken = await refreshAccessToken()
    } catch {
      forceLogout()
    }
    // 새 토큰으로 원 요청 재시도
    const retryHeaders: HeadersInit = {
      ...headers,
      Authorization: `Bearer ${newToken!}`,
    }
    return request<T>(path, { ...options, headers: retryHeaders }, true)
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
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: form,
    })

    if (!res.ok) throw new ApiError(res.status, res.statusText)

    const json = await res.json() as ApiResponse<T>
    if (json.success === false) throw new ApiError(res.status, json.message)
    return json
  },
}
