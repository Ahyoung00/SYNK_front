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
