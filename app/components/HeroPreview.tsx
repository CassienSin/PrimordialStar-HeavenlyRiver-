'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export default function HeroPreview({ video }: { video: any }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [muted, setMuted] = useState(true)

  // Where a click should take the user — series go to their series page
  const href = video.type === 'series' ? `/series/${video.id}` : `/watch/${video.id}`

  useEffect(() => {
    // Respect reduced-motion: keep the still thumbnail, skip autoplay
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timer = setTimeout(() => {
      videoRef.current?.play().catch(() => {})
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  // Pause the preview when the hero scrolls out of view, resume when back
  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        const vid = videoRef.current
        if (!vid) return
        if (entry.isIntersecting) vid.play().catch(() => {})
        else vid.pause()
      },
      { threshold: 0.2 }
    )
    observer.observe(hero)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <style>{`
        .hero { height: 85vh; position: relative; display: flex; align-items: flex-end; padding: 0 48px 80px; overflow: hidden; }
        .hero-bg { position: absolute; inset: 0; }

        /* very slow cinematic push-in on the backdrop */
        @keyframes hp-slowzoom {
          from { transform: scale(1); }
          to   { transform: scale(1.06); }
        }
        .hero-thumb {
          position: absolute; inset: 0;
          background-size: cover; background-position: center;
          transition: opacity 0.8s;
          animation: hp-slowzoom 30s ease-out forwards;
        }
        .hero-video {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover;
          transition: opacity 1.2s ease;
        }

        .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to right, rgba(10,8,18,0.92) 35%, rgba(10,8,18,0.2)); }
        .hero-overlay-bottom { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,8,18,1) 0%, rgba(10,8,18,0.5) 25%, transparent 60%); }

        /* the "river" — a faint band of golden light drifting across the hero */
        @keyframes hp-river-drift {
          0%   { transform: translateX(-15%) skewX(-12deg); opacity: 0.05; }
          50%  { opacity: 0.12; }
          100% { transform: translateX(15%) skewX(-12deg); opacity: 0.05; }
        }
        .hero-river {
          position: absolute; inset: 0; pointer-events: none; z-index: 5;
          background: linear-gradient(100deg, transparent 30%, rgba(240,201,106,0.08) 48%, rgba(201,168,76,0.05) 52%, transparent 70%);
          animation: hp-river-drift 14s ease-in-out infinite;
        }

        /* staggered entrance for the content */
        @keyframes hp-rise {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-content { position: relative; z-index: 10; max-width: 540px; }
        .hero-badge {
          display: inline-block; background: linear-gradient(135deg, #c0392b, #7b1a1a); color: #f0c96a;
          padding: 4px 14px; border-radius: 2px; font-size: 11px; font-weight: 700; letter-spacing: 3px;
          margin-bottom: 16px; text-transform: uppercase; border: 1px solid rgba(201,168,76,0.3); font-family: 'Cinzel', serif;
          animation: hp-rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
        }
        .hero-title {
          font-family: 'Cinzel', serif; font-size: clamp(28px, 5vw, 64px); line-height: 1.1;
          margin: 0 0 12px; letter-spacing: 2px; color: #f0e6d3;
          text-shadow: 0 2px 20px rgba(0,0,0,0.8);
          animation: hp-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both;
        }
        .hero-desc {
          color: rgba(240,230,211,0.65); font-size: 15px; margin-bottom: 28px; line-height: 1.7;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
          animation: hp-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.4s both;
        }
        .hero-btns {
          display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
          animation: hp-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.55s both;
        }

        .btn-play {
          display: inline-flex; align-items: center; gap: 8px;
          background: #f0e6d3; color: #0a0812; padding: 12px 28px; border-radius: 3px;
          text-decoration: none; font-weight: 800; font-size: 15px;
          transition: all 0.25s; letter-spacing: 0.5px;
        }
        .btn-play:hover {
          background: #c9a84c; color: #0a0812;
          box-shadow: 0 0 24px rgba(201,168,76,0.45);
          transform: translateY(-2px);
        }
        .btn-play:active { transform: translateY(0) scale(0.97); transition-duration: 0.08s; }

        .btn-info {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(240,230,211,0.1); color: #f0e6d3; padding: 12px 28px; border-radius: 3px;
          text-decoration: none; font-weight: 700; font-size: 15px;
          backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.25);
          transition: all 0.25s;
        }
        .btn-info:hover {
          background: rgba(201,168,76,0.15); border-color: rgba(201,168,76,0.5);
          transform: translateY(-2px);
        }
        .btn-info:active { transform: translateY(0) scale(0.97); transition-duration: 0.08s; }

        .mute-btn {
          position: absolute; bottom: 90px; right: 48px; z-index: 20;
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(10,8,18,0.6); border: 1px solid rgba(201,168,76,0.4);
          color: #c9a84c; font-size: 16px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px);
          transition: all 0.25s;
          animation: hp-rise 0.5s ease both;
        }
        .mute-btn:hover {
          background: rgba(201,168,76,0.15); border-color: #c9a84c;
          transform: scale(1.1);
        }
        .mute-btn:active { transform: scale(0.95); }

        @media (max-width: 768px) {
          .hero { height: 70vh; padding: 0 16px 50px; }
          .hero-overlay { background: linear-gradient(to top, rgba(10,8,18,0.98) 20%, rgba(10,8,18,0.5) 60%, rgba(10,8,18,0.2)); }
          .hero-title { font-size: clamp(24px, 7vw, 40px); margin-bottom: 10px; }
          .hero-desc { display: none; }
          .hero-badge { font-size: 10px; padding: 3px 10px; margin-bottom: 12px; }
          .btn-play { padding: 10px 20px; font-size: 13px; }
          .btn-info { padding: 10px 20px; font-size: 13px; }
          .mute-btn { bottom: 55px; right: 16px; width: 34px; height: 34px; font-size: 13px; }
        }

        @media (max-width: 480px) {
          .hero { height: 65vh; padding: 0 14px 44px; }
          .hero-title { font-size: clamp(22px, 8vw, 36px); }
          .btn-play { padding: 9px 18px; font-size: 12px; }
          .btn-info { padding: 9px 18px; font-size: 12px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-thumb, .hero-river, .hero-badge, .hero-title, .hero-desc, .hero-btns, .mute-btn { animation: none !important; }
          .btn-play, .btn-info, .mute-btn { transition: none; }
          .btn-play:hover, .btn-info:hover, .mute-btn:hover { transform: none; }
        }
      `}</style>

      <div className="hero" ref={heroRef}>
        <div className="hero-bg">
          <div
            className="hero-thumb"
            style={
              video.thumbnail_url
                ? { backgroundImage: `url(${video.thumbnail_url})`, opacity: videoReady ? 0 : 1 }
                : { background: 'linear-gradient(135deg, #1a0000, #0a0812)', opacity: videoReady ? 0 : 1 }
            }
          />
          {video.video_url && (
            <video
              ref={videoRef}
              src={video.video_url}
              muted={muted}
              loop
              playsInline
              preload="metadata"
              className="hero-video"
              style={{ opacity: videoReady ? 1 : 0 }}
              onCanPlay={() => setVideoReady(true)}
              suppressHydrationWarning
            />
          )}
          <div className="hero-overlay" />
          <div className="hero-overlay-bottom" />
          <div className="hero-river" aria-hidden="true" />
        </div>

        <div className="hero-content">
          <div className="hero-badge">{video.category}</div>
          <h1 className="hero-title">{video.title}</h1>
          <p className="hero-desc">{video.description}</p>
          <div className="hero-btns">
            <Link href={href} className="btn-play">▶ Play</Link>
            <Link href={href} className="btn-info">ℹ More Info</Link>
          </div>
        </div>

        {videoReady && (
          <button
            className="mute-btn"
            onClick={() => setMuted(!muted)}
            aria-label={muted ? 'Unmute preview' : 'Mute preview'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        )}
      </div>
    </>
  )
}