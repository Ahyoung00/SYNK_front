import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'
import { wsClient } from '@/services/websocket/client'
import { ROUTES } from '@/constants'
import { MOCK_CHAT_MESSAGES, formatDateLabel, formatTime } from '@/utils/mockChat'
import type { RoomChat, ChatReaction } from '@/types'
import styles from './RoomChatPage.module.css'

// ── Constants ────────────────────────────────────────────────────────────────
const EMOJI_OPTIONS = ['😂', '❤️', '😮', '🔥', '👍', '🎉'] as const
const GROUP_THRESHOLD_MS = 5 * 60_000          // 5 min → same group
const LONG_PRESS_MS = 500

// Mock room info (until backend)
const MOCK_ROOM = { id: 1, name: '새벽반', memberCount: 5 }

// ── Display item types ────────────────────────────────────────────────────────
interface DateItem  { kind: 'date'; label: string; key: string }
interface MsgItem   {
  kind: 'msg'
  msg: RoomChat
  isGroupFirst: boolean   // show sender name above
  isGroupLast: boolean    // show avatar + time
}
type DisplayItem = DateItem | MsgItem

function buildDisplayItems(msgs: RoomChat[]): DisplayItem[] {
  const items: DisplayItem[] = []
  let lastDate = ''

  for (let i = 0; i < msgs.length; i++) {
    const msg  = msgs[i]
    const date = msg.created_at.slice(0, 10)

    if (date !== lastDate) {
      items.push({ kind: 'date', label: formatDateLabel(msg.created_at), key: `d-${date}` })
      lastDate = date
    }

    const prev = msgs[i - 1]
    const next = msgs[i + 1]
    const ts   = new Date(msg.created_at).getTime()

    const samePrev =
      prev &&
      prev.user_id === msg.user_id &&
      prev.created_at.slice(0, 10) === date &&
      ts - new Date(prev.created_at).getTime() < GROUP_THRESHOLD_MS

    const sameNext =
      next &&
      next.user_id === msg.user_id &&
      next.created_at.slice(0, 10) === date &&
      new Date(next.created_at).getTime() - ts < GROUP_THRESHOLD_MS

    items.push({
      kind: 'msg',
      msg,
      isGroupFirst: !samePrev,
      isGroupLast:  !sameNext,
    })
  }
  return items
}

