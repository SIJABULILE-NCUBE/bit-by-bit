// my lay-by risk score: Low / Medium / High, so a shop can act BEFORE a customer gives up
// it's a pure function (same inputs = same answer, no database), see tests/riskScore.test.ts
//
// How it works (my credit-risk "scorecard", kept simple on purpose):
//   1. 2 or more missed instalments  → always High
//   2. over 80% paid and none missed → always Low (they're nearly there)
//   3. otherwise I add up points:
//        1 missed instalment               +2
//        overdue more than 7 / 30 days     +1 / +2
//        no payment for 35 / 60 days       +1 / +2
//        under 25% paid (only if something above already went wrong)  +1
//      0 points = Low, 1-2 = Medium, 3 or more = High
import { progressPercent, scheduleWithStatus, todayInSA, type Instalment, type LaybyStatus, type PaymentStatus } from './laybyMath.js'

export type RiskLevel = 'low' | 'medium' | 'high'

// what the score needs to know about a lay-by
export type RiskLayby = {
  status: LaybyStatus
  price: number
  deposit: number
  createdAt: string
  instalments: Instalment[]
  payments: { amount: number; status: PaymentStatus; createdAt: string }[]
}

export type RiskFactors = {
  daysOverdue: number
  missedInstalments: number
  percentPaid: number
  daysSinceLastPayment: number
}

// whole days from one YYYY-MM-DD date to another
export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}

// a timestamp like 2026-11-24T08:00:00Z as a South African date
const saDate = (timestamp: string) => todayInSA(new Date(timestamp))

export function riskFactors(layby: RiskLayby, today: string): RiskFactors {
  // only confirmed payments count, like everywhere else in Bit by Bit
  const confirmed = layby.payments.filter((p) => p.status === 'confirmed')

  const missed = scheduleWithStatus(layby.deposit, layby.instalments, confirmed, today, true).filter(
    (i) => i.status === 'overdue',
  )
  // how late the OLDEST missed instalment is
  const daysOverdue = missed.length > 0 ? daysBetween(missed[0].dueDate, today) : 0

  // no confirmed payments yet? then I count from the day the lay-by started
  const lastPaid = confirmed.map((p) => saDate(p.createdAt)).sort().at(-1) ?? saDate(layby.createdAt)

  return {
    daysOverdue,
    missedInstalments: missed.length,
    percentPaid: progressPercent(layby.price, confirmed),
    daysSinceLastPayment: Math.max(0, daysBetween(lastPaid, today)),
  }
}

export function riskLevel(f: RiskFactors): RiskLevel {
  if (f.missedInstalments >= 2) return 'high'
  if (f.percentPaid > 80 && f.missedInstalments === 0) return 'low'

  let points = 0
  if (f.missedInstalments === 1) points += 2
  if (f.daysOverdue > 30) points += 2
  else if (f.daysOverdue > 7) points += 1
  if (f.daysSinceLastPayment > 60) points += 2
  else if (f.daysSinceLastPayment > 35) points += 1
  // paying very little is only worrying when there's already a problem
  if (points > 0 && f.percentPaid < 25) points += 1

  if (points >= 3) return 'high'
  if (points >= 1) return 'medium'
  return 'low'
}

// the level plus plain-English reasons the owner can read on the badge
export function riskScore(layby: RiskLayby, today: string): { level: RiskLevel; reasons: string[] } | null {
  // finished or cancelled lay-bys have no risk left
  if (layby.status !== 'active') return null

  const f = riskFactors(layby, today)
  const level = riskLevel(f)
  // a low-risk lay-by is fine, so I don't list worries for it
  if (level === 'low') return { level, reasons: [] }

  const reasons: string[] = []
  if (f.missedInstalments > 0) {
    reasons.push(`${f.missedInstalments} instalment${f.missedInstalments === 1 ? '' : 's'} missed`)
  }
  if (f.daysOverdue > 0) reasons.push(`${f.daysOverdue} day${f.daysOverdue === 1 ? '' : 's'} overdue`)
  if (f.daysSinceLastPayment > 35) reasons.push(`No payment in ${f.daysSinceLastPayment} days`)
  if (f.percentPaid < 25) reasons.push(`Only ${f.percentPaid}% paid`)

  return { level, reasons }
}
