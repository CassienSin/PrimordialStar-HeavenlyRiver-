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
        .sr-card { border-radius: 6px; overflow: hidden; background: #16121f; text-decoration: none; display: block; border: 1px solid rgba(201,168,76,0.07); transition: border-color 0.25s; position: relative; width: 100%; }
        .sr-card:hover { border-color: rgba(201,168,76,0.2); }
        .sr-thumb { width: 100%; aspect-ratio: 2/3; background: #1e1828; position: relative; overflow: hidden; }
        .sr-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.4s; }
        .sr-card:hover .sr-thumb img { transform: scale(1.05); }
        .sr-thumb-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,8,18,0.95) 0%, rgba(10,8,18,0.2) 50%, transparent 100%); }
        .sr-thumb-emoji { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 36px; background: linear-gradient(135deg, #16121f, #1e1828); }
        .sr-thumb-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 12px 10px; }
        .sr-thumb-title { font-family: 'Cinzel', serif; font-size: 12px; color: #f0e6d3; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sr-thumb-meta { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; }
        .sr-thumb-ep-count { font-size: 9px; color: rgba(240,230,211,0.35); }
        .sr-view-all { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: rgba(201,168,76,0.5); text-decoration: none; font-family: 'Cinzel', serif; letter-spacing: 1px; white-space: nowrap; transition: color 0.2s; }
        .sr-view-all:hover { color: #c9a84c; }
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
            <HoverCard video={videoShape}>
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