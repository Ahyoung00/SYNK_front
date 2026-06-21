import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants'
import styles from './OnboardingPage.module.css'

const SLIDES = [
  {
    label: '함께하는 순간',
    title: (
      <>
        친구들과{' '}
        <span className={styles.titleGrad}>한 그룹</span>
        이 되면<br />같은 순간이 시작돼요
      </>
    ),
    desc: '방을 만들고 친구를 초대하면, 하루에 몇 번 랜덤한 시간에 미션이 도착해요.',
  },
  {
    label: '5분의 진심',
    title: (
      <>
        미션이 오면{' '}
        <span className={styles.titleGrad}>5분 안에</span>
        <br />딱 한 컷이면 돼요
      </>
    ),
    desc: '꾸미지 않아도 괜찮아요. 지금 이 순간의 진짜 너를 담는 시간이니까.',
  },
  {
    label: '우리만의 기록',
    title: (
      <>
        모두 모이면{' '}
        <span className={styles.titleGrad}>하나의 콜라주</span>
        로<br />완성돼요
      </>
    ),
    desc: '매일의 순간이 모여 우리만의 다이어리가 돼요. 지금 바로 시작해볼까요?',
  },
]

function done(navigate: ReturnType<typeof useNavigate>) {
  localStorage.setItem('synk_onboarded', '1')
  navigate(ROUTES.LOGIN, { replace: true })
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [idx, setIdx] = useState(0)
  const slide = SLIDES[idx]

  function next() {
    if (idx < SLIDES.length - 1) setIdx(idx + 1)
    else done(navigate)
  }

  return (
    <div className={styles.page}>
      <div className={styles.glowA} />
      <div className={styles.glowB} />

      <button className={styles.skipBtn} onClick={() => done(navigate)}>
        건너뛰기
      </button>

      <div className={styles.slides}>
        <div className={styles.slide}>
          {/* ── 일러스트 ────────────────────────────────────────────────── */}
          <div className={styles.illustWrap}>
            {idx === 0 && <Slide1Illust />}
            {idx === 1 && <Slide2Illust />}
            {idx === 2 && <Slide3Illust />}
          </div>

          {/* ── 텍스트 ──────────────────────────────────────────────────── */}
          <p className={styles.label}>{slide.label}</p>
          <h2 className={styles.title}>{slide.title}</h2>
          <p className={styles.desc}>{slide.desc}</p>
        </div>
      </div>

      {/* ── 하단 ────────────────────────────────────────────────────────── */}
      <div className={styles.bottom}>
        <div className={styles.dots}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === idx ? styles.dotActive : ''}`}
              onClick={() => setIdx(i)}
              aria-label={`슬라이드 ${i + 1}`}
            />
          ))}
        </div>
        <button className={styles.nextBtn} onClick={next}>
          {idx < SLIDES.length - 1 ? '다음' : '시작하기'}
        </button>
      </div>
    </div>
  )
}

/* ── Slide illustrations ─────────────────────────────────────────────────── */

function Slide1Illust() {
  const angles = [-30, 75, 160, 250]
  const R = 82

  return (
    <>
      <div className={styles.orbit} />
      <div className={styles.orbitCenter}>
        <span className={styles.orbitBoltIcon}>⚡</span>
      </div>
      {angles.map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        const x = Math.cos(rad) * R
        const y = Math.sin(rad) * R
        return (
          <div
            key={i}
            className={styles.orbitAvatar}
            style={{
              position: 'absolute',
              left: `calc(50% + ${x}px - 19px)`,
              top: `calc(50% + ${y}px - 19px)`,
            }}
          >
            <PersonIcon />
          </div>
        )
      })}
    </>
  )
}

function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="4" fill="rgba(244,247,255,0.7)" />
      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="rgba(244,247,255,0.7)" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function Slide2Illust() {
  return (
    <div className={styles.missionCard}>
      <div className={styles.missionCardTag}>MISSION · 지금 바로</div>
      <div className={styles.missionCardTimer}>04:32</div>
      <div className={styles.missionCardTitle}>지금 내 표정 그대로 찍기</div>
      <div className={styles.missionCardEmoji}>🎬</div>
      <div className={styles.missionCardBar}>
        <div className={styles.missionCardBarFill} />
      </div>
    </div>
  )
}

function Slide3Illust() {
  const cells = [0, 1, 2, 3, 4, 5]
  const heartIdx = 4

  return (
    <div className={styles.collageGrid}>
      {cells.map((i) => (
        <div
          key={i}
          className={`${styles.collageCell} ${i === heartIdx ? styles.collageCellHeart : ''}`}
        >
          {i === heartIdx && '💜'}
        </div>
      ))}
    </div>
  )
}
