// the 3 demo lay-bys my seed script creates, as plain data (no database here)
// I build them from "today", so they're always on track / overdue / completed,
// whatever day I run the seed. See tests/demoData.test.ts
import {
  addMonths,
  buildSchedule,
  type Instalment,
  type LaybyStatus,
  type PaymentStatus,
} from '../src/services/laybyMath.js'

export type DemoPayment = {
  amount: number
  method: 'deposit' | 'cash' | 'eft'
  status: PaymentStatus
  date: string
  rejectReason?: string
  // true = the seed uploads a small sample slip for "View proof"
  withProof?: boolean
}

export type DemoLayby = {
  label: 'on track' | 'overdue' | 'completed'
  itemName: string
  price: number
  deposit: number
  termMonths: number
  status: LaybyStatus
  createdOn: string
  instalments: Instalment[]
  payments: DemoPayment[]
}

// a few days before/after a date (YYYY-MM-DD)
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function plan(
  label: DemoLayby['label'],
  itemName: string,
  price: number,
  deposit: number,
  termMonths: number,
  createdOn: string,
  status: LaybyStatus,
  payments: DemoPayment[],
): DemoLayby {
  return {
    label,
    itemName,
    price,
    deposit,
    termMonths,
    status,
    createdOn,
    // same maths the real "create lay-by" uses
    instalments: buildSchedule(price, deposit, termMonths, createdOn),
    payments: [{ amount: deposit, method: 'deposit', status: 'confirmed', date: createdOn }, ...payments],
  }
}

export function demoLaybys(today: string): DemoLayby[] {
  // started ~5 weeks ago: instalment 1 is paid, instalment 2 is still coming up
  const onTrackStart = addDays(addMonths(today, -1), -5)
  // started ~2.5 months ago and only the deposit was paid, so 2 instalments are late
  const overdueStart = addDays(addMonths(today, -2), -15)
  // started 3 months ago and paid off in full last week
  const completedStart = addMonths(today, -3)

  return [
    plan('on track', 'School blazer + 2 shirts', 1250, 250, 4, onTrackStart, 'active', [
      { amount: 250, method: 'cash', status: 'confirmed', date: addDays(onTrackStart, 28) },
      // one EFT slip waiting in "Payments to review"
      { amount: 250, method: 'eft', status: 'pending', date: addDays(today, -1), withProof: true },
    ]),
    plan('overdue', 'Winter school jacket', 900, 90, 3, overdueStart, 'active', [
      // a slip the shop rejected, so the customer can see why
      {
        amount: 270,
        method: 'eft',
        status: 'rejected',
        date: addDays(overdueStart, 33),
        rejectReason: 'The slip is blurry, please upload a clearer photo',
      },
    ]),
    plan('completed', 'School shoes + backpack', 650, 150, 2, completedStart, 'completed', [
      { amount: 250, method: 'eft', status: 'confirmed', date: addDays(completedStart, 30) },
      { amount: 250, method: 'cash', status: 'confirmed', date: addDays(today, -7) },
    ]),
  ]
}
