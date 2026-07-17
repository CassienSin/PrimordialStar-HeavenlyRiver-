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
        .cw-card {
          border-radius: 6px; overflow: hidden; background: #16121f;
          text-decoration: none; display: block;
          border: 1px solid rgba(201,168,76,0.07);
          transition:
            transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
            border-color 0.3s,
            box-shadow 0.35s ease;
          width: 100%;
          will-change: transform;
        }
        .cw-card:hover {
          transform: translateY(-5px);
          border-color: rgba(201,168,76,0.25);
          box-shadow:
            0 14px 34px rgba(0,0,0,0.55),
            0 0 20px rgba(201,168,76,0.1);
        }

        .cw-thumb { width: 100%; aspect-ratio: 16/9; background: #1e1828; position: relative; overflow: hidden; }
        .cw-thumb img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .cw-card:hover .cw-thumb img { transform: scale(1.08); }

        /* gold sheen sweep */
        @keyframes cw-sheen {
          from { transform: translateX(-160%) rotate(8deg); }
          to   { transform: translateX(260%) rotate(8deg); }
        }
        .cw-thumb::after {
          content: '';
          position: absolute; top: -20%; left: 0;
          width: 45%; height: 140%;
          background: linear-gradient(90deg, transparent, rgba(240,201,106,0.12), transparent);
          transform: translateX(-160%) rotate(8deg);
          pointer-events: none;
          z-index: 2;
        }
        .cw-card:hover .cw-thumb::after { animation: cw-sheen 0.9s ease forwards; }

        .cw-thumb-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(10,8,18,0.85) 0%, rgba(10,8,18,0.1) 50%, transparent 100%);
          transition: background 0.3s ease;
        }
        .cw-card:hover .cw-thumb-overlay {
          background: linear-gradient(to top, rgba(10,8,18,0.92) 0%, rgba(10,8,18,0.3) 50%, rgba(10,8,18,0.12) 100%);
        }

        .cw-thumb-emoji { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 32px; background: linear-gradient(135deg, #16121f, #1e1828); }

        .cw-play-wrap {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          opacity: 0;
          transition: opacity 0.25s ease;
          z-index: 3;
        }
        .cw-card:hover .cw-play-wrap { opacity: 1; }

        @keyframes cw-pulse-ring {
          0%   { box-shadow: 0 4px 20px rgba(0,0,0,0.6), 0 0 0 0 rgba(201,168,76,0.45); }
          100% { box-shadow: 0 4px 20px rgba(0,0,0,0.6), 0 0 0 12px rgba(201,168,76,0); }
        }
        .cw-play-btn {
          width: 38px; height: 38px; border-radius: 50%;
          background: rgba(240,230,211,0.92);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; color: #0a0812;
          box-shadow: 0 4px 20px rgba(0,0,0,0.6);
          transform: scale(0.6);
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .cw-card:hover .cw-play-btn {
          transform: scale(1);
          animation: cw-pulse-ring 1.5s ease-out infinite;
        }
        .cw-play-btn:hover { background: #f0c96a; }

        /* progress bar — brand red-to-gold gradient with a soft glow */
        .cw-progress-bar {
          position: absolute; bottom: 0; left: 0; right: 0;
          height: 3px;
          background: rgba(255,255,255,0.15);
          z-index: 3;
        }
        .cw-progress-fill {
          height: 100%;
          background: linear-gradient(to right, #c0392b, #c9a84c);
          border-radius: 0 2px 2px 0;
          box-shadow: 0 0 8px rgba(201,168,76,0.5);
          transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .cw-card:hover .cw-progress-bar { height: 4px; }

        .cw-body { padding: 10px 12px 13px; }
        .cw-card-title { color: #f0e6d3; font-size: 12.5px; font-weight: 600; margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: 'Nunito', sans-serif; transition: color 0.25s; }
        .cw-card:hover .cw-card-title { color: #f0c96a; }
        .cw-card-meta { display: flex; align-items: center; justify-content: space-between; }
        .cw-card-cat { color: #c9a84c; font-size: 9.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; font-family: 'Cinzel', serif; }
        .cw-card-time { font-size: 10px; color: rgba(240,230,211,0.25); }

        @media (prefers-reduced-motion: reduce) {
          .cw-card, .cw-thumb img, .cw-play-btn, .cw-card-title, .cw-progress-fill { transition: none !important; }
          .cw-card:hover { transform: none; }
          .cw-card:hover .cw-thumb img { transform: none; }
          .cw-card:hover .cw-thumb::after { animation: none; }
          .cw-card:hover .cw-play-btn { animation: none; transform: scale(1); }
        }
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