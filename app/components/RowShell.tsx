'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

const GAP = 10
const SWIPE_THRESHOLD = 50 // minimum px to count as a swipe

function defaultCpp(w: number): number {
  if (w >= 1400) return 6
  if (w >= 1100) return 5
  if (w >= 800)  return 4
  if (w >= 550)  return 3
  return 2
}

interface Props {
  title:        React.ReactNode
  items:        any[]
  renderCard:   (item: any, width: number) => React.ReactNode
  headerRight?: React.ReactNode
  getCpp?:      (w: number) => number
  arrowHeight?: number
  slug:         string
}

export default function RowShell({
  title, items, renderCard, headerRight,
  getCpp = defaultCpp, arrowHeight = 76, slug,
}: Props) {
  const [page, setPage]       = useState(0)
  const [vpWidth, setVpWidth] = useState(0)
  const [cpp, setCpp]         = useState(6)
  const viewportRef           = useRef<HTMLDivElement>(null)
  const touchStartX           = useRef<number | null>(null)
  const touchStartY           = useRef<number | null>(null)

  useEffect(() => {
    const measure = () => {
      if (!viewportRef.current) return
      const w = viewportRef.current.offsetWidth
      setVpWidth(w)
      setCpp(getCpp(w))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (viewportRef.current) ro.observe(viewportRef.current)
    return () => ro.disconnect()
  }, [getCpp])

  const totalPages = Math.ceil(items.length / cpp)
  const maxPage    = Math.max(0, totalPages - 1)

  useEffect(() => {
    setPage(p => Math.min(p, Math.max(0, Math.ceil(items.length / cpp) - 1)))
  }, [cpp, items.length])

  const prev = useCallback(() => setPage(p => Math.max(0, p - 1)), [])
  const next = useCallback(() => setPage(p => Math.min(maxPage, p + 1)), [maxPage])

  // Touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current

    // Only trigger if horizontal swipe is dominant (not a scroll)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx < 0) next()
      else        prev()
    }

    touchStartX.current = null
    touchStartY.current = null
  }, [next, prev])

  const cardW  = vpWidth > 0 ? (vpWidth - GAP * (cpp - 1)) / cpp : 200
  const slideX = page * vpWidth
  const s      = slug

  return (
    <>
      <style>{`
        .${s}-row { margin-bottom: 56px; }
        .${s}-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; padding: 0 2px; }
        .${s}-title { font-family: 'Cinzel', serif; font-size: 15px; letter-spacing: 3px; text-transform: uppercase; color: #c9a84c; text-shadow: 0 0 20px rgba(201,168,76,0.25); margin: 0; white-space: nowrap; transition: color 0.2s; }
        .${s}-row:hover .${s}-title { color: #f0c96a; }
        .${s}-line { flex: 1; height: 1px; background: linear-gradient(to right, rgba(201,168,76,0.18), transparent); }
        .${s}-dots { display: flex; align-items: center; gap: 4px; }
        .${s}-dot { height: 2px; width: 10px; border-radius: 1px; background: rgba(201,168,76,0.25); cursor: pointer; transition: all 0.35s cubic-bezier(0.4,0,0.2,1); }
        .${s}-dot.active { background: #c9a84c; width: 18px; }

        .${s}-shell { position: relative; }
        .${s}-left-fade { position: absolute; top: 0; bottom: 0; left: 0; width: 48px; z-index: 20; pointer-events: none; background: linear-gradient(to right, #0a0812 0%, transparent 100%); }
        .${s}-right-fade { position: absolute; top: 0; bottom: 0; right: 0; width: 48px; z-index: 20; pointer-events: none; background: linear-gradient(to left, #0a0812 0%, transparent 100%); }

        .${s}-viewport { overflow-x: hidden; overflow-y: visible; width: 100%; touch-action: pan-y; }
        .${s}-track { display: flex; transition: transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94); will-change: transform; overflow: visible; }

        .${s}-arrow { position: absolute; top: 50%; z-index: 30; display: flex; align-items: center; justify-content: center; width: 42px; height: ${arrowHeight}px; background: rgba(10,8,18,0.85); border: 1px solid rgba(201,168,76,0.15); color: #f0e6d3; font-size: 30px; font-weight: 300; cursor: pointer; border-radius: 4px; backdrop-filter: blur(8px); transition: opacity 0.25s, background 0.2s, border-color 0.2s, color 0.2s; opacity: 0; }
        .${s}-arrow.left  { left: -21px;  transform: translateY(-50%); }
        .${s}-arrow.right { right: -21px; transform: translateY(-50%); }
        .${s}-arrow:hover { background: rgba(201,168,76,0.12); border-color: rgba(201,168,76,0.4); color: #c9a84c; }
        .${s}-shell:hover .${s}-arrow { opacity: 1; }

        @media (max-width: 768px) {
          .${s}-row { margin-bottom: 40px; }
          .${s}-title { font-size: 13px; letter-spacing: 2px; }
          .${s}-arrow { width: 34px; height: ${Math.round(arrowHeight * 0.8)}px; font-size: 22px; }
        }
        @media (max-width: 480px) {
          .${s}-row { margin-bottom: 32px; }
          .${s}-title { font-size: 11px; letter-spacing: 1.5px; }
          .${s}-arrow { display: none; }
        }
      `}</style>

      <div className={`${s}-row`}>
        <div className={`${s}-header`}>
          <h2 className={`${s}-title`}>{title}</h2>
          <div className={`${s}-line`} />
          {totalPages > 1 && (
            <div className={`${s}-dots`}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <div
                  key={i}
                  className={`${s}-dot${i === page ? ' active' : ''}`}
                  onClick={() => setPage(i)}
                />
              ))}
            </div>
          )}
          {headerRight}
        </div>

        <div className={`${s}-shell`}>
          {page > 0       && <div className={`${s}-left-fade`} />}
          {page < maxPage && <div className={`${s}-right-fade`} />}
          {page > 0 && (
            <button className={`${s}-arrow left`} onClick={prev}>‹</button>
          )}

          <div
            className={`${s}-viewport`}
            ref={viewportRef}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div
              className={`${s}-track`}
              style={{ gap: GAP, transform: `translateX(-${slideX}px)` }}
            >
              {items.map((item, i) => (
                <div key={item.id ?? i} style={{ flexShrink: 0, width: cardW }}>
                  {renderCard(item, cardW)}
                </div>
              ))}
            </div>
          </div>

          {page < maxPage && (
            <button className={`${s}-arrow right`} onClick={next}>›</button>
          )}
        </div>
      </div>
    </>
  )
}