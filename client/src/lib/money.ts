import { formatRand, toCents } from './laybyMath'

// R 1 250,00 (spaces between thousands, comma for cents)
export function formatMoney(rands: number): string {
  return formatRand(toCents(rands))
}

// turns what people type ("1 250,50", "R99.99", "1250") into a number
// gives null if it isn't a positive amount with at most 2 decimals
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[R\s]/gi, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  return Number(cleaned)
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// '2026-12-24' → '24 Dec 2026' (I do it by hand so every browser shows the same thing)
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number)
  return `${day} ${months[month - 1]} ${year}`
}
