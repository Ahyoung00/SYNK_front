import type { CollageCellData } from '@/utils/mockCollage'
import { getGridCols } from '@/utils/mockCollage'
import { CollageCell } from './CollageCell'
import styles from './CollageGrid.module.css'

// ─────────────────────────────────────────────────────────────────────────────
// CollageGrid — 2~10명 CSS Grid 자동 분할
//
//  2명: ██ ██          (2col × 1row)
//  3명: ██ ██          (2col × 2row, 마지막 셀 span 2)
//       ████
//  4명: ██ ██          (2col × 2row)
//       ██ ██
//  5명: ███ ███ ███    (3col × 2row, 마지막 셀 span 2)
//       ██████ ██████
//  6명: ███ ███ ███    (3col × 2row)
//       ███ ███ ███
//  9명: ███ ███ ███    (3col × 3row)
//       ███ ███ ███
//       ███ ███ ███
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  cells: CollageCellData[]
}

export function CollageGrid({ cells }: Props) {
  const count = cells.length
  const cols = getGridCols(count)
  const rows = Math.ceil(count / cols)

  // 마지막 행이 꽉 차지 않을 때, 마지막 셀의 span 계산
  const remainder = count % cols
  const lastCellColSpan = remainder === 0 ? 1 : cols - remainder + 1

  return (
    <div
      className={styles.grid}
      style={
        {
          '--cols': cols,
          '--rows': rows,
        } as React.CSSProperties
      }
    >
      {cells.map((cell, i) => {
        const isLast = i === count - 1
        const colSpan = isLast && lastCellColSpan > 1 ? lastCellColSpan : 1

        return (
          <div
            key={cell.user.id}
            className={styles.cellWrap}
            style={colSpan > 1 ? { gridColumn: `span ${colSpan}` } : undefined}
          >
            <CollageCell cell={cell} />
          </div>
        )
      })}
    </div>
  )
}
