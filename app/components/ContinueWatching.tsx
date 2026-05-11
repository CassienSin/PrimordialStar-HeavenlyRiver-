'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { getStorageUrl } from '../lib/storage'
import HoverCard from './HoverCard'
import RowShell from './RowShell'

export default function ContinueWatching() {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const { data } = await supabase
        .from('watch_history')
        .select('*, videos(id, title, category, thumbnail_url, description, created_at)')
        .eq('user_id', session.user.id)
        .order('watched_at', { ascending: false })
        .limit(18)
      setHistory(data?.filter((h: any) => h.videos) || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading || history.length === 0) return null

  return (
    <>
      <style>{`
        .cw-card { border-radius: 6px; overflow: hidden; background: #16121f; text-decoration: none; display: block; border: 1px solid rgba(201,168,76,0.07); transition: border-color 0.25s; width: 100%; }
        .cw-card:hover { border-color: rgba(201,168,76,0.2); }
        .cw-thumb { width: 100%; aspect-ratio: 16/9; background: #1e1828; position: relative; overflow: hidden; }
        .cw-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.4s; }
        .cw-card:hover .cw-thumb img { transform: scale(1.05); }
        .cw-thumb-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,8,18,0.85) 0%, rgba(10,8,18,0.1) 50%, transparent 100%); }
        .cw-thumb-emoji { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 32px; background: linear-gradient(135deg, #16121f, #1e1828); }
        .cw-play-wrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; }
        .cw-card:hover .cw-play-wrap { opacity: 1; }
        .cw-play-btn { width: 38px; height: 38px; border-radius: 50%; background: rgba(240,230,211,0.92); display: flex; align-items: center; justify-content: center; font-size: 13px; color: #0a0812; box-shadow: 0 4px 20px rgba(0,0,0,0.6); }
        .cw-progress-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.15); }
        .cw-progress-fill { height: 100%; background: #e50914; border-radius: 0 2px 2px 0; }
        .cw-body { padding: 10px 12px 13px; }
        .cw-card-title { color: #f0e6d3; font-size: 12.5px; font-weight: 600; margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: 'Nunito', sans-serif; transition: color 0.2s; }
        .cw-card:hover .cw-card-title { color: #fff; }
        .cw-card-meta { display: flex; align-items: center; justify-content: space-between; }
        .cw-card-cat { color: #c9a84c; font-size: 9.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; font-family: 'Cinzel', serif; }
        .cw-card-time { font-size: 10px; color: rgba(240,230,211,0.25); }
      `}</style>

      <RowShell
        slug="cw-shell"
        title="▶ Continue Watching"
        items={history}
        headerRight={
          <span style={{ fontSize: 11, color: 'rgba(240,230,211,0.2)', fontWeight: 600, letterSpacing: 1, whiteSpace: 'nowrap' }}>
            {history.length} {history.length === 1 ? 'title' : 'titles'}
          </span>
        }
        renderCard={(item) => {
          const video = item.videos
          const progressPct = Math.min((item.progress / 7200) * 100, 100)
          const mins = Math.floor(item.progress / 60)
          const secs = item.progress % 60
          return (
            <HoverCard video={video}>
              <Link href={`/watch/${video.id}`} className="cw-card">
                <div className="cw-thumb">
                  {video.thumbnail_url ? (
                    <>
                      <img src={getStorageUrl(video.thumbnail_url)} alt={video.title} />
                      <div className="cw-thumb-overlay" />
                    </>
                  ) : (
                    <div className="cw-thumb-emoji">🎬</div>
                  )}
                  <div className="cw-play-wrap"><div className="cw-play-btn">▶</div></div>
                  <div className="cw-progress-bar">
                    <div className="cw-progress-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
                <div className="cw-body">
                  <p className="cw-card-title">{video.title}</p>
                  <div className="cw-card-meta">
                    <span className="cw-card-cat">{video.category}</span>
                    <span className="cw-card-time">{mins}m {secs}s</span>
                  </div>
                </div>
              </Link>
            </HoverCard>
          )
        }}
      />
    </>
  )
}