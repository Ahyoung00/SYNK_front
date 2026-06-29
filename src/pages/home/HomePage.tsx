import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useMissionStore } from '@/store/missionStore'
import { useSettingsStore } from '@/store/settingsStore'
import { missionApi, albumApi, roomApi } from '@/services/api/endpoints'
import type { ActiveMissionItem, ActiveMissionParticipant, ActiveRoom } from '@/types'
import { ROUTES } from '@/constants'
import { toMissionState } from '@/utils/activeMission'
import { CountdownTimer } from '@/components/mission/CountdownTimer'
import AppHeader from '@/components/layout/AppHeader'
import { missionEmoji } from '@/utils/missionVisual'
import styles from './HomePage.module.css'

function todayString(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

// ── 완료 미션 배너 영속화 (미션별 독립, 완료 시점 기준 10분) ──────────────────────
type CompletedMission = {
  roomId: number; missionId: number; missionTitle: string; roomName: string
  memberCount: number; doneCount: number; savedAt: number
}
const COMPLETED_KEY = 'synk_completed_missions'
const DISMISSED_KEY = 'synk_dismissed_mission_ids'
const BANNER_TTL = 10 * 60 * 1000 // 완료 후 10분만 노출

function loadDismissedIds(): number[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as Array<{ id: number; at: number }>
    const valid = arr.filter((d) => Date.now() - d.at <= BANNER_TTL)
    if (valid.length !== arr.length) localStorage.setItem(DISMISSED_KEY, JSON.stringify(valid))
    return valid.map((d) => d.id)
  } catch { return [] }
}

function addDismissedId(id: number) {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    const arr = raw ? (JSON.parse(raw) as Array<{ id: number; at: number }>) : []
    const next = arr.filter((d) => d.id !== id && Date.now() - d.at <= BANNER_TTL)
    next.push({ id, at: Date.now() })
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next))
  } catch {}
}

function loadCompletedMissions(): CompletedMission[] {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as CompletedMission[]
    const dismissed = new Set(loadDismissedIds())
    const valid = arr.filter((m) => Date.now() - m.savedAt <= BANNER_TTL && !dismissed.has(m.missionId))
    if (valid.length !== arr.length) localStorage.setItem(COMPLETED_KEY, JSON.stringify(valid))
    return valid
  } catch { return [] }
}

function saveCompletedMissions(arr: CompletedMission[]) {
  localStorage.setItem(COMPLETED_KEY, JSON.stringify(arr))
}

// ── 방 선택 화면용 헬퍼 ───────────────────────────────────────────────────────

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function timerColor(seconds: number): string {
  if (seconds > 180) return '#60a5fa'  // 파랑
  if (seconds > 60)  return '#4ade80'  // 초록
  return '#f87171'                      // 빨강
}

function missionCardStateClass(
  seconds: number,
  s: { missionCardSafe: string; missionCardWarn: string },
): string {
  if (seconds > 180) return s.missionCardSafe
  if (seconds > 60)  return s.missionCardWarn
  return ''
}

// ── 홈 인라인 미션 카드 ────────────────────────────────────────────────────────

