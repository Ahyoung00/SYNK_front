import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { albumApi } from '@/services/api/endpoints'
import type { CollageItem } from '@/types'
import { ROUTES } from '@/constants'
import styles from './SynklogCreatePage.module.css'

export default function SynklogCreatePage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { state } = useLocation()
  const date: string = state?.date ?? new Date().toISOString().slice(0, 10)

  const [collages, setCollages] = useState<CollageItem[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const id = Number(roomId)

  useEffect(() => {
    albumApi.getCollages(id, date)
      .then((res) => {
        const completed = res.data.filter((c) => c.status === 'COMPLETED')
        setCollages(completed)
        setSelected(new Set(completed.map((c) => c.missionId)))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id, date])

  function toggleSelect(missionId: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(missionId)) next.delete(missionId)
      else next.add(missionId)
      return next
    })
  }

  async function handleCreate() {
    if (submitting || selected.size === 0) return
    setSubmitting(true)
    try {
      const res = await albumApi.createSynklog(id, date)
      navigate(ROUTES.SYNKLOG_COMPLETE(id), {
        replace: true,
        state: {
          synklogId: res.data.synklogId,
          date,
          selectedCollages: collages.filter((c) => selected.has(c.missionId)),
        },
      })
    } catch (e: any) {
      // 이미 생성된 경우 → 기존 Synklog 상세로 이동
      if (e?.message?.includes('이미 생성된')) {
        navigate(ROUTES.ROOM_SYNKLOG(id, date), { replace: true })
        return
      }
      setSubmitting(false)
    }
  }

  const dateLabel = date.replace(/-/g, '.')
    .replace(/^(\d{4})\.(\d{2})\.(\d{2})$/, '$1년 $2월 $3일')

  function formatTime(iso: string | null) {
    if (!iso) return ''
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className={styles.page}>
      {/* 헤더 */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="뒤로">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className={styles.headerTitle}>Synklog 만들기</span>
      </div>

      <div className={styles.content}>
        {/* 안내 */}
        <div className={styles.intro}>
          <h2 className={styles.introTitle}>오늘의 콜라주를<br />골라주세요</h2>
          <p className={styles.introSub}>
            {dateLabel} · 완료된 미션 {collages.length}개
          </p>
        </div>

        {/* 콜라주 그리드 */}
        {loading ? (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
          </div>
        ) : collages.length === 0 ? (
          <div className={styles.empty}>아직 완료된 미션이 없어요</div>
        ) : (
          <div className={styles.grid}>
            {collages.map((c) => {
              const isOn = selected.has(c.missionId)
              return (
                <button
                  key={c.missionId}
                  className={[styles.card, isOn ? styles.cardOn : ''].join(' ')}
                  onClick={() => toggleSelect(c.missionId)}
                >
                  {/* 썸네일 */}
                  {c.thumbnail
                    ? <img src={c.thumbnail} alt={c.missionTitle} className={styles.cardThumb} />
                    : <div className={styles.cardThumbEmpty}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="3" />
                          <path d="M3 9l4-4 4 4 4-6 6 6" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                        </svg>
                      </div>
                  }

                  {/* 시간 (좌상단) */}
                  {c.missionStartAt && (
                    <span className={styles.cardTime}>{formatTime(c.missionStartAt)}</span>
                  )}

                  {/* 체크박스 (우상단) */}
                  <span className={[styles.cardCheck, isOn ? styles.cardCheckOn : ''].join(' ')}>
                    {isOn && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>

                  {/* 미션명 (좌하단) */}
                  <span className={styles.cardTitle}>{c.missionTitle}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 생성 CTA */}
      <div className={styles.footer}>
        <button
          className={styles.ctaBtn}
          onClick={handleCreate}
          disabled={submitting || selected.size === 0}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
          {submitting ? '생성 중...' : `${selected.size}개 콜라주로 Synklog 생성`}
        </button>
      </div>
    </div>
  )
}
