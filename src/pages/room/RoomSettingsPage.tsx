import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { roomApi, uploadApi } from '@/services/api/endpoints'
import { ROUTES } from '@/constants'
import NavHeader from '@/components/layout/NavHeader'
import TimePicker from '@/components/ui/TimePicker'
import styles from './RoomSettingsPage.module.css'

export default function RoomSettingsPage() {
  const { roomId }    = useParams<{ roomId: string }>()
  const navigate      = useNavigate()
  const myUser        = useAuthStore((s) => s.user)
  const id            = Number(roomId)

  const [roomName, setRoomName]               = useState('')
  const [missionCount, setMissionCount]       = useState(1)
  const [missionStartTime, setMissionStartTime] = useState('10:00')
  const [missionEndTime,   setMissionEndTime]   = useState('22:00')
  const [memberCount, setMemberCount]         = useState(0)
  const [maxMembers, setMaxMembers]           = useState(10)
  const [isOwner, setIsOwner]                 = useState(false)
  const [thumbUrl, setThumbUrl]               = useState<string | null>(null)
  const [newThumbFile, setNewThumbFile]       = useState<File | null>(null)
  const [dirty, setDirty]                     = useState(false)
  const [saving, setSaving]                   = useState(false)
  const [saveError, setSaveError]             = useState<string | null>(null)
  const [isLoading, setIsLoading]             = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleThumbClick() {
    if (!isOwner) return
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setNewThumbFile(file)
    setThumbUrl(URL.createObjectURL(file))
    setDirty(true)
  }

  useEffect(() => {
    if (!id) return
    roomApi.getRoom(id)
      .then((roomRes) => {
        const room = roomRes.data
        setRoomName(room.name)
        setMissionCount(room.dailyMissionCount)
        setMissionStartTime(room.missionStartTime?.slice(0, 5) ?? '10:00')
        setMissionEndTime(room.missionEndTime?.slice(0, 5)     ?? '22:00')
        setMemberCount(room.currentMembers)
        setMaxMembers(room.maxMembers)
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
        name:              roomName,
        dailyMissionCount: missionCount,
        missionStartTime,
        missionEndTime,
        maxMembers,
        ...(thumbnailUrl ? { thumbnail: thumbnailUrl } : {}),
      })
      setDirty(false)
      navigate(-1)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '저장에 실패했어요')
      console.error(e)
    } finally {
      setSaving(false)
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
          <p style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <NavHeader
        title="방 설정"
        right={isOwner ? (
          <button
            className={[styles.saveBtn, dirty ? styles.saveBtnActive : ''].join(' ')}
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        ) : undefined}
      />

      <div className={styles.scroll}>
        {/* ── 방 썸네일 + 이름 ────────────────────────────────────────────────── */}
        <div className={styles.roomHeader}>
          <button
            className={styles.roomThumb}
            onClick={handleThumbClick}
            disabled={!isOwner}
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
            onChange={handleFileChange}
          />
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
        </div>

        <div className={styles.divider} />

        {/* ── 방 설정 섹션 ────────────────────────────────────────────────────── */}
        <div className={styles.sectionGroup}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>방 설정</span>
            <span className={styles.sectionMeta}>{memberCount}명 참여 중</span>
          </div>

          <div className={styles.settingCard}>
            {/* 일일 미션 횟수 */}
            <div className={styles.settingRow}>
              <div className={styles.settingIcon}><span>⚡</span></div>
              <span className={styles.settingLabel}>일일 미션 횟수</span>
              {isOwner ? (
                <div className={styles.stepper}>
                  <button
                    className={styles.stepBtn}
                    onClick={() => { setMissionCount((v) => Math.max(1, v - 1)); setDirty(true) }}
                    disabled={missionCount <= 1}
                  >−</button>
                  <span className={styles.stepValue}>{missionCount}회</span>
                  <button
                    className={styles.stepBtn}
                    onClick={() => { setMissionCount((v) => Math.min(5, v + 1)); setDirty(true) }}
                    disabled={missionCount >= 5}
                  >+</button>
                </div>
              ) : (
                <span className={styles.settingValue}>{missionCount}회</span>
              )}
            </div>

            <div className={styles.rowDivider} />

            {/* 미션 알림 시간대 */}
            <div className={styles.settingRowTime}>
              <span className={styles.settingLabel}>미션 알림 시간대</span>
              {isOwner ? (
                <div className={styles.timeInputRow}>
                  <TimePicker
                    value={missionStartTime}
                    onChange={(v) => { setMissionStartTime(v); setDirty(true) }}
                  />
                  <span className={styles.timeDash}>–</span>
                  <TimePicker
                    value={missionEndTime}
                    onChange={(v) => { setMissionEndTime(v); setDirty(true) }}
                  />
                </div>
              ) : (
                <span className={styles.settingValue}>{missionStartTime}–{missionEndTime}</span>
              )}
            </div>
          </div>
        </div>

        {/* ── 저장 에러 ────────────────────────────────────────────────────────── */}
        {saveError && (
          <p style={{ padding: '0 20px 8px', color: '#ef4444', fontSize: 13, textAlign: 'center' }}>
            {saveError}
          </p>
        )}

        {/* ── 멤버 관리 ────────────────────────────────────────────────────────── */}
        <button
          className={styles.memberBtn}
          onClick={() => navigate(ROUTES.ROOM_MEMBERS(id))}
        >
          <span className={styles.memberBtnIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor"><path d="M287-527q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47ZM80-160v-112q0-33 17-62t47-44q51-26 115-44t141-18h14q6 0 12 2-8 18-13.5 37.5T404-360h-4q-71 0-127.5 18T180-306q-9 5-14.5 14t-5.5 20v32h252q6 21 16 41.5t22 38.5H80Zm560 40-12-60q-12-5-22.5-10.5T584-204l-58 18-40-68 46-40q-2-14-2-26t2-26l-46-40 40-68 58 18q11-8 21.5-13.5T628-460l12-60h80l12 60q12 5 22.5 11t21.5 15l58-20 40 70-46 40q2 12 2 25t-2 25l46 40-40 68-58-18q-11 8-21.5 13.5T732-180l-12 60h-80Zm96.5-143.5Q760-287 760-320t-23.5-56.5Q713-400 680-400t-56.5 23.5Q600-353 600-320t23.5 56.5Q647-240 680-240t56.5-23.5Zm-280-320Q480-607 480-640t-23.5-56.5Q433-720 400-720t-56.5 23.5Q320-673 320-640t23.5 56.5Q367-560 400-560t56.5-23.5ZM400-640Zm12 400Z"/></svg>
          </span>
          <span className={styles.memberBtnLabel}>멤버 관리</span>
          <span className={styles.memberBtnArrow}>›</span>
        </button>

        {/* ── 방 삭제 (방장 전용) ──────────────────────────────────────────────── */}
        {isOwner && (
          <button className={styles.deleteRoomBtn} onClick={handleDeleteRoom}>
            🗑️ 방 삭제하기
          </button>
        )}
      </div>
    </div>
  )
}
