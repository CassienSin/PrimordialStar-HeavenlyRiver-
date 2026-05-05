import { supabase } from '../../../lib/supabase'
import Link from 'next/link'
import Navbar from '../../../components/Navbar'
import EpisodeWatchClient from './EpisodeWatchClient'
import { getStorageUrl } from '../../../lib/storage'

export default async function EpisodeWatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: episode } = await supabase
    .from('episodes')
    .select('*, seasons(id, season_number, title, series_id, series(id, title, category, thumbnail_url))')
    .eq('id', id)
    .single()

  if (!episode) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0812', color: '#f0e6d3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎬</div>
          <p style={{ marginBottom: '16px', color: 'rgba(240,230,211,0.5)' }}>Episode not found.</p>
          <Link href="/" style={{ color: '#c9a84c', textDecoration: 'none', fontWeight: 700 }}>← Back to Home</Link>
        </div>
      </div>
    )
  }

  // Get all episodes in this season for next/prev navigation
  const { data: allEpisodes } = await supabase
    .from('episodes')
    .select('id, episode_number, title, thumbnail_url')
    .eq('season_id', episode.season_id)
    .order('episode_number', { ascending: true })

  const currentIndex = allEpisodes?.findIndex(e => e.id === id) ?? 0
  const nextEpisode = allEpisodes?.[currentIndex + 1] || null
  const prevEpisode = allEpisodes?.[currentIndex - 1] || null

  const epWithUrls = {
    ...episode,
    video_url: getStorageUrl(episode.video_url),
    thumbnail_url: getStorageUrl(episode.thumbnail_url),
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0812', color: '#f0e6d3', fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Nunito:wght@300;400;600;700&display=swap');
        .ep-watch-wrap { max-width: 1100px; margin: 0 auto; padding: 84px 24px 80px; }
        .back-link { display: inline-flex; align-items: center; gap: 8px; color: rgba(240,230,211,0.5); text-decoration: none; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; transition: color 0.2s; margin-bottom: 20px; }
        .back-link:hover { color: #c9a84c; }
        .ep-meta { margin-top: 20px; }
        .ep-series-link { display: inline-flex; align-items: center; gap: 8px; color: #c9a84c; text-decoration: none; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; font-family: 'Cinzel', serif; margin-bottom: 8px; transition: color 0.2s; }
        .ep-series-link:hover { color: #f0c96a; }
        .ep-season-info { font-size: 12px; color: rgba(240,230,211,0.35); margin-bottom: 12px; letter-spacing: 0.5px; }
        .ep-title { font-family: 'Cinzel', serif; font-size: clamp(20px, 3vw, 32px); letter-spacing: 1px; margin: 0 0 8px; color: #f0e6d3; }
        .ep-badges { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
        .ep-badge { background: linear-gradient(135deg, #c0392b, #7b1a1a); color: #f0c96a; padding: 3px 12px; border-radius: 2px; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; font-family: 'Cinzel', serif; border: 1px solid rgba(201,168,76,0.3); }
        .ep-num-badge { background: rgba(201,168,76,0.1); color: #c9a84c; padding: 3px 12px; border-radius: 2px; font-size: 10px; font-weight: 700; letter-spacing: 1px; font-family: 'Cinzel', serif; border: 1px solid rgba(201,168,76,0.2); }
        .ep-desc { color: rgba(240,230,211,0.55); font-size: 15px; line-height: 1.8; max-width: 700px; margin-bottom: 32px; }
        .ep-nav { display: flex; gap: 12px; margin-top: 32px; flex-wrap: wrap; }
        .ep-nav-btn { display: flex; align-items: center; gap: 10px; padding: 12px 20px; background: #16121f; border: 1px solid rgba(201,168,76,0.1); border-radius: 8px; text-decoration: none; transition: all 0.2s; flex: 1; min-width: 200px; }
        .ep-nav-btn:hover { border-color: rgba(201,168,76,0.3); background: #1e1828; }
        .ep-nav-thumb { width: 64px; height: 40px; border-radius: 4px; overflow: hidden; background: #1e1828; flex-shrink: 0; }
        .ep-nav-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .ep-nav-label { font-size: 10px; color: rgba(240,230,211,0.3); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; font-family: 'Cinzel', serif; }
        .ep-nav-title { font-size: 13px; color: #f0e6d3; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ep-nav-num { font-size: 11px; color: #c9a84c; margin-top: 2px; }
        .divider { height: 1px; background: linear-gradient(to right, rgba(201,168,76,0.2), transparent); margin: 32px 0; }
      `}</style>

      <Navbar />

      <div className="ep-watch-wrap">
        <Link href={`/series/${episode.seasons?.series_id}`} className="back-link">
          ← Back to Series
        </Link>

        {/* Video Player */}
        <EpisodeWatchClient episode={epWithUrls} />

        {/* Episode Info */}
        <div className="ep-meta">
          <Link href={`/series/${episode.seasons?.series_id}`} className="ep-series-link">
            📺 {episode.seasons?.series?.title}
          </Link>
          <div className="ep-season-info">
            {episode.seasons?.title || `Season ${episode.seasons?.season_number}`}
          </div>
          <h1 className="ep-title">{episode.title}</h1>
          <div className="ep-badges">
            <span className="ep-badge">{episode.seasons?.series?.category}</span>
            <span className="ep-num-badge">Episode {episode.episode_number}</span>
          </div>
          {episode.description && <p className="ep-desc">{episode.description}</p>}
        </div>

        {/* Next/Prev Navigation */}
        {(prevEpisode || nextEpisode) && (
          <>
            <div className="divider" />
            <div className="ep-nav">
              {prevEpisode && (
                <Link href={`/watch/episode/${prevEpisode.id}`} className="ep-nav-btn">
                  <div style={{ fontSize: '18px', color: 'rgba(240,230,211,0.3)' }}>‹</div>
                  <div className="ep-nav-thumb">
                    {prevEpisode.thumbnail_url
                      ? <img src={getStorageUrl(prevEpisode.thumbnail_url)} alt={prevEpisode.title} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🎬</div>
                    }
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="ep-nav-label">← Previous</div>
                    <div className="ep-nav-title">{prevEpisode.title}</div>
                    <div className="ep-nav-num">Episode {prevEpisode.episode_number}</div>
                  </div>
                </Link>
              )}
              {nextEpisode && (
                <Link href={`/watch/episode/${nextEpisode.id}`} className="ep-nav-btn" style={{ justifyContent: 'flex-end', textAlign: 'right' }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="ep-nav-label">Next →</div>
                    <div className="ep-nav-title">{nextEpisode.title}</div>
                    <div className="ep-nav-num">Episode {nextEpisode.episode_number}</div>
                  </div>
                  <div className="ep-nav-thumb">
                    {nextEpisode.thumbnail_url
                      ? <img src={getStorageUrl(nextEpisode.thumbnail_url)} alt={nextEpisode.title} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🎬</div>
                    }
                  </div>
                  <div style={{ fontSize: '18px', color: 'rgba(240,230,211,0.3)' }}>›</div>
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}