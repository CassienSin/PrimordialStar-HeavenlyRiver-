'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import { getStorageUrl } from '../lib/storage'

const MAX_AVATAR_MB = 5

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [nickname, setNickname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [watchHistory, setWatchHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      if (profile?.username) setUsername(profile.username)
      if (profile?.nickname) setNickname(profile.nickname)
      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)

      const { data: history } = await supabase
        .from('watch_history')
        .select('*, videos(id, title, category, thumbnail_url)')
        .eq('user_id', session.user.id)
        .order('watched_at', { ascending: false })
        .limit(10)
      // Drop entries whose video was deleted — they'd render as empty rows
      setWatchHistory((history || []).filter((h: any) => h.videos))
      setHistoryLoading(false)
    }
    load()
  }, [router])

  // Revoke the preview blob URL when it's replaced or on unmount
  useEffect(() => {
    return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview) }
  }, [avatarPreview])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage('❌ Please choose an image file')
      return
    }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      setMessage(`❌ Image must be under ${MAX_AVATAR_MB}MB`)
      return
    }
    setMessage('')
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      let finalAvatarUrl = avatarUrl

      if (avatarFile) {
        setUploadingAvatar(true)
        const formData = new FormData()
        formData.append('file', avatarFile)
        const res = await fetch('/api/upload-avatar', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        })
        const data = await res.json()
        if (data.url) {
          finalAvatarUrl = data.url
        } else {
          setMessage('❌ Avatar upload failed: ' + data.error)
          setSaving(false)
          setUploadingAvatar(false)
          return
        }
        setUploadingAvatar(false)
      }

      const { error } = await supabase
        .from('profiles')
        .update({ username, nickname, avatar_url: finalAvatarUrl })
        .eq('id', user.id)

      if (error) {
        setMessage('❌ Failed to save: ' + error.message)
      } else {
        // Update navbar cache
        localStorage.setItem(`hr_nickname_${user.id}`, nickname || username || '')
        localStorage.setItem(`hr_avatar_${user.id}`, finalAvatarUrl)
        localStorage.removeItem(`hr_admin_${user.id}`) // force navbar refresh
        setAvatarUrl(finalAvatarUrl)
        setAvatarPreview(null)
        setAvatarFile(null)
        setMessage('✅ Profile saved!')
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (err: any) {
      setMessage('❌ Error: ' + err.message)
    }

    setSaving(false)
  }

  const displayName = nickname || username || user?.email?.split('@')[0] || '?'
  const initials = displayName.charAt(0).toUpperCase()
  const currentAvatar = avatarPreview || (avatarUrl ? getStorageUrl(avatarUrl) : null)
  const isError = message.startsWith('❌')

  return (
    <div style={{ minHeight: '100vh', background: '#0a0812', color: '#f0e6d3', fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        /* Profile-specific styles only */
        @keyframes profile-rise {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes profile-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-3px); }
        }

        .profile-wrap { max-width: 720px; margin: 0 auto; padding: 100px 24px 80px; }
        .profile-wrap > * { animation: profile-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .profile-wrap > *:nth-child(1) { animation-delay: 0.02s; }
        .profile-wrap > *:nth-child(2) { animation-delay: 0.08s; }
        .profile-wrap > *:nth-child(3) { animation-delay: 0.16s; }
        .profile-wrap > *:nth-child(4) { animation-delay: 0.24s; }
        .profile-subtitle { color: rgba(240,230,211,0.3); font-size: 13px; letter-spacing: 1px; margin-bottom: 40px; }

        .profile-card { background: #16121f; border-radius: 10px; padding: 32px; border: 1px solid rgba(201,168,76,0.12); margin-bottom: 24px; }
        .card-heading { font-family: 'Cinzel', serif; font-size: 13px; letter-spacing: 3px; text-transform: uppercase; color: rgba(201,168,76,0.5); margin: 0 0 28px; }

        .avatar-section { display: flex; align-items: center; gap: 24px; margin-bottom: 28px; padding-bottom: 28px; border-bottom: 1px solid rgba(201,168,76,0.08); }
        .avatar-big {
          width: 88px; height: 88px; border-radius: 10px;
          background: linear-gradient(135deg, #c0392b, #7b1a1a);
          display: flex; align-items: center; justify-content: center;
          font-size: 40px; font-weight: 700; font-family: 'Cinzel', serif;
          color: #f0c96a; border: 2px solid rgba(201,168,76,0.2);
          flex-shrink: 0; overflow: hidden; position: relative; cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.25s, box-shadow 0.25s;
        }
        .avatar-big:hover {
          transform: scale(1.05);
          border-color: #c9a84c;
          box-shadow: 0 0 24px rgba(201,168,76,0.25);
        }
        .avatar-big:hover .avatar-overlay { opacity: 1; }
        .avatar-big img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; font-size: 22px; }
        .avatar-info h3 { font-family: 'Cinzel', serif; font-size: 18px; color: #f0e6d3; margin: 0 0 4px; }
        .avatar-info p { color: rgba(240,230,211,0.35); font-size: 13px; margin: 0 0 12px; }
        .avatar-upload-btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.2); border-radius: 4px; color: #c9a84c; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; font-family: 'Nunito', sans-serif; transition: all 0.25s; }
        .avatar-upload-btn:hover { background: rgba(201,168,76,0.15); border-color: #c9a84c; box-shadow: 0 0 12px rgba(201,168,76,0.15); transform: translateY(-1px); }
        .avatar-upload-btn:active { transform: translateY(0) scale(0.97); }

        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .field-hint { font-size: 11px; color: rgba(240,230,211,0.2); margin-top: 6px; }

        .email-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #0f0c18; border: 1px solid rgba(201,168,76,0.08); border-radius: 6px; margin-bottom: 20px; }
        .email-icon { font-size: 16px; opacity: 0.4; }
        .email-text { font-size: 14px; color: rgba(240,230,211,0.4); }

        .save-btn { padding: 13px 32px; background: linear-gradient(135deg, #c0392b, #7b1a1a); color: #f0c96a; border: 1px solid rgba(201,168,76,0.25); border-radius: 5px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Cinzel', serif; letter-spacing: 1.5px; transition: all 0.25s; }
        .save-btn:hover { background: linear-gradient(135deg, #e74c3c, #c0392b); box-shadow: 0 0 24px rgba(192,57,43,0.4); transform: translateY(-1px); }
        .save-btn:active { transform: translateY(0) scale(0.97); transition-duration: 0.08s; }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .save-row { display: flex; align-items: center; gap: 16px; margin-top: 4px; flex-wrap: wrap; }
        .save-msg { font-size: 13px; color: #2ecc71; animation: profile-rise 0.3s ease both; }
        .save-msg.error { color: #e74c3c; animation: profile-shake 0.4s ease; }

        .history-item { display: flex; gap: 14px; align-items: center; padding: 12px 8px; border-bottom: 1px solid rgba(201,168,76,0.07); text-decoration: none; border-radius: 6px; transition: background 0.2s, padding-left 0.25s cubic-bezier(0.22, 1, 0.36, 1); }
        .history-item:last-child { border-bottom: none; }
        .history-item:hover { background: rgba(201,168,76,0.04); padding-left: 14px; }
        .history-thumb { width: 80px; height: 50px; background: #1e1828; border-radius: 5px; overflow: hidden; flex-shrink: 0; position: relative; }
        .history-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1); }
        .history-item:hover .history-thumb img { transform: scale(1.08); }
        .history-emoji { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .history-play { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; font-size: 12px; }
        .history-item:hover .history-play { opacity: 1; }
        .history-info { flex: 1; min-width: 0; }
        .history-title { color: #f0e6d3; font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color 0.2s; }
        .history-item:hover .history-title { color: #f0c96a; }
        .history-cat { color: #c9a84c; font-size: 10px; margin-top: 3px; font-family: 'Cinzel', serif; letter-spacing: 1px; text-transform: uppercase; }
        .history-progress-wrap { margin-top: 6px; display: flex; align-items: center; gap: 8px; }
        .history-progress-bar { flex: 1; height: 2px; background: rgba(240,230,211,0.1); border-radius: 1px; max-width: 100px; }
        .history-progress-fill { height: 100%; background: linear-gradient(to right, #c0392b, #c9a84c); border-radius: 1px; box-shadow: 0 0 4px rgba(201,168,76,0.4); }
        .history-time { font-size: 11px; color: rgba(240,230,211,0.25); }
        .empty-history { text-align: center; padding: 32px; color: rgba(240,230,211,0.2); font-size: 14px; }

        @media (max-width: 600px) {
          .field-row { grid-template-columns: 1fr; }
          .avatar-section { flex-direction: column; text-align: center; }
          .profile-card { padding: 20px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .profile-wrap > *, .save-msg { animation: none !important; }
          .avatar-big, .avatar-upload-btn, .save-btn, .history-item, .history-thumb img { transition: none; }
          .avatar-big:hover, .save-btn:hover { transform: none; }
          .history-item:hover .history-thumb img { transform: none; }
        }
      `}</style>

      <Navbar />

      <div className="profile-wrap">
        <h1 className="page-title" style={{ marginBottom: '8px' }}>My Profile</h1>
        <p className="profile-subtitle">Manage your account and preferences</p>

        <div className="profile-card">
          <p className="card-heading">Account</p>

          <div className="avatar-section">
            <div className="avatar-big" onClick={() => fileInputRef.current?.click()}>
              {currentAvatar
                ? <img src={currentAvatar} alt="Avatar" />
                : initials
              }
              <div className="avatar-overlay">📷</div>
            </div>
            <div className="avatar-info">
              <h3>{displayName}</h3>
              <p>{user?.email}</p>
              <div className="avatar-upload-btn" onClick={() => fileInputRef.current?.click()}>
                📷 Change Photo
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
            </div>
          </div>

          {/* Email read only */}
          <div className="field">
            <label>Email Address</label>
            <div className="email-row">
              <span className="email-icon">✉️</span>
              <span className="email-text">{user?.email}</span>
            </div>
          </div>

          {/* Username & Nickname */}
          <div className="field-row">
            <div className="field">
              <label>Username</label>
              <input
                placeholder="e.g. cassiensin"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
              <p className="field-hint">Used for identification</p>
            </div>
            <div className="field">
              <label>Nickname</label>
              <input
                placeholder="e.g. Cassien"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
              />
              <p className="field-hint">Shown in the app</p>
            </div>
          </div>

          <div className="save-row">
            <button className="save-btn" onClick={handleSave} disabled={saving || uploadingAvatar}>
              {saving ? 'Saving...' : uploadingAvatar ? 'Uploading...' : 'Save Changes'}
            </button>
            {message && <span className={`save-msg${isError ? ' error' : ''}`}>{message}</span>}
          </div>
        </div>

        <div className="profile-card">
          <p className="card-heading">Watch History</p>
          {historyLoading ? (
            <>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 8px' }}>
                  <div className="skeleton" style={{ width: 80, height: 50, borderRadius: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton-line" style={{ width: '60%' }} />
                    <div className="skeleton-line short" />
                  </div>
                </div>
              ))}
            </>
          ) : watchHistory.length === 0 ? (
            <div className="empty-history">No watch history yet 🎬</div>
          ) : (
            watchHistory.map((item: any) => (
              <Link key={item.id} href={`/watch/${item.video_id}`} className="history-item">
                <div className="history-thumb">
                  {item.videos?.thumbnail_url
                    ? <img src={getStorageUrl(item.videos.thumbnail_url)} alt={item.videos?.title} />
                    : <div className="history-emoji">🎬</div>
                  }
                  <div className="history-play">▶</div>
                </div>
                <div className="history-info">
                  <div className="history-title">{item.videos?.title}</div>
                  <div className="history-cat">{item.videos?.category}</div>
                  <div className="history-progress-wrap">
                    <div className="history-progress-bar">
                      <div className="history-progress-fill" style={{ width: `${Math.min((item.progress / 7200) * 100, 100)}%` }} />
                    </div>
                    <span className="history-time">
                      {Math.floor(item.progress / 60)}m {item.progress % 60}s
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}