import { describe, it, expect } from 'vitest'
import { reminderMessage, whatsappLink, waNumber } from './whatsapp'
import { makeLayby } from '../test/fixtures'

describe('reminderMessage', () => {
  it('has the first name, item, shop, amount due, due date and balance', () => {
    const layby = makeLayby({
      itemName: 'School blazer',
      balance: 700,
      nextDue: { dueDate: '2026-11-30', amount: 350 },
    })
    expect(reminderMessage(layby)).toBe(
      'Hi Thandi, your lay-by for the School blazer at Kasi Kids Wear has R 350,00 due on 30 Nov 2026. Balance: R 700,00. Thank you!',
    )
  })

  it('says "was due" and asks them to pay soon when it is overdue', () => {
    const layby = makeLayby({ overdue: true, balance: 1250.5, nextDue: { dueDate: '2026-10-24', amount: 300 } })
    expect(reminderMessage(layby)).toBe(
      'Hi Thandi, your lay-by for the School blazer + 2 shirts at Kasi Kids Wear had R 300,00 due on 24 Oct 2026. Balance: R 1 250,50. Please pay as soon as you can. Thank you!',
    )
  })

  it('uses "there" when I don\'t know their name', () => {
    const layby = makeLayby({ customer: { ...makeLayby().customer, fullName: null } })
    expect(reminderMessage(layby)).toMatch(/^Hi there, /)
  })

  it('tells them when it is paid up and ready to collect', () => {
    const layby = makeLayby({ status: 'completed', balance: 0, nextDue: null })
    expect(reminderMessage(layby)).toBe(
      'Hi Thandi, good news! Your lay-by for the School blazer + 2 shirts at Kasi Kids Wear is fully paid and ready to collect. Thank you!',
    )
  })
})

describe('waNumber', () => {
  it('turns South African numbers into the 27... format wa.me needs', () => {
    expect(waNumber('+27 82 123 4567')).toBe('27821234567')
    expect(waNumber('082 123 4567')).toBe('27821234567')
    expect(waNumber('27821234567')).toBe('27821234567')
  })

  it('gives null for something that is not a phone number', () => {
    expect(waNumber(null)).toBeNull()
    expect(waNumber('123')).toBeNull()
  })
})

describe('whatsappLink', () => {
  it('builds a wa.me link with the message filled in', () => {
    expect(whatsappLink('+27821234567', 'Hi Thandi, R 350,00 due & thanks!')).toBe(
      'https://wa.me/27821234567?text=Hi%20Thandi%2C%20R%20350%2C00%20due%20%26%20thanks!',
    )
  })

  it('lets the owner pick the contact when there is no number', () => {
    expect(whatsappLink(null, 'Hi')).toBe('https://wa.me/?text=Hi')
  })
})
