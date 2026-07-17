'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import { getStorageUrl } from '../lib/storage'

export default function PartyPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [parties, setParties] = useState<any[]>([])
  const [fetching, setFetching] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [partyName, setPartyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUser(session.user)

      const { data } = await supabase
        .from('party_members')
        .select(`
          party_id,
          parties (
            id, name, invite_code, host_id,
            videos ( id, title, thumbnail_url ),
            profiles!parties_host_id_fkey ( nickname, username )
          )
        `)
        .eq('user_id', session.user.id)
        .order('joined_at', { ascending: false })

      setParties(data?.map((d: any) => d.parties).filter(Boolean) || [])
      setFetching(false)
    }
    load()
  }, [router])

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current) }, [])

  const handleCreate = async () => {
    if (!partyName.trim()) return
    setLoading(true)
    const { data, error } = await supabase
      .from('parties')
      .insert({ name: partyName, host_id: user.id })
      .select()
      .single()

    if (error || !data) { setMessage('❌ Failed to create party'); setLoading(false); return }
    await supabase.from('party_members').insert({ party_id: data.id, user_id: user.id })
    router.push(`/party/${data.id}`)
  }

  const handleJoin = async () => {
    if (!inviteCode.trim()) return
    setLoading(true)
    setMessage('')
    const { data: party } = await supabase
      .from('parties')
      .select('id')
      .eq('invite_code', inviteCode.trim())
      .maybeSingle()

    if (!party) { setMessage('❌ Party not found'); setLoading(false); return }
    await supabase.from('party_members').upsert({ party_id: party.id, user_id: user.id })
    router.push(`/party/${party.id}`)
  }

  const copyCode = (e: React.MouseEvent, id: string, code: string) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard?.writeText(code).then(() => {
      setCopiedId(id)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopiedId(null), 1500)
    }).catch(() => {})
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0812', color: '#f0e6d3', fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        /* Party-specific styles only */
        @keyframes party-rise {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes party-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-3px); }
        }
        @keyframes party-sheen {
          from { transform: translateX(-160%) rotate(8deg); }
          to   { transform: translateX(260%) rotate(8deg); }
        }

        .party-wrap { max-width: 900px; margin: 0 auto; padding: 100px 24px 80px; animation: party-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .party-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 40px; flex-wrap: wrap; gap: 16px; }
        .party-title { font-family: 'Cinzel', serif; font-size: 32px; letter-spacing: 2px; color: #f0e6d3; margin: 0; }

        .modal-input { width: 100%; padding: 12px 16px; background: #0f0c18; border: 1px solid rgba(201,168,76,0.15); border-radius: 6px; color: #f0e6d3; font-size: 15px; font-family: 'Nunito', sans-serif; outline: none; box-sizing: border-box; margin-bottom: 16px; transition: border-color 0.25s, box-shadow 0.25s; }
        .modal-input:focus { border-color: rgba(201,168,76,0.4); box-shadow: 0 0 14px rgba(201,168,76,0.08); }
        .modal-input::placeholder { color: rgba(240,230,211,0.2); }

        .party-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .party-grid > * { animation: party-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .party-grid > *:nth-child(1) { animation-delay: 0.05s; }
        .party-grid > *:nth-child(2) { animation-delay: 0.12s; }
        .party-grid > *:nth-child(3) { animation-delay: 0.19s; }
        .party-grid > *:nth-child(4) { animation-delay: 0.26s; }
        .party-grid > *:nth-child(5) { animation-delay: 0.33s; }
        .party-grid > *:nth-child(n+6) { animation-delay: 0.4s; }

        .party-card {
          background: #16121f; border: 1px solid rgba(201,168,76,0.08);
          border-radius: 10px; overflow: hidden; text-decoration: none;
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease, border-color 0.3s;
          display: block; will-change: transform;
        }
        .party-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,76,0.15), 0 0 20px rgba(201,168,76,0.08);
          border-color: rgba(201,168,76,0.15);
        }
        .party-card-thumb { width: 100%; aspect-ratio: 16/9; background: linear-gradient(135deg, #1e1828, #16121f); position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .party-card-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
        .party-card:hover .party-card-thumb img { transform: scale(1.07); }
        .party-card-thumb::after {
          content: '';
          position: absolute; top: -20%; left: 0; width: 45%; height: 140%;
          background: linear-gradient(90deg, transparent, rgba(240,201,106,0.1), transparent);
          transform: translateX(-160%) rotate(8deg);
          pointer-events: none; z-index: 2;
        }
        .party-card:hover .party-card-thumb::after { animation: party-sheen 0.9s ease forwards; }
        .party-card-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,8,18,0.9), transparent); display: flex; align-items: flex-end; padding: 12px; }
        .party-card-video { font-size: 12px; color: rgba(240,230,211,0.8); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .party-card-no-video { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; color: rgba(240,230,211,0.2); font-size: 36px; }
        .party-card-body { padding: 16px; }
        .party-card-name { font-family: 'Cinzel', serif; font-size: 16px; color: #f0e6d3; margin: 0 0 8px; letter-spacing: 0.5px; transition: color 0.25s; }
        .party-card:hover .party-card-name { color: #f0c96a; }
        .party-card-host { font-size: 12px; color: rgba(240,230,211,0.35); }
        .party-card-code {
          display: inline-flex; align-items: center; gap: 6px; margin-top: 10px;
          padding: 4px 10px; background: rgba(201,168,76,0.08);
          border: 1px solid rgba(201,168,76,0.15); border-radius: 3px;
          font-size: 11px; color: #c9a84c;
          font-family: 'Courier New', monospace; letter-spacing: 1px;
          cursor: copy; transition: background 0.2s, border-color 0.2s, transform 0.15s;
        }
        .party-card-code:hover { background: rgba(201,168,76,0.16); border-color: rgba(201,168,76,0.35); }
        .party-card-code:active { transform: scale(0.96); }
        .party-card-code.copied { background: rgba(39,174,96,0.12); border-color: rgba(39,174,96,0.3); color: #2ecc71; }

        .join-row { display: flex; gap: 12px; max-width: 400px; }
        .join-input { flex: 1; padding: 12px 16px; background: #16121f; border: 1px solid rgba(201,168,76,0.15); border-radius: 6px; color: #f0e6d3; font-size: 14px; font-family: 'Nunito', sans-serif; outline: none; transition: border-color 0.25s, box-shadow 0.25s; }
        .join-input:focus { border-color: rgba(201,168,76,0.4); box-shadow: 0 0 14px rgba(201,168,76,0.08); }
        .join-input::placeholder { color: rgba(240,230,211,0.2); }
        .msg { font-size: 14px; color: rgba(240,230,211,0.6); margin-top: 12px; animation: party-shake 0.4s ease; }

        @media (max-width: 600px) {
          .party-grid { grid-template-columns: 1fr; }
          .party-title { font-size: 24px; }
          .join-row { flex-direction: column; max-width: 100%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .party-wrap, .party-grid > *, .msg { animation: none !important; }
          .party-card, .party-card-thumb img, .party-card-code { transition: none; }
          .party-card:hover { transform: none; }
          .party-card:hover .party-card-thumb img { transform: none; }
          .party-card:hover .party-card-thumb::after { animation: none; }
        }
      `}</style>

      <Navbar />

      <div className="party-wrap">
        <div className="party-header">
          <h1 className="party-title">Watch Parties</h1>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            ＋ Create Party
          </button>
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
              {loading ? 'Joining...' : 'Join'}
            </button>
          </div>
          {message && <p className="msg">{message}</p>}
        </div>

        {/* Divider - using globals class */}
        <div className="divider-gold">
          <div className="divider-gold-line" />
          <span className="divider-gold-text">Your Parties</span>
          <div className="divider-gold-line right" />
        </div>

        {/* Loading skeletons */}
        {fetching ? (
          <div className="party-grid">
            {[0, 1, 2].map(i => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-thumb" />
                <div className="skeleton-body">
                  <div className="skeleton-line" style={{ width: '70%' }} />
                  <div className="skeleton-line short" />
                </div>
              </div>
            ))}
          </div>
        ) : parties.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎉</div>
            <p className="empty-text">No parties yet</p>
            <p style={{ fontSize: '14px', color: 'rgba(240,230,211,0.3)' }}>Create one and invite your friends!</p>
          </div>
        ) : (
          <div className="party-grid">
            {parties.map((party: any) => (
              <Link key={party.id} href={`/party/${party.id}`} className="party-card">
                <div className="party-card-thumb">
                  {party.videos?.thumbnail_url ? (
                    <>
                      <img
                        src={getStorageUrl(party.videos.thumbnail_url)}
                        alt={party.videos.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div className="party-card-overlay">
                        <span className="party-card-video">▶ {party.videos.title}</span>
                      </div>
                    </>
                  ) : (
                    <div className="party-card-no-video">
                      <span>🎬</span>
                    </div>
                  )}
                </div>
                <div className="party-card-body">
                  <p className="party-card-name">{party.name}</p>
                  <p className="party-card-host">
                    Hosted by {party.profiles?.nickname || party.profiles?.username || 'Unknown'}
                  </p>
                  <div
                    className={`party-card-code${copiedId === party.id ? ' copied' : ''}`}
                    onClick={e => copyCode(e, party.id, party.invite_code)}
                    title="Click to copy invite code"
                  >
                    {copiedId === party.id ? '✓ Copied!' : party.invite_code}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Party Modal - using globals classes */}
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
              <button className="btn-cancel" onClick={() => setShowCreate(false)}>Cancel</button>
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