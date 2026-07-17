'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import { getStorageUrl } from '../lib/storage'

const ALL_CATEGORIES = ['Anime', 'Donghua', 'Movie', 'Series', 'Other']
const CATEGORY_ICONS: Record<string, string> = {
  Anime: '🎌', Donghua: '🐉', Movie: '🎬', Series: '📺', Other: '✨',
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [allItems, setAllItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('')

  // Load the entire library once — searching then filters it instantly
  // on the client, with zero extra database round-trips per keystroke.
  useEffect(() => {
    const loadAll = async () => {
      const [{ data: videos }, { data: series }] = await Promise.all([
        supabase.from('videos').select('*').order('created_at', { ascending: false }),
        supabase.from('series').select('*').order('created_at', { ascending: false }),
      ])

      const normalizedSeries = (series || []).map(s => ({ ...s, _type: 'series' }))
      const normalizedVideos = (videos || []).map(v => ({ ...v, _type: 'movie' }))

      // Merge and sort by created_at
      const merged = [...normalizedVideos, ...normalizedSeries].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setAllItems(merged)
      setLoading(false)
    }
    loadAll()
  }, [])

  // Live search: results update as you type, debounced ~200ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200)
    return () => clearTimeout(t)
  }, [query])

  const displayItems = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    return allItems.filter(item => {
      if (activeCategory && item.category !== activeCategory) return false
      if (q && !item.title?.toLowerCase().includes(q)) return false
      return true
    })
  }, [allItems, debouncedQuery, activeCategory])

  const isFiltering = !!debouncedQuery.trim() || !!activeCategory

  const handleCategory = (cat: string) => {
    setActiveCategory(prev => (prev === cat ? '' : cat))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0812', color: '#f0e6d3', fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @keyframes sp-rise {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sp-card-in {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes sp-sheen {
          from { transform: translateX(-180%) rotate(10deg); }
          to   { transform: translateX(280%) rotate(10deg); }
        }
        @keyframes sp-pulse-ring {
          0%   { box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 0 0 rgba(201,168,76,0.45); }
          100% { box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 0 12px rgba(201,168,76,0); }
        }

        .search-page { max-width: 1100px; margin: 0 auto; padding: 100px 32px 100px; }

        .search-hero { text-align: center; padding: 40px 0 48px; position: relative; }
        .search-hero::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 500px; height: 200px; background: radial-gradient(ellipse, rgba(192,57,43,0.08) 0%, transparent 70%); pointer-events: none; }
        .search-hero > * { animation: sp-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .search-hero > *:nth-child(1) { animation-delay: 0.05s; }
        .search-hero > *:nth-child(2) { animation-delay: 0.13s; }
        .search-hero > *:nth-child(3) { animation-delay: 0.21s; }
        .search-hero > *:nth-child(4) { animation-delay: 0.29s; }

        .search-eyebrow { font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; color: #c9a84c; margin-bottom: 12px; opacity: 0.7; }
        .search-heading { font-family: 'Cinzel', serif; font-size: clamp(28px, 4vw, 44px); letter-spacing: 2px; margin: 0 0 32px; color: #f0e6d3; text-shadow: 0 0 40px rgba(240,230,211,0.1); }

        .search-bar-wrap { position: relative; max-width: 600px; margin: 0 auto 32px; }
        .search-icon { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); font-size: 16px; opacity: 0.4; pointer-events: none; transition: opacity 0.2s; }
        .search-bar-wrap:focus-within .search-icon { opacity: 0.8; }
        .search-input { width: 100%; padding: 16px 48px 16px 48px; background: #16121f; border: 1px solid rgba(201,168,76,0.15); border-radius: 6px; color: #f0e6d3; font-size: 16px; font-family: 'Nunito', sans-serif; outline: none; transition: border-color 0.25s, box-shadow 0.25s; box-sizing: border-box; }
        .search-input::placeholder { color: rgba(240,230,211,0.2); }
        .search-input:focus { border-color: rgba(201,168,76,0.4); box-shadow: 0 0 0 3px rgba(201,168,76,0.05), 0 0 20px rgba(201,168,76,0.08), 0 4px 24px rgba(0,0,0,0.4); }
        .search-clear { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 30px; height: 30px; border-radius: 50%; background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.15); color: rgba(240,230,211,0.5); font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .search-clear:hover { background: rgba(201,168,76,0.16); color: #c9a84c; }

        .cat-row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-bottom: 48px; }
        .cat-pill { display: flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 30px; border: 1px solid rgba(201,168,76,0.15); background: rgba(22,18,31,0.8); color: rgba(240,230,211,0.5); font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Nunito', sans-serif; transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1); letter-spacing: 0.3px; }
        .cat-pill:hover { border-color: rgba(201,168,76,0.35); color: #f0e6d3; background: rgba(201,168,76,0.06); transform: translateY(-2px); }
        .cat-pill:active { transform: translateY(0) scale(0.96); transition-duration: 0.08s; }
        .cat-pill.active { background: linear-gradient(135deg, rgba(192,57,43,0.3), rgba(123,26,26,0.3)); border-color: rgba(201,168,76,0.4); color: #f0c96a; box-shadow: 0 0 16px rgba(192,57,43,0.15); }

        .section-divider { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; }
        .section-divider-line { flex: 1; height: 1px; background: linear-gradient(to right, rgba(201,168,76,0.15), transparent); }
        .section-divider-line.right { background: linear-gradient(to left, rgba(201,168,76,0.15), transparent); }
        .section-label { font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: rgba(201,168,76,0.5); white-space: nowrap; }
        .results-count { font-size: 12px; color: rgba(240,230,211,0.25); font-weight: 600; letter-spacing: 0.5px; }

        .results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); gap: 16px; }
        .results-grid > * { animation: sp-card-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .results-grid > *:nth-child(1)  { animation-delay: 0.02s; }
        .results-grid > *:nth-child(2)  { animation-delay: 0.05s; }
        .results-grid > *:nth-child(3)  { animation-delay: 0.08s; }
        .results-grid > *:nth-child(4)  { animation-delay: 0.11s; }
        .results-grid > *:nth-child(5)  { animation-delay: 0.14s; }
        .results-grid > *:nth-child(6)  { animation-delay: 0.17s; }
        .results-grid > *:nth-child(7)  { animation-delay: 0.20s; }
        .results-grid > *:nth-child(8)  { animation-delay: 0.23s; }
        .results-grid > *:nth-child(9)  { animation-delay: 0.26s; }
        .results-grid > *:nth-child(10) { animation-delay: 0.29s; }
        .results-grid > *:nth-child(n+11) { animation-delay: 0.32s; }

        .r-card { background: #16121f; border-radius: 6px; overflow: hidden; text-decoration: none; display: block; border: 1px solid rgba(201,168,76,0.07); transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s, border-color 0.3s; position: relative; will-change: transform; }
        .r-card:hover { transform: translateY(-5px) scale(1.02); box-shadow: 0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.18), 0 0 20px rgba(201,168,76,0.08); border-color: rgba(201,168,76,0.18); z-index: 2; }

        /* Series cards use 2:3 poster ratio */
        .r-thumb { width: 100%; aspect-ratio: 2/3; background: #1e1828; position: relative; overflow: hidden; }
        .r-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
        .r-card:hover .r-thumb img { transform: scale(1.08); }
        .r-thumb::after {
          content: '';
          position: absolute; top: -25%; left: 0; width: 50%; height: 150%;
          background: linear-gradient(90deg, transparent, rgba(240,201,106,0.1), transparent);
          transform: translateX(-180%) rotate(10deg);
          pointer-events: none; z-index: 2;
        }
        .r-card:hover .r-thumb::after { animation: sp-sheen 1s ease forwards; }
        .r-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,8,18,0.85), transparent 60%); transition: background 0.3s ease; }
        .r-card:hover .r-overlay { background: linear-gradient(to top, rgba(10,8,18,0.92), rgba(10,8,18,0.2) 60%); }
        .r-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.25s; z-index: 3; }
        .r-card:hover .r-play { opacity: 1; }
        .r-play-btn {
          width: 38px; height: 38px; border-radius: 50%;
          background: rgba(240,230,211,0.9);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; padding-left: 2px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5);
          transform: scale(0.6);
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .r-card:hover .r-play-btn { transform: scale(1); animation: sp-pulse-ring 1.5s ease-out infinite; }
        .r-emoji { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 32px; background: linear-gradient(135deg, #16121f, #1e1828); }
        .r-body { padding: 11px 12px 13px; }
        .r-title { color: #f0e6d3; font-size: 13px; font-weight: 600; margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color 0.25s; }
        .r-card:hover .r-title { color: #f0c96a; }
        .r-cat { color: #c9a84c; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; font-family: 'Cinzel', serif; }
        .r-type-badge { position: absolute; top: 8px; right: 8px; background: rgba(10,8,18,0.75); border: 1px solid rgba(201,168,76,0.2); border-radius: 3px; padding: 2px 6px; font-size: 9px; font-weight: 700; letter-spacing: 1px; color: #c9a84c; font-family: 'Cinzel', serif; backdrop-filter: blur(4px); z-index: 3; }

        .skeleton-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); gap: 16px; }

        @media (max-width: 768px) {
          .search-page { padding: 90px 16px 80px; }
          .results-grid, .skeleton-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
          .search-heading { font-size: 24px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .search-hero > *, .results-grid > * { animation: none !important; }
          .r-card, .r-thumb img, .r-play-btn, .cat-pill { transition: none; }
          .r-card:hover { transform: none; }
          .r-card:hover .r-thumb img { transform: none; }
          .r-card:hover .r-thumb::after { animation: none; }
          .r-card:hover .r-play-btn { animation: none; transform: scale(1); }
          .cat-pill:hover { transform: none; }
        }
      `}</style>

      <Navbar />

      <div className="search-page">
        <div className="search-hero">
          <p className="search-eyebrow">Discover</p>
          <h1 className="search-heading">Find Your Next Watch</h1>
          <div className="search-bar-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder="Search titles..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                ✕
              </button>
            )}
          </div>
          <div className="cat-row">
            {ALL_CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`cat-pill ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => handleCategory(cat)}
              >
                <span>{CATEGORY_ICONS[cat]}</span>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="section-divider">
          <div className="section-divider-line" />
          <span className="section-label">{isFiltering ? activeCategory || 'Results' : 'All Videos'}</span>
          <div className="section-divider-line right" />
          {!loading && <span className="results-count">{displayItems.length} {displayItems.length === 1 ? 'title' : 'titles'}</span>}
        </div>

        {loading && (
          <div className="skeleton-grid">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-thumb" style={{ aspectRatio: '2/3', animationDelay: `${i * 0.07}s` }} />
                <div className="skeleton-body">
                  <div className="skeleton-line" />
                  <div className="skeleton-line short" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && displayItems.length > 0 && (
          <div className="results-grid">
            {displayItems.map((item: any) => {
              const isSeries = item._type === 'series'
              const href     = isSeries ? `/series/${item.id}` : `/watch/${item.id}`
              const emoji    = isSeries ? '📺' : '🎬'

              return (
                <Link key={`${item._type}-${item.id}`} href={href} className="r-card">
                  <div className="r-thumb">
                    {item.thumbnail_url ? (
                      <>
                        <img src={getStorageUrl(item.thumbnail_url)} alt={item.title} />
                        <div className="r-overlay" />
                      </>
                    ) : (
                      <div className="r-emoji">{emoji}</div>
                    )}
                    {!isSeries && (
                      <div className="r-play">
                        <div className="r-play-btn">▶</div>
                      </div>
                    )}
                    <div className="r-type-badge">{isSeries ? 'SERIES' : 'MOVIE'}</div>
                  </div>
                  <div className="r-body">
                    <p className="r-title">{item.title}</p>
                    <p className="r-cat">{CATEGORY_ICONS[item.category]} {item.category}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {!loading && isFiltering && displayItems.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p className="empty-text">No results found{debouncedQuery.trim() ? ` for "${debouncedQuery.trim()}"` : ''}</p>
          </div>
        )}

        {!loading && !isFiltering && allItems.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🎬</div>
            <p className="empty-text">No videos in your library yet</p>
          </div>
        )}
      </div>
    </div>
  )
}