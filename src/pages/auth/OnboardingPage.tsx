import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ROUTES } from '@/constants'
import styles from './OnboardingPage.module.css'

const SLIDES = [
  {
    eyebrow: '함께하는 순간',
    title: <><b className={styles.titleGrad}>한 그룹</b>이 되면<br />같은 순간이 시작돼요</>,
    body: '방을 만들고 친구를 초대하면, 하루에 몇 번 랜덤한 시간에 미션이 도착해요.',
  },
  {
    eyebrow: '5분의 진심',
    title: <>미션이 오면 <b className={styles.titleGrad}>5분 안에</b><br />딱 한 컷이면 돼요</>,
    body: '꾸미지 않아도 괜찮아요. 지금 이 순간의 진짜 너를 담는 시간이니까.',
  },
  {
    eyebrow: '우리만의 기록',
    title: <>모두 모이면 <b className={styles.titleGrad}>하나의 콜라주</b>로<br />완성돼요</>,
    body: '매일의 순간이 모여 우리만의 다이어리가 돼요. 지금 바로 시작해볼까요?',
  },
]

export default function OnboardingPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const redirectTo = (location.state as { redirectTo?: string } | null)?.redirectTo
  const [idx, setIdx] = useState(0)
  const slide = SLIDES[idx]

  function goLogin() {
    localStorage.setItem('synk_onboarded', '1')
    navigate(ROUTES.LOGIN, { replace: true, state: redirectTo ? { redirectTo } : undefined })
  }

  function next() {
    if (idx < SLIDES.length - 1) setIdx(idx + 1)
    else goLogin()
  }

  return (
    <div className={styles.page}>
      <div className={styles.glowA} />
      <div className={styles.glowB} />
      <div className={styles.grain} />

      <button className={styles.skipBtn} onClick={goLogin}>
        건너뛰기
      </button>

      <div className={styles.slide} key={idx}>
        {/* 일러스트 */}
        <div className={styles.stage}>
          {idx === 0 && <Slide1Illust />}
          {idx === 1 && <Slide2Illust />}
          {idx === 2 && <Slide3Illust />}
        </div>

        {/* 텍스트 */}
        <div className={styles.textBlock}>
          <p className={`${styles.eyebrow} ${styles.anim} ${styles.animD1}`}>{slide.eyebrow}</p>
          <h2 className={`${styles.title} ${styles.anim} ${styles.animD2}`}>{slide.title}</h2>
          <p className={`${styles.body} ${styles.anim} ${styles.animD3}`}>{slide.body}</p>
        </div>
      </div>

      {/* 하단 */}
      <div className={styles.footer}>
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

/* ── Slide 1: 그룹 궤도 ──────────────────────────────────────────────────── */
function Slide1Illust() {
  return (
    <div className={styles.orbit}>
      <div className={styles.ring} />
      <div className={`${styles.ring} ${styles.ring2}`} />

      <div className={styles.orbitCore}>
        <div className={styles.orbitCoreGlow} />
        <div className={styles.orbitCoreInner}>
          <span className={styles.boltIcon}>⚡</span>
        </div>
      </div>

      <div className={`${styles.ava} ${styles.ava1}`}><PersonIcon /></div>
      <div className={`${styles.ava} ${styles.ava2}`}><PersonIcon /></div>
      <div className={`${styles.ava} ${styles.ava3}`}><PersonIcon /></div>
      <div className={`${styles.ava} ${styles.ava4}`}><PersonIcon /></div>
    </div>
  )
}

/* ── Slide 2: 미션 카운트다운 ────────────────────────────────────────────── */
function Slide2Illust() {
  return (
    <div className={styles.missionCard}>
      <div className={styles.missionCardGlow} />
      <div className={styles.missionCardLabel}>MISSION · 지금 바로</div>
      <div className={styles.missionCardTime}>04:32</div>
      <div className={styles.missionCardMission}>지금 내 표정 그대로 찍기</div>
      <div className={styles.missionCardCam}>🎬</div>
    </div>
  )
}

/* ── Slide 3: 콜라주 그리드 ──────────────────────────────────────────────── */
function Slide3Illust() {
  return (
    <div className={styles.collage}>
      <div className={styles.ctile} />
      <div className={styles.ctile} />
      <div className={styles.ctile} />
      <div className={styles.ctile} />
      <div className={`${styles.ctile} ${styles.ctileHeart}`}>💜</div>
      <div className={styles.ctile} />
    </div>
  )
}

function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" fill="rgba(255,255,255,0.85)" />
      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  )
}
