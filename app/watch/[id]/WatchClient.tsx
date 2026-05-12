'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import VideoPlayer from '../../components/VideoPlayer'

export default function WatchClient({ video }: { video: any }) {
  const router = useRouter()
  const progressRef = useRef(0)
  const [isOwner, setIsOwner] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single()

      setIsOwner(data?.is_admin === true)
    }
    checkAdmin()
  }, [])

  useEffect(() => {
    const saveProgress = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || progressRef.current < 5) return
      await supabase.from('watch_history').upsert({
        user_id: session.user.id,
        video_id: video.id,
        progress: Math.floor(progressRef.current),
        watched_at: new Date().toISOString(),
      }, { onConflict: 'user_id,video_id' })
    }
    const interval = setInterval(saveProgress, 10000)
    return () => clearInterval(interval)
  }, [video.id])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/delete-video', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.id,
          videoUrl: video.video_url,
          thumbnailUrl: video.thumbnail_url,
        }),
      })
      const data = await res.json()
      if (data.success) {
        window.location.href = '/'
      } else {
        alert('Failed to delete: ' + data.error)
        setDeleting(false)
      }
    } catch (err) {
      console.error('Delete fetch error:', err)
      alert('Network error: ' + err)
      setDeleting(false)
    }
  }

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; overflow: hidden; background: #000; }
        .confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 100; display: flex; align-items: center; justify-content: center; }
        .confirm-box { background: #16121f; border: 1px solid rgba(201,168,76,0.2); border-radius: 8px; padding: 40px; max-width: 400px; width: 90%; text-align: center; }
        .confirm-title { font-family: 'Cinzel', serif; font-size: 22px; color: #f0e6d3; margin-bottom: 12px; }
        .confirm-sub { color: rgba(240,230,211,0.5); font-size: 14px; margin-bottom: 32px; line-height: 1.6; }
        .confirm-btns { display: flex; gap: 12px; justify-content: center; }
        .btn-cancel { padding: 10px 28px; background: rgba(255,255,255,0.1); color: #f0e6d3; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Nunito', sans-serif; transition: background 0.2s; }
        .btn-cancel:hover { background: rgba(255,255,255,0.2); }
        .btn-delete { padding: 10px 28px; background: #c0392b; color: white; border: none; border-radius: 4px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Nunito', sans-serif; transition: background 0.2s; }
        .btn-delete:hover { background: #e74c3c; }
        .btn-delete:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      {showConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <div className="confirm-title">Delete Video?</div>
            <p className="confirm-sub">
              This will permanently delete <strong>"{video.title}"</strong> and all its data. This cannot be undone.
            </p>
            <div className="confirm-btns">
              <button className="btn-cancel" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="btn-delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : '🗑 Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <VideoPlayer
        src={video.video_url}
        poster={video.thumbnail_url}
        title={video.title}
        subtitle={video.category}
        year={video.created_at ? new Date(video.created_at).getFullYear().toString() : undefined}
        synopsis={video.description}
        onBack={() => router.push('/')}
        onTimeUpdate={(t) => { progressRef.current = t }}
        onDelete={isOwner ? () => setShowConfirm(true) : undefined}
      />
    </>
  )
}