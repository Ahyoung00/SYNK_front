import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants'
import NavHeader from '@/components/layout/NavHeader'
import styles from './CreateRoomPage.module.css'

export default function CreateRoomPage() {
  const navigate = useNavigate()
  const [name, setName]           = useState('')
  const [maxMembers, setMaxMembers] = useState(5)
  const [missionCount, setMissionCount] = useState(3)

  const canCreate = name.trim().length > 0

  function handleCreate() {
    if (!canCreate) return
    // TODO: API call
    navigate(ROUTES.ROOM_CREATED(1), { replace: true })
  }

  return (
    <div className={styles.page}>
      {/* ── 헤더 ────────────────────────────────────────────────────────────── */}
      <NavHeader
        title="방 만들기"
        right={
          <button
            className={[styles.saveBtn, canCreate ? styles.saveBtnActive : ''].join(' ')}
            onClick={handleCreate}
            disabled={!canCreate}
          >
            생성
          </button>
        }
      />

      <div className={styles.scroll}>
        {/* ── 썸네일 ──────────────────────────────────────────────────────────── */}
        <div className={styles.thumbSection}>
          <div className={styles.thumbCircle}>
            <span className={styles.thumbPlus}>+</span>
          </div>
          <span className={styles.thumbHint}>사진 추가</span>
        </div>

        {/* ── 방 이름 ─────────────────────────────────────────────────────────── */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>방 이름 (필수)</label>
          <input
            className={styles.fieldInput}
            placeholder="방 이름을 입력해주세요"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
          />
        </div>

        {/* ── 방 설정 ─────────────────────────────────────────────────────────── */}
        <div className={styles.section}>
          <span className={styles.sectionTitle}>방 설정</span>

          <div className={styles.settingCard}>
            {/* 최대 인원수 */}
            <div className={styles.settingRow}>
              <div className={styles.settingIcon}><span>👥</span></div>
              <span className={styles.settingLabel}>최대 인원수</span>
              <div className={styles.stepper}>
                <button
                  className={styles.stepBtn}
                  onClick={() => setMaxMembers((v) => Math.max(2, v - 1))}
                  disabled={maxMembers <= 2}
                >−</button>
                <span className={styles.stepValue}>{maxMembers}명</span>
                <button
                  className={styles.stepBtn}
                  onClick={() => setMaxMembers((v) => Math.min(10, v + 1))}
                  disabled={maxMembers >= 10}
                >+</button>
              </div>
            </div>

            <div className={styles.rowDivider} />

            {/* 일일 미션 횟수 */}
            <div className={styles.settingRow}>
              <div className={styles.settingIcon}><span>⚡</span></div>
              <span className={styles.settingLabel}>일일 미션 횟수</span>
              <div className={styles.stepper}>
                <button
                  className={styles.stepBtn}
                  onClick={() => setMissionCount((v) => Math.max(1, v - 1))}
                  disabled={missionCount <= 1}
                >−</button>
                <span className={styles.stepValue}>{missionCount}회</span>
                <button
                  className={styles.stepBtn}
                  onClick={() => setMissionCount((v) => Math.min(10, v + 1))}
                  disabled={missionCount >= 10}
                >+</button>
              </div>
            </div>

            <div className={styles.rowDivider} />

            {/* 미션 알림 시간대 */}
            <div className={styles.settingRow}>
              <div className={styles.settingIconGray}><span>🕐</span></div>
              <span className={styles.settingLabel}>미션 알림 시간대</span>
              <span className={styles.settingValue}>10:00–22:00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

