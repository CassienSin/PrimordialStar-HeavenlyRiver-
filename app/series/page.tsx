'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import { getStorageUrl } from '../lib/storage'

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
        .from('profiles').select('is_admin').eq('id', session.user.id).single()
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

  const handleCreate = async () => {
    if (!form.title.trim()) return
    setCreating(true)
    setUploadProgress('Creating series...')

    let thumbnailPath = ''

    // Upload poster if provided
    if (posterFile) {
      setUploadProgress('Uploading poster...')
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          fileName: posterFile.name,
          fileType: posterFile.type,
          folder: 'series-posters',
        }),
      })
      const { signedUrl, filePath, error } = await res.json()
      if (!error && signedUrl) {
        await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': posterFile.type },
          body: posterFile,
        })
        thumbnailPath = filePath
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
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Nunito:wght@300;400;600;700&display=swap');
        .series-wrap { max-width: 1100px; margin: 0 auto; padding: 100px 24px 80px; }
        .series-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 40px; flex-wrap: wrap; gap: 16px; }
        .series-title { font-family: 'Cinzel', serif; font-size: 32px; letter-spacing: 2px; color: #f0e6d3; margin: 0; }
        .btn-primary { padding: 10px 22px; background: linear-gradient(135deg, #c0392b, #7b1a1a); color: #f0c96a; border: 1px solid rgba(201,168,76,0.3); border-radius: 5px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Cinzel', serif; letter-spacing: 1px; transition: all 0.2s; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; }
        .btn-primary:hover { background: linear-gradient(135deg, #e74c3c, #c0392b); box-shadow: 0 0 20px rgba(192,57,43,0.3); }

        .series-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; padding: 24px; margin: -24px; }
        .series-card { background: #16121f; border-radius: 10px; overflow: hidden; border: 1px solid rgba(201,168,76,0.08); transition: all 0.25s; text-decoration: none; display: block; position: relative; }
        .series-card:hover { transform: translateY(-5px); box-shadow: 0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.2); border-color: rgba(201,168,76,0.2); z-index: 10; }
        .series-thumb { width: 100%; aspect-ratio: 2/3; background: linear-gradient(135deg, #1e1828, #16121f); position: relative; overflow: hidden; }
        .series-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s; }
        .series-card:hover .series-thumb img { transform: scale(1.05); }
        .series-thumb-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,8,18,0.95) 0%, rgba(10,8,18,0.2) 50%, transparent 100%); }
        .series-thumb-info { position: absolute; bottom: 0; left: 0; right: 0; padding: 14px 12px; }
        .series-thumb-title { font-family: 'Cinzel', serif; font-size: 13px; color: #f0e6d3; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 6px; }
        .series-thumb-meta { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        .series-cat-badge { font-size: 9px; background: linear-gradient(135deg, #c0392b, #7b1a1a); color: #f0c96a; padding: 2px 8px; border-radius: 2px; font-family: 'Cinzel', serif; letter-spacing: 1px; text-transform: uppercase; border: 1px solid rgba(201,168,76,0.2); }
        .series-ep-count { font-size: 10px; color: rgba(240,230,211,0.35); }
        .series-emoji { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.88); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: #16121f; border: 1px solid rgba(201,168,76,0.15); border-radius: 10px; padding: 32px; max-width: 520px; width: 100%; max-height: 90vh; overflow-y: auto; }
        .modal-title { font-family: 'Cinzel', serif; font-size: 22px; letter-spacing: 1px; margin: 0 0 24px; color: #f0e6d3; }
        .modal-body { display: grid; grid-template-columns: 160px 1fr; gap: 20px; align-items: start; }
        .field { margin-bottom: 16px; }
        .field label { display: block; font-size: 11px; font-weight: 700; color: rgba(240,230,211,0.4); letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px; }
        .field input, .field textarea, .field select { width: 100%; padding: 11px 14px; background: #0f0c18; border: 1px solid rgba(201,168,76,0.12); border-radius: 6px; color: #f0e6d3; font-size: 14px; font-family: 'Nunito', sans-serif; outline: none; box-sizing: border-box; transition: border-color 0.2s; }
        .field input:focus, .field textarea:focus { border-color: rgba(201,168,76,0.4); }
        .field input::placeholder, .field textarea::placeholder { color: rgba(240,230,211,0.2); }
        .field textarea { min-height: 80px; resize: vertical; }
        .field select option { background: #16121f; }
        .field input[type=file] { color: rgba(240,230,211,0.5); cursor: pointer; font-size: 12px; }

        .poster-upload { width: 160px; }
        .poster-preview { width: 160px; aspect-ratio: 2/3; border-radius: 8px; overflow: hidden; background: #0f0c18; border: 2px dashed rgba(201,168,76,0.2); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; position: relative; margin-bottom: 10px; }
        .poster-preview:hover { border-color: rgba(201,168,76,0.5); background: rgba(201,168,76,0.04); }
        .poster-preview img { width: 100%; height: 100%; object-fit: cover; }
        .poster-placeholder { display: flex; flex-direction: column; align-items: center; gap: 8px; color: rgba(240,230,211,0.3); font-size: 12px; text-align: center; padding: 16px; }
        .poster-placeholder-icon { font-size: 32px; opacity: 0.4; }
        .poster-hint { font-size: 11px; color: rgba(240,230,211,0.25); text-align: center; line-height: 1.4; }

        .modal-btns { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
        .btn-cancel { padding: 10px 20px; background: rgba(255,255,255,0.05); color: rgba(240,230,211,0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 5px; font-size: 13px; cursor: pointer; font-family: 'Nunito', sans-serif; }
        .upload-progress { font-size: 13px; color: rgba(240,230,211,0.5); text-align: center; margin-top: 12px; }

        .empty-state { text-align: center; padding: 80px 20px; color: rgba(240,230,211,0.25); }
        .empty-icon { font-size: 56px; opacity: 0.3; margin-bottom: 16px; }
        .empty-text { font-size: 16px; font-family: 'Cinzel', serif; letter-spacing: 1px; }

        @media (max-width: 600px) {
          .series-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
          .modal-body { grid-template-columns: 1fr; }
          .poster-upload { width: 100%; }
          .poster-preview { width: 100%; aspect-ratio: 16/9; }
        }
      `}</style>

      <Navbar />

      <div className="series-wrap">
        <div className="series-header">
          <h1 className="series-title">Series</h1>
          {isAdmin && (
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              ＋ New Series
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'rgba(240,230,211,0.3)' }}>Loading...</div>
        ) : seriesList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📺</div>
            <p className="empty-text">No series yet</p>
            {isAdmin && <p style={{ fontSize: '14px', marginTop: '12px' }}>Create your first series to get started!</p>}
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
                        <span className="series-cat-badge">{s.category}</span>
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

      {/* Create Series Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => !creating && setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Create New Series</h2>
            <div className="modal-body">

              {/* Poster upload */}
              <div className="poster-upload">
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(240,230,211,0.4)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Poster
                </label>
                <div className="poster-preview" onClick={() => document.getElementById('poster-input')?.click()}>
                  {posterPreview ? (
                    <img src={posterPreview} alt="Poster preview" />
                  ) : (
                    <div className="poster-placeholder">
                      <div className="poster-placeholder-icon"></div>
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
                  onChange={e => {
                    const f = e.target.files?.[0] || null
                    setPosterFile(f)
                    if (f) setPosterPreview(URL.createObjectURL(f))
                  }}
                />
              </div>

              {/* Form fields */}
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

            {uploadProgress && <p className="upload-progress">{uploadProgress}</p>}

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