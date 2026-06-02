import type { ActiveMissionState } from '@/types'
import { MISSION_DURATION_S } from '@/constants'

/** 개발용 mock 미션 데이터 */
export function createMockMission(secondsLeft = MISSION_DURATION_S): ActiveMissionState {
  return {
    mission: {
      id: 1,
      room_id: 1,
      mission_template_id: 1,
      type: 'VIDEO',
      status: 'ACTIVE',
      targeted_at: new Date().toISOString(),
      deadline: new Date(Date.now() + secondsLeft * 1000).toISOString(),
      created_at: new Date().toISOString(),
      template: {
        id: 1,
        title: '지금 네 표정 그대로 찍기',
        description: '꾸미지 말고, 있는 그대로!',
      },
    },
    room: {
      id: 1,
      name: '새벽반',
      code: '7X8K2',
      thumbnail: null,
      owner_id: 1,
      max_members: 5,
      current_members: 5,
      daily_mission_count: 3,
      mission_start_time: '10:00:00',
      mission_end_time: '22:00:00',
      created_at: new Date().toISOString(),
    },
    seconds_left: secondsLeft,
    participations: [
      { user: { userId: 1, name: '유현', profileImage: null }, state: 'waiting' },
      { user: { userId: 2, name: '아영', profileImage: null }, state: 'waiting' },
      { user: { userId: 3, name: '지민', profileImage: null }, state: 'waiting' },
      { user: { userId: 4, name: '수현', profileImage: null }, state: 'waiting' },
      { user: { userId: 5, name: '대주', profileImage: null }, state: 'waiting' },
    ],
    my_submission: undefined,
  }
}
