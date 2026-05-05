'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import { getStorageUrl } from '../../lib/storage'
import Link from 'next/link'

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
  const [inviteMsg, setInviteMsg] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const isHost = party?.host_id === user?.id

  useEffect(() => {
    params.then(p => setPartyId(p.id))
  }, [params])

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

      const { data: membersData } = await supabase
        .from('party_members')
        .select('*, profiles(id, nickname, username, avatar_url)')
        .eq('party_id', partyId)
      setMembers(membersData || [])

      const { data: messagesData } = await supabase
        .from('party_messages')
        .select('*, profiles(nickname, username, avatar_url)')
        .eq('party_id', partyId)
        .order('created_at', { ascending: true })
        .limit(100)
      setMessages(messagesData || [])

      const { data: videosData } = await supabase.from('videos').select('*')
      setVideos(videosData || [])
    }
    load()

    const partySub = supabase
      .channel(`party_${partyId}_room`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'parties',
        filter: `id=eq.${partyId}`
      }, payload => {
        setParty((prev: any) => ({ ...prev, ...payload.new, videos: prev?.videos }))
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'party_messages',
        filter: `party_id=eq.${partyId}`
      }, async payload => {
        const { data } = await supabase
          .from('party_messages')
          .select('*, profiles(nickname, username, avatar_url)')
          .eq('id', payload.new.id)
          .single()
        if (data) setMessages(prev => [...prev, data])
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'party_members',
        filter: `party_id=eq.${partyId}`
      }, async () => {
        const { data } = await supabase
          .from('party_members')
          .select('*, profiles(id, nickname, username, avatar_url)')
          .eq('party_id', partyId)
        setMembers(data || [])
      })
      .subscribe()

          // Periodic resync for non-hosts
        const resyncInterval = setInterval(async () => {
          if (!videoRef.current || isHost) return
          const { data: fresh } = await supabase
            .from('parties')
            .select('is_playing, playback_time')
            .eq('id', partyId)
            .single()
          if (!fresh || !videoRef.current) return
          const diff = Math.abs(videoRef.current.currentTime - (fresh.playback_time || 0))
          if (diff > 3) videoRef.current.currentTime = fresh.playback_time || 0
          if (fresh.is_playing && videoRef.current.paused) videoRef.current.play().catch(() => {})
          else if (!fresh.is_playing && !videoRef.current.paused) videoRef.current.pause()
        }, 5000)

        return () => {
          supabase.removeChannel(partySub)
          clearInterval(resyncInterval)
        }

    return () => { supabase.removeChannel(partySub) }
  }, [partyId, router])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

      // Main sync effect
      useEffect(() => {
        if (!videoRef.current || !party?.videos) return
        const video = videoRef.current

        const doSync = () => {
          const diff = Math.abs(video.currentTime - (party.playback_time || 0))
          if (diff > 2) video.currentTime = party.playback_time || 0
          if (party.is_playing) {
            video.play().catch(() => {})
          } else {
            video.pause()
          }
        }

        // Try immediately
        doSync()

        // Also try after canplay in case video isn't loaded
        video.addEventListener('canplay', doSync, { once: true })
        return () => video.removeEventListener('canplay', doSync)
      }, [party?.is_playing, party?.playback_time, party?.video_id])

      // Sync on new video source load
      useEffect(() => {
        if (!videoRef.current || !party?.videos) return
        const video = videoRef.current

        const onMeta = () => {
          video.currentTime = party.playback_time || 0
          if (party.is_playing) video.play().catch(() => {})
        }

        video.addEventListener('loadedmetadata', onMeta, { once: true })
        return () => video.removeEventListener('loadedmetadata', onMeta)
      }, [party?.video_id])

  const handlePlay = async () => {
    if (!isHost) return
    await supabase.from('parties').update({
      is_playing: true,
      playback_time: videoRef.current?.currentTime || 0
    }).eq('id', partyId)
  }

  const handlePause = async () => {
    if (!isHost) return
    await supabase.from('parties').update({
      is_playing: false,
      playback_time: videoRef.current?.currentTime || 0
    }).eq('id', partyId)
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !user) return
    await supabase.from('party_messages').insert({
      party_id: partyId,
      user_id: user.id,
      message: message.trim()
    })
    setMessage('')
  }

  const handleSelectVideo = async (video: any) => {
    await supabase.from('parties').update({
      video_id: video.id,
      is_playing: false,
      playback_time: 0
    }).eq('id', partyId)
    setParty((prev: any) => ({ ...prev, videos: video, video_id: video.id, is_playing: false, playback_time: 0 }))
    setShowVideoSelect(false)
  }

  const handleLeave = async () => {
    await supabase.from('party_members').delete()
      .eq('party_id', partyId).eq('user_id', user.id)
    if (isHost && members.length > 1) {
      const nextHost = members.find((m: any) => m.user_id !== user.id)
      if (nextHost) await supabase.from('parties').update({ host_id: nextHost.user_id }).eq('id', partyId)
    } else if (isHost && members.length <= 1) {
      await supabase.from('parties').delete().eq('id', partyId)
    }
    router.push('/party')
  }

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(party?.invite_code || '')
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }

  const handleInviteByUsername = async () => {
    if (!inviteUserInput.trim()) return
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .or(`username.eq.${inviteUserInput},nickname.eq.${inviteUserInput}`)
      .single()
    if (!profile) { setInviteMsg('User not found'); return }
    await supabase.from('party_members').upsert({ party_id: partyId, user_id: profile.id })
    setInviteMsg('User added!')
    setInviteUserInput('')
    setTimeout(() => setInviteMsg(''), 3000)
  }

  const getName = (profile: any) => profile?.nickname || profile?.username || 'User'

  if (!party) return (
    <div style={{ minHeight: '100vh', background: '#0a0812', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f0e6d3', fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
        <p>Loading party...</p>
      </div>
    </div>
  )

  return (
    <div style={{
      height: '100vh',
      background: '#0a0812',
      color: '#f0e6d3',
      fontFamily: "'Nunito', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      paddingTop: '70px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Nunito:wght@300;400;600;700&display=swap');

        .party-room {
          display: grid;
          grid-template-columns: 1fr 320px;
          flex: 1;
          overflow: hidden;
          height: calc(100vh - 70px);
        }

        .party-left {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          height: 100%;
          min-height: 0;
        }

        .party-info {
          padding: 12px 20px;
          border-bottom: 1px solid rgba(201,168,76,0.1);
          display: flex; align-items: center;
          justify-content: space-between;
          flex-wrap: wrap; gap: 10px;
          background: #0f0c18;
          flex-shrink: 0;
        }
        .party-info-name {
          font-family: 'Cinzel', serif; font-size: 17px;
          color: #f0e6d3; letter-spacing: 1px;
        }
        .party-info-actions { display: flex; gap: 8px; flex-wrap: wrap; }

        .party-video-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #000;
          overflow: hidden;
          position: relative;
          min-height: 0;
        }
        .party-video-area video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          flex: 1;
          min-height: 0;
        }
        .host-only-msg {
          position: absolute; bottom: 12px; left: 50%;
          transform: translateX(-50%);
          font-size: 12px; color: rgba(240,230,211,0.4);
          background: rgba(10,8,18,0.7);
          padding: 4px 12px; border-radius: 20px;
          white-space: nowrap;
        }
        .no-video {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 16px; color: rgba(240,230,211,0.3);
          background: #0a0812;
        }

        /* Right sidebar */
        .party-right {
          background: #0f0c18;
          border-left: 1px solid rgba(201,168,76,0.1);
          display: flex; flex-direction: column;
          height: 100%; overflow: hidden;
        }
        .sidebar-tabs {
          display: flex;
          border-bottom: 1px solid rgba(201,168,76,0.1);
          flex-shrink: 0;
        }
        .sidebar-tab {
          flex: 1; padding: 13px 8px;
          text-align: center; font-size: 11px;
          font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; cursor: pointer;
          color: rgba(240,230,211,0.4);
          border-bottom: 2px solid transparent;
          transition: all 0.2s; background: none;
          border-top: none; border-left: none; border-right: none;
          font-family: 'Nunito', sans-serif;
        }
        .sidebar-tab.active { color: #c9a84c; border-bottom-color: #c9a84c; }

        /* Chat */
        .chat-messages {
          flex: 1; overflow-y: auto;
          padding: 16px;
          display: flex; flex-direction: column;
          gap: 12px; min-height: 0;
        }
        .chat-msg { display: flex; gap: 10px; }
        .chat-avatar {
          width: 30px; height: 30px; border-radius: 4px;
          background: linear-gradient(135deg, #c0392b, #7b1a1a);
          color: #f0c96a; font-size: 12px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; font-family: 'Cinzel', serif; overflow: hidden;
        }
        .chat-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .chat-bubble {
          background: #16121f; border-radius: 0 8px 8px 8px;
          padding: 8px 12px; max-width: 220px;
          border: 1px solid rgba(201,168,76,0.07);
        }
        .chat-name { font-size: 11px; color: #c9a84c; font-weight: 700; margin-bottom: 4px; letter-spacing: 0.5px; }
        .chat-text { font-size: 14px; color: #f0e6d3; line-height: 1.4; word-break: break-word; }
        .chat-time { font-size: 10px; color: rgba(240,230,211,0.2); margin-top: 4px; }
        .chat-own { flex-direction: row-reverse; }
        .chat-own .chat-bubble { background: rgba(192,57,43,0.15); border-color: rgba(192,57,43,0.2); border-radius: 8px 0 8px 8px; }
        .chat-own .chat-name { color: #e74c3c; text-align: right; }
        .chat-own .chat-time { text-align: right; }

        .chat-input-wrap {
          padding: 12px 14px;
          border-top: 1px solid rgba(201,168,76,0.1);
          display: flex; gap: 8px; flex-shrink: 0;
        }
        .chat-input {
          flex: 1; padding: 10px 14px;
          background: #16121f; border: 1px solid rgba(201,168,76,0.12);
          border-radius: 6px; color: #f0e6d3;
          font-size: 14px; font-family: 'Nunito', sans-serif;
          outline: none; transition: border-color 0.2s;
        }
        .chat-input:focus { border-color: rgba(201,168,76,0.35); }
        .chat-input::placeholder { color: rgba(240,230,211,0.15); }
        .chat-send {
          padding: 10px 14px;
          background: linear-gradient(135deg, #c0392b, #7b1a1a);
          color: #f0c96a; border: none; border-radius: 6px;
          font-size: 14px; cursor: pointer; transition: all 0.2s;
          flex-shrink: 0;
        }
        .chat-send:hover { background: linear-gradient(135deg, #e74c3c, #c0392b); }

        /* Members */
        .members-list {
          flex: 1; overflow-y: auto;
          padding: 16px; display: flex;
          flex-direction: column; gap: 10px;
          min-height: 0;
        }
        .member-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; background: #16121f;
          border-radius: 8px; border: 1px solid rgba(201,168,76,0.07);
        }
        .member-avatar {
          width: 36px; height: 36px; border-radius: 5px;
          background: linear-gradient(135deg, #c0392b, #7b1a1a);
          color: #f0c96a; font-size: 14px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; font-family: 'Cinzel', serif; overflow: hidden;
        }
        .member-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .member-name { font-size: 14px; color: #f0e6d3; font-weight: 600; }
        .member-badge { font-size: 10px; color: #c9a84c; letter-spacing: 1px; text-transform: uppercase; font-family: 'Cinzel', serif; }

        /* Buttons */
        .btn-sm {
          padding: 7px 14px; border-radius: 4px;
          font-size: 12px; font-weight: 700; cursor: pointer;
          font-family: 'Nunito', sans-serif; letter-spacing: 0.5px;
          transition: all 0.2s; border: none; white-space: nowrap;
        }
        .btn-sm.gold { background: rgba(201,168,76,0.1); color: #c9a84c; border: 1px solid rgba(201,168,76,0.25); }
        .btn-sm.gold:hover { background: rgba(201,168,76,0.2); }
        .btn-sm.red { background: rgba(192,57,43,0.2); color: #e74c3c; border: 1px solid rgba(192,57,43,0.3); }
        .btn-sm.red:hover { background: rgba(192,57,43,0.3); }

        /* Invite section */
        .invite-wrap { padding: 16px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; flex: 1; min-height: 0; }
        .invite-code-box {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 14px; background: #16121f;
          border: 1px solid rgba(201,168,76,0.15); border-radius: 6px;
        }
        .invite-code-text {
          flex: 1; font-family: 'Courier New', monospace;
          font-size: 18px; color: #c9a84c;
          letter-spacing: 3px; font-weight: 700;
        }
        .invite-username-row { display: flex; gap: 8px; }
        .invite-username-input {
          flex: 1; padding: 10px 12px; background: #16121f;
          border: 1px solid rgba(201,168,76,0.12); border-radius: 6px;
          color: #f0e6d3; font-size: 13px;
          font-family: 'Nunito', sans-serif; outline: none;
        }
        .invite-username-input:focus { border-color: rgba(201,168,76,0.35); }
        .invite-username-input::placeholder { color: rgba(240,230,211,0.2); }
        .invite-label { font-size: 11px; color: rgba(240,230,211,0.4); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }

        /* Video select modal */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.9); z-index: 300;
          display: flex; align-items: center;
          justify-content: center; padding: 20px;
        }
        .modal-big {
          background: #16121f; border: 1px solid rgba(201,168,76,0.15);
          border-radius: 10px; padding: 28px;
          max-width: 700px; width: 100%;
          max-height: 80vh; overflow-y: auto;
        }
        .modal-big-title { font-family: 'Cinzel', serif; font-size: 20px; color: #f0e6d3; margin: 0 0 20px; letter-spacing: 1px; }
        .modal-close {
          position: absolute; top: 16px; right: 16px;
          background: none; border: none; color: rgba(240,230,211,0.4);
          font-size: 20px; cursor: pointer;
        }
        .video-select-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
        .video-select-card {
          background: #0f0c18; border: 1px solid rgba(201,168,76,0.08);
          border-radius: 6px; overflow: hidden; cursor: pointer;
          transition: all 0.2s;
        }
        .video-select-card:hover { border-color: rgba(201,168,76,0.3); transform: scale(1.03); }
        .video-select-thumb { width: 100%; aspect-ratio: 16/9; background: #1e1828; overflow: hidden; }
        .video-select-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .video-select-title { padding: 8px 10px; font-size: 12px; color: #f0e6d3; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* Mobile */
        @media (max-width: 768px) {
          .party-room {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
            height: calc(100vh - 64px);
          }
          .party-left { height: auto; flex-shrink: 0; }
          .party-video-area { max-height: 35vh; }
          .party-right { height: 100%; }
        }
      `}</style>

      <Navbar />

      <div className="party-room">
        {/* Left: Video */}
        <div className="party-left">
          <div className="party-info">
            <div>
              <div className="party-info-name">{party.name}</div>
              {party.videos && (
                <div style={{ fontSize: '12px', color: 'rgba(240,230,211,0.4)', marginTop: '2px' }}>
                  ▶ {party.videos.title}
                </div>
              )}
            </div>
            <div className="party-info-actions">
              {isHost && (
                <button className="btn-sm gold" onClick={() => setShowVideoSelect(true)}>🎬 Select Video</button>
              )}
              <button className="btn-sm gold" onClick={handleCopyInvite}>
                {inviteCopied ? 'Copied!' : 'Copy Code'}
              </button>
              <button className="btn-sm red" onClick={handleLeave}>Leave</button>
            </div>
          </div>

          {party.videos ? (
            <div className="party-video-area">
              <video
                ref={videoRef}
                src={getStorageUrl(party.videos.video_url)}
                onPlay={isHost ? handlePlay : undefined}
                onPause={isHost ? handlePause : undefined}
                onSeeked={isHost ? async () => {
                  await supabase.from('parties').update({
                    playback_time: videoRef.current?.currentTime || 0
                  }).eq('id', partyId)
                } : undefined}
                controls={isHost}
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  background: '#000',
                }}
              />
              {!isHost && (
                <p className="host-only-msg">🎬 Only the host controls playback</p>
              )}
            </div>
          ) : (
            <div className="no-video">
              <div style={{ fontSize: '52px', opacity: 0.3 }}>🎬</div>
              <p>{isHost ? 'Select a video to start watching!' : 'Waiting for host to select a video...'}</p>
              {isHost && (
                <button className="btn-sm gold" onClick={() => setShowVideoSelect(true)}>🎬 Select Video</button>
              )}
            </div>
          )}
        </div>

        {/* Right: Chat & Members */}
        <div className="party-right">
          <PartyRightPanel
            messages={messages}
            members={members}
            user={user}
            message={message}
            setMessage={setMessage}
            handleSendMessage={handleSendMessage}
            chatRef={chatRef}
            inviteCode={party.invite_code}
            inviteUserInput={inviteUserInput}
            setInviteUserInput={setInviteUserInput}
            handleInviteByUsername={handleInviteByUsername}
            inviteMsg={inviteMsg}
            handleCopyInvite={handleCopyInvite}
            inviteCopied={inviteCopied}
            getName={getName}
            isHost={isHost}
            hostId={party.host_id}
          />
        </div>
      </div>

      {/* Video Select Modal */}
      {showVideoSelect && (
        <div className="modal-overlay" onClick={() => setShowVideoSelect(false)}>
          <div className="modal-big" style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <h2 className="modal-big-title">🎬 Select a Video</h2>
            <button className="modal-close" onClick={() => setShowVideoSelect(false)}>✕</button>
            <div className="video-select-grid">
              {videos.map(v => (
                <div key={v.id} className="video-select-card" onClick={() => handleSelectVideo(v)}>
                  <div className="video-select-thumb">
                    {v.thumbnail_url
                      ? <img src={getStorageUrl(v.thumbnail_url)} alt={v.title} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', background: '#1e1828' }}>🎬</div>
                    }
                  </div>
                  <div className="video-select-title">{v.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PartyRightPanel({ messages, members, user, message, setMessage, handleSendMessage, chatRef, inviteCode, inviteUserInput, setInviteUserInput, handleInviteByUsername, inviteMsg, handleCopyInvite, inviteCopied, getName, isHost, hostId }: any) {
  const [tab, setTab] = useState<'chat' | 'members' | 'invite'>('chat')

  const getAvatarSrc = (url: string) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    return `${process.env.NEXT_PUBLIC_MINIO_PUBLIC_URL}/heavenlyriver/${url}`
  }

  return (
    <>
      <div className="sidebar-tabs">
        <button className={`sidebar-tab ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
          Chat
        </button>
        <button className={`sidebar-tab ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>
          👥 {members.length}
        </button>
        <button className={`sidebar-tab ${tab === 'invite' ? 'active' : ''}`} onClick={() => setTab('invite')}>
          ＋ Invite
        </button>
      </div>

      {tab === 'chat' && (
        <>
          <div className="chat-messages" ref={chatRef}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'rgba(240,230,211,0.2)', fontSize: '13px', marginTop: '40px' }}>
                No messages yet. Say hi! 👋
              </div>
            )}
            {messages.map((msg: any) => {
              const isOwn = msg.user_id === user?.id
              return (
                <div key={msg.id} className={`chat-msg ${isOwn ? 'chat-own' : ''}`}>
                  <div className="chat-avatar">
                    {msg.profiles?.avatar_url
                      ? <img src={getAvatarSrc(msg.profiles.avatar_url)} alt="" />
                      : getName(msg.profiles).charAt(0).toUpperCase()
                    }
                  </div>
                  <div className="chat-bubble">
                    <div className="chat-name">{getName(msg.profiles)}</div>
                    <div className="chat-text">{msg.message}</div>
                    <div className="chat-time">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="chat-input-wrap">
            <input
              className="chat-input"
              placeholder="Say something..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            />
            <button className="chat-send" onClick={handleSendMessage}>➤</button>
          </div>
        </>
      )}

      {tab === 'members' && (
        <div className="members-list">
          {members.map((m: any) => (
            <div key={m.id} className="member-item">
              <div className="member-avatar">
                {m.profiles?.avatar_url
                  ? <img src={getAvatarSrc(m.profiles.avatar_url)} alt="" />
                  : getName(m.profiles).charAt(0).toUpperCase()
                }
              </div>
              <div>
                <div className="member-name">{getName(m.profiles)}</div>
                {m.user_id === hostId && <div className="member-badge">👑 Host</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'invite' && (
        <div className="invite-wrap">
          <div>
            <p className="invite-label">Invite Code</p>
            <div className="invite-code-box">
              <span className="invite-code-text">{inviteCode}</span>
              <button className="btn-sm gold" onClick={handleCopyInvite}>
                {inviteCopied ? '✅' : '📋'}
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(240,230,211,0.25)', marginTop: '8px' }}>
              Share this code with friends to join the party
            </p>
          </div>

          <div>
            <p className="invite-label">Invite by Username</p>
            <div className="invite-username-row">
              <input
                className="invite-username-input"
                placeholder="Username or nickname..."
                value={inviteUserInput}
                onChange={e => setInviteUserInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInviteByUsername()}
              />
              <button className="btn-sm gold" onClick={handleInviteByUsername}>Add</button>
            </div>
            {inviteMsg && <p style={{ fontSize: '13px', marginTop: '8px', color: 'rgba(240,230,211,0.6)' }}>{inviteMsg}</p>}
          </div>
        </div>
      )}
    </>
  )
}