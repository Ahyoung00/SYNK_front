import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useMissionStore } from '@/store/missionStore'
import { albumApi, roomApi } from '@/services/api/endpoints'
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
  // 방 전체 멤버 수 — 참여율/제출 분모 (콜라주 participants엔 미제출자가 빠질 수 있어 방 기준 사용)
  const [roomMemberCount, setRoomMemberCount] = useState<number | null>(null)

  useEffect(() => {
    const navState  = location.state as { roomId?: number; date?: string; collageData?: CollageItem & { totalMembers?: number } } | null
    const roomId    = navState?.roomId ?? active?.room.id
    const missionId = Number(missionIdParam) || active?.mission.id
    const date      = navState?.date ?? todayString()

    // 알림 딥링크: getMissionCollage 응답을 직접 받은 경우 API 재호출 없이 바로 사용
    if (navState?.collageData) {
      const cd = navState.collageData
      setCollage(cd)
      setMissionTitle(cd.missionTitle)
      if (cd.totalMembers != null) setRoomMemberCount(cd.totalMembers)
      setShowStats(true)
      return
    }

    if (!roomId) {
      setLoadError(true)
      setTimeout(() => setShowStats(true), 400)
      return
    }

    // 방 멤버 수 조회 (참여율/제출 분모)
    roomApi.getRoom(roomId)
      .then((res) => setRoomMemberCount(res.data.currentMembers ?? res.data.members?.length ?? null))
      .catch(() => {})

    let cancelled = false
    let timer: number | undefined
    const startedAt = Date.now()
    const MAX_WAIT = 180_000 // 콜라주 영상 생성 대기 최대 3분

    async function load() {
      try {
        const res = await albumApi.getCollages(roomId!, date)
        const collages: CollageItem[] = res.data ?? []
        const latest = [...collages].sort(
          (a, b) => new Date(b.missionStartAt ?? 0).getTime() - new Date(a.missionStartAt ?? 0).getTime()
        )[0]
        const target = missionId
          ? collages.find((c) => c.missionId === missionId) ?? latest
          : latest

        if (target) {
          if (cancelled) return
          setCollage(target)
          setMissionTitle(target.missionTitle)
          setShowStats(true)
          // 영상이 아직 없으면 생성될 때까지 폴링 (processingState 표시 유지)
          if (!target.collageVideoUrl && Date.now() - startedAt < MAX_WAIT) {
            timer = window.setTimeout(load, 3000)
          }
          return
        }
        // 콜라주 레코드 자체가 아직 없음 → 생성 대기 (최대 3분)
        if (Date.now() - startedAt < MAX_WAIT) {
          timer = window.setTimeout(load, 3000)
        } else if (!cancelled) {
          setLoadError(true)
          setShowStats(true)
        }
      } catch {
        if (cancelled) return
        if (Date.now() - startedAt < MAX_WAIT) {
          timer = window.setTimeout(load, 3000)
        } else {
          setLoadError(true)
          setShowStats(true)
        }
      }
    }
    load()
    return () => { cancelled = true; if (timer) window.clearTimeout(timer) }
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
  // 실제 제출 여부는 submittedAt/videoUrl 존재로 판단 (BE state가 미제출자도 done으로 주는 경우 대비)
  const hasSubmitted = (p: { state?: string; submittedAt?: string | null; videoUrl?: string | null }) =>
    p.submittedAt != null || !!p.videoUrl
  const participants    = collage?.participants ?? []
  const submittedCount  = participants.filter(hasSubmitted).length
  // 분모: 방 멤버 수 우선(미제출자 포함). 콜라주 participants가 더 많으면(이탈 등) 그 값 사용
  const totalCount      = Math.max(roomMemberCount ?? 0, participants.length)
  const participationRate = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0

  const MISSION_MAX_SEC = 5 * 60 // 미션 제한 시간 5분
  const allSubmitted = submittedCount === totalCount && totalCount > 0

  const missionStartAt = collage?.missionStartAt ?? null
  // 실제 제출한 사람의 submittedAt만 사용
  const lastSubmitAt = participants
    .filter((p) => hasSubmitted(p) && p.submittedAt)
    .map((p) => new Date(p.submittedAt!).getTime())
    .sort((a, b) => b - a)[0]

  const completionTime = allSubmitted && missionStartAt && lastSubmitAt
    ? Math.min(
        Math.floor((lastSubmitAt - new Date(missionStartAt).getTime()) / 1000),
        MISSION_MAX_SEC,
      )
    : allSubmitted ? null : MISSION_MAX_SEC // 미제출자 있으면 5분 고정

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
          <StatItem label="참여율" value={`${participationRate}%`} rate={participationRate} />
          <div className={styles.statDivider} />
          <StatItem label="걸린 시간" value={completionTime != null ? formatCompletionTime(completionTime) : '—'} />
          <div className={styles.statDivider} />
          <StatItem label="제출" value={`${submittedCount}/${totalCount}명`} rate={participationRate} />
        </div>

        <button className={styles.homeBtn} onClick={() => { clearMission(); navigate(ROUTES.HOME, { replace: true }) }}>
          홈으로 돌아가기
        </button>
      </div>

    </div>
  )
}

function StatItem({ label, value, rate }: { label: string; value: string; rate?: number }) {
  const color = rate == null ? undefined
    : rate >= 100 ? '#4ADE80'
    : rate >= 67  ? '#46D7FF'
    : rate >= 34  ? '#FFA040'
    : '#FF5C6E'
  return (
    <div className={styles.statItem}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue} style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  )
}
