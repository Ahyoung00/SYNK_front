import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { roomApi, uploadApi } from '@/services/api/endpoints'
import { ROUTES } from '@/constants'
import NavHeader from '@/components/layout/NavHeader'
import DualRangeSlider from '@/components/ui/DualRangeSlider'
import styles from './RoomSettingsPage.module.css'

const MISSION_OPTIONS = [1, 2, 3, 4, 5]
const HOUR_MIN = 0
const HOUR_MAX = 24

function toHourNum(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h + m / 60
}

function toTimeStr(hour: number) {
  const h = Math.floor(hour)
  return `${String(h).padStart(2, '0')}:00`
}

export default function RoomSettingsPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate   = useNavigate()
  const myUser     = useAuthStore((s) => s.user)
  const id         = Number(roomId)

  const [roomName, setRoomName]                   = useState('')
  const [missionCount, setMissionCount]           = useState(3)
  const [startHour, setStartHour]                 = useState(10)
  const [endHour, setEndHour]                     = useState(22)
  const [memberCount, setMemberCount]             = useState(0)
  const [roomCode, setRoomCode]                   = useState('')
  const [isOwner, setIsOwner]                     = useState(false)
  const [thumbUrl, setThumbUrl]                   = useState<string | null>(null)
  const [newThumbFile, setNewThumbFile]           = useState<File | null>(null)
  const [dirty, setDirty]                         = useState(false)
  const [saving, setSaving]                       = useState(false)
  const [saveError, setSaveError]                 = useState<string | null>(null)
  const [isLoading, setIsLoading]                 = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    roomApi.getRoom(id)
      .then((res) => {
        const room = res.data
        setRoomName(room.name)
        setMissionCount(room.dailyMissionCount)
        setStartHour(toHourNum(room.missionStartTime?.slice(0, 5) ?? '10:00'))
        setEndHour(toHourNum(room.missionEndTime?.slice(0, 5) ?? '22:00'))
        setMemberCount(room.currentMembers)
        setRoomCode(room.code)
        setIsOwner(room.ownerId === myUser?.userId)
        setThumbUrl(room.thumbnail ?? null)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!dirty || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      let thumbnailUrl: string | undefined
      if (newThumbFile) {
        const { presignedUrl, fileUrl } = await uploadApi.getPresignedUrl(newThumbFile.name, 'room')
        const s3Res = await fetch(presignedUrl, { method: 'PUT', body: newThumbFile })
        if (!s3Res.ok) throw new Error(`이미지 업로드 실패 (${s3Res.status})`)
        thumbnailUrl = fileUrl
        setThumbUrl(fileUrl)
      }
      await roomApi.updateRoom(id, {
        name: roomName,
        dailyMissionCount: missionCount,
        missionStartTime: toTimeStr(startHour),
        missionEndTime:   toTimeStr(endHour),
        ...(thumbnailUrl ? { thumbnail: thumbnailUrl } : {}),
      })
      setDirty(false)
      navigate(-1)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '저장에 실패했어요')
    } finally {
      setSaving(false)
    }
  }

  async function handleLeave() {
    if (!window.confirm('방에서 나가시겠어요?')) return
    try {
      await roomApi.leaveRoom(id)
      navigate(ROUTES.ROOMS, { replace: true })
    } catch (e) {
      console.error(e)
    }
  }

  async function handleDeleteRoom() {
    if (!window.confirm('정말로 방을 삭제할까요? 이 작업은 되돌릴 수 없어요.')) return
    try {
      await roomApi.deleteRoom(id)
      navigate(ROUTES.ROOMS, { replace: true })
    } catch (e) {
      console.error(e)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <NavHeader title="방 설정" />
        <div className={styles.scroll}>
          <p style={{ padding: '40px 20px', textAlign: 'center', color: '#9AA0BD' }}>불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <NavHeader
        title="방 설정"
        right={isOwner ? (
          <button
            className={[styles.saveBtn, dirty ? styles.saveBtnActive : ''].join(' ')}
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? '저장 중' : '저장'}
          </button>
        ) : undefined}
      />

      <div className={styles.scroll}>

        {/* ── 방 정보 헤더 ──────────────────────────────────────────────────── */}
        <div className={styles.roomHeader}>
          <button
            className={styles.roomThumb}
            onClick={() => isOwner && fileInputRef.current?.click()}
            style={{ cursor: isOwner ? 'pointer' : 'default' }}
          >
            {thumbUrl
              ? <img src={thumbUrl} alt="방 이미지" className={styles.roomThumbImg} />
              : <span className={styles.roomThumbEmoji}>🌅</span>
            }
            {isOwner && (
              <div className={styles.roomThumbOverlay}>
                <span className={styles.roomThumbCamera}>📷</span>
              </div>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setNewThumbFile(file)
              setThumbUrl(URL.createObjectURL(file))
              setDirty(true)
            }}
          />
          <div className={styles.roomInfo}>
            {isOwner ? (
              <input
                className={styles.roomNameInput}
                value={roomName}
                onChange={(e) => { setRoomName(e.target.value); setDirty(true) }}
                maxLength={20}
                placeholder="방 이름"
              />
            ) : (
              <span className={styles.roomName}>{roomName}</span>
            )}
            <span className={styles.roomMeta}>코드 {roomCode} · {memberCount}명 참여 중</span>
          </div>
        </div>

        {/* ── 미션 설정 ──────────────────────────────────────────────────────── */}
        <span className={styles.sectionLabel}>미션 설정</span>
        <div className={styles.card}>
          {/* 일일 미션 횟수 */}
          <div className={styles.missionCountRow}>
            <div className={styles.missionIconWrap}>
              <LightningIcon />
            </div>
            <span className={styles.missionCountLabel}>일일 미션 횟수</span>
            <div className={styles.chips}>
              {MISSION_OPTIONS.map((n) => (
                <button
                  key={n}
                  className={[styles.chip, missionCount === n ? styles.chipActive : ''].join(' ')}
                  onClick={() => { setMissionCount(n); setDirty(true) }}
                  disabled={!isOwner}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.cardDivider} />

          {/* 미션 알림 시간대 */}
          <div className={styles.timeRow}>
            <div className={styles.timeRowTop}>
              <span className={styles.timeLabel}>미션 알림 시간대</span>
              <span className={styles.timeValue}>
                {toTimeStr(startHour)} – {toTimeStr(endHour)}
              </span>
            </div>
            <DualRangeSlider
              min={HOUR_MIN}
              max={HOUR_MAX}
              step={1}
              start={startHour}
              end={endHour}
              disabled={!isOwner}
              onStartChange={(v) => { setStartHour(v); setDirty(true) }}
              onEndChange={(v)   => { setEndHour(v);   setDirty(true) }}
            />
          </div>
        </div>

        {/* ── 관리 ───────────────────────────────────────────────────────────── */}
        <span className={styles.sectionLabel}>관리</span>
        <div className={styles.card}>
          <button className={styles.manageRow} onClick={() => navigate(ROUTES.ROOM_MEMBERS(id))}>
            <div className={styles.manageIcon}><MembersIcon /></div>
            <span className={styles.manageLabel}>멤버 관리</span>
            <ChevronIcon className={styles.manageArrow} />
          </button>
          <div className={styles.cardDivider} />
          <button className={styles.manageRow} onClick={() => fileInputRef.current?.click()}>
            <div className={styles.manageIcon}><CoverIcon /></div>
            <span className={styles.manageLabel}>방 커버 변경</span>
            <ChevronIcon className={styles.manageArrow} />
          </button>
        </div>

        {saveError && <p className={styles.saveError}>{saveError}</p>}

        {/* ── 방 나가기 ────────────────────────────────────────────────────── */}
        <button className={styles.leaveBtn} onClick={handleLeave}>
          <LeaveIcon />
          방 나가기
        </button>

        {isOwner && (
          <div className={styles.deleteSection}>
            <button className={styles.deleteRoomBtn} onClick={handleDeleteRoom}>
              <TrashIcon />
              방 삭제하기
            </button>
            <p className={styles.deleteDesc}>방을 삭제하면 모든 멤버의 콜라주와 기록이 사라져요</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── 아이콘 ───────────────────────────────────────────────────────────────── */

function LightningIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L4.5 13.5H12L11 22L19.5 10.5H12L13 2Z" />
    </svg>
  )
}

function MembersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="18" cy="7" r="2.5" />
      <path d="M21 20c0-2.8-1.6-5-4-5.5" />
    </svg>
  )
}

function CoverIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  )
}

function LeaveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v14a1 1 0 001 1h8a1 1 0 001-1v-3" />
      <path d="M10 12h10m0 0l-3-3m3 3l-3 3" />
    </svg>
  )
}