function HomeMissionCard({
  mission,
  myUserId,
  onParticipate,
  onBack,
  onExpire,
  onAllDone,
  onViewWaiting,
}: {
  mission: ActiveMissionItem
  myUserId: number | undefined
  onParticipate: () => void
  onBack?: () => void
  onExpire?: () => void
  onAllDone?: () => void
  onViewWaiting?: () => void
}) {
  const [secondsLeft, setSecondsLeft] = useState(mission.remainingSeconds)

  // poll이 갱신한 remainingSeconds 또는 mission 교체 시 wall-clock 기반 카운트다운 재시작
  useEffect(() => {
    setSecondsLeft(mission.remainingSeconds)
    const startedAt  = Date.now()
    const initialSec = mission.remainingSeconds
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      setSecondsLeft(Math.max(0, initialSec - elapsed))
    }, 1000)
    return () => clearInterval(id)
  }, [mission.id, mission.remainingSeconds])

  const participants = mission.participants ?? []
  const doneCount = participants.filter((p) => p.status === '완료').length
  const allDone   = doneCount >= mission.totalMembers  // 전원 제출 완료
  const isExpired = secondsLeft <= 0                   // 타이머 만료 (전원 완료 별도 처리)
  const iDone     = participants.some((p) => p.userId === myUserId && p.status === '완료')

  // 전원 제출 완료 → 카드 즉시 사라짐 (앨범에 자동 저장됨)
  useEffect(() => {
    if (!allDone) return
    onAllDone?.()
  }, [allDone]) // eslint-disable-line react-hooks/exhaustive-deps

  // 타이머 0 → "미션 완료 보기" 버튼 표시 (expiredIdsRef로 카드 유지)
  useEffect(() => {
    if (!isExpired || !onExpire) return
    onExpire()
  }, [isExpired]) // eslint-disable-line react-hooks/exhaustive-deps

  const cardStateClass = missionCardStateClass(secondsLeft, styles as { missionCardSafe: string; missionCardWarn: string })

  return (
    <div className={[styles.missionCard, cardStateClass].filter(Boolean).join(' ')}>

      {/* ── 뒤로가기 (다중 미션 선택에서 온 경우) ──────────────────────── */}
      {onBack && (
        <button className={styles.missionCardBack} onClick={onBack}>
          ← 다른 방 선택
        </button>
      )}

      {/* ── 상단 배너 ───────────────────────────────────────────────────── */}
      <div className={styles.missionCardHeader}>
        <p className={styles.missionCardRoomBadge}>
          <span className={styles.missionCardBolt}>⚡</span> {mission.roomName}에서 미션이 울렸어요!
        </p>
        <p className={styles.missionCardSub}>5분 안에 참여해야 기록돼요</p>
      </div>

      {/* ── 타이머 ──────────────────────────────────────────────────────── */}
      <div className={styles.missionCardTimer}>
        <CountdownTimer secondsLeft={secondsLeft} size="lg" showLabel />
      </div>

      {/* ── 미션 정보 ────────────────────────────────────────────────────── */}
      <div className={styles.missionCardInfo}>
        <span className={styles.missionCardLabel}>오늘의 미션</span>
        <h2 className={styles.missionCardTitle}>{mission.title}</h2>
        {mission.description && (
          <p className={styles.missionCardDesc}>{mission.description}</p>
        )}
      </div>

      {/* ── 참여 현황 ────────────────────────────────────────────────────── */}
      <div className={styles.missionCardParticipants}>
        <div className={styles.missionCardParticipantsRow}>
          <span className={styles.missionCardParticipantsLabel}>참여 현황</span>
          <span className={styles.missionCardParticipantsCount}>
            {doneCount}/{mission.totalMembers}
          </span>
        </div>
        <div className={styles.missionCardAvatarRow}>
          {participants.map((p) => (
            <ParticipantItem key={p.userId} participant={p} />
          ))}
        </div>
      </div>

      {/* ── 버튼 ─────────────────────────────────────────────────────────── */}
      {isExpired ? (
        <button
          className={styles.missionCardCtaResult}
          onClick={() => onViewWaiting?.()}
        >
          결과 보기 →
        </button>
      ) : allDone ? (
        <div className={styles.missionCardProcessing}>
          <div className={styles.missionCardProcessingSpinner} />
          <span>결과 만드는 중...</span>
        </div>
      ) : iDone ? (
        <div className={styles.missionCardDoneWrap}>
          <button
            className={[styles.missionCardCta, styles.missionCardCtaDone].join(' ')}
            onClick={onViewWaiting}
          >
            ✓ 참여완료
          </button>
        </div>
      ) : (
        <button
          className={styles.missionCardCta}
          onClick={onParticipate}
        >
          {secondsLeft <= 180 ? '지금 참여하기' : '참여하기'}
        </button>
      )}
    </div>
  )
}

// ── 콜라주 생성중 전환 오버레이 (영상 준비될 때까지 유지 → navigate) ───────────

