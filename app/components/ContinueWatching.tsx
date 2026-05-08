'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { getStorageUrl } from '../lib/storage'

export default function ContinueWatching() {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      const { data } = await supabase
        .from('watch_history')
        .select('*, videos(id, title, category, thumbnail_url, video_url)')
        .eq('user_id', session.user.id)
        .order('watched_at', { ascending: false })
        .limit(10)

      setHistory(data?.filter((h: any) => h.videos) || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading || history.length === 0) return null

  return (
    <>
      <style>{`
        .cw-row-wrap { margin-bottom: 56px; }
        .cw-row-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
        .cw-row-title { font-family: 'Cinzel', serif; font-size: 16px; letter-spacing: 3px; text-transform: uppercase; color: #c9a84c; text-shadow: 0 0 20px rgba(201,168,76,0.25); margin: 0; }
        .cw-row-line { flex: 1; height: 1px; background: linear-gradient(to right, rgba(201,168,76,0.2), transparent); }
        .cw-row-count { font-size: 11px; color: rgba(240,230,211,0.2); font-weight: 600; letter-spacing: 1px; white-space: nowrap; }
        .cw-cards { display: flex; gap: 14px; overflow-x: auto; padding-top: 20px; padding-bottom: 20px; padding-left: 12px; padding-right: 12px; margin-left: -12px; margin-right: -12px; scrollbar-width: thin; scrollbar-color: rgba(201,168,76,0.3) transparent; }
        .cw-cards::-webkit-scrollbar { height: 3px; }
        .cw-cards::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 2px; }
        .cw-card { flex-shrink: 0; width: 185px; border-radius: 6px; overflow: hidden; background: #16121f; text-decoration: none; display: block; border: 1px solid rgba(201,168,76,0.07); transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s, border-color 0.3s; position: relative; z-index: 1; }
        .cw-card:hover { transform: translateY(-8px) scale(1.10); box-shadow: 0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.2); border-color: rgba(201,168,76,0.2); z-index: 2; }
        .cw-thumb { width: 185px; height: 110px; background: #1e1828; position: relative; overflow: hidden; }
        .cw-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .cw-card:hover .cw-thumb img { transform: scale(1.08); }
        .cw-thumb-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,8,18,0.9) 0%, rgba(10,8,18,0.2) 50%, transparent 100%); }
        .cw-emoji { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 36px; background: linear-gradient(135deg, #16121f, #1e1828); }
        .cw-play-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; }
        .cw-card:hover .cw-play-overlay { opacity: 1; }
        .cw-play-btn { width: 40px; height: 40px; border-radius: 50%; background: rgba(240,230,211,0.9); display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.5); }
        .cw-progress-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.15); }
        .cw-progress-fill { height: 100%; background: #e50914; border-radius: 0 2px 2px 0; transition: width 0.3s; }
        .cw-body { padding: 10px 12px 12px; }
        .cw-title { color: #f0e6d3; font-size: 13px; font-weight: 600; margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: 'Nunito', sans-serif; }
        .cw-meta { display: flex; align-items: center; justify-content: space-between; }
        .cw-cat { color: #c9a84c; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; font-family: 'Cinzel', serif; }
        .cw-time { font-size: 10px; color: rgba(240,230,211,0.3); }

        @media (max-width: 768px) {
          .cw-card { width: 155px; }
          .cw-thumb { width: 155px; height: 93px; }
        }
        @media (max-width: 480px) {
          .cw-card { width: 130px; }
          .cw-thumb { width: 130px; height: 78px; }
          .cw-row-title { font-size: 12px; letter-spacing: 1.5px; }
        }
      `}</style>

      <div className="cw-row-wrap">
        <div className="cw-row-header">
          <h2 className="cw-row-title">▶ Continue Watching</h2>
          <div className="cw-row-line" />
          <span className="cw-row-count">{history.length} {history.length === 1 ? 'title' : 'titles'}</span>
        </div>
        <div className="cw-cards">
          {history.map((item: any) => {
            const video = item.videos
            const progressPct = Math.min((item.progress / 7200) * 100, 100)
            const mins = Math.floor(item.progress / 60)
            const secs = item.progress % 60

            return (
              <Link key={item.id} href={`/watch/${video.id}`} className="cw-card">
                <div className="cw-thumb">
                  {video.thumbnail_url ? (
                    <>
                      <img src={getStorageUrl(video.thumbnail_url)} alt={video.title} />
                      <div className="cw-thumb-overlay" />
                    </>
                  ) : (
                    <div className="cw-emoji">🎬</div>
                  )}
                  <div className="cw-play-overlay">
                    <div className="cw-play-btn">▶</div>
                  </div>
                  <div className="cw-progress-bar">
                    <div className="cw-progress-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
                <div className="cw-body">
                  <p className="cw-title">{video.title}</p>
                  <div className="cw-meta">
                    <span className="cw-cat">{video.category}</span>
                    <span className="cw-time">{mins}m {secs}s</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}