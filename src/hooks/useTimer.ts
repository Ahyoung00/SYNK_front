import { useEffect, useRef, useCallback } from 'react'
import { useMissionStore } from '@/store/missionStore'
import { MISSION_DURATION_S } from '@/constants'

// ─────────────────────────────────────────────────────────────────────────────
// useTimer — drives the 5-minute mission countdown
//
// Reads seconds_left from missionStore and ticks it down every second.
// Call start() when the user enters the mission screen.
// The store owns the canonical time so any component can subscribe.
// ─────────────────────────────────────────────────────────────────────────────

interface UseTimerReturn {
  secondsLeft: number
  start: (initialSeconds?: number) => void
  stop: () => void
  isRunning: boolean
}

export function useTimer(): UseTimerReturn {
  const active = useMissionStore((s) => s.active)
  const tickTimer = useMissionStore((s) => s.tickTimer)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isRunningRef = useRef(false)

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    isRunningRef.current = false
  }, [])

  const start = useCallback(
    (_initialSeconds: number = MISSION_DURATION_S) => {
      stop()
      isRunningRef.current = true

      intervalRef.current = setInterval(() => {
        const latest = useMissionStore.getState().active
        if (!latest || latest.seconds_left <= 0) {
          stop()
          return
        }
        tickTimer()
      }, 1000)
    },
    [stop, tickTimer],
  )

  // Auto-clean on unmount
  useEffect(() => () => stop(), [stop])

  return {
    secondsLeft: active?.seconds_left ?? 0,
    start,
    stop,
    isRunning: isRunningRef.current,
  }
}

/** Format seconds → "MM:SS" */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
