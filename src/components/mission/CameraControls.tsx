import styles from './CameraControls.module.css'

interface Props {
  isRecording: boolean
  isDone: boolean
  shutterDisabled: boolean
  torchOn: boolean
  hasMultiCam: boolean
  isSubmitting: boolean
  /** 녹화 경과(초) — 슬라이더 진행률 */
  recordingElapsed: number
  /** 최대 녹화 길이(초) */
  maxSeconds: number
  /** 하단 힌트 문구 */
  hintText: string
  onToggleTorch: () => void
  onShutter: () => void
  onStop: () => void
  onFlip: () => void
  onRetake: () => void
  onSubmit: () => void
}

/** 미션 촬영 우측 컨트롤 레일 — 독립 컴포넌트 (플래시/셔터/전환/제출) */
export default function CameraControls({
  isRecording,
  isDone,
  shutterDisabled,
  torchOn,
  hasMultiCam,
  isSubmitting,
  recordingElapsed,
  maxSeconds,
  hintText,
  onToggleTorch,
  onShutter,
  onStop,
  onFlip,
  onRetake,
  onSubmit,
}: Props) {
  return (
    <div className={styles.rail}>
      {/* 플래시 */}
      <button
        className={[styles.railIcon, torchOn ? styles.railIconOn : ''].join(' ')}
        onClick={onToggleTorch}
        aria-label="플래시"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M13 2L4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5z" />
        </svg>
      </button>

      {isDone ? (
        <div className={styles.reviewStack}>
          <button className={styles.retakeBtn} onClick={onRetake}>재촬영</button>
          <button className={styles.submitBtn} onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? '제출 중' : '제출'}
          </button>
        </div>
      ) : (
        <div className={styles.shutterArea}>
          <div className={styles.shutterRow}>
            <button
              className={styles.shutterRing}
              onClick={isRecording ? onStop : onShutter}
              disabled={shutterDisabled}
              aria-label={isRecording ? '촬영 완료' : '촬영 시작'}
            >
              <span className={styles.shutterCore}>
                {isRecording && <span className={styles.shutterStop} />}
              </span>
            </button>

            <div className={styles.slider}>
              <div
                className={styles.sliderFill}
                style={{ height: isRecording ? `${(recordingElapsed / maxSeconds) * 100}%` : '0%' }}
              />
            </div>
          </div>

          {hasMultiCam && !isRecording && (
            <button className={styles.railFlip} onClick={onFlip} aria-label="카메라 전환">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" />
                <path d="M22 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" />
              </svg>
            </button>
          )}
        </div>
      )}

      <p className={styles.hint}>{hintText}</p>
    </div>
  )
}
