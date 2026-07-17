'use client'

import Link from 'next/link'
import { getStorageUrl } from '../lib/storage'
import HoverCard from './HoverCard'
import RowShell from './RowShell'

function seriesCpp(w: number): number {
  if (w >= 1400) return 8
  if (w >= 1100) return 7
  if (w >= 800)  return 5
  if (w >= 550)  return 4
  return 3
}

export default function SeriesRowClient({ seriesList }: { seriesList: any[] }) {
  return (
    <>
      <style>{`
        .sr-card {
          border-radius: 6px; overflow: hidden; background: #16121f;
          text-decoration: none; display: block;
          border: 1px solid rgba(201,168,76,0.07);
          transition:
            transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
            border-color 0.3s,
            box-shadow 0.35s ease;
          position: relative; width: 100%;
          will-change: transform;
        }
        .sr-card:hover {
          transform: translateY(-5px);
          border-color: rgba(201,168,76,0.25);
          box-shadow:
            0 14px 34px rgba(0,0,0,0.55),
            0 0 20px rgba(201,168,76,0.1);
        }

        .sr-thumb { width: 100%; aspect-ratio: 2/3; background: #1e1828; position: relative; overflow: hidden; }
        .sr-thumb img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .sr-card:hover .sr-thumb img { transform: scale(1.07); }

        /* gold sheen sweep — taller travel for the poster aspect ratio */
        @keyframes sr-sheen {
          from { transform: translateX(-180%) rotate(10deg); }
          to   { transform: translateX(280%) rotate(10deg); }
        }
        .sr-thumb::after {
          content: '';
          position: absolute; top: -25%; left: 0;
          width: 50%; height: 150%;
          background: linear-gradient(90deg, transparent, rgba(240,201,106,0.1), transparent);
          transform: translateX(-180%) rotate(10deg);
          pointer-events: none;
          z-index: 2;
        }
        .sr-card:hover .sr-thumb::after { animation: sr-sheen 1s ease forwards; }

        .sr-thumb-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(10,8,18,0.95) 0%, rgba(10,8,18,0.2) 50%, transparent 100%);
          transition: background 0.3s ease;
        }
        .sr-card:hover .sr-thumb-overlay {
          background: linear-gradient(to top, rgba(10,8,18,0.98) 0%, rgba(10,8,18,0.4) 50%, rgba(10,8,18,0.15) 100%);
        }

        .sr-thumb-emoji { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 36px; background: linear-gradient(135deg, #16121f, #1e1828); }

        /* centered play button, appears on hover like the video cards */
        .sr-play-wrap {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          opacity: 0;
          transition: opacity 0.25s ease;
          z-index: 3;
          padding-bottom: 44px; /* keep clear of the title block */
        }
        .sr-card:hover .sr-play-wrap { opacity: 1; }
        @keyframes sr-pulse-ring {
          0%   { box-shadow: 0 4px 20px rgba(0,0,0,0.6), 0 0 0 0 rgba(201,168,76,0.45); }
          100% { box-shadow: 0 4px 20px rgba(0,0,0,0.6), 0 0 0 12px rgba(201,168,76,0); }
        }
        .sr-play-btn {
          width: 38px; height: 38px; border-radius: 50%;
          background: rgba(240,230,211,0.92);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; color: #0a0812;
          box-shadow: 0 4px 20px rgba(0,0,0,0.6);
          transform: scale(0.6);
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .sr-card:hover .sr-play-btn {
          transform: scale(1);
          animation: sr-pulse-ring 1.5s ease-out infinite;
        }

        .sr-thumb-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 12px 10px; z-index: 4; }
        .sr-thumb-title {
          font-family: 'Cinzel', serif; font-size: 12px; color: #f0e6d3;
          font-weight: 600; letter-spacing: 0.5px; margin-bottom: 5px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          transition: color 0.25s;
        }
        .sr-card:hover .sr-thumb-title { color: #f0c96a; }
        .sr-thumb-meta { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; }
        .sr-thumb-ep-count { font-size: 9px; color: rgba(240,230,211,0.35); transition: color 0.25s; }
        .sr-card:hover .sr-thumb-ep-count { color: rgba(240,230,211,0.6); }

        .sr-view-all {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 11px; color: rgba(201,168,76,0.5);
          text-decoration: none; font-family: 'Cinzel', serif;
          letter-spacing: 1px; white-space: nowrap;
          transition: color 0.25s, gap 0.25s;
        }
        .sr-view-all:hover { color: #f0c96a; gap: 8px; }

        @media (prefers-reduced-motion: reduce) {
          .sr-card, .sr-thumb img, .sr-play-btn, .sr-thumb-title, .sr-view-all { transition: none !important; }
          .sr-card:hover { transform: none; }
          .sr-card:hover .sr-thumb img { transform: none; }
          .sr-card:hover .sr-thumb::after { animation: none; }
          .sr-card:hover .sr-play-btn { animation: none; transform: scale(1); }
        }
      `}</style>

      <RowShell
        slug="sr-shell"
        title="Series"
        items={seriesList}
        getCpp={seriesCpp}
        arrowHeight={100}
        headerRight={
          <Link href="/series" className="sr-view-all">View All →</Link>
        }
        renderCard={(s) => {
          const totalEps     = s.seasons?.reduce((acc: number, season: any) => acc + (season.episodes?.length || 0), 0) || 0
          const totalSeasons = s.seasons?.length || 0
          const videoShape   = { id: s.id, title: s.title, category: s.category, thumbnail_url: s.thumbnail_url, description: s.description, created_at: s.created_at }
          return (
            <HoverCard video={videoShape} href={`/series/${s.id}`} showWatchlist={false}>
              <Link href={`/series/${s.id}`} className="sr-card">
                <div className="sr-thumb">
                  {s.thumbnail_url ? (
                    <>
                      <img src={getStorageUrl(s.thumbnail_url)} alt={s.title} />
                      <div className="sr-thumb-overlay" />
                    </>
                  ) : (
                    <div className="sr-thumb-emoji">📺</div>
                  )}
                  <div className="sr-play-wrap"><div className="sr-play-btn">▶</div></div>
                  <div className="sr-thumb-info">
                    <div className="sr-thumb-title">{s.title}</div>
                    <div className="sr-thumb-meta">
                      <span className="badge-red" style={{ fontSize: '8px', padding: '1px 6px' }}>{s.category}</span>
                      <span className="sr-thumb-ep-count">
                        {totalSeasons > 0 ? `${totalSeasons}S · ${totalEps}EP` : 'No episodes'}
                      </span>
                    </div>
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