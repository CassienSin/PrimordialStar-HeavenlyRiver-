/**
 * Resolves a stored file reference to a full URL.
 *
 * Handles three cases:
 * 1. Already a full URL (http/https) → return as-is
 * 2. Plain MinIO path (e.g. "videos/123_file.mp4") → prepend MinIO public URL
 * 3. Supabase storage path (e.g. "avatars/user_123.jpg") → prepend Supabase storage URL
 */
export function getStorageUrl(value: string | null | undefined): string {
  if (!value) return ''

  // Already a full URL — return as-is
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }

  // Supabase storage paths start with "avatars/" — use Supabase public URL
  if (value.startsWith('avatars/')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) return value
    return `${supabaseUrl}/storage/v1/object/public/avatars/${value.replace('avatars/', '')}`
  }

  // All other paths (videos/, thumbnails/, episodes/, series-posters/) → MinIO
  const minioUrl = process.env.NEXT_PUBLIC_MINIO_PUBLIC_URL
  if (!minioUrl) return value
  return `${minioUrl}/heavenlyriver/${value}`
}

/**
 * Returns true if a URL points to MinIO storage
 */
export function isMinioUrl(url: string): boolean {
  const minioUrl = process.env.NEXT_PUBLIC_MINIO_PUBLIC_URL
  if (!minioUrl) return false
  return url.startsWith(minioUrl)
}

/**
 * Returns true if a URL points to Supabase storage
 */
export function isSupabaseUrl(url: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return false
  return url.includes('supabase.co/storage')
}