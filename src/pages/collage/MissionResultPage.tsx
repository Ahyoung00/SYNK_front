import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useMissionStore } from '@/store/missionStore'
import { albumApi } from '@/services/api/endpoints'
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
  const videoRef     = useRef<HTMLVideoElement>(null)

  const [collage, setCollage]       = useState<CollageItem | null>(null)
  const [missionTitle, setMissionTitle] = useState<string>('미션 결과')
  const [showStats, setShowStats]   = useState(false)
  const [loadError, setLoadError]   = useState(false)

  useEffect(() => {
    const navState  = location.state as { roomId?: number; date?: string } | null
    const roomId    = navState?.roomId ?? active?.room.id
    const missionId = Number(missionIdParam) || active?.mission.id
    const date      = navState?.date ?? todayString()

    if (!roomId) {
      setLoadError(true)
      setTimeout(() => setShowStats(true), 400)
      return
    }

    albumApi.getCollages(roomId, date)
      .then((res) => {
        const collages: CollageItem[] = res.data ?? []
        const latest = [...collages].sort(
          (a, b) => new Date(b.missionStartAt ?? 0).getTime() - new Date(a.missionStartAt ?? 0).getTime()
        )[0]
        const target = missionId
          ? collages.find((c) => c.missionId === missionId) ?? latest
          : latest

        if (target) {
          setCollage(target)
          setMissionTitle(target.missionTitle)
        } else {
          setLoadError(true)
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => setTimeout(() => setShowStats(true), 400))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleBack() {
    if ((location.state as { returnTo?: string } | null)?.returnTo === 'album') {
      navigate(-1)
      return
    }
    navigate(ROUTES.HOME, { replace: true })
    clearMission()
  }

  // ── 통계 계산 ──────────────────────────────────────────────────────────────
  const participants    = collage?.participants ?? []
  const submittedCount  = participants.filter((p) => p.state === 'done').length
  const totalCount      = participants.length
  const participationRate = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0

  const missionStartAt = collage?.missionStartAt ?? null
  const lastSubmitAt   = participants
    .filter((p) => p.submittedAt)
    .map((p) => new Date(p.submittedAt!).getTime())
    .sort((a, b) => b - a)[0]

  const completionTime = missionStartAt && lastSubmitAt
    ? Math.floor((lastSubmitAt - new Date(missionStartAt).getTime()) / 1000)
    : null

  function formatCompletionTime(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}m ${String(s % 60).padStart(2, '0')}s`
  }

  const roomName   = active?.room.name ?? ''
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

  if (!collage) return null

  return (
    <div className={styles.page}>

      {/* ── 헤더 ──────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={handleBack} aria-label="뒤로">←</button>
        <div className={styles.headerText}>
          <h2 className={styles.missionTitle}>{missionTitle}</h2>
          <p className={styles.meta}>{roomName} · {missionDate}</p>
        </div>
      </div>

      {/* ── 콜라주 영상 ───────────────────────────────────────────────────── */}
      <div className={styles.collageArea}>
        {collage.collageVideoUrl ? (
          <video
            ref={videoRef}
            className={styles.collageVideo}
            src={collage.collageVideoUrl}
            controls
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <div className={styles.processingState}>
            <span className={styles.processingIcon}>🎬</span>
            <p className={styles.processingText}>결과를 만드는 중…</p>
            <p className={styles.processingSubText}>잠시 후 다시 확인해주세요</p>
          </div>
        )}

        <div className={styles.countBadge}>
          {submittedCount}/{totalCount}명 참여
        </div>
      </div>

      {/* ── 통계 + 홈으로 ─────────────────────────────────────────────────── */}
      <div className={[styles.footer, showStats ? styles.footerVisible : ''].join(' ')}>
        <div className={styles.statsRow}>
          <StatItem label="참여율" value={`${participationRate}%`} highlight={participationRate === 100} />
          <div className={styles.statDivider} />
          <StatItem label="걸린 시간" value={completionTime != null ? formatCompletionTime(completionTime) : '—'} />
          <div className={styles.statDivider} />
          <StatItem label="제출" value={`${submittedCount}/${totalCount}명`} />
        </div>

        <button className={styles.homeBtn} onClick={() => { clearMission(); navigate(ROUTES.HOME, { replace: true }) }}>
          홈으로 돌아가기
        </button>
      </div>

    </div>
  )
}

function StatItem({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={styles.statItem}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue} style={highlight ? { color: 'var(--color-timer-safe)' } : undefined}>
        {value}
      </span>
    </div>
  )
}
