'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../components/Navbar'

export default function PartyPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [parties, setParties] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [partyName, setPartyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)

      // Load parties user is a member of
      const { data } = await supabase
        .from('party_members')
        .select('party_id, parties(id, name, invite_code, host_id, video_id, videos(title, thumbnail_url), profiles!parties_host_id_fkey(nickname, username))')
        .eq('user_id', session.user.id)
        .order('joined_at', { ascending: false })

      setParties(data?.map((d: any) => d.parties).filter(Boolean) || [])
    }
    load()
  }, [router])

  const handleCreate = async () => {
    if (!partyName.trim()) return
    setLoading(true)
    const { data, error } = await supabase
      .from('parties')
      .insert({ name: partyName, host_id: user.id })
      .select()
      .single()

    if (error || !data) { setMessage('❌ Failed to create party'); setLoading(false); return }

    // Auto join as member
    await supabase.from('party_members').insert({ party_id: data.id, user_id: user.id })
    router.push(`/party/${data.id}`)
  }

  const handleJoin = async () => {
    if (!inviteCode.trim()) return
    setLoading(true)
    const { data: party } = await supabase
      .from('parties')
      .select('id')
      .eq('invite_code', inviteCode.trim())
      .single()

    if (!party) { setMessage('❌ Party not found'); setLoading(false); return }

    await supabase.from('party_members').upsert({ party_id: party.id, user_id: user.id })
    router.push(`/party/${party.id}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0812', color: '#f0e6d3', fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Nunito:wght@300;400;600;700&display=swap');
        .party-wrap { max-width: 900px; margin: 0 auto; padding: 100px 24px 80px; }
        .party-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 40px; flex-wrap: wrap; gap: 16px; }
        .party-title { font-family: 'Cinzel', serif; font-size: 32px; letter-spacing: 2px; color: #f0e6d3; margin: 0; }
        .party-actions { display: flex; gap: 12px; }
        .btn-primary { padding: 10px 22px; background: linear-gradient(135deg, #c0392b, #7b1a1a); color: #f0c96a; border: 1px solid rgba(201,168,76,0.3); border-radius: 5px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Cinzel', serif; letter-spacing: 1px; transition: all 0.2s; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; }
        .btn-primary:hover { background: linear-gradient(135deg, #e74c3c, #c0392b); box-shadow: 0 0 20px rgba(192,57,43,0.3); }
        .btn-secondary { padding: 10px 22px; background: rgba(201,168,76,0.08); color: #c9a84c; border: 1px solid rgba(201,168,76,0.25); border-radius: 5px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Cinzel', serif; letter-spacing: 1px; transition: all 0.2s; }
        .btn-secondary:hover { background: rgba(201,168,76,0.15); border-color: #c9a84c; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: #16121f; border: 1px solid rgba(201,168,76,0.15); border-radius: 10px; padding: 36px; max-width: 440px; width: 100%; }
        .modal-title { font-family: 'Cinzel', serif; font-size: 22px; letter-spacing: 1px; margin: 0 0 24px; color: #f0e6d3; }
        .modal-input { width: 100%; padding: 12px 16px; background: #0f0c18; border: 1px solid rgba(201,168,76,0.15); border-radius: 6px; color: #f0e6d3; font-size: 15px; font-family: 'Nunito', sans-serif; outline: none; box-sizing: border-box; margin-bottom: 16px; transition: border-color 0.2s; }
        .modal-input:focus { border-color: rgba(201,168,76,0.4); }
        .modal-input::placeholder { color: rgba(240,230,211,0.2); }
        .modal-btns { display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px; }
        .modal-cancel { padding: 10px 20px; background: rgba(255,255,255,0.05); color: rgba(240,230,211,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 5px; font-size: 13px; cursor: pointer; font-family: 'Nunito', sans-serif; }
        .party-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .party-card { background: #16121f; border: 1px solid rgba(201,168,76,0.08); border-radius: 10px; overflow: hidden; text-decoration: none; transition: all 0.25s; display: block; }
        .party-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,76,0.15); border-color: rgba(201,168,76,0.15); }
        .party-card-thumb { width: 100%; aspect-ratio: 16/9; background: linear-gradient(135deg, #1e1828, #16121f); position: relative; overflow: hidden; }
        .party-card-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .party-card-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,8,18,0.9), transparent); display: flex; align-items: flex-end; padding: 12px; }
        .party-card-video { font-size: 12px; color: rgba(240,230,211,0.6); font-weight: 600; }
        .party-card-no-video { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 40px; }
        .party-card-body { padding: 16px; }
        .party-card-name { font-family: 'Cinzel', serif; font-size: 16px; color: #f0e6d3; margin: 0 0 8px; letter-spacing: 0.5px; }
        .party-card-host { font-size: 12px; color: rgba(240,230,211,0.35); }
        .party-card-code { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; padding: 4px 10px; background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.15); border-radius: 3px; font-size: 11px; color: #c9a84c; font-family: 'Courier New', monospace; letter-spacing: 1px; }
        .divider { display: flex; align-items: center; gap: 16px; margin: 32px 0; }
        .divider-line { flex: 1; height: 1px; background: rgba(201,168,76,0.1); }
        .divider-text { font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: 3px; color: rgba(201,168,76,0.4); text-transform: uppercase; }
        .join-row { display: flex; gap: 12px; max-width: 400px; }
        .join-input { flex: 1; padding: 12px 16px; background: #16121f; border: 1px solid rgba(201,168,76,0.15); border-radius: 6px; color: #f0e6d3; font-size: 14px; font-family: 'Nunito', sans-serif; outline: none; transition: border-color 0.2s; }
        .join-input:focus { border-color: rgba(201,168,76,0.4); }
        .join-input::placeholder { color: rgba(240,230,211,0.2); }
        .empty-state { text-align: center; padding: 60px 20px; color: rgba(240,230,211,0.25); }
        .empty-icon { font-size: 52px; opacity: 0.3; margin-bottom: 16px; }
        .msg { font-size: 14px; color: rgba(240,230,211,0.6); margin-top: 12px; }
      `}</style>

      <Navbar />

      <div className="party-wrap">
        <div className="party-header">
          <h1 className="party-title">Watch Parties</h1>
          <div className="party-actions">
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              ＋ Create Party
            </button>
          </div>
        </div>

        {/* Join by code */}
        <div>
          <p style={{ fontSize: '13px', color: 'rgba(240,230,211,0.4)', marginBottom: '12px', letterSpacing: '0.5px' }}>
            Have an invite code?
          </p>
          <div className="join-row">
            <input
              className="join-input"
              placeholder="Enter invite code..."
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            <button className="btn-secondary" onClick={handleJoin} disabled={loading}>
              Join
            </button>
          </div>
          {message && <p className="msg">{message}</p>}
        </div>

        <div className="divider">
          <div className="divider-line" />
          <span className="divider-text">Your Parties</span>
          <div className="divider-line" />
        </div>

        {parties.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎬</div>
            <p>No parties yet. Create one and invite your friends!</p>
          </div>
        ) : (
          <div className="party-grid">
            {parties.map((party: any) => (
              <Link key={party.id} href={`/party/${party.id}`} className="party-card">
                <div className="party-card-thumb">
                  {party.videos?.thumbnail_url ? (
                    <>
                      <img src={party.videos.thumbnail_url} alt={party.videos.title} />
                      <div className="party-card-overlay">
                        <span className="party-card-video">▶ {party.videos.title}</span>
                      </div>
                    </>
                  ) : (
                    <div className="party-card-no-video">🎬</div>
                  )}
                </div>
                <div className="party-card-body">
                  <p className="party-card-name">{party.name}</p>
                  <p className="party-card-host">
                    Hosted by {party.profiles?.nickname || party.profiles?.username || 'Unknown'}
                  </p>
                  <div className="party-card-code">
                     {party.invite_code}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Party Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Create a Party</h2>
            <input
              className="modal-input"
              placeholder="Party name e.g. Friday Movie Night"
              value={partyName}
              onChange={e => setPartyName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="modal-btns">
              <button className="modal-cancel" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate} disabled={loading}>
                {loading ? 'Creating...' : 'Create Party'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}