// all my lay-by maths in one place, as plain functions with no database calls
// so they're easy to test (see tests/laybyMath.test.ts)
//
// I do every sum in CENTS (whole numbers), because 0.1 + 0.2 !== 0.3 in JavaScript.
// Amounts come in and go out as Rands (e.g. 141.66), but the maths in between is in cents.

export type LaybyStatus = 'active' | 'completed' | 'collected' | 'cancelled'
export type PaymentStatus = 'pending' | 'confirmed' | 'rejected'

// the bits of a payment my maths cares about
export type PaymentLike = { amount: number; status: PaymentStatus }

// one row of the payment schedule
export type Instalment = { seq: number; dueDate: string; amount: number }

export type LaybyTerms = { price: number; deposit: number; termMonths: number }

// my lay-by rules (PRD section 5)
export const MIN_DEPOSIT_PERCENT = 10
export const MIN_TERM_MONTHS = 1
export const MAX_TERM_MONTHS = 6

// ---------- money helpers ----------

export function toCents(rands: number): number {
  return Math.round(rands * 100)
}

export function fromCents(cents: number): number {
  return cents / 100
}

// true if the amount has at most 2 decimals (so R10.505 is not allowed)
function hasWholeCents(rands: number): boolean {
  return Math.abs(rands * 100 - Math.round(rands * 100)) < 1e-6
}

// R 1 250,00 (the SA way: spaces between thousands, comma for cents)
export function formatRand(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const rands = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const c = (abs % 100).toString().padStart(2, '0')
  return `${sign}R ${rands},${c}`
}

// only confirmed payments count, everything else is "not paid yet"
function confirmedCents(payments: PaymentLike[]): number {
  return payments
    .filter((p) => p.status === 'confirmed')
    .reduce((sum, p) => sum + toCents(p.amount), 0)
}

// ---------- dates ----------

const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/

// I keep dates as 'YYYY-MM-DD' strings so time zones can't shift them by a day
function parseIsoDate(date: string): { year: number; month: number; day: number } {
  const match = isoDatePattern.exec(date)
  if (!match) throw new Error(`Dates must be YYYY-MM-DD, got "${date}"`)
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]

  // catches things like 2026-02-30
  const check = new Date(Date.UTC(year, month - 1, day))
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw new Error(`Dates must be YYYY-MM-DD, got "${date}"`)
  }
  return { year, month, day }
}

