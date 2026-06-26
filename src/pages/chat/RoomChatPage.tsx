import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { chatApi, roomApi, albumApi } from '@/services/api/endpoints'
import { connectStomp, publishChat } from '@/services/websocket/client'
import { ROUTES } from '@/constants'
import { MOCK_CHAT_MESSAGES, formatDateLabel, formatTime, localNaiveNow } from '@/utils/mockChat'
import { setLastReadMessageId } from '@/utils/chatRead'
import type { RoomChatMessage, ChatReactionSummary } from '@/types'
import styles from './RoomChatPage.module.css'

function toHttps(url: string | null | undefined): string | null {
  if (!url) return null
  return url.replace(/^http:\/\//, 'https://')
}

// ── Constants ────────────────────────────────────────────────────────────────
const EMOJI_OPTIONS = ['😂', '❤️', '😮', '🔥', '👍', '🎉'] as const
const GROUP_THRESHOLD_MS = 5 * 60_000     // 5분 이내 연속 = 같은 그룹
const LONG_PRESS_MS = 500
const EMPTY_MSGS: RoomChatMessage[] = []  // 안정적인 빈 배열 참조 (매 렌더 새 [] 방지)

// ── Display item types ────────────────────────────────────────────────────────
interface DateItem { kind: 'date'; label: string; key: string }
interface MsgItem  {
  kind: 'msg'
  msg: RoomChatMessage
  isGroupFirst: boolean   // sender 이름 표시
  isGroupLast: boolean    // 아바타 + 시간 표시
}
type DisplayItem = DateItem | MsgItem

function buildDisplayItems(msgs: RoomChatMessage[]): DisplayItem[] {
  const items: DisplayItem[] = []
  let lastDate = ''

  for (let i = 0; i < msgs.length; i++) {
    const msg  = msgs[i]
    const date = msg.createdAt.slice(0, 10)

    if (date !== lastDate) {
      items.push({ kind: 'date', label: formatDateLabel(msg.createdAt), key: `d-${date}` })
      lastDate = date
    }

    const prev = msgs[i - 1]
    const next = msgs[i + 1]
    const ts   = new Date(msg.createdAt).getTime()

    const samePrev =
      prev &&
      prev.userId === msg.userId &&
      prev.createdAt.slice(0, 10) === date &&
      ts - new Date(prev.createdAt).getTime() < GROUP_THRESHOLD_MS

    const sameNext =
      next &&
      next.userId === msg.userId &&
      next.createdAt.slice(0, 10) === date &&
      new Date(next.createdAt).getTime() - ts < GROUP_THRESHOLD_MS

    items.push({ kind: 'msg', msg, isGroupFirst: !samePrev, isGroupLast: !sameNext })
  }
  return items
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function RoomChatPage() {
  const { roomId } = useParams()
  const navigate   = useNavigate()
  const numRoomId  = Number(roomId ?? 1)

  const myUser   = useAuthStore((s) => s.user)
  const myUserId = myUser?.userId ?? 1

  const messages       = useChatStore((s) => s.messages[String(numRoomId)] ?? EMPTY_MSGS)
  const myReactions    = useChatStore((s) => s.myReactions)
  const reactionTarget = useChatStore((s) => s.reactionTarget)
  const setMessages       = useChatStore((s) => s.setMessages)
  const appendMessage     = useChatStore((s) => s.appendMessage)
  const addReaction       = useChatStore((s) => s.addReaction)
  const removeReaction    = useChatStore((s) => s.removeReaction)
  const setReactionTarget = useChatStore((s) => s.setReactionTarget)

  const [text, setText]       = useState('')
  const [roomName, setRoomName]     = useState('')
  const [memberCount, setMemberCount] = useState(0)
  const [missionDone, setMissionDone] = useState(false)
  // 리액션 피커 앵커 위치 { top, isMe }
  const [pickerAnchor, setPickerAnchor] = useState<{ top: number; isMe: boolean } | null>(null)
  // userId → profileImage 맵 (STOMP 메시지에 profileImage 없을 때 보완용)
  const memberProfileMap = useRef<Map<number, string | null>>(new Map())

  const listRef        = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLTextAreaElement>(null)
  const isAtBottomRef  = useRef(true)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loaded         = useRef(false)

  // ── 메시지 목록 API 조회 + WebSocket 연결 ────────────────────────────────
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true

    // 멤버 프로필 맵 구축
    roomApi.getRoom(numRoomId)
      .then((res) => {
        res.data.members.forEach((m) => {
          memberProfileMap.current.set(m.userId, toHttps(m.profileImage))
        })
      })
      .catch(() => {})

    chatApi.getMessages(numRoomId)
      .then((res) => {
        setRoomName(res.data.roomName)
        setMemberCount(res.data.memberCount)

        // todayMissionCompleted=true여도 실제 제출된 콜라주가 있는지 추가 검증
        if (res.data.todayMissionCompleted) {
          const today = new Date()
          const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
          albumApi.getCollages(numRoomId, todayStr)
            .then((colRes) => {
              const hasSubmission = (colRes.data ?? []).some((c) =>
                c.participants.some((p) => p.state === 'done')
              )
              setMissionDone(hasSubmission)
            })
            .catch(() => setMissionDone(false))
        }

        const msgs = res.data.messages.length > 0
          ? res.data.messages.map((m) => ({
              ...m,
              profileImage: toHttps(m.profileImage) ?? memberProfileMap.current.get(Number(m.userId)) ?? null,
            }))
          : MOCK_CHAT_MESSAGES
        setMessages(numRoomId, msgs)
      })
      .catch(() => {
        if (messages.length === 0) setMessages(numRoomId, MOCK_CHAT_MESSAGES)
      })

    // STOMP WebSocket 실시간 수신
    const disconnectStomp = connectStomp(numRoomId, (incoming) => {
      const raw = incoming as RoomChatMessage
      // 내 userId면 optimistic update로 이미 표시됨 → echo 무시
      if (Number(raw.userId) === myUserId) return
      const msg: RoomChatMessage = {
        ...raw,
        profileImage: toHttps(raw.profileImage) ?? memberProfileMap.current.get(Number(raw.userId)) ?? null,
      }
      const existingIds = new Set(
        useChatStore.getState().messages[String(numRoomId)]?.map((m) => m.messageId) ?? []
      )
      if (!existingIds.has(msg.messageId)) {
        appendMessage(numRoomId, msg)
      }
    })

    return () => {
      disconnectStomp()
      loaded.current = false
    }
  }, [numRoomId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 초기 스크롤 (즉시) ────────────────────────────────────────────────────
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 새 메시지 오면 스크롤 ─────────────────────────────────────────────────
  useEffect(() => {
    if (isAtBottomRef.current) {
      const el = listRef.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages.length])

  // ── 채팅을 보고 있으므로 최신 메시지를 읽음 처리 ──────────────────────────
  useEffect(() => {
    const latestId = messages.reduce((max, m) => (m.messageId > max ? m.messageId : max), 0)
    setLastReadMessageId(numRoomId, latestId)
  }, [numRoomId, messages])

  // ── 스크롤 위치 추적 ──────────────────────────────────────────────────────
  function handleScroll() {
    const el = listRef.current
    if (!el) return
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  // ── 메시지 전송 ───────────────────────────────────────────────────────────
  function handleSend() {
    const content = text.trim()
    if (!content) return

    // optimistic update — 즉시 화면에 표시
    // 음수 ID: localStorage에 저장되지 않도록 (Date.now()를 쓰면 서버 ID와 비교 불가)
    const tempMsg: RoomChatMessage = {
      messageId:    -Date.now(),
      userId:       myUserId,
      userName:     myUser?.name ?? '나',
      profileImage: myUser?.profileImage ?? null,
      content,
      createdAt:    localNaiveNow(),
      isMyMessage:  true,
      myMessage:    true,
      reactions:    [],
    }
    appendMessage(numRoomId, tempMsg)
    setText('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    isAtBottomRef.current = true

    publishChat(numRoomId, content)
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSend() }
  }

  // ── 리액션 토글 ───────────────────────────────────────────────────────────
  const handleReactionToggle = useCallback((msgId: number, emoji: string) => {
    const rKey = `${numRoomId}:${msgId}`
    const myEmojis = myReactions[rKey] ?? []

    if (myEmojis.includes(emoji)) {
      // 같은 이모지 → 토글 해제
      removeReaction(numRoomId, msgId, emoji)
    } else if (myEmojis.length === 0) {
      // 아직 리액션 없을 때만 추가 허용
      addReaction(numRoomId, msgId, emoji)
      chatApi.addReaction(numRoomId, msgId, emoji).catch((err) => {
        const status = err?.response?.status
        if (status === 500 || status === 409) {
          // 서버에 이미 리액션 존재 — UI는 그대로, 이후 중복 시도 차단됨(myReactions 이미 등록)
        } else {
          // 다른 에러 → optimistic 롤백
          removeReaction(numRoomId, msgId, emoji)
        }
      })
    }
    // 이미 다른 이모지로 반응한 경우 → 무시 (서버 500 방지)
    closePicker()
  }, [myReactions, numRoomId, addReaction, removeReaction, setReactionTarget]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 롱프레스 ─────────────────────────────────────────────────────────────
  function startLongPress(msgId: number, e: React.TouchEvent | React.MouseEvent, isMe: boolean) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    longPressTimer.current = setTimeout(() => {
      // 피커를 버블 위쪽에 띄움 (공간 부족하면 아래)
      const pickerH = 72
      const top = rect.top - pickerH > 8 ? rect.top - pickerH : rect.bottom + 8
      setPickerAnchor({ top, isMe })
      setReactionTarget(msgId)
    }, LONG_PRESS_MS)
  }
  function cancelLongPress() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }

  function closePicker() {
    setReactionTarget(null)
    setPickerAnchor(null)
  }

  // ── 디스플레이 아이템 (메모) ───────────────────────────────────────────────
  const displayItems = useMemo(() => buildDisplayItems(messages), [messages])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── 헤더 ─────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <button className={styles.iconBtn} onClick={() => navigate(-1)} aria-label="뒤로">
          <BackIcon />
        </button>
        <div className={styles.headerCenter}>
          <span className={styles.headerTitle}>{roomName || '채팅'}</span>
          {memberCount > 0 && <span className={styles.headerSub}>{memberCount}명</span>}
        </div>
        <button
          className={styles.iconBtn}
          onClick={() => navigate(ROUTES.ROOM_MEMBERS(numRoomId))}
          aria-label="멤버"
        >
          <PeopleIcon />
        </button>
      </div>

      {/* ── 오늘 미션 결과 배너 ──────────────────────────────────────────── */}
      {missionDone && (
        <MissionResultBanner onPress={() => navigate(ROUTES.MISSION_RESULT('today'), { state: { roomId: numRoomId, returnTo: 'album' } })} />
      )}

      {/* ── 메시지 목록 ──────────────────────────────────────────────────── */}
      <div className={styles.msgList} ref={listRef} onScroll={handleScroll}>
        {displayItems.map((item) => {
          if (item.kind === 'date') {
            return <DateSep key={item.key} label={item.label} />
          }
          const { msg, isGroupFirst, isGroupLast } = item
          const rKey = `${numRoomId}:${msg.messageId}`
          return (
            <MsgBubble
              key={msg.messageId}
              msg={msg}
              isMe={msg.isMyMessage || msg.myMessage}
              isGroupFirst={isGroupFirst}
              isGroupLast={isGroupLast}
              myReactionEmojis={myReactions[rKey] ?? []}
              onLongPressStart={(e) => startLongPress(msg.messageId, e, msg.isMyMessage || msg.myMessage)}
              onLongPressEnd={cancelLongPress}
              onReactionTap={(emoji) => handleReactionToggle(msg.messageId, emoji)}
              onOpenPicker={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                const pickerH = 72
                const top = rect.top - pickerH > 8 ? rect.top - pickerH : rect.bottom + 8
                setPickerAnchor({ top, isMe: msg.isMyMessage || msg.myMessage })
                setReactionTarget(msg.messageId)
              }}
            />
          )
        })}
        <div className={styles.listBottom} />
      </div>

      {/* ── 입력창 ───────────────────────────────────────────────────────── */}
      <div className={styles.inputBar}>
        <textarea
          ref={inputRef}
          className={styles.input}
          value={text}
          rows={1}
          placeholder="메시지를 입력하세요"
          onChange={(e) => {
            setText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
          onKeyDown={handleKey}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!text.trim()}
          aria-label="전송"
        >
          <SendIcon />
        </button>
      </div>

      {/* ── 리액션 floating 피커 ────────────────────────────────────────── */}
      {reactionTarget !== null && pickerAnchor && (
        <div className={styles.pickerOverlay} onClick={closePicker}>
          <div
            className={[styles.pickerFloat, pickerAnchor.isMe ? styles.pickerFloatMe : styles.pickerFloatOther].join(' ')}
            style={{ top: pickerAnchor.top }}
            onClick={(e) => e.stopPropagation()}
          >
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                className={styles.pickerBtn}
                onClick={() => handleReactionToggle(reactionTarget, emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DateSep({ label }: { label: string }) {
  return (
    <div className={styles.dateSep}>
      <div className={styles.dateLine} />
      <span className={styles.dateLabel}>{label}</span>
      <div className={styles.dateLine} />
    </div>
  )
}

function MissionResultBanner({ onPress }: { onPress: () => void }) {
  return (
    <button className={styles.missionBanner} onClick={onPress}>
      <span className={styles.missionBannerIcon}>✨</span>
      <div className={styles.missionBannerBody}>
        <span className={styles.missionBannerTitle}>오늘의 미션 결과가 나왔어요!</span>
        <span className={styles.missionBannerSub}>콜라주 결과 보러가기</span>
      </div>
      <span className={styles.missionBannerArrow}>›</span>
    </button>
  )
}

interface MsgBubbleProps {
  msg: RoomChatMessage
  isMe: boolean
  isGroupFirst: boolean
  isGroupLast: boolean
  myReactionEmojis: string[]
  onLongPressStart: (e: React.TouchEvent | React.MouseEvent) => void
  onLongPressEnd: () => void
  onReactionTap: (emoji: string) => void
  onOpenPicker: (e: React.MouseEvent) => void
}

function MsgBubble({
  msg, isMe, isGroupFirst, isGroupLast, myReactionEmojis,
  onLongPressStart, onLongPressEnd, onReactionTap, onOpenPicker,
}: MsgBubbleProps) {
  const reactions = (msg.reactions ?? []).filter((r): r is ChatReactionSummary & { emoji: string } =>
    r.emoji !== null,
  )
  const initial = msg.userName.charAt(0) || '?'

  return (
    <div
      className={[
        styles.msgRow,
        isMe ? styles.msgRowMe : styles.msgRowOther,
        isGroupLast ? styles.msgRowLast : '',
      ].filter(Boolean).join(' ')}
    >
      {/* 아바타 (상대방 메시지, 그룹 마지막) */}
      {!isMe && (
        isGroupLast
          ? (
            <div className={styles.avatar}>
              {msg.profileImage
                ? <img src={msg.profileImage} alt={msg.userName} className={styles.avatarImg} />
                : <span className={styles.avatarText}>{initial}</span>
              }
            </div>
          )
          : <div className={styles.avatarSpacer} />
      )}

      {/* 버블 + 메타 */}
      <div className={[styles.bubbleCol, isMe ? styles.bubbleColMe : ''].filter(Boolean).join(' ')}>

        {/* 발신자 이름 (상대방, 그룹 첫 번째) */}
        {!isMe && isGroupFirst && (
          <span className={styles.senderName}>{msg.userName}</span>
        )}

        {/* 버블 + 시간 가로 묶음 */}
        <div className={[styles.bubbleTimeRow, isMe ? styles.bubbleTimeRowMe : ''].filter(Boolean).join(' ')}>
          <div
            className={[
              styles.bubble,
              isMe ? styles.bubbleMe : styles.bubbleOther,
              isGroupLast ? (isMe ? styles.tailMe : styles.tailOther) : '',
            ].filter(Boolean).join(' ')}
            onMouseDown={(e) => onLongPressStart(e)}
            onMouseUp={onLongPressEnd}
            onMouseLeave={onLongPressEnd}
            onTouchStart={(e) => onLongPressStart(e)}
            onTouchEnd={onLongPressEnd}
            onContextMenu={(e) => { e.preventDefault(); onOpenPicker(e) }}
          >
            <span className={styles.bubbleText}>{msg.content}</span>
          </div>

          {/* 시간 (그룹 마지막만) */}
          {isGroupLast && (
            <span className={[styles.msgTime, isMe ? styles.msgTimeMe : ''].filter(Boolean).join(' ')}>
              {formatTime(msg.createdAt)}
            </span>
          )}
        </div>

        {/* 리액션 — 버블 바로 아래 */}
        {reactions.length > 0 && (
          <div className={[styles.reactions, isMe ? styles.reactionsMe : ''].filter(Boolean).join(' ')}>
            {reactions.map(({ emoji, count }) => (
              <button
                key={emoji}
                className={[
                  styles.reactionChip,
                  myReactionEmojis.includes(emoji) ? styles.reactionChipMine : '',
                ].filter(Boolean).join(' ')}
                onClick={() => onReactionTap(emoji)}
              >
                <span>{emoji}</span>
                {count > 1 && <span className={styles.reactionCount}>{count}</span>}
              </button>
            ))}
            <button className={styles.addReactionChip} onClick={(e) => onOpenPicker(e)} aria-label="리액션 추가">
              <AddReactionIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  )
}

function AddReactionIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 13s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  )
}
