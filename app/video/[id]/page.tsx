import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import WatchlistButton from '../../components/WatchlistButton'
import { getStorageUrl } from '../../lib/storage'
import { notFound } from 'next/navigation'

export const revalidate = 0

export default async function VideoPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: video } = await supabase
    .from('videos').select('*').eq('id', id).single()

  if (!video) notFound()

  const { data: related } = await supabase
    .from('videos').select('*')
    .eq('category', video.category)
    .neq('id', id)
    .limit(8)

  const thumbnailUrl = video.thumbnail_url ? getStorageUrl(video.thumbnail_url) : null

  // Format duration if stored in seconds
  const formatDuration = (secs?: number) => {
    if (!secs) return null
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const duration = formatDuration(video.duration)
  const year = video.created_at ? new Date(video.created_at).getFullYear() : null

  return (
    <div style={{ minHeight: '100vh', background: '#0a0812', color: '#f0e6d3', fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Nunito:wght@300;400;600;700&display=swap');

        /* ── Hero ── */
        .preview-hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: flex-end;
          padding-bottom: 80px;
          overflow: hidden;
        }

        .preview-hero-bg {
          position: absolute; inset: 0;
          background-size: cover;
          background-position: center top;
          transition: opacity 0.8s ease;
        }

        .preview-hero-vignette {
          position: absolute; inset: 0;
          background:
            linear-gradient(to right, rgba(10,8,18,0.92) 0%, rgba(10,8,18,0.6) 50%, rgba(10,8,18,0.15) 100%),
            linear-gradient(to top, rgba(10,8,18,1) 0%, rgba(10,8,18,0.4) 40%, transparent 70%);
        }

        .preview-grain {
          position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        }

        /* ── Back button ── */
        .preview-back {
          position: fixed; top: 80px; left: 24px; z-index: 100;
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(10,8,18,0.7);
          border: 1px solid rgba(240,230,211,0.15);
          color: #f0e6d3; font-size: 18px;
          display: flex; align-items: center; justify-content: center;
          text-decoration: none;
          backdrop-filter: blur(8px);
          transition: background 0.2s, border-color 0.2s;
        }
        .preview-back:hover {
          background: rgba(201,168,76,0.15);
          border-color: rgba(201,168,76,0.4);
        }

        /* ── Content ── */
        .preview-content {
          position: relative; z-index: 10;
          padding: 0 64px 0;
          max-width: 680px;
        }

        /* ── Category badge ── */
        .preview-badge {
          display: inline-block;
          background: linear-gradient(135deg, #c0392b, #7b1a1a);
          color: #f0c96a;
          padding: 4px 14px;
          border-radius: 2px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          font-family: 'Cinzel', serif;
          border: 1px solid rgba(201,168,76,0.3);
          margin-bottom: 16px;
        }

        /* ── Title ── */
        .preview-title {
          font-family: 'Cinzel', serif;
          font-size: clamp(36px, 6vw, 72px);
          font-weight: 900;
          line-height: 1.0;
          letter-spacing: 2px;
          color: #f0e6d3;
          margin: 0 0 20px;
          text-shadow: 0 4px 24px rgba(0,0,0,0.6);
        }

        /* ── Meta row ── */
        .preview-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .preview-rating {
          display: flex; align-items: center; gap: 5px;
          color: #f0c96a; font-weight: 700; font-size: 14px;
        }
        .preview-rating-star { color: #c0392b; font-size: 12px; }
        .preview-dot { color: rgba(240,230,211,0.25); font-size: 10px; }
        .preview-meta-item { color: rgba(240,230,211,0.55); font-size: 13px; font-weight: 600; }
        .preview-meta-genre {
          color: rgba(240,230,211,0.4);
          font-size: 12px;
          padding: 3px 10px;
          border: 1px solid rgba(240,230,211,0.1);
          border-radius: 2px;
          letter-spacing: 0.5px;
        }

        /* ── Description ── */
        .preview-desc {
          color: rgba(240,230,211,0.6);
          font-size: 14px;
          line-height: 1.8;
          margin-bottom: 32px;
          max-width: 520px;
        }

        /* ── Actions ── */
        .preview-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .btn-play {
          display: inline-flex; align-items: center; gap: 10px;
          background: #f0e6d3; color: #0a0812;
          padding: 13px 32px; border-radius: 50px;
          font-size: 15px; font-weight: 800;
          letter-spacing: 0.5px;
          text-decoration: none;
          border: none; cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(240,230,211,0.2);
          font-family: 'Nunito', sans-serif;
        }
        .btn-play:hover {
          background: #fff;
          transform: scale(1.04);
          box-shadow: 0 8px 32px rgba(240,230,211,0.3);
        }
        .btn-play-icon { font-size: 16px; }

        .btn-icon {
          width: 44px; height: 44px;
          border-radius: 50%;
          background: rgba(240,230,211,0.1);
          border: 2px solid rgba(240,230,211,0.3);
          color: #f0e6d3;
          font-size: 16px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, transform 0.15s;
          text-decoration: none;
          backdrop-filter: blur(4px);
        }
        .btn-icon:hover {
          background: rgba(240,230,211,0.2);
          border-color: rgba(240,230,211,0.5);
          transform: scale(1.08);
        }

        .btn-outlined {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(240,230,211,0.08);
          border: 1px solid rgba(240,230,211,0.2);
          color: #f0e6d3;
          padding: 11px 22px; border-radius: 50px;
          font-size: 13px; font-weight: 700;
          letter-spacing: 0.5px;
          text-decoration: none;
          backdrop-filter: blur(4px);
          transition: background 0.2s, border-color 0.2s;
          font-family: 'Nunito', sans-serif;
          cursor: pointer;
        }
        .btn-outlined:hover {
          background: rgba(240,230,211,0.15);
          border-color: rgba(240,230,211,0.35);
        }

        /* ── Divider ── */
        .preview-divider {
          height: 1px;
          background: linear-gradient(to right, rgba(201,168,76,0.15), transparent);
          margin: 60px 64px 40px;
        }

        /* ── Similar section ── */
        .similar-section {
          padding: 0 64px 80px;
        }
        .similar-heading {
          font-family: 'Cinzel', serif;
          font-size: 13px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: rgba(240,230,211,0.35);
          margin-bottom: 20px;
        }
        .similar-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 14px;
        }
        .similar-card {
          background: #16121f;
          border-radius: 6px;
          overflow: hidden;
          text-decoration: none;
          display: block;
          border: 1px solid rgba(201,168,76,0.07);
          transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
        }
        .similar-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 12px 36px rgba(0,0,0,0.5);
          border-color: rgba(201,168,76,0.2);
        }
        .similar-thumb {
          width: 100%; aspect-ratio: 16/9;
          background: #1e1828; overflow: hidden; position: relative;
        }
        .similar-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .similar-thumb-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(10,8,18,0.7), transparent 60%);
        }
        .similar-thumb-empty {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          font-size: 28px;
        }
        .similar-body { padding: 10px 12px 12px; }
        .similar-title {
          color: #f0e6d3; font-size: 13px; font-weight: 700;
          margin: 0 0 4px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .similar-cat { color: #c9a84c; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }

        /* ── No thumbnail fallback ── */
        .preview-hero-placeholder {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 60% 40%, rgba(192,57,43,0.15) 0%, rgba(10,8,18,0) 70%),
                      linear-gradient(135deg, #0f0b18 0%, #16121f 100%);
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .preview-content { padding: 0 20px 0; max-width: 100%; }
          .preview-title { font-size: clamp(28px, 8vw, 48px); }
          .preview-divider { margin: 40px 20px 32px; }
          .similar-section { padding: 0 20px 60px; }
          .similar-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
          .preview-back { top: 72px; left: 16px; }
        }
        @media (max-width: 480px) {
          .preview-hero { min-height: 80vh; padding-bottom: 48px; }
          .btn-play { padding: 11px 24px; font-size: 14px; }
          .btn-outlined { padding: 9px 16px; font-size: 12px; }
        }
      `}</style>

      <Navbar />

      {/* Back button */}
      <Link href="/" className="preview-back" aria-label="Back">‹</Link>

      {/* Hero */}
      <div className="preview-hero">
        {thumbnailUrl ? (
          <div
            className="preview-hero-bg"
            style={{ backgroundImage: `url(${thumbnailUrl})` }}
          />
        ) : (
          <div className="preview-hero-placeholder" />
        )}
        <div className="preview-hero-vignette" />
        <div className="preview-grain" />

        <div className="preview-content">
          <div className="preview-badge">{video.category}</div>

          <h1 className="preview-title">{video.title}</h1>

          <div className="preview-meta">
            {video.rating && (
              <>
                <div className="preview-rating">
                  <span className="preview-rating-star">★</span>
                  {video.rating}
                </div>
                <span className="preview-dot">●</span>
              </>
            )}
            {year && <span className="preview-meta-item">{year}</span>}
            {year && duration && <span className="preview-dot">·</span>}
            {duration && <span className="preview-meta-item">{duration}</span>}
            {video.genre && (
              <>
                <span className="preview-dot">·</span>
                <span className="preview-meta-genre">{video.genre}</span>
              </>
            )}
          </div>

          {video.description && (
            <p className="preview-desc">{video.description}</p>
          )}

          <div className="preview-actions">
            {/* Play → actual watch page */}
            <Link href={`/watch/${video.id}?autoplay=1`} className="btn-play">
            <span className="btn-play-icon">▶</span>
            Play
          </Link>

            {/* Watchlist */}
            <WatchlistButton videoId={id} />

            {/* Similars — scrolls down */}
            {related && related.length > 0 && (
              <a href="#similars" className="btn-outlined">
                <span>⊞</span> Similars
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Similar videos */}
      {related && related.length > 0 && (
        <>
          <div className="preview-divider" />
          <div className="similar-section" id="similars">
            <p className="similar-heading">More {video.category}</p>
            <div className="similar-grid">
              {related.map((v: any) => (
                <Link key={v.id} href={`/video/${v.id}`} className="similar-card">
                  <div className="similar-thumb">
                    {v.thumbnail_url ? (
                      <>
                        <img src={getStorageUrl(v.thumbnail_url)} alt={v.title} />
                        <div className="similar-thumb-overlay" />
                      </>
                    ) : (
                      <div className="similar-thumb-empty">🎬</div>
                    )}
                  </div>
                  <div className="similar-body">
                    <p className="similar-title">{v.title}</p>
                    <p className="similar-cat">{v.category}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}