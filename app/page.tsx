import { supabase } from './lib/supabase'
import Link from 'next/link'
import Navbar from './components/Navbar'
import HeroPreview from './components/HeroPreview'
import ContinueWatching from './components/ContinueWatching'
import SeriesRow from './components/SeriesRow'
import CategoryRow from './components/CategoryRow'
import { getStorageUrl } from './lib/storage'

export const revalidate = 0

export default async function Home() {
  const { data: videos } = await supabase.from('videos').select('*')
  const { data: series } = await supabase.from('series').select('*')
  const categories = ['Anime', 'Donghua', 'Movie', 'Series', 'Other']

  // Build a unified featured pool from all videos + series
  const videoPool = (videos ?? []).map(v => ({
    type: 'video' as const,
    ...v,
    thumbnail_url: getStorageUrl(v.thumbnail_url),
    video_url: getStorageUrl(v.video_url),
  }))

  const seriesPool = (series ?? []).map(s => ({
    type: 'series' as const,
    ...s,
    thumbnail_url: getStorageUrl(s.thumbnail_url),
    // series might have a trailer_url or use the first episode's video_url
    video_url: s.trailer_url ? getStorageUrl(s.trailer_url) : null,
  }))

  const featuredPool = [...videoPool, ...seriesPool]
  const featured = featuredPool.length > 0
    ? featuredPool[Math.floor(Math.random() * featuredPool.length)]
    : null

  return (
    <main style={{ minHeight: '100vh', background: '#0a0812', color: '#f0e6d3' }}>
      <style>{`
        .grain::before {
          content: '';
          position: fixed; inset: 0; z-index: 200;
          pointer-events: none; opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        }

        .rows-section {
          padding: 0 48px 100px;
          margin-top: -60px;
          position: relative;
          z-index: 10;
          overflow: visible;
        }

        .rows-glow {
          position: absolute; top: 0; left: 50%; transform: translateX(-50%);
          width: 600px; height: 200px;
          background: radial-gradient(ellipse, rgba(192,57,43,0.06) 0%, transparent 70%);
          pointer-events: none;
        }

        .empty-link {
          color: #c9a84c; text-decoration: none; font-weight: 700;
          font-size: 14px; letter-spacing: 1px; text-transform: uppercase;
          padding: 10px 24px; border: 1px solid rgba(201,168,76,0.3);
          border-radius: 3px; transition: all 0.2s;
        }
        .empty-link:hover {
          background: rgba(201,168,76,0.1);
          box-shadow: 0 0 16px rgba(201,168,76,0.15);
        }

        @media (max-width: 768px) {
          .rows-section { padding: 0 16px 80px; margin-top: -40px; }
        }
        @media (max-width: 480px) {
          .rows-section { padding: 0 12px 80px; margin-top: -30px; }
        }
      `}</style>

      <div className="grain" />
      <Navbar />

      {/* Hero */}
      {featured ? (
        <HeroPreview video={featured} />
      ) : (
        <div style={{ height: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="empty-state">
            <div className="empty-icon">🎬</div>
            <p className="empty-text">No videos yet</p>
            <Link href="/upload" className="empty-link">Upload First Video</Link>
          </div>
        </div>
      )}

      {/* Rows */}
      <div className="rows-section">
        <div className="rows-glow" />

        <ContinueWatching />
        <SeriesRow />

        {categories.map(category => {
          const cat = videos?.filter(v => v.category === category) || []
          if (cat.length === 0) return null
          return (
            <CategoryRow key={category} category={category} videos={cat} />
          )
        })}

        {(!videos || videos.length === 0) && (
          <div className="empty-state">
            <div className="empty-icon">🎬</div>
            <p className="empty-text">Your library is empty</p>
            <Link href="/upload" className="empty-link">Upload First Video</Link>
          </div>
        )}
      </div>
    </main>
  )
}