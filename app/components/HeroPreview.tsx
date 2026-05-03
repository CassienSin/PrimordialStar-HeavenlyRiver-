'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export default function HeroPreview({ video }: { video: any }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (videoRef.current) videoRef.current.play().catch(() => {})
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Nunito:wght@300;400;600;700&display=swap');
        .hero { height: 85vh; position: relative; display: flex; align-items: flex-end; padding: 0 48px 80px; overflow: hidden; }
        .hero-bg { position: absolute; inset: 0; }
        .hero-thumb { position: absolute; inset: 0; background-size: cover; background-position: center; transition: opacity 0.8s; }
        .hero-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: opacity 1.2s ease; }
        .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to right, rgba(10,8,18,0.92) 35%, rgba(10,8,18,0.2)); }
        .hero-overlay-bottom { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,8,18,1) 0%, rgba(10,8,18,0.5) 25%, transparent 60%); }
        .hero-content { position: relative; z-index: 10; max-width: 540px; }
        .hero-badge { display: inline-block; background: linear-gradient(135deg, #c0392b, #7b1a1a); color: #f0c96a; padding: 4px 14px; border-radius: 2px; font-size: 11px; font-weight: 700; letter-spacing: 3px; margin-bottom: 16px; text-transform: uppercase; border: 1px solid rgba(201,168,76,0.3); font-family: 'Cinzel', serif; }
        .hero-title { font-family: 'Cinzel', serif; font-size: clamp(28px, 5vw, 64px); line-height: 1.1; margin: 0 0 12px; letter-spacing: 2px; color: #f0e6d3; text-shadow: 0 2px 20px rgba(0,0,0,0.8); }
        .hero-desc { color: rgba(240,230,211,0.65); font-size: 15px; margin-bottom: 28px; line-height: 1.7; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .hero-btns { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .btn-play { display: inline-flex; align-items: center; gap: 8px; background: #f0e6d3; color: #0a0812; padding: 12px 28px; border-radius: 3px; text-decoration: none; font-weight: 800; font-size: 15px; transition: all 0.2s; letter-spacing: 0.5px; }
        .btn-play:hover { background: #c9a84c; color: #0a0812; box-shadow: 0 0 20px rgba(201,168,76,0.4); }
        .btn-info { display: inline-flex; align-items: center; gap: 8px; background: rgba(240,230,211,0.1); color: #f0e6d3; padding: 12px 28px; border-radius: 3px; text-decoration: none; font-weight: 700; font-size: 15px; backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.25); transition: all 0.2s; }
        .btn-info:hover { background: rgba(201,168,76,0.15); border-color: rgba(201,168,76,0.5); }
        .mute-btn { position: absolute; bottom: 90px; right: 48px; z-index: 20; width: 40px; height: 40px; border-radius: 50%; background: rgba(10,8,18,0.6); border: 1px solid rgba(201,168,76,0.4); color: #c9a84c; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; backdrop-filter: blur(4px); }
        .mute-btn:hover { background: rgba(201,168,76,0.15); border-color: #c9a84c; }

        @media (max-width: 768px) {
          .hero { height: 75vh; padding: 0 20px 60px; }
          .hero-overlay { background: linear-gradient(to top, rgba(10,8,18,0.98) 20%, rgba(10,8,18,0.5) 60%, rgba(10,8,18,0.2)); }
          .hero-desc { display: none; }
          .btn-play { padding: 11px 22px; font-size: 14px; }
          .btn-info { padding: 11px 22px; font-size: 14px; }
          .mute-btn { bottom: 65px; right: 20px; width: 36px; height: 36px; font-size: 14px; }
        }
      `}</style>

      <div className="hero">
        <div className="hero-bg">
          <div
            className="hero-thumb"
            style={{
              backgroundImage: video.thumbnail_url ? `url(${video.thumbnail_url})` : 'none',
              background: video.thumbnail_url ? undefined : 'linear-gradient(135deg, #1a0000, #0a0812)',
              opacity: videoReady ? 0 : 1,
            }}
          />
          <video
            ref={videoRef}
            src={video.video_url}
            muted={muted}
            loop
            playsInline
            className="hero-video"
            style={{ opacity: videoReady ? 1 : 0 }}
            onCanPlay={() => setVideoReady(true)}
          />
          <div className="hero-overlay" />
          <div className="hero-overlay-bottom" />
        </div>

        <div className="hero-content">
          <div className="hero-badge">{video.category}</div>
          <h1 className="hero-title">{video.title}</h1>
          <p className="hero-desc">{video.description}</p>
          <div className="hero-btns">
            <Link href={`/watch/${video.id}`} className="btn-play">▶ Play</Link>
            <Link href={`/watch/${video.id}`} className="btn-info">ℹ More Info</Link>
          </div>
        </div>

        {videoReady && (
          <button className="mute-btn" onClick={() => setMuted(!muted)}>
            {muted ? '🔇' : '🔊'}
          </button>
        )}
      </div>
    </>
  )
}