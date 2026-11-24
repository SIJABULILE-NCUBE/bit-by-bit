// checks for the proof of payment file, BEFORE it's uploaded
// (my Supabase bucket checks the same things again, so nobody can skip them)

export const MAX_PROOF_BYTES = 5 * 1024 * 1024

// the file types my "proofs" bucket allows, with the extension I give each one
const allowedTypes: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

export const PROOF_ACCEPT = Object.keys(allowedTypes).join(',')

// a friendly message if the file won't work, or null if it's fine
export function checkProofFile(file: File): string | null {
  if (!allowedTypes[file.type]) return 'Choose a photo (JPG, PNG or WebP) or a PDF of your proof of payment'
  if (file.size > MAX_PROOF_BYTES) return 'That file is too big. The limit is 5 MB'
  return null
}

// where the file goes in storage: <layby_id>/<time>-<clean name>.<ext>
// I clean the name (lowercase, only letters, numbers and dashes) and add the time so it's unique
export function proofPath(laybyId: string, file: File, now = Date.now()): string {
  const extension = allowedTypes[file.type] ?? 'bin'
  const base = file.name
    .replace(/\.[^.]*$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 40)
  return `${laybyId}/${now}-${base || 'proof'}.${extension}`
}
