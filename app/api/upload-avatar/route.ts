import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Dedicated bucket for avatars — keeps concerns separated
const AVATAR_BUCKET = 'avatars'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    // Path: avatars/{userId}_{timestamp}.{ext}
    const filePath = `avatars/${user.id}_${Date.now()}.${ext}`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Ensure bucket exists and upload
    const { error: uploadError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Avatar upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // getPublicUrl is synchronous — destructure safely
    const { data: urlData } = supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      return NextResponse.json({ error: 'Failed to get public URL' }, { status: 500 })
    }

    return NextResponse.json({ url: urlData.publicUrl, path: filePath })
  } catch (err: any) {
    console.error('Upload avatar error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}