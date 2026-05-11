'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'

export default function UploadPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [autoThumb, setAutoThumb] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState(0)
  const [progressPhase, setProgressPhase] = useState('')

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('profiles').select('is_admin').eq('id', session.user.id).single()
      if (!profile?.is_admin) router.push('/')
    }
    checkAdmin()
  }, [router])

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

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setVideoFile(file)
    setAutoThumb(null)
    if (file) generateThumbnail(file)
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

  const handleUpload = async () => {
    if (!title || !videoFile) {
      setMessage('❌ Please add a title and video file.')
      return
    }

    setUploading(true)
    setProgress(0)
    setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''

      // Get presigned URL for video
      setProgressPhase('Preparing upload...')
      const videoRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ fileName: videoFile.name, fileType: videoFile.type, folder: 'videos' }),
      })
      const { signedUrl: videoSignedUrl, filePath: videoFilePath, error: videoErr } = await videoRes.json()
      if (videoErr) { setMessage(`❌ ${videoErr}`); setUploading(false); return }

      // Upload video with progress
      setProgressPhase('Uploading video...')
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', videoSignedUrl)
        xhr.setRequestHeader('Content-Type', videoFile.type)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`))
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.send(videoFile)
      })

      // Upload thumbnail
      let thumbnailPath = ''
      const thumbToUpload = thumbnailFile || (autoThumb ? dataUrlToFile(autoThumb, 'thumbnail.jpg') : null)
      if (thumbToUpload) {
        setProgressPhase('Uploading thumbnail...')
        setProgress(0)
        const thumbRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ fileName: 'thumbnail.jpg', fileType: thumbToUpload.type, folder: 'thumbnails' }),
        })
        const { signedUrl: thumbSignedUrl, filePath: thumbFilePath } = await thumbRes.json()
        await fetch(thumbSignedUrl, { method: 'PUT', headers: { 'Content-Type': thumbToUpload.type }, body: thumbToUpload })
        thumbnailPath = thumbFilePath
      }

      // Save to Supabase
      setProgressPhase('Saving...')
      setProgress(100)
      const { error: dbError } = await supabase.from('videos').insert({
        title, description, category,
        video_url: videoFilePath,
        thumbnail_url: thumbnailPath,
      })

      if (dbError) {
        setMessage(`❌ Database error: ${dbError.message}`)
      } else {
        setProgressPhase('Complete!')
        setMessage('Uploaded successfully!')
        setTimeout(() => window.location.href = '/', 2000)
      }
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`)
    }

    setUploading(false)
  }

  const thumbSrc = thumbnailFile ? URL.createObjectURL(thumbnailFile) : autoThumb

  return (
    <div style={{ minHeight: '100vh', background: '#0a0812', color: '#f0e6d3', fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        /* Upload-specific styles only */
        .upload-wrap { max-width: 600px; margin: 0 auto; padding: 100px 24px 80px; }
        .upload-btn {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, #c0392b, #7b1a1a);
          color: #f0c96a; border: 1px solid rgba(201,168,76,0.3);
          border-radius: 6px; font-size: 16px; font-weight: 700;
          cursor: pointer; font-family: 'Cinzel', serif;
          letter-spacing: 1px; transition: all 0.2s; margin-top: 8px;
        }
        .upload-btn:hover { background: linear-gradient(135deg, #e74c3c, #c0392b); box-shadow: 0 0 20px rgba(192,57,43,0.3); }
        .upload-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .upload-hint { font-size: 12px; color: rgba(240,230,211,0.25); margin-top: 6px; }
        .upload-msg { text-align: center; margin-top: 16px; font-size: 14px; color: rgba(240,230,211,0.7); }
        .upload-keep-open { font-size: 12px; color: rgba(240,230,211,0.3); margin-top: 8px; text-align: center; }
      `}</style>

      <Navbar />

      <div className="upload-wrap">
        <h1 className="page-title" style={{ marginBottom: '32px' }}>Upload Video</h1>

        {/* Fields — using globals .field classes */}
        <div className="field">
          <label>Title</label>
          <input
            placeholder="e.g. Attack on Titan S1E1"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Description</label>
          <textarea
            placeholder="What's this video about?"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Select Category</option>
            <option value="Anime">Anime</option>
            <option value="Donghua">Donghua</option>
            <option value="Movie">Movie</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="field">
          <label>Video File</label>
          <input type="file" accept="video/*" onChange={handleVideoChange} />
        </div>

        {/* Thumbnail preview — using globals .thumb-preview */}
        {thumbSrc && (
          <div className="field">
            <label>Thumbnail Preview</label>
            <div className="thumb-preview">
              <img src={thumbSrc} alt="Thumbnail" />
              {!thumbnailFile && <div className="thumb-label">Auto-generated</div>}
            </div>
          </div>
        )}

        <div className="field">
          <label>Custom Thumbnail (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={e => setThumbnailFile(e.target.files?.[0] || null)}
          />
          {autoThumb && !thumbnailFile && (
            <p className="upload-hint">Auto-generated from your video. Upload a custom one to override.</p>
          )}
        </div>

        <button className="upload-btn" onClick={handleUpload} disabled={uploading}>
          {uploading ? progressPhase || 'Uploading...' : 'Upload Video'}
        </button>

        {/* Progress bar — using globals .progress-wrap classes */}
        {uploading && (
          <div className="progress-wrap">
            <div className="progress-labels">
              <span className="progress-phase">{progressPhase}</span>
              <span className="progress-pct">{progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            {progress > 0 && progress < 100 && (
              <p className="upload-keep-open">Please keep this page open until the upload completes</p>
            )}
          </div>
        )}

        {!uploading && message && <p className="upload-msg">{message}</p>}
      </div>
    </div>
  )
}