import { describe, it, expect } from 'vitest'
import { checkProofFile, proofPath, MAX_PROOF_BYTES } from './proof'

const fileOf = (name: string, type: string, size = 1000) => {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('checkProofFile', () => {
  it('accepts photos and PDFs up to 5 MB', () => {
    expect(checkProofFile(fileOf('slip.jpg', 'image/jpeg'))).toBeNull()
    expect(checkProofFile(fileOf('slip.png', 'image/png'))).toBeNull()
    expect(checkProofFile(fileOf('slip.webp', 'image/webp'))).toBeNull()
    expect(checkProofFile(fileOf('slip.pdf', 'application/pdf', MAX_PROOF_BYTES))).toBeNull()
  })

  it('refuses other kinds of files', () => {
    expect(checkProofFile(fileOf('notes.docx', 'application/msword'))).toMatch(/photo .*or a PDF/i)
  })

  it('refuses files over 5 MB', () => {
    expect(checkProofFile(fileOf('big.pdf', 'application/pdf', MAX_PROOF_BYTES + 1))).toMatch(/5 MB/)
  })
})

describe('proofPath', () => {
  it("puts the file in the lay-by's folder with a safe, unique name", () => {
    const path = proofPath('layby-1', fileOf('My Slip (1).PDF', 'application/pdf'), 1732450000000)
    expect(path).toBe('layby-1/1732450000000-my-slip-1-.pdf')
  })

  it('works out the extension from the file type when the name has none', () => {
    expect(proofPath('layby-1', fileOf('photo', 'image/jpeg'), 1)).toBe('layby-1/1-photo.jpg')
  })
})
