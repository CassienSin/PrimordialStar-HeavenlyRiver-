'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SubtitleCue {
  id: string
  start: number   // seconds
  end: number     // seconds
  text: string
}

interface VideoPlayerProps {
  src?: string
  title?: string
  subtitle?: string
  year?: string | number
  duration?: string
  rating?: string | number
  synopsis?: string
  poster?: string
  initialSubtitles?: SubtitleCue[]
  onBack?: () => void
  onTimeUpdate?: (currentTime: number) => void
  onDelete?: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(s: number) {
  s = Math.floor(s)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

/** "1:23:45" | "1:23" | "83" → seconds */
function parseTime(raw: string): number | null {
  const s = raw.trim()
  if (!s) return null
  const parts = s.split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0]
}

/**
 * Parse VTT / SRT text into cues.
 * Handles both:
 *   00:00:01.000 --> 00:00:03.000   (VTT / SRT)
 *   0:01 --> 0:03                   (shorthand)
 */
function parseSubtitleFile(text: string): SubtitleCue[] {
  const cues: SubtitleCue[] = []
  // Normalise CRLF and strip BOM
  const lines = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').split('\n')

  const timeRe = /(\d[\d:.]*)\s*-->\s*(\d[\d:.]*)/

  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    const match = line.match(timeRe)
    if (match) {
      const start = parseTimecode(match[1])
      const end   = parseTimecode(match[2])
      const textLines: string[] = []
      i++
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(timeRe) && !/^\d+$/.test(lines[i].trim())) {
        textLines.push(lines[i].trim())
        i++
      }
      if (start !== null && end !== null && textLines.length) {
        cues.push({ id: crypto.randomUUID(), start, end, text: textLines.join('\n') })
      }
      continue
    }
    i++
  }
  return cues
}

