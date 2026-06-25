import type { CollageCellData } from '@/utils/mockCollage'
import { getLayout } from '@/utils/cameraLayout'
import { CollageCell } from './CollageCell'
import styles from './CollageGrid.module.css'

interface Props {
  cells: CollageCellData[]
}

export function CollageGrid({ cells }: Props) {
  const count = cells.length
  const layout = getLayout(count)

  const rowHeightPct = `${100 / layout.length}%`

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
          style={{ height: rowHeightPct }}
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
