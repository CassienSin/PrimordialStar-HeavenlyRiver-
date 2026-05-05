'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'

export default function EpisodeWatchClient({ episode }: { episode: any }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const saveProgress = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !videoRef.current) return
      const progress = Math.floor(videoRef.current.currentTime)
      if (progress < 5) return
      // Store as watch history using episode id
      await supabase.from('watch_history').upsert({
        user_id: session.user.id,
        video_id: episode.id,
        progress,
        watched_at: new Date().toISOString(),
      }, { onConflict: 'user_id,video_id' })
    }
    const interval = setInterval(saveProgress, 10000)
    return () => clearInterval(interval)
  }, [episode.id])

  return (
    <video
      ref={videoRef}
      controls
      autoPlay
      src={episode.video_url}
      style={{ width: '100%', borderRadius: '8px', background: '#000', maxHeight: '60vh' }}
      playsInline
    />
  )
}