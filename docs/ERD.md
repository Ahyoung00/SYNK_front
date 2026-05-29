# SYNK ERD

## 테이블 목록
1. users - 사용자
2. rooms - 방
3. room_members - 방 멤버
4. mission_templates - 미션 템플릿 (90개 고정)
5. mission_time_slots - 미션 시간 슬롯 (36개 고정)
6. missions - 실제 발동된 미션
7. submissions - 미션 제출
8. collages - 미션별 합성 영상
9. synklogs - 일별 릴스 영상
10. room_chats - 채팅
11. chat_reactions - 채팅 리액션
12. notifications - 알림
13. collection_records - 도감 기록

## 주요 관계
- rooms N:M users → room_members
- missions N:1 rooms
- missions N:1 mission_templates
- missions N:1 mission_time_slots
- submissions N:1 missions
- submissions N:1 users
- collages 1:1 missions
- synklogs N:1 rooms
- collection_records N:1 users
- collection_records N:1 mission_templates
- collection_records N:1 submissions

## ERD 코드
// ============================================
// SYNK ERD - 최종본
// ============================================

Table users {
id               bigint       [pk, increment]
auth_provider    auth_provider_enum [not null, note: 'kakao | google']
auth_provider_id varchar(255) [not null, note: 'OAuth 제공자 고유 ID']
name             varchar(100) [not null]
profile_image    varchar(255)
fcm_token        varchar(255)
status           varchar(20)  [default: 'active', note: 'active | pending_delete']
deleted_at       timestamp
mission_alert    bool         [default: true]
result_alert     bool         [default: true]
highlight_alert  bool         [default: true]
created_at       timestamp    [default: `CURRENT_TIMESTAMP`]
updated_at       timestamp    [default: `CURRENT_TIMESTAMP`]

indexes {
(auth_provider, auth_provider_id) [unique]
}
}

Table rooms {
id bigint [pk, increment]
name varchar(100) [not null]
code varchar(10) [unique, not null]
thumbnail varchar(255)
owner_id bigint [not null, ref: > users.id]
max_members int [not null]
daily_mission_count int [not null]
mission_start_time time [not null]
mission_end_time time [not null]
created_at timestamp [default: `CURRENT_TIMESTAMP`]
updated_at timestamp [default: `CURRENT_TIMESTAMP`]

indexes {
code
owner_id
}
}

Table room_members {
id bigint [pk, increment]
user_id bigint [not null, ref: > users.id]
room_id bigint [not null, ref: > rooms.id]
is_owner boolean [default: false]
joined_at timestamp [default: `CURRENT_TIMESTAMP`]

indexes {
(user_id, room_id) [unique]
room_id
}
}

Table mission_templates {
id bigint [pk, increment]
title varchar(200) [not null]
description varchar(500)
created_at timestamp [default: `CURRENT_TIMESTAMP`]

indexes {
title
}
}

Table mission_time_slots {
id bigint [pk, increment]
slot_time time [not null, note: '30분 간격 06:00~23:30']

indexes {
slot_time [unique]
}
}

Table missions {
id bigint [pk, increment]
room_id bigint [not null, ref: > rooms.id]
mission_template_id bigint [not null, ref: > mission_templates.id]
time_slot_id bigint [not null, ref: > mission_time_slots.id]
date date [not null]
status enum('PENDING', 'ACTIVE', 'COMPLETED', 'EXPIRED') [default: 'PENDING']

indexes {
(room_id, date, time_slot_id) [unique]
(date, time_slot_id, status)
room_id
mission_template_id
status
}
}

Table submissions {
id bigint [pk, increment]
user_id bigint [not null, ref: > users.id]
room_id bigint [not null, ref: > rooms.id]
mission_id bigint [not null, ref: > missions.id]
video_url varchar(255) [not null]
status enum('SUBMITTED', 'MISSED') [default: 'SUBMITTED']
submitted_at timestamp [default: `CURRENT_TIMESTAMP`]

indexes {
(mission_id, user_id) [unique]
room_id
user_id
}
}

Table collages {
id bigint [pk, increment]
mission_id bigint [unique, not null, ref: - missions.id]
room_id bigint [not null, ref: > rooms.id]
collage_video_url varchar(255)
thumbnail varchar(255)
status enum('PROCESSING', 'COMPLETED', 'FAILED') [default: 'PROCESSING']
participation_rate int
completion_time int
total_members int
submitted_count int
created_at timestamp [default: `CURRENT_TIMESTAMP`]
completed_at timestamp

indexes {
mission_id
room_id
status
}
}

Table synklogs {
id bigint [pk, increment]
room_id bigint [not null, ref: > rooms.id]
date date [not null]
synklog_video_url varchar(255)
thumbnail varchar(255)
status enum('PROCESSING', 'COMPLETED', 'FAILED') [default: 'PROCESSING']
created_at timestamp [default: `CURRENT_TIMESTAMP`]
completed_at timestamp

indexes {
(room_id, date) [unique]
room_id
status
}
}

Table room_chats {
id bigint [pk, increment]
room_id bigint [not null, ref: > rooms.id]
user_id bigint [not null, ref: > users.id]
message_type enum('TEXT', 'IMAGE', 'EMOJI') [not null]
content text [not null]
created_at timestamp [default: `CURRENT_TIMESTAMP`]

indexes {
room_id
created_at
}
}

Table chat_reactions {
id bigint [pk, increment]
chat_id bigint [not null, ref: > room_chats.id]
user_id bigint [not null, ref: > users.id]
emoji varchar(10) [not null]
created_at timestamp [default: `CURRENT_TIMESTAMP`]

indexes {
(chat_id, user_id, emoji) [unique]
chat_id
}
}

Table notifications {
id bigint [pk, increment]
user_id bigint [not null, ref: > users.id]
type enum('MISSION_START', 'MISSION_COMPLETE', 'SYNKLOG_CREATED', 'MEMBER_JOIN', 'ACHIEVEMENT') [not null]
title varchar(200) [not null]
content varchar(500) [not null]
related_id bigint
is_read boolean [default: false]
created_at timestamp [default: `CURRENT_TIMESTAMP`]

indexes {
user_id
is_read
created_at
}
}

Table collection_records {
id bigint [pk, increment]
user_id bigint [not null, ref: > users.id]
mission_template_id bigint [not null, ref: > mission_templates.id]
room_id bigint [not null, ref: > rooms.id]
submission_id bigint [not null, ref: > submissions.id]
date date [not null]
thumbnail varchar(255)
created_at timestamp [default: `CURRENT_TIMESTAMP`]

indexes {
(user_id, mission_template_id)
user_id
mission_template_id
submission_id
date
}
}

Enum auth_provider_enum {
kakao
google
}