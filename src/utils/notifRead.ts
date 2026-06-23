/**
 * 읽은 알림 id를 localStorage에 저장.
 * 서버 read API가 미확정이라, 재진입/폴링 시에도 읽음 상태를 유지하기 위한 보조 저장소.
 */
const KEY = 'synk_notif_read'

function load(): Set<number> {
  try {
    const raw = localStorage.getItem(KEY)
    return new Set(raw ? (JSON.parse(raw) as number[]) : [])
  } catch {
    return new Set()
  }
}

export function getReadIds(): Set<number> {
  return load()
}

export function addReadIds(ids: number[]): void {
  if (ids.length === 0) return
  const s = load()
  ids.forEach((i) => s.add(i))
  try {
    localStorage.setItem(KEY, JSON.stringify([...s]))
  } catch {
    // ignore
  }
}
