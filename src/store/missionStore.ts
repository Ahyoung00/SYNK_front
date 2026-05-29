import { create } from 'zustand'
import type { ActiveMissionState, Collage, MemberParticipation, Submission } from '@/types'

interface MissionStore {
  /** The mission the user is currently participating in (or null) */
  active: ActiveMissionState | null

  /** Result collage after mission completes */
  lastCollage: Collage | null

  /** Locally recorded video blob (before upload) */
  recordedBlob: Blob | null

  /** Preview URL for the recorded blob */
  previewUrl: string | null

  setActive: (state: ActiveMissionState | null) => void
  tickTimer: () => void
  updateParticipation: (updated: MemberParticipation) => void
  setMySubmission: (sub: Submission) => void
  setLastCollage: (collage: Collage) => void
  setRecordedBlob: (blob: Blob | null) => void
  clearMission: () => void
}

export const useMissionStore = create<MissionStore>()((set, get) => ({
  active: null,
  lastCollage: null,
  recordedBlob: null,
  previewUrl: null,

  setActive: (state) => set({ active: state }),

  tickTimer: () => {
    const { active } = get()
    if (!active) return
    const next = Math.max(0, active.seconds_left - 1)
    set({ active: { ...active, seconds_left: next } })
  },

  updateParticipation: (updated) =>
    set((s) => {
      if (!s.active) return s
      return {
        active: {
          ...s.active,
          participations: s.active.participations.map((p) =>
            p.user.userId === updated.user.userId ? updated : p,
          ),
        },
      }
    }),

  setMySubmission: (sub) =>
    set((s) => {
      if (!s.active) return s
      return { active: { ...s.active, my_submission: sub } }
    }),

  setLastCollage: (collage) => set({ lastCollage: collage }),

  setRecordedBlob: (blob) => {
    // Revoke old preview URL to avoid memory leaks
    const old = get().previewUrl
    if (old) URL.revokeObjectURL(old)

    const previewUrl = blob ? URL.createObjectURL(blob) : null
    set({ recordedBlob: blob, previewUrl })
  },

  clearMission: () => {
    // previewUrl은 여기서 지우지 않음 — 앨범에서 콜라주 볼 때 재사용
    // 새 영상을 녹화하면 setRecordedBlob에서 이전 URL이 자동으로 revoke됨
    set({ active: null, recordedBlob: null })
  },
}))
