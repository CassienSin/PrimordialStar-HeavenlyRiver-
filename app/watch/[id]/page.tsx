import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import WatchClient from './WatchClient'
import Navbar from '../../components/Navbar'
import { getStorageUrl } from '../../lib/storage'

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: video } = await supabase
    .from('videos').select('*').eq('id', id).single()

  const { data: related } = await supabase
    .from('videos').select('*')
    .eq('category', video?.category)
    .neq('id', id).limit(6)

  if (!video) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0812', color: '#f0e6d3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎬</div>
          <p style={{ marginBottom: '16px', color: 'rgba(240,230,211,0.5)' }}>Video not found.</p>
          <Link href="/" style={{ color: '#c9a84c', textDecoration: 'none', fontWeight: 700 }}>← Back to Home</Link>
        </div>
      </div>
    )
  }

  const videoWithUrls = {
    ...video,
    video_url: getStorageUrl(video.video_url),
    thumbnail_url: getStorageUrl(video.thumbnail_url),
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0812', color: '#f0e6d3', fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Nunito:wght@300;400;600;700&display=swap');
        .watch-wrap { max-width: 1100px; margin: 0 auto; padding: 84px 24px 80px; }
        .video-title { font-family: 'Cinzel', serif; font-size: clamp(22px, 4vw, 36px); letter-spacing: 1px; margin: 24px 0 8px; color: #f0e6d3; }
        .video-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .video-badge { background: linear-gradient(135deg, #c0392b, #7b1a1a); color: #f0c96a; padding: 4px 14px; border-radius: 2px; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; font-family: 'Cinzel', serif; border: 1px solid rgba(201,168,76,0.3); }
        .video-desc { color: rgba(240,230,211,0.55); font-size: 15px; line-height: 1.8; max-width: 700px; margin-bottom: 32px; }
        .divider { height: 1px; background: linear-gradient(to right, rgba(201,168,76,0.2), transparent); margin: 40px 0; }
        .related-title { font-family: 'Cinzel', serif; font-size: 18px; letter-spacing: 3px; text-transform: uppercase; color: #c9a84c; margin-bottom: 20px; text-shadow: 0 0 20px rgba(201,168,76,0.3); }
        .related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
        .related-card { background: #16121f; border-radius: 6px; overflow: hidden; text-decoration: none; display: block; transition: transform 0.25s, box-shadow 0.25s; border: 1px solid rgba(201,168,76,0.08); }
        .related-card:hover { transform: scale(1.05); box-shadow: 0 8px 32px rgba(201,168,76,0.15); }
        .related-thumb { width: 100%; aspect-ratio: 16/9; background: #1e1828; overflow: hidden; position: relative; }
        .related-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .related-thumb-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,8,18,0.7), transparent); }
        .related-emoji { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 28px; }
        .related-body { padding: 10px 12px; }
        .related-card-title { color: #f0e6d3; font-size: 13px; font-weight: 600; margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .related-card-cat { color: #c9a84c; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
        .back-link { display: inline-flex; align-items: center; gap: 8px; color: rgba(240,230,211,0.5); text-decoration: none; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; transition: color 0.2s; margin-bottom: 20px; }
        .back-link:hover { color: #c9a84c; }
      `}</style>

      <Navbar />

      <div className="watch-wrap">
        <Link href="/" className="back-link">← Back to Home</Link>
        <WatchClient video={videoWithUrls} />
        <h1 className="video-title">{video.title}</h1>
        <div className="video-meta">
          <span className="video-badge">{video.category}</span>
          <span style={{ color: 'rgba(240,230,211,0.3)', fontSize: '13px' }}>
            {new Date(video.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
        {video.description && <p className="video-desc">{video.description}</p>}

        {related && related.length > 0 && (
          <>
            <div className="divider" />
            <h2 className="related-title">More {video.category}</h2>
            <div className="related-grid">
              {related.map((v: any) => (
                <Link key={v.id} href={`/watch/${v.id}`} className="related-card">
                  <div className="related-thumb">
                    {v.thumbnail_url ? (
                      <>
                        <img src={getStorageUrl(v.thumbnail_url)} alt={v.title} />
                        <div className="related-thumb-overlay" />
                      </>
                    ) : (
                      <div className="related-emoji">🎬</div>
                    )}
                  </div>
                  <div className="related-body">
                    <p className="related-card-title">{v.title}</p>
                    <p className="related-card-cat">{v.category}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}