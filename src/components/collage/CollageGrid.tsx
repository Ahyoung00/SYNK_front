import type { CollageCellData } from '@/utils/mockCollage'
import { CollageCell } from './CollageCell'
import styles from './CollageGrid.module.css'

/**
 * Lambda LAYOUTS dict와 1:1 매핑.
 * 각 원소 = 해당 행(row)의 셀 수. 위→아래, 좌→우 순서.
 */
const LAYOUTS: Record<number, number[]> = {
  1:  [1],
  2:  [1, 1],
  3:  [1, 2],
  4:  [2, 2],
  5:  [2, 3],
  6:  [3, 3],
  7:  [3, 4],
  8:  [4, 4],
  9:  [3, 3, 3],
  10: [3, 3, 4],
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}
function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b
}

interface Props {
  cells: CollageCellData[]
}

export function CollageGrid({ cells }: Props) {
  const count = Math.max(1, Math.min(cells.length, 10))
  const rowConfig = LAYOUTS[count] ?? [count]
  const numRows   = rowConfig.length
  // 모든 행의 열 수의 LCM → CSS Grid의 총 열 수
  const totalCols = rowConfig.reduce(lcm, 1)

  // 셀을 행별로 분배
  let idx = 0
  const rows = rowConfig.map((colsInRow) => {
    const row = cells.slice(idx, idx + colsInRow)
    idx += colsInRow
    return { cells: row, colSpan: totalCols / colsInRow }
  })

  return (
    <div
      className={styles.grid}
      style={{
        gridTemplateRows:    `repeat(${numRows},   1fr)`,
        gridTemplateColumns: `repeat(${totalCols}, 1fr)`,
      }}
    >
      {rows.map((row, ri) =>
        row.cells.map((cell, ci) => (
          <div
            key={`${ri}-${ci}`}
            className={styles.cellWrap}
            style={{ gridColumn: `span ${row.colSpan}` }}
          >
            <CollageCell cell={cell} />
          </div>
        ))
      )}
    </div>
  )
}
