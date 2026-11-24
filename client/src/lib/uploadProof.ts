import { proofPath } from './proof'

// uploads the slip straight to my private "proofs" bucket in Supabase, as the logged-in customer
// (my storage policy only lets a customer upload into their OWN lay-by's folder)
// gives back where it was saved, so I can send that to my API
export async function uploadProof(laybyId: string, file: File): Promise<string> {
  // I load Supabase only when it's needed, so my page tests don't need real keys
  const { supabase } = await import('./supabase')
  const path = proofPath(laybyId, file)
  const { error } = await supabase.storage.from('proofs').upload(path, file, { contentType: file.type })
  if (error) throw new Error("We couldn't upload your file. Please try again.")
  return path
}
