import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3, BUCKET } from '../../lib/minio'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // Get auth token from request headers
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify user and check admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { fileName, fileType, folder } = await req.json()
    const key = `${folder || 'videos'}/${Date.now()}_${fileName}`

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: fileType,
    })

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })
    return NextResponse.json({ signedUrl, filePath: key })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}