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
        .single()

      setInWatchlist(!!data)
      setLoading(false)
    }
    check()
  }, [videoId])

  const toggle = async () => {
    if (!user) return
    setLoading(true)

    if (inWatchlist) {
      await supabase.from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('video_id', videoId)
      setInWatchlist(false)
    } else {
      await supabase.from('watchlist')
        .insert({ user_id: user.id, video_id: videoId })
      setInWatchlist(true)
    }
    setLoading(false)
  }

  if (!user) return null

  return (
    <>
      <style>{`
        .wl-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 28px; border-radius: 3px;
          font-weight: 700; font-size: 15px;
          cursor: pointer; transition: all 0.2s;
          font-family: 'Nunito', sans-serif;
          border: 1px solid rgba(201,168,76,0.25);
          letter-spacing: 0.5px;
        }
        .wl-btn.active {
          background: rgba(201,168,76,0.15);
          color: #c9a84c;
          border-color: #c9a84c;
        }
        .wl-btn.inactive {
          background: rgba(240,230,211,0.08);
          color: #f0e6d3;
          border-color: rgba(240,230,211,0.2);
        }
        .wl-btn:hover { opacity: 0.85; transform: scale(1.02); }
        .wl-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
      <button
        className={`wl-btn ${inWatchlist ? 'active' : 'inactive'}`}
        onClick={toggle}
        disabled={loading}
      >
        {inWatchlist ? 'In Watchlist' : '＋ Watchlist'}
      </button>
    </>
  )
}