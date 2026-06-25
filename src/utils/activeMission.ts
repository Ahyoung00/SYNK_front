import type { ActiveMissionItem, ActiveMissionState } from '@/types'

// ActiveMissionItem(API) → ActiveMissionState(store) 변환
export function toMissionState(item: ActiveMissionItem): ActiveMissionState {
  const toState = (status: string): 'done' | 'recording' | 'waiting' => {
    if (status === '완료')   return 'done'
    if (status === '찍는중') return 'recording'
    return 'waiting'
  }
  return {
    mission: {
      id:                  item.id,
      room_id:             item.roomId,
      mission_template_id: 0,
      type:                'VIDEO',
      status:              'ACTIVE',
      // remainingSeconds로부터 실제 발동 시각 역산
      targeted_at:         new Date(Date.now() - (300 - item.remainingSeconds) * 1000).toISOString(),
      deadline:            new Date(Date.now() + item.remainingSeconds * 1000).toISOString(),
      created_at:          new Date(Date.now() - (300 - item.remainingSeconds) * 1000).toISOString(),
      template: {
        id:          0,
        title:       item.title,
        description: item.description || undefined,
      },
    },
    room: {
      id:                  item.roomId,
      name:                item.roomName,
      code:                '',
      thumbnail:           item.roomThumbnail,
      owner_id:            0,
      max_members:         item.totalMembers,
      current_members:     item.totalMembers,
      daily_mission_count: 1,
      mission_start_time:  '',
      mission_end_time:    '',
      created_at:          null,
    },
    seconds_left:   item.remainingSeconds,
    participations: (item.participants ?? []).map((p) => ({
      user:  { userId: p.userId, name: p.name, profileImage: p.profileImage },
      state: toState(p.status),
    })),
  }
}
