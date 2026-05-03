export function getStorageUrl(filePath: string | null): string {
  if (!filePath) return ''
  
  // If it's already a full URL (old data), return as is
  if (filePath.startsWith('http')) return filePath
  
  // Build URL from current env variable
  const base = process.env.NEXT_PUBLIC_MINIO_PUBLIC_URL || 'http://127.0.0.1:9000'
  const bucket = process.env.MINIO_BUCKET || 'heavenlyriver'
  return `${base}/${bucket}/${filePath}`
}