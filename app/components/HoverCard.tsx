'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { getStorageUrl } from '../lib/storage'

interface Video {
  id: string
  title: string
  category: string
  thumbnail_url?: string
  video_url?: string
  description?: string
  created_at?: string
}

interface HoverCardProps {
  video: Video
  /** Where the popup's ▶ and ⓘ buttons link. Defaults to /watch/:id */
  href?: string
  /** Set false for series — the watchlist table stores video ids only */
  showWatchlist?: boolean
  children: React.ReactNode
}

const OPEN_DELAY  = 900
const CLOSE_DELAY = 150

export default function HoverCard({ video, href, showWatchlist = true, children }: HoverCardProps) {
  const linkTo = href ?? `/watch/${video.id}`

  // ── hover state ──────────────────────────────────────────
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [previewReady, setPreviewReady] = useState(false)
  const openTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cardRef    = useRef<HTMLDivElement>(null)

  const clearOpen  = () => { if (openTimer.current)  clearTimeout(openTimer.current) }
  const clearClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current) }

  const onCardEnter = useCallback(() => {
    clearClose()
    openTimer.current = setTimeout(() => {
      if (cardRef.current) {
        setPreviewReady(false)
        setRect(cardRef.current.getBoundingClientRect())
      }
    }, OPEN_DELAY)
  }, [])

  const onCardLeave = useCallback(() => {
    clearOpen()
    closeTimer.current = setTimeout(() => setRect(null), CLOSE_DELAY)
  }, [])

  const onExpandEnter = useCallback(() => clearClose(), [])
  const onExpandLeave = useCallback(() => setRect(null), [])

  // ── callback ref: plays as soon as the <video> node is in the DOM ──
  const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    if (!node) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    node.currentTime = 0
    node.play().catch(() => {})
  }, [])

  // Dismiss on scroll or Escape
  useEffect(() => {
    if (!rect) return
    const dismiss = () => setRect(null)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setRect(null) }
    window.addEventListener('scroll', dismiss, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', dismiss)
      window.removeEventListener('keydown', onKey)
    }
  }, [rect])

  useEffect(() => () => { clearOpen(); clearClose() }, [])

  // ── watchlist state — loaded LAZILY, only when the popup opens ──
  const [user, setUser]               = useState<any>(null)
  const [inWatchlist, setInWatchlist] = useState(false)
  const [wlLoading, setWlLoading]     = useState(false)
  const wlFetched = useRef(false)

  useEffect(() => {
    if (!rect || wlFetched.current || !showWatchlist) return
    wlFetched.current = true
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUser(session.user)
      const { data } = await supabase
        .from('watchlist').select('id')
        .eq('user_id', session.user.id).eq('video_id', video.id).maybeSingle()
      setInWatchlist(!!data)
    }
    init()
  }, [rect, video.id, showWatchlist])

  const toggleWatchlist = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!user || wlLoading) return
    setWlLoading(true)
    if (inWatchlist) {
      await supabase.from('watchlist').delete().eq('user_id', user.id).eq('video_id', video.id)
      setInWatchlist(false)
    } else {
      await supabase.from('watchlist').insert({ user_id: user.id, video_id: video.id })
      setInWatchlist(true)
    }
    setWlLoading(false)
  }, [user, wlLoading, inWatchlist, video.id])

  // ── derived ──────────────────────────────────────────────
  const thumbnailUrl = video.thumbnail_url ? getStorageUrl(video.thumbnail_url) : null
  const videoUrl     = video.video_url     ? getStorageUrl(video.video_url)     : null
  const matchPct     = Math.floor(72 + Math.abs(video.id.charCodeAt(0) % 27))
  const year         = video.created_at ? new Date(video.created_at).getFullYear() : null

  // ── popup position ───────────────────────────────────────
  const getPopupStyle = (r: DOMRect): React.CSSProperties => {
    const popupW = Math.max(r.width * 1.15, 240)
    const vw = window.innerWidth
    let left = r.left + r.width / 2 - popupW / 2
    if (left < 12) left = 12
    if (left + popupW > vw - 12) left = vw - popupW - 12
    return { position: 'fixed', top: r.top, left, width: popupW, zIndex: 99999 }
  }

  // ── expanded card (portal) ───────────────────────────────
  const expandedCard = rect && (
    <div onMouseEnter={onExpandEnter} onMouseLeave={onExpandLeave} style={getPopupStyle(rect)}>
      <style>{`
        @keyframes hceExpand {
          from { opacity: 0.6; transform: scale(0.94) translateY(4px); }
          to   { opacity: 1;   transform: scale(1)    translateY(0); }
        }
        @keyframes hceWlPop {
          0%   { transform: scale(1); }
          45%  { transform: scale(1.35); }
          100% { transform: scale(1); }
        }
        .hce-card {
          border-radius: 10px; overflow: hidden; background: #16121f;
          border: 1px solid rgba(201,168,76,0.22);
          box-shadow:
            0 24px 64px rgba(0,0,0,0.92),
            0 0 0 1px rgba(201,168,76,0.08),
            0 0 32px rgba(201,168,76,0.06);
          animation: hceExpand 0.22s cubic-bezier(0.34,1.4,0.64,1) forwards;
          font-family: 'Nunito', sans-serif; cursor: default;
        }
        .hce-thumb {
          width: 100%; aspect-ratio: 16/9; position: relative;
          overflow: hidden; background: #1e1828;
        }
        .hce-thumb video {
          width: 100%; height: 100%; object-fit: cover; display: block;
          position: relative; z-index: 1;
        }
        .hce-thumb img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          position: absolute; inset: 0; z-index: 2;
          transition: opacity 0.5s ease;
        }
        .hce-thumb img.fade-out { opacity: 0; }
        .hce-thumb-emoji {
          width: 100%; height: 100%; display: flex; align-items: center;
          justify-content: center; font-size: 40px;
          background: linear-gradient(135deg,#16121f,#1e1828);
        }
        .hce-overlay {
          position: absolute; inset: 0; z-index: 3;
          background: linear-gradient(to top, #16121f 0%, rgba(22,18,31,0.15) 55%, transparent 100%);
          pointer-events: none;
        }
        .hce-body { background: #16121f; }
        .hce-title-row { padding: 12px 14px 4px; }
        .hce-title {
          font-family: 'Cinzel', serif; font-size: 13px; font-weight: 700;
          color: #f0e6d3; margin: 0; letter-spacing: 0.3px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .hce-actions { display: flex; align-items: center; gap: 7px; padding: 8px 14px 10px; }
        .hce-play {
          width: 32px; height: 32px; border-radius: 50%; background: #f0e6d3;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; color: #0a0812; border: none; cursor: pointer;
          flex-shrink: 0; transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
          text-decoration: none; padding-left: 2px;
        }
        .hce-play:hover {
          background: #f0c96a; transform: scale(1.12);
          box-shadow: 0 0 14px rgba(201,168,76,0.4);
        }
        .hce-play:active { transform: scale(0.95); }
        .hce-icon {
          width: 28px; height: 28px; border-radius: 50%; background: transparent;
          border: 1.5px solid rgba(240,230,211,0.28); display: flex; align-items: center;
          justify-content: center; font-size: 12px; cursor: pointer;
          color: rgba(240,230,211,0.6); transition: border-color 0.2s, color 0.2s, background 0.2s, transform 0.2s;
          flex-shrink: 0; text-decoration: none;
        }
        .hce-icon:hover { border-color: #c9a84c; color: #c9a84c; transform: scale(1.08); }
        .hce-icon:active { transform: scale(0.92); }
        .hce-icon.wl-active {
          border-color: #c9a84c; color: #c9a84c; background: rgba(201,168,76,0.1);
          animation: hceWlPop 0.35s cubic-bezier(0.34,1.56,0.64,1);
        }
        .hce-icon:disabled { opacity: 0.5; cursor: not-allowed; }
        .hce-divider { height: 1px; background: linear-gradient(to right, rgba(201,168,76,0.12), transparent); margin: 0 14px; }
        .hce-meta { display: flex; align-items: center; gap: 6px; padding: 8px 14px 4px; flex-wrap: wrap; }
        .hce-match { font-size: 11px; font-weight: 700; color: #4ade80; }
        .hce-hd { font-size: 8px; font-weight: 700; letter-spacing: 1px; padding: 2px 5px; border-radius: 2px; border: 1px solid rgba(240,230,211,0.2); color: rgba(240,230,211,0.45); }
        .hce-year { font-size: 10px; color: rgba(240,230,211,0.35); }
        .hce-cat { font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #c9a84c; font-family: 'Cinzel', serif; }
        .hce-desc { font-size: 10.5px; line-height: 1.55; color: rgba(240,230,211,0.4); padding: 4px 14px 14px; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        @media (prefers-reduced-motion: reduce) {
          .hce-card { animation: none; }
          .hce-thumb img { transition: none; }
          .hce-play, .hce-icon { transition: none; }
          .hce-icon.wl-active { animation: none; }
        }
      `}</style>

      <div className="hce-card">
        <div className="hce-thumb">
          {videoUrl ? (
            <>
              <video
                ref={videoCallbackRef}
                src={videoUrl}
                muted
                playsInline
                loop
                preload="metadata"
                onPlaying={() => setPreviewReady(true)}
              />
              {thumbnailUrl && (
                <img
                  src={thumbnailUrl}
                  alt={video.title}
                  className={previewReady ? 'fade-out' : ''}
                />
              )}
            </>
          ) : thumbnailUrl ? (
            <img src={thumbnailUrl} alt={video.title} />
          ) : (
            <div className="hce-thumb-emoji">🎬</div>
          )}
          <div className="hce-overlay" />
        </div>

        <div className="hce-body">
          <div className="hce-title-row">
            <p className="hce-title">{video.title}</p>
          </div>

          <div className="hce-actions">
            <Link href={linkTo} className="hce-play">▶</Link>

            {showWatchlist && user && (
              <button
                className={`hce-icon${inWatchlist ? ' wl-active' : ''}`}
                onClick={toggleWatchlist}
                disabled={wlLoading}
                title={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                {wlLoading ? '…' : inWatchlist ? '✓' : '＋'}
              </button>
            )}

            <div style={{ flex: 1 }} />
            <Link href={linkTo} className="hce-icon" title="More info">ⓘ</Link>
          </div>

          <div className="hce-divider" />

          <div className="hce-meta">
            <span className="hce-match">{matchPct}% Match</span>
            <span className="hce-hd">HD</span>
            {year && <span className="hce-year">{year}</span>}
            <div style={{ flex: 1 }} />
            <span className="hce-cat">{video.category}</span>
          </div>

          {video.description && <p className="hce-desc">{video.description}</p>}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div
        ref={cardRef}
        style={{ position: 'relative', flexShrink: 0, transition: 'opacity 0.15s', opacity: rect ? 0.5 : 1 }}
        onMouseEnter={onCardEnter}
        onMouseLeave={onCardLeave}
      >
        {children}
      </div>

      {typeof document !== 'undefined' && rect
        ? createPortal(expandedCard, document.body)
        : null
      }
    </>
  )
}