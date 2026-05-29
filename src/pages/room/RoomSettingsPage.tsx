import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { roomApi } from '@/services/api/endpoints'
import { ROUTES } from '@/constants'
import NavHeader from '@/components/layout/NavHeader'
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
  const [isOwner, setIsOwner]                 = useState(false)
  const [dirty, setDirty]                     = useState(false)
  const [saving, setSaving]                   = useState(false)
  const [isLoading, setIsLoading]             = useState(true)

  useEffect(() => {
    if (!id) return
    roomApi.getRoom(id)
      .then((roomRes) => {
        const room = roomRes.data
        setRoomName(room.name)
        setMissionCount(room.dailyMissionCount)
        // "HH:mm:ss" → "HH:mm" 변환
        setMissionStartTime(room.missionStartTime?.slice(0, 5) ?? '10:00')
        setMissionEndTime(room.missionEndTime?.slice(0, 5)     ?? '22:00')
        setMemberCount(room.currentMembers)
        setIsOwner(room.ownerId === myUser?.userId)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!dirty || saving) return
    setSaving(true)
    try {
      await roomApi.updateRoom(id, {
        name:              roomName,
        dailyMissionCount: missionCount,
        missionStartTime,
        missionEndTime,
      })
      setDirty(false)
      navigate(-1)
    } catch (e) {
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
          <div className={styles.roomThumb}>
            <span className={styles.roomThumbEmoji}>🌅</span>
          </div>
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
                  <input
                    type="time"
                    className={styles.timeInput}
                    value={missionStartTime}
                    onChange={(e) => { setMissionStartTime(e.target.value); setDirty(true) }}
                  />
                  <span className={styles.timeDash}>–</span>
                  <input
                    type="time"
                    className={styles.timeInput}
                    value={missionEndTime}
                    onChange={(e) => { setMissionEndTime(e.target.value); setDirty(true) }}
                  />
                </div>
              ) : (
                <span className={styles.settingValue}>{missionStartTime}–{missionEndTime}</span>
              )}
            </div>
          </div>
        </div>

        {/* ── 멤버 관리 ────────────────────────────────────────────────────────── */}
        <button
          className={styles.memberBtn}
          onClick={() => navigate(ROUTES.ROOM_MEMBERS(id))}
        >
          <span className={styles.memberBtnIcon}>🪬</span>
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
