'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import { getStorageUrl } from '../lib/storage'

const MAX_POSTER_MB = 8

export default function SeriesPage() {
  const router = useRouter()
  const [seriesList, setSeriesList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'Anime' })
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterPreview, setPosterPreview] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('is_admin').eq('id', session.user.id).maybeSingle()
      setIsAdmin(profile?.is_admin === true)

      const { data } = await supabase
        .from('series')
        .select('*, seasons(id, season_number, episodes(id))')
        .order('created_at', { ascending: false })
      setSeriesList(data || [])
      setLoading(false)
    }
    load()
  }, [router])

  // Revoke poster preview blob URL when replaced or on unmount
  useEffect(() => {
    return () => { if (posterPreview) URL.revokeObjectURL(posterPreview) }
  }, [posterPreview])

  // Escape closes the modal (unless mid-create)
  useEffect(() => {
    if (!showCreate) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !creating) setShowCreate(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showCreate, creating])

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setUploadProgress('❌ Please choose an image file')
      return
    }
    if (f.size > MAX_POSTER_MB * 1024 * 1024) {
      setUploadProgress(`❌ Poster must be under ${MAX_POSTER_MB}MB`)
      return
    }
    setUploadProgress('')
    setPosterFile(f)
    setPosterPreview(URL.createObjectURL(f))
  }

  const handleCreate = async () => {
    if (!form.title.trim()) return
    setCreating(true)
    setUploadProgress('Creating series...')

    let thumbnailPath = ''
    if (posterFile) {
      setUploadProgress('Uploading poster...')
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ fileName: posterFile.name, fileType: posterFile.type, folder: 'series-posters' }),
        })
        const { signedUrl, filePath, error } = await res.json()
        if (error || !signedUrl) {
          setUploadProgress('❌ Poster upload failed — series not created')
          setCreating(false)
          return
        }
        const put = await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': posterFile.type }, body: posterFile })
        if (!put.ok) {
          setUploadProgress('❌ Poster upload failed — series not created')
          setCreating(false)
          return
        }
        thumbnailPath = filePath
      } catch {
        setUploadProgress('❌ Poster upload failed — series not created')
        setCreating(false)
        return
      }
    }

    const { data, error } = await supabase
      .from('series')
      .insert({ ...form, thumbnail_url: thumbnailPath })
      .select().single()

    if (!error && data) {
      router.push(`/series/${data.id}`)
    } else {
      setUploadProgress('❌ Failed to create series')
      setCreating(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0812', color: '#f0e6d3', fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        /* Series list specific styles */
        @keyframes sl-rise {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sl-card-in {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes sl-sheen {
          from { transform: translateX(-180%) rotate(10deg); }
          to   { transform: translateX(280%) rotate(10deg); }
        }

        .series-wrap { max-width: 1100px; margin: 0 auto; padding: 100px 24px 80px; animation: sl-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .series-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 40px; flex-wrap: wrap; gap: 16px; }

        .series-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; padding: 8px 4px; }
        .series-grid > * { animation: sl-card-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .series-grid > *:nth-child(1) { animation-delay: 0.02s; }
        .series-grid > *:nth-child(2) { animation-delay: 0.06s; }
        .series-grid > *:nth-child(3) { animation-delay: 0.10s; }
        .series-grid > *:nth-child(4) { animation-delay: 0.14s; }
        .series-grid > *:nth-child(5) { animation-delay: 0.18s; }
        .series-grid > *:nth-child(6) { animation-delay: 0.22s; }
        .series-grid > *:nth-child(7) { animation-delay: 0.26s; }
        .series-grid > *:nth-child(8) { animation-delay: 0.30s; }
        .series-grid > *:nth-child(n+9) { animation-delay: 0.34s; }

        .series-card {
          background: #16121f; border-radius: 10px; overflow: hidden;
          border: 1px solid rgba(201,168,76,0.08);
          transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease, border-color 0.3s;
          text-decoration: none; display: block; position: relative;
          will-change: transform;
        }
        .series-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.2), 0 0 22px rgba(201,168,76,0.1);
          border-color: rgba(201,168,76,0.2);
          z-index: 10;
        }
        .series-thumb { width: 100%; aspect-ratio: 2/3; background: linear-gradient(135deg, #1e1828, #16121f); position: relative; overflow: hidden; }
        .series-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
        .series-card:hover .series-thumb img { transform: scale(1.07); }
        .series-thumb::after {
          content: '';
          position: absolute; top: -25%; left: 0; width: 50%; height: 150%;
          background: linear-gradient(90deg, transparent, rgba(240,201,106,0.1), transparent);
          transform: translateX(-180%) rotate(10deg);
          pointer-events: none; z-index: 2;
        }
        .series-card:hover .series-thumb::after { animation: sl-sheen 1s ease forwards; }
        .series-thumb-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,8,18,0.95) 0%, rgba(10,8,18,0.2) 50%, transparent 100%); transition: background 0.3s ease; }
        .series-card:hover .series-thumb-overlay { background: linear-gradient(to top, rgba(10,8,18,0.98) 0%, rgba(10,8,18,0.4) 50%, rgba(10,8,18,0.15) 100%); }
        .series-thumb-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 14px 12px; z-index: 3; }
        .series-thumb-title { font-family: 'Cinzel', serif; font-size: 13px; color: #f0e6d3; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 6px; transition: color 0.25s; }
        .series-card:hover .series-thumb-title { color: #f0c96a; }
        .series-thumb-meta { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .series-ep-count { font-size: 10px; color: rgba(240,230,211,0.35); transition: color 0.25s; }
        .series-card:hover .series-ep-count { color: rgba(240,230,211,0.6); }
        .series-emoji { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; }

        /* Modal body layout */
        .modal-body { display: grid; grid-template-columns: 160px 1fr; gap: 20px; align-items: start; }

        /* Poster upload */
        .poster-upload { width: 160px; }
        .poster-preview {
          width: 160px; aspect-ratio: 2/3; border-radius: 8px; overflow: hidden;
          background: #0f0c18; border: 2px dashed rgba(201,168,76,0.2);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.25s; position: relative; margin-bottom: 10px;
        }
        .poster-preview:hover {
          border-color: rgba(201,168,76,0.5);
          background: rgba(201,168,76,0.04);
          box-shadow: 0 0 16px rgba(201,168,76,0.1);
        }
        .poster-preview img { width: 100%; height: 100%; object-fit: cover; }
        .poster-placeholder { display: flex; flex-direction: column; align-items: center; gap: 8px; color: rgba(240,230,211,0.3); font-size: 12px; text-align: center; padding: 16px; }
        .poster-placeholder-icon { font-size: 32px; opacity: 0.4; }
        .poster-hint { font-size: 11px; color: rgba(240,230,211,0.25); text-align: center; line-height: 1.4; }
        .upload-progress { font-size: 13px; color: rgba(240,230,211,0.5); text-align: center; margin-top: 12px; animation: sl-rise 0.3s ease both; }
        .upload-progress.error { color: #e74c3c; }

        .skeleton-poster-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; padding: 8px 4px; }

        @media (max-width: 600px) {
          .series-grid, .skeleton-poster-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
          .modal-body { grid-template-columns: 1fr; }
          .poster-upload { width: 100%; }
          .poster-preview { width: 100%; aspect-ratio: 16/9; }
        }

        @media (prefers-reduced-motion: reduce) {
          .series-wrap, .series-grid > *, .upload-progress { animation: none !important; }
          .series-card, .series-thumb img, .poster-preview { transition: none; }
          .series-card:hover { transform: none; }
          .series-card:hover .series-thumb img { transform: none; }
          .series-card:hover .series-thumb::after { animation: none; }
        }
      `}</style>

      <Navbar />

      <div className="series-wrap">
        <div className="series-header">
          <h1 className="page-title">Series</h1>
          {isAdmin && (
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              ＋ New Series
            </button>
          )}
        </div>

        {loading ? (
          <div className="skeleton-poster-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-thumb" style={{ aspectRatio: '2/3', animationDelay: `${i * 0.07}s` }} />
              </div>
            ))}
          </div>
        ) : seriesList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📺</div>
            <p className="empty-text">No series yet</p>
            {isAdmin && <p style={{ fontSize: '14px', marginTop: '12px', color: 'rgba(240,230,211,0.3)' }}>Create your first series to get started!</p>}
          </div>
        ) : (
          <div className="series-grid">
            {seriesList.map((s: any) => {
              const totalEps = s.seasons?.reduce((acc: number, season: any) => acc + (season.episodes?.length || 0), 0) || 0
              const totalSeasons = s.seasons?.length || 0
              return (
                <Link key={s.id} href={`/series/${s.id}`} className="series-card">
                  <div className="series-thumb">
                    {s.thumbnail_url ? (
                      <>
                        <img src={getStorageUrl(s.thumbnail_url)} alt={s.title} />
                        <div className="series-thumb-overlay" />
                      </>
                    ) : (
                      <div className="series-emoji">📺</div>
                    )}
                    <div className="series-thumb-info">
                      <div className="series-thumb-title">{s.title}</div>
                      <div className="series-thumb-meta">
                        {/* Using globals badge-red */}
                        <span className="badge-red" style={{ fontSize: '9px', padding: '2px 8px' }}>{s.category}</span>
                        <span className="series-ep-count">
                          {totalSeasons > 0 ? `${totalSeasons}S · ${totalEps}EP` : 'No episodes'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Series Modal — using globals classes */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => !creating && setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Create New Series</h2>
            <div className="modal-body">
              {/* Poster upload */}
              <div className="poster-upload">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(240,230,211,0.4)', letterSpacing: '1.5px', textTransform: 'uppercase' as const, marginBottom: '8px' }}>
                  Poster
                </label>
                <div className="poster-preview" onClick={() => document.getElementById('poster-input')?.click()}>
                  {posterPreview ? (
                    <img src={posterPreview} alt="Poster preview" />
                  ) : (
                    <div className="poster-placeholder">
                      <div className="poster-placeholder-icon">🖼️</div>
                      <span>Click to upload poster</span>
                    </div>
                  )}
                </div>
                <p className="poster-hint">Recommended: 2:3 ratio (e.g. 400×600px)</p>
                <input
                  id="poster-input"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePosterChange}
                />
              </div>

              {/* Form fields — using globals .field classes */}
              <div>
                <div className="field">
                  <label>Title</label>
                  <input
                    placeholder="e.g. Attack on Titan"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div className="field">
                  <label>Description</label>
                  <textarea
                    placeholder="What's this series about?"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label>Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="Anime">Anime</option>
                    <option value="Donghua">Donghua</option>
                    <option value="Series">Series</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {uploadProgress && (
              <p className={`upload-progress${uploadProgress.startsWith('❌') ? ' error' : ''}`}>
                {uploadProgress}
              </p>
            )}

            <div className="modal-btns">
              <button className="btn-cancel" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate} disabled={creating || !form.title.trim()}>
                {creating ? uploadProgress || 'Creating...' : 'Create Series'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}