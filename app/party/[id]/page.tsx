'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import { getStorageUrl } from '../../lib/storage'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Toast { id: number; text: string; kind: 'success' | 'error' | 'info' }
type SyncStatus = 'synced' | 'syncing' | 'live'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getName = (profile: any) => profile?.nickname || profile?.username || 'User'

const getAvatarSrc = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return getStorageUrl(url)
}

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

/**
 * Copy text with a fallback for non-secure origins.
 * navigator.clipboard only exists on https/localhost — friends visiting
 * over the LAN (http://192.168.x.x:3000) would get nothing without this.
 */
const copyText = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {}
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

// ─── Toast hook ───────────────────────────────────────────────────────────────

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)
  const push = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = ++counter.current
    setToasts(prev => [...prev, { id, text, kind }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])
  return { toasts, push }
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ profile, size = 32 }: { profile: any; size?: number }) {
  const src = getAvatarSrc(profile?.avatar_url)
  const initial = getName(profile).charAt(0).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: 5, flexShrink: 0, overflow: 'hidden',
      background: 'linear-gradient(135deg, #c0392b, #7b1a1a)',
      border: '1px solid rgba(201,168,76,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#f0c96a', fontWeight: 700, fontSize: size * 0.4,
      fontFamily: "'Cinzel', serif",
    }}>
      {src
        ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initial
      }
    </div>
  )
}

// ─── Sync badge ───────────────────────────────────────────────────────────────

function SyncBadge({ status }: { status: SyncStatus }) {
  const map: Record<SyncStatus, { label: string; color: string }> = {
    live:    { label: 'LIVE',    color: '#e74c3c' },
    synced:  { label: 'SYNCED', color: '#2ecc71' },
    syncing: { label: 'SYNCING', color: '#c9a84c' },
  }
  const s = map[status]
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 20,
      background: `${s.color}18`,
      border: `1px solid ${s.color}44`,
      fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
      color: s.color, fontFamily: "'Cinzel', serif",
      transition: 'color 0.3s, background 0.3s, border-color 0.3s',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: s.color,
        animation: status === 'live' || status === 'syncing' ? 'hr-pulse 1.4s ease-in-out infinite' : 'none',
      }} />
      {s.label}
    </div>
  )
}

// ─── Loading ──────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0a0812',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 20,
      color: '#f0e6d3', fontFamily: "'Nunito', sans-serif",
    }}>
      <style>{`@keyframes hr-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      <div style={{ fontSize: 52 }}>🎉</div>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, letterSpacing: 2, color: 'rgba(201,168,76,0.6)' }}>
        Loading party...
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#c9a84c', opacity: 0.3,
            animation: `hr-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}

// ─── Video select modal ───────────────────────────────────────────────────────

