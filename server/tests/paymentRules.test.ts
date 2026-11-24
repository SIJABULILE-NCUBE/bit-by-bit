import { describe, it, expect } from 'vitest'
import { checkPaymentAmount, pendingAmount, isProofPathForLayby } from '../src/services/paymentRules.js'
import type { PaymentLike } from '../src/services/laybyMath.js'

// a R1 000 lay-by with R100 deposit confirmed, R300 confirmed and R200 waiting for review
const payments: PaymentLike[] = [
  { amount: 100, status: 'confirmed' },
  { amount: 300, status: 'confirmed' },
  { amount: 200, status: 'pending' },
  { amount: 999, status: 'rejected' },
]

describe('pendingAmount', () => {
  it('adds up only the payments still waiting for review', () => {
    expect(pendingAmount(payments)).toBe(200)
  })
})

describe('checkPaymentAmount', () => {
  it('allows paying exactly what is left', () => {
    expect(checkPaymentAmount(600, 600)).toBeNull()
  })

  it('allows paying part of what is left', () => {
    expect(checkPaymentAmount(150.5, 600)).toBeNull()
  })

  it('refuses to overpay, and says how much is left', () => {
    expect(checkPaymentAmount(600.01, 600)).toBe('That is more than the R 600,00 still owed')
  })

  it('refuses zero, negative and non-numbers', () => {
    expect(checkPaymentAmount(0, 600)).toMatch(/more than R0/)
    expect(checkPaymentAmount(-5, 600)).toMatch(/more than R0/)
    expect(checkPaymentAmount(Number.NaN, 600)).toMatch(/number/)
  })

  it('refuses more than 2 decimals', () => {
    expect(checkPaymentAmount(10.005, 600)).toMatch(/2 decimals/)
  })

  it('says so when nothing is owed any more', () => {
    expect(checkPaymentAmount(10, 0)).toBe('Nothing is owed on this lay-by')
  })
})

describe('isProofPathForLayby', () => {
  const id = '3f1c2b9e-1111-4222-8333-444455556666'

  it("accepts a file inside the lay-by's folder", () => {
    expect(isProofPathForLayby(`${id}/1732450000000-slip.pdf`, id)).toBe(true)
  })

  it("rejects another lay-by's folder, sub-folders and tricks like ..", () => {
    expect(isProofPathForLayby('other-id/slip.pdf', id)).toBe(false)
    expect(isProofPathForLayby(`${id}/a/b.pdf`, id)).toBe(false)
    expect(isProofPathForLayby(`${id}/../x.pdf`, id)).toBe(false)
    expect(isProofPathForLayby(`${id}/`, id)).toBe(false)
  })
})
