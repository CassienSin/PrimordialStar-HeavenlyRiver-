'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function WatchlistButton({ videoId }: { videoId: string }) {
  const [inWatchlist, setInWatchlist] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      setUser(session.user)

      const { data } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('video_id', videoId)
        .maybeSingle()

      setInWatchlist(!!data)
      setLoading(false)
    }
    check()
  }, [videoId])

  const toggle = async () => {
    if (!user || loading) return

    // Optimistic: flip the UI immediately, revert if the request fails
    const wasIn = inWatchlist
    setInWatchlist(!wasIn)

    const { error } = wasIn
      ? await supabase.from('watchlist')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId)
      : await supabase.from('watchlist')
          .insert({ user_id: user.id, video_id: videoId })

    if (error) setInWatchlist(wasIn)
  }

  if (!user) return null

  return (
    <>
      <style>{`
        @keyframes wl-pop {
          0%   { transform: scale(1); }
          45%  { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
        .wl-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 28px; border-radius: 3px;
          font-weight: 700; font-size: 15px;
          cursor: pointer;
          transition: background 0.25s, color 0.25s, border-color 0.25s,
                      box-shadow 0.25s, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
          font-family: 'Nunito', sans-serif;
          border: 1px solid rgba(201,168,76,0.25);
          letter-spacing: 0.5px;
        }
        .wl-btn.active {
          background: rgba(201,168,76,0.15);
          color: #c9a84c;
          border-color: #c9a84c;
          box-shadow: 0 0 16px rgba(201,168,76,0.15);
        }
        .wl-btn.inactive {
          background: rgba(240,230,211,0.08);
          color: #f0e6d3;
          border-color: rgba(240,230,211,0.2);
        }
        .wl-btn:hover {
          transform: translateY(-2px);
          border-color: #c9a84c;
          color: #f0c96a;
          box-shadow: 0 0 20px rgba(201,168,76,0.25);
        }
        .wl-btn:active {
          transform: translateY(0) scale(0.97);
          transition-duration: 0.08s;
        }
        .wl-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .wl-icon { display: inline-block; }
        .wl-btn.active .wl-icon {
          animation: wl-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @media (prefers-reduced-motion: reduce) {
          .wl-btn { transition: none; }
          .wl-btn:hover { transform: none; }
          .wl-btn.active .wl-icon { animation: none; }
        }
      `}</style>
      <button
        className={`wl-btn ${inWatchlist ? 'active' : 'inactive'}`}
        onClick={toggle}
        disabled={loading}
      >
        <span className="wl-icon">{inWatchlist ? '✓' : '＋'}</span>
        {inWatchlist ? 'In Watchlist' : 'Watchlist'}
      </button>
    </>
  )
}