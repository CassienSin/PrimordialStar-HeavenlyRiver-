import { supabase } from './lib/supabase'
import Link from 'next/link'
import Navbar from './components/Navbar'
import HeroPreview from './components/HeroPreview'
import ContinueWatching from './components/ContinueWatching'
import { getStorageUrl } from './lib/storage'
import SeriesRow from './components/SeriesRow'

export const revalidate = 0

export default async function Home() {
  const { data: videos } = await supabase.from('videos').select('*')
  const categories = ['Anime', 'Donghua', 'Movie', 'Series', 'Other']
  const featured = videos?.[0]

  return (
    <main style={{ minHeight: '100vh', background: '#0a0812', color: '#f0e6d3' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Nunito:wght@300;400;600;700&display=swap');
        * { box-sizing: border-box; }

        .grain::before {
          content: '';
          position: fixed; inset: 0; z-index: 200;
          pointer-events: none; opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        }

        .rows-section { padding: 0 48px 100px; margin-top: -60px; position: relative; z-index: 10; overflow: visible; }
        .category-row { margin-bottom: 56px; overflow: visible; }
        .row-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
        .row-title { font-family: 'Cinzel', serif; font-size: 16px; letter-spacing: 3px; text-transform: uppercase; color: #c9a84c; text-shadow: 0 0 20px rgba(201,168,76,0.25); margin: 0; }
        .row-line { flex: 1; height: 1px; background: linear-gradient(to right, rgba(201,168,76,0.2), transparent); }
        .row-count { font-size: 11px; color: rgba(240,230,211,0.2); font-weight: 600; letter-spacing: 1px; white-space: nowrap; }

        .cards-row { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 24px; padding-top: 24px; padding-left: 12px; padding-right: 12px; margin-left: -12px; margin-right: -12px; scrollbar-width: thin; scrollbar-color: rgba(201,168,76,0.3) transparent; }
        .cards-row::-webkit-scrollbar { height: 3px; }
        .cards-row::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 2px; }

        .card { flex-shrink: 0; width: 185px; border-radius: 6px; overflow: hidden; background: #16121f; text-decoration: none; display: block; border: 1px solid rgba(201,168,76,0.07); transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s, border-color 0.3s; position: relative; transform-origin: center bottom; }
        .card:hover { transform: translateY(-6px) scale(1.06); box-shadow: 0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.2), 0 0 20px rgba(201,168,76,0.08); border-color: rgba(201,168,76,0.2); z-index: 10;}
        .card-thumb { width: 185px; height: 110px; background: #1e1828; position: relative; overflow: hidden; }
        .card-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .card:hover .card-thumb img { transform: scale(1.08); }
        .card-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,8,18,0.85) 0%, rgba(10,8,18,0.2) 50%, transparent 100%); }
        .card-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; }
        .card:hover .card-play { opacity: 1; }
        .card-play-btn { width: 40px; height: 40px; border-radius: 50%; background: rgba(240,230,211,0.9); display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.5); }
        .card-emoji { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 36px; background: linear-gradient(135deg, #16121f, #1e1828); }
        .card-body { padding: 12px 12px 14px; }
        .card-title { color: #f0e6d3; font-size: 13px; font-weight: 600; margin: 0 0 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: 'Nunito', sans-serif; }
        .card-cat { color: #c9a84c; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; font-family: 'Cinzel', serif; }

        .empty-state { height: 60vh; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 20px; text-align: center; padding: 40px; }
        .empty-icon { font-size: 64px; opacity: 0.4; }
        .empty-text { color: rgba(240,230,211,0.3); font-size: 18px; font-family: 'Cinzel', serif; letter-spacing: 1px; }
        .empty-link { color: #c9a84c; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; padding: 10px 24px; border: 1px solid rgba(201,168,76,0.3); border-radius: 3px; transition: all 0.2s; }
        .empty-link:hover { background: rgba(201,168,76,0.1); box-shadow: 0 0 16px rgba(201,168,76,0.15); }

        .rows-glow { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 600px; height: 200px; background: radial-gradient(ellipse, rgba(192,57,43,0.06) 0%, transparent 70%); pointer-events: none; }

        @media (max-width: 768px) {
          .rows-section { padding: 0 16px 80px; margin-top: -40px; overflow: visible; }
          .card { width: 155px; }
          .card-thumb { width: 155px; height: 93px; }
          .row-title { font-size: 14px; letter-spacing: 2px; }
          .category-row { margin-bottom: 40px; overflow: visible;}
          .card-play-btn { width: 32px; height: 32px; font-size: 12px; }
        }

        @media (max-width: 480px) {
          .rows-section { padding: 0 12px 80px; margin-top: -30px; overflow: visible; }
          .category-row { margin-bottom: 32px; overflow: visible; }
          .row-header { margin-bottom: 10px; }
          .row-title { font-size: 12px; letter-spacing: 1.5px; }
          .row-count { font-size: 10px; }
          .cards-row { gap: 8px; }
          .card { width: 130px; }
          .card-thumb { width: 130px; height: 78px; }
          .card-body { padding: 8px 8px 10px; }
          .card-title { font-size: 11px; }
          .card-cat { font-size: 9px; letter-spacing: 1px; }
          .card-play-btn { width: 28px; height: 28px; font-size: 10px; }
          .empty-text { font-size: 14px; }
        }
      `}</style>

      <div className="grain" />
      <Navbar />

      {featured ? (
        <HeroPreview video={{
          ...featured,
          thumbnail_url: getStorageUrl(featured.thumbnail_url),
          video_url: getStorageUrl(featured.video_url)
        }} />
      ) : (
        <div style={{ height: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="empty-state">
            <div className="empty-icon">🎬</div>
            <p className="empty-text">No videos yet</p>
            <Link href="/upload" className="empty-link">Upload First Video</Link>
          </div>
        </div>
      )}

      <div className="rows-section">
        <div className="rows-glow" />
        <ContinueWatching />
        <SeriesRow />
        {categories.map(category => {
          const cat = videos?.filter(v => v.category === category) || []
          if (cat.length === 0) return null
          return (
            <div key={category} className="category-row">
              <div className="row-header">
                <h2 className="row-title">{category}</h2>
                <div className="row-line" />
                <span className="row-count">{cat.length} {cat.length === 1 ? 'title' : 'titles'}</span>
              </div>
              <div className="cards-row">
                {cat.map((video: any) => (
                  <Link key={video.id} href={`/watch/${video.id}`} className="card">
                    <div className="card-thumb">
                      {video.thumbnail_url ? (
                        <>
                          <img src={getStorageUrl(video.thumbnail_url)} alt={video.title} />
                          <div className="card-overlay" />
                        </>
                      ) : (
                        <div className="card-emoji">🎬</div>
                      )}
                      <div className="card-play">
                        <div className="card-play-btn">▶</div>
                      </div>
                    </div>
                    <div className="card-body">
                      <p className="card-title">{video.title}</p>
                      <p className="card-cat">{video.category}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
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