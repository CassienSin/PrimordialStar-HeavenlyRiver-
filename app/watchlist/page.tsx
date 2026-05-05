'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import { getStorageUrl } from '../lib/storage'

export default function WatchlistPage() {
  const router = useRouter()
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data } = await supabase
        .from('watchlist')
        .select('*, videos(id, title, category, thumbnail_url, description, created_at)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      setVideos(data?.filter((w: any) => w.videos) || [])
      setLoading(false)
    }
    load()
  }, [router])

  const handleRemove = async (videoId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('watchlist')
      .delete()
      .eq('user_id', session.user.id)
      .eq('video_id', videoId)
    setVideos(prev => prev.filter(w => w.video_id !== videoId))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0812', color: '#f0e6d3', fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Nunito:wght@300;400;600;700&display=swap');
        .wl-wrap { max-width: 1000px; margin: 0 auto; padding: 100px 24px 80px; }
        .wl-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 40px; flex-wrap: wrap; gap: 16px; }
        .wl-title { font-family: 'Cinzel', serif; font-size: 32px; letter-spacing: 2px; color: #f0e6d3; margin: 0; }
        .wl-count { font-size: 13px; color: rgba(240,230,211,0.35); letter-spacing: 1px; }
        .wl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .wl-card { background: #16121f; border-radius: 8px; overflow: hidden; border: 1px solid rgba(201,168,76,0.08); transition: all 0.25s; position: relative; }
        .wl-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,76,0.15); border-color: rgba(201,168,76,0.15); }
        .wl-thumb { width: 100%; aspect-ratio: 16/9; background: #1e1828; position: relative; overflow: hidden; }
        .wl-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .wl-card:hover .wl-thumb img { transform: scale(1.06); }
        .wl-thumb-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,8,18,0.85), transparent 60%); }
        .wl-emoji { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 36px; background: linear-gradient(135deg, #16121f, #1e1828); }
        .wl-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; }
        .wl-card:hover .wl-play { opacity: 1; }
        .wl-play-btn { width: 44px; height: 44px; border-radius: 50%; background: rgba(240,230,211,0.9); display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.5); }
        .wl-remove { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border-radius: 50%; background: rgba(10,8,18,0.8); border: 1px solid rgba(231,76,60,0.3); color: #e74c3c; font-size: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; transition: all 0.2s; backdrop-filter: blur(4px); z-index: 10; }
        .wl-card:hover .wl-remove { opacity: 1; }
        .wl-remove:hover { background: rgba(192,57,43,0.5); border-color: #e74c3c; }
        .wl-body { padding: 12px; }
        .wl-video-title { color: #f0e6d3; font-size: 13px; font-weight: 600; margin: 0 0 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .wl-cat { color: #c9a84c; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; font-family: 'Cinzel', serif; }
        .wl-added { font-size: 10px; color: rgba(240,230,211,0.25); margin-top: 4px; }
        .empty-state { text-align: center; padding: 80px 20px; color: rgba(240,230,211,0.25); }
        .empty-icon { font-size: 56px; opacity: 0.3; margin-bottom: 16px; }
        .empty-text { font-size: 16px; font-family: 'Cinzel', serif; letter-spacing: 1px; margin-bottom: 20px; }
        .browse-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 28px; background: linear-gradient(135deg, #c0392b, #7b1a1a); color: #f0c96a; border: 1px solid rgba(201,168,76,0.3); border-radius: 4px; text-decoration: none; font-size: 14px; font-weight: 700; font-family: 'Cinzel', serif; letter-spacing: 1px; transition: all 0.2s; }
        .browse-btn:hover { background: linear-gradient(135deg, #e74c3c, #c0392b); box-shadow: 0 0 20px rgba(192,57,43,0.3); }
        .skeleton-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .skeleton-card { background: #16121f; border-radius: 8px; overflow: hidden; border: 1px solid rgba(201,168,76,0.07); }
        .skeleton-thumb { width: 100%; aspect-ratio: 16/9; background: linear-gradient(90deg, #16121f 25%, #1e1828 50%, #16121f 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
        .skeleton-body { padding: 12px; }
        .skeleton-line { height: 11px; border-radius: 3px; margin-bottom: 7px; background: linear-gradient(90deg, #16121f 25%, #1e1828 50%, #16121f 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
        .skeleton-line.short { width: 55%; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @media (max-width: 600px) {
          .wl-grid, .skeleton-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
          .wl-title { font-size: 24px; }
        }
      `}</style>

      <Navbar />

      <div className="wl-wrap">
        <div className="wl-header">
          <h1 className="wl-title">My Watchlist</h1>
          {!loading && videos.length > 0 && (
            <span className="wl-count">{videos.length} {videos.length === 1 ? 'title' : 'titles'}</span>
          )}
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="skeleton-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-thumb" style={{ animationDelay: `${i * 0.07}s` }} />
                <div className="skeleton-body">
                  <div className="skeleton-line" />
                  <div className="skeleton-line short" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && videos.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">❤️</div>
            <p className="empty-text">Your watchlist is empty</p>
            <p style={{ fontSize: '14px', marginBottom: '24px' }}>Add videos by clicking ＋ Watchlist on any video</p>
            <Link href="/" className="browse-btn">🎬 Browse Videos</Link>
          </div>
        )}

        {/* Watchlist grid */}
        {!loading && videos.length > 0 && (
          <div className="wl-grid">
            {videos.map((item: any) => {
              const video = item.videos
              return (
                <div key={item.id} className="wl-card">
                  {/* Remove button */}
                  <button
                    className="wl-remove"
                    onClick={e => { e.preventDefault(); handleRemove(item.video_id) }}
                    title="Remove from watchlist"
                  >✕</button>

                  <Link href={`/watch/${video.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div className="wl-thumb">
                      {video.thumbnail_url ? (
                        <>
                          <img src={getStorageUrl(video.thumbnail_url)} alt={video.title} />
                          <div className="wl-thumb-overlay" />
                        </>
                      ) : (
                        <div className="wl-emoji">🎬</div>
                      )}
                      <div className="wl-play">
                        <div className="wl-play-btn">▶</div>
                      </div>
                    </div>
                    <div className="wl-body">
                      <p className="wl-video-title">{video.title}</p>
                      <p className="wl-cat">{video.category}</p>
                      <p className="wl-added">
                        Added {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}