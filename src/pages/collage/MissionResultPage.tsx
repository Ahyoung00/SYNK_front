import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMissionStore } from '@/store/missionStore'
import { useAuthStore } from '@/store/authStore'
import { CollageGrid } from '@/components/collage/CollageGrid'
import { buildCollageCells, createMockCells } from '@/utils/mockCollage'
import type { CollageCellData } from '@/utils/mockCollage'
import { ROUTES } from '@/constants'
import styles from './MissionResultPage.module.css'

export default function MissionResultPage() {
  const navigate     = useNavigate()
  const location     = useLocation()
  const active       = useMissionStore((s) => s.active)
  const clearMission = useMissionStore((s) => s.clearMission)
  const previewUrl   = useMissionStore((s) => s.previewUrl)
  const myUser       = useAuthStore((s) => s.user)

  const [cells, setCells] = useState<CollageCellData[]>([])
  const [showStats, setShowStats] = useState(false)

  const isAlbumView = (location.state as { returnTo?: string } | null)?.returnTo === 'album'

  // 셀 데이터 초기화
  useEffect(() => {
    let built: CollageCellData[]

    if (active) {
      const startAt = active.mission.targeted_at
      built = buildCollageCells(active.participations, startAt)

      // 현재 세션에서 녹화한 영상(previewUrl)을 내 셀에 주입
      // 앨범 뷰에서는 handleViewCollage에서 미션별로 정확하게 이미 처리했으므로 여기서는 주입 안 함
      if (previewUrl && myUser && !isAlbumView) {
        built = built.map((c) => {
          const uid = (c.user as unknown as { userId: number }).userId
          return uid === myUser.userId ? { ...c, videoUrl: previewUrl } : c
        })
      }
    } else {
      built = createMockCells()
    }

    setCells(built)

    // 통계 영역은 0.4초 후 fade-in
    const t = setTimeout(() => setShowStats(true), 400)
    return () => clearTimeout(t)
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

  function handleReplay() {
    // 모든 video를 currentTime=0으로 리셋
    document.querySelectorAll<HTMLVideoElement>('video').forEach((v) => {
      v.currentTime = 0
      v.play().catch(() => {})
    })
  }

  function handleSave() {
    // 웹 환경: 녹화한 영상 blob이 있으면 다운로드, 없으면 안내
    if (previewUrl) {
      const a = document.createElement('a')
      a.href = previewUrl
      a.download = `synk_${new Date().toISOString().slice(0, 10)}.webm`
      a.click()
    } else {
      alert('실제 기기에서는 갤러리에 저장됩니다.\n(웹 환경에서는 이번 세션의 영상만 저장할 수 있어요)')
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
  const missionTitle = active?.mission.template?.title ?? '지금 네 표정 그대로 찍기'
  const roomName = active?.room.name ?? '새벽반'
  const missionDate = missionStartAt
    ? new Date(missionStartAt).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : new Date().toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })

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
          <button className={styles.replayBtn} onClick={handleReplay}>
            다시보기
          </button>
          <button className={styles.saveBtn} onClick={handleSave}>
            저장하기
          </button>
        </div>

        {/* 홈으로 */}
        <button className={styles.homeBtn} onClick={handleBack}>
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
