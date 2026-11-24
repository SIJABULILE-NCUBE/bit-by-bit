// one-tap WhatsApp reminders: I build the message and a wa.me link,
// so the owner's own WhatsApp opens with everything typed in (no paid API needed)
import { formatDate, formatMoney } from './money'
import type { LaybySummary } from '../types'

type ReminderLayby = Pick<LaybySummary, 'itemName' | 'status' | 'balance' | 'nextDue' | 'overdue' | 'shop' | 'customer'>

// "Hi Thandi, your lay-by for the School blazer at Kasi Kids Wear has R 350,00 due on 30 Nov 2026. Balance: R 700,00. Thank you!"
export function reminderMessage(layby: ReminderLayby): string {
  const firstName = layby.customer.fullName?.trim().split(/\s+/)[0] || 'there'
  const what = `your lay-by for the ${layby.itemName} at ${layby.shop.name}`

  if (layby.status === 'completed' || !layby.nextDue) {
    return `Hi ${firstName}, good news! Your lay-by for the ${layby.itemName} at ${layby.shop.name} is fully paid and ready to collect. Thank you!`
  }

  const due = `${formatMoney(layby.nextDue.amount)} due on ${formatDate(layby.nextDue.dueDate)}`
  const balance = `Balance: ${formatMoney(layby.balance)}.`

  if (layby.overdue) {
    return `Hi ${firstName}, ${what} had ${due}. ${balance} Please pay as soon as you can. Thank you!`
  }
  return `Hi ${firstName}, ${what} has ${due}. ${balance} Thank you!`
}

// wa.me needs the number with the country code and no + or spaces: 0821234567 → 27821234567
export function waNumber(phone: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (/^27\d{9}$/.test(digits)) return digits
  if (/^0\d{9}$/.test(digits)) return `27${digits.slice(1)}`
  return null
}

// without a number, WhatsApp asks the owner which chat to send it to
export function whatsappLink(phone: string | null, message: string): string {
  const number = waNumber(phone) ?? ''
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
