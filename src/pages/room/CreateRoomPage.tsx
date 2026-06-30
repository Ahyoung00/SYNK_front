import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { roomApi, uploadApi } from '@/services/api/endpoints'
import NavHeader from '@/components/layout/NavHeader'
import DualRangeSlider from '@/components/ui/DualRangeSlider'
import styles from './CreateRoomPage.module.css'

const TIME_MIN  = 0
const TIME_MAX  = 1440
const TIME_STEP = 5

function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function toTimeStr(min: number) {
  const c = Math.round(min / TIME_STEP) * TIME_STEP
  const h = Math.floor(c / 60)
  const m = c % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function CreateRoomPage() {
  const navigate = useNavigate()

  const [name, setName]                   = useState('')
  const [maxMembers, setMaxMembers]       = useState(5)
  const [missionCount, setMissionCount]   = useState(3)
  const [startMin, setStartMin] = useState(toMinutes('10:00'))
  const [endMin,   setEndMin]   = useState(toMinutes('22:00'))
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
        missionStartTime: toTimeStr(startMin),
        missionEndTime:   toTimeStr(endMin),
      })
      const roomId = res.data.roomId

      let thumbnailFileUrl: string | undefined
      if (thumbFile) {
        const { presignedUrl, fileUrl } = await uploadApi.getPresignedUrl(thumbFile.name, 'room')
        const s3Res = await fetch(presignedUrl, { method: 'PUT', body: thumbFile })
        if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status}`)
        await roomApi.updateRoom(roomId, { thumbnail: fileUrl })
        thumbnailFileUrl = fileUrl
      }

      navigate(ROUTES.ROOM_CREATED(roomId), { replace: true, state: { thumbnail: thumbnailFileUrl } })
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
              <CameraIcon />
            )}
          </button>
          <span className={styles.thumbHint}>
            {thumbUrl ? '사진 변경' : '방 커버 추가'}
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
              <div className={[styles.settingIcon, styles.settingIconBlue].join(' ')}><span>👥</span></div>
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
              <div className={[styles.settingIcon, styles.settingIconPurple].join(' ')}><span>⚡</span></div>
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
              <div className={styles.timeRowTop}>
                <span className={styles.settingLabel}>미션 알림 시간대</span>
                <span className={styles.timeValue}>{toTimeStr(startMin)} – {toTimeStr(endMin)}</span>
              </div>
              <DualRangeSlider
                min={TIME_MIN}
                max={TIME_MAX}
                step={TIME_STEP}
                start={startMin}
                end={endMin}
                onStartChange={setStartMin}
                onEndChange={setEndMin}
              />
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

function CameraIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h3l2-2h8l2 2h3v12H3z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}
