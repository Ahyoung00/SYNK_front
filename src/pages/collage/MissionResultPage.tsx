import { useEffect, useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useMissionStore } from '@/store/missionStore'
import { albumApi } from '@/services/api/endpoints'
import { CollageGrid } from '@/components/collage/CollageGrid'
import type { CollageCellData } from '@/utils/mockCollage'
import { collageItemToCells } from '@/utils/mockCollage'
import type { CollageItem } from '@/types'
import { ROUTES } from '@/constants'
import styles from './MissionResultPage.module.css'


function todayString(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export default function MissionResultPage() {
  const navigate     = useNavigate()
  const location     = useLocation()
  const { missionId: missionIdParam } = useParams<{ missionId: string }>()
  const active       = useMissionStore((s) => s.active)
  const clearMission = useMissionStore((s) => s.clearMission)

  const [cells, setCells]         = useState<CollageCellData[]>([])
  const [collageVideoUrl, setCollageVideoUrl] = useState<string | null>(null)
  const [missionTitle, setMissionTitle]       = useState<string>('미션 결과')
  const [showStats, setShowStats] = useState(false)
  const [loadError, setLoadError] = useState(false)

  // 셀 데이터 초기화 — collage API로부터 실제 영상 URL 로드
  useEffect(() => {
    const navState = location.state as { roomId?: number; date?: string } | null
    const stateRoomId = navState?.roomId
    // location.state.roomId 우선, 없으면 active store fallback
    const roomId = stateRoomId ?? active?.room.id
    const missionId = Number(missionIdParam) || active?.mission.id
    // 앨범에서 진입 시 해당 날짜로 조회 (없으면 오늘)
    const date     = navState?.date ?? todayString()

    console.log('[MissionResultPage] roomId:', roomId, 'missionId:', missionId, 'date:', date)

    if (!roomId) {
      setLoadError(true)
      setTimeout(() => setShowStats(true), 400)
      return
    }

    albumApi.getCollages(roomId, date)
      .then((res) => {
        const collages: CollageItem[] = res.data ?? []
        console.log('[MissionResultPage] collages:', collages)
        // 특정 미션 미지정/미발견 시 최신(가장 늦게 시작된) 미션 결과로
        const latest = [...collages].sort(
          (a, b) => new Date(b.missionStartAt ?? 0).getTime() - new Date(a.missionStartAt ?? 0).getTime()
        )[0]
        const target = missionId
          ? collages.find((c) => c.missionId === missionId) ?? latest
          : latest

        if (target) {
          setCollageVideoUrl(target.collageVideoUrl)
          setMissionTitle(target.missionTitle)
          setCells(collageItemToCells(target))
        } else {
          setLoadError(true)
        }
      })
      .catch((e) => { console.error('[MissionResultPage] getCollages error:', e); setLoadError(true) })
      .finally(() => setTimeout(() => setShowStats(true), 400))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleBack() {
    // 앨범에서 "SYNK 보기"로 진입한 경우 → 앨범으로 돌아가기
    if ((location.state as { returnTo?: string } | null)?.returnTo === 'album') {
      navigate(-1)
      return
    }
    // 일반 미션 완료 후 진입한 경우 → 홈으로 (미션 히스토리 정리)
    navigate(ROUTES.HOME, { replace: true })
    clearMission()
  }

  async function handleSave() {
    if (!collageVideoUrl) {
      alert('아직 콜라주 영상이 준비되지 않았어요.')
      return
    }
    const fileName = `synk_${new Date().toISOString().slice(0, 10)}.mp4`
    try {
      // S3 등 cross-origin URL은 a[download]가 무시되므로 Blob으로 받아 저장
      const res = await fetch(collageVideoUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      // 다운로드 실패 시 새 탭으로 열어 사용자가 직접 저장하도록 폴백
      window.open(collageVideoUrl, '_blank')
    }
  }

  // ── 통계 계산 ──────────────────────────────────────────────────────────────
  const submittedCount = cells.filter((c) => c.status === 'submitted').length
  const totalCount = cells.length
  const participationRate = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0

  // 마지막 제출 시각 기준 걸린 시간
  const missionStartAt = cells[0]?.missionStartAt
  const lastSubmitAt = cells
    .filter((c) => c.submittedAt)
    .map((c) => new Date(c.submittedAt!).getTime())
    .sort((a, b) => b - a)[0]

  const completionTime = missionStartAt && lastSubmitAt
    ? Math.floor((lastSubmitAt - new Date(missionStartAt).getTime()) / 1000)
    : null

  function formatCompletionTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  }

  // ── 미션 정보 ──────────────────────────────────────────────────────────────
  const roomName = active?.room.name ?? ''
  const missionDate = missionStartAt
    ? new Date(missionStartAt).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : new Date().toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })

  if (loadError) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 12, color: 'var(--color-text-muted)' }}>
      <p>아직 콜라주 결과가 없어요</p>
      <button onClick={() => navigate(-1)} style={{ color: 'var(--color-primary)', fontWeight: 700 }}>돌아가기</button>
    </div>
  )

  if (cells.length === 0) return null

  return (
    <div className={styles.page}>

      {/* ── 헤더 ──────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={handleBack} aria-label="뒤로">
          ←
        </button>
        <div className={styles.headerText}>
          <h2 className={styles.missionTitle}>{missionTitle}</h2>
          <p className={styles.meta}>{roomName} · {missionDate}</p>
        </div>
      </div>

      {/* ── 콜라주 그리드 ─────────────────────────────────────────────────── */}
      <div className={styles.collageArea}>
        <CollageGrid cells={cells} />

        {/* 인원 수 배지 */}
        <div className={styles.countBadge}>
          {submittedCount}/{totalCount}명 참여
        </div>
      </div>

      {/* ── 통계 + 버튼 ───────────────────────────────────────────────────── */}
      <div className={[styles.footer, showStats ? styles.footerVisible : ''].join(' ')}>

        {/* 통계 행 */}
        <div className={styles.statsRow}>
          <StatItem
            label="참여율"
            value={`${participationRate}%`}
            highlight={participationRate === 100}
          />
          <div className={styles.statDivider} />
          <StatItem
            label="걸린 시간"
            value={completionTime != null ? formatCompletionTime(completionTime) : '—'}
          />
          <div className={styles.statDivider} />
          <StatItem
            label="제출"
            value={`${submittedCount}/${totalCount}명`}
          />
        </div>

        {/* 버튼 행 */}
        <div className={styles.btnRow}>
          <button className={styles.saveBtn} onClick={handleSave}>
            저장하기
          </button>
        </div>

        {/* 홈으로 */}
        <button className={styles.homeBtn} onClick={() => { clearMission(); navigate(ROUTES.HOME, { replace: true }) }}>
          홈으로 돌아가기
        </button>
      </div>

    </div>
  )
}

// ── StatItem ──────────────────────────────────────────────────────────────────

function StatItem({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className={styles.statItem}>
      <span className={styles.statLabel}>{label}</span>
      <span
        className={styles.statValue}
        style={highlight ? { color: 'var(--color-timer-safe)' } : undefined}
      >
        {value}
      </span>
    </div>
  )
}
