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
        .cr-card {
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
        .cr-card:hover {
          transform: translateY(-5px);
          border-color: rgba(201,168,76,0.25);
          box-shadow:
            0 14px 34px rgba(0,0,0,0.55),
            0 0 20px rgba(201,168,76,0.1);
        }

        .cr-thumb { width: 100%; aspect-ratio: 16/9; background: #1e1828; position: relative; overflow: hidden; }
        .cr-thumb img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .cr-card:hover .cr-thumb img { transform: scale(1.08); }

        /* gold sheen that sweeps across the thumbnail once on hover */
        @keyframes cr-sheen {
          from { transform: translateX(-160%) rotate(8deg); }
          to   { transform: translateX(260%) rotate(8deg); }
        }
        .cr-thumb::after {
          content: '';
          position: absolute; top: -20%; left: 0;
          width: 45%; height: 140%;
          background: linear-gradient(90deg, transparent, rgba(240,201,106,0.12), transparent);
          transform: translateX(-160%) rotate(8deg);
          pointer-events: none;
          z-index: 2;
        }
        .cr-card:hover .cr-thumb::after { animation: cr-sheen 0.9s ease forwards; }

        .cr-thumb-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(10,8,18,0.8) 0%, rgba(10,8,18,0.15) 50%, transparent 100%);
          transition: background 0.3s ease;
        }
        .cr-card:hover .cr-thumb-overlay {
          background: linear-gradient(to top, rgba(10,8,18,0.9) 0%, rgba(10,8,18,0.35) 50%, rgba(10,8,18,0.15) 100%);
        }

        .cr-thumb-emoji { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 36px; background: linear-gradient(135deg, #16121f, #1e1828); }

        .cr-play-wrap {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          opacity: 0;
          transition: opacity 0.25s ease;
          z-index: 3;
        }
        .cr-card:hover .cr-play-wrap { opacity: 1; }

        @keyframes cr-pulse-ring {
          0%   { box-shadow: 0 4px 20px rgba(0,0,0,0.6), 0 0 0 0 rgba(201,168,76,0.45); }
          100% { box-shadow: 0 4px 20px rgba(0,0,0,0.6), 0 0 0 12px rgba(201,168,76,0); }
        }
        .cr-play-btn {
          width: 38px; height: 38px; border-radius: 50%;
          background: rgba(240,230,211,0.92);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; color: #0a0812;
          box-shadow: 0 4px 20px rgba(0,0,0,0.6);
          transform: scale(0.6);
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .cr-card:hover .cr-play-btn {
          transform: scale(1);
          animation: cr-pulse-ring 1.5s ease-out infinite;
        }
        .cr-play-btn:hover { background: #f0c96a; }

        .cr-body { padding: 10px 12px 13px; }
        .cr-card-title { color: #f0e6d3; font-size: 12.5px; font-weight: 600; margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: 'Nunito', sans-serif; transition: color 0.25s; }
        .cr-card:hover .cr-card-title { color: #f0c96a; }
        .cr-card-cat { color: #c9a84c; font-size: 9.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; font-family: 'Cinzel', serif; }
        .cr-count { font-size: 11px; color: rgba(240,230,211,0.2); font-weight: 600; letter-spacing: 1px; white-space: nowrap; }

        @media (prefers-reduced-motion: reduce) {
          .cr-card, .cr-thumb img, .cr-play-btn, .cr-card-title { transition: none !important; }
          .cr-card:hover { transform: none; }
          .cr-card:hover .cr-thumb img { transform: none; }
          .cr-card:hover .cr-thumb::after { animation: none; }
          .cr-card:hover .cr-play-btn { animation: none; transform: scale(1); }
        }
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