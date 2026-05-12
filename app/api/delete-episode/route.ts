import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { s3, BUCKET } from '../../lib/minio'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function extractMinioKey(value: string): string | null {
  if (!value) return null
  if (!value.startsWith('http')) return value
  try {
    const url = new URL(value)
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts[0] === BUCKET) return parts.slice(1).join('/')
    return parts.slice(1).join('/')
  } catch {
    return null
  }
}

async function deleteFromMinio(key: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check admin
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { episodeId } = await req.json()
    if (!episodeId) return NextResponse.json({ error: 'episodeId required' }, { status: 400 })

    // Fetch episode record
    const { data: episode, error: fetchError } = await supabaseAdmin
      .from('episodes').select('video_url, thumbnail_url').eq('id', episodeId).single()

    if (fetchError || !episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }

    const storageErrors: string[] = []

    // Delete video file from MinIO
    const videoKey = extractMinioKey(episode.video_url)
    if (videoKey) {
      const result = await deleteFromMinio(videoKey)
      if (!result.ok) {
        console.error('Failed to delete episode video from MinIO:', result.error)
        storageErrors.push(`Video: ${result.error}`)
      }
    }

    // Delete thumbnail from MinIO
    if (episode.thumbnail_url) {
      const isSupabaseUrl = episode.thumbnail_url.includes('supabase.co/storage')
      const thumbKey = extractMinioKey(episode.thumbnail_url)
      if (thumbKey && !isSupabaseUrl) {
        const result = await deleteFromMinio(thumbKey)
        if (!result.ok) {
          console.error('Failed to delete episode thumbnail from MinIO:', result.error)
          storageErrors.push(`Thumbnail: ${result.error}`)
        }
      }
    }

    // Delete from database
    const { error: dbError } = await supabaseAdmin
      .from('episodes').delete().eq('id', episodeId)

    if (dbError) {
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      ...(storageErrors.length > 0 && {
        warnings: storageErrors,
        message: 'Episode deleted but some storage files could not be removed.',
      }),
    })
  } catch (err: any) {
    console.error('Delete episode error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}