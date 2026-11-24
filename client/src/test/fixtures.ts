import type { LaybySummary } from '../types'

// a pretend lay-by for my tests; override whatever a test cares about
export function makeLayby(overrides: Partial<LaybySummary> = {}): LaybySummary {
  return {
    id: 'layby-1',
    itemName: 'School blazer + 2 shirts',
    itemPhotoPath: null,
    price: 1000,
    deposit: 100,
    termMonths: 3,
    status: 'active',
    cancelReason: null,
    createdAt: '2026-11-24T08:00:00Z',
    shop: { id: 'shop-1', name: 'Kasi Kids Wear', area: 'Soweto' },
    customer: { id: 'user-customer', fullName: 'Thandi Mokoena', email: 'thandi@example.com', phone: '+27821234567' },
    paid: 400,
    balance: 600,
    progress: 40,
    nextDue: { dueDate: '2027-01-24', amount: 300 },
    overdue: false,
    overdueDue: null,
    ...overrides,
  }
}
