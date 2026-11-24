import { getProofUrl } from './api'

// opens a proof of payment in a new tab
// I open the tab FIRST (straight from the click), because browsers block pop-ups
// that open after waiting for the network; then I point it at the signed link
export async function openProof(token: string, paymentId: string): Promise<void> {
  const tab = window.open('', '_blank')
  try {
    const { url } = await getProofUrl(token, paymentId)
    if (tab) tab.location.href = url
    else window.location.href = url
  } catch (err) {
    tab?.close()
    throw err
  }
}