function VideoSelectModal({ videos, onSelect, onClose }: {
  videos: any[]; onSelect: (v: any) => void; onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const filtered = videos.filter(v => v.title?.toLowerCase().includes(query.toLowerCase()))

  // Escape closes the modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
        zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        animation: 'hr-fadeIn 0.2s ease both',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#16121f',
          border: '1px solid rgba(201,168,76,0.18)',
          borderRadius: 12, padding: 28,
          maxWidth: 720, width: '100%', maxHeight: '82vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 32px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(201,168,76,0.06), 0 0 32px rgba(201,168,76,0.05)',
          animation: 'hr-scaleIn 0.25s cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{
            fontFamily: "'Cinzel', serif", fontSize: 20,
            color: '#f0e6d3', margin: 0, letterSpacing: 1.5,
          }}>
            🎬 Select a Video
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)',
              color: 'rgba(240,230,211,0.5)', fontSize: 16, cursor: 'pointer',
              width: 32, height: 32, borderRadius: 6, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.16)'
              ;(e.currentTarget as HTMLElement).style.color = '#c9a84c'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.08)'
              ;(e.currentTarget as HTMLElement).style.color = 'rgba(240,230,211,0.5)'
            }}
          >✕</button>
        </div>

        <input
          placeholder="Search videos..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            padding: '10px 14px',
            background: '#0f0c18',
            border: '1px solid rgba(201,168,76,0.15)',
            borderRadius: 7, color: '#f0e6d3', fontSize: 13,
            fontFamily: "'Nunito', sans-serif", outline: 'none',
            marginBottom: 18, flexShrink: 0,
          }}
          autoFocus
        />

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 ? (
            <p style={{ color: 'rgba(240,230,211,0.25)', textAlign: 'center', marginTop: 40, fontSize: 13 }}>
              No videos found
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
              {filtered.map(v => (
                <VideoSelectCard key={v.id} video={v} onClick={() => onSelect(v)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function VideoSelectCard({ video, onClick }: { video: any; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#0f0c18',
        border: `1px solid ${hovered ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.08)'}`,
        borderRadius: 7, overflow: 'hidden', cursor: 'pointer',
        transform: hovered ? 'translateY(-3px) scale(1.03)' : 'translateY(0) scale(1)',
        boxShadow: hovered ? '0 10px 26px rgba(0,0,0,0.6), 0 0 14px rgba(201,168,76,0.1)' : 'none',
        transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div style={{ width: '100%', aspectRatio: '16/9', background: '#1e1828', overflow: 'hidden', position: 'relative' }}>
        {video.thumbnail_url ? (
          <>
            <img
              src={getStorageUrl(video.thumbnail_url)}
              alt={video.title}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                transform: hovered ? 'scale(1.07)' : 'scale(1)',
                transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,8,18,0.7), transparent)' }} />
          </>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, opacity: 0.25 }}>🎬</div>
        )}
      </div>
      <div style={{ padding: '8px 10px 10px' }}>
        <div style={{ fontSize: 12, color: hovered ? '#f0c96a' : '#f0e6d3', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Nunito', sans-serif", transition: 'color 0.2s' }}>
          {video.title}
        </div>
        <div style={{ fontSize: 9, color: '#c9a84c', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: "'Cinzel', serif", marginTop: 3 }}>
          {video.category}
        </div>
      </div>
    </div>
  )
}

// ─── Chat panel ───────────────────────────────────────────────────────────────

function ChatPanel({ messages, user, message, setMessage, onSend, chatRef, isVisible }: any) {

  useEffect(() => {
    if (!isVisible) return
    const el = chatRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (nearBottom) el.scrollTop = el.scrollHeight
  }, [messages, isVisible])

  const grouped = messages.reduce((acc: any[], msg: any, i: number) => {
    const prev = messages[i - 1]
    const isSame = prev && prev.user_id === msg.user_id &&
      new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 60_000
    acc.push({ ...msg, grouped: isSame })
    return acc
  }, [])

  return (
    <>
      <div
        ref={chatRef}
        style={{
          flex: 1, overflowY: 'auto', padding: '14px 12px',
          display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0,
        }}
      >
        {grouped.length === 0 && (
          <div style={{
            textAlign: 'center', color: 'rgba(240,230,211,0.2)',
            fontSize: 13, marginTop: 48, lineHeight: 1.9,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>👋</div>
            No messages yet — say hi!
          </div>
        )}

        {grouped.map((msg: any) => {
          const isOwn = msg.user_id === user?.id
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex', gap: 8,
                flexDirection: isOwn ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                marginTop: msg.grouped ? 2 : 12,
                animation: 'hr-fadeUp 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <div style={{ width: 28, flexShrink: 0 }}>
                {!msg.grouped && <Avatar profile={msg.profiles} size={28} />}
              </div>
              <div style={{ maxWidth: '72%' }}>
                {!msg.grouped && !isOwn && (
                  <div style={{ fontSize: 11, color: '#c9a84c', fontWeight: 700, marginBottom: 3, letterSpacing: 0.5, fontFamily: "'Cinzel', serif" }}>
                    {getName(msg.profiles)}
                  </div>
                )}
                <div style={{
                  padding: '8px 13px',
                  background: isOwn
                    ? 'linear-gradient(135deg, rgba(192,57,43,0.22), rgba(123,26,26,0.18))'
                    : 'rgba(30,24,40,0.9)',
                  border: `1px solid ${isOwn ? 'rgba(192,57,43,0.28)' : 'rgba(201,168,76,0.1)'}`,
                  borderRadius: isOwn ? '12px 3px 12px 12px' : '3px 12px 12px 12px',
                  fontSize: 14, color: '#f0e6d3', lineHeight: 1.5, wordBreak: 'break-word',
                }}>
                  {msg.message}
                </div>
                <div style={{
                  fontSize: 10, color: 'rgba(240,230,211,0.18)', marginTop: 3,
                  textAlign: isOwn ? 'right' : 'left',
                }}>
                  {formatTime(msg.created_at)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid rgba(201,168,76,0.1)',
        display: 'flex', gap: 8, flexShrink: 0,
        background: 'rgba(15,12,24,0.8)',
      }}>
        <input
          style={{
            flex: 1, padding: '10px 14px',
            background: '#16121f',
            border: '1px solid rgba(201,168,76,0.12)',
            borderRadius: 8, color: '#f0e6d3', fontSize: 14,
            fontFamily: "'Nunito', sans-serif", outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          placeholder="Say something..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && onSend()}
          onFocus={e => {
            e.target.style.borderColor = 'rgba(201,168,76,0.4)'
            e.target.style.boxShadow = '0 0 12px rgba(201,168,76,0.08)'
          }}
          onBlur={e => {
            e.target.style.borderColor = 'rgba(201,168,76,0.12)'
            e.target.style.boxShadow = 'none'
          }}
        />
        <button
          onClick={onSend}
          style={{
            padding: '10px 14px',
            background: 'linear-gradient(135deg, #c0392b, #7b1a1a)',
            color: '#f0c96a', border: '1px solid rgba(201,168,76,0.25)',
            borderRadius: 8, fontSize: 15, cursor: 'pointer',
            transition: 'all 0.15s', flexShrink: 0,
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #c0392b, #7b1a1a)')}
        >➤</button>
      </div>
    </>
  )
}

// ─── Members panel ────────────────────────────────────────────────────────────

function MembersPanel({ members, hostId, onlineUserIds }: any) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
      {members.map((m: any, i: number) => {
        const isOnline = onlineUserIds?.has(m.user_id)
        return (
          <div
            key={m.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', background: '#16121f',
              borderRadius: 8, border: '1px solid rgba(201,168,76,0.08)',
              animation: `hr-fadeUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) ${Math.min(i * 0.05, 0.3)}s both`,
            }}
          >
            <Avatar profile={m.profiles} size={36} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: '#f0e6d3', fontWeight: 600 }}>{getName(m.profiles)}</div>
              {m.user_id === hostId && (
                <div style={{ fontSize: 10, color: '#c9a84c', letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: "'Cinzel', serif", marginTop: 2 }}>
                  👑 Host
                </div>
              )}
            </div>
            {/* Online indicator */}
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: isOnline ? '#2ecc71' : 'rgba(240,230,211,0.15)',
              boxShadow: isOnline ? '0 0 6px rgba(46,204,113,0.6)' : 'none',
              animation: isOnline ? 'hr-pulse 2.5s ease-in-out infinite' : 'none',
              transition: 'background 0.3s',
            }} />
          </div>
        )
      })}
    </div>
  )
}

// ─── Invite panel ─────────────────────────────────────────────────────────────

function InvitePanel({ inviteCode, onCopy, copied, usernameInput, setUsernameInput, onAddUser }: any) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 22, minHeight: 0 }}>
      {/* Code section */}
      <div>
        <p style={{
          fontSize: 11, color: 'rgba(201,168,76,0.5)',
          letterSpacing: 2, textTransform: 'uppercase',
          marginBottom: 10, fontFamily: "'Cinzel', serif",
        }}>
          Invite Code
        </p>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px', background: '#16121f',
          border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8,
          boxShadow: 'inset 0 1px 0 rgba(201,168,76,0.05)',
        }}>
          <span style={{
            flex: 1, fontFamily: "'Courier New', monospace",
            fontSize: 22, color: '#c9a84c', letterSpacing: 5, fontWeight: 700,
          }}>
            {inviteCode}
          </span>
          <button
            onClick={onCopy}
            style={{
              padding: '7px 14px',
              background: copied
                ? 'rgba(46,204,113,0.12)'
                : 'rgba(201,168,76,0.1)',
              border: `1px solid ${copied ? 'rgba(46,204,113,0.3)' : 'rgba(201,168,76,0.2)'}`,
              borderRadius: 6,
              color: copied ? '#2ecc71' : '#c9a84c',
              fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
              fontWeight: 700, letterSpacing: 0.5,
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(240,230,211,0.2)', marginTop: 8, lineHeight: 1.5 }}>
          Share this code with friends to join the party
        </p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'linear-gradient(to right, rgba(201,168,76,0.15), transparent)' }} />

      {/* Username section */}
      <div>
        <p style={{
          fontSize: 11, color: 'rgba(201,168,76,0.5)',
          letterSpacing: 2, textTransform: 'uppercase',
          marginBottom: 10, fontFamily: "'Cinzel', serif",
        }}>
          Invite by Username
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{
              flex: 1, padding: '10px 13px',
              background: '#16121f',
              border: '1px solid rgba(201,168,76,0.12)',
              borderRadius: 7, color: '#f0e6d3', fontSize: 13,
              fontFamily: "'Nunito', sans-serif", outline: 'none',
              transition: 'border-color 0.2s',
            }}
            placeholder="Username or nickname..."
            value={usernameInput}
            onChange={e => setUsernameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onAddUser()}
            onFocus={e => (e.target.style.borderColor = 'rgba(201,168,76,0.4)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(201,168,76,0.12)')}
          />
          <button
            onClick={onAddUser}
            style={{
              padding: '10px 16px',
              background: 'linear-gradient(135deg, #c0392b, #7b1a1a)',
              color: '#f0c96a', border: '1px solid rgba(201,168,76,0.25)',
              borderRadius: 7, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Cinzel', serif",
              letterSpacing: 0.5, transition: 'all 0.15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #c0392b, #7b1a1a)')}
          >Add</button>
        </div>
      </div>
    </div>
  )
}

