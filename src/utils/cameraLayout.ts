/**
 * 인원 수 → 카메라 분할 레이아웃
 * 각 원소는 해당 행(row)의 셀 개수를 나타냅니다.
 * 9:16 세로 기준 (릴스)
 */
export const CAMERA_LAYOUTS: Record<number, number[]> = {
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

/** 레이아웃에서 특정 셀 인덱스(0-based)의 [rowIndex, colIndex] 반환 */
export function getCellPosition(layout: number[], cellIndex: number): { row: number; col: number } {
  let remaining = cellIndex
  for (let row = 0; row < layout.length; row++) {
    if (remaining < layout[row]) return { row, col: remaining }
    remaining -= layout[row]
  }
  return { row: 0, col: 0 }
}

/** 인원 수에 맞는 레이아웃 반환 (범위 밖이면 가장 가까운 값 사용) */
export function getLayout(memberCount: number): number[] {
  if (memberCount <= 1) return CAMERA_LAYOUTS[1]
  if (memberCount >= 10) return CAMERA_LAYOUTS[10]
  return CAMERA_LAYOUTS[memberCount] ?? [memberCount]
}
