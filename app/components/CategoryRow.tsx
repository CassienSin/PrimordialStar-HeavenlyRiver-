'use client'

import Link from 'next/link'
import { getStorageUrl } from '../lib/storage'
import HoverCard from './HoverCard'
import RowShell from './RowShell'

interface Video {
  id: string
  title: string
  category: string
  thumbnail_url?: string
  description?: string
  created_at?: string
}

function categoryCpp(w: number): number {
  if (w >= 1400) return 6
  if (w >= 1100) return 5
  if (w >= 800)  return 4
  if (w >= 550)  return 3
  return 2
}

export default function CategoryRow({ category, videos }: { category: string; videos: Video[] }) {
  return (
    <>
      <style>{`
        .cr-card { border-radius: 6px; overflow: hidden; background: #16121f; text-decoration: none; display: block; border: 1px solid rgba(201,168,76,0.07); transition: border-color 0.25s; width: 100%; }
        .cr-card:hover { border-color: rgba(201,168,76,0.2); }
        .cr-thumb { width: 100%; aspect-ratio: 16/9; background: #1e1828; position: relative; overflow: hidden; }
        .cr-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.4s; }
        .cr-card:hover .cr-thumb img { transform: scale(1.05); }
        .cr-thumb-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,8,18,0.8) 0%, rgba(10,8,18,0.15) 50%, transparent 100%); }
        .cr-thumb-emoji { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 36px; background: linear-gradient(135deg, #16121f, #1e1828); }
        .cr-play-wrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; }
        .cr-card:hover .cr-play-wrap { opacity: 1; }
        .cr-play-btn { width: 38px; height: 38px; border-radius: 50%; background: rgba(240,230,211,0.92); display: flex; align-items: center; justify-content: center; font-size: 13px; color: #0a0812; box-shadow: 0 4px 20px rgba(0,0,0,0.6); }
        .cr-body { padding: 10px 12px 13px; }
        .cr-card-title { color: #f0e6d3; font-size: 12.5px; font-weight: 600; margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: 'Nunito', sans-serif; transition: color 0.2s; }
        .cr-card:hover .cr-card-title { color: #fff; }
        .cr-card-cat { color: #c9a84c; font-size: 9.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; font-family: 'Cinzel', serif; }
        .cr-count { font-size: 11px; color: rgba(240,230,211,0.2); font-weight: 600; letter-spacing: 1px; white-space: nowrap; }
      `}</style>

      <RowShell
        slug={`cr-${category.toLowerCase()}`}
        title={category}
        items={videos}
        getCpp={categoryCpp}
        headerRight={
          <span className="cr-count">{videos.length} {videos.length === 1 ? 'title' : 'titles'}</span>
        }
        renderCard={(video) => (
          <HoverCard video={video}>
            <Link href={`/video/${video.id}`} className="cr-card">
              <div className="cr-thumb">
                {video.thumbnail_url ? (
                  <>
                    <img src={getStorageUrl(video.thumbnail_url)} alt={video.title} />
                    <div className="cr-thumb-overlay" />
                  </>
                ) : (
                  <div className="cr-thumb-emoji">🎬</div>
                )}
                <div className="cr-play-wrap"><div className="cr-play-btn">▶</div></div>
              </div>
              <div className="cr-body">
                <p className="cr-card-title">{video.title}</p>
                <p className="cr-card-cat">{video.category}</p>
              </div>
            </Link>
          </HoverCard>
        )}
      />
    </>
  )
}