export const ISSUE_IMAGES_BUCKET = 'issue-attachments'
export const MAX_ISSUE_IMAGES = 5
export const MAX_ISSUE_IMAGE_SIZE = 10 * 1024 * 1024

export const ISSUE_IMAGE_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

export const ISSUE_IMAGE_TYPES = Object.keys(ISSUE_IMAGE_EXTENSIONS)

export function validateIssueImages(files: { type: string; size: number }[]): string | null {
  if (files.length > MAX_ISSUE_IMAGES) {
    return `You can attach up to ${MAX_ISSUE_IMAGES} images`
  }
  if (files.some(file => !ISSUE_IMAGE_EXTENSIONS[file.type])) {
    return 'Only PNG, JPEG, GIF, and WebP images are allowed'
  }
  if (files.some(file => file.size > MAX_ISSUE_IMAGE_SIZE)) {
    return 'Images must be 10MB or smaller'
  }
  return null
}
