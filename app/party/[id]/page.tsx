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
  return `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_URL}/heavenlyriver/${url}`
}

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

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
    <div
      style={{
        width: size, height: size, borderRadius: 5, flexShrink: 0, overflow: 'hidden',
        background: 'linear-gradient(135deg, #c0392b, #7b1a1a)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#f0c96a', fontWeight: 700, fontSize: size * 0.4,
        fontFamily: "'Cinzel', serif",
      }}
    >
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
    </div>
  )
}

// ─── Sync badge ───────────────────────────────────────────────────────────────

function SyncBadge({ status }: { status: SyncStatus }) {
  const map: Record<SyncStatus, { label: string; color: string; dot: string }> = {
    live:    { label: 'LIVE',    color: '#e74c3c', dot: '#e74c3c' },
    synced:  { label: 'SYNCED', color: '#2ecc71', dot: '#2ecc71' },
    syncing: { label: 'SYNCING', color: '#f39c12', dot: '#f39c12' },
  }
  const s = map[status]
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 20,
      background: `${s.color}18`, border: `1px solid ${s.color}44`,
      fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
      color: s.color, fontFamily: "'Cinzel', serif",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: s.dot,
        animation: status === 'live' ? 'pulse 1.4s ease-in-out infinite' : 'none',
      }} />
      {s.label}
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0a0812', display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16,
      color: '#f0e6d3', fontFamily: "'Nunito', sans-serif",
    }}>
      <style>{`@keyframes shimmer { 0%{opacity:.3} 50%{opacity:.7} 100%{opacity:.3} }`}</style>
      <div style={{ fontSize: 44 }}>🎬</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        {[180, 120, 150].map((w, i) => (
          <div key={i} style={{
            width: w, height: 12, borderRadius: 6,
            background: 'rgba(201,168,76,0.15)',
            animation: `shimmer 1.6s ease-in-out ${i * 0.2}s infinite`,
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
  const filtered = videos.filter(v =>
    v.title?.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
        zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#16121f', border: '1px solid rgba(201,168,76,0.15)',
          borderRadius: 12, padding: 28, maxWidth: 720, width: '100%',
          maxHeight: '82vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 19, color: '#f0e6d3', margin: 0, letterSpacing: 1 }}>
            🎬 Select a Video
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(240,230,211,0.4)', fontSize: 18, cursor: 'pointer', padding: '4px 8px' }}
          >✕</button>
        </div>

        <input
          placeholder="Search videos..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            padding: '10px 14px', background: '#0f0c18', border: '1px solid rgba(201,168,76,0.15)',
            borderRadius: 7, color: '#f0e6d3', fontSize: 13, fontFamily: "'Nunito', sans-serif",
            outline: 'none', marginBottom: 18, flexShrink: 0,
          }}
          autoFocus
        />

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 ? (
            <p style={{ color: 'rgba(240,230,211,0.3)', textAlign: 'center', marginTop: 40, fontSize: 13 }}>
              No videos found
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
              {filtered.map(v => (
                <VideoCard key={v.id} video={v} onClick={() => onSelect(v)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function VideoCard({ video, onClick }: { video: any; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#0f0c18', border: `1px solid ${hovered ? 'rgba(201,168,76,0.35)' : 'rgba(201,168,76,0.08)'}`,
        borderRadius: 7, overflow: 'hidden', cursor: 'pointer',
        transform: hovered ? 'scale(1.03)' : 'scale(1)',
        transition: 'all 0.18s ease',
      }}
    >
      <div style={{ width: '100%', aspectRatio: '16/9', background: '#1e1828', overflow: 'hidden' }}>
        {video.thumbnail_url
          ? <img src={getStorageUrl(video.thumbnail_url)} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, opacity: 0.3 }}>🎬</div>
        }
      </div>
      <div style={{
        padding: '8px 10px', fontSize: 12, color: '#f0e6d3', fontWeight: 600,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {video.title}
      </div>
    </div>
  )
}

// ─── Chat panel ───────────────────────────────────────────────────────────────

function ChatPanel({ messages, user, message, setMessage, onSend, chatRef }: any) {
  // Group consecutive messages from the same user
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
          flex: 1, overflowY: 'auto', padding: '16px 14px',
          display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0,
        }}
      >
        {grouped.length === 0 && (
          <div style={{
            textAlign: 'center', color: 'rgba(240,230,211,0.2)',
            fontSize: 13, marginTop: 48, lineHeight: 1.8,
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>👋</div>
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
                marginTop: msg.grouped ? 2 : 10,
              }}
            >
              {/* Avatar — hidden for grouped messages to reduce noise */}
              <div style={{ width: 28, flexShrink: 0, alignSelf: 'flex-end' }}>
                {!msg.grouped && <Avatar profile={msg.profiles} size={28} />}
              </div>

              <div style={{ maxWidth: '72%' }}>
                {!msg.grouped && !isOwn && (
                  <div style={{ fontSize: 11, color: '#c9a84c', fontWeight: 700, marginBottom: 3, letterSpacing: 0.4 }}>
                    {getName(msg.profiles)}
                  </div>
                )}
                <div style={{
                  padding: '8px 12px',
                  background: isOwn ? 'rgba(192,57,43,0.18)' : '#1e1828',
                  border: `1px solid ${isOwn ? 'rgba(192,57,43,0.25)' : 'rgba(201,168,76,0.08)'}`,
                  borderRadius: isOwn ? '10px 3px 10px 10px' : '3px 10px 10px 10px',
                  fontSize: 14, color: '#f0e6d3', lineHeight: 1.45, wordBreak: 'break-word',
                }}>
                  {msg.message}
                </div>
                <div style={{
                  fontSize: 10, color: 'rgba(240,230,211,0.2)', marginTop: 3,
                  textAlign: isOwn ? 'right' : 'left',
                }}>
                  {formatTime(msg.created_at)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{
        padding: '10px 12px', borderTop: '1px solid rgba(201,168,76,0.1)',
        display: 'flex', gap: 8, flexShrink: 0,
      }}>
        <input
          style={{
            flex: 1, padding: '9px 13px',
            background: '#16121f', border: '1px solid rgba(201,168,76,0.12)',
            borderRadius: 7, color: '#f0e6d3', fontSize: 14,
            fontFamily: "'Nunito', sans-serif", outline: 'none',
          }}
          placeholder="Say something..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSend()}
          onFocus={e => (e.target.style.borderColor = 'rgba(201,168,76,0.35)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(201,168,76,0.12)')}
        />
        <button
          onClick={onSend}
          style={{
            padding: '9px 14px',
            background: 'linear-gradient(135deg, #c0392b, #7b1a1a)',
            color: '#f0c96a', border: 'none', borderRadius: 7,
            fontSize: 14, cursor: 'pointer', transition: 'opacity 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => ((e.target as HTMLElement).style.opacity = '0.85')}
          onMouseLeave={e => ((e.target as HTMLElement).style.opacity = '1')}
        >
          ➤
        </button>
      </div>
    </>
  )
}

// ─── Members panel ────────────────────────────────────────────────────────────

function MembersPanel({ members, hostId }: any) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {members.map((m: any) => (
        <div
          key={m.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
            background: '#16121f', borderRadius: 8, border: '1px solid rgba(201,168,76,0.07)',
          }}
        >
          <Avatar profile={m.profiles} size={36} />
          <div>
            <div style={{ fontSize: 14, color: '#f0e6d3', fontWeight: 600 }}>{getName(m.profiles)}</div>
            {m.user_id === hostId && (
              <div style={{ fontSize: 10, color: '#c9a84c', letterSpacing: 1, textTransform: 'uppercase', fontFamily: "'Cinzel', serif" }}>
                👑 Host
              </div>
            )}
          </div>
          {/* Online dot */}
          <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#2ecc71', flexShrink: 0 }} />
        </div>
      ))}
    </div>
  )
}

// ─── Invite panel ─────────────────────────────────────────────────────────────

function InvitePanel({ inviteCode, onCopy, copied, usernameInput, setUsernameInput, onAddUser }: any) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 20, minHeight: 0 }}>
      <div>
        <p style={{ fontSize: 11, color: 'rgba(240,230,211,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, fontFamily: "'Cinzel', serif" }}>
          Invite Code
        </p>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px',
          background: '#16121f', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 8,
        }}>
          <span style={{
            flex: 1, fontFamily: "'Courier New', monospace", fontSize: 20,
            color: '#c9a84c', letterSpacing: 4, fontWeight: 700,
          }}>
            {inviteCode}
          </span>
          <button
            onClick={onCopy}
            style={{
              padding: '6px 12px', background: copied ? 'rgba(46,204,113,0.15)' : 'rgba(201,168,76,0.1)',
              border: `1px solid ${copied ? 'rgba(46,204,113,0.3)' : 'rgba(201,168,76,0.2)'}`,
              borderRadius: 6, color: copied ? '#2ecc71' : '#c9a84c',
              fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
              fontWeight: 700, letterSpacing: 0.5,
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(240,230,211,0.22)', marginTop: 8 }}>
          Share this code for others to join
        </p>
      </div>

      <div>
        <p style={{ fontSize: 11, color: 'rgba(240,230,211,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, fontFamily: "'Cinzel', serif" }}>
          Add by Username
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{
              flex: 1, padding: '10px 12px', background: '#16121f',
              border: '1px solid rgba(201,168,76,0.12)', borderRadius: 7,
              color: '#f0e6d3', fontSize: 13, fontFamily: "'Nunito', sans-serif", outline: 'none',
            }}
            placeholder="Username or nickname..."
            value={usernameInput}
            onChange={e => setUsernameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onAddUser()}
          />
          <button
            onClick={onAddUser}
            style={{
              padding: '10px 16px', background: 'linear-gradient(135deg,#c0392b,#7b1a1a)',
              color: '#f0c96a', border: 'none', borderRadius: 7,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Right sidebar ────────────────────────────────────────────────────────────

function PartyRightPanel(props: any) {
  const [tab, setTab] = useState<'chat' | 'members' | 'invite'>('chat')
  const { messages, members, user, message, setMessage, handleSendMessage, chatRef,
    inviteCode, inviteUserInput, setInviteUserInput, handleInviteByUsername,
    handleCopyInvite, inviteCopied, isHost, hostId } = props

  const TABS: { id: 'chat' | 'members' | 'invite'; label: string }[] = [
    { id: 'chat', label: `💬 Chat` },
    { id: 'members', label: `👥 ${members.length}` },
    { id: 'invite', label: '＋ Invite' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(201,168,76,0.1)', flexShrink: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '13px 8px', textAlign: 'center', fontSize: 11,
              fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              cursor: 'pointer', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? '#c9a84c' : 'transparent'}`,
              color: tab === t.id ? '#c9a84c' : 'rgba(240,230,211,0.4)',
              fontFamily: "'Nunito', sans-serif", transition: 'all 0.18s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'chat' && (
        <ChatPanel
          messages={messages} user={user} message={message}
          setMessage={setMessage} onSend={handleSendMessage} chatRef={chatRef}
        />
      )}
      {tab === 'members' && <MembersPanel members={members} hostId={hostId} />}
      {tab === 'invite' && (
        <InvitePanel
          inviteCode={inviteCode} onCopy={handleCopyInvite} copied={inviteCopied}
          usernameInput={inviteUserInput} setUsernameInput={setInviteUserInput}
          onAddUser={handleInviteByUsername}
        />
      )}
    </div>
  )
}

// ─── Toast layer ──────────────────────────────────────────────────────────────

function ToastLayer({ toasts }: { toasts: Toast[] }) {
  const colors: Record<Toast['kind'], string> = {
    success: '#2ecc71', error: '#e74c3c', info: '#c9a84c',
  }
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 500, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '9px 18px', borderRadius: 20,
          background: `${colors[t.kind]}18`, border: `1px solid ${colors[t.kind]}55`,
          color: colors[t.kind], fontSize: 13, fontWeight: 600,
          animation: 'fadeUp 0.2s ease', whiteSpace: 'nowrap',
          backdropFilter: 'blur(10px)',
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

  const videoRef = useRef<HTMLVideoElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  // Use a ref so the resync interval always sees the current value — fixes the stale closure bug
  const isHostRef = useRef(false)
  const { toasts, push: pushToast } = useToasts()

  const isHost = party?.host_id === user?.id
  isHostRef.current = isHost

  useEffect(() => { params.then(p => setPartyId(p.id)) }, [params])

  // ── Load & realtime subscriptions ──────────────────────────────────────────

  useEffect(() => {
    if (!partyId) return

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)

      await supabase.from('party_members').upsert({ party_id: partyId, user_id: session.user.id })

      const { data: partyData } = await supabase
        .from('parties')
        .select('*, videos(id, title, video_url, thumbnail_url)')
        .eq('id', partyId)
        .single()
      setParty(partyData)

      const [{ data: membersData }, { data: messagesData }, { data: videosData }] = await Promise.all([
        supabase.from('party_members').select('*, profiles(id, nickname, username, avatar_url)').eq('party_id', partyId),
        supabase.from('party_messages').select('*, profiles(nickname, username, avatar_url)').eq('party_id', partyId).order('created_at', { ascending: true }).limit(100),
        supabase.from('videos').select('*'),
      ])
      setMembers(membersData || [])
      setMessages(messagesData || [])
      setVideos(videosData || [])
    }
    load()

    const channel = supabase
      .channel(`party_${partyId}_room`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'parties', filter: `id=eq.${partyId}` },
        payload => setParty((prev: any) => ({ ...prev, ...payload.new, videos: prev?.videos }))
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'party_messages', filter: `party_id=eq.${partyId}` },
        async payload => {
          const { data } = await supabase.from('party_messages').select('*, profiles(nickname, username, avatar_url)').eq('id', payload.new.id).single()
          if (data) setMessages(prev => [...prev, data])
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'party_members', filter: `party_id=eq.${partyId}` },
        async () => {
          const { data } = await supabase.from('party_members').select('*, profiles(id, nickname, username, avatar_url)').eq('party_id', partyId)
          setMembers(data || [])
        }
      )
      .subscribe()

    // Resync non-hosts every 5 s — uses ref to avoid stale closure
    const resyncInterval = setInterval(async () => {
      if (isHostRef.current || !videoRef.current) return
      const { data: fresh } = await supabase.from('parties').select('is_playing, playback_time').eq('id', partyId).single()
      if (!fresh || !videoRef.current) return
      const diff = Math.abs(videoRef.current.currentTime - (fresh.playback_time || 0))
      if (diff > 3) {
        setSyncStatus('syncing')
        videoRef.current.currentTime = fresh.playback_time || 0
        setTimeout(() => setSyncStatus('synced'), 1200)
      }
      if (fresh.is_playing && videoRef.current.paused) videoRef.current.play().catch(() => {})
      else if (!fresh.is_playing && !videoRef.current.paused) videoRef.current.pause()
    }, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(resyncInterval)
    }
  }, [partyId, router])

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  // ── Video sync — single consolidated effect ─────────────────────────────────
  // Fires when play-state, seek position, or the video itself changes
  useEffect(() => {
    const video = videoRef.current
    if (!video || !party?.videos) return

    const applySync = () => {
      const diff = Math.abs(video.currentTime - (party.playback_time || 0))
      if (diff > 2) video.currentTime = party.playback_time || 0
      if (party.is_playing) video.play().catch(() => {})
      else video.pause()
    }

    if (video.readyState >= 1) {
      applySync()
    } else {
      video.addEventListener('loadedmetadata', applySync, { once: true })
      return () => video.removeEventListener('loadedmetadata', applySync)
    }
  }, [party?.is_playing, party?.playback_time, party?.video_id, party?.videos])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handlePlay = async () => {
    if (!isHost) return
    await supabase.from('parties').update({ is_playing: true, playback_time: videoRef.current?.currentTime || 0 }).eq('id', partyId)
  }

  const handlePause = async () => {
    if (!isHost) return
    await supabase.from('parties').update({ is_playing: false, playback_time: videoRef.current?.currentTime || 0 }).eq('id', partyId)
  }

  const handleSeeked = async () => {
    if (!isHost) return
    await supabase.from('parties').update({ playback_time: videoRef.current?.currentTime || 0 }).eq('id', partyId)
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !user) return
    await supabase.from('party_messages').insert({ party_id: partyId, user_id: user.id, message: message.trim() })
    setMessage('')
  }

  const handleSelectVideo = async (video: any) => {
    await supabase.from('parties').update({ video_id: video.id, is_playing: false, playback_time: 0 }).eq('id', partyId)
    setParty((prev: any) => ({ ...prev, videos: video, video_id: video.id, is_playing: false, playback_time: 0 }))
    setShowVideoSelect(false)
    pushToast(`Now playing: ${video.title}`, 'success')
  }

  const handleLeave = async () => {
    await supabase.from('party_members').delete().eq('party_id', partyId).eq('user_id', user.id)
    if (isHost) {
      const nextHost = members.find((m: any) => m.user_id !== user.id)
      if (nextHost) await supabase.from('parties').update({ host_id: nextHost.user_id }).eq('id', partyId)
      else await supabase.from('parties').delete().eq('id', partyId)
    }
    router.push('/party')
  }

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(party?.invite_code || '')
    setInviteCopied(true)
    pushToast('Invite code copied!', 'success')
    setTimeout(() => setInviteCopied(false), 2000)
  }

  const handleInviteByUsername = async () => {
    if (!inviteUserInput.trim()) return
    const { data: profile } = await supabase.from('profiles').select('id')
      .or(`username.eq.${inviteUserInput},nickname.eq.${inviteUserInput}`).single()
    if (!profile) { pushToast('User not found', 'error'); return }
    await supabase.from('party_members').upsert({ party_id: partyId, user_id: profile.id })
    pushToast(`${inviteUserInput} added to party!`, 'success')
    setInviteUserInput('')
  }

  if (!party) return <LoadingSkeleton />

  return (
    <div style={{
      height: '100vh', background: '#0a0812', color: '#f0e6d3',
      fontFamily: "'Nunito', sans-serif", display: 'flex', flexDirection: 'column',
      overflow: 'hidden', paddingTop: 70,
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Nunito:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(201,168,76,0.35); }
        .party-room { display: grid; grid-template-columns: 1fr 320px; flex: 1; height: calc(100vh - 70px); overflow: hidden; }
        @media(max-width:768px) {
          .party-room { grid-template-columns: 1fr; grid-template-rows: auto 1fr; height: calc(100vh - 64px); }
          .party-video-area { max-height: 35vh; }
        }
        .btn-sm { padding: 7px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; border: none; font-family: 'Nunito', sans-serif; transition: opacity 0.15s; letter-spacing: 0.5px; }
        .btn-sm:hover { opacity: 0.85; }
        .btn-gold { background: linear-gradient(135deg,#c9a84c,#8a6a1e); color: #0a0812; }
        .btn-danger { background: rgba(192,57,43,0.2); color: #e74c3c; border: 1px solid rgba(192,57,43,0.3) !important; }
      `}</style>

      <Navbar />

      <div className="party-room">
        {/* ── Left: video + header ── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
          {/* Party header */}
          <div style={{
            padding: '11px 18px', borderBottom: '1px solid rgba(201,168,76,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 10, background: '#0f0c18', flexShrink: 0,
          }}>
            <div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: '#f0e6d3', letterSpacing: 1 }}>
                {party.name}
              </div>
              {party.videos && (
                <div style={{ fontSize: 12, color: 'rgba(240,230,211,0.35)', marginTop: 2 }}>
                  ▶ {party.videos.title}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {!isHost && <SyncBadge status={syncStatus} />}
              {isHost && <SyncBadge status="live" />}
              {isHost && (
                <button className="btn-sm btn-gold" onClick={() => setShowVideoSelect(true)}>🎬 Video</button>
              )}
              <button className="btn-sm btn-gold" onClick={handleCopyInvite}>
                {inviteCopied ? '✓ Copied' : 'Copy Code'}
              </button>
              <button className="btn-sm btn-danger" onClick={handleLeave}>Leave</button>
            </div>
          </div>

          {/* Video area */}
          {party.videos ? (
            <div className="party-video-area" style={{ flex: 1, background: '#000', position: 'relative', overflow: 'hidden', minHeight: 0 }}>
              <video
                ref={videoRef}
                src={getStorageUrl(party.videos.video_url)}
                onPlay={isHost ? handlePlay : undefined}
                onPause={isHost ? handlePause : undefined}
                onSeeked={isHost ? handleSeeked : undefined}
                controls={isHost}
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: '#000' }}
              />
              {!isHost && (
                <div style={{
                  position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 11, color: 'rgba(240,230,211,0.35)', background: 'rgba(10,8,18,0.75)',
                  padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap',
                  backdropFilter: 'blur(6px)',
                }}>
                  🎬 Only the host controls playback
                </div>
              )}
            </div>
          ) : (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 16, color: 'rgba(240,230,211,0.3)',
              background: '#0a0812', minHeight: 0,
            }}>
              <div style={{ fontSize: 52, opacity: 0.25 }}>🎬</div>
              <p style={{ fontSize: 14 }}>
                {isHost ? 'Select a video to start watching!' : 'Waiting for the host to pick a video…'}
              </p>
              {isHost && (
                <button className="btn-sm btn-gold" onClick={() => setShowVideoSelect(true)}>🎬 Select Video</button>
              )}
            </div>
          )}
        </div>

        {/* ── Right: sidebar ── */}
        <div style={{ background: '#0f0c18', borderLeft: '1px solid rgba(201,168,76,0.1)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <PartyRightPanel
            messages={messages} members={members} user={user}
            message={message} setMessage={setMessage} handleSendMessage={handleSendMessage}
            chatRef={chatRef} inviteCode={party.invite_code}
            inviteUserInput={inviteUserInput} setInviteUserInput={setInviteUserInput}
            handleInviteByUsername={handleInviteByUsername}
            handleCopyInvite={handleCopyInvite} inviteCopied={inviteCopied}
            isHost={isHost} hostId={party.host_id}
          />
        </div>
      </div>

      {/* ── Video select modal ── */}
      {showVideoSelect && (
        <VideoSelectModal videos={videos} onSelect={handleSelectVideo} onClose={() => setShowVideoSelect(false)} />
      )}

      {/* ── Toasts ── */}
      <ToastLayer toasts={toasts} />
    </div>
  )
}