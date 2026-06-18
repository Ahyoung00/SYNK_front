import { useState } from 'react'
import NavHeader from '@/components/layout/NavHeader'
import styles from './InfoPage.module.css'

const FAQ: { q: string; a: string }[] = [
  {
    q: '미션 알림은 언제 오나요?',
    a: '방에 설정된 알림 시간대 안에서 랜덤한 시각에 미션이 발동돼요. 알림이 울리면 5분 안에 참여해야 기록으로 남아요.',
  },
  {
    q: '푸시 알림이 오지 않아요.',
    a: '마이페이지 > 알림 설정에서 미션 알림이 켜져 있는지 확인해주세요. iOS는 홈 화면에 앱을 추가(PWA 설치)한 뒤 알림 권한을 허용해야 푸시가 와요.',
  },
  {
    q: '방은 어떻게 시작되나요?',
    a: '방 인원이 다 차면(풀방) 다음 날부터 매일 자정에 그날의 미션이 자동으로 생성돼요. 인원이 차기 전까지는 대기 상태예요.',
  },
  {
    q: '미션을 놓치면 어떻게 되나요?',
    a: '5분 안에 참여하지 못하면 미참여로 기록돼요. 대신 다음 미션에 다시 참여할 수 있어요.',
  },
  {
    q: '도감은 무엇인가요?',
    a: '내가 완료한 미션들이 도감에 수집돼요. 같은 미션을 여러 번 완료하면 기록이 쌓여요.',
  },
  {
    q: '프로필 사진은 어떻게 바꾸나요?',
    a: '마이페이지 > 수정에서 프로필 사진과 이름을 변경할 수 있어요.',
  },
]

export default function HelpPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <div className={styles.page}>
      <NavHeader title="도움말" />

      <div className={styles.scroll}>
        <p className={styles.lead}>자주 묻는 질문</p>

        <div className={styles.faqList}>
          {FAQ.map((item, idx) => {
            const open = openIdx === idx
            return (
              <div key={item.q} className={styles.faqItem}>
                <button
                  className={styles.faqQuestion}
                  onClick={() => setOpenIdx(open ? null : idx)}
                  aria-expanded={open}
                >
                  <span>{item.q}</span>
                  <span className={[styles.faqArrow, open ? styles.faqArrowOpen : ''].filter(Boolean).join(' ')}>
                    ›
                  </span>
                </button>
                {open && <p className={styles.faqAnswer}>{item.a}</p>}
              </div>
            )
          })}
        </div>

        <div className={styles.contactCard}>
          <p className={styles.contactTitle}>더 궁금한 점이 있나요?</p>
          <a className={styles.contactLink} href="mailto:synk.team@gmail.com">
            synk.team@gmail.com
          </a>
        </div>
      </div>
    </div>
  )
}
