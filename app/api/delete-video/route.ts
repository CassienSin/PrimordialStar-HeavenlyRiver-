import { NextRequest, NextResponse } from 'next/server'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { s3, BUCKET } from '../../lib/minio'
import { createClient } from '@supabase/supabase-js'

// Use service role to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

async function deleteFromMinio(url: string) {
  try {
    const key = url.split(`/${BUCKET}/`)[1]
    if (!key) return
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
  } catch (e) {
    console.log('MinIO delete skipped:', e)
  }
}

async function deleteFromSupabase(url: string) {
  try {
    const match = url.match(/\/storage\/v1\/object\/public\/(videos|thumbnails)\/(.+)/)
    if (!match) return
    const bucket = match[1]
    const path = match[2]
    await supabaseAdmin.storage.from(bucket).remove([path])
  } catch (e) {
    console.log('Supabase storage delete skipped:', e)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { videoId, videoUrl, thumbnailUrl } = await req.json()

    const isMinIO = (url: string) => url?.includes('127.0.0.1:9000') || url?.includes('minio')
    const isSupabase = (url: string) => url?.includes('supabase.co')

    if (videoUrl) {
      if (isMinIO(videoUrl)) await deleteFromMinio(videoUrl)
      else if (isSupabase(videoUrl)) await deleteFromSupabase(videoUrl)
    }

    if (thumbnailUrl) {
      if (isMinIO(thumbnailUrl)) await deleteFromMinio(thumbnailUrl)
      else if (isSupabase(thumbnailUrl)) await deleteFromSupabase(thumbnailUrl)
    }

    // Delete watch history first
    await supabaseAdmin.from('watch_history').delete().eq('video_id', videoId)

    // Then delete the video
    const { error } = await supabaseAdmin.from('videos').delete().eq('id', videoId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}