// ─── Right sidebar ────────────────────────────────────────────────────────────

function PartyRightPanel(props: any) {
  const [tab, setTab] = useState<'chat' | 'members' | 'invite'>('chat')
  const { messages, members, user, message, setMessage, handleSendMessage,
    chatRef, inviteCode, inviteUserInput, setInviteUserInput,
    handleInviteByUsername, handleCopyInvite, inviteCopied, hostId, onlineUserIds } = props

  const TABS = [
    { id: 'chat' as const,    label: '💬 Chat' },
    { id: 'members' as const, label: `👥 ${members.length}` },
    { id: 'invite' as const,  label: '＋ Invite' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(201,168,76,0.1)',
        flexShrink: 0, background: 'rgba(10,8,18,0.5)',
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '13px 8px', textAlign: 'center',
              fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              cursor: 'pointer', background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t.id ? '#c9a84c' : 'transparent'}`,
              color: tab === t.id ? '#c9a84c' : 'rgba(240,230,211,0.35)',
              fontFamily: "'Nunito', sans-serif", transition: 'all 0.18s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* key={tab} remounts the panel so switching tabs plays a quick fade-up */}
      <div key={tab} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, animation: 'hr-fadeUp 0.22s cubic-bezier(0.22, 1, 0.36, 1)' }}>
        {tab === 'chat' && (
          <ChatPanel
            messages={messages} user={user} message={message}
            setMessage={setMessage} onSend={handleSendMessage}
            chatRef={chatRef} isVisible={tab === 'chat'}
          />
        )}
        {tab === 'members' && <MembersPanel members={members} hostId={hostId} onlineUserIds={onlineUserIds} />}
        {tab === 'invite' && (
          <InvitePanel
            inviteCode={inviteCode}
            onCopy={handleCopyInvite}
            copied={inviteCopied}
            usernameInput={inviteUserInput}
            setUsernameInput={setInviteUserInput}
            onAddUser={handleInviteByUsername}
          />
        )}
      </div>
    </div>
  )
}

// ─── Toast layer ──────────────────────────────────────────────────────────────

function ToastLayer({ toasts }: { toasts: Toast[] }) {
  const colors: Record<Toast['kind'], string> = {
    success: '#2ecc71', error: '#e74c3c', info: '#c9a84c',
  }
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      zIndex: 500, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '9px 20px', borderRadius: 20,
          background: `${colors[t.kind]}18`,
          border: `1px solid ${colors[t.kind]}55`,
          color: colors[t.kind], fontSize: 13, fontWeight: 600,
          animation: 'hr-fadeUp 0.25s cubic-bezier(0.22, 1, 0.36, 1)', whiteSpace: 'nowrap',
          backdropFilter: 'blur(12px)',
          boxShadow: `0 4px 20px ${colors[t.kind]}22`,
          fontFamily: "'Nunito', sans-serif",
        }}>
          {t.text}
        </div>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PartyRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [partyId, setPartyId] = useState('')
  const [user, setUser] = useState<any>(null)
  const [party, setParty] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [videos, setVideos] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [showVideoSelect, setShowVideoSelect] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [inviteUserInput, setInviteUserInput] = useState('')
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced')
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const suppressPlaybackEventRef = useRef(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const chatRef  = useRef<HTMLDivElement>(null)
  const isHostRef = useRef(false)
  const userRef  = useRef<any>(null)
  const currentVideoIdRef = useRef<string | null>(null)
  const { toasts, push: pushToast } = useToasts()
  const lastSyncRef = useRef<{ playbackTime: number; syncedAt: number; isPlaying: boolean }>({
  playbackTime: 0, syncedAt: Date.now(), isPlaying: false,
  })

  const isHost = party?.host_id === user?.id
  isHostRef.current = isHost

  useEffect(() => { params.then(p => setPartyId(p.id)) }, [params])

  // ── Load & realtime ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!partyId) return

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      userRef.current = session.user

      await supabase.from('party_members').upsert({ party_id: partyId, user_id: session.user.id })

      const { data: partyData } = await supabase
        .from('parties')
        .select('*, videos(id, title, video_url, thumbnail_url)')
        .eq('id', partyId).single()
      setParty(partyData)
      if (partyData) {
        lastSyncRef.current = {
          playbackTime: partyData.playback_time || 0,
          syncedAt: Date.now(),
          isPlaying: partyData.is_playing || false,
        }
        currentVideoIdRef.current = partyData.video_id ?? null
      }

      const [{ data: md }, { data: ms }, { data: vs }] = await Promise.all([
        supabase.from('party_members').select('*, profiles(id, nickname, username, avatar_url)').eq('party_id', partyId),
        supabase.from('party_messages').select('*, profiles(nickname, username, avatar_url)').eq('party_id', partyId).order('created_at', { ascending: true }).limit(100),
        supabase.from('videos').select('*'),
      ])
      setMembers(md || [])
      setMessages(ms || [])
      setVideos(vs || [])

      const channel = supabase
        .channel(`party_${partyId}_room`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'parties', filter: `id=eq.${partyId}` },
          async payload => {
            const newVideoId = payload.new.video_id
            const prevVideoId = currentVideoIdRef.current
            lastSyncRef.current = {
              playbackTime: payload.new.playback_time || 0,
              syncedAt: Date.now(),
              isPlaying: payload.new.is_playing || false,
            }
            if (newVideoId && newVideoId !== prevVideoId) {
              currentVideoIdRef.current = newVideoId
              const { data: vid } = await supabase.from('videos').select('*').eq('id', newVideoId).single()
              setParty((prev: any) => ({ ...prev, ...payload.new, videos: vid ?? prev?.videos }))
            } else {
              setParty((prev: any) => ({ ...prev, ...payload.new, videos: prev?.videos }))
            }
          }
        )
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'party_messages', filter: `party_id=eq.${partyId}` },
          async payload => {
            const { data } = await supabase.from('party_messages').select('*, profiles(nickname, username, avatar_url)').eq('id', payload.new.id).single()
            if (data) setMessages(prev => {
              if (prev.some(m => m.id === data.id)) return prev
              return [...prev, data]
            })
          }
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'party_members', filter: `party_id=eq.${partyId}` },
          async () => {
            const { data } = await supabase.from('party_members').select('*, profiles(id, nickname, username, avatar_url)').eq('party_id', partyId)
            setMembers(data || [])
          }
        )
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'parties', filter: `id=eq.${partyId}` },
          () => {
            pushToast('The host ended the party', 'info')
            setTimeout(() => router.push('/party'), 1500)
          }
        )
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState<{ user_id: string }>()
          const ids = new Set(Object.values(state).flat().map(p => p.user_id))
          setOnlineUserIds(ids)
        })

        const currentUserId = session.user.id

        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ user_id: currentUserId })
          }
        })

      return channel
    }

    let channelRef: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    load().then(ch => {
      if (cancelled) {
        if (ch) supabase.removeChannel(ch)
        return
      }
      if (ch) channelRef = ch
    })

    const resyncInterval = setInterval(async () => {
      if (isHostRef.current || !videoRef.current) return
      const fetchedAt = Date.now()
      const { data: fresh } = await supabase.from('parties').select('is_playing, playback_time').eq('id', partyId).single()
      if (!videoRef.current) return
      if (!fresh) {
        pushToast('The host ended the party', 'info')
        router.push('/party')
        return
      }

      const expectedTime = fresh.is_playing
        ? (fresh.playback_time || 0) + (Date.now() - fetchedAt) / 1000
        : (fresh.playback_time || 0)

      const diff = Math.abs(videoRef.current.currentTime - expectedTime)
      if (diff > 8) {
        setSyncStatus('syncing')
        videoRef.current.currentTime = expectedTime
        setTimeout(() => setSyncStatus('synced'), 1200)
      }
      if (fresh.is_playing && videoRef.current.paused) videoRef.current.play().catch(() => { pushToast('Tap the video to resume playback', 'info') })
      else if (!fresh.is_playing && !videoRef.current.paused) videoRef.current.pause()
    }, 5000)

    return () => {
      cancelled = true
      if (channelRef) supabase.removeChannel(channelRef)
      clearInterval(resyncInterval)
    }
  }, [partyId, router, pushToast])


  // ── Video sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video || !party?.videos) return
    if (!isHost && syncStatus === 'synced') return
    const applySync = () => {
      const sync = lastSyncRef.current
      const expectedTime = party.is_playing
        ? sync.playbackTime + (Date.now() - sync.syncedAt) / 1000
        : (party.playback_time || 0)
      const diff = Math.abs(video.currentTime - expectedTime)
      if (diff > 2) video.currentTime = expectedTime
      suppressPlaybackEventRef.current = true
      if (party.is_playing) video.play().catch(() => {
        pushToast('Tap the video to resume playback', 'info')
      })
      else video.pause()
      queueMicrotask(() => { suppressPlaybackEventRef.current = false })
    }
    if (video.readyState >= 1) applySync()
    else {
      video.addEventListener('loadedmetadata', applySync, { once: true })
      return () => video.removeEventListener('loadedmetadata', applySync)
    }
  }, [party?.is_playing, party?.playback_time, party?.video_id, party?.videos])

   useEffect(() => {
    return () => {
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current)
    }
  }, [])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handlePlay  = async () => { if (!isHost || suppressPlaybackEventRef.current) return; await supabase.from('parties').update({ is_playing: true,  playback_time: videoRef.current?.currentTime || 0 }).eq('id', partyId) }
  const handlePause = async () => { if (!isHost || suppressPlaybackEventRef.current) return; await supabase.from('parties').update({ is_playing: false, playback_time: videoRef.current?.currentTime || 0 }).eq('id', partyId) }
  const handleSeeked = () => {
    if (!isHost) return
    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current)
    seekTimeoutRef.current = setTimeout(async () => {
      await supabase.from('parties').update({ playback_time: videoRef.current?.currentTime || 0 }).eq('id', partyId)
    }, 250)
  }

  const handleSendMessage = async () => {
    const text = message.trim()
    if (!text || !user) return
    setMessage('')
    await supabase.from('party_messages').insert({ party_id: partyId, user_id: user.id, message: text })
  }

  const handleSelectVideo = async (video: any) => {
    await supabase.from('parties').update({ video_id: video.id, is_playing: false, playback_time: 0 }).eq('id', partyId)
    currentVideoIdRef.current = video.id
    setParty((prev: any) => ({ ...prev, videos: video, video_id: video.id, is_playing: false, playback_time: 0 }))
    setShowVideoSelect(false)
    pushToast(`Now playing: ${video.title}`, 'success')
  }

  const handleLeave = async () => {
    if (!user) { router.push('/party'); return }
    await supabase.from('party_members').delete().eq('party_id', partyId).eq('user_id', user.id)

    if (isHost) {
      // Fetch fresh list instead of relying on stale React state
      const { data: remaining } = await supabase
        .from('party_members')
        .select('user_id')
        .eq('party_id', partyId)
        .neq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (remaining) {
        await supabase.from('parties').update({ host_id: remaining.user_id }).eq('id', partyId)
      } else {
        await supabase.from('parties').delete().eq('id', partyId)
      }
    }

    router.push('/party')
  }

  const handleCopyInvite = async () => {
    const ok = await copyText(party?.invite_code || '')
    if (ok) {
      setInviteCopied(true)
      pushToast('Invite code copied!', 'success')
      setTimeout(() => setInviteCopied(false), 2000)
    } else {
      // Clipboard unavailable (e.g. http over LAN) — at least show the code
      pushToast(`Code: ${party?.invite_code}`, 'info')
    }
  }

  const handleInviteByUsername = async () => {
    const name = inviteUserInput.trim()
    if (!name) return
    // Two exact-match lookups instead of a single .or() filter — the .or()
    // string breaks on names containing commas/parentheses, and .single()
    // threw a 406 whenever no user matched.
    let { data: profile } = await supabase.from('profiles').select('id')
      .eq('username', name).maybeSingle()
    if (!profile) {
      const { data: byNick } = await supabase.from('profiles').select('id')
        .eq('nickname', name).maybeSingle()
      profile = byNick
    }
    if (!profile) { pushToast('User not found', 'error'); return }
    await supabase.from('party_members').upsert({ party_id: partyId, user_id: profile.id })
    pushToast(`${name} added!`, 'success')
    setInviteUserInput('')
  }

  if (!party) return <LoadingSkeleton />

  return (
    <div style={{
      height: '100vh', background: '#0a0812', color: '#f0e6d3',
      fontFamily: "'Nunito', sans-serif", display: 'flex',
      flexDirection: 'column', overflow: 'hidden', paddingTop: 70,
    }}>
      <style>{`
        @keyframes hr-pulse   { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes hr-fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hr-fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes hr-scaleIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }

        .party-room {
          display: grid; grid-template-columns: 1fr 320px;
          height: calc(100vh - 70px); overflow: hidden;
          animation: hr-fadeIn 0.4s ease both;
        }

        .party-left { display: flex; flex-direction: column; overflow: hidden; height: 100%; }
        .party-right { background: #0f0c18; border-left: 1px solid rgba(201,168,76,0.1); display: flex; flex-direction: column; height: 100%; overflow: hidden; }

        .party-header {
          padding: 12px 20px;
          border-bottom: 1px solid rgba(201,168,76,0.1);
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 10px;
          background: linear-gradient(to bottom, rgba(10,8,18,0.95), rgba(15,12,24,0.9));
          flex-shrink: 0;
        }

        .party-video-area {
          flex: 1; background: #000; position: relative;
          overflow: hidden; min-height: 0;
        }
        .party-video-area video {
          width: 100%; height: 100%; object-fit: contain;
          display: block; background: #000;
        }

        .no-video {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 16px; color: rgba(240,230,211,0.25);
          background: radial-gradient(ellipse at center, rgba(192,57,43,0.04) 0%, transparent 70%);
          min-height: 0;
        }

        .party-btn {
          padding: 7px 14px; border-radius: 6px; font-size: 12px;
          font-weight: 700; cursor: pointer; border: none;
          font-family: 'Nunito', sans-serif; transition: all 0.2s;
          letter-spacing: 0.5px; display: inline-flex; align-items: center; gap: 5px;
        }
        .party-btn:hover { transform: translateY(-1px); }
        .party-btn:active { transform: translateY(0) scale(0.96); transition-duration: 0.08s; }
        .party-btn-gold {
          background: rgba(201,168,76,0.1); color: #c9a84c;
          border: 1px solid rgba(201,168,76,0.25) !important;
        }
        .party-btn-gold:hover { background: rgba(201,168,76,0.18); border-color: #c9a84c !important; box-shadow: 0 0 12px rgba(201,168,76,0.2); }
        .party-btn-red {
          background: linear-gradient(135deg, #c0392b, #7b1a1a);
          color: #f0c96a; border: 1px solid rgba(201,168,76,0.25) !important;
        }
        .party-btn-red:hover { background: linear-gradient(135deg, #e74c3c, #c0392b); box-shadow: 0 0 14px rgba(192,57,43,0.3); }
        .party-btn-danger {
          background: rgba(192,57,43,0.15); color: #e74c3c;
          border: 1px solid rgba(192,57,43,0.3) !important;
        }
        .party-btn-danger:hover { background: rgba(192,57,43,0.25); }

        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(201,168,76,0.4); }

        @media (max-width: 768px) {
          .party-room { grid-template-columns: 1fr; grid-template-rows: auto 1fr; height: calc(100vh - 64px); }
          .party-video-area { max-height: 35vh; }
          .party-right { height: 100%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .party-room { animation: none; }
          .party-btn { transition: none; }
          .party-btn:hover { transform: none; }
        }
      `}</style>

      <Navbar />

      <div className="party-room">
        {/* ── Left ── */}
        <div className="party-left">
          {/* Header */}
          <div className="party-header">
            <div>
              <div style={{
                fontFamily: "'Cinzel', serif", fontSize: 17,
                color: '#f0e6d3', letterSpacing: 1,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                🎉 {party.name}
              </div>
              {party.videos && (
                <div style={{ fontSize: 12, color: 'rgba(240,230,211,0.35)', marginTop: 3 }}>
                  ▶ {party.videos.title}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <SyncBadge status={isHost ? 'live' : syncStatus} />
              {isHost && (
                <button className="party-btn party-btn-gold" onClick={() => setShowVideoSelect(true)}>
                  🎬 Video
                </button>
              )}
              <button className="party-btn party-btn-gold" onClick={handleCopyInvite}>
                {inviteCopied ? '✓ Copied' : '🔑 Code'}
              </button>
              <button className="party-btn party-btn-danger" onClick={handleLeave}>
                Leave
              </button>
            </div>
          </div>

          {/* Video */}
          {party.videos ? (
            <div className="party-video-area">
              <video
                ref={videoRef}
                src={getStorageUrl(party.videos.video_url)}
                onPlay={isHost ? handlePlay : undefined}
                onPause={isHost ? handlePause : undefined}
                onSeeked={isHost ? handleSeeked : undefined}
                controls={isHost}
                playsInline
              />
              {!isHost && (
                <div style={{
                  position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 11, color: 'rgba(240,230,211,0.35)',
                  background: 'rgba(10,8,18,0.8)', padding: '4px 16px',
                  borderRadius: 20, whiteSpace: 'nowrap',
                  border: '1px solid rgba(201,168,76,0.1)',
                  backdropFilter: 'blur(8px)',
                  animation: 'hr-fadeUp 0.4s ease 0.5s both',
                }}>
                  🎬 Only the host controls playback
                </div>
              )}
            </div>
          ) : (
            <div className="no-video">
              <div style={{ fontSize: 56, opacity: 0.2 }}>🎬</div>
              <p style={{
                fontSize: 15, fontFamily: "'Cinzel', serif",
                letterSpacing: 1, color: 'rgba(240,230,211,0.3)',
              }}>
                {isHost ? 'Select a video to start' : 'Waiting for host to pick a video...'}
              </p>
              {isHost && (
                <button className="party-btn party-btn-red" onClick={() => setShowVideoSelect(true)}>
                  🎬 Select Video
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Right ── */}
        <div className="party-right">
          <PartyRightPanel
            messages={messages} members={members} user={user}
            message={message} setMessage={setMessage}
            handleSendMessage={handleSendMessage} chatRef={chatRef}
            inviteCode={party.invite_code}
            inviteUserInput={inviteUserInput}
            setInviteUserInput={setInviteUserInput}
            handleInviteByUsername={handleInviteByUsername}
            handleCopyInvite={handleCopyInvite}
            inviteCopied={inviteCopied}
            isHost={isHost} hostId={party.host_id}
            onlineUserIds={onlineUserIds}
          />
        </div>
      </div>

      {/* Video select modal */}
      {showVideoSelect && (
        <VideoSelectModal
          videos={videos}
          onSelect={handleSelectVideo}
          onClose={() => setShowVideoSelect(false)}
        />
      )}

      {/* Toasts */}
      <ToastLayer toasts={toasts} />
    </div>
  )
}