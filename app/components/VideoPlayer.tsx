'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface VideoPlayerProps {
  src?: string
  title?: string
  subtitle?: string
  year?: string | number
  duration?: string
  rating?: string | number
  synopsis?: string
  poster?: string
  onBack?: () => void
  onTimeUpdate?: (currentTime: number) => void
  onDelete?: () => void
}

function fmt(s: number) {
  s = Math.floor(s)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function VideoPlayer({
  src,
  title,
  subtitle,
  year,
  duration,
  rating,
  synopsis,
  poster,
  onBack,
  onTimeUpdate,
  onDelete,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [descOpen, setDescOpen] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [flashState, setFlashState] = useState<'play' | 'pause' | null>(null)
  const [scrubbing, setScrubbing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const showControls = useCallback(() => {
    setControlsVisible(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (isPlaying) {
      hideTimer.current = setTimeout(() => setControlsVisible(false), 3000)
    }
  }, [isPlaying])

  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [isPlaying])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTime = () => {
      setCurrentTime(v.currentTime)
      setProgress(v.duration ? v.currentTime / v.duration : 0)
      onTimeUpdate?.(v.currentTime)
    }
    const onMeta = () => setTotalTime(v.duration)
    const onEnded = () => setIsPlaying(false)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('ended', onEnded)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('ended', onEnded)
    }
  }, [])

  // Track fullscreen state to unlock orientation on browser-native exit (e.g. swipe down)
  useEffect(() => {
    const onFsChange = () => {
      const inFs = !!document.fullscreenElement
      setIsFullscreen(inFs)
      if (!inFs) {
        try { (screen.orientation as any).unlock?.() } catch {}
      }
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.code === 'Space') { e.preventDefault(); togglePlay() }
      if (e.code === 'ArrowLeft') skip(-10)
      if (e.code === 'ArrowRight') skip(10)
      if (e.code === 'KeyM') toggleMute()
      if (e.code === 'KeyF') toggleFullscreen()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const flash = (state: 'play' | 'pause') => {
    setFlashState(state)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashState(null), 600)
  }

  const togglePlay = () => {
    const v = videoRef.current
    if (!v && !src) {
      setIsPlaying(p => { flash(p ? 'pause' : 'play'); return !p })
      return
    }
    if (!v) return
    if (isPlaying) { v.pause(); flash('pause') }
    else { v.play(); flash('play') }
    setIsPlaying(p => !p)
  }

  const skip = (sec: number) => {
    const v = videoRef.current
    if (v) v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + sec))
    else setCurrentTime(t => Math.max(0, t + sec))
  }

  const toggleMute = () => {
    const v = videoRef.current
    const next = !isMuted
    if (v) v.muted = next
    setIsMuted(next)
  }

  const changeVolume = (val: number) => {
    const v = videoRef.current
    if (v) v.volume = val
    setVolume(val)
    setIsMuted(val === 0)
  }

  const toggleFullscreen = async () => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.()
      // Lock to landscape on mobile devices
      try {
        await (screen.orientation as any).lock?.('landscape')
      } catch {
        // Orientation lock not supported on all browsers/devices — silently ignore
      }
    } else {
      await document.exitFullscreen?.()
      try {
        ;(screen.orientation as any).unlock?.()
      } catch {}
    }
  }

  // ── Scrubbing helpers (mouse + touch) ─────────────────────────────────────

  const scrub = useCallback(
    (clientX: number) => {
      const bar = progressRef.current
      if (!bar) return
      const rect = bar.getBoundingClientRect()
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const v = videoRef.current
      if (v && v.duration) v.currentTime = frac * v.duration
      setProgress(frac)
      setCurrentTime(frac * (totalTime || 9456))
    },
    [totalTime]
  )

  // Mouse scrub
  useEffect(() => {
    if (!scrubbing) return
    const onMove = (e: MouseEvent) => scrub(e.clientX)
    const onUp = () => setScrubbing(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [scrubbing, scrub])

  // Touch scrub
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      scrub(e.touches[0].clientX)
    },
    [scrub]
  )

  const pct = `${(progress * 100).toFixed(2)}%`
  const displayTotal = totalTime ? fmt(totalTime) : duration

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Nunito:wght@300;600;700&display=swap');

        .hr-player {
          position: relative; width: 100%; aspect-ratio: 16/9;
          background: #0a0812; border-radius: 10px; overflow: hidden;
          cursor: default; user-select: none;
          box-shadow: 0 40px 120px rgba(0,0,0,0.9), 0 0 0 1px rgba(201,168,76,0.12);
          /* Ensure it never overflows its container on mobile */
          max-width: 100%;
        }
        .hr-player:fullscreen { border-radius: 0; aspect-ratio: unset; width: 100dvw; height: 100dvh; }

        .hr-poster {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 65% 45%, #1e1200 0%, transparent 70%),
            radial-gradient(ellipse 40% 60% at 20% 60%, #0d1015 0%, transparent 70%),
            #0a0812;
        }

        /* Overlay */
        .hr-overlay {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          justify-content: flex-end; padding-bottom: 72px;
          pointer-events: none; transition: opacity .4s;
        }
        .hr-overlay::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(10,8,18,0.95) 0%, rgba(10,8,18,0.5) 30%, transparent 65%);
        }
        .hr-overlay.hidden { opacity: 0; }
        .hr-overlay.paused { opacity: 1 !important; }

        /* Meta */
        .hr-meta {
          position: relative; padding: 0 36px 20px;
          transform: translateY(12px); transition: transform .45s cubic-bezier(.4,0,.2,1);
          pointer-events: all;
        }
        .hr-overlay.paused .hr-meta { transform: translateY(0); }

        .hr-subtitle {
          font-family: 'Cinzel', serif; font-size: 10px; letter-spacing: 4px;
          text-transform: uppercase; color: rgba(201,168,76,0.7);
          margin-bottom: 4px; display: block;
        }
        .hr-title {
          font-family: 'Cinzel', serif;
          font-size: clamp(24px, 6vw, 68px);
          line-height: .9; color: #f0e6d3; letter-spacing: .04em;
          display: block; margin-bottom: 12px;
        }
        .hr-title-line { display: block; }
        .hr-meta-row {
          display: flex; align-items: center; gap: 10px;
          font-size: 11px; color: rgba(240,230,211,0.45);
          font-family: 'Nunito', sans-serif; font-weight: 300; margin-bottom: 14px;
          flex-wrap: wrap;
        }
        .hr-dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(201,168,76,0.4); flex-shrink: 0; }
        .hr-rating { display: flex; align-items: center; gap: 5px; }
        .hr-star { color: #c9a84c; font-size: 11px; }

        /* Synopsis toggle */
        .hr-desc-toggle {
          display: flex; align-items: center; gap: 8px;
          background: none; border: none; cursor: pointer;
          color: rgba(240,230,211,0.45); font-family: 'Nunito', sans-serif;
          font-size: 11px; font-weight: 700; letter-spacing: 2px;
          text-transform: uppercase; padding: 0; transition: color .2s;
        }
        .hr-desc-toggle:hover { color: #c9a84c; }
        .hr-desc-toggle svg { transition: transform .3s; }
        .hr-desc-toggle.open svg { transform: rotate(180deg); }
        .hr-desc-body { max-height: 0; overflow: hidden; transition: max-height .4s cubic-bezier(.4,0,.2,1), opacity .3s; opacity: 0; max-width: 480px; }
        .hr-desc-body.open { max-height: 120px; opacity: 1; }
        .hr-desc-body p { padding-top: 10px; font-size: 13px; line-height: 1.7; color: rgba(240,230,211,0.6); font-family: 'Nunito', sans-serif; font-weight: 300; font-style: italic; }

        /* Controls bar */
        .hr-controls {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 8px 20px 14px;
          background: linear-gradient(to top, rgba(10,8,18,0.9) 0%, transparent 100%);
          display: flex; flex-direction: column; gap: 8px;
          transition: opacity .3s;
        }
        .hr-controls.hidden { opacity: 0; pointer-events: none; }

        /* Progress bar */
        .hr-prog-wrap {
          position: relative; height: 22px; display: flex;
          align-items: center; cursor: pointer;
          /* Larger tap area on touch */
          touch-action: none;
        }
        .hr-prog-track {
          position: absolute; left: 0; right: 0; height: 4px;
          border-radius: 99px; background: rgba(201,168,76,0.15);
          overflow: visible; transition: height .2s;
        }
        .hr-prog-wrap:hover .hr-prog-track,
        .hr-prog-wrap:active .hr-prog-track { height: 7px; }
        .hr-prog-fill { height: 100%; background: linear-gradient(90deg, #c0392b, #c9a84c); border-radius: 99px; pointer-events: none; }
        .hr-prog-thumb {
          position: absolute; top: 50%; transform: translate(-50%,-50%);
          width: 14px; height: 14px; border-radius: 50%;
          background: #c9a84c; box-shadow: 0 0 0 3px rgba(201,168,76,0.25);
          pointer-events: none; opacity: 0; transition: opacity .2s;
        }
        .hr-prog-wrap:hover .hr-prog-thumb,
        .hr-prog-wrap:active .hr-prog-thumb { opacity: 1; }

        /* Button row */
        .hr-btn-row { display: flex; align-items: center; gap: 6px; }
        .hr-btn {
          background: none; border: none; cursor: pointer; color: #f0e6d3;
          display: flex; align-items: center; justify-content: center;
          padding: 5px; border-radius: 5px;
          transition: background .15s, transform .1s, color .2s;
          /* Bigger tap area on mobile */
          min-width: 36px; min-height: 36px;
        }
        .hr-btn:hover { background: rgba(201,168,76,0.1); color: #c9a84c; transform: scale(1.08); }
        .hr-btn.hr-btn-danger:hover { background: rgba(192,57,43,0.15); color: #e74c3c; }
        .hr-btn svg { display: block; }

        .hr-time {
          font-size: 11.5px; color: rgba(240,230,211,0.45);
          letter-spacing: .04em; font-variant-numeric: tabular-nums;
          font-family: 'Nunito', sans-serif; font-weight: 300;
          white-space: nowrap;
        }
        .hr-time span { color: #f0e6d3; font-weight: 600; }
        .hr-spacer { flex: 1; min-width: 4px; }

        /* Volume */
        .hr-vol-wrap { display: flex; align-items: center; gap: 7px; }
        .hr-vol-slider {
          -webkit-appearance: none; appearance: none;
          width: 70px; height: 4px; border-radius: 99px;
          background: rgba(201,168,76,0.2); cursor: pointer;
          outline: none; accent-color: #c9a84c;
        }

        /* Back button */
        .hr-back {
          position: absolute; top: 18px; left: 20px;
          width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
          background: rgba(10,8,18,0.6); border: 1px solid rgba(201,168,76,0.2);
          border-radius: 50%; cursor: pointer; pointer-events: all; z-index: 20;
          backdrop-filter: blur(6px); transition: background .2s, border-color .2s;
        }
        .hr-back:hover { background: rgba(201,168,76,0.12); border-color: rgba(201,168,76,0.4); }

        /* Center flash */
        .hr-flash { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; opacity: 0; transition: opacity .2s; }
        .hr-flash.show { opacity: 1; }
        .hr-flash-ring {
          width: 66px; height: 66px; background: rgba(10,8,18,0.7);
          border: 1px solid rgba(201,168,76,0.35); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(8px);
          transform: scale(.85); transition: transform .25s cubic-bezier(.4,0,.2,1);
        }
        .hr-flash.show .hr-flash-ring { transform: scale(1); }

        /* ── Mobile overrides ────────────────────────────────────────────── */
        @media (max-width: 540px) {
          .hr-meta { padding: 0 14px 10px; }
          .hr-subtitle { font-size: 8px; letter-spacing: 2px; margin-bottom: 2px; }
          .hr-title { font-size: clamp(18px, 7vw, 32px); margin-bottom: 6px; }
          .hr-meta-row { font-size: 10px; gap: 7px; margin-bottom: 8px; }
          .hr-desc-toggle { font-size: 10px; letter-spacing: 1.5px; }
          .hr-desc-body p { font-size: 11px; }

          .hr-controls { padding: 4px 10px 10px; gap: 4px; }
          .hr-btn { padding: 3px; min-width: 32px; min-height: 32px; }
          .hr-time { font-size: 10px; }

          /* Hide the volume slider (keep mute button) on narrow screens */
          .hr-vol-slider { display: none; }

          .hr-back { top: 10px; left: 10px; width: 30px; height: 30px; }
          .hr-flash-ring { width: 52px; height: 52px; }

          /* Overlay sits a bit higher so controls don't cover meta */
          .hr-overlay { padding-bottom: 64px; }
        }

        /* Extra-small (≤360px) */
        @media (max-width: 360px) {
          .hr-title { font-size: clamp(16px, 7.5vw, 28px); }
          .hr-meta-row { gap: 5px; }
          /* Hide skip-10 labels by shrinking SVG text */
          .hr-skip-label { display: none; }
        }
      `}</style>

      <div
        ref={containerRef}
        className="hr-player"
        onClick={togglePlay}
        onMouseMove={showControls}
        onTouchStart={showControls}
      >
        {src ? (
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            playsInline          // prevents iOS from forcing its own fullscreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div className="hr-poster" />
        )}

        {/* Back button */}
        <button
          className="hr-back"
          onClick={e => { e.stopPropagation(); onBack?.() }}
          aria-label="Go back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" stroke="#c9a84c" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Center flash */}
        <div className={`hr-flash${flashState ? ' show' : ''}`}>
          <div className="hr-flash-ring">
            {flashState === 'play' ? (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#c9a84c"><polygon points="5,3 19,12 5,21" /></svg>
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#c9a84c">
                <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
              </svg>
            )}
          </div>
        </div>

        {/* Overlay with title + synopsis */}
        <div className={`hr-overlay${!isPlaying ? ' paused' : ' hidden'}`}>
          <div className="hr-meta" onClick={e => e.stopPropagation()}>
            <span className="hr-subtitle">{subtitle}</span>
            <span className="hr-title">
              {(title ?? '').split(' ').map((word, i) => (
                <span key={i} className="hr-title-line">{word} </span>
              ))}
            </span>
            <div className="hr-meta-row">
              <span>{year}</span>
              <span className="hr-dot" />
              <span>{duration}</span>
              <span className="hr-dot" />
              <span className="hr-rating">
                <span className="hr-star">★</span> {rating}
              </span>
            </div>
            {synopsis && (
              <div style={{ maxWidth: 480 }}>
                <button
                  className={`hr-desc-toggle${descOpen ? ' open' : ''}`}
                  onClick={() => setDescOpen(o => !o)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  Synopsis
                </button>
                <div className={`hr-desc-body${descOpen ? ' open' : ''}`}>
                  <p>{synopsis}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div
          className={`hr-controls${(!controlsVisible && isPlaying) ? ' hidden' : ''}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Progress bar — supports mouse & touch */}
          <div
            ref={progressRef}
            className="hr-prog-wrap"
            onMouseDown={e => { setScrubbing(true); scrub(e.clientX) }}
            onTouchStart={e => { e.stopPropagation(); scrub(e.touches[0].clientX) }}
            onTouchMove={handleTouchMove}
          >
            <div className="hr-prog-track">
              <div className="hr-prog-fill" style={{ width: pct }} />
            </div>
            <div className="hr-prog-thumb" style={{ left: pct }} />
          </div>

          <div className="hr-btn-row">

            {/* Rewind 10s */}
            <button className="hr-btn" onClick={() => skip(-10)} title="Rewind 10s">
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <text x="8.5" y="15.5" fontSize="5.5" fill="currentColor" stroke="none" fontFamily="Nunito,sans-serif" className="hr-skip-label">10</text>
              </svg>
            </button>

            {/* Play / Pause */}
            <button className="hr-btn" onClick={togglePlay} title="Play/Pause">
              {isPlaying ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>

            {/* Forward 10s */}
            <button className="hr-btn" onClick={() => skip(10)} title="Forward 10s">
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <text x="8.5" y="15.5" fontSize="5.5" fill="currentColor" stroke="none" fontFamily="Nunito,sans-serif" className="hr-skip-label">10</text>
              </svg>
            </button>

            {/* Time */}
            <div className="hr-time">
              <span>{fmt(currentTime)}</span> / {displayTotal}
            </div>

            <div className="hr-spacer" />

            {/* Volume */}
            <div className="hr-vol-wrap" onClick={e => e.stopPropagation()}>
              <button className="hr-btn" onClick={toggleMute} title="Mute">
                <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  {isMuted || volume === 0 ? (
                    <><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></>
                  ) : volume < 0.5 ? (
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  ) : (
                    <><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></>
                  )}
                </svg>
              </button>
              <input
                type="range"
                className="hr-vol-slider"
                min={0} max={1} step={0.02}
                value={isMuted ? 0 : volume}
                onChange={e => changeVolume(parseFloat(e.target.value))}
              />
            </div>

            {/* Delete — only rendered when onDelete is provided */}
            {onDelete && (
              <button
                className="hr-btn hr-btn-danger"
                onClick={e => { e.stopPropagation(); onDelete() }}
                title="Delete video"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            )}

            {/* Fullscreen */}
            <button className="hr-btn" onClick={toggleFullscreen} title="Fullscreen">
              {isFullscreen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>

          </div>
        </div>
      </div>
    </>
  )
}