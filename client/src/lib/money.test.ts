import { describe, it, expect } from 'vitest'
import { formatMoney, parseMoney, formatDate } from './money'

describe('formatMoney', () => {
  it('shows Rands the South African way', () => {
    expect(formatMoney(1250)).toBe('R 1 250,00')
    expect(formatMoney(0.5)).toBe('R 0,50')
    expect(formatMoney(999.99)).toBe('R 999,99')
    expect(formatMoney(1234567.89)).toBe('R 1 234 567,89')
    expect(formatMoney(0)).toBe('R 0,00')
  })
})

describe('parseMoney', () => {
  it('understands what people type', () => {
    expect(parseMoney('1250')).toBe(1250)
    expect(parseMoney('1 250,50')).toBe(1250.5)
    expect(parseMoney('1250.5')).toBe(1250.5)
    expect(parseMoney(' R 99,99 ')).toBe(99.99)
  })

  it('gives null for things that are not money', () => {
    expect(parseMoney('')).toBeNull()
    expect(parseMoney('abc')).toBeNull()
    expect(parseMoney('12.345')).toBeNull()
    expect(parseMoney('-5')).toBeNull()
  })
})

describe('formatDate', () => {
  it('shows dates like 24 Dec 2026', () => {
    expect(formatDate('2026-12-24')).toBe('24 Dec 2026')
    expect(formatDate('2027-01-05')).toBe('5 Jan 2027')
  })
})
