import NavHeader from '@/components/layout/NavHeader'
import styles from './InfoPage.module.css'

export interface DocSection {
  heading?: string
  body: string
}

interface DocPageProps {
  title: string
  updated?: string
  sections: DocSection[]
}

/** 약관·정책 등 텍스트 문서 공용 페이지 */
export default function DocPage({ title, updated, sections }: DocPageProps) {
  return (
    <div className={styles.page}>
      <NavHeader title={title} />

      <div className={styles.scroll}>
        {updated && <p className={styles.docUpdated}>최종 업데이트: {updated}</p>}

        {sections.map((s, idx) => (
          <div key={idx} className={styles.docSection}>
            {s.heading && <h2 className={styles.docHeading}>{s.heading}</h2>}
            <p className={styles.docBody}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