function CollageTransitionOverlay({
  roomId,
  missionId,
  date,
  memberCount,
  onReady,
  onFailed,
}: {
  roomId: number
  missionId: number
  date: string
  memberCount: number
  onReady: () => void
  onFailed: () => void
}) {
  const [progress, setProgress] = useState(0)
  const [failed, setFailed] = useState(false)
  const [participants, setParticipants] = useState<Array<{
    userId: number; name: string; profileImage: string | null
  }>>([])
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  const onFailedRef = useRef(onFailed)
  onFailedRef.current = onFailed

  // 진행 바: 영상 준비 전까지 92%까지 천천히 차오름 (준비되면 100%)
  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => {
      const elapsed = Date.now() - start
      setProgress((prev) => (prev >= 100 ? 100 : Math.min((elapsed / 10000) * 92, 92)))
    }, 80)
    return () => clearInterval(id)
  }, [])

  // 콜라주 영상(collageVideoUrl)이 준비될 때까지 폴링 → 준비되면 onReady()
  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    const startedAt = Date.now()
    const MAX_WAIT = 180_000 // 안전장치: 3분 초과 시 결과 페이지로 이동 (페이지가 생성중 상태 처리)

    async function poll() {
      try {
        const res = await albumApi.getCollages(roomId, date)
        const target = (res.data ?? []).find((c) => c.missionId === missionId)
        if (target?.participants?.length && !cancelled) {
          setParticipants(target.participants.map((p) => ({
            userId: p.userId, name: p.name, profileImage: p.profileImage,
          })))
        }
        if (target?.status === 'FAILED') {
          if (!cancelled) setFailed(true)
          return
        }
        if (target?.collageVideoUrl) {
          if (!cancelled) {
            setProgress(100)
            timer = window.setTimeout(() => onReadyRef.current(), 400)
          }
          return
        }
      } catch { /* 일시적 오류 무시 — 다음 주기 재시도 */ }
      if (cancelled) return
      if (Date.now() - startedAt > MAX_WAIT) {
        setProgress(100)
        timer = window.setTimeout(() => onReadyRef.current(), 400)
        return
      }
      timer = window.setTimeout(poll, 2500)
    }
    poll()
    return () => { cancelled = true; if (timer) window.clearTimeout(timer) }
  }, [roomId, missionId, date])

  const count = memberCount || participants.length

  if (failed) {
    return (
      <div className={styles.processingOverlay}>
        <h2 className={styles.processingTitle} style={{ fontSize: '2rem' }}>😔</h2>
        <h2 className={styles.processingTitle}>콜라주를 만들 수 없어요</h2>
        <p className={styles.processingDesc} style={{ marginTop: 8 }}>
          아무도 미션에 참여하지 않아서<br />콜라주를 생성할 수 없었어요.
        </p>
        <button
          onClick={() => onFailedRef.current()}
          style={{
            marginTop: 32, padding: '12px 28px',
            background: 'var(--grad-action)', color: '#fff',
            borderRadius: 14, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer',
          }}
        >
          홈으로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className={styles.processingOverlay}>
      {/* 텍스트 */}
      <div className={styles.processingTextRow}>
        <h2 className={styles.processingTitle}>콜라주 생성중</h2>
        <span className={styles.processingDots}><i /><i /><i /></span>
      </div>
      <p className={styles.processingDesc}>{count}명의 순간을 한 장으로 엮고 있어요</p>

      {/* 진행 바 */}
      <div className={styles.processingTrack}>
        <div className={styles.processingFill} style={{ width: `${progress}%` }} />
      </div>

      {/* 참여자 아바타 */}
      <div className={styles.processingAvatars}>
        {participants.map((p) => (
          <div key={p.userId} className={styles.processingAvatar}>
            {p.profileImage
              ? <img src={p.profileImage} alt={p.name} className={styles.processingAvatarImg} />
              : <span className={styles.processingAvatarInitial}>{p.name.charAt(0)}</span>
            }
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 전원 미션 완료 배너 ───────────────────────────────────────────────────────

function MissionCompletedBanner({
  missionTitle,
  roomName,
  doneCount,
  memberCount,
  onViewCollage,
}: {
  missionTitle: string
  roomName: string
  doneCount: number
  memberCount: number
  onViewCollage: () => void
}) {
  const emoji = missionEmoji(missionTitle)
  const allDone = doneCount >= memberCount
  return (
    <div className={styles.completedBanner}>
      <div className={styles.completedGlow} />

      {/* 참여 상태 칩 */}
      <div className={styles.completedChipRow}>
        <span className={styles.completedChip}>
          <span className={styles.completedChipDot} />
          {allDone ? '전원 참여 완료' : '미션 종료'}
        </span>
      </div>

      {/* 타이틀 */}
      <h2 className={styles.completedTitle}>오늘의 미션 종료 🎉</h2>
      <p className={styles.completedDesc}>
        {allDone
          ? <>마지막 멤버까지 참여를 마쳤어요.<br />다 같이 만든 콜라주가 도착했어요.</>
          : <>{doneCount}명의 멤버가 참여했어요.<br />콜라주가 도착했어요.</>
        }
      </p>

      {/* 미션 정보 카드 */}
      <div className={styles.completedMissionCard}>
        <div className={styles.completedMissionIcon}>
          <span className={styles.completedMissionEmoji}>{emoji}</span>
        </div>
        <div className={styles.completedMissionInfo}>
          <span className={styles.completedMissionRoom}>오늘의 미션 · {roomName}</span>
          <span className={styles.completedMissionTitle}>{missionTitle}</span>
        </div>
      </div>

      {/* CTA */}
      <button className={styles.completedCta} onClick={onViewCollage}>
        <span>⚡</span>
        미션 종료 · 콜라주 보러가기
      </button>
      <p className={styles.completedNote}>모든 멤버에게 동시에 공개돼요</p>
    </div>
  )
}

function ParticipantItem({ participant: p }: { participant: ActiveMissionParticipant }) {
  const statusClass =
    p.status === '완료'   ? styles.statusDone
    : p.status === '찍는중' ? styles.statusRecording
    : styles.statusWaiting

  return (
    <div className={styles.participantItem}>
      <div className={styles.participantAvatar}>
        {p.profileImage
          ? <img src={p.profileImage} alt={p.name} className={styles.participantAvatarImg} />
          : <span className={styles.participantAvatarInitial}>{p.name.charAt(0)}</span>
        }
      </div>
      <span className={styles.participantName}>{p.name}</span>
      <span className={[styles.participantStatus, statusClass].join(' ')}>
        {p.status === '대기' ? '미완료' : p.status}
      </span>
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate  = useNavigate()
  const user         = useAuthStore((s) => s.user)
  const active       = useMissionStore((s) => s.active)
  const setActive    = useMissionStore((s) => s.setActive)
  const missionAlert = useSettingsStore((s) => s.missionAlert)

  const [activeMissions, setActiveMissions]       = useState<ActiveMissionItem[]>([])
  const [selectedMissionId, setSelectedMissionId] = useState<number | null>(null)
  const [myRooms, setMyRooms]                     = useState<ActiveRoom[]>([])

  // 완료 미션 배너 (미션별 독립, 완료 후 10분 노출)
  const [completedMissions, setCompletedMissions] = useState<CompletedMission[]>(() => loadCompletedMissions())

  // 콜라주 생성 대기 오버레이 (보러가기 클릭 시)
  const [transition, setTransition] = useState<{
    roomId: number; missionId: number; date: string; memberCount: number
  } | null>(null)

  // 완료 배너 추가 (dismiss됐거나 이미 있으면 무시) — savedAt 미지정 시 현재 시각
  function addCompletedMission(m: Omit<CompletedMission, 'savedAt'>, savedAt = Date.now()) {
    setCompletedMissions((prev) => {
      const dismissed = new Set(loadDismissedIds())
      if (dismissed.has(m.missionId)) return prev
      if (prev.some((x) => x.missionId === m.missionId)) return prev
      const next = [...prev, { ...m, savedAt }]
      saveCompletedMissions(next)
      return next
    })
  }

  // 완료 배너 제거 + dismiss 등록 (폴링 재세팅 방지)
  function dismissCompletedMission(missionId: number) {
    addDismissedId(missionId)
    setCompletedMissions((prev) => {
      const next = prev.filter((x) => x.missionId !== missionId)
      saveCompletedMissions(next)
      return next
    })
  }

  // 특정 방의 오늘 콜라주를 스캔해 전원 완료(10분 이내) 미션을 배너로 추가
  function scanRoomCollages(roomId: number, roomName: string) {
    const today = todayString()
    const now = Date.now()
    albumApi.getCollages(roomId, today)
      .then((colRes) => {
        for (const c of colRes.data ?? []) {
          const allDone = c.participants.length > 0 && c.participants.every((p) => p.state === 'done')
          if (!allDone) continue
          const lastSubmitMs = c.participants
            .map((p) => new Date(p.submittedAt ?? 0).getTime())
            .reduce((a, b) => Math.max(a, b), 0)
          if (lastSubmitMs <= 0 || now - lastSubmitMs > BANNER_TTL) continue
          addCompletedMission(
            { roomId, missionId: c.missionId, missionTitle: c.missionTitle, roomName, memberCount: c.participants.length, doneCount: c.participants.length },
            lastSubmitMs,
          )
        }
      })
      .catch(() => {})
  }

  function scanCompletedCollages(rooms: ActiveRoom[]) {
    for (const room of rooms) scanRoomCollages(room.id, room.name)
  }

  // 다중 미션 선택 화면용 실시간 카운트다운 (id → 남은 초)
  const [localSeconds, setLocalSeconds] = useState<Record<number, number>>({})

  // activeMissions 변경 시 localSeconds 동기화
  useEffect(() => {
    setLocalSeconds((prev) => {
      const next: Record<number, number> = {}
      activeMissions.forEach((m) => {
        // 서버 값이 더 정확하면 덮어쓰고, 아니면 기존 로컬 값 유지
        next[m.id] = prev[m.id] !== undefined
          ? Math.min(prev[m.id], m.remainingSeconds)
          : m.remainingSeconds
      })
      return next
    })
  }, [activeMissions])

  // 1초마다 모든 미션 카운트다운
  useEffect(() => {
    const id = setInterval(() => {
      setLocalSeconds((prev) => {
        const next: Record<number, number> = {}
        Object.entries(prev).forEach(([k, v]) => {
          next[Number(k)] = Math.max(0, v - 1)
        })
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // 로컬에서 타이머가 만료된 미션 ID 집합 — 서버 poll이 지워도 카드를 유지하기 위해
  const expiredIdsRef      = useRef<Set<number>>(new Set())
  // 이미 알림을 띄운 미션 ID — 첫 로드 포함 (재알림 방지)
  const seenMissionIdsRef  = useRef<Set<number>>(new Set())
  // 첫 폴링 완료 여부 — 초기 로드 시엔 알림 안 띄움
  const initialLoadDoneRef = useRef(false)
  // 최신 myRooms 참조 (인터벌 스캔용)
  const myRoomsRef = useRef<ActiveRoom[]>([])
  // 직전 폴링의 active 미션 목록 (사라진 미션 감지용)
  const prevActiveRef = useRef<ActiveMissionItem[]>([])

  useEffect(() => { myRoomsRef.current = myRooms }, [myRooms])

  // 30초마다 만료된(10분 경과) 완료 배너 정리
  useEffect(() => {
    const id = setInterval(() => setCompletedMissions(loadCompletedMissions()), 30_000)
    return () => clearInterval(id)
  }, [])

  // 주기적으로 완료 콜라주 스캔 — 리마운트 없이도 완료 배너 실시간 반영
  useEffect(() => {
    const id = setInterval(() => scanCompletedCollages(myRoomsRef.current), 20_000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 전역 active 정리 ① — 전원 제출 완료(=completedMissions에 포함) 시 stale active 제거
  // (fallback 배너가 끝난 미션을 다시 노출하는 것 방지)
  useEffect(() => {
    if (active && completedMissions.some((c) => c.missionId === active.mission.id)) {
      setActive(null)
    }
  }, [active, completedMissions, setActive])

  // 전역 active 정리 ② — deadline 만료 시 stale active 제거 (즉시 + 예약 타이머)
  useEffect(() => {
    if (!active?.mission.deadline) return
    const msLeft = new Date(active.mission.deadline).getTime() - Date.now()
    if (msLeft <= 0) { setActive(null); return }
    const t = setTimeout(() => setActive(null), msLeft + 500)
    return () => clearTimeout(t)
  }, [active, setActive])

  // 브라우저 알림 표시 (미션 알림 OFF면 건너뜀)
  function showBrowserNotification(title: string, body: string) {
    if (!missionAlert) return
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' })
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') new Notification(title, { body, icon: '/favicon.ico' })
      })
    }
  }

  // 미션 목록 갱신 헬퍼
  function applyMissions(missions: ActiveMissionItem[]) {
    // 초기 로드 이후 폴링에서 새 미션 감지 → 브라우저 알림
    if (initialLoadDoneRef.current) {
      for (const m of missions) {
        if (!seenMissionIdsRef.current.has(m.id)) {
          showBrowserNotification(
            `⚡ ${m.roomName}에서 미션이 울렸어요!`,
            m.title,
          )
        }
      }
    }
    // 본 미션 ID 등록
    missions.forEach((m) => seenMissionIdsRef.current.add(m.id))

    // 폴링에서 전원 완료 감지 → 미션별 완료 배너 추가 (dismiss/중복은 addCompletedMission이 처리)
    for (const m of missions) {
      const doneCount = (m.participants ?? []).filter((p) => p.status === '완료').length
      if (doneCount >= m.totalMembers && m.totalMembers > 0) {
        addCompletedMission({
          roomId: m.roomId, missionId: m.id, missionTitle: m.title,
          roomName: m.roomName, memberCount: m.totalMembers, doneCount,
        })
      }
    }

    // 직전 폴링엔 있었는데 이번엔 사라진 미션 → 종료됐을 가능성 → 해당 방 콜라주 즉시 스캔
    const currentIds = new Set(missions.map((m) => m.id))
    const dismissed = new Set(loadDismissedIds())
    for (const pm of prevActiveRef.current) {
      if (!currentIds.has(pm.id) && !expiredIdsRef.current.has(pm.id) && !dismissed.has(pm.id)) {
        scanRoomCollages(pm.roomId, pm.roomName)
      }
    }
    prevActiveRef.current = missions

    setActiveMissions((prev) => {
      const serverIds = new Set(missions.map((m) => m.id))
      // 로컬 만료 미션은 서버에서 CLOSED 됐어도 유지 (사용자가 결과 보기 전까지)
      const expiredToKeep = prev.filter(
        (m) => expiredIdsRef.current.has(m.id) && !serverIds.has(m.id),
      )
      return [...missions, ...expiredToKeep]
    })
    // 선택된 미션이 목록에서 사라지면(만료 미션 제외) 선택 초기화
    if (
      selectedMissionId !== null &&
      !missions.some((m) => m.id === selectedMissionId) &&
      !expiredIdsRef.current.has(selectedMissionId)
    ) {
      setSelectedMissionId(null)
    }
  }

  // 마운트 시 즉시 조회 (첫 로드 — 알림 없이 seen 등록만)
  useEffect(() => {
    missionApi.getActiveMission()
      .then((res) => {
        applyMissions(res.data)
        initialLoadDoneRef.current = true  // 이후 폴링부터 알림 활성화
      })
      .catch(console.error)
    roomApi.getMyRooms()
      .then((res) => {
        setMyRooms(res.data.active)
        myRoomsRef.current = res.data.active
        // 오늘 콜라주에서 전원 완료 + 완료 후 10분 이내 미션을 배너로 복원
        // (다른 기기에서 완료됐거나 localStorage에 없는 경우 대비 — addCompletedMission이 중복/dismiss 처리)
        scanCompletedCollages(res.data.active)
      })
      .catch(console.error)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 30초마다 폴링 — 서버가 랜덤 발동한 새 미션을 감지
  useEffect(() => {
    const POLL_MS = 30_000
    const timer = setInterval(() => {
      missionApi.getActiveMission()
        .then((res) => { applyMissions(res.data) })
        .catch(console.error)
    }, POLL_MS)
    return () => clearInterval(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleEnterActiveMission() {
    if (!active) return
    navigate(ROUTES.MISSION_CAMERA(active.room.id))
  }

  const firstName = user?.name ?? '유현'

  return (
    <div className={styles.page}>
      {/* ── 헤더 ──────────────────────────────────────────────────────────── */}
      <AppHeader subtitle={
        <span>
          안녕하세요,{' '}
          <b className={styles.greetingName}>{firstName}</b>
          {' '}님 👋
        </span>
      } />

      <div className={styles.scroll}>

        {/* ── 02_미션 발생: 1개이거나 방 선택 후 → 인라인 풀 카드 ──────────── */}
        {(activeMissions.length === 1 || selectedMissionId !== null) && (() => {
          const m = selectedMissionId !== null
            ? activeMissions.find((x) => x.id === selectedMissionId) ?? activeMissions[0]
            : activeMissions[0]
          return (
            <HomeMissionCard
              key={m.id}
              mission={m}
              myUserId={user?.userId}
              onParticipate={() => {
                setActive(toMissionState(m))
                navigate(ROUTES.MISSION_CAMERA(m.roomId))
              }}
              onBack={activeMissions.length > 1 ? () => setSelectedMissionId(null) : undefined}
              onAllDone={() => {
                addCompletedMission({
                  roomId: m.roomId, missionId: m.id, missionTitle: m.title,
                  roomName: m.roomName, memberCount: m.totalMembers, doneCount: m.totalMembers,
                })
                setActiveMissions((prev) => prev.filter((x) => x.id !== m.id))
                setSelectedMissionId(null)
                setActive(null)
              }}
              onExpire={() => {
                expiredIdsRef.current.add(m.id)
                const expireDoneCount = (m.participants ?? []).filter((p) => p.status === '완료').length
                addCompletedMission({
                  roomId: m.roomId, missionId: m.id, missionTitle: m.title,
                  roomName: m.roomName, memberCount: m.totalMembers, doneCount: expireDoneCount,
                })
                setActiveMissions((prev) => prev.filter((x) => x.id !== m.id))
                setSelectedMissionId(null)
                setActive(null)
              }}
              onViewWaiting={() => {
                setActive(toMissionState(m))
                navigate(ROUTES.MISSION_WAITING(m.roomId))
              }}
            />
          )
        })()}

        {/* ── 03_방 선택 화면: 미션 여러 개이고 아직 선택 안 함 ────────────── */}
        {activeMissions.length > 1 && selectedMissionId === null && (
          <div className={styles.missionSelectSection}>
            <p className={styles.missionSelectTitle}>⚡ 참여할 방을 선택하세요</p>
            {activeMissions.map((m) => {
              const secs = localSeconds[m.id] ?? m.remainingSeconds
              const cardBg =
                secs > 180 ? '#1e3a6b'
                : secs > 60 ? '#1a3d20'
                : '#7a1a1a'
              const cardBorder =
                secs > 180 ? 'rgba(59,130,246,0.5)'
                : secs > 60 ? 'rgba(34,197,94,0.5)'
                : 'rgba(220,38,38,0.5)'
              return (
                <button
                  key={m.id}
                  className={styles.missionSelectCard}
                  style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                  onClick={() => setSelectedMissionId(m.id)}
                >
                  <div className={styles.missionSelectThumb}>
                    <img src={m.roomThumbnail ?? '/SYNK.jpeg'} alt={m.roomName} className={styles.missionSelectThumbImg} />
                  </div>
                  <div className={styles.missionSelectInfo}>
                    <span className={styles.missionSelectRoom}>{m.roomName}</span>
                    <span className={styles.missionSelectTitle2}>{m.title}</span>
                    <span className={styles.missionSelectMeta}>
                      {m.submittedCount}/{m.totalMembers}명 완료
                    </span>
                  </div>
                  <span
                    className={styles.missionSelectTimer}
                    style={{ color: timerColor(secs) }}
                  >
                    {formatTimer(secs)}
                  </span>
                  <span className={styles.alertArrow}>›</span>
                </button>
              )
            })}
          </div>
        )}

        {/* ── 전원 완료 배너 (미션별 독립) ───────────────────────────────────── */}
        {completedMissions.map((cm) => (
          <MissionCompletedBanner
            key={cm.missionId}
            missionTitle={cm.missionTitle}
            roomName={cm.roomName}
            doneCount={cm.doneCount}
            memberCount={cm.memberCount}
            onViewCollage={() => {
              // 해당 미션 배너 제거 + dismiss 등록, 콜라주 생성 대기 오버레이로 전환
              dismissCompletedMission(cm.missionId)
              setTransition({
                roomId: cm.roomId, missionId: cm.missionId,
                date: todayString(), memberCount: cm.memberCount,
              })
            }}
          />
        ))}

        {/* ── 콜라주 생성중 전환 오버레이 — 영상 준비될 때까지 유지 ───────────── */}
        {transition && (
          <CollageTransitionOverlay
            roomId={transition.roomId}
            missionId={transition.missionId}
            date={transition.date}
            memberCount={transition.memberCount}
            onReady={() => {
              const t = transition
              setTransition(null)
              navigate(ROUTES.MISSION_RESULT(t.missionId), {
                state: { roomId: t.roomId, date: t.date, returnTo: 'home' },
              })
            }}
            onFailed={() => setTransition(null)}
          />
        )}

        {/* ── 01_대기 화면 ──────────────────────────────────────────────────── */}
        {activeMissions.length === 0 && !active && completedMissions.length === 0 && (
          <div className={styles.waitingCard}>
            <div className={styles.waitingIconWrap}>
              <span className={styles.waitingIconGlow} />
              <span className={styles.waitingIconEmoji}>🔔</span>
            </div>
            <p className={styles.waitingTitle}>아직 미션이 울리지 않았어요</p>
            <p className={styles.waitingDesc}>
              랜덤한 순간에 미션이 도착해요.<br />알림을 켜두면 놓치지 않아요.
            </p>
            <div className={styles.waitingBadge}>대기 중</div>
          </div>
        )}

        {/* ── 내 방의 오늘 미션 ──────────────────────────────────────────── */}
        {myRooms.length > 0 && (
          <div className={styles.todaySection}>
            <div className={styles.todaySectionHeader}>
              <span className={styles.todaySectionTitle}>내 방의 오늘 미션</span>
              <button className={styles.todaySeeAll} onClick={() => navigate(ROUTES.ROOMS)}>
                전체 보기 ›
              </button>
            </div>
            <div className={styles.todayRoomList}>
              {myRooms.map((room) => {
                const memberCount = room.memberProfiles.length
                const progress = room.totalMissions > 0
                  ? (room.completedMissions / room.totalMissions) * 100
                  : 0
                return (
                  <button
                    key={room.id}
                    className={styles.todayRoomCard}
                    onClick={() => navigate(ROUTES.ROOM(room.id))}
                  >
                    <div className={styles.todayRoomThumb}>
                      {room.roomThumbnail
                        ? <img src={room.roomThumbnail} alt={room.name} className={styles.todayRoomThumbImg} />
                        : <span className={styles.todayRoomThumbInitial}>{room.name.charAt(0)}</span>
                      }
                    </div>
                    <div className={styles.todayRoomBody}>
                      <div className={styles.todayRoomTop}>
                        <span className={styles.todayRoomName}>{room.name}</span>
                        {room.isAllCompleted ? (
                          <span className={styles.todayRoomDone}>오늘 완료 ✓</span>
                        ) : (
                          <span className={styles.todayRoomProgress}>
                            {room.completedMissions}/{room.totalMissions}
                          </span>
                        )}
                      </div>
                      <span className={styles.todayRoomMeta}>맴버 {memberCount}명</span>
                      <div className={styles.todayProgressTrack}>
                        <div
                          className={styles.todayProgressFill}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* WS active 배너 (API 목록에 없을 때 fallback) */}
        {active && activeMissions.length === 0 && (
          <button className={styles.alertBanner} onClick={handleEnterActiveMission}>
            <div className={styles.alertDot} />
            <div className={styles.alertText}>
              <p className={styles.alertTitle}>⚡ {active.room.name}에서 미션이 울렸어요 ⚡</p>
              <p className={styles.alertSub}>{active.mission.template?.title} · 지금 바로 참여하세요</p>
            </div>
            <span className={styles.alertArrow}>›</span>
          </button>
        )}

      </div>
    </div>
  )
}
