import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  missionAlert:   boolean
  resultAlert:    boolean
  highlightAlert: boolean
  setMissionAlert:   (v: boolean) => void
  setResultAlert:    (v: boolean) => void
  setHighlightAlert: (v: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      missionAlert:   true,
      resultAlert:    true,
      highlightAlert: true,
      setMissionAlert:   (v) => set({ missionAlert: v }),
      setResultAlert:    (v) => set({ resultAlert: v }),
      setHighlightAlert: (v) => set({ highlightAlert: v }),
    }),
    { name: 'synk_settings' },
  ),
)
