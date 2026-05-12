'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import { getStorageUrl } from '../../lib/storage'

export default function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [seriesId, setSeriesId] = useState('')
  const [series, setSeries] = useState<any>(null)
  const [seasons, setSeasons] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeSeason, setActiveSeason] = useState(0)
  const [showAddSeason, setShowAddSeason] = useState(false)
  const [showUploadEp, setShowUploadEp] = useState(false)
  const [selectedSeasonId, setSelectedSeasonId] = useState('')
  const [epForm, setEpForm] = useState({ title: '', description: '', episode_number: 1 })
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [autoThumb, setAutoThumb] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressPhase, setProgressPhase] = useState('')
  const [newSeasonNum, setNewSeasonNum] = useState(1)
  const [newSeasonTitle, setNewSeasonTitle] = useState('')
  const [editingInfo, setEditingInfo] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)
  const [posterUploading, setPosterUploading] = useState(false)
  const [posterError, setPosterError] = useState('')

  useEffect(() => {
    params.then(p => setSeriesId(p.id))
  }, [params])

  useEffect(() => {
    if (!seriesId) return
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('is_admin').eq('id', session.user.id).single()
      setIsAdmin(profile?.is_admin === true)

      const { data: seriesData } = await supabase
        .from('series').select('*').eq('id', seriesId).single()
      setSeries(seriesData)

      const { data: seasonsData } = await supabase
        .from('seasons')
        .select('*, episodes(id, episode_number, title, description, thumbnail_url, video_url, duration)')
        .eq('series_id', seriesId)
        .order('season_number', { ascending: true })
      const sorted = (seasonsData || []).map((s: any) => ({
        ...s,
        episodes: [...(s.episodes || [])].sort((a: any, b: any) => a.episode_number - b.episode_number)
      }))
      setSeasons(sorted)
      if (sorted.length > 0) setNewSeasonNum(sorted.length + 1)
    }
    load()
  }, [seriesId, router])

  /** Resolves the correct MIME type for a file, falling back to extension detection.
   *  Browsers sometimes return '' for .webp files on certain OS/browser combos. */
  const resolveFileType = (file: File): string => {
    if (file.type && file.type !== 'application/octet-stream') return file.type
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const map: Record<string, string> = {
      webp: 'image/webp',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      avif: 'image/avif',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      mkv: 'video/x-matroska',
      webm: 'video/webm',
    }
    return map[ext] ?? 'application/octet-stream'
  }

  const generateThumbnail = (file: File) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.src = url
    video.muted = true
    video.playsInline = true
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas')
      canvas.width = 640; canvas.height = 360
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(video, 0, 0, 640, 360)
      setAutoThumb(canvas.toDataURL('image/jpeg', 0.85))
      URL.revokeObjectURL(url)
    })
    video.addEventListener('loadedmetadata', () => {
      video.currentTime = Math.min(3, video.duration * 0.2)
    })
    video.load()
  }

  const dataUrlToFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(',')
    const mime = arr[0].match(/:(.*?);/)![1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) u8arr[n] = bstr.charCodeAt(n)
    return new File([u8arr], filename, { type: mime })
  }

  const handleAddSeason = async () => {
    const { data, error } = await supabase
      .from('seasons')
      .insert({ series_id: seriesId, season_number: newSeasonNum, title: newSeasonTitle || `Season ${newSeasonNum}` })
      .select('*, episodes(id, episode_number, title, description, thumbnail_url, video_url, duration)')
      .single()
    if (!error && data) {
      setSeasons(prev => [...prev, { ...data, episodes: [] }])
      setNewSeasonNum(prev => prev + 1)
      setNewSeasonTitle('')
      setShowAddSeason(false)
    }
  }

  const handleUploadEpisode = async () => {
    if (!epForm.title || !videoFile || !selectedSeasonId) return
    setUploading(true)
    setProgress(0)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''

      setProgressPhase('Preparing upload...')
      const videoType = resolveFileType(videoFile)
      const videoRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ fileName: videoFile.name, fileType: videoType, folder: 'episodes' }),
      })
      const { signedUrl, filePath, error: uploadErr } = await videoRes.json()
      if (uploadErr) { setProgressPhase('❌ ' + uploadErr); setUploading(false); return }

      setProgressPhase('Uploading episode...')
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', videoType)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject()
        xhr.onerror = () => reject()
        xhr.send(videoFile)
      })

      let thumbnailPath = ''
      const thumbToUpload = thumbFile || (autoThumb ? dataUrlToFile(autoThumb, 'thumb.jpg') : null)
      if (thumbToUpload) {
        setProgressPhase('Uploading thumbnail...')
        const thumbType = resolveFileType(thumbToUpload)
        const thumbRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ fileName: thumbToUpload.name, fileType: thumbType, folder: 'thumbnails' }),
        })
        const { signedUrl: tUrl, filePath: tPath } = await thumbRes.json()
        await fetch(tUrl, { method: 'PUT', headers: { 'Content-Type': thumbType }, body: thumbToUpload })
        thumbnailPath = tPath
      }

      setProgressPhase('Saving...')
      const { data: ep, error: dbErr } = await supabase.from('episodes').insert({
        season_id: selectedSeasonId,
        series_id: seriesId,
        episode_number: epForm.episode_number,
        title: epForm.title,
        description: epForm.description,
        video_url: filePath,
        thumbnail_url: thumbnailPath,
      }).select().single()

      if (!dbErr && ep) {
        setSeasons(prev => prev.map(s =>
          s.id === selectedSeasonId
            ? { ...s, episodes: [...s.episodes, ep].sort((a: any, b: any) => a.episode_number - b.episode_number) }
            : s
        ))
        setShowUploadEp(false)
        setEpForm({ title: '', description: '', episode_number: 1 })
        setVideoFile(null)
        setThumbFile(null)
        setAutoThumb(null)
        setProgress(0)
        setProgressPhase('')
      }
    } catch (err: any) {
      setProgressPhase('❌ Error: ' + err.message)
    }
    setUploading(false)
  }

  const handleDeleteEpisode = async (epId: string, seasonId: string, ep: any) => {
    if (!confirm(`Delete "${ep.title}"? This cannot be undone.`)) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { alert('Not authenticated'); return }

      const res = await fetch('/api/delete-episode', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ episodeId: epId }),
      })

      const data = await res.json()
      if (!res.ok) {
        alert('Failed to delete: ' + (data.error || 'Unknown error'))
        return
      }

      if (data.warnings?.length) {
        console.warn('Storage cleanup warnings:', data.warnings)
      }

      setSeasons(prev => prev.map(s =>
        s.id === seasonId ? { ...s, episodes: s.episodes.filter((e: any) => e.id !== epId) } : s
      ))
    } catch (err: any) {
      console.error('Delete episode error:', err)
      alert('Failed to delete episode: ' + err.message)
    }
  }

  const handleSaveInfo = async () => {
    if (!editTitle.trim()) return
    setSavingInfo(true)
    await supabase.from('series')
      .update({ title: editTitle, description: editDesc })
      .eq('id', seriesId)
    setSeries((prev: any) => ({ ...prev, title: editTitle, description: editDesc }))
    setSavingInfo(false)
    setEditingInfo(false)
  }

  if (!series) return (
    <div style={{ minHeight: '100vh', background: '#0a0812', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f0e6d3' }}>
      <p>Loading...</p>
    </div>
  )

  const currentSeason = seasons[activeSeason]

  return (
    <div style={{ minHeight: '100vh', background: '#0a0812', color: '#f0e6d3', fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        /* ── Hero ── */
        .series-hero {
          position: relative;
          min-height: 460px;
          display: flex;
          align-items: flex-end;
          padding: 80px 48px 48px;
          overflow: hidden;
        }
        .series-hero-bg {
          position: absolute; inset: 0;
          background-size: cover; background-position: center;
          filter: blur(2px) brightness(0.3);
          transform: scale(1.05);
        }
        .series-hero-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(to top, #0a0812 0%, rgba(10,8,18,0.6) 60%, transparent 100%);
        }
        .series-hero-content {
          position: relative; z-index: 10;
          display: flex; gap: 32px; align-items: flex-end;
          max-width: 900px; width: 100%;
        }

        /* ── Poster ── */
        .series-poster {
          width: 200px; height: 300px;
          border-radius: 8px; overflow: hidden;
          flex-shrink: 0;
          border: 2px solid rgba(201,168,76,0.2);
          box-shadow: 0 8px 32px rgba(0,0,0,0.6);
          position: relative;
        }
        .series-poster img { width: 100%; height: 100%; object-fit: cover; }
        .series-poster-empty {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          font-size: 48px; background: #16121f;
        }
        .poster-edit-overlay {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          flex-direction: column; gap: 4px;
          background: rgba(0,0,0,0.6);
          opacity: 0; transition: opacity 0.2s;
          cursor: pointer; border-radius: 8px;
          font-size: 12px; color: white; font-weight: 700; letter-spacing: 0.5px;
        }
        .series-poster:hover .poster-edit-overlay { opacity: 1; }

        /* ── Series info ── */
        .series-info { flex: 1; min-width: 0; }
        .series-name {
          font-family: 'Cinzel', serif;
          font-size: clamp(24px, 4vw, 48px);
          line-height: 1.1; margin: 0 0 12px;
          color: #f0e6d3; letter-spacing: 1px;
        }
        .series-desc {
          color: rgba(240,230,211,0.6);
          font-size: 14px; line-height: 1.7;
          margin-bottom: 16px; max-width: 600px;
        }
        .series-stats { display: flex; gap: 20px; flex-wrap: wrap; }
        .series-stat { font-size: 13px; color: rgba(240,230,211,0.4); }
        .series-stat span { color: #c9a84c; font-weight: 700; }

        .series-edit-input {
          width: 100%; padding: 10px 14px;
          background: rgba(10,8,18,0.6);
          border: 1px solid rgba(201,168,76,0.3);
          border-radius: 6px; color: #f0e6d3;
          font-family: 'Cinzel', serif;
          font-size: clamp(18px, 3vw, 32px);
          font-weight: 700; letter-spacing: 1px;
          outline: none; box-sizing: border-box;
          margin-bottom: 12px; transition: border-color 0.2s;
        }
        .series-edit-input:focus { border-color: #c9a84c; }
        .series-edit-textarea {
          width: 100%; padding: 10px 14px;
          background: rgba(10,8,18,0.6);
          border: 1px solid rgba(201,168,76,0.2);
          border-radius: 6px; color: rgba(240,230,211,0.8);
          font-family: 'Nunito', sans-serif;
          font-size: 14px; line-height: 1.7;
          outline: none; box-sizing: border-box;
          resize: vertical; max-width: 600px;
          transition: border-color 0.2s;
        }
        .series-edit-textarea:focus { border-color: #c9a84c; }

        /* ── Body ── */
        .series-body {
          max-width: 1000px;
          margin: 0 auto;
          padding: 32px 24px 80px;
        }

        /* ── Season tabs ── */
        .season-tabs {
          display: flex; gap: 8px;
          flex-wrap: wrap; margin-bottom: 28px;
          border-bottom: 1px solid rgba(201,168,76,0.1);
          padding-bottom: 16px;
        }
        .season-tab {
          padding: 8px 20px; border-radius: 3px;
          font-size: 13px; font-weight: 700;
          cursor: pointer; font-family: 'Cinzel', serif;
          letter-spacing: 1px; transition: all 0.2s;
          border: 1px solid transparent;
        }
        .season-tab.active {
          background: linear-gradient(135deg, #c0392b, #7b1a1a);
          color: #f0c96a; border-color: rgba(201,168,76,0.3);
        }
        .season-tab:not(.active) {
          color: rgba(240,230,211,0.4);
          border-color: rgba(201,168,76,0.1);
          background: rgba(201,168,76,0.04);
        }
        .season-tab:not(.active):hover {
          color: #f0e6d3; border-color: rgba(201,168,76,0.2);
        }

        .season-actions {
          display: flex; gap: 10px;
          margin-bottom: 24px; flex-wrap: wrap;
        }

        /* ── Episode list ── */
        /* The outer wrapper for each row keeps delete btn pinned right */
        .ep-row {
          display: flex;
          align-items: stretch;   /* stretch so delete btn fills full height */
          gap: 8px;
          min-width: 0;           /* prevent flex blowout */
        }

        /* The clickable link fills available width but never overflows */
        .ep-item {
          display: flex; gap: 16px; align-items: center;
          padding: 14px 16px;
          background: #16121f;
          border-radius: 8px;
          border: 1px solid rgba(201,168,76,0.07);
          transition: border-color 0.2s, background 0.2s;
          text-decoration: none;
          flex: 1;
          min-width: 0;           /* allow text truncation inside */
          overflow: hidden;       /* clip anything that escapes */
        }
        /* Removed translateX so the row doesn't shift and push the delete btn */
        .ep-item:hover {
          border-color: rgba(201,168,76,0.2);
          background: #1e1828;
        }

        .ep-num {
          font-family: 'Cinzel', serif;
          font-size: 18px; color: rgba(240,230,211,0.2);
          font-weight: 700; min-width: 36px;
          text-align: center; flex-shrink: 0;
        }
        .ep-thumb {
          width: 120px; height: 68px;
          border-radius: 5px; overflow: hidden;
          flex-shrink: 0; background: #1e1828;
        }
        .ep-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .ep-thumb-empty {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px;
        }
        .ep-info { flex: 1; min-width: 0; }
        .ep-title {
          font-size: 15px; font-weight: 700; color: #f0e6d3;
          margin-bottom: 4px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .ep-desc {
          font-size: 13px; color: rgba(240,230,211,0.4);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        /* Delete button — fixed width, vertically centred */
        .ep-del-btn {
          flex-shrink: 0;
          width: 36px; height: 36px;
          align-self: center;          /* centre vertically in the row */
          border-radius: 6px;
          background: rgba(192,57,43,0.15);
          border: 1px solid rgba(192,57,43,0.25);
          color: #e74c3c; font-size: 14px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s, border-color 0.2s;
        }
        .ep-del-btn:hover {
          background: rgba(192,57,43,0.35);
          border-color: rgba(192,57,43,0.5);
        }

        .ep-list { display: flex; flex-direction: column; gap: 12px; }

        .empty-eps {
          text-align: center; padding: 48px;
          color: rgba(240,230,211,0.25);
        }

        /* Thumbnail auto-badge */
        .thumb-preview-wrap { position: relative; display: inline-block; }
        .auto-badge {
          position: absolute; top: 6px; left: 6px;
          background: linear-gradient(135deg, #c0392b, #7b1a1a);
          color: #f0c96a; font-size: 9px;
          padding: 2px 8px; border-radius: 2px;
          font-family: 'Cinzel', serif; letter-spacing: 1px; text-transform: uppercase;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .series-hero { padding: 80px 20px 32px; min-height: 340px; }
          .series-hero-content { flex-direction: column; gap: 16px; }
          .series-poster { width: 140px; height: 210px; }
          .ep-thumb { width: 90px; height: 51px; }
          .ep-title { font-size: 13px; }
          .ep-num { font-size: 15px; min-width: 28px; }
          .series-edit-input { font-size: 20px; }
          .ep-del-btn { width: 32px; height: 32px; font-size: 13px; }
        }
      `}</style>

      <Navbar />

      {/* Hero */}
      <div className="series-hero">
        {series.thumbnail_url && (
          <div className="series-hero-bg" style={{ backgroundImage: `url(${getStorageUrl(series.thumbnail_url)})` }} />
        )}
        <div className="series-hero-overlay" />
        <div className="series-hero-content">

          {/* Poster with admin edit overlay */}
          <div className="series-poster">
            {series.thumbnail_url
              ? <img src={getStorageUrl(series.thumbnail_url)} alt={series.title} />
              : <div className="series-poster-empty">📺</div>
            }
            {isAdmin && (
              <label className="poster-edit-overlay">
                {posterUploading ? '⏳' : '📷'}
                <span>{posterUploading ? 'Uploading…' : 'Change'}</span>
                <input
                  type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/*" style={{ display: 'none' }}
                  disabled={posterUploading}
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    setPosterUploading(true)
                    setPosterError('')
                    try {
                      const { data: { session } } = await supabase.auth.getSession()
                      if (!session) throw new Error('Not authenticated')
                      const token = session.access_token

                      // resolveFileType fixes browsers that return '' for .webp
                      const fileType = resolveFileType(f)
                      const res = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ fileName: f.name, fileType, folder: 'series-posters' }),
                      })
                      const json = await res.json()
                      if (!res.ok || json.error) throw new Error(json.error || 'Failed to get upload URL')

                      const { signedUrl, filePath } = json
                      // Content-Type on the PUT must exactly match what was used to generate the signed URL
                      const putRes = await fetch(signedUrl, {
                        method: 'PUT',
                        headers: { 'Content-Type': fileType },
                        body: f,
                      })
                      if (!putRes.ok) throw new Error(`Storage PUT failed: ${putRes.status}`)

                      const { error: dbErr } = await supabase
                        .from('series').update({ thumbnail_url: filePath }).eq('id', seriesId)
                      if (dbErr) throw new Error(dbErr.message)

                      setSeries((prev: any) => ({ ...prev, thumbnail_url: filePath }))
                    } catch (err: any) {
                      console.error('Poster upload failed:', err)
                      setPosterError(err.message || 'Upload failed')
                    } finally {
                      setPosterUploading(false)
                    }
                  }}
                />
              </label>
            )}
          </div>

          {/* Poster error */}
          {posterError && (
            <div style={{
              fontSize: '11px', color: '#e74c3c', textAlign: 'center',
              background: 'rgba(231,76,60,0.1)', borderRadius: '4px',
              padding: '4px 8px', marginTop: '6px', maxWidth: '200px'
            }}>
              ❌ {posterError}
            </div>
          )}

          {/* Series info */}
          <div className="series-info">
            <div className="badge-red" style={{ marginBottom: '12px' }}>{series.category}</div>

            {editingInfo ? (
              <>
                <input
                  className="series-edit-input"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="Series title"
                  autoFocus
                />
                <textarea
                  className="series-edit-textarea"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="Series description"
                  rows={4}
                />
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <button className="btn-sm red" onClick={handleSaveInfo} disabled={savingInfo}>
                    {savingInfo ? 'Saving...' : 'Save'}
                  </button>
                  <button className="btn-sm gold" onClick={() => setEditingInfo(false)}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1 className="series-name">{series.title}</h1>
                {series.description && <p className="series-desc">{series.description}</p>}
                <div className="series-stats">
                  <div className="series-stat">
                    <span>{seasons.length}</span> Season{seasons.length !== 1 ? 's' : ''}
                  </div>
                  <div className="series-stat">
                    <span>{seasons.reduce((acc, s) => acc + s.episodes.length, 0)}</span> Episodes
                  </div>
                </div>
                {isAdmin && (
                  <button
                    className="btn-sm gold"
                    style={{ marginTop: '16px' }}
                    onClick={() => {
                      setEditTitle(series.title)
                      setEditDesc(series.description || '')
                      setEditingInfo(true)
                    }}
                  >
                    Edit Info
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="series-body">
        {/* Season tabs */}
        {seasons.length > 0 && (
          <div className="season-tabs">
            {seasons.map((s, i) => (
              <button
                key={s.id}
                className={`season-tab ${activeSeason === i ? 'active' : ''}`}
                onClick={() => setActiveSeason(i)}
              >
                {s.title || `Season ${s.season_number}`}
              </button>
            ))}
          </div>
        )}

        {/* Admin actions */}
        {isAdmin && (
          <div className="season-actions">
            <button className="btn-sm gold" onClick={() => setShowAddSeason(true)}>
              ＋ Add Season
            </button>
            {currentSeason && (
              <button className="btn-sm red" onClick={() => {
                setSelectedSeasonId(currentSeason.id)
                const nextEp = (currentSeason.episodes?.length || 0) + 1
                setEpForm(f => ({ ...f, episode_number: nextEp }))
                setShowUploadEp(true)
              }}>
                Upload Episode
              </button>
            )}
          </div>
        )}

        {/* Episodes */}
        {seasons.length === 0 ? (
          <div className="empty-eps">
            <div style={{ fontSize: '48px', opacity: 0.3, marginBottom: '16px' }}>📺</div>
            <p style={{ fontFamily: "'Cinzel', serif", letterSpacing: '1px' }}>No seasons yet</p>
            {isAdmin && <p style={{ fontSize: '13px', marginTop: '8px' }}>Add a season to get started</p>}
          </div>
        ) : currentSeason?.episodes?.length === 0 ? (
          <div className="empty-eps">
            <div style={{ fontSize: '48px', opacity: 0.3, marginBottom: '16px' }}>🎬</div>
            <p style={{ fontFamily: "'Cinzel', serif", letterSpacing: '1px' }}>No episodes in this season</p>
            {isAdmin && <p style={{ fontSize: '13px', marginTop: '8px' }}>Upload the first episode!</p>}
          </div>
        ) : (
          <div className="ep-list">
            {currentSeason?.episodes?.map((ep: any) => (
              // ✅ Replaced raw div wrapper with .ep-row for proper layout containment
              <div key={ep.id} className="ep-row">
                <Link href={`/watch/episode/${ep.id}`} className="ep-item">
                  <div className="ep-num">{ep.episode_number}</div>
                  <div className="ep-thumb">
                    {ep.thumbnail_url
                      ? <img src={getStorageUrl(ep.thumbnail_url)} alt={ep.title} />
                      : <div className="ep-thumb-empty">🎬</div>
                    }
                  </div>
                  <div className="ep-info">
                    <div className="ep-title">{ep.title}</div>
                    {ep.description && <div className="ep-desc">{ep.description}</div>}
                  </div>
                </Link>
                {isAdmin && (
                  <button
                    className="ep-del-btn"
                    onClick={() => handleDeleteEpisode(ep.id, currentSeason.id, ep)}
                    title="Delete episode"
                  >
                    🗑
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Season Modal */}
      {showAddSeason && (
        <div className="modal-overlay" onClick={() => setShowAddSeason(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Add Season</h2>
            <div className="field">
              <label>Season Number</label>
              <input type="number" value={newSeasonNum} onChange={e => setNewSeasonNum(Number(e.target.value))} min={1} />
            </div>
            <div className="field">
              <label>Season Title (optional)</label>
              <input placeholder={`Season ${newSeasonNum}`} value={newSeasonTitle} onChange={e => setNewSeasonTitle(e.target.value)} />
            </div>
            <div className="modal-btns">
              <button className="btn-cancel" onClick={() => setShowAddSeason(false)}>Cancel</button>
              <button className="btn-sm red" onClick={handleAddSeason}>Add Season</button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Episode Modal */}
      {showUploadEp && (
        <div className="modal-overlay" onClick={() => !uploading && setShowUploadEp(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">⬆ Upload Episode</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="field">
                <label>Episode Number</label>
                <input type="number" value={epForm.episode_number} onChange={e => setEpForm(f => ({ ...f, episode_number: Number(e.target.value) }))} min={1} />
              </div>
              <div className="field">
                <label>Title</label>
                <input placeholder="Episode title" value={epForm.title} onChange={e => setEpForm(f => ({ ...f, title: e.target.value }))} />
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea placeholder="What happens in this episode?" value={epForm.description} onChange={e => setEpForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="field">
              <label>Video File</label>
              <input type="file" accept="video/*" onChange={e => {
                const f = e.target.files?.[0] || null
                setVideoFile(f)
                setAutoThumb(null)
                if (f) generateThumbnail(f)
              }} />
            </div>
            {(autoThumb || thumbFile) && (
              <div className="field">
                <label>Thumbnail Preview</label>
                {/* ✅ Wrapped in relative div so the badge positions correctly */}
                <div className="thumb-preview-wrap">
                  <div className="thumb-preview">
                    <img src={thumbFile ? URL.createObjectURL(thumbFile) : autoThumb!} alt="thumb" />
                  </div>
                  {!thumbFile && <div className="auto-badge">Auto</div>}
                </div>
              </div>
            )}
            <div className="field">
              <label>Custom Thumbnail (optional)</label>
              {/* ✅ Added webp to accepted image types */}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/*" onChange={e => setThumbFile(e.target.files?.[0] || null)} />
            </div>
            {uploading && (
              <div className="progress-wrap">
                <div className="progress-labels">
                  <span className="progress-phase">{progressPhase}</span>
                  <span className="progress-pct">{progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            <div className="modal-btns">
              <button className="btn-cancel" onClick={() => !uploading && setShowUploadEp(false)} disabled={uploading}>Cancel</button>
              <button className="btn-sm red" onClick={handleUploadEpisode} disabled={uploading || !videoFile || !epForm.title}>
                {uploading ? progressPhase || 'Uploading...' : 'Upload Episode'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}