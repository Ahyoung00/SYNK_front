import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMissionStore } from '@/store/missionStore'
import { albumApi } from '@/services/api/endpoints'
import { ROUTES } from '@/constants'
import Loading from '@/components/ui/Loading'
import styles from './MissionProcessingPage.module.css'

/** 로컬(KST) 기준 오늘 날짜 YYYY-MM-DD */
function todayString(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

const POLL_INTERVAL_MS = 3000
const MAX_POLL_MS = 90_000  // 90초 후에는 그냥 결과 화면으로

export default function MissionProcessingPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const active = useMissionStore((s) => s.active)
  const [dotCount, setDotCount] = useState(1)
  const navigatedRef = useRef(false)

  // 로딩 점 애니메이션
  useEffect(() => {
    const t = setInterval(() => setDotCount((n) => (n % 3) + 1), 500)
    return () => clearInterval(t)
  }, [])

  // 콜라주 생성 폴링 — status === 'COMPLETED' 되면 결과 화면으로 이동
  useEffect(() => {
    const numRoomId = Number(roomId) || active?.room.id
    const missionId = active?.mission.id
    if (!numRoomId) return

    const date = todayString()
    const startedAt = Date.now()

    function goResult() {
      if (navigatedRef.current) return
      navigatedRef.current = true
      navigate(ROUTES.MISSION_RESULT(missionId ?? 1), { replace: true })
    }

    async function poll() {
      try {
        const res = await albumApi.getCollages(numRoomId!, date)
        const collages = res.data ?? []
        // 내 미션 콜라주(없으면 첫 항목) 기준으로 완료 여부 판단
        const target = missionId != null
          ? collages.find((c) => c.missionId === missionId)
          : collages[0]
        if (target?.status === 'COMPLETED') {
          goResult()
          return
        }
      } catch {
        // 폴링 중 일시적 오류는 무시하고 다음 주기에 재시도
      }
      if (Date.now() - startedAt > MAX_POLL_MS) {
        goResult()
      }
    }

    poll()
    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [active, navigate, roomId])

  return (
    <div className={styles.page}>
      <Loading label={`결과를 만드는 중${'.'.repeat(dotCount)}`} />
    </div>
  )
}
