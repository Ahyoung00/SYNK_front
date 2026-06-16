import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { roomApi, uploadApi } from '@/services/api/endpoints'
import NavHeader from '@/components/layout/NavHeader'
import TimePicker from '@/components/ui/TimePicker'
import styles from './CreateRoomPage.module.css'

export default function CreateRoomPage() {
  const navigate = useNavigate()

  const [name, setName]                   = useState('')
  const [maxMembers, setMaxMembers]       = useState(5)
  const [missionCount, setMissionCount]   = useState(3)
  const [missionStartTime, setMissionStartTime] = useState('10:00')
  const [missionEndTime,   setMissionEndTime]   = useState('22:00')
  const [isLoading, setIsLoading]         = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [thumbUrl, setThumbUrl]           = useState<string | null>(null)
  const [thumbFile, setThumbFile]         = useState<File | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleThumbClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setThumbFile(file)
    setThumbUrl(URL.createObjectURL(file))
  }

  const canCreate = name.trim().length > 0 && !isLoading

  async function handleCreate() {
    if (!canCreate) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await roomApi.createRoom({
        name: name.trim(),
        maxMembers,
        dailyMissionCount: missionCount,
        missionStartTime,
        missionEndTime,
      })
      const roomId = res.data.roomId

      // 썸네일 선택한 경우 S3 업로드 후 방 썸네일 설정
      if (thumbFile) {
        const { presignedUrl, fileUrl } = await uploadApi.getPresignedUrl(thumbFile.name, 'room')
        await fetch(presignedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': thumbFile.type || 'image/jpeg' },
          body: thumbFile,
        })
        await roomApi.updateRoom(roomId, { thumbnail: fileUrl })
      }

      navigate(ROUTES.ROOM_CREATED(roomId), { replace: true })
    } catch (err) {
      console.error(err)
      setError('방 생성에 실패했어요. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
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
            {isLoading ? '생성 중...' : '생성'}
          </button>
        }
      />

      <div className={styles.scroll}>
        {/* ── 썸네일 ──────────────────────────────────────────────────────────── */}
        <div className={styles.thumbSection}>
          <button className={styles.thumbCircle} onClick={handleThumbClick}>
            {thumbUrl ? (
              <img src={thumbUrl} alt="썸네일" className={styles.thumbImg} />
            ) : (
              <span className={styles.thumbPlus}>+</span>
            )}
          </button>
          <span className={styles.thumbHint}>
            {thumbUrl ? '사진 변경' : '사진 추가'}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
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
            {/* 최대 인원수 (2~10) */}
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

            {/* 일일 미션 횟수 (1~10) */}
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
                  onClick={() => setMissionCount((v) => Math.min(5, v + 1))}
                  disabled={missionCount >= 5}
                >+</button>
              </div>
            </div>

            <div className={styles.rowDivider} />

            {/* 미션 알림 시간대 */}
            <div className={styles.settingRowTime}>
              <span className={styles.settingLabel}>미션 알림 시간대</span>
              <div className={styles.timeInputRow}>
                <TimePicker
                  value={missionStartTime}
                  onChange={setMissionStartTime}
                />
                <span className={styles.timeDash}>–</span>
                <TimePicker
                  value={missionEndTime}
                  onChange={setMissionEndTime}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <p style={{ padding: '0 20px', color: '#ef4444', fontSize: 13, textAlign: 'center' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
