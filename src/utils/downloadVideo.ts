/** S3 등 크로스 오리진 영상을 Blob으로 받아 강제 다운로드 */
export async function downloadVideo(url: string, filename: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(blobUrl)
  } catch {
    // fetch 실패 시 새 탭으로 폴백
    window.open(url, '_blank')
  }
}
