/**
 * 영상을 기기에 저장.
 * - 모바일(iOS/Android): Web Share API로 공유 시트를 띄워 "동영상 저장(사진 앱)" 선택 가능
 * - 미지원(PC 등): Blob 다운로드
 */
export async function downloadVideo(url: string, filename: string) {
  let blob: Blob | null = null
  try {
    const res = await fetch(url)
    blob = await res.blob()
  } catch {
    // CORS 등으로 fetch 실패 → 새 탭 폴백
    window.open(url, '_blank')
    return
  }

  // 1) 모바일: 파일 공유 시트 (iOS "동영상 저장" → 사진 앨범)
  const file = new File([blob], filename, { type: blob.type || 'video/mp4' })
  const canShareFiles =
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] }) &&
    typeof navigator.share === 'function'

  if (canShareFiles) {
    try {
      await navigator.share({ files: [file], title: 'SYNKLOG' })
      return
    } catch (e: any) {
      // 사용자가 취소한 경우는 그대로 종료
      if (e?.name === 'AbortError') return
      // 그 외 실패 → 아래 다운로드 폴백
    }
  }

  // 2) 폴백: Blob 다운로드
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(blobUrl)
}