/** Group reactions by emoji for display */
function groupReactions(
  reactions: ChatReaction[],
  myUserId: number,
): { emoji: string; count: number; myId?: number }[] {
  const map = new Map<string, { count: number; myId?: number }>()
  for (const r of reactions) {
    const cur = map.get(r.emoji) ?? { count: 0 }
    if (r.user_id === myUserId) cur.myId = r.id
    cur.count++
    map.set(r.emoji, cur)
  }
  return Array.from(map.entries()).map(([emoji, v]) => ({ emoji, ...v }))
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function RoomChatPage() {
  const { roomId }  = useParams()
  const navigate    = useNavigate()
  const numRoomId   = Number(roomId ?? MOCK_ROOM.id)

  const myUser   = useAuthStore((s) => s.user)
  const myUserId = myUser?.id ?? 1

  const messages       = useChatStore((s) => s.messages[String(numRoomId)] ?? [])
  const reactionTarget = useChatStore((s) => s.reactionTarget)
  const prependMessages   = useChatStore((s) => s.prependMessages)
  const appendMessage     = useChatStore((s) => s.appendMessage)
  const addReaction       = useChatStore((s) => s.addReaction)
  const removeReaction    = useChatStore((s) => s.removeReaction)
  const setReactionTarget = useChatStore((s) => s.setReactionTarget)

  const [text, setText] = useState('')
  const listRef         = useRef<HTMLDivElement>(null)
  const inputRef        = useRef<HTMLTextAreaElement>(null)
  const isAtBottomRef   = useRef(true)
  const longPressTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Mock data seed ────────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length === 0) {
      prependMessages(numRoomId, MOCK_CHAT_MESSAGES)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initial scroll (instant) ──────────────────────────────────────────────
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll on new message (smooth if near bottom) ─────────────────────────
  useEffect(() => {
    if (isAtBottomRef.current) {
      const el = listRef.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages.length])

  // ── WS subscription ───────────────────────────────────────────────────────
  useEffect(() => {
    const offMsg = wsClient.on<RoomChat>('CHAT_MESSAGE', (ev) => {
      if (ev.room_id === numRoomId) appendMessage(ev.room_id, ev.payload)
    })
    const offReact = wsClient.on<ChatReaction>('CHAT_REACTION', (ev) => {
      if (ev.room_id === numRoomId)
        addReaction(ev.room_id, ev.payload.chat_id, ev.payload)
    })
    return () => { offMsg(); offReact() }
  }, [numRoomId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll position tracking ──────────────────────────────────────────────
  function handleScroll() {
    const el = listRef.current
    if (!el) return
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  function handleSend() {
    const content = text.trim()
    if (!content) return
    const msg: RoomChat = {
      id: Date.now(),
      room_id: numRoomId,
      user_id: myUserId,
      message_type: 'TEXT',
      content,
      created_at: new Date().toISOString(),
      user: { id: myUserId, name: myUser?.name ?? '유현' },
      reactions: [],
    }
    appendMessage(numRoomId, msg)
    setText('')
    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = 'auto'
    isAtBottomRef.current = true
    // wsClient.send({ type: 'CHAT_MESSAGE', room_id: numRoomId, payload: msg })
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ── Reaction toggle ────────────────────────────────────────────────────────
  const handleReactionToggle = useCallback((chatId: number, emoji: string) => {
    const msg = messages.find((m) => m.id === chatId)
    if (!msg) return
    const existing = (msg.reactions ?? []).find(
      (r) => r.user_id === myUserId && r.emoji === emoji,
    )
    if (existing) {
      removeReaction(numRoomId, chatId, existing.id)
    } else {
      addReaction(numRoomId, chatId, {
        id: Date.now(),
        chat_id: chatId,
        user_id: myUserId,
        emoji,
        created_at: new Date().toISOString(),
      })
    }
    setReactionTarget(null)
  }, [messages, myUserId, numRoomId, addReaction, removeReaction, setReactionTarget])

  // ── Long press ────────────────────────────────────────────────────────────
  function startLongPress(chatId: number) {
    longPressTimer.current = setTimeout(() => setReactionTarget(chatId), LONG_PRESS_MS)
  }
  function cancelLongPress() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }

  // ── Display items (memoized) ──────────────────────────────────────────────
  const displayItems = useMemo(
    () => buildDisplayItems(messages),
    [messages],
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── 헤더 ───────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <button className={styles.iconBtn} onClick={() => navigate(-1)} aria-label="뒤로">
          <BackIcon />
        </button>
        <div className={styles.headerCenter}>
          <span className={styles.headerTitle}>{MOCK_ROOM.name}</span>
          <span className={styles.headerSub}>{MOCK_ROOM.memberCount}명</span>
        </div>
        <button
          className={styles.iconBtn}
          onClick={() => navigate(ROUTES.ROOM_MEMBERS(numRoomId))}
          aria-label="멤버"
        >
          <PeopleIcon />
        </button>
      </div>

      {/* ── 미션 결과 배너 ─────────────────────────────────────────────────── */}
      <MissionResultBanner onPress={() => navigate(ROUTES.MISSION_RESULT(1))} />

      {/* ── 메시지 목록 ────────────────────────────────────────────────────── */}
      <div className={styles.msgList} ref={listRef} onScroll={handleScroll}>
        {displayItems.map((item) => {
          if (item.kind === 'date') {
            return <DateSep key={item.key} label={item.label} />
          }
          const { msg, isGroupFirst, isGroupLast } = item
          const isMe = msg.user_id === myUserId
          return (
            <MsgBubble
              key={msg.id}
              msg={msg}
              isMe={isMe}
              isGroupFirst={isGroupFirst}
              isGroupLast={isGroupLast}
              myUserId={myUserId}
              onLongPressStart={() => startLongPress(msg.id)}
              onLongPressEnd={cancelLongPress}
              onReactionTap={(emoji) => handleReactionToggle(msg.id, emoji)}
              onOpenPicker={() => setReactionTarget(msg.id)}
            />
          )
        })}
        <div className={styles.listBottom} />
      </div>

      {/* ── 입력창 ─────────────────────────────────────────────────────────── */}
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

      {/* ── 리액션 피커 바텀시트 ────────────────────────────────────────────── */}
      {reactionTarget !== null && (
        <div className={styles.pickerOverlay} onClick={() => setReactionTarget(null)}>
          <div className={styles.pickerSheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.pickerHandle} />
            <p className={styles.pickerHint}>리액션 추가</p>
            <div className={styles.pickerRow}>
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
  // Show when there's a completed mission result (mock: always in dev)
  if (!import.meta.env.DEV) return null
  return (
    <button className={styles.missionBanner} onClick={onPress}>
      <span className={styles.missionBannerIcon}>✨</span>
      <div className={styles.missionBannerBody}>
        <span className={styles.missionBannerTitle}>오늘의 미션 결과가 나왔어요!</span>
        <span className={styles.missionBannerSub}>참여율 100% · 5명 모두 완료</span>
      </div>
      <span className={styles.missionBannerArrow}>›</span>
    </button>
  )
}

interface MsgBubbleProps {
  msg: RoomChat
  isMe: boolean
  isGroupFirst: boolean
  isGroupLast: boolean
  myUserId: number
  onLongPressStart: () => void
  onLongPressEnd: () => void
  onReactionTap: (emoji: string) => void
  onOpenPicker: () => void
}

function MsgBubble({
  msg, isMe, isGroupFirst, isGroupLast, myUserId,
  onLongPressStart, onLongPressEnd, onReactionTap, onOpenPicker,
}: MsgBubbleProps) {
  const grouped = groupReactions(msg.reactions ?? [], myUserId)
  const initial = msg.user?.name?.charAt(0) ?? '?'

  return (
    <div
      className={[
        styles.msgRow,
        isMe ? styles.msgRowMe : styles.msgRowOther,
        isGroupLast ? styles.msgRowLast : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Avatar (others only, last in group) */}
      {!isMe && (
        isGroupLast
          ? <div className={styles.avatar}><span className={styles.avatarText}>{initial}</span></div>
          : <div className={styles.avatarSpacer} />
      )}

      {/* Bubble + meta */}
      <div className={[styles.bubbleCol, isMe ? styles.bubbleColMe : ''].filter(Boolean).join(' ')}>

        {/* Sender name (others only, first in group) */}
        {!isMe && isGroupFirst && (
          <span className={styles.senderName}>{msg.user?.name}</span>
        )}

        {/* Bubble */}
        <div
          className={[
            styles.bubble,
            isMe ? styles.bubbleMe : styles.bubbleOther,
            isGroupLast ? (isMe ? styles.tailMe : styles.tailOther) : '',
          ].filter(Boolean).join(' ')}
          onMouseDown={onLongPressStart}
          onMouseUp={onLongPressEnd}
          onMouseLeave={onLongPressEnd}
          onTouchStart={onLongPressStart}
          onTouchEnd={onLongPressEnd}
          onContextMenu={(e) => { e.preventDefault(); onOpenPicker() }}
        >
          <span className={styles.bubbleText}>{msg.content}</span>
        </div>

        {/* Time (last in group only) */}
        {isGroupLast && (
          <span className={[styles.msgTime, isMe ? styles.msgTimeMe : ''].filter(Boolean).join(' ')}>
            {formatTime(msg.created_at)}
          </span>
        )}

        {/* Reactions */}
        {grouped.length > 0 && (
          <div className={[styles.reactions, isMe ? styles.reactionsMe : ''].filter(Boolean).join(' ')}>
            {grouped.map(({ emoji, count, myId }) => (
              <button
                key={emoji}
                className={[styles.reactionChip, myId ? styles.reactionChipMine : ''].filter(Boolean).join(' ')}
                onClick={() => onReactionTap(emoji)}
              >
                <span>{emoji}</span>
                {count > 1 && <span className={styles.reactionCount}>{count}</span>}
              </button>
            ))}
            <button className={styles.addReactionChip} onClick={onOpenPicker} aria-label="리액션 추가">
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
