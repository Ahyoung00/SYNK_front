/**
 * 미션 제목 → 대표 이모지 매핑 (프론트 정적 단일 소스).
 * 같은 미션이 어디서 렌더되든 동일한 썸네일을 쓰도록 이 함수로 통일한다.
 * 제목 키워드 기반이라 templateId가 없는 화면(앨범/콜라주 등)에서도 동작.
 */
const RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/표정|얼굴|셀카/, '😊'],
  [/신발/, '👟'],
  [/발/, '👣'],
  [/손/, '✋'],
  [/하늘|구름/, '☁️'],
  [/아침|식사|밥|먹/, '🍳'],
  [/창문|창밖|창/, '🪟'],
  [/앉|자리|있는 곳/, '🪑'],
  [/식물|초록|화분/, '🪴'],
  [/마시|마실|커피|음료|물/, '☕'],
]

/** 미션 제목에 맞는 대표 이모지. 등록되지 않은(매칭 없는) 미션은 기본 ⚡ */
export function missionEmoji(title: string | null | undefined): string {
  const t = title ?? ''
  for (const [re, emoji] of RULES) {
    if (re.test(t)) return emoji
  }
  return '⚡'
}

/**
 * 미션 제목 → 대표 그라디언트 (프론트 정적 단일 소스).
 * 같은 미션명이 어디서 렌더되든(도감/앨범/콜라주 등) 동일한 색을 쓰도록 이 함수로 통일한다.
 */
const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
]

export function missionGradient(title: string | null | undefined): string {
  const t = title ?? ''
  let hash = 0
  for (let i = 0; i < t.length; i++) hash = (hash * 31 + t.charCodeAt(i)) | 0
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}
