import { supabase } from '../../lib/supabase'
import WatchClient from './WatchClient'
import { getStorageUrl } from '../../lib/storage'

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: video } = await supabase
    .from('videos').select('*').eq('id', id).single()

  if (!video) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#000',
        color: '#f0e6d3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif'
      }}>
        Video not found.
      </div>
    )
  }

  const videoWithUrls = {
    ...video,
    video_url: getStorageUrl(video.video_url),
    thumbnail_url: getStorageUrl(video.thumbnail_url),
  }

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
      `}</style>
      <div style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <WatchClient video={videoWithUrls} />
      </div>
    </>
  )
}