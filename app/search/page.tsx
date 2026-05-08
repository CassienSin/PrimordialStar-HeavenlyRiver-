'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import { getStorageUrl } from '../lib/storage'

const ALL_CATEGORIES = ['Anime', 'Donghua', 'Movie', 'Series', 'Other']
const CATEGORY_ICONS: Record<string, string> = {
  Anime: '', Donghua: '', Movie: '', Series: '', Other: '',
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [allVideos, setAllVideos] = useState<any[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState('')

  useEffect(() => {
    const loadAll = async () => {
      const { data } = await supabase.from('videos').select('*').order('created_at', { ascending: false })
      setAllVideos(data || [])
    }
    loadAll()
  }, [])

  const handleSearch = async (q = query, cat = activeCategory) => {
    setLoading(true)
    setSearched(true)
    let request = supabase.from('videos').select('*')
    if (q.trim()) request = request.ilike('title', `%${q}%`)
    if (cat) request = request.eq('category', cat)
    const { data } = await request
    setResults(data || [])
    setLoading(false)
  }

  const handleCategory = (cat: string) => {
    const next = activeCategory === cat ? '' : cat
    setActiveCategory(next)
    handleSearch(query, next)
  }

  const displayVideos = searched ? results : allVideos

  return (
    <div style={{ minHeight: '100vh', background: '#0a0812', color: '#f0e6d3', fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Nunito:wght@300;400;600;700&display=swap');
        .search-page { max-width: 1100px; margin: 0 auto; padding: 100px 32px 100px; }
        .search-hero { text-align: center; padding: 40px 0 48px; position: relative; }
        .search-hero::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 500px; height: 200px; background: radial-gradient(ellipse, rgba(192,57,43,0.08) 0%, transparent 70%); pointer-events: none; }
        .search-eyebrow { font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; color: #c9a84c; margin-bottom: 12px; opacity: 0.7; }
        .search-heading { font-family: 'Cinzel', serif; font-size: clamp(28px, 4vw, 44px); letter-spacing: 2px; margin: 0 0 32px; color: #f0e6d3; text-shadow: 0 0 40px rgba(240,230,211,0.1); }
        .search-bar-wrap { position: relative; max-width: 600px; margin: 0 auto 32px; }
        .search-icon { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); font-size: 16px; opacity: 0.4; pointer-events: none; transition: opacity 0.2s; }
        .search-bar-wrap:focus-within .search-icon { opacity: 0.8; }
        .search-input { width: 100%; padding: 16px 120px 16px 48px; background: #16121f; border: 1px solid rgba(201,168,76,0.15); border-radius: 6px; color: #f0e6d3; font-size: 16px; font-family: 'Nunito', sans-serif; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; }
        .search-input::placeholder { color: rgba(240,230,211,0.2); }
        .search-input:focus { border-color: rgba(201,168,76,0.4); box-shadow: 0 0 0 3px rgba(201,168,76,0.05), 0 4px 24px rgba(0,0,0,0.4); }
        .search-submit { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); padding: 9px 20px; background: linear-gradient(135deg, #c0392b, #7b1a1a); border: 1px solid rgba(201,168,76,0.25); border-radius: 4px; color: #f0c96a; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; font-family: 'Nunito', sans-serif; transition: all 0.2s; }
        .search-submit:hover { background: linear-gradient(135deg, #e74c3c, #c0392b); box-shadow: 0 0 16px rgba(192,57,43,0.3); }
        .cat-row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-bottom: 48px; }
        .cat-pill { display: flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 30px; border: 1px solid rgba(201,168,76,0.15); background: rgba(22,18,31,0.8); color: rgba(240,230,211,0.5); font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Nunito', sans-serif; transition: all 0.2s; letter-spacing: 0.3px; }
        .cat-pill:hover { border-color: rgba(201,168,76,0.35); color: #f0e6d3; background: rgba(201,168,76,0.06); }
        .cat-pill.active { background: linear-gradient(135deg, rgba(192,57,43,0.3), rgba(123,26,26,0.3)); border-color: rgba(201,168,76,0.4); color: #f0c96a; box-shadow: 0 0 16px rgba(192,57,43,0.15); }
        .section-divider { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; }
        .section-divider-line { flex: 1; height: 1px; background: linear-gradient(to right, rgba(201,168,76,0.15), transparent); }
        .section-divider-line.right { background: linear-gradient(to left, rgba(201,168,76,0.15), transparent); }
        .section-label { font-family: 'Cinzel', serif; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: rgba(201,168,76,0.5); white-space: nowrap; }
        .results-count { font-size: 12px; color: rgba(240,230,211,0.25); font-weight: 600; letter-spacing: 0.5px; }
        .results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); gap: 16px; }
        .r-card { background: #16121f; border-radius: 6px; overflow: hidden; text-decoration: none; display: block; border: 1px solid rgba(201,168,76,0.07); transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s, border-color 0.3s; position: relative; }
        .r-card:hover { transform: translateY(-5px) scale(1.02); box-shadow: 0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.18); border-color: rgba(201,168,76,0.18); z-index: 2; }
        .r-thumb { width: 100%; aspect-ratio: 16/9; background: #1e1828; position: relative; overflow: hidden; }
        .r-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .r-card:hover .r-thumb img { transform: scale(1.08); }
        .r-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,8,18,0.85), transparent 60%); }
        .r-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; }
        .r-card:hover .r-play { opacity: 1; }
        .r-play-btn { width: 38px; height: 38px; border-radius: 50%; background: rgba(240,230,211,0.9); display: flex; align-items: center; justify-content: center; font-size: 13px; padding-left: 2px; box-shadow: 0 4px 16px rgba(0,0,0,0.5); }
        .r-emoji { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 32px; background: linear-gradient(135deg, #16121f, #1e1828); }
        .r-body { padding: 11px 12px 13px; }
        .r-title { color: #f0e6d3; font-size: 13px; font-weight: 600; margin: 0 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .r-cat { color: #c9a84c; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; font-family: 'Cinzel', serif; }
        .skeleton-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); gap: 16px; }
        .skeleton-card { background: #16121f; border-radius: 6px; overflow: hidden; border: 1px solid rgba(201,168,76,0.07); }
        .skeleton-thumb { width: 100%; aspect-ratio: 16/9; background: linear-gradient(90deg, #16121f 25%, #1e1828 50%, #16121f 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
        .skeleton-body { padding: 11px 12px 13px; }
        .skeleton-line { height: 11px; border-radius: 3px; margin-bottom: 7px; background: linear-gradient(90deg, #16121f 25%, #1e1828 50%, #16121f 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
        .skeleton-line.short { width: 55%; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .empty-state { text-align: center; padding: 80px 20px; }
        .empty-icon { font-size: 52px; opacity: 0.3; margin-bottom: 16px; }
        .empty-text { color: rgba(240,230,211,0.25); font-size: 15px; font-family: 'Cinzel', serif; letter-spacing: 1px; }
        @media (max-width: 768px) { .search-page { padding: 90px 16px 80px; } .results-grid, .skeleton-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; } }
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
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button className="search-submit" onClick={() => handleSearch()}>Search</button>
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
          <span className="section-label">{searched ? activeCategory || 'Results' : 'All Videos'}</span>
          <div className="section-divider-line right" />
          {!loading && <span className="results-count">{displayVideos.length} {displayVideos.length === 1 ? 'title' : 'titles'}</span>}
        </div>

        {loading && (
          <div className="skeleton-grid">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-thumb" style={{ animationDelay: `${i * 0.07}s` }} />
                <div className="skeleton-body">
                  <div className="skeleton-line" />
                  <div className="skeleton-line short" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && displayVideos.length > 0 && (
          <div className="results-grid">
            {displayVideos.map((video: any) => (
              <Link key={video.id} href={`/watch/${video.id}`} className="r-card">
                <div className="r-thumb">
                  {video.thumbnail_url ? (
                    <>
                      <img src={getStorageUrl(video.thumbnail_url)} alt={video.title} />
                      <div className="r-overlay" />
                    </>
                  ) : (
                    <div className="r-emoji">🎬</div>
                  )}
                  <div className="r-play">
                    <div className="r-play-btn">▶</div>
                  </div>
                </div>
                <div className="r-body">
                  <p className="r-title">{video.title}</p>
                  <p className="r-cat">{CATEGORY_ICONS[video.category]} {video.category}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p className="empty-text">No results found{query ? ` for "${query}"` : ''}</p>
          </div>
        )}

        {!loading && !searched && allVideos.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🎬</div>
            <p className="empty-text">No videos in your library yet</p>
          </div>
        )}
      </div>
    </div>
  )
}