function daysInMonth(year: number, monthIndex: number): number {
  // day 0 of the NEXT month is the last day of this month
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

// adds whole months, and if the day doesn't exist (31 Feb) I use the last day of that month
export function addMonths(date: string, months: number): string {
  const { year, month, day } = parseIsoDate(date)
  const totalMonths = month - 1 + months
  const newYear = year + Math.floor(totalMonths / 12)
  const newMonthIndex = totalMonths % 12
  const newDay = Math.min(day, daysInMonth(newYear, newMonthIndex))

  const mm = String(newMonthIndex + 1).padStart(2, '0')
  const dd = String(newDay).padStart(2, '0')
  return `${newYear}-${mm}-${dd}`
}

// today's date as YYYY-MM-DD (South African time, since that's where my shops are)
export function todayInSA(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' })
}

// ---------- validation ----------

// returns a list of friendly messages; an empty list means the lay-by is fine
export function validateLaybyTerms({ price, deposit, termMonths }: LaybyTerms): string[] {
  const errors: string[] = []

  if (!Number.isFinite(price) || !Number.isFinite(deposit)) {
    return ['The price and deposit must be numbers']
  }
  if (!hasWholeCents(price) || !hasWholeCents(deposit)) {
    errors.push('Amounts can only have 2 decimals (cents)')
  }

  const priceCents = toCents(price)
  const depositCents = toCents(deposit)

  if (priceCents <= 0) {
    errors.push('The price must be more than R0')
  }

  if (depositCents < 0) {
    errors.push("The deposit can't be negative")
  } else if (depositCents > priceCents) {
    errors.push("The deposit can't be more than the price")
  } else if (priceCents > 0 && depositCents * 100 < priceCents * MIN_DEPOSIT_PERCENT) {
    // smallest deposit that is still 10%, rounded UP to the next cent
    const minDeposit = Math.ceil((priceCents * MIN_DEPOSIT_PERCENT) / 100)
    errors.push(`The deposit must be at least ${MIN_DEPOSIT_PERCENT}% of the price (${formatRand(minDeposit)})`)
  }

  const termIsValid =
    Number.isInteger(termMonths) && termMonths >= MIN_TERM_MONTHS && termMonths <= MAX_TERM_MONTHS
  if (!termIsValid) {
    errors.push(`The term must be ${MIN_TERM_MONTHS} to ${MAX_TERM_MONTHS} whole months`)
  }

  // every instalment needs to be at least 1 cent
  const remaining = priceCents - depositCents
  if (termIsValid && remaining > 0 && remaining < termMonths) {
    errors.push(`The amount left after the deposit is too small to split over ${termMonths} months`)
  }

  return errors
}

// ---------- the schedule ----------

// splits (price - deposit) into monthly instalments, the first one a month after startDate
// every instalment is the same, except the last one which takes the leftover cents
export function buildSchedule(
  price: number,
  deposit: number,
  termMonths: number,
  startDate: string,
): Instalment[] {
  const errors = validateLaybyTerms({ price, deposit, termMonths })
  if (errors.length > 0) throw new Error(errors.join('. '))
  parseIsoDate(startDate)

  const remaining = toCents(price) - toCents(deposit)
  // the deposit already paid for everything, so there's nothing left to schedule
  if (remaining === 0) return []

  const regular = Math.floor(remaining / termMonths)
  const last = remaining - regular * (termMonths - 1)

  const schedule: Instalment[] = []
  for (let seq = 1; seq <= termMonths; seq++) {
    schedule.push({
      seq,
      // always counted from the start date, so 31 Jan → 28 Feb → 31 Mar (not 28 Mar)
      dueDate: addMonths(startDate, seq),
      amount: fromCents(seq === termMonths ? last : regular),
    })
  }
  return schedule
}

// ---------- progress ----------

export function paidAmount(payments: PaymentLike[]): number {
  return fromCents(confirmedCents(payments))
}

// what's still owed (never below R0)
export function balance(price: number, payments: PaymentLike[]): number {
  return fromCents(Math.max(0, toCents(price) - confirmedCents(payments)))
}

// rounded DOWN, so the bar only shows 100% when it really is fully paid
export function progressPercent(price: number, payments: PaymentLike[]): number {
  const priceCents = toCents(price)
  if (priceCents <= 0) return 0
  const percent = Math.floor((confirmedCents(payments) * 100) / priceCents)
  return Math.min(100, percent)
}

export function isCompleted(price: number, payments: PaymentLike[]): boolean {
  return confirmedCents(payments) >= toCents(price)
}

// overdue = by today, they should have paid the deposit plus every instalment whose
// due date has passed, but their confirmed payments don't cover that yet
// (an instalment is only late the day AFTER its due date)
export function isOverdue(
  layby: { deposit: number; status: LaybyStatus },
  instalments: Instalment[],
  payments: PaymentLike[],
  today: string,
): boolean {
  if (layby.status !== 'active') return false

  const owedByToday =
    toCents(layby.deposit) +
    instalments.filter((i) => i.dueDate < today).reduce((sum, i) => sum + toCents(i.amount), 0)

  return confirmedCents(payments) < owedByToday
}

// the next instalment that isn't fully covered yet, and how much is still owed on it
// extra money paid early counts towards the next instalments
export function nextDue(
  deposit: number,
  instalments: Instalment[],
  payments: PaymentLike[],
): { dueDate: string; amount: number } | null {
  const paid = confirmedCents(payments)
  let coveredUpTo = toCents(deposit)

  for (const instalment of [...instalments].sort((a, b) => a.seq - b.seq)) {
    const amount = toCents(instalment.amount)
    coveredUpTo += amount
    if (paid < coveredUpTo) {
      return { dueDate: instalment.dueDate, amount: fromCents(Math.min(amount, coveredUpTo - paid)) }
    }
  }
  return null
}

// ---------- schedule with a status per instalment (for the lay-by detail page) ----------

// paid = fully covered, next = the one to pay now, upcoming = later,
// overdue = its due date has passed and it isn't covered, unpaid = lay-by isn't active any more
export type InstalmentStatus = 'paid' | 'next' | 'upcoming' | 'overdue' | 'unpaid'

export type InstalmentWithStatus = Instalment & { paid: number; status: InstalmentStatus }

// confirmed payments (after the deposit) fill up the instalments in order, oldest first
export function scheduleWithStatus(
  deposit: number,
  instalments: Instalment[],
  payments: PaymentLike[],
  today: string,
  active: boolean,
): InstalmentWithStatus[] {
  let moneyLeft = confirmedCents(payments) - toCents(deposit)
  let nextFound = false

  return [...instalments]
    .sort((a, b) => a.seq - b.seq)
    .map((instalment) => {
      const amount = toCents(instalment.amount)
      const covered = Math.max(0, Math.min(amount, moneyLeft))
      moneyLeft -= covered

      let status: InstalmentStatus
      if (covered === amount) status = 'paid'
      else if (!active) status = 'unpaid'
      else if (instalment.dueDate < today) status = 'overdue'
      else if (!nextFound) {
        status = 'next'
        nextFound = true
      } else status = 'upcoming'

      return { ...instalment, paid: fromCents(covered), status }
    })
}

// ---------- how much is late right now ----------

// every instalment whose due date has passed but isn't covered yet, added up,
// and the due date of the oldest one ("R 540,00 overdue since 9 Oct")
// null means nothing is late
export function overdueDue(
  deposit: number,
  instalments: Instalment[],
  payments: PaymentLike[],
  today: string,
): { amount: number; since: string } | null {
  const late = scheduleWithStatus(deposit, instalments, payments, today, true).filter((i) => i.status === 'overdue')
  if (late.length === 0) return null
  const cents = late.reduce((sum, i) => sum + toCents(i.amount) - toCents(i.paid), 0)
  return { amount: fromCents(cents), since: late[0].dueDate }
}
