import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants'
import NavHeader from '@/components/layout/NavHeader'
import styles from './RoomSettingsPage.module.css'

// 개발용 — 방장 여부 토글 (실제 구현 시 서버 데이터로 대체)
const IS_OWNER = true

export default function RoomSettingsPage() {
  const { roomId }   = useParams<{ roomId: string }>()
  const navigate     = useNavigate()
  const [roomName, setRoomName]       = useState('새벽반')
  const [missionCount, setMissionCount] = useState(5)
  const [dirty, setDirty]             = useState(false)

  function handleNameChange(v: string) {
    setRoomName(v)
    setDirty(true)
  }

  function handleSave() {
    // TODO: API call
    setDirty(false)
    navigate(-1)
  }

  function handleDeleteRoom() {
    if (!window.confirm('정말로 방을 삭제할까요? 이 작업은 되돌릴 수 없어요.')) return
    // TODO: API call
    navigate(ROUTES.ROOMS, { replace: true })
  }

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <NavHeader
        title="방 설정"
        right={IS_OWNER ? (
          <button
            className={[styles.saveBtn, dirty ? styles.saveBtnActive : ''].join(' ')}
            onClick={handleSave}
            disabled={!dirty}
          >
            저장
          </button>
        ) : undefined}
      />

      <div className={styles.scroll}>
        {/* ── 방 썸네일 + 이름 ────────────────────────────────────────────────── */}
        <div className={styles.roomHeader}>
          <div className={styles.roomThumb}>
            <span className={styles.roomThumbEmoji}>🌅</span>
          </div>
          {IS_OWNER ? (
            <input
              className={styles.roomNameInput}
              value={roomName}
              onChange={(e) => handleNameChange(e.target.value)}
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
            <span className={styles.sectionMeta}>현재 5명 참여 중</span>
          </div>

          <div className={styles.settingCard}>
            {/* 일일 미션 횟수 */}
            <div className={styles.settingRow}>
              <div className={styles.settingIcon}><span>⚡</span></div>
              <span className={styles.settingLabel}>일일 미션 횟수</span>
              {IS_OWNER ? (
                <div className={styles.stepper}>
                  <button
                    className={styles.stepBtn}
                    onClick={() => { setMissionCount((v) => Math.max(1, v - 1)); setDirty(true) }}
                    disabled={missionCount <= 1}
                  >−</button>
                  <span className={styles.stepValue}>{missionCount}회</span>
                  <button
                    className={styles.stepBtn}
                    onClick={() => { setMissionCount((v) => Math.min(10, v + 1)); setDirty(true) }}
                    disabled={missionCount >= 10}
                  >+</button>
                </div>
              ) : (
                <span className={styles.settingValue}>{missionCount}회</span>
              )}
            </div>

            <div className={styles.rowDivider} />

            {/* 미션 알림 시간대 */}
            <div className={styles.settingRow}>
              <div className={styles.settingIconGray}><span>●</span></div>
              <span className={styles.settingLabel}>미션 알림 시간대</span>
              <span className={styles.settingValue}>10:00–22:00</span>
            </div>
          </div>
        </div>

        {/* ── 멤버 관리 ────────────────────────────────────────────────────────── */}
        <button
          className={styles.memberBtn}
          onClick={() => navigate(ROUTES.ROOM_MEMBERS(Number(roomId)))}
        >
          <span className={styles.memberBtnIcon}>🪬</span>
          <span className={styles.memberBtnLabel}>멤버 관리</span>
          <span className={styles.memberBtnArrow}>›</span>
        </button>

        {/* ── 방 삭제 (방장 전용) ──────────────────────────────────────────────── */}
        {IS_OWNER && (
          <button className={styles.deleteRoomBtn} onClick={handleDeleteRoom}>
            🗑️ 방 삭제하기
          </button>
        )}
      </div>
    </div>
  )
}