/** Handles HH:MM:SS.mmm / HH:MM:SS,mmm / MM:SS / raw seconds */
function parseTimecode(raw: string): number | null {
  const s = raw.replace(',', '.').trim()
  const parts = s.split(':')
  if (parts.length === 3) {
    const [h, m, sec] = parts.map(parseFloat)
    return h * 3600 + m * 60 + sec
  }
  if (parts.length === 2) {
    const [m, sec] = parts.map(parseFloat)
    return m * 60 + sec
  }
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function uid() { return crypto.randomUUID() }

// ── Component ──────────────────────────────────────────────────────────────────

export default function VideoPlayer({
  src,
  title,
  subtitle,
  year,
  duration,
  rating,
  synopsis,
  poster,
  initialSubtitles = [],
  onBack,
  onTimeUpdate,
  onDelete,
}: VideoPlayerProps) {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const containerRef  = useRef<HTMLDivElement>(null)
  const progressRef   = useRef<HTMLDivElement>(null)
  const hideTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isPlaying,       setIsPlaying]       = useState(false)
  const [progress,        setProgress]        = useState(0)
  const [buffered,        setBuffered]        = useState(0)
  const [isWaiting,       setIsWaiting]       = useState(false)
  const [currentTime,     setCurrentTime]     = useState(0)
  const [totalTime,       setTotalTime]       = useState(0)
  const [volume,          setVolume]          = useState(1)
  const [isMuted,         setIsMuted]         = useState(false)
  const [descOpen,        setDescOpen]        = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [flashState,      setFlashState]      = useState<'play' | 'pause' | null>(null)
  const [scrubbing,       setScrubbing]       = useState(false)
  const [isFullscreen,    setIsFullscreen]    = useState(false)

  // ── Subtitle state ──────────────────────────────────────────────────────────
  const [cues,            setCues]            = useState<SubtitleCue[]>(initialSubtitles)
  const [subsEnabled,     setSubsEnabled]     = useState(true)
  const [activeCue,       setActiveCue]       = useState<SubtitleCue | null>(null)
  const [adminOpen,       setAdminOpen]       = useState(false)

  // Admin form state
  const [editingCue, setEditingCue] = useState<SubtitleCue | null>(null)
  const [formStart,  setFormStart]  = useState('')
  const [formEnd,    setFormEnd]    = useState('')
  const [formText,   setFormText]   = useState('')
  const [formError,  setFormError]  = useState('')

  // ── Subtitle engine ────────────────────────────────────────────────────────
  // Drive subtitle lookup via rAF — reads video.currentTime directly at 60fps,
  // bypassing React state lag and the coarse timeupdate event (~4Hz).
  // All refs so the rAF loop never goes stale without re-registering.
  const cuesRef        = useRef<SubtitleCue[]>(cues)
  const subsEnabledRef = useRef(subsEnabled)
  const rafRef         = useRef<number | null>(null)
  const lastCueIdRef   = useRef<string | null>(null)

  useEffect(() => { cuesRef.current = cues }, [cues])
  useEffect(() => { subsEnabledRef.current = subsEnabled }, [subsEnabled])

  const findCue = useCallback((t: number): SubtitleCue | null => {
    if (!subsEnabledRef.current) return null
    const arr = cuesRef.current
    // Linear scan is fine for typical subtitle counts (<2000 cues)
    for (let i = 0; i < arr.length; i++) {
      if (t >= arr[i].start && t < arr[i].end) return arr[i]
    }
    return null
  }, [])

  // rAF loop — only calls setActiveCue when the cue actually changes
  const rafLoop = useCallback(() => {
    const v = videoRef.current
    const t = v ? v.currentTime : 0
    const found = findCue(t)
    const foundId = found?.id ?? null
    if (foundId !== lastCueIdRef.current) {
      lastCueIdRef.current = foundId
      setActiveCue(found)
    }
    rafRef.current = requestAnimationFrame(rafLoop)
  }, [findCue])

  // Start/stop the rAF loop
  useEffect(() => {
    rafRef.current = requestAnimationFrame(rafLoop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [rafLoop])

  // When cues or subsEnabled change while paused, force an immediate re-check
  useEffect(() => {
    const v = videoRef.current
    const t = v ? v.currentTime : 0
    const found = findCue(t)
    const foundId = found?.id ?? null
    lastCueIdRef.current = foundId
    setActiveCue(found)
  }, [cues, subsEnabled, findCue])

  // ── Controls auto-hide ──────────────────────────────────────────────────────
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

  // Clean up pending timers on unmount to prevent setState on an
  // unmounted component and avoid memory leaks.
  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
  }, [])

  // ── Video event listeners ───────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTime = () => {
      setCurrentTime(v.currentTime)
      setProgress(v.duration ? v.currentTime / v.duration : 0)
      onTimeUpdate?.(v.currentTime)
    }
    const onMeta    = () => setTotalTime(v.duration)
    const onEnded   = () => setIsPlaying(false)
    // isPlaying now mirrors the element's real state — no more desync when
    // autoplay is blocked or the browser pauses playback on its own
    // (tab switch, PiP, bluetooth headphones disconnecting, etc.)
    const onPlay    = () => setIsPlaying(true)
    const onPause   = () => setIsPlaying(false)
    // Buffering UI
    const onWaiting = () => setIsWaiting(true)
    const onPlaying = () => setIsWaiting(false)
    const onSeeked  = () => setIsWaiting(false)
    const onProgress = () => {
      if (v.buffered.length && v.duration) {
        setBuffered(v.buffered.end(v.buffered.length - 1) / v.duration)
      }
    }
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('ended', onEnded)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('waiting', onWaiting)
    v.addEventListener('playing', onPlaying)
    v.addEventListener('seeked', onSeeked)
    v.addEventListener('progress', onProgress)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('ended', onEnded)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('waiting', onWaiting)
      v.removeEventListener('playing', onPlaying)
      v.removeEventListener('seeked', onSeeked)
      v.removeEventListener('progress', onProgress)
    }
  }, [onTimeUpdate])

  // ── Fullscreen change listener ──────────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => {
      const inFs = !!document.fullscreenElement
      setIsFullscreen(inFs)
      if (!inFs) { try { (screen.orientation as any).unlock?.() } catch {} }
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // ── Playback ────────────────────────────────────────────────────────────────
  const flash = useCallback((state: 'play' | 'pause') => {
    setFlashState(state)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashState(null), 600)
  }, [])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v && !src) {
      // Demo mode with no video element
      setIsPlaying(p => { flash(p ? 'pause' : 'play'); return !p })
      return
    }
    if (!v) return
    // Ask the element, not React state — the play/pause listeners
    // will update isPlaying once the browser actually complies.
    if (v.paused || v.ended) {
      v.play().catch(() => {})
      flash('play')
    } else {
      v.pause()
      flash('pause')
    }
  }, [src, flash])

  const skip = useCallback((sec: number) => {
    const v = videoRef.current
    if (v) v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + sec))
    else   setCurrentTime(t => Math.max(0, t + sec))
  }, [])

  const toggleMute = useCallback(() => {
    const v = videoRef.current
    setIsMuted(prev => {
      const next = !prev
      if (v) v.muted = next
      return next
    })
  }, [])

  const changeVolume = useCallback((val: number) => {
    const v = videoRef.current
    if (v) v.volume = val
    setVolume(val)
    setIsMuted(val === 0)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.()
      try { await (screen.orientation as any).lock?.('landscape') } catch {}
    } else {
      await document.exitFullscreen?.()
      try { (screen.orientation as any).unlock?.() } catch {}
    }
  }, [])

  // Stable refs for keyboard-shortcut callbacks so the effect can
  // safely use [] as its dependency array — preventing the listener from being
  // torn down and re-added on every render.
  const togglePlayRef    = useRef(togglePlay)
  const skipRef          = useRef(skip)
  const toggleMuteRef    = useRef(toggleMute)
  const toggleFsRef      = useRef(toggleFullscreen)
  const setSubsEnabledRef = useRef(setSubsEnabled)

  useEffect(() => { togglePlayRef.current    = togglePlay },    [togglePlay])
  useEffect(() => { skipRef.current          = skip },          [skip])
  useEffect(() => { toggleMuteRef.current    = toggleMute },    [toggleMute])
  useEffect(() => { toggleFsRef.current      = toggleFullscreen }, [toggleFullscreen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'Space')      { e.preventDefault(); togglePlayRef.current() }
      if (e.code === 'ArrowLeft')  skipRef.current(-10)
      if (e.code === 'ArrowRight') skipRef.current(10)
      if (e.code === 'KeyM')       toggleMuteRef.current()
      if (e.code === 'KeyF')       toggleFsRef.current()
      if (e.code === 'KeyC')       setSubsEnabledRef.current(s => !s)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, []) // ← stable: listener is registered once and uses up-to-date refs

  // ── Scrubbing ───────────────────────────────────────────────────────────────
  const scrub = useCallback((clientX: number) => {
    const bar = progressRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const v = videoRef.current
    if (v && v.duration) v.currentTime = frac * v.duration
    setProgress(frac)
    setCurrentTime(frac * (totalTime || 0))
  }, [totalTime])

  useEffect(() => {
    if (!scrubbing) return
    const onMove = (e: MouseEvent) => scrub(e.clientX)
    const onUp   = () => setScrubbing(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [scrubbing, scrub])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    scrub(e.touches[0].clientX)
  }, [scrub])

  // ── Subtitle admin helpers ──────────────────────────────────────────────────
  const sortedCues = [...cues].sort((a, b) => a.start - b.start)

  const openNewCueForm = () => {
    setEditingCue(null)
    setFormStart(fmt(currentTime))
    setFormEnd(fmt(Math.min(currentTime + 2, totalTime || currentTime + 2)))
    setFormText('')
    setFormError('')
  }

  const openEditCueForm = (cue: SubtitleCue) => {
    setEditingCue(cue)
    setFormStart(fmt(cue.start))
    setFormEnd(fmt(cue.end))
    setFormText(cue.text)
    setFormError('')
  }

  const saveCue = () => {
    const s = parseTime(formStart)
    const e = parseTime(formEnd)
    if (s === null || e === null) { setFormError('Invalid time format. Use m:ss or h:mm:ss'); return }
    if (e <= s)                   { setFormError('End time must be after start time'); return }
    if (!formText.trim())         { setFormError('Subtitle text cannot be empty'); return }
    setFormError('')

    if (editingCue) {
      setCues(prev => prev.map(c => c.id === editingCue.id ? { ...c, start: s, end: e, text: formText.trim() } : c))
    } else {
      setCues(prev => [...prev, { id: uid(), start: s, end: e, text: formText.trim() }])
    }
    setEditingCue(null)
    setFormStart(''); setFormEnd(''); setFormText('')
  }

  const deleteCue = (id: string) => setCues(prev => prev.filter(c => c.id !== id))

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const parsed = parseSubtitleFile(text)
      if (parsed.length === 0) { alert('No subtitle cues found in this file.'); return }
      setCues(prev => [...prev, ...parsed])
    }
    reader.onerror = () => alert('Failed to read subtitle file. Please try again.')
    reader.readAsText(file)
    e.target.value = ''
  }

  const exportVTT = () => {
    const lines = ['WEBVTT', '']
    sortedCues.forEach((c, i) => {
      const toVTT = (s: number) => {
        const h = Math.floor(s / 3600)
        const m = Math.floor((s % 3600) / 60)
        const sec = (s % 60).toFixed(3).padStart(6, '0')
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${sec}`
      }
      lines.push(String(i + 1))
      lines.push(`${toVTT(c.start)} --> ${toVTT(c.end)}`)
      lines.push(c.text)
      lines.push('')
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/vtt' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `${title ?? 'subtitles'}.vtt`; a.click()
  }

  const pct          = `${(progress * 100).toFixed(2)}%`
  const bufferedPct  = `${(buffered * 100).toFixed(2)}%`
  const displayTotal = totalTime ? fmt(totalTime) : duration

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        /* ── Player shell ────────────────────────────────────────────────── */
        .hr-player {
          position: relative; width: 100%; aspect-ratio: 16/9;
          background: #0a0812; border-radius: 10px; overflow: hidden;
          cursor: default; user-select: none;
          box-shadow: 0 40px 120px rgba(0,0,0,0.9), 0 0 0 1px rgba(201,168,76,0.12);
          max-width: 100%;
        }
        .hr-player.hr-fullscreen,
        .hr-player:fullscreen,
        .hr-player:-webkit-full-screen {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          aspect-ratio: unset !important;
          border-radius: 0 !important;
          z-index: 9999 !important;
        }
        .hr-player.hr-fullscreen video,
        .hr-player:fullscreen video,
        .hr-player:-webkit-full-screen video { object-fit: contain; width: 100%; height: 100%; }

        .hr-poster {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 65% 45%, #1e1200 0%, transparent 70%),
            radial-gradient(ellipse 40% 60% at 20% 60%, #0d1015 0%, transparent 70%),
            #0a0812;
        }

        /* ── Buffering spinner ───────────────────────────────────────────── */
        @keyframes hr-spin { to { transform: rotate(360deg); } }
        .hr-buffer-spin {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none; z-index: 15;
          animation: hr-sub-in 0.2s ease;
        }
        .hr-buffer-ring {
          width: 52px; height: 52px; border-radius: 50%;
          border: 3px solid rgba(201,168,76,0.15);
          border-top-color: #c9a84c;
          animation: hr-spin 0.9s linear infinite;
          filter: drop-shadow(0 0 10px rgba(201,168,76,0.3));
        }

        /* ── Subtitle display ────────────────────────────────────────────── */
        .hr-subs {
          position: absolute; left: 50%; transform: translateX(-50%);
          bottom: 72px; /* sit above controls */
          max-width: 88%; text-align: center; pointer-events: none;
          transition: bottom .2s;
          z-index: 10;
        }
        .hr-subs.controls-hidden { bottom: 16px; }
        .hr-subs-text {
          display: inline-block;
          background: rgba(8,6,14,0.82);
          border: 1px solid rgba(201,168,76,0.18);
          backdrop-filter: blur(4px);
          padding: 6px 16px 7px;
          border-radius: 6px;
          font-family: 'Nunito', sans-serif;
          font-size: clamp(13px, 2.2vw, 18px);
          font-weight: 600;
          line-height: 1.55;
          color: #f5ecdc;
          white-space: pre-wrap;
          text-shadow: 0 1px 6px rgba(0,0,0,0.9);
          letter-spacing: .01em;
        }

        .hr-subs-fade {
          animation: hr-sub-in 0.15s ease forwards;
        }
        @keyframes hr-sub-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
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

        /* ── Controls bar ────────────────────────────────────────────────── */
        .hr-controls {
          position: absolute; bottom: 0; left: 0; right: 0;
          padding: 8px 20px 14px;
          background: linear-gradient(to top, rgba(10,8,18,0.9) 0%, transparent 100%);
          display: flex; flex-direction: column; gap: 8px;
          transition: opacity .3s, transform .3s cubic-bezier(.22,1,.36,1);
        }
        .hr-controls.hidden { opacity: 0; pointer-events: none; transform: translateY(8px); }

        .hr-prog-wrap {
          position: relative; height: 22px; display: flex;
          align-items: center; cursor: pointer; touch-action: none;
        }
        .hr-prog-track {
          position: absolute; left: 0; right: 0; height: 4px;
          border-radius: 99px; background: rgba(201,168,76,0.15);
          transition: height .2s;
          overflow: visible;
        }
        .hr-prog-wrap:hover .hr-prog-track,
        .hr-prog-wrap:active .hr-prog-track { height: 7px; }
        .hr-prog-buffer {
          position: absolute; left: 0; top: 0; bottom: 0;
          background: rgba(201,168,76,0.18);
          border-radius: 99px; pointer-events: none;
          transition: width .4s ease;
        }
        .hr-prog-fill {
          position: relative;
          height: 100%; background: linear-gradient(90deg, #c0392b, #c9a84c);
          border-radius: 99px; pointer-events: none;
          box-shadow: 0 0 8px rgba(201,168,76,0.35);
        }
        .hr-prog-thumb {
          position: absolute; top: 50%; transform: translate(-50%,-50%);
          width: 14px; height: 14px; border-radius: 50%;
          background: #c9a84c; box-shadow: 0 0 0 3px rgba(201,168,76,0.25), 0 0 10px rgba(201,168,76,0.4);
          pointer-events: none; opacity: 0; transition: opacity .2s;
        }
        .hr-prog-wrap:hover .hr-prog-thumb,
        .hr-prog-wrap:active .hr-prog-thumb { opacity: 1; }

        /* Subtitle cue tick marks on the progress bar */
        .hr-prog-tick {
          position: absolute; top: 50%; transform: translate(-50%, -50%);
          width: 3px; height: 10px;
          background: rgba(201,168,76,0.55);
          border-radius: 2px;
          pointer-events: none;
        }

        .hr-btn-row { display: flex; align-items: center; gap: 6px; }
        .hr-btn {
          background: none; border: none; cursor: pointer; color: #f0e6d3;
          display: flex; align-items: center; justify-content: center;
          padding: 5px; border-radius: 5px;
          transition: background .15s, transform .1s, color .2s;
          min-width: 36px; min-height: 36px;
        }
        .hr-btn:hover { background: rgba(201,168,76,0.1); color: #c9a84c; transform: scale(1.08); }
        .hr-btn:active { transform: scale(0.94); }
        .hr-btn.hr-btn-danger:hover { background: rgba(192,57,43,0.15); color: #e74c3c; }
        .hr-btn.active { color: #c9a84c; }
        .hr-btn svg { display: block; }

        .hr-time {
          font-size: 11.5px; color: rgba(240,230,211,0.45);
          letter-spacing: .04em; font-variant-numeric: tabular-nums;
          font-family: 'Nunito', sans-serif; font-weight: 300; white-space: nowrap;
        }
        .hr-time span { color: #f0e6d3; font-weight: 600; }
        .hr-spacer { flex: 1; min-width: 4px; }

        .hr-vol-wrap { display: flex; align-items: center; gap: 7px; }
        .hr-vol-slider {
          -webkit-appearance: none; appearance: none;
          width: 70px; height: 4px; border-radius: 99px;
          background: rgba(201,168,76,0.2); cursor: pointer;
          outline: none; accent-color: #c9a84c;
          transition: width .25s cubic-bezier(.22,1,.36,1);
        }

        /* ── Back button ─────────────────────────────────────────────────── */
        .hr-back {
          position: absolute; top: 18px; left: 20px;
          width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
          background: rgba(10,8,18,0.6); border: 1px solid rgba(201,168,76,0.2);
          border-radius: 50%; cursor: pointer; pointer-events: all; z-index: 20;
          backdrop-filter: blur(6px); transition: background .2s, border-color .2s, transform .25s cubic-bezier(.22,1,.36,1);
        }
        .hr-back:hover { background: rgba(201,168,76,0.12); border-color: rgba(201,168,76,0.4); transform: translateX(-2px); }

        /* ── Center flash ────────────────────────────────────────────────── */
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

        /* ── Admin panel ─────────────────────────────────────────────────── */
        .hr-admin-panel {
          position: absolute; inset: 0;
          background: rgba(8,6,14,0.96);
          backdrop-filter: blur(12px);
          z-index: 50;
          display: flex; flex-direction: column;
          font-family: 'Nunito', sans-serif;
          animation: hr-fadein .2s ease;
          overflow: hidden;
        }
        @keyframes hr-fadein { from { opacity:0; transform: scale(.98) } to { opacity:1; transform:scale(1) } }

        .hr-admin-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px 10px;
          border-bottom: 1px solid rgba(201,168,76,0.12);
          flex-shrink: 0;
        }
        .hr-admin-header h2 {
          font-family: 'Cinzel', serif; font-size: 13px; letter-spacing: 3px;
          text-transform: uppercase; color: #c9a84c; margin: 0;
        }
        .hr-admin-actions { display: flex; gap: 8px; align-items: center; }

        .hr-admin-body {
          display: flex; flex: 1; overflow: hidden; gap: 0;
        }

        /* Cue list */
        .hr-cue-list {
          flex: 1; overflow-y: auto; padding: 10px 0;
          border-right: 1px solid rgba(201,168,76,0.08);
        }
        .hr-cue-list::-webkit-scrollbar { width: 4px; }
        .hr-cue-list::-webkit-scrollbar-track { background: transparent; }
        .hr-cue-list::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 99px; }

        .hr-cue-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 8px 16px; cursor: pointer;
          border-left: 3px solid transparent;
          transition: background .15s, border-color .15s;
        }
        .hr-cue-item:hover { background: rgba(201,168,76,0.06); }
        .hr-cue-item.active-cue { border-left-color: #c9a84c; background: rgba(201,168,76,0.08); }
        .hr-cue-item.editing  { border-left-color: #c0392b; }

        .hr-cue-times {
          font-size: 10px; color: rgba(201,168,76,0.6);
          white-space: nowrap; flex-shrink: 0;
          padding-top: 2px; font-variant-numeric: tabular-nums; letter-spacing: .03em;
        }
        .hr-cue-text {
          font-size: 12px; color: rgba(240,230,211,0.75); line-height: 1.45;
          flex: 1; overflow: hidden; text-overflow: ellipsis;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }
        .hr-cue-del {
          background: none; border: none; cursor: pointer; padding: 2px 4px;
          color: rgba(240,230,211,0.25); transition: color .15s; flex-shrink: 0;
        }
        .hr-cue-del:hover { color: #e74c3c; }
        .hr-cue-edit {
          background: none; border: none; cursor: pointer; padding: 2px 4px;
          color: rgba(240,230,211,0.25); transition: color .15s; flex-shrink: 0;
        }
        .hr-cue-edit:hover { color: #c9a84c; }

        .hr-no-cues {
          padding: 24px 16px; text-align: center;
          font-size: 12px; color: rgba(240,230,211,0.25); font-style: italic;
        }

        /* Add / Edit form */
        .hr-cue-form {
          width: 220px; flex-shrink: 0;
          padding: 14px 16px;
          border-left: 1px solid rgba(201,168,76,0.08);
          display: flex; flex-direction: column; gap: 10px;
          overflow-y: auto;
        }
        .hr-cue-form h3 {
          font-family: 'Cinzel', serif; font-size: 10px; letter-spacing: 2.5px;
          text-transform: uppercase; color: rgba(201,168,76,0.6); margin: 0 0 2px;
        }
        .hr-field { display: flex; flex-direction: column; gap: 4px; }
        .hr-field label { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(201,168,76,0.5); }
        .hr-field input,
        .hr-field textarea {
          background: rgba(201,168,76,0.05);
          border: 1px solid rgba(201,168,76,0.15);
          border-radius: 5px; color: #f0e6d3;
          font-family: 'Nunito', sans-serif; font-size: 12px;
          padding: 6px 9px; outline: none;
          transition: border-color .2s;
          resize: none;
        }
        .hr-field input:focus,
        .hr-field textarea:focus { border-color: rgba(201,168,76,0.45); }
        .hr-field textarea { height: 68px; }
        .hr-form-error { font-size: 10px; color: #e74c3c; }
        .hr-form-hint { font-size: 10px; color: rgba(240,230,211,0.25); }

        .hr-btn-gold {
          background: rgba(201,168,76,0.12); border: 1px solid rgba(201,168,76,0.3);
          color: #c9a84c; font-family: 'Nunito', sans-serif; font-size: 11px;
          font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
          padding: 7px 12px; border-radius: 6px; cursor: pointer;
          transition: background .2s, border-color .2s;
        }
        .hr-btn-gold:hover { background: rgba(201,168,76,0.22); border-color: rgba(201,168,76,0.5); }
        .hr-btn-ghost {
          background: none; border: 1px solid rgba(240,230,211,0.12);
          color: rgba(240,230,211,0.45); font-family: 'Nunito', sans-serif; font-size: 11px;
          font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
          padding: 7px 12px; border-radius: 6px; cursor: pointer;
          transition: background .2s, border-color .2s, color .2s;
        }
        .hr-btn-ghost:hover { background: rgba(240,230,211,0.06); border-color: rgba(240,230,211,0.25); color: #f0e6d3; }

        .hr-import-label {
          display: inline-block;
          background: none; border: 1px solid rgba(240,230,211,0.12);
          color: rgba(240,230,211,0.45); font-family: 'Nunito', sans-serif; font-size: 11px;
          font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
          padding: 6px 10px; border-radius: 6px; cursor: pointer;
          transition: background .2s, border-color .2s, color .2s;
        }
        .hr-import-label:hover { background: rgba(240,230,211,0.06); border-color: rgba(240,230,211,0.25); color: #f0e6d3; }
        .hr-import-input { display: none; }

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
          .hr-vol-slider { display: none; }
          .hr-back { top: 10px; left: 10px; width: 30px; height: 30px; }
          .hr-flash-ring { width: 52px; height: 52px; }
          .hr-buffer-ring { width: 40px; height: 40px; }
          .hr-overlay { padding-bottom: 64px; }
          .hr-subs { bottom: 64px; }
          .hr-subs.controls-hidden { bottom: 10px; }
          .hr-cue-form { width: 160px; }
        }
        @media (max-width: 360px) {
          .hr-title { font-size: clamp(16px, 7.5vw, 28px); }
          .hr-meta-row { gap: 5px; }
          .hr-skip-label { display: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .hr-buffer-ring { animation-duration: 1.8s; }
          .hr-subs-fade, .hr-admin-panel { animation: none; }
          .hr-controls, .hr-meta, .hr-btn, .hr-back, .hr-desc-body { transition-property: opacity; }
        }
      `}</style>

      <div
        ref={containerRef}
        className={`hr-player${isFullscreen ? ' hr-fullscreen' : ''}`}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onMouseMove={showControls}
        onTouchStart={showControls}
      >
        {src ? (
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <div className="hr-poster" />
        )}

        {/* ── Back button ─────────────────────────────────────────────────── */}
        <button
          className="hr-back"
          onClick={e => { e.stopPropagation(); onBack?.() }}
          aria-label="Go back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" stroke="#c9a84c" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* ── Buffering spinner ────────────────────────────────────────────── */}
        {isWaiting && !adminOpen && (
          <div className="hr-buffer-spin">
            <div className="hr-buffer-ring" />
          </div>
        )}

        {/* ── Active subtitle display ──────────────────────────────────────── */}
        {activeCue && subsEnabled && !adminOpen && (
          <div className={`hr-subs${(!controlsVisible && isPlaying) ? ' controls-hidden' : ''}`}>
            <span key={activeCue.id} className="hr-subs-text hr-subs-fade">{activeCue.text}</span>
          </div>
        )}

        {/* ── Center flash ─────────────────────────────────────────────────── */}
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

        {/* ── Title / synopsis overlay ─────────────────────────────────────── */}
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
              <span>{displayTotal}</span>
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

        {/* ── Controls bar ─────────────────────────────────────────────────── */}
        <div
          className={`hr-controls${(!controlsVisible && isPlaying) ? ' hidden' : ''}`}
          onClick={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
        >
          {/* Progress bar with buffered range + cue tick marks */}
          <div
            ref={progressRef}
            className="hr-prog-wrap"
            onMouseDown={e => { setScrubbing(true); scrub(e.clientX) }}
            onTouchStart={e => { e.stopPropagation(); scrub(e.touches[0].clientX) }}
            onTouchMove={handleTouchMove}
          >
            <div className="hr-prog-track">
              <div className="hr-prog-buffer" style={{ width: bufferedPct }} />
              <div className="hr-prog-fill" style={{ width: pct }} />
              {totalTime > 0 && sortedCues.map(c => (
                <div
                  key={c.id}
                  className="hr-prog-tick"
                  style={{ left: `${(c.start / totalTime) * 100}%` }}
                  title={`${fmt(c.start)}: ${c.text.slice(0, 40)}`}
                />
              ))}
            </div>
            <div className="hr-prog-thumb" style={{ left: pct }} />
          </div>

          <div className="hr-btn-row">
            {/* Rewind */}
            <button className="hr-btn" onClick={() => skip(-10)} title="Rewind 10s">
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <text x="8.5" y="15.5" fontSize="5.5" fill="currentColor" stroke="none" fontFamily="Nunito,sans-serif" className="hr-skip-label">10</text>
              </svg>
            </button>

            {/* Play/Pause */}
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

            {/* Forward */}
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

            {/* Subtitles toggle (CC) */}
            <button
              className={`hr-btn${subsEnabled ? ' active' : ''}`}
              onClick={() => setSubsEnabled(s => !s)}
              title={subsEnabled ? 'Hide subtitles (C)' : 'Show subtitles (C)'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M7 12h4M13 12h4M7 16h3M14 16h3" />
              </svg>
            </button>

            {/* Admin subtitle editor */}
            <button
              className={`hr-btn${adminOpen ? ' active' : ''}`}
              onClick={e => { e.stopPropagation(); setAdminOpen(o => !o); if (!adminOpen) openNewCueForm() }}
              title="Subtitle editor"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>

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

        {/* ── Admin subtitle panel ──────────────────────────────────────────── */}
        {adminOpen && (
          <div className="hr-admin-panel" onClick={e => e.stopPropagation()} onDoubleClick={e => e.stopPropagation()}>
            <div className="hr-admin-header">
              <h2>Subtitle Editor</h2>
              <div className="hr-admin-actions">
                <label className="hr-import-label" title="Import .vtt or .srt file">
                  Import VTT / SRT
                  <input
                    type="file"
                    className="hr-import-input"
                    accept=".vtt,.srt,text/vtt,text/plain"
                    onChange={handleFileImport}
                  />
                </label>
                {cues.length > 0 && (
                  <button className="hr-btn-ghost" onClick={exportVTT}>Export VTT</button>
                )}
                <button className="hr-btn-ghost" onClick={() => setAdminOpen(false)}>✕ Close</button>
              </div>
            </div>

            <div className="hr-admin-body">
              {/* Cue list */}
              <div className="hr-cue-list">
                {sortedCues.length === 0 ? (
                  <p className="hr-no-cues">No subtitle cues yet.<br />Add one using the form →</p>
                ) : sortedCues.map(c => (
                  <div
                    key={c.id}
                    className={`hr-cue-item${c.id === activeCue?.id ? ' active-cue' : ''}${editingCue?.id === c.id ? ' editing' : ''}`}
                    onClick={() => {
                      // Seek to cue start on click
                      const v = videoRef.current
                      if (v) v.currentTime = c.start
                      setCurrentTime(c.start)
                      setProgress(totalTime ? c.start / totalTime : 0)
                    }}
                  >
                    <div style={{ display:'flex', flexDirection:'column', gap:2, flex:1, minWidth:0 }}>
                      <div className="hr-cue-times">{fmt(c.start)} → {fmt(c.end)}</div>
                      <div className="hr-cue-text">{c.text}</div>
                    </div>
                    <button
                      className="hr-cue-edit"
                      onClick={e => { e.stopPropagation(); openEditCueForm(c) }}
                      title="Edit cue"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="hr-cue-del"
                      onClick={e => { e.stopPropagation(); deleteCue(c.id) }}
                      title="Delete cue"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Add / edit form */}
              <div className="hr-cue-form">
                <h3>{editingCue ? 'Edit Cue' : 'New Cue'}</h3>

                <div className="hr-field">
                  <label>Start time</label>
                  <input
                    value={formStart}
                    onChange={e => setFormStart(e.target.value)}
                    placeholder="0:00 or 1:23:45"
                  />
                </div>
                <div className="hr-field">
                  <label>End time</label>
                  <input
                    value={formEnd}
                    onChange={e => setFormEnd(e.target.value)}
                    placeholder="0:00 or 1:23:45"
                  />
                </div>
                <div className="hr-field">
                  <label>Text</label>
                  <textarea
                    value={formText}
                    onChange={e => setFormText(e.target.value)}
                    placeholder="Subtitle text…"
                  />
                </div>

                {formError && <p className="hr-form-error">{formError}</p>}
                <p className="hr-form-hint">
                  Current time: <strong style={{color:'#c9a84c'}}>{fmt(currentTime)}</strong>
                  {' '}— use ← → to scrub
                </p>

                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  <button
                    className="hr-btn-gold"
                    onClick={saveCue}
                  >
                    {editingCue ? 'Save' : 'Add Cue'}
                  </button>
                  {editingCue && (
                    <button
                      className="hr-btn-ghost"
                      onClick={() => { setEditingCue(null); openNewCueForm() }}
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {!editingCue && (
                  <button
                    className="hr-btn-ghost"
                    style={{ marginTop:4 }}
                    onClick={() => {
                      setFormStart(fmt(currentTime))
                      setFormEnd(fmt(Math.min(currentTime + 2, totalTime || currentTime + 2)))
                    }}
                    title="Snap start to current playback position"
                  >
                    ⌖ Snap to current time
                  </button>
                )}

                <div style={{ marginTop:8, borderTop:'1px solid rgba(201,168,76,0.1)', paddingTop:10 }}>
                  <p className="hr-form-hint" style={{marginBottom:6}}>
                    {cues.length} cue{cues.length !== 1 ? 's' : ''}
                  </p>
                  {cues.length > 0 && (
                    <button
                      className="hr-btn-ghost"
                      style={{ color:'rgba(231,76,60,0.6)', borderColor:'rgba(231,76,60,0.2)', fontSize:10 }}
                      onClick={() => { if (confirm('Clear all subtitle cues?')) setCues([]) }}
                    >
                      Clear all cues
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}