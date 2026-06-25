import type { MemberParticipation, CollageItem } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// 개발용 mock 콜라주 셀 데이터
// ─────────────────────────────────────────────────────────────────────────────

export interface CollageCellData {
  user: { id: number; name: string; profile_image?: string }
  /** 실제 비디오 URL (없으면 gradient placeholder) */
  videoUrl?: string
  /** 미션 시작 시각 (ISO) */
  missionStartAt: string
  /** 제출 시각 (ISO) — missed면 undefined */
  submittedAt?: string
  status: 'submitted' | 'missed'
  /** dev 전용 배경 그라데이션 */
  gradient: string
}

/** 멤버 참여 배열 → 콜라주 셀 배열로 변환 */
export function buildCollageCells(
  participations: MemberParticipation[],
  missionStartAt: string,
): CollageCellData[] {
  return participations.map((p, i) => ({
    user: { id: p.user.userId, name: p.user.name, profile_image: p.user.profileImage ?? undefined },
    videoUrl:      p.submission?.video_url ?? undefined,
    missionStartAt,
    // 실제 submitted_at 사용 — mock 오프셋 제거
    submittedAt:   p.state === 'done' && p.submission?.submitted_at
      ? p.submission.submitted_at
      : undefined,
    status:        p.state === 'done' ? 'submitted' : 'missed',
    gradient:      CELL_GRADIENTS[i % CELL_GRADIENTS.length],
  }))
}

/** CollageItem(API 응답) → CollageCellData[] 변환 — 모든 화면에서 공유 */
export function collageItemToCells(item: CollageItem): CollageCellData[] {
  return item.participants.map((p, i) => ({
    user: { id: p.userId, name: p.name, profile_image: p.profileImage ?? undefined },
    videoUrl:       p.videoUrl ?? undefined,
    missionStartAt: item.missionStartAt ?? new Date().toISOString(),
    submittedAt:    p.submittedAt ?? undefined,
    status:         p.state === 'done' ? 'submitted' : 'missed',
    gradient:       CELL_GRADIENTS[i % CELL_GRADIENTS.length],
  }))
}

/** mock 미션 참여자 (결과 화면 직접 진입용) */
export function createMockCells(): CollageCellData[] {
  const startAt = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const offsets = [47, 123, 198, 215, 289]
  const members = ['유현', '아영', '지민', '수현', '대주']

  return members.map((name, i) => ({
    user: { id: i + 1, name, profile_image: undefined },
    videoUrl: undefined,
    missionStartAt: startAt,
    submittedAt: new Date(new Date(startAt).getTime() + offsets[i] * 1000).toISOString(),
    status: 'submitted' as const,
    gradient: CELL_GRADIENTS[i],
  }))
}

// ── 그라데이션 팔레트 (mock 전용) ─────────────────────────────────────────────
const CELL_GRADIENTS = [
  'linear-gradient(160deg, #1a1a3e 0%, #0f3460 100%)',
  'linear-gradient(160deg, #2d1b69 0%, #11998e 100%)',
  'linear-gradient(160deg, #4a0942 0%, #b91c5c 100%)',
  'linear-gradient(160deg, #0f2027 0%, #2c5364 100%)',
  'linear-gradient(160deg, #1f1c2c 0%, #6c63ff 100%)',
  'linear-gradient(160deg, #16213e 0%, #0f3460 50%, #533483 100%)',
  'linear-gradient(160deg, #2c003e 0%, #8b0000 100%)',
  'linear-gradient(160deg, #003b36 0%, #1a7a4a 100%)',
  'linear-gradient(160deg, #1a0533 0%, #3a0ca3 100%)',
  'linear-gradient(160deg, #1e3a5f 0%, #2e86ab 100%)',
]

/** 경과 시간 포맷: "MM:SS" */
export function formatElapsed(startIso: string, endIso: string): string {
  const elapsed = Math.max(
    0,
    Math.floor((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000),
  )
  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 전체 grid 열 수 결정 */
export function getGridCols(count: number): number {
  if (count <= 1) return 1
  if (count <= 4) return 2
  if (count <= 9) return 3
  return 4
}
