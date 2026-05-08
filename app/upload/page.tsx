'use client'

import { useState, useEffect, useRef } from 'react'
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
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single()

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
      canvas.width = 640
      canvas.height = 360
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(video, 0, 0, 640, 360)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      setAutoThumb(dataUrl)
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
      setMessage('Please add a title and video file.')
      return
    }

    setUploading(true)
    setProgress(0)
    setMessage('')

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''

      // Get presigned URL for video
      setProgressPhase('Preparing upload...')
      const videoRes = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName: videoFile.name,
          fileType: videoFile.type,
          folder: 'videos',
        }),
      })
      const { signedUrl: videoSignedUrl, filePath: videoFilePath, error: videoErr } = await videoRes.json()
      if (videoErr) { setMessage(`❌ ${videoErr}`); setUploading(false); return }

      // Upload video directly to MinIO with progress
      setProgressPhase('Uploading video...')
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', videoSignedUrl)
        xhr.setRequestHeader('Content-Type', videoFile.type)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100)
            setProgress(pct)
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed: ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.send(videoFile)
      })

      // Handle thumbnail
      let thumbnailPath = ''
      const thumbToUpload = thumbnailFile || (autoThumb ? dataUrlToFile(autoThumb, 'thumbnail.jpg') : null)

      if (thumbToUpload) {
        setProgressPhase('Uploading thumbnail...')
        setProgress(0)
        const thumbRes = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            fileName: 'thumbnail.jpg',
            fileType: thumbToUpload.type,
            folder: 'thumbnails',
          }),
        })
        const { signedUrl: thumbSignedUrl, filePath: thumbFilePath } = await thumbRes.json()
        await fetch(thumbSignedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': thumbToUpload.type },
          body: thumbToUpload,
        })
        thumbnailPath = thumbFilePath
      }

      // Save to Supabase
      setProgressPhase('Saving...')
      setProgress(100)
      const { error: dbError } = await supabase.from('videos').insert({
        title,
        description,
        category,
        video_url: videoFilePath,
        thumbnail_url: thumbnailPath,
      })

      if (dbError) {
        setMessage(`❌ Database error: ${dbError.message}`)
      } else {
        setProgressPhase('Complete! ✅')
        setMessage('✅ Uploaded successfully!')
        setTimeout(() => window.location.href = '/', 2000)
      }
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`)
    }

    setUploading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0812', color: '#f0e6d3', fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Nunito:wght@300;400;600;700&display=swap');
        .upload-wrap { max-width: 600px; margin: 0 auto; padding: 100px 24px 80px; }
        .upload-title { font-family: 'Cinzel', serif; font-size: 36px; letter-spacing: 2px; margin-bottom: 32px; color: #f0e6d3; }
        .field { margin-bottom: 20px; }
        .field label { display: block; font-size: 12px; font-weight: 700; color: rgba(240,230,211,0.45); letter-spacing: 1.5px; margin-bottom: 8px; text-transform: uppercase; }
        .field input, .field textarea, .field select { width: 100%; padding: 12px 16px; background: #16121f; border: 1px solid rgba(201,168,76,0.15); border-radius: 6px; color: #f0e6d3; font-size: 15px; font-family: 'Nunito', sans-serif; outline: none; box-sizing: border-box; transition: border-color 0.2s; }
        .field input:focus, .field textarea:focus, .field select:focus { border-color: #c9a84c; }
        .field select option { background: #16121f; }
        .field textarea { resize: vertical; min-height: 90px; }
        .field input[type="file"] { color: rgba(240,230,211,0.6); cursor: pointer; }
        .thumb-preview { width: 100%; aspect-ratio: 16/9; border-radius: 8px; overflow: hidden; background: #16121f; border: 1px solid rgba(201,168,76,0.15); position: relative; margin-bottom: 8px; }
        .thumb-preview img { width: 100%; height: 100%; object-fit: cover; }
        .thumb-label { position: absolute; top: 8px; left: 8px; background: linear-gradient(135deg, #c0392b, #7b1a1a); color: #f0c96a; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; padding: 4px 10px; border-radius: 2px; text-transform: uppercase; font-family: 'Cinzel', serif; border: 1px solid rgba(201,168,76,0.3); }
        .upload-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #c0392b, #7b1a1a); color: #f0c96a; border: 1px solid rgba(201,168,76,0.3); border-radius: 6px; font-size: 16px; font-weight: 700; cursor: pointer; font-family: 'Cinzel', serif; letter-spacing: 1px; transition: all 0.2s; margin-top: 8px; }
        .upload-btn:hover { background: linear-gradient(135deg, #e74c3c, #c0392b); box-shadow: 0 0 20px rgba(192,57,43,0.3); }
        .upload-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .msg { text-align: center; margin-top: 16px; font-size: 14px; color: rgba(240,230,211,0.7); }
        .hint { font-size: 12px; color: rgba(240,230,211,0.25); margin-top: 6px; }
      `}</style>

      <Navbar />

      <div className="upload-wrap">
        <h1 className="upload-title">Upload Video</h1>

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

        {(autoThumb || thumbnailFile) && (
          <div className="field">
            <label>Thumbnail Preview</label>
            <div className="thumb-preview">
              <img
                src={thumbnailFile ? URL.createObjectURL(thumbnailFile) : autoThumb!}
                alt="Thumbnail"
              />
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
            <p className="hint">✨ Auto-generated from your video. Upload a custom one to override.</p>
          )}
        </div>

        <button className="upload-btn" onClick={handleUpload} disabled={uploading}>
          {uploading ? progressPhase || 'Uploading...' : '⬆ Upload Video'}
        </button>

        {uploading && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(240,230,211,0.6)' }}>{progressPhase}</span>
              <span style={{ fontSize: '13px', color: '#c9a84c', fontWeight: 700 }}>{progress}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: '#2a2a2a', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(to right, #c0392b, #c9a84c)',
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }} />
            </div>
            {progress > 0 && progress < 100 && (
              <p style={{ fontSize: '12px', color: 'rgba(240,230,211,0.3)', marginTop: '8px', textAlign: 'center' }}>
                Please keep this page open until the upload completes
              </p>
            )}
          </div>
        )}

        {!uploading && message && <p className="msg">{message}</p>}
      </div>
    </div>
  )
}