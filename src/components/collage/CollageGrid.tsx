import type { CollageCellData } from '@/utils/mockCollage'
import { getLayout } from '@/utils/cameraLayout'
import { CollageCell } from './CollageCell'
import styles from './CollageGrid.module.css'

// Lambda LAYOUTS 스펙 기준:
// 각 행의 셀 수가 다를 수 있으므로 행 단위로 flex row를 쌓는 방식으로 렌더링
// 예) 2인: [1,1] → 위/아래 각 1셀, 3인: [1,2] → 위 1셀/아래 2셀

interface Props {
  cells: CollageCellData[]
}

export function CollageGrid({ cells }: Props) {
  const count = cells.length
  const layout = getLayout(count) // e.g. [1,1] for 2명, [3,3] for 6명

  let cellIndex = 0
  const rows: CollageCellData[][] = layout.map((colsInRow) => {
    const row = cells.slice(cellIndex, cellIndex + colsInRow)
    cellIndex += colsInRow
    return row
  })

  return (
    <div className={styles.grid}>
      {rows.map((rowCells, rowIdx) => (
        <div
          key={rowIdx}
          className={styles.row}
          style={{ '--row-cols': rowCells.length } as React.CSSProperties}
        >
          {rowCells.map((cell) => (
            <div key={cell.user.id} className={styles.cellWrap}>
              <CollageCell cell={cell} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
