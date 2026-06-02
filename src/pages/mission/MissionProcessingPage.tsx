import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMissionStore } from '@/store/missionStore'
import { ROUTES } from '@/constants'
import styles from './MissionProcessingPage.module.css'

export default function MissionProcessingPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const active = useMissionStore((s) => s.active)
  const [dotCount, setDotCount] = useState(1)

  // 로딩 점 애니메이션
  useEffect(() => {
    const t = setInterval(() => setDotCount((n) => (n % 3) + 1), 500)
    return () => clearInterval(t)
  }, [])

  // 3초 후 결과 화면으로 이동 (실제는 폴링 or WebSocket COLLAGE_READY 이벤트)
  useEffect(() => {
    const missionId = active?.mission.id ?? 1
    const t = setTimeout(() => {
      navigate(ROUTES.MISSION_RESULT(missionId), { replace: true })
    }, 3000)
    return () => clearTimeout(t)
  }, [active, navigate, roomId])

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.emojiWrap}>
          <span className={styles.emoji}>🙂</span>
        </div>

        <h2 className={styles.title}>모든 촬영이 완료됐어요!</h2>
        <p className={styles.sub}>
          결과를 만드는 중{'.'.repeat(dotCount)}
        </p>
        <p className={styles.hint}>잠시만 기다려주세요</p>

        {/* 스피너 */}
        <div className={styles.spinnerWrap}>
          <div className={styles.spinner} />
        </div>
      </div>
    </div>
  )
